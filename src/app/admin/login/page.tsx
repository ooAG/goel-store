"use client";
import { useState, useEffect } from "react";
import { Lock, Store } from "lucide-react";
import toast, { Toaster } from "react-hot-toast";

export default function AdminLogin() {
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    document.title = "Goel Store Portal Auth";
  }, []);

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!password.trim()) return toast.error("Password dena zaroori hai.");
    
    setLoading(true);
    const tId = toast.loading("Checking password...");
    try {
      const res = await fetch("/api/admin/auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password: password.trim() })
      });
      
      if (res.ok) {
        toast.success("Login successful!", { id: tId });
        window.location.href = "/admin";
      } else {
        toast.error("Galat password. Phir se try karein.", { id: tId });
      }
    } catch (err) {
      toast.error("Network issue, connect nahi ho paaya.", { id: tId });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-6 text-slate-100">
      <Toaster position="bottom-center" />
      <div className="w-full max-w-sm bg-slate-900 border border-slate-800 rounded-[2.5rem] p-8 text-center shadow-2xl relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-emerald-500/10 to-transparent pointer-events-none" />
        
        <div className="w-16 h-16 bg-slate-800 border border-slate-700 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-inner text-emerald-500">
           <Store size={28} />
        </div>
        
        <h2 className="text-2xl font-black tracking-tight mb-1">Engine Control</h2>
        <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-8">Goel Store Dashboard Management</p>
        
        <form onSubmit={handleLoginSubmit} className="space-y-4 relative z-10 text-left">
          <div className="space-y-2">
            <label className="text-[10px] font-black uppercase text-slate-500 tracking-wider ml-1">Secure Passkey</label>
            <div className="flex items-center bg-slate-950 border border-slate-800 rounded-xl overflow-hidden focus-within:border-emerald-500/50 transition-colors">
               <div className="p-4 text-slate-600"><Lock size={16}/></div>
               <input 
                 type="password" 
                 placeholder="••••••••••••" 
                 value={password}
                 onChange={e => setPassword(e.target.value)}
                 className="w-full bg-transparent p-4 text-sm font-bold outline-none border-none text-white placeholder-slate-700"
               />
            </div>
          </div>
          
          <button 
            type="submit" 
            disabled={loading}
            className="w-full bg-emerald-500 hover:bg-emerald-600 disabled:opacity-50 text-white p-4 rounded-xl font-black text-xs uppercase tracking-widest shadow-lg shadow-emerald-500/20 transition-all active:scale-98 mt-4"
          >
            {loading ? "Decrypting..." : "Access Dashboard"}
          </button>
        </form>
      </div>
    </div>
  );
}
