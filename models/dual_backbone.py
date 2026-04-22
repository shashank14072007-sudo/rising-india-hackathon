import torch
import torch.nn as nn
import torch.nn.functional as F
import timm

class GatedFusionModule(nn.Module):
    def __init__(self, dim=256):
        super().__init__()
        self.proj_cnn = nn.Linear(960, dim) # MobileNetV3 Large features
        self.proj_vit = nn.Linear(192, dim) # ViT Tiny features
        
        self.gate = nn.Sequential(
            nn.Linear(dim * 2, dim),
            nn.Sigmoid()
        )
        self.out_proj = nn.Linear(dim * 2, dim)

    def forward(self, cnn_feat, vit_feat):
        c = self.proj_cnn(cnn_feat)
        v = self.proj_vit(vit_feat)
        combined = torch.cat([c, v], dim=1)
        gate = self.gate(combined)
        return self.out_proj(combined) * gate

class BenamNetV2(nn.Module):
    def __init__(self, num_classes=7):
        super(BenamNetV2, self).__init__()
        # Backbone 1: MobileNetV3 (Extremely fast on CPU)
        self.cnn_backbone = timm.create_model('mobilenetv3_large_100', pretrained=True, num_classes=0)
        # Backbone 2: Tiny ViT
        self.vit_backbone = timm.create_model('vit_tiny_patch16_224', pretrained=True, num_classes=0)
        
        # FREEZE BACKBONES for 10x Speedup
        for param in self.cnn_backbone.parameters():
            param.requires_grad = False
        for param in self.vit_backbone.parameters():
            param.requires_grad = False
            
        # Fusion
        self.fusion = GatedFusionModule(dim=256)
        
        # Multi-Task Heads
        self.classifier = nn.Sequential(
            nn.Linear(256, 128),
            nn.ReLU(),
            nn.Linear(128, num_classes)
        )
        
        self.severity_head = nn.Sequential(
            nn.Linear(256, 64),
            nn.ReLU(),
            nn.Linear(64, 1),
            nn.Sigmoid()
        )

    def forward(self, x, mc_dropout=False):
        if mc_dropout:
            self.train()
        
        # No grad for backbones to save memory/time
        with torch.no_grad():
            cnn_feats = self.cnn_backbone(x)
            vit_feats = self.vit_backbone(x)
        
        fused = self.fusion(cnn_feats, vit_feats)
        
        logits = self.classifier(fused)
        severity = self.severity_head(fused)
        
        return {
            "logits": logits,
            "severity": severity,
            "features": fused
        }

    def predict_with_uncertainty(self, x, n_passes=5):
        self.train()
        preds = []
        for _ in range(n_passes):
            out = self.forward(x)
            preds.append(F.softmax(out['logits'], dim=1))
        
        preds = torch.stack(preds)
        mean_preds = preds.mean(0)
        uncertainty = preds.var(0).mean(1)
        
        return {
            "logits": mean_preds,
            "severity": self.forward(x)['severity'],
            "uncertainty": uncertainty
        }

    def get_gradcam(self, x, class_idx=None):
        self.eval()
        # MobileNetV3 Grad-CAM stub
        features = self.cnn_backbone.forward_features(x)
        heatmap = torch.mean(features, dim=1).squeeze()
        heatmap = F.relu(heatmap)
        heatmap /= (torch.max(heatmap) + 1e-8)
        return heatmap.cpu().numpy()

if __name__ == "__main__":
    model = BenamNetV2(num_classes=7)
    dummy_input = torch.randn(1, 3, 224, 224)
    output = model(dummy_input)
    print("Lightweight V2.0 initialized successfully.")
