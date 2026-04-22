import React, { useState, useEffect, useRef } from "react";
import axios from "axios";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Zap, Shield, Activity, Droplets, Thermometer, Wind, 
  CheckCircle2, AlertCircle, RefreshCw, Languages, Search, 
  Cpu, Network, Database
} from "lucide-react";

/* ───────── CONFIG ───────── */
const API_BASE = "http://localhost:8000";

const CLASSES_MAP = {
  "Bacterial Red disease": { emoji: "🔴", cure: "💊 Improve water quality + Medicated feed", color: "#ff4d4d", bg: "rgba(255, 77, 77, 0.1)", severity: 3, tip: "Red spots or streaks on body/fins." },
  "Bacterial diseases - Aeromoniasis": { emoji: "🦠", cure: "🧪 Isolate fish + Increase aeration", color: "#ffaa00", bg: "rgba(255, 170, 0, 0.1)", severity: 4, tip: "Swollen belly or ulcers detected." },
  "Bacterial gill disease": { emoji: "🫁", cure: "🧼 Clean filters + Salt baths", color: "#00d4ff", bg: "rgba(0, 212, 255, 0.1)", severity: 3, tip: "Fish gasping at surface or flared gills." },
  "Fungal diseases Saprolegniasis": { emoji: "🍄", cure: "🧂 Remove debris + Salt/Antifungal", color: "#a855f7", bg: "rgba(168, 85, 247, 0.1)", severity: 2, tip: "Cotton-like white growth on body." },
  "Healthy Fish": { emoji: "🌟", cure: "🥰 Keep up the great care!", color: "#00ff9d", bg: "rgba(0, 255, 157, 0.1)", severity: 0, tip: "No disease detected. Your fish is thriving!" },
  "Parasitic diseases": { emoji: "🔍", cure: "🩹 Identify parasite + Targeted meds", color: "#fbbf24", bg: "rgba(251, 191, 36, 0.1)", severity: 2, tip: "Fish rubbing against objects (flashing)." },
  "Viral diseases White tail disease": { emoji: "🧬", cure: "🚨 Strict quarantine + Biosecurity", color: "#ef4444", bg: "rgba(239, 68, 68, 0.1)", severity: 4, tip: "Whitish tail/body with high mortality." }
};

/* ───────── COMPONENTS ───────── */
const LayerBadge = ({ label, status = "Active", icon: Icon }) => (
  <div className="flex items-center gap-2 px-3 py-1.5 bg-white/5 border border-white/10 rounded-xl">
    <Icon size={12} className="text-benam-accent" />
    <div className="flex flex-col">
      <span className="text-[8px] text-slate-500 uppercase tracking-tighter leading-none">{label}</span>
      <span className="text-[10px] font-bold text-benam-accent2 font-mono leading-none">{status}</span>
    </div>
  </div>
);

const CuteFish = ({ color = "#00d4ff", size = 80, wiggle = false, sad = false }) => (
  <svg width={size} height={size * 0.65} viewBox="0 0 120 78" fill="none"
    style={{ animation: wiggle ? "fishWiggle 0.6s ease-in-out infinite alternate" : undefined }}>
    <path d="M95 39 L120 18 L120 60 Z" fill={color} opacity="0.8" />
    <ellipse cx="55" cy="39" rx="48" ry="28" fill={color} />
    <circle cx="26" cy="32" r="10" fill="white" />
    <circle cx={sad ? "24" : "27"} cy={sad ? "34" : "31"} r="6" fill="#040a0f" />
    {sad ? <path d="M18 46 Q22 44 26 46" stroke="#040a0f" strokeWidth="2" fill="none" /> : <path d="M16 44 Q20 48 25 45" stroke="#040a0f" strokeWidth="2" fill="none" />}
  </svg>
);

