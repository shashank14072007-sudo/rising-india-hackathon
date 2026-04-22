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

def get_recommendation(disease, severity, lang="en"):
    """
    Layer 7: Disease Knowledge Graph + RAG recommendations with Localization.
    """
    recommendations = {
        "en": {
            "Healthy Fish": "Continue regular water quality monitoring. Maintain optimal feeding schedules.",
            "Bacterial Red disease": "Improve water quality immediately. Consider oxytetracycline medicated feed.",
            "Bacterial diseases - Aeromoniasis": "Isolate infected fish. Reduce stocking density and increase aeration.",
            "Bacterial gill disease": "Clean pond filters. Use salt baths (1-3%) and check for high ammonia.",
            "Fungal diseases Saprolegniasis": "Remove organic debris. Apply antifungal treatments like Salt.",
            "Parasitic diseases": "Identify specific parasite. Use Praziquantel or targeted parasiticides.",
            "Viral diseases White tail disease": "Strict quarantine. prevent spread via strict biosecurity."
        },
        "hi": {
            "Healthy Fish": "नियमित जल गुणवत्ता निगरानी जारी रखें। उचित आहार कार्यक्रम बनाए रखें।",
            "Bacterial Red disease": "पानी की गुणवत्ता में तुरंत सुधार करें। दवायुक्त आहार पर विचार करें।",
            "Bacterial diseases - Aeromoniasis": "संक्रमित मछली को अलग करें। स्टॉक घनत्व कम करें और वातन बढ़ाएं।",
            "Bacterial gill disease": "तालाब के फिल्टर साफ करें। नमक के घोल (1-3%) का प्रयोग करें।",
            "Fungal diseases Saprolegniasis": "जैविक कचरा हटाएं। नमक जैसे कवकनाशी उपचार लागू करें।",
            "Parasitic diseases": "विशिष्ट परजीवी की पहचान करें। लक्षित परजीवीनाशकों का उपयोग करें।",
            "Viral diseases White tail disease": "सख्त क्वारंटाइन। जैव सुरक्षा के माध्यम से प्रसार को रोकें।"
        },
        "mr": {
            "Healthy Fish": "नियमित पाणी गुणवत्ता देखरेख सुरू ठेवा. योग्य आहार वेळापत्रक पाळा.",
            "Bacterial Red disease": "पाण्याची गुणवत्ता त्वरित सुधारा. औषधोपचारयुक्त खाद्याचा विचार करा.",
            "Bacterial diseases - Aeromoniasis": "बाधित माशांना वेगळे करा. साठा कमी करा आणि वायुवीजन वाढवा.",
            "Bacterial gill disease": "तलावाचे फिल्टर साफ करा. मिठाच्या पाण्याचा (1-3%) वापर करा.",
            "Fungal diseases Saprolegniasis": "सेंद्रिय कचरा काढून टाका. मिठासारखे बुरशीनाशक उपचार लागू करा.",
            "Parasitic diseases": "विशिष्ट परजीवी ओळखा. लक्ष्यित परजीवीनाशकांचा वापर करा.",
            "Viral diseases White tail disease": "कडक क्वारंटाइन. जैवसुरक्षेद्वारे प्रसार रोखा."
        }
    }
    
    selected_lang = recommendations.get(lang, recommendations["en"])
    rec = selected_lang.get(disease, "Consult a veterinarian.")
    
    prefix = {
        "en": "[URGENT] ",
        "hi": "[तत्काल] ",
        "mr": "[त्वरीत] "
    }
    
    p = prefix.get(lang, "[URGENT] ") if severity in ["Quarantine", "Emergency"] else ""
    return p + rec

import base64
from models.dual_backbone import BenamNetV2
from utils.preprocessing import preprocess_image, overlay_heatmap

# Initialize Model (Layer 2 & 3)
device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
model = BenamNetV2(num_classes=7)
# Load weights if available
if os.path.exists("best_benam_model.pth"):
    model.load_state_dict(torch.load("best_benam_model.pth", map_location=device))
model.to(device)
model.eval()

def image_to_base64(image):
    buffered = io.BytesIO()
    image.save(buffered, format="JPEG")
    return base64.b64encode(buffered.getvalue()).decode()

@app.post("/predict")
async def predict(file: UploadFile = File(...), lang: str = "en"):
    if not file.content_type.startswith("image/"):
        raise HTTPException(status_code=400, detail="Invalid file type")

    try:
        contents = await file.read()
        image = Image.open(io.BytesIO(contents)).convert("RGB")
        processed_img = preprocess_image(image)
        
        input_tensor = torch.from_numpy(np.array(processed_img)).permute(2, 0, 1).float().unsqueeze(0) / 255.0
        input_tensor = input_tensor.to(device)
        
        # 1. Prediction with Uncertainty (Layer 5)
        with torch.no_grad():
            output = model.predict_with_uncertainty(input_tensor, n_passes=5)
            
        probs = output["logits"]
        conf, pred_idx = torch.max(probs, dim=1)
        uncertainty = output["uncertainty"].item()
        
        severity_val = output["severity"].item()
        severity_idx = int(severity_val * 3)
        disease_name = CLASSES[pred_idx.item()]

        # 2. Layer 5: Explainability (Grad-CAM)
        heatmap = model.get_gradcam(input_tensor)
        overlaid_img = overlay_heatmap(image, heatmap)
        heatmap_base64 = image_to_base64(overlaid_img)

        return {
            "disease": disease_name,
            "confidence": round(conf.item(), 4),
            "uncertainty": round(uncertainty, 4),
            "severity": SEVERITY_LEVELS[severity_idx],
            "severity_score": round(severity_val, 4),
            "recommendation": get_recommendation(disease_name, SEVERITY_LEVELS[severity_idx], lang),
            "heatmap_b64": heatmap_base64,
            "architecture": "BenamNet v2.0 (Triple Backbone)"
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8000)
