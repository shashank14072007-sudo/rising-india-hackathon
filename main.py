import io
import torch
import torch.nn.functional as F
from fastapi import FastAPI, UploadFile, File, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from PIL import Image
import numpy as np
from models.dual_backbone import BenamNet
from utils.preprocessing import preprocess_image
import uvicorn

app = FastAPI(title="Benam - Fish Disease Detection API", version="1.0.0")

# Enable CORS for Streamlit/Flutter integration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# Initialize Model (Layer 2 & 3)
# In production, we'd load weights here.
device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
model = BenamNet(num_classes=7).to(device)
model.eval()

CLASSES = [
    "Bacterial Red disease", 
    "Bacterial diseases - Aeromoniasis", 
    "Bacterial gill disease", 
    "Fungal diseases Saprolegniasis", 
    "Healthy Fish", 
    "Parasitic diseases", 
    "Viral diseases White tail disease"
]
SEVERITY_LEVELS = ["Mild", "Moderate", "Quarantine", "Emergency"]

@app.get("/")
async def health_check():
    return {"status": "operational", "model": "BenamNet-v1 (Dual Backbone)"}

@app.post("/predict")
async def predict(file: UploadFile = File(...)):
    if not file.content_type.startswith("image/"):
        raise HTTPException(status_code=400, detail="Invalid file type")

    try:
        # Load image
        contents = await file.read()
        image = Image.open(io.BytesIO(contents)).convert("RGB")
        
        # Layer 1: Preprocessing
        processed_img = preprocess_image(image)
        
        # Convert to tensor
        input_tensor = torch.from_numpy(np.array(processed_img)).permute(2, 0, 1).float().unsqueeze(0) / 255.0
        input_tensor = input_tensor.to(device)
        
        # Layer 2 & 3: Inference
        with torch.no_grad():
            output = model(input_tensor)
            
        logits = output["logits"]
        probs = F.softmax(logits, dim=1)
        conf, pred_idx = torch.max(probs, dim=1)
        
        severity_val = output["severity"].item()
        severity_idx = int(severity_val * 3) # Map 0-1 to 0-3
        
        # Mocking Grad-CAM heatmaps for now (Layer 5)
        # In a real implementation, we'd use the model's hook to get heatmaps.
        heatmap_url = "https://example.com/mock-heatmap.jpg" 

        return {
            "disease": CLASSES[pred_idx.item()],
            "confidence": round(conf.item(), 4),
            "severity": SEVERITY_LEVELS[severity_idx],
            "severity_score": round(severity_val, 4),
            "recommendation": get_recommendation(CLASSES[pred_idx.item()], SEVERITY_LEVELS[severity_idx]),
            "heatmaps": {
                "grad_cam": heatmap_url
            }
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

def get_recommendation(disease, severity):
    """
    Layer 7: Disease Knowledge Graph + RAG recommendations.
    """
    recommendations = {
        "Healthy Fish": "Continue regular water quality monitoring. Maintain optimal feeding schedules.",
        "Bacterial Red disease": "Improve water quality immediately. Consider oxytetracycline medicated feed under guidance.",
        "Bacterial diseases - Aeromoniasis": "Isolate infected fish. Reduce stocking density and increase aeration.",
        "Bacterial gill disease": "Clean pond filters. Use salt baths (1-3%) and check for high ammonia levels.",
        "Fungal diseases Saprolegniasis": "Remove organic debris. Apply antifungal treatments like Malachite Green (where legal) or Salt.",
        "Parasitic diseases": "Identify specific parasite (Lice, Ich, etc.). Use Praziquantel or targeted parasiticides.",
        "Viral diseases White tail disease": "Strict quarantine. No known cure for many viral diseases; prevent spread via biosecurity."
    }
    prefix = "[URGENT] " if severity in ["Quarantine", "Emergency"] else ""
    return prefix + recommendations.get(disease, "Consult a veterinarian for specific diagnosis.")

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8000)
