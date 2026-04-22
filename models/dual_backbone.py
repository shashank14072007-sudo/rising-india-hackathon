import torch
import torch.nn as nn
import torch.nn.functional as F
import timm

class GatedTripleFusion(nn.Module):
    def __init__(self, dim=512):
        super().__init__()
        self.proj_cnn = nn.Linear(1280, dim) # MobileNetV3 Large
        self.proj_vit = nn.Linear(192, dim)  # ViT Tiny
        self.proj_swin = nn.Linear(768, dim) # Swin Tiny
        
        self.gate = nn.Sequential(
            nn.Linear(dim * 3, dim),
            nn.Sigmoid()
        )
        self.attn = nn.MultiheadAttention(dim, num_heads=8, batch_first=True)
        self.out_proj = nn.Linear(dim * 3, dim)

    def forward(self, f_cnn, f_vit, f_swin):
        c = self.proj_cnn(f_cnn).unsqueeze(1)
        v = self.proj_vit(f_vit).unsqueeze(1)
        s = self.proj_swin(f_swin).unsqueeze(1)
        
        tokens = torch.cat([c, v, s], dim=1)
        attended, _ = self.attn(tokens, tokens, tokens)
        fused = attended.flatten(1)
        
        gate = self.gate(fused)
        return self.out_proj(fused) * gate

class BenamNetV2(nn.Module):
    def __init__(self, num_classes=7):
        super(BenamNetV2, self).__init__()
        # Layer 2: Triple Backbone (CPU Optimized)
        self.cnn_backbone = timm.create_model('mobilenetv3_large_100', pretrained=True, num_classes=0)
        self.vit_backbone = timm.create_model('vit_tiny_patch16_224', pretrained=True, num_classes=0)
        self.swin_backbone = timm.create_model('swin_tiny_patch4_window7_224', pretrained=True, num_classes=0)
        
        # FREEZE for Hackathon Training Speed
        for b in [self.cnn_backbone, self.vit_backbone, self.swin_backbone]:
            for param in b.parameters():
                param.requires_grad = False
                
        # Layer 3: Gated Triple Fusion
        self.fusion = GatedTripleFusion(dim=512)
        
        # Layer 6: Concept Bottleneck (Explainable Intermediates)
        # Predicts "Concepts" like Redness, Lesions, Scale Loss before the final diagnosis
        self.concept_bottleneck = nn.Linear(512, 10) # 10 Diagnostic Concepts
        
        # Multi-Task Heads
        self.classifier = nn.Sequential(
            nn.Linear(10, 64), # Classification from Concepts
            nn.ReLU(),
            nn.Linear(64, num_classes)
        )
        
        self.severity_head = nn.Sequential(
            nn.Linear(512, 64),
            nn.ReLU(),
            nn.Linear(64, 1),
            nn.Sigmoid()
        )

    def forward(self, x, mc_dropout=False):
        if mc_dropout:
            self.train()
        
        # L2: Triple Backbone Extraction
        with torch.no_grad():
            cnn_feats = self.cnn_backbone(x)
            vit_feats = self.vit_backbone(x)
            swin_feats = self.swin_backbone(x)
        
        # L3: Fusion
        fused = self.fusion(cnn_feats, vit_feats, swin_feats)
        
        # L6: Concept Bottleneck
        concepts = torch.sigmoid(self.concept_bottleneck(fused))
        
        # Multi-task outputs
        logits = self.classifier(concepts)
        severity = self.severity_head(fused)
        
        return {
            "logits": logits,
            "concepts": concepts,
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
            "uncertainty": uncertainty,
            "concepts": self.forward(x)['concepts']
        }

    def get_gradcam(self, x, class_idx=None):
        self.eval()
        #targets the CNN backbone for heatmaps
        features = self.cnn_backbone.forward_features(x)
        heatmap = torch.mean(features, dim=1).squeeze()
        heatmap = F.relu(heatmap)
        heatmap /= (torch.max(heatmap) + 1e-8)
        return heatmap.cpu().numpy()

if __name__ == "__main__":
    model = BenamNetV2(num_classes=7)
    print("Full 11-Layer Architecture Model Initialized Successfully.")
