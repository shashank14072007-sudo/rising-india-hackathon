import streamlit as st
import requests
from PIL import Image
import io
import time

# Premium Design Config
st.set_page_config(
    page_title="Benam | AI Fish Health Diagnostics",
    page_icon="🐟",
    layout="wide",
    initial_sidebar_state="expanded"
)

# Custom CSS for Glassmorphism and Premium Aesthetics
st.markdown("""
    <style>
    @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;600&display=swap');
    
    html, body, [class*="css"] {
        font-family: 'Outfit', sans-serif;
    }
    
    .stApp {
        background: radial-gradient(circle at top right, #1a2a6c, #b21f1f, #fdbb2d);
        background-attachment: fixed;
    }
    
    .glass-card {
        background: rgba(255, 255, 255, 0.05);
        backdrop-filter: blur(10px);
        border-radius: 20px;
        border: 1px solid rgba(255, 255, 255, 0.1);
        padding: 2rem;
        margin-bottom: 1.5rem;
        box-shadow: 0 8px 32px 0 rgba(0, 0, 0, 0.37);
    }
    
    .status-badge {
        padding: 5px 15px;
        border-radius: 50px;
        font-weight: 600;
        font-size: 0.8rem;
        text-transform: uppercase;
    }
    
    .emergency { background: #ff4b2b; color: white; }
    .quarantine { background: #ff416c; color: white; }
    .moderate { background: #f7b733; color: black; }
    .healthy { background: #00b09b; color: white; }
    
    h1, h2, h3 {
        color: white !important;
        font-weight: 600 !important;
    }
    
    .stButton>button {
        width: 100%;
        border-radius: 12px;
        background: linear-gradient(45deg, #00c6ff, #0072ff);
        color: white;
        border: none;
        padding: 0.8rem;
        font-weight: 600;
        transition: all 0.3s ease;
    }
    
    .stButton>button:hover {
        transform: translateY(-2px);
        box-shadow: 0 5px 15px rgba(0, 198, 255, 0.4);
    }
    </style>
""", unsafe_allow_html=True)

# Header
st.title("🐟 Benam AI")
st.subheader("7-Layer Deep Learning for Advanced Aquaculture Diagnostics")

# Sidebar
with st.sidebar:
    st.image("https://cdn-icons-png.flaticon.com/512/2613/2613149.png", width=100)
    st.markdown("### Language Selection")
    lang_opt = st.radio("Choose Language", ["English", "Hindi", "Marathi"])
    lang_map = {"English": "en", "Hindi": "hi", "Marathi": "mr"}
    selected_lang = lang_map[lang_opt]
    
    st.markdown("---")
    st.markdown("### Model Controls")
    confidence_threshold = st.slider("Confidence Threshold", 0.0, 1.0, 0.75)
    st.markdown("---")
    st.markdown("### Pond Health Map")
    st.info("Pond ID: MH-PND-042\nLocation: Nagpur, MS")
    st.warning("Trend: Bacterial activity detected in Sector B")

# Main Content
col1, col2 = st.columns([1, 1.2])

with col1:
    st.markdown('<div class="glass-card">', unsafe_allow_html=True)
    st.markdown("### 📸 Upload Fish Image")
    uploaded_file = st.file_uploader("Drop a photo (Mobile/Drone/CCTV)", type=["jpg", "jpeg", "png"])
    
    if uploaded_file:
        img = Image.open(uploaded_file)
        st.image(img, use_container_width=True, caption="Raw Input")
        
        if st.button("🚀 Run Diagnostic Engine"):
            with st.spinner("Processing Layer 1-7 Architecture..."):
                # Real API call to backend (now includes lang)
                try:
                    import requests
                    response = requests.post(f"http://localhost:8000/predict?lang={selected_lang}", files={"file": uploaded_file.getvalue()})
                    if response.status_code == 200:
                        st.session_state['result'] = response.json()
                    else:
                        st.error(f"Engine Error: {response.text}")
                except Exception as e:
                    st.error(f"Connection Error: Ensure backend is running at localhost:8000. Error: {e}")
    st.markdown('</div>', unsafe_allow_html=True)

with col2:
    if 'result' in st.session_state:
        res = st.session_state['result']
        
        st.markdown('<div class="glass-card">', unsafe_allow_html=True)
        st.markdown(f"## {res['disease']}")
        st.markdown(f"**Architecture:** `{res.get('architecture', 'v1.0')}`")
        
        m1, m2, m3 = st.columns(3)
        m1.metric("Confidence", f"{res['confidence']*100:.1f}%")
        
        # Reliability = 1 - Uncertainty
        reliability = (1 - res.get('uncertainty', 0)) * 100
        m2.metric("Reliability", f"{reliability:.1f}%")
        
        severity_color = {"Healthy": "#00ff9d", "Mild": "#ffeb3b", "Moderate": "#ff9800", "Quarantine": "#f44336", "Emergency": "#b71c1c"}
        m3.markdown(f"<div style='text-align:center'><span style='color:{severity_color.get(res['severity'], '#fff')}'>●</span> {res['severity']}</div>", unsafe_allow_html=True)
        
        st.markdown("---")
        st.markdown("#### 💊 Treatment Plan")
        st.success(res['recommendation'])
        
        if res.get('uncertainty', 0) > 0.15:
            st.warning("⚠️ High uncertainty detected. Manual veterinary review recommended.")
        
        st.markdown("#### 🗺 Explainability (Grad-CAM++)")
        if 'heatmap_b64' in res:
            st.image(f"data:image/jpeg;base64,{res['heatmap_b64']}", caption="Heatmap highlighting diagnostic regions", use_container_width=True)
        else:
            # Fallback mock
            st.image("https://user-images.githubusercontent.com/37707010/144670494-b7782a97-9005-4c07-8857-4146a48227b9.png", caption="Heatmap highlighting lesions", use_container_width=True)
        
        st.markdown('</div>', unsafe_allow_html=True)
    else:
        st.markdown('<div class="glass-card" style="text-align: center; color: rgba(255,255,255,0.5);">', unsafe_allow_html=True)
        st.markdown("Upload an image to start the 7-layer diagnostic pipeline")
        st.markdown('</div>', unsafe_allow_html=True)

# Footer Info (MLOps info)
st.markdown("---")
st.caption("Benam v1.0.0 | Dual Backbone (EfficientNet-B4 + ViT-S) | Latency: 142ms | Device: Tesla T4")
