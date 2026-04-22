import torch
import torch.nn as nn
import torch.nn.functional as F
import timm

class GatedTripleFusion(nn.Module):
    def __init__(self, dim=512):
        super().__init__()
        self.proj_effnet = nn.Linear(1792, dim)
        self.proj_vit = nn.Linear(384, dim)
        self.proj_swin = nn.Linear(768, dim) # Swin-T output
        
        self.gate = nn.Sequential(
            nn.Linear(dim * 3, dim),
            nn.Sigmoid() 
        )
        self.attn = nn.MultiheadAttention(dim, num_heads=8, batch_first=True)
        self.out_proj = nn.Linear(dim * 3, dim)

    def forward(self, f_eff, f_vit, f_swin):
        e = self.proj_effnet(f_eff).unsqueeze(1)
        v = self.proj_vit(f_vit).unsqueeze(1)
        s = self.proj_swin(f_swin).unsqueeze(1)
        
        tokens = torch.cat([e, v, s], dim=1)
        attended, _ = self.attn(tokens, tokens, tokens)
        fused = attended.flatten(1)
        
        gate = self.gate(fused)
        return self.out_proj(fused) * gate

class BenamNetV2(nn.Module):
    def __init__(self, num_classes=7):
        super(BenamNetV2, self).__init__()
        # Backbone 1: Local Texture
        self.cnn_backbone = timm.create_model('efficientnet_b4', pretrained=True, num_classes=0)
        
        # Backbone 2: Global Structure
        self.vit_backbone = timm.create_model('vit_small_patch16_224', pretrained=True, num_classes=0)
        
        # Backbone 3: Sequential Spatial (Swin as VMamba surrogate)
        self.swin_backbone = timm.create_model('swin_tiny_patch4_window7_224', pretrained=True, num_classes=0)
        
        # Fusion
        self.fusion = GatedTripleFusion(dim=512)
        
        # Multi-Task Heads
        self.classifier = nn.Sequential(
            nn.Dropout(0.3),
            nn.Linear(512, 256),
            nn.ReLU(),
            nn.Linear(256, num_classes)
        )
        
        self.severity_head = nn.Sequential(
            nn.Linear(512, 128),
            nn.ReLU(),
            nn.Linear(128, 1),
            nn.Sigmoid()
        )
        
        # Segmentation Head (Lightweight Decoder)
        self.seg_head = nn.Sequential(
            nn.ConvTranspose2d(512, 256, kernel_size=4, stride=2, padding=1),
            nn.ReLU(),
            nn.ConvTranspose2d(256, 128, kernel_size=4, stride=2, padding=1),
            nn.ReLU(),
            nn.ConvTranspose2d(128, 64, kernel_size=4, stride=2, padding=1),
            nn.ReLU(),
            nn.ConvTranspose2d(64, 1, kernel_size=3, padding=1),
            nn.Sigmoid()
        )

    def forward(self, x, mc_dropout=False):
        if mc_dropout:
            self.train() 
        
        cnn_feats = self.cnn_backbone(x)
        vit_feats = self.vit_backbone(x)
        swin_feats = self.swin_backbone(x)
        
        fused = self.fusion(cnn_feats, vit_feats, swin_feats)
        
        logits = self.classifier(fused)
        severity = self.severity_head(fused)
        
        return {
            "logits": logits,
            "severity": severity,
            "features": fused
        }

    def predict_with_uncertainty(self, x, n_passes=10):
        self.train()
        preds = []
        severities = []
        for _ in range(n_passes):
            out = self.forward(x)
            preds.append(F.softmax(out['logits'], dim=1))
            severities.append(out['severity'])
        
        preds = torch.stack(preds)
        mean_preds = preds.mean(0)
        uncertainty = preds.var(0).mean(1)
        
        return {
            "logits": mean_preds,
            "severity": torch.stack(severities).mean(0),
            "uncertainty": uncertainty
        }

    def get_gradcam(self, x, class_idx=None):
        self.eval()
        features = self.cnn_backbone.forward_features(x)
        with torch.no_grad():
            output = self.forward(x)
            if class_idx is None:
                class_idx = torch.argmax(output['logits'], dim=1)
            
            heatmap = torch.mean(features, dim=1).squeeze()
            heatmap = F.relu(heatmap)
            heatmap /= (torch.max(heatmap) + 1e-8)
            return heatmap.cpu().numpy()

if __name__ == "__main__":
    model = BenamNetV2(num_classes=7)
    dummy_input = torch.randn(1, 3, 224, 224)
    output = model(dummy_input)
    print(f"Logits shape: {output['logits'].shape}")
    print(f"Severity shape: {output['severity'].shape}")
