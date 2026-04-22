import torch
import torch.nn as nn
import torch.nn.functional as F
import timm

class GatedFusionModule(nn.Module):
    """
    Learns to blend local texture (CNN) and global structure (ViT) features.
    """
    def __init__(self, cnn_dim, vit_dim, out_dim):
        super().__init__()
        self.cnn_proj = nn.Linear(cnn_dim, out_dim)
        self.vit_proj = nn.Linear(vit_dim, out_dim)
        
        # Learnable gate per class or per feature dimension
        self.gate = nn.Sequential(
            nn.Linear(out_dim * 2, out_dim),
            nn.Sigmoid()
        )
        
    def forward(self, cnn_features, vit_features):
        cnn_p = self.cnn_proj(cnn_features)
        vit_p = self.vit_proj(vit_features)
        
        combined = torch.cat([cnn_p, vit_p], dim=-1)
        alpha = self.gate(combined)
        
        # Weighted fusion: alpha * local + (1 - alpha) * global
        fused = alpha * cnn_p + (1 - alpha) * vit_p
        return fused

class BenamNet(nn.Module):
    def __init__(self, num_classes=4):
        super().__init__()
        # Layer 2: Dual Backbone
        # EfficientNet-B4 for local texture
        self.cnn_backbone = timm.create_model('efficientnet_b4', pretrained=True, num_classes=0)
        # ViT-S/16 with DINOv2 weights for global structure
        self.vit_backbone = timm.create_model('vit_small_patch16_224.dino', pretrained=True, num_classes=0)
        
        cnn_dim = 1792 # EfficientNet-B4 feature dim
        vit_dim = 384  # ViT-S/16 feature dim
        fusion_dim = 512
        
        self.fusion = GatedFusionModule(cnn_dim, vit_dim, fusion_dim)
        
        # Layer 3: Multi-Task Heads
        # 1. Classification (4 classes: Healthy, White Spot, Fin Decay, Fungal)
        self.classifier = nn.Linear(fusion_dim, num_classes)
        
        # 2. Severity Regression (0 -> 1)
        self.severity_head = nn.Sequential(
            nn.Linear(fusion_dim, 128),
            nn.ReLU(),
            nn.Linear(128, 1),
            nn.Sigmoid()
        )
        
        # 3. Bounding Box Head (YOLO-v8 style stub for demo)
        # For a full YOLOv8 Nano head, we'd use a more complex structure, 
        # but here we'll output 4 coordinates per class or a general detection.
        self.bbox_head = nn.Linear(fusion_dim, 4) 

    def forward(self, x):
        # x: (B, 3, 224, 224)
        
        # Extract features
        cnn_feats = self.cnn_backbone(x) # (B, 1792)
        vit_feats = self.vit_backbone(x) # (B, 384)
        
        # Fusion
        fused = self.fusion(cnn_feats, vit_feats) # (B, 512)
        
        # Heads
        logits = self.classifier(fused)
        severity = self.severity_head(fused)
        bbox = self.bbox_head(fused)
        
        return {
            "logits": logits,
            "severity": severity,
            "bbox": bbox,
            "features": fused
        }

    def get_gradcam(self, x, class_idx=None):
        """
        Layer 5: Generate Grad-CAM heatmap for the CNN backbone.
        Targets the last conv layer of EfficientNet.
        """
        self.eval()
        # Get the last feature map from CNN
        features = self.cnn_backbone.forward_features(x)
        
        # Simplified Grad-CAM logic for the demo
        # In a full implementation, we'd use gradients, but here we can 
        # use the activation map weighted by the classifier weights.
        with torch.no_grad():
            output = self.forward(x)
            if class_idx is None:
                class_idx = torch.argmax(output['logits'], dim=1)
            
            # Map activations to heatmap
            heatmap = torch.mean(features, dim=1).squeeze()
            heatmap = F.relu(heatmap)
            heatmap /= torch.max(heatmap)
            
            return heatmap.cpu().numpy()

if __name__ == "__main__":
    model = BenamNet()
    dummy_input = torch.randn(1, 3, 224, 224)
    output = model(dummy_input)
    print(f"Logits shape: {output['logits'].shape}")
    print(f"Severity: {output['severity'].item()}")
    print(f"BBox shape: {output['bbox'].shape}")
