"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { Plus, Trash2, Save, ChevronLeft } from "lucide-react";

export default function SettingsPanel() {
  const [upiAccounts, setUpiAccounts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/config").then(res => res.json()).then(data => {
      setUpiAccounts(data.upiAccounts || []);
      setLoading(false);
    });
  }, []);

  const saveConfig = async () => {
    const res = await fetch("/api/config", {
      method: "POST",
      body: JSON.stringify({ upiAccounts }),
    });
    if (res.ok) alert("Settings Saved Successfully!");
  };

  const addAccount = () => setUpiAccounts([...upiAccounts, { name: "", vpa: "" }]);
  const removeAccount = (index: number) => setUpiAccounts(upiAccounts.filter((_, i) => i !== index));
  const updateAccount = (index: number, field: string, value: string) => {
    const newAcc = [...upiAccounts];
    newAcc[index][field] = value;
    setUpiAccounts(newAcc);
  };

  if (loading) return <div className="p-6">Loading settings...</div>;

  return (
    <div className="p-4 sm:p-6 max-w-2xl mx-auto font-sans text-gray-900">
      <div className="mb-6 md:hidden"><Link href="/admin" className="flex items-center gap-1.5 text-xs font-black uppercase tracking-widest text-slate-400 hover:text-emerald-500 transition-colors"><ChevronLeft size={16}/> Dashboard</Link></div>
      <h1 className="text-2xl sm:text-3xl font-black mb-8 tracking-tighter text-emerald-900">Payment Settings</h1>
      
      <div className="bg-white p-6 sm:p-8 rounded-[2.5rem] shadow-xl border-2">
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4 mb-6">
           <h2 className="text-lg sm:text-xl font-black">Dynamic UPI Routing (Randomized)</h2>
           <button onClick={addAccount} className="bg-emerald-100 text-emerald-700 px-4 py-2 sm:px-3 sm:py-1.5 rounded-lg text-xs font-black flex items-center justify-center gap-1 uppercase tracking-widest w-full sm:w-auto"><Plus size={14}/> Add QR</button>
        </div>

        <div className="space-y-4 mb-6">
          {upiAccounts.map((acc, index) => (
            <div key={index} className="flex flex-col sm:flex-row gap-3 items-center bg-gray-50 p-4 rounded-2xl border">
               <div className="flex-1 space-y-2 w-full">
                 <input type="text" placeholder="Display Name (e.g., Goel Store HDFC)" value={acc.name} onChange={e => updateAccount(index, "name", e.target.value)} className="w-full border p-2 rounded-lg text-sm font-bold outline-none" />
                 <input type="text" placeholder="UPI ID / VPA (e.g., 99999@paytm)" value={acc.vpa} onChange={e => updateAccount(index, "vpa", e.target.value)} className="w-full border p-2 rounded-lg text-sm font-bold text-emerald-700 outline-none" />
               </div>
               <button onClick={() => removeAccount(index)} className="w-full sm:w-auto p-3 bg-red-100 text-red-600 rounded-xl flex items-center justify-center"><Trash2 size={20}/></button>
            </div>
          ))}
          {upiAccounts.length === 0 && <p className="text-sm text-gray-400 font-bold text-center py-4">No UPI accounts added yet.</p>}
        </div>

        <button onClick={saveConfig} className="w-full bg-emerald-600 text-white p-4 rounded-2xl font-black uppercase tracking-widest flex items-center justify-center gap-2 shadow-lg hover:bg-emerald-700"><Save size={18}/> Save Settings</button>
      </div>
    </div>
  );
}
