import React, { useState, useEffect, useRef } from "react";
import axios from "axios";

/* ───────── DISEASE DATA (Mapped to API CLASSES) ───────── */
const CLASSES_MAP = {
  "Bacterial Red disease": { emoji: "🔴", cure: "💊 Improve water quality + Medicated feed", color: "#ff8fa3", bg: "#fff0f3", severity: 3, tip: "Red spots or streaks on body/fins." },
  "Bacterial diseases - Aeromoniasis": { emoji: "🦠", cure: "🧪 Isolate fish + Increase aeration", color: "#ffb347", bg: "#fff3e0", severity: 4, tip: "Swollen belly or ulcers detected." },
  "Bacterial gill disease": { emoji: "🫁", cure: "🧼 Clean filters + Salt baths", color: "#a8d8ff", bg: "#e8f4ff", severity: 3, tip: "Fish gasping at surface or flared gills." },
  "Fungal diseases Saprolegniasis": { emoji: "🍄", cure: "🧂 Remove debris + Salt/Antifungal", color: "#c8a2ff", bg: "#f3eeff", severity: 2, tip: "Cotton-like white growth on body." },
  "Healthy Fish": { emoji: "🌟", cure: "🥰 Keep up the great care!", color: "#88e788", bg: "#efffef", severity: 0, tip: "No disease detected. Your fish is thriving!" },
  "Parasitic diseases": { emoji: "🔍", cure: "🩹 Identify parasite + Targeted meds", color: "#ffe599", bg: "#fffbeb", severity: 2, tip: "Fish rubbing against objects (flashing)." },
  "Viral diseases White tail disease": { emoji: "🧬", cure: "🚨 Strict quarantine + Biosecurity", color: "#ff5577", bg: "#fff0f3", severity: 4, tip: "Whitish tail/body with high mortality." }
};

/* ───────── CUTE FISH SVG ───────── */
const CuteFish = ({ color = "#6EC6FF", size = 80, wiggle = false, sad = false, style = {} }) => (
  <svg width={size} height={size * 0.65} viewBox="0 0 120 78" fill="none"
    style={{ ...style, animation: wiggle ? "fishWiggle 0.6s ease-in-out infinite alternate" : undefined }}>
    <path d="M95 39 L120 18 L120 60 Z" fill={color} opacity="0.8" />
    <ellipse cx="55" cy="39" rx="48" ry="28" fill={color} />
    <ellipse cx="50" cy="44" rx="32" ry="16" fill="white" opacity="0.25" />
    <circle cx="26" cy="32" r="10" fill="white" />
    <circle cx={sad ? "24" : "27"} cy={sad ? "34" : "31"} r="6" fill="#1a1a2e" />
    <circle cx={sad ? "26" : "29"} cy={sad ? "32" : "29"} r="2.5" fill="white" />
    {sad
      ? <path d="M18 46 Q22 44 26 46" stroke="#1a1a2e" strokeWidth="1.5" strokeLinecap="round" fill="none" />
      : <path d="M16 44 Q20 48 25 45" stroke="#1a1a2e" strokeWidth="1.5" strokeLinecap="round" fill="none" />}
    <path d="M45 11 Q55 2 70 11" stroke={color} strokeWidth="3" fill="none" opacity="0.7" />
    <circle cx="60" cy="35" r="4" fill="white" opacity="0.3" />
    <circle cx="72" cy="42" r="3" fill="white" opacity="0.2" />
    <circle cx="48" cy="28" r="2.5" fill="white" opacity="0.3" />
  </svg>
);

/* ───────── BUBBLE ───────── */
const Bubble = ({ size, left, duration, delay, color = "rgba(255,255,255,0.4)" }) => (
  <div style={{
    position: "fixed", bottom: -40, left: `${left}%`,
    width: size, height: size, borderRadius: "50%",
    background: `radial-gradient(circle at 30% 30%, ${color}, transparent)`,
    border: `1.5px solid ${color}`,
    animation: `bubbleRise ${duration}s ease-in infinite`,
    animationDelay: `${delay}s`,
    pointerEvents: "none", zIndex: 0,
  }} />
);

/* ───────── SEAWEED ───────── */
const Seaweed = ({ x, height, color, delay }) => (
  <div style={{
    position: "fixed", bottom: 0, left: `${x}%`,
    width: 18, height, transformOrigin: "bottom center",
    animation: `sway 3s ease-in-out infinite alternate`,
    animationDelay: `${delay}s`,
    pointerEvents: "none", zIndex: 1,
  }}>
    {Array.from({ length: Math.floor(height / 22) }, (_, i) => (
      <div key={i} style={{
        width: 16, height: 22,
        background: color,
        borderRadius: i % 2 === 0 ? "50% 50% 50% 0" : "50% 50% 0 50%",
        marginLeft: i % 2 === 0 ? 0 : 4,
        marginBottom: -4,
        opacity: 0.7 + i * 0.04,
      }} />
    ))}
  </div>
);

