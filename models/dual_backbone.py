import torch
import torch.nn as nn
import torch.nn.functional as F
import timm

class BenamNetV2(nn.Module):
    def __init__(self, num_classes=7):
        super(BenamNetV2, self).__init__()
        # Use ONLY MobileNetV3 for maximum speed on CPU
        self.backbone = timm.create_model('mobilenetv3_large_100', pretrained=True, num_classes=num_classes)
        
        # FREEZE ALL EXCEPT FINAL LAYER
        for name, param in self.backbone.named_parameters():
            if 'classifier' not in name:
                param.requires_grad = False

    def forward(self, x, mc_dropout=False):
        if mc_dropout:
            self.train()
        
        logits = self.backbone(x)
        
        return {
            "logits": logits,
            "severity": torch.tensor([0.5]).to(logits.device), # Stub for speed
            "features": logits
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
            "severity": torch.tensor([0.5]).to(x.device),
            "uncertainty": uncertainty
        }

    def get_gradcam(self, x, class_idx=None):
        self.eval()
        # Stub for Speed
        return torch.zeros((7, 7)).numpy()

if __name__ == "__main__":
    model = BenamNetV2(num_classes=7)
    print("Ultra-Lightweight model initialized.")
