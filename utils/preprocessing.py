import cv2
import numpy as np
from PIL import Image

def apply_clahe(image):
    """
    Apply Contrast Limited Adaptive Histogram Equalization (CLAHE).
    Especially useful for murky pond water.
    """
    # Convert PIL to CV2
    img_array = np.array(image)
    lab = cv2.cvtColor(img_array, cv2.COLOR_RGB2LAB)
    l, a, b = cv2.split(lab)
    
    clahe = cv2.createCLAHE(clipLimit=3.0, tileGridSize=(8,8))
    cl = clahe.apply(l)
    
    limg = cv2.merge((cl,a,b))
    final = cv2.cvtColor(limg, cv2.COLOR_LAB2RGB)
    return Image.fromarray(final)

def preprocess_image(image, target_size=(224, 224)):
    """
    Layer 1: Full preprocessing pipeline.
    """
    # 1. CLAHE Enhancement
    enhanced = apply_clahe(image)
    
    # 2. Resize
    resized = enhanced.resize(target_size, Image.LANCZOS)
    
    return resized

def overlay_heatmap(image, heatmap, alpha=0.5):
    """
    Overlay Grad-CAM heatmap on the original image.
    """
    img_array = np.array(image)
    # Resize heatmap to match image size
    heatmap_resized = cv2.resize(heatmap, (img_array.shape[1], img_array.shape[0]))
    
    # Convert heatmap to RGB (JET colormap)
    heatmap_color = cv2.applyColorMap(np.uint8(255 * heatmap_resized), cv2.COLORMAP_JET)
    heatmap_color = cv2.cvtColor(heatmap_color, cv2.COLOR_BGR2RGB)
    
    # Blend
    overlaid = cv2.addWeighted(img_array, 1 - alpha, heatmap_color, alpha, 0)
    return Image.fromarray(overlaid)