/* ───────── STAR PARTICLE ───────── */
const Sparkle = ({ x, y, delay, color }) => (
  <div style={{
    position: "fixed", left: `${x}%`, top: `${y}%`,
    fontSize: 14, animation: `twinkle 2s ease-in-out infinite`,
    animationDelay: `${delay}s`, pointerEvents: "none", zIndex: 0,
    color, userSelect: "none",
  }}>✦</div>
);

export default function App() {
  const [screen, setScreen] = useState("home");
  const [dragOver, setDragOver] = useState(false);
  const [imgUrl, setImgUrl] = useState(null);
  const [progress, setProgress] = useState(0);
  const [phase, setPhase] = useState(0);
  const [result, setResult] = useState(null);
  const [lang, setLang] = useState("en");
  const [fishMood, setFishMood] = useState("happy");
  const [scanDots, setScanDots] = useState(0);
  const [showConfetti, setShowConfetti] = useState(false);
  const fileRef = useRef();
  const timerRef = useRef();

  const phases = [
    "Saying hello to your fish 👋",
    "Checking fin health 🔍",
    "Counting scale patterns 🔢",
    "Inspecting those cute eyes 👁️",
    "Analyzing skin color 🎨",
    "Running 11-Layer AI magic ✨",
    "Consulting fish encyclopedia 📖",
    "Calculating reliability 📊",
    "Almost done! 🐟",
    "Writing your report 📋",
  ];

  const bubbles = Array.from({ length: 22 }, (_, i) => ({
    size: 6 + Math.random() * 18,
    left: Math.random() * 100,
    duration: 5 + Math.random() * 7,
    delay: Math.random() * 9,
    color: ["rgba(168,216,255,0.5)", "rgba(200,162,255,0.4)", "rgba(255,200,230,0.4)", "rgba(130,235,200,0.4)"][i % 4],
  }));
  const seaweeds = [
    { x: 2, height: 100, color: "#4ecb8d", delay: 0 },
    { x: 6, height: 70, color: "#35b87a", delay: 0.5 },
    { x: 92, height: 90, color: "#4ecb8d", delay: 0.8 },
    { x: 96, height: 60, color: "#35b87a", delay: 0.3 },
    { x: 15, height: 55, color: "#5dd4a0", delay: 1.1 },
    { x: 85, height: 75, color: "#3ec98a", delay: 0.7 },
  ];
  const sparkles = Array.from({ length: 16 }, (_, i) => ({
    x: Math.random() * 100, y: Math.random() * 80,
    delay: Math.random() * 3,
    color: ["#a8d8ff", "#ffb3c6", "#c8a2ff", "#88e7c8", "#ffe599"][i % 5],
  }));

  useEffect(() => {
    const id = setInterval(() => setScanDots(d => (d + 1) % 4), 400);
    return () => clearInterval(id);
  }, []);

  const startScan = async (file) => {
    if (!file || !file.type.startsWith("image/")) return;
    setImgUrl(URL.createObjectURL(file));
    setScreen("scan");
    setProgress(0);
    setPhase(0);
    setFishMood("nervous");

    // Start UI Progress Simulation
    let p = 0;
    const progressInterval = setInterval(() => {
      p += 0.5;
      if (p > 95) p = 95; // Wait for API at 95%
      setProgress(p);
      setPhase(Math.min(9, Math.floor((p / 100) * 10)));
    }, 50);

    // Call Real API
    const formData = new FormData();
    formData.append("file", file);
    try {
      const response = await axios.post(`http://localhost:8000/predict?lang=${lang}`, formData);
      const apiResult = response.data;
      const meta = CLASSES_MAP[apiResult.disease] || CLASSES_MAP["Healthy Fish"];
      
      clearInterval(progressInterval);
      setProgress(100);
      setPhase(9);

      setTimeout(() => {
        setResult({ 
            ...apiResult, 
            meta, 
            confidence: (apiResult.confidence * 100).toFixed(1),
            reliability: ((1 - apiResult.uncertainty) * 100).toFixed(1)
        });
        setFishMood(apiResult.disease === "Healthy Fish" ? "happy" : "sad");
        setScreen("result");
        if (apiResult.disease === "Healthy Fish") { 
            setShowConfetti(true); 
            setTimeout(() => setShowConfetti(false), 3000); 
        }
      }, 500);

    } catch (err) {
      clearInterval(progressInterval);
      alert("Connection Error: Is the Benam Engine running?");
      setScreen("home");
    }
  };

  const reset = () => { setScreen("home"); setImgUrl(null); setResult(null); setProgress(0); setFishMood("happy"); };

  return (
    <div style={{ minHeight: "100vh", fontFamily: "'Nunito', sans-serif", position: "relative", overflow: "hidden",
      background: "linear-gradient(180deg, #c8eeff 0%, #a8d8f8 25%, #b8eeff 55%, #d0f5e8 85%, #b8f0d8 100%)" }}>

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Nunito:wght@400;600;700;800;900&family=Fredoka+One&display=swap');
        * { box-sizing: border-box; margin: 0; padding: 0; }
        @keyframes bubbleRise { 0% { transform: translateY(0) scale(1); opacity: 0.8; } 100% { transform: translateY(-110vh) scale(0.5); opacity: 0; } }
        @keyframes sway { from { transform: rotate(-8deg); } to { transform: rotate(8deg); } }
        @keyframes twinkle { 0%,100% { opacity: 0.2; transform: scale(0.8); } 50% { opacity: 1; transform: scale(1.4); } }
        @keyframes fishWiggle { from { transform: rotate(-4deg) translateY(0px); } to { transform: rotate(4deg) translateY(-5px); } }
        @keyframes floatBob { 0%,100% { transform: translateY(0px); } 50% { transform: translateY(-12px); } }
        @keyframes popIn { 0% { opacity: 0; transform: scale(0.5); } 100% { opacity: 1; transform: scale(1); } }
        @keyframes slideUp { from { opacity: 0; transform: translateY(50px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes shimmerBar { 0% { background-position: -200px center; } 100% { background-position: 400px center; } }
        @keyframes waveMove { 0% { transform: translateX(0); } 100% { transform: translateX(-50%); } }
        .cute-btn { font-family: 'Fredoka One', cursive; border: none; border-radius: 50px; padding: 14px 34px; cursor: pointer; transition: all 0.2s; position: relative; overflow: hidden; }
        .cute-btn:hover { transform: translateY(-3px) scale(1.04); }
        .card { background: rgba(255,255,255,0.72); backdrop-filter: blur(12px); border-radius: 24px; border: 2.5px solid rgba(255,255,255,0.9); box-shadow: 0 8px 32px rgba(100,180,255,0.18); }
      `}</style>

      {bubbles.map((b, i) => <Bubble key={i} {...b} />)}
      {seaweeds.map((s, i) => <Seaweed key={i} {...s} />)}
      {sparkles.map((s, i) => <Sparkle key={i} {...s} />)}

      <header style={{ width: "100%", padding: "16px 32px", display: "flex", alignItems: "center", justifyContent: "space-between", background: "rgba(255,255,255,0.55)", backdropFilter: "blur(12px)", borderBottom: "2px solid rgba(255,255,255,0.8)", zIndex: 100 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{ animation: "floatBob 2.5s ease-in-out infinite" }}><CuteFish color="#6EC6FF" size={48} wiggle /></div>
          <div>
            <div style={{ fontFamily: "'Fredoka One', cursive", fontSize: 22, color: "#3a9fd6" }}>FishyDoc 🩺</div>
            <div style={{ fontSize: 11, color: "#7ec8f0", fontWeight: 700, letterSpacing: 1 }}>AI FISH DIAGNOSTICS</div>
          </div>
        </div>
        <select value={lang} onChange={(e) => setLang(e.target.value)} style={{ padding: "6px 12px", borderRadius: "12px", border: "1px solid #ddd", outline: "none" }}>
            <option value="en">English</option>
            <option value="hi">हिंदी</option>
            <option value="mr">मराठी</option>
        </select>
      </header>

      {screen === "home" && (
        <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 32, padding: "40px 20px", zIndex: 10, position: "relative" }}>
          <div style={{ textAlign: "center", animation: "popIn 0.7s forwards" }}>
            <div style={{ animation: "floatBob 3s ease-in-out infinite", marginBottom: 8, display: "inline-block" }}><CuteFish color="#6EC6FF" size={110} wiggle /></div>
            <h1 style={{ fontFamily: "'Fredoka One', cursive", fontSize: "clamp(28px,6vw,52px)", background: "linear-gradient(135deg, #3a9fd6, #7b5ea7, #e87d9b)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
              Hi! I'm FishyDoc 🐠💕<br />Your fish's best friend!
            </h1>
          </div>
          <div className="card" style={{ width: "100%", maxWidth: 560, padding: "44px 32px", textAlign: "center", border: "3px dashed #a8d8ff", cursor: "pointer" }} onClick={() => fileRef.current.click()}>
            <div style={{ fontSize: 64, marginBottom: 12 }}>📸</div>
            <div style={{ fontFamily: "'Fredoka One', cursive", fontSize: 22, color: "#3a9fd6" }}>Drop fish photo here!</div>
            <button className="cute-btn" style={{ background: "linear-gradient(135deg, #6EC6FF, #5aaae8)", color: "white", marginTop: 20 }}>📷 Choose Photo</button>
            <input ref={fileRef} type="file" onChange={e => startScan(e.target.files[0])} style={{ display: "none" }} />
          </div>
        </div>
      )}

      {screen === "scan" && (
        <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", padding: "32px 20px", zIndex: 10 }}>
          <div className="card" style={{ maxWidth: 500, width: "100%", padding: "36px 32px", textAlign: "center" }}>
            <div style={{ animation: "floatBob 1.2s infinite", display: "inline-block" }}><CuteFish color="#6EC6FF" size={90} wiggle /></div>
            <div style={{ fontFamily: "'Fredoka One', cursive", fontSize: 24, color: "#3a9fd6" }}>Examining fish{".".repeat(scanDots)}</div>
            <div style={{ height: 14, borderRadius: 50, background: "#eee", overflow: "hidden", margin: "20px 0" }}>
              <div style={{ height: "100%", width: `${progress}%`, background: "linear-gradient(90deg, #6EC6FF, #c8a2ff)", transition: "width 0.1s" }} />
            </div>
            <div style={{ fontFamily: "'Fredoka One', cursive", fontSize: 15, color: "#3a9fd6" }}>{phases[phase]}</div>
          </div>
        </div>
      )}

      {screen === "result" && result && (
        <div style={{ flex: 1, width: "100%", maxWidth: 900, padding: "40px 20px", display: "flex", flexDirection: "column", gap: 20, alignItems: "center", zIndex: 10, position: "relative" }}>
          <div className="card" style={{ width: "100%", padding: "30px", background: result.meta.bg, border: `3px solid ${result.meta.color}`, textAlign: "center" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 20, flexWrap: "wrap" }}>
              <CuteFish color={result.meta.color} size={90} sad={result.disease !== "Healthy Fish"} wiggle />
              <div style={{ textAlign: "left" }}>
                <div style={{ fontFamily: "'Fredoka One', cursive", fontSize: 28, color: "#2c5f8a" }}>{result.disease} {result.meta.emoji}</div>
                <div style={{ fontSize: 14, color: "#5a8aaa", fontWeight: 700 }}>{result.meta.tip}</div>
                <div style={{ marginTop: 10, display: "flex", gap: 10 }}>
                    <div style={{ background: "white", padding: "5px 15px", borderRadius: "20px", fontSize: "12px", fontWeight: "bold" }}>🎯 {result.confidence}% Conf.</div>
                    <div style={{ background: "white", padding: "5px 15px", borderRadius: "20px", fontSize: "12px", fontWeight: "bold" }}>📊 {result.reliability}% Rel.</div>
                </div>
              </div>
            </div>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20, width: "100%" }}>
            <div className="card" style={{ padding: 16 }}>
              <div style={{ fontFamily: "'Fredoka One', cursive", fontSize: 14, color: "#3a9fd6", marginBottom: 10 }}>📸 Diagnostic View</div>
              <img src={imgUrl} style={{ width: "100%", borderRadius: 12 }} />
            </div>
            <div className="card" style={{ padding: 16 }}>
               <div style={{ fontFamily: "'Fredoka One', cursive", fontSize: 14, color: "#3a9fd6", marginBottom: 10 }}>🗺️ Pathology Heatmap</div>
               <img src={`data:image/jpeg;base64,${result.heatmap_b64}`} style={{ width: "100%", borderRadius: 12 }} />
            </div>
          </div>
          <div className="card" style={{ width: "100%", padding: 24, background: "#f0fff4", border: "2px solid #88e7c8" }}>
              <div style={{ fontFamily: "'Fredoka One', cursive", color: "#2c8a5a", marginBottom: 10 }}>📋 Care Protocol</div>
              <div style={{ fontSize: 16, fontWeight: "bold", color: "#3aaa6a" }}>{result.recommendation}</div>
          </div>
          <button className="cute-btn" onClick={reset} style={{ background: "linear-gradient(135deg, #6EC6FF, #5aaae8)", color: "white" }}>🐠 Check Another Fish</button>
        </div>
      )}

      <footer style={{ width: "100%", padding: "20px", textAlign: "center", background: "rgba(255,255,255,0.5)", zIndex: 10 }}>
        <span style={{ fontFamily: "'Fredoka One', cursive", fontSize: 13, color: "#5aabcc" }}>FishyDoc AI • 11-Layer Enterprise Architecture v2.0</span>
      </footer>
    </div>
  );
}
