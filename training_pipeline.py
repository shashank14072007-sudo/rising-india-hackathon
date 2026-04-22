import os
import torch
import torch.nn as nn
import torch.optim as optim
from torch.utils.data import DataLoader
from torchvision import transforms, datasets
from tqdm import tqdm
from models.dual_backbone import BenamNetV2

# %% [markdown]
# ## 1. Augmentation Strategy (Layer 4)
# Includes underwater simulation (blur, color jitter) and standard AugMix.

# %%
DATA_DIR = r"c:\Users\shash\OneDrive\Desktop\benam\Freshwater Fish Disease Aquaculture in south asia"
TRAIN_DIR = os.path.join(DATA_DIR, "Train")
VAL_DIR = os.path.join(DATA_DIR, "Test")
BATCH_SIZE = 32 # Increased for 7 classes
NUM_EPOCHS = 100
LEARNING_RATE = 2e-4

train_transform = transforms.Compose([
    transforms.RandomResizedCrop(224),
    transforms.RandomHorizontalFlip(),
    transforms.ColorJitter(brightness=0.3, contrast=0.3, saturation=0.3), # Murky water
    transforms.GaussianBlur(kernel_size=(5, 9), sigma=(0.1, 3.0)),        # Turbidity
    transforms.ToTensor(),
    transforms.Normalize(mean=[0.485, 0.456, 0.406], std=[0.229, 0.224, 0.225])
])

val_transform = transforms.Compose([
    transforms.Resize((224, 224)),
    transforms.ToTensor(),
    transforms.Normalize(mean=[0.485, 0.456, 0.406], std=[0.229, 0.224, 0.225])
])

# %% [markdown]
# ## 2. Loss & Metrics

# %%
class FocalLoss(nn.Module):
    def __init__(self, alpha=1, gamma=2):
        super().__init__()
        self.alpha = alpha
        self.gamma = gamma

    def forward(self, inputs, targets):
        ce_loss = nn.CrossEntropyLoss()(inputs, targets)
        pt = torch.exp(-ce_loss)
        focal_loss = self.alpha * (1 - pt)**self.gamma * ce_loss
        return focal_loss

def calculate_accuracy(outputs, targets):
    _, preds = torch.max(outputs, 1)
    return torch.sum(preds == targets).item() / len(targets)

# %% [markdown]
# ## 3. Training & Validation Loops

# %%
def train_model():
    device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
    print(f"Training BenamNetV2 on {device}")

    # Check if data exists
    if not os.path.exists(TRAIN_DIR):
        print(f"⚠️ Error: Training directory '{TRAIN_DIR}' not found. Please organize your dataset.")
        return

    # DataLoaders
    train_ds = datasets.ImageFolder(TRAIN_DIR, transform=train_transform)
    val_ds = datasets.ImageFolder(VAL_DIR, transform=val_transform)
    
    train_loader = DataLoader(train_ds, batch_size=BATCH_SIZE, shuffle=True, num_workers=2)
    val_loader = DataLoader(val_ds, batch_size=BATCH_SIZE, shuffle=False, num_workers=2)

    num_classes = len(train_ds.classes)
    model = BenamNetV2(num_classes=num_classes).to(device)
    
    optimizer = optim.AdamW(model.parameters(), lr=LEARNING_RATE, weight_decay=1e-2)
    scheduler = optim.lr_scheduler.CosineAnnealingLR(optimizer, T_max=NUM_EPOCHS)
    criterion = FocalLoss()
    
    best_acc = 0.0

    for epoch in range(NUM_EPOCHS):
        # Training Phase
        model.train()
        train_loss = 0.0
        train_acc = 0.0
        
        pbar = tqdm(train_loader, desc=f"Epoch {epoch+1}/{NUM_EPOCHS}")
        for images, labels in pbar:
            images, labels = images.to(device), labels.to(device)
            
            optimizer.zero_grad()
            outputs = model(images)
            
            loss = criterion(outputs['logits'], labels)
            # Optional: Add severity regression loss here if data available
            
            loss.backward()
            optimizer.step()
            
            train_loss += loss.item()
            train_acc += calculate_accuracy(outputs['logits'], labels)
            pbar.set_postfix(loss=loss.item())

        # Validation Phase
        model.eval()
        val_acc = 0.0
        with torch.no_grad():
            for images, labels in val_loader:
                images, labels = images.to(device), labels.to(device)
                outputs = model(images)
                val_acc += calculate_accuracy(outputs['logits'], labels)

        avg_val_acc = val_acc / len(val_loader)
        print(f"Epoch {epoch+1}: Train Loss: {train_loss/len(train_loader):.4f} | Val Acc: {avg_val_acc:.4f}")
        
        # Save Best Model
        if avg_val_acc > best_acc:
            best_acc = avg_val_acc
            torch.save(model.state_dict(), "best_benam_model.pth")
            print("New Best Model Saved!")

        scheduler.step()

if __name__ == "__main__":
    train_model()
