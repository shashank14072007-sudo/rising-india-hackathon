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

def get_background_subtraction(image_path):
    """
    Stub for MOG2 background subtraction (used for CCTV/Drone streams).
    """
    backSub = cv2.createBackgroundSubtractorMOG2()
    # In a real scenario, this would process a sequence of frames.
    # For a single image, it's just a placeholder.
    img = cv2.imread(image_path)
    fgMask = backSub.apply(img)
    return fgMask