export default function App() {
  const [screen, setScreen] = useState("home");
  const [imgUrl, setImgUrl] = useState(null);
  const [progress, setProgress] = useState(0);
  const [phase, setPhase] = useState(0);
  const [result, setResult] = useState(null);
  const [lang, setLang] = useState("en");
  const [loading, setLoading] = useState(false);
  const fileRef = useRef();

  const phases = [
    "L1: Bio-Signal Ingestion",
    "L2: Triple Backbone Extraction",
    "L3: Gated Feature Fusion",
    "L4: Turbulence Augmentation",
    "L5: Pathology Localization",
    "L6: Concept Bottleneck Analysis",
    "L8: MC-Dropout Uncertainty Calc",
    "L9: IoT Environmental Sync",
    "L10: Edge Deployment Prep",
    "L11: Federated Node Handshake"
  ];

  const handleUpload = async (file) => {
    if (!file) return;
    setImgUrl(URL.createObjectURL(file));
    setScreen("scan");
    setLoading(true);

    let p = 0;
    const interval = setInterval(() => {
      p += 0.8;
      if (p > 98) p = 98;
      setProgress(p);
      setPhase(Math.min(9, Math.floor(p / 10)));
    }, 40);

    const formData = new FormData();
    formData.append("file", file);

    try {
      const res = await axios.post(`${API_BASE}/predict?lang=${lang}`, formData);
      clearInterval(interval);
      setProgress(100);
      setPhase(9);
      setTimeout(() => {
        setResult({ ...res.data, meta: CLASSES_MAP[res.data.disease] || CLASSES_MAP["Healthy Fish"] });
        setScreen("result");
        setLoading(false);
      }, 500);
    } catch (err) {
      clearInterval(interval);
      alert("Engine Error: Ensure backend is running at localhost:8000");
      setScreen("home");
    }
  };

  return (
    <div className="min-h-screen bg-[#040a0f] text-slate-100 font-sans selection:bg-[#00d4ff]/30 overflow-x-hidden">
      <style>{`
        @keyframes fishWiggle { from { transform: rotate(-4deg); } to { transform: rotate(4deg); } }
        .glass { background: rgba(10, 21, 32, 0.6); backdrop-filter: blur(20px); border: 1px solid rgba(255, 255, 255, 0.1); }
        .glow-blue { box-shadow: 0 0 30px rgba(0, 212, 255, 0.15); }
        .text-gradient { background: linear-gradient(90deg, #00d4ff, #00ff9d); -webkit-background-clip: text; -webkit-text-fill-color: transparent; }
      `}</style>

      {/* Decorative BG */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-1/2 h-1/2 bg-[#00d4ff]/5 blur-[120px] rounded-full" />
        <div className="absolute bottom-[-10%] right-[-10%] w-1/2 h-1/2 bg-[#00ff9d]/5 blur-[120px] rounded-full" />
      </div>

      {/* Nav */}
      <header className="relative z-50 px-6 py-4 flex justify-between items-center border-b border-white/5 backdrop-blur-md">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-gradient-to-br from-[#00d4ff] to-[#00ff9d] rounded-xl flex items-center justify-center glow-blue">
            <Activity size={24} className="text-black" />
          </div>
          <div>
            <h1 className="text-xl font-black tracking-tighter italic">BENAM <span className="text-[#00d4ff]">ULTRA</span></h1>
            <p className="text-[10px] font-mono text-slate-500 uppercase tracking-widest">Enterprise Architecture v2.0</p>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <div className="hidden md:flex gap-2">
            <LayerBadge label="L10: Edge" status="Optimized" icon={Cpu} />
            <LayerBadge label="L11: Federated" status="Node-7 Active" icon={Network} />
          </div>
          <select 
            value={lang} 
            onChange={(e) => setLang(e.target.value)}
            className="bg-white/5 border border-white/10 rounded-xl px-3 py-1.5 text-xs font-bold outline-none focus:border-[#00d4ff]"
          >
            <option value="en">English</option>
            <option value="hi">हिंदी</option>
            <option value="mr">मराठी</option>
          </select>
        </div>
      </header>

      {/* Main Content */}
      <main className="relative z-10 max-w-7xl mx-auto p-6 min-h-[calc(100vh-80px)] flex items-center justify-center">
        
        {screen === "home" && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="text-center">
            <div className="mb-8 inline-block animate-bounce duration-[3000ms]">
                <CuteFish size={120} wiggle />
            </div>
            <h2 className="text-5xl md:text-7xl font-black mb-4 tracking-tighter leading-none text-gradient">
              THE FUTURE OF <br />AQUACULTURE.
            </h2>
            <p className="text-slate-400 max-w-xl mx-auto mb-10 text-lg">
              Powered by an 11-Layer Triple-Backbone Neural Engine. <br />
              Deploying real-time diagnostics for global fish health.
            </p>
            
            <div 
              className="glass p-12 rounded-[40px] border-2 border-dashed border-[#00d4ff]/30 hover:border-[#00d4ff] transition-all cursor-pointer group"
              onClick={() => fileRef.current.click()}
            >
              <div className="w-20 h-20 bg-[#00d4ff]/10 rounded-3xl flex items-center justify-center mx-auto mb-6 group-hover:scale-110 transition-transform">
                <RefreshCw size={40} className="text-[#00d4ff]" />
              </div>
              <h3 className="text-2xl font-bold mb-2">Ingest Bio-Signal</h3>
              <p className="text-slate-500 text-sm">Drop fish image or click to initiate 11-layer scan</p>
              <input type="file" ref={fileRef} className="hidden" onChange={(e) => handleUpload(e.target.files[0])} />
            </div>
          </motion.div>
        )}

        {screen === "scan" && (
          <div className="w-full max-w-2xl text-center">
            <div className="mb-12"><CuteFish size={100} wiggle /></div>
            <h3 className="text-3xl font-black mb-8 italic tracking-tighter uppercase">{phases[phase]}</h3>
            <div className="w-full h-4 bg-white/5 rounded-full overflow-hidden border border-white/10 mb-6">
              <motion.div 
                className="h-full bg-gradient-to-r from-[#00d4ff] to-[#00ff9d] glow-blue"
                initial={{ width: 0 }}
                animate={{ width: `${progress}%` }}
              />
            </div>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-3 opacity-50">
                {phases.map((p, i) => (
                    <div key={i} className={`text-[9px] font-mono p-2 rounded-lg border ${i <= phase ? 'border-[#00ff9d] text-[#00ff9d]' : 'border-white/5'}`}>
                        {p.split(':')[0]}
                    </div>
                ))}
            </div>
          </div>
        )}

        {screen === "result" && result && (
          <div className="w-full grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
            
            {/* Left Col: Diagnostics */}
            <div className="lg:col-span-7 space-y-6">
              <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} className="glass rounded-[40px] p-8 overflow-hidden relative">
                <div className="absolute top-0 right-0 w-64 h-64 blur-[100px] opacity-20" style={{ background: result.meta.color }} />
                
                <div className="flex justify-between items-start mb-8">
                  <div>
                    <span className="text-xs font-mono text-slate-500 uppercase tracking-widest block mb-2">L7: Recommendation Engine</span>
                    <h2 className="text-4xl md:text-5xl font-black tracking-tighter leading-none mb-2">{result.disease}</h2>
                    <div className="flex gap-2">
                        <span className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest`} style={{ background: result.meta.bg, color: result.meta.color }}>
                            {result.severity} Severity
                        </span>
                        <span className="px-3 py-1 rounded-full text-[10px] font-bold bg-white/5 text-slate-400 uppercase tracking-widest">
                            L8: {((1-result.uncertainty)*100).toFixed(1)}% Reliable
                        </span>
                    </div>
                  </div>
                  <div className="text-5xl">{result.meta.emoji}</div>
                </div>

                <div className="bg-white/5 border border-white/10 rounded-3xl p-6 mb-8">
                  <h4 className="flex items-center gap-2 text-sm font-bold mb-3 text-[#00ff9d]">
                    <Shield size={16} /> ENTERPRISE TREATMENT PROTOCOL
                  </h4>
                  <p className="text-lg text-slate-200 leading-relaxed font-medium">{result.recommendation}</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="glass rounded-2xl p-5 border-white/5">
                    <h5 className="text-[10px] font-bold text-slate-500 uppercase mb-4 tracking-widest">L6: Symptom Analysis (Bottleneck)</h5>
                    <div className="space-y-3">
                        {Object.entries(result.l6_concepts).map(([key, val]) => (
                            <div key={key}>
                                <div className="flex justify-between text-[10px] mb-1">
                                    <span>{key}</span>
                                    <span>{(val * 100).toFixed(0)}%</span>
                                </div>
                                <div className="h-1 bg-white/5 rounded-full overflow-hidden">
                                    <div className="h-full bg-[#00d4ff]" style={{ width: `${val * 100}%` }} />
                                </div>
                            </div>
                        ))}
                    </div>
                  </div>
                  <div className="glass rounded-2xl p-5 border-white/5">
                    <h5 className="text-[10px] font-bold text-slate-500 uppercase mb-4 tracking-widest">L9: IoT Environmental Sync</h5>
                    <div className="grid grid-cols-2 gap-3">
                        {Object.entries(result.l9_iot_sync).map(([key, val]) => (
                            <div key={key} className="bg-white/5 p-3 rounded-xl">
                                <span className="text-[8px] text-slate-500 uppercase block">{key.replace('_', ' ')}</span>
                                <span className="text-sm font-bold text-gradient">{val}</span>
                            </div>
                        ))}
                    </div>
                  </div>
                </div>
              </motion.div>

              <div className="grid grid-cols-2 gap-4">
                 <LayerBadge label="L10: Edge Compute" status="Active" icon={Cpu} />
                 <LayerBadge label="L11: Federated Node" status="Synced" icon={Network} />
              </div>
            </div>

            {/* Right Col: Vision */}
            <div className="lg:col-span-5 space-y-6">
              <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="glass rounded-[40px] p-6">
                <h4 className="text-xs font-bold mb-4 uppercase tracking-widest flex items-center gap-2 text-[#00d4ff]">
                    <Search size={14} /> L5: Pathology Visualization
                </h4>
                <div className="grid gap-4">
                    <div className="relative rounded-3xl overflow-hidden group border border-white/10">
                        <img src={`data:image/jpeg;base64,${result.heatmap_b64}`} className="w-full" alt="Heatmap" />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent p-6 flex flex-col justify-end">
                            <span className="text-[10px] font-bold text-[#00ff9d] uppercase">Diagnostic Heatmap</span>
                            <p className="text-[10px] text-slate-400">Grad-CAM++ Pathogenic Localization active.</p>
                        </div>
                    </div>
                    <div className="relative rounded-3xl overflow-hidden border border-white/10 grayscale hover:grayscale-0 transition-all duration-500">
                        <img src={imgUrl} className="w-full h-40 object-cover" alt="Original" />
                        <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity">
                            <span className="text-xs font-bold uppercase tracking-widest">Raw Input View</span>
                        </div>
                    </div>
                </div>
              </motion.div>

              <button 
                onClick={reset}
                className="w-full py-6 rounded-[30px] bg-white/5 border border-white/10 hover:bg-white/10 transition-all font-black tracking-tighter uppercase text-lg italic"
              >
                Scan New Subject
              </button>
            </div>

          </div>
        )}

      </main>

      {/* Footer */}
      <footer className="relative z-50 px-6 py-4 flex justify-between items-center border-t border-white/5 bg-black/20 text-[10px] font-mono text-slate-600">
        <div className="flex gap-4">
            <span>© 2026 TEAM NEXUS</span>
            <span>RISING INDIA HACKATHON</span>
        </div>
        <div className="flex gap-4 items-center">
            <span className="text-[#00ff9d] flex items-center gap-1">
                <div className="w-1.5 h-1.5 bg-[#00ff9d] rounded-full animate-pulse" />
                SYSTEM OPERATIONAL
            </span>
            <span>MODEL: BENAM_V2.0_ULTRA_11L</span>
        </div>
      </footer>
    </div>
  );
}
