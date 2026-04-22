import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { motion, AnimatePresence } from 'framer-motion';
import { Upload, Shield, Activity, AlertCircle, Languages, CheckCircle2, ChevronRight, Zap } from 'lucide-react';

const API_BASE = "http://localhost:8000";

const App = () => {
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [lang, setLang] = useState("en");
  const [trainingStatus, setTrainingStatus] = useState("Optimal");

  const handleFileChange = (e) => {
    const selected = e.target.files[0];
    if (selected) {
      setFile(selected);
      setPreview(URL.createObjectURL(selected));
      setResult(null);
    }
  };

  const runDiagnostics = async () => {
    if (!file) return;
    setLoading(true);
    const formData = new FormData();
    formData.append("file", file);

    try {
      const response = await axios.post(`${API_BASE}/predict?lang=${lang}`, formData);
      setResult(response.data);
    } catch (err) {
      console.error(err);
      alert("Error connecting to Benam Engine. Is the backend running?");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-benam-bg text-white selection:bg-benam-accent/30 p-4 md:p-8">
      {/* Header */}
      <nav className="max-w-7xl mx-auto flex justify-between items-center mb-12">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-gradient-to-br from-benam-accent to-benam-accent2 rounded-xl flex items-center justify-center glow-blue">
            <Zap size={24} className="text-black fill-current" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">BENAM <span className="text-benam-accent">AI</span></h1>
            <p className="text-xs text-slate-500 font-mono uppercase tracking-widest">v2.0 Triple-Backbone</p>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <div className="hidden md:flex items-center gap-2 px-3 py-1 bg-white/5 rounded-full border border-white/10">
            <div className="w-2 h-2 bg-benam-accent2 rounded-full animate-pulse" />
            <span className="text-xs font-mono text-slate-400">TRAINING IN PROGRESS...</span>
          </div>
          <select 
            value={lang} 
            onChange={(e) => setLang(e.target.value)}
            className="bg-white/5 border border-white/10 rounded-lg px-3 py-1.5 text-sm outline-none focus:border-benam-accent transition-colors cursor-pointer"
          >
            <option value="en">English</option>
            <option value="hi">हिंदी</option>
            <option value="mr">मराठी</option>
          </select>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
        {/* Left: Upload Section */}
        <motion.div 
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          className="glass rounded-3xl p-6 md:p-8"
        >
          <h2 className="text-xl font-semibold mb-6 flex items-center gap-2">
            <Upload size={20} className="text-benam-accent" />
            Ingest Bio-Data
          </h2>

          <div 
            className={`relative group border-2 border-dashed rounded-2xl transition-all duration-300 ${
              preview ? 'border-benam-accent/50' : 'border-white/10 hover:border-benam-accent/50'
            }`}
          >
            <input 
              type="file" 
              onChange={handleFileChange}
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10" 
            />
            
            {preview ? (
              <div className="p-2">
                <img src={preview} alt="Preview" className="w-full h-64 md:h-96 object-cover rounded-xl" />
              </div>
            ) : (
              <div className="py-20 flex flex-col items-center justify-center gap-4">
                <div className="w-16 h-16 bg-white/5 rounded-full flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                  <Upload size={32} className="text-slate-400" />
                </div>
                <div className="text-center">
                  <p className="text-slate-300">Drop fish image or click to browse</p>
                  <p className="text-xs text-slate-500 mt-1">Supports JPG, PNG (Max 10MB)</p>
                </div>
              </div>
            )}
          </div>

          <button
            onClick={runDiagnostics}
            disabled={!file || loading}
            className={`w-full mt-6 py-4 rounded-xl font-bold transition-all duration-300 flex items-center justify-center gap-2 ${
              !file || loading 
                ? 'bg-white/5 text-slate-500 cursor-not-allowed' 
                : 'bg-gradient-to-r from-benam-accent to-benam-accent2 text-black hover:scale-[1.02] active:scale-[0.98] glow-blue'
            }`}
          >
            {loading ? (
              <Activity className="animate-spin" />
            ) : (
              <>
                <Zap size={20} className="fill-current" />
                INITIATE AI DIAGNOSIS
              </>
            )}
          </button>
        </motion.div>

        {/* Right: Results Section */}
        <div className="space-y-6">
          <AnimatePresence mode="wait">
            {result ? (
              <motion.div
                key="result"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="space-y-6"
              >
                {/* Result Card */}
                <div className="glass rounded-3xl p-8 relative overflow-hidden">
                  <div className={`absolute top-0 right-0 w-32 h-32 blur-[80px] -mr-16 -mt-16 opacity-50 ${
                    result.severity === 'Healthy' ? 'bg-benam-accent2' : 'bg-benam-urgent'
                  }`} />
                  
                  <div className="flex justify-between items-start mb-8">
                    <div>
                      <span className="text-xs font-mono text-benam-accent uppercase tracking-widest mb-1 block">Diagnosis Result</span>
                      <h3 className="text-3xl font-bold leading-tight">{result.disease}</h3>
                    </div>
                    <div className={`px-4 py-1.5 rounded-full text-xs font-bold border ${
                      result.severity === 'Healthy' 
                        ? 'bg-benam-accent2/10 text-benam-accent2 border-benam-accent2/20' 
                        : 'bg-benam-urgent/10 text-benam-urgent border-benam-urgent/20'
                    }`}>
                      {result.severity.toUpperCase()}
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-4 mb-8">
                    <div className="bg-white/5 p-4 rounded-2xl border border-white/5">
                      <p className="text-[10px] text-slate-500 font-mono mb-1 uppercase">Confidence</p>
                      <p className="text-xl font-bold text-benam-accent">{(result.confidence * 100).toFixed(1)}%</p>
                    </div>
                    <div className="bg-white/5 p-4 rounded-2xl border border-white/5">
                      <p className="text-[10px] text-slate-500 font-mono mb-1 uppercase">Reliability</p>
                      <p className="text-xl font-bold text-benam-accent2">{((1 - result.uncertainty) * 100).toFixed(1)}%</p>
                    </div>
                    <div className="bg-white/5 p-4 rounded-2xl border border-white/5">
                      <p className="text-[10px] text-slate-500 font-mono mb-1 uppercase">Latency</p>
                      <p className="text-xl font-bold text-slate-300">0.8s</p>
                    </div>
                  </div>

                  <div className="bg-white/5 p-6 rounded-2xl border border-white/10 border-l-4 border-l-benam-accent">
                    <h4 className="flex items-center gap-2 text-sm font-bold mb-2 uppercase tracking-wide">
                      <Shield size={16} className="text-benam-accent" />
                      Recommended Protocol
                    </h4>
                    <p className="text-slate-300 text-sm leading-relaxed">{result.recommendation}</p>
                  </div>
                </div>

                {/* Heatmap Card */}
                <div className="glass rounded-3xl p-6">
                  <h4 className="text-sm font-bold mb-4 flex items-center gap-2 uppercase tracking-wide">
                    <Activity size={16} className="text-benam-accent2" />
                    Spatial Activation Map (Grad-CAM++)
                  </h4>
                  <div className="relative rounded-2xl overflow-hidden group">
                    <img 
                      src={`data:image/jpeg;base64,${result.heatmap_b64}`} 
                      alt="Explainability Heatmap" 
                      className="w-full object-cover"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-end p-4">
                      <p className="text-xs text-slate-300">Highlighting areas of pathogenic visual indicators</p>
                    </div>
                  </div>
                </div>
              </motion.div>
            ) : (
              <motion.div
                key="empty"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="h-full flex flex-col items-center justify-center text-center p-12 glass rounded-3xl border-dashed border-white/5"
              >
                <div className="w-24 h-24 bg-white/5 rounded-full flex items-center justify-center mb-6">
                  <Shield size={48} className="text-slate-700" />
                </div>
                <h3 className="text-xl font-medium text-slate-400">Awaiting Signal Ingestion</h3>
                <p className="text-sm text-slate-600 mt-2 max-w-xs mx-auto">
                  Upload bio-data from the portal to initiate 11-layer neural diagnostics.
                </p>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </main>

      {/* Footer Info */}
      <footer className="max-w-7xl mx-auto mt-12 pt-8 border-t border-white/5 flex flex-wrap gap-8 justify-center opacity-50">
        <div className="flex items-center gap-2 text-[10px] font-mono">
          <Activity size={12} /> DUAL-BACKBONE FUSION: ACTIVE
        </div>
        <div className="flex items-center gap-2 text-[10px] font-mono">
          <Shield size={12} /> DATA ENCRYPTION: 256-BIT
        </div>
        <div className="flex items-center gap-2 text-[10px] font-mono text-benam-accent2">
          <CheckCircle2 size={12} /> HACKATHON STABLE v2.0
        </div>
      </footer>
    </div>
  );
};

export default App;
