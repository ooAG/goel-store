"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { Users, Phone, MapPin, ChevronDown, Activity, FileText, Plus, X, Search, Hash, ChevronLeft } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import toast, { Toaster } from "react-hot-toast";

export default function AdminCustomers() {
  const [customers, setCustomers] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [paymentConfig, setPaymentConfig] = useState<any>(null);
  
  const [entryModal, setEntryModal] = useState<any>(null);
  const [entryForm, setEntryForm] = useState({ amount: "", type: "CREDIT", reason: "" });

  const fetchCustomers = () => {
    fetch(`/api/customers?t=${Date.now()}`).then(r => r.json()).then(data => { setCustomers(data); setLoading(false); });
  };

  useEffect(() => {
    document.title = "Khata & Ledger";
    fetch(`/api/config?t=${Date.now()}`).then(res => res.json()).then(data => setPaymentConfig(data));
    fetchCustomers();
  }, []);

  const handleDownloadPDF = async (c: any) => {
      const tId = toast.loading("Generating Server PDF...");
      try {
          const res = await fetch(`/api/customers/pdf?id=${c.id}`);
          if (!res.ok) throw new Error();
          const blob = await res.blob();
          const url = window.URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = `Khata_Ledger_${c.name}.pdf`;
          document.body.appendChild(a);
          a.click();
          a.remove();
          toast.success("Downloaded Successfully!", { id: tId });
      } catch(e) {
          toast.error("Download failed", { id: tId });
      }
  };

  const submitManualEntry = async () => {
      if(!entryForm.amount || !entryForm.reason) return toast.error("Fill all fields");
      const tId = toast.loading("Saving entry...");
      try {
         await fetch("/api/customers", { method: "POST", body: JSON.stringify({ customerId: entryModal.id, ...entryForm }) });
         toast.success("Khata Updated!", {id: tId});
         setEntryModal(null); setEntryForm({ amount: "", type: "CREDIT", reason: "" });
         fetchCustomers();
      } catch(e) { toast.error("Failed to update", {id: tId}); }
  };

  const filteredCustomers = customers.filter(c => {
      const q = searchTerm.toLowerCase();
      return c.name.toLowerCase().includes(q) || c.phone.includes(q) || c.customId.toLowerCase().includes(q);
  });

  if (loading) return <div className="p-10 text-center text-slate-400 font-bold">Loading Khata...</div>;

  return (
    <div className="p-4 sm:p-10 max-w-5xl mx-auto">
       <Toaster />
       <div className="mb-6 md:hidden">
          <Link href="/admin" className="flex items-center gap-1.5 text-xs font-black uppercase tracking-widest text-slate-400 hover:text-emerald-500 transition-colors"><ChevronLeft size={16}/> Dashboard</Link>
       </div>
       <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4 mb-8">
           <div className="flex items-center gap-3">
               <Users size={32} className="text-amber-500" />
               <h2 className="text-2xl sm:text-3xl font-black text-slate-800 tracking-tight">Khata / Ledger</h2>
           </div>
           
           <div className="relative w-full sm:w-72">
               <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
               <input type="text" placeholder="Search Name, Phone or ID" value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="w-full bg-white border border-slate-200 text-sm font-bold text-slate-800 p-3 pl-11 rounded-xl outline-none focus:border-amber-400 transition-colors shadow-sm" />
           </div>
       </div>

       <div className="space-y-4">
          {filteredCustomers.length === 0 && (<div className="p-10 text-center text-slate-400 bg-white rounded-[2rem] border border-slate-100 border-dashed">No customers found.</div>)}
          {filteredCustomers.map(c => (
             <div key={c.id} className="bg-white p-5 sm:p-8 rounded-[2rem] border border-slate-100 shadow-sm hover:border-amber-200 transition-colors">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 cursor-pointer" onClick={() => setExpandedId(expandedId === c.id ? null : c.id)}>
                   <div>
                       <div className="flex items-center gap-3">
                           <h3 className="text-xl font-black text-slate-800">{c.name}</h3>
                           <span className="flex items-center gap-0.5 text-[10px] font-black uppercase text-amber-600 bg-amber-100 px-2 py-1 rounded-md tracking-widest"><Hash size={10}/> {c.customId}</span>
                       </div>
                       <div className="flex items-center gap-4 mt-2 text-xs font-bold text-slate-500">
                           <span className="flex items-center gap-1"><Phone size={14}/> {c.phone}</span>
                           <span className="flex items-center gap-1"><MapPin size={14}/> {c.address || 'No Address'}</span>
                       </div>
                   </div>
                   
                   <div className="flex items-center gap-6 justify-between sm:justify-end">
                       <div className="text-right">
                           <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">{c.dues < 0 ? 'Customer Owes (Udhaar)' : c.dues > 0 ? 'Store Credit (Advance)' : 'Clear'}</p>
                           <p className={`text-2xl font-black ${c.dues < 0 ? 'text-rose-500' : c.dues > 0 ? 'text-emerald-500' : 'text-slate-300'}`}>₹{Math.abs(c.dues)}</p>
                       </div>
                       <div className={`p-2 bg-slate-50 rounded-full text-slate-400 transition-transform ${expandedId === c.id ? 'rotate-180 bg-amber-50 text-amber-500' : ''}`}><ChevronDown size={20} /></div>
                   </div>
                </div>

                <AnimatePresence>
                   {expandedId === c.id && (
                       <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} className="mt-6 pt-6 border-t border-dashed border-slate-200 overflow-hidden">
                           
                           {/* UDHAAR SETTINGS TOGGLE */}
                           <div className="flex flex-col sm:flex-row sm:items-center gap-4 mb-6 bg-slate-50 p-4 rounded-2xl border border-slate-100">
                               <label className="flex items-center gap-2 text-xs font-black uppercase tracking-widest text-slate-700 cursor-pointer">
                                   <input type="checkbox" checked={c.creditEnabled} onChange={async (e) => {
                                       await fetch("/api/customers", { method: "PATCH", body: JSON.stringify({ customerId: c.id, creditEnabled: e.target.checked, creditLimit: c.creditLimit }) });
                                       fetchCustomers();
                                   }} className="w-4 h-4 text-emerald-500 rounded focus:ring-emerald-500 cursor-pointer" />
                                   Enable Udhaar
                               </label>
                               <div className="flex items-center gap-2">
                                   <span className="text-xs font-bold text-slate-500">Max Limit (₹):</span>
                                   <input type="number" value={c.creditLimit} onBlur={async (e) => {
                                       await fetch("/api/customers", { method: "PATCH", body: JSON.stringify({ customerId: c.id, creditEnabled: c.creditEnabled, creditLimit: e.target.value }) });
                                       fetchCustomers();
                                   }} onChange={(e) => {
                                       const newCustomers = [...customers];
                                       const idx = newCustomers.findIndex(cust => cust.id === c.id);
                                       newCustomers[idx].creditLimit = e.target.value;
                                       setCustomers(newCustomers);
                                   }} className="w-24 bg-white border border-slate-200 text-xs font-bold text-slate-800 p-2 rounded-lg outline-none focus:border-amber-400" />
                                   <span className="text-[10px] text-slate-400 font-bold italic">(0 = Unlimited)</span>
                               </div>
                           </div>

                           <div className="flex flex-wrap gap-3 mb-6">
                              <button onClick={() => setEntryModal(c)} className="bg-amber-100 hover:bg-amber-200 text-amber-700 px-4 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest flex items-center gap-2 transition-colors"><Plus size={14}/> Add Manual Entry</button>
                              <button onClick={() => handleDownloadPDF(c)} className="bg-blue-100 hover:bg-blue-200 text-blue-700 px-4 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest flex items-center gap-2 transition-colors"><FileText size={14}/> Download PDF Server</button>
                           </div>
                           <h4 className="text-xs font-black uppercase tracking-widest text-slate-400 mb-4 flex items-center gap-2"><Activity size={14}/> Ledger History</h4>
                           {c.ledgers && c.ledgers.length > 0 ? (
                               <div className="space-y-3 max-h-80 overflow-y-auto pr-2">
                                   {c.ledgers.map((l: any) => (
                                       <div key={l.id} className="flex justify-between items-center p-4 bg-slate-50 rounded-2xl border border-slate-100">
                                           <div><p className="text-xs font-bold text-slate-700">{l.reason}</p><p className="text-[10px] text-slate-400 uppercase mt-1">{new Date(l.createdAt).toLocaleString()}</p></div>
                                           <span className={`font-black text-sm ${l.amount < 0 ? 'text-rose-500' : 'text-emerald-500'}`}>{l.amount < 0 ? '' : '+'}₹{Math.abs(l.amount)}</span>
                                       </div>
                                   ))}
                               </div>
                           ) : (<div className="p-4 text-center text-xs font-bold text-slate-400 bg-slate-50 rounded-2xl">No transactions yet.</div>)}
                       </motion.div>
                   )}
                </AnimatePresence>
             </div>
          ))}
       </div>

       {entryModal && (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-50 flex items-center justify-center p-4">
             <div className="w-full max-w-md bg-white rounded-[2.5rem] p-8 shadow-2xl relative border border-slate-100">
                <button onClick={() => setEntryModal(null)} className="absolute top-6 right-6 p-2 bg-slate-100 rounded-full text-slate-400 hover:text-rose-500 transition-colors"><X size={20}/></button>
                <h3 className="text-2xl font-black text-slate-800 mb-6">Add Khata Entry</h3>
                <p className="text-xs font-bold text-slate-500 mb-4 flex items-center gap-2">Customer: {entryModal.name} <span className="bg-slate-100 text-[10px] uppercase px-2 py-1 rounded-md text-slate-400">{entryModal.customId}</span></p>

                <div className="flex gap-2 mb-6">
                    <button onClick={() => setEntryForm({...entryForm, type: 'DEBT'})} className={`flex-1 p-3 rounded-xl font-black text-xs uppercase tracking-widest transition-colors ${entryForm.type === 'DEBT' ? 'bg-rose-500 text-white' : 'bg-slate-100 text-slate-400 hover:bg-slate-200'}`}>Give Udhaar</button>
                    <button onClick={() => setEntryForm({...entryForm, type: 'CREDIT'})} className={`flex-1 p-3 rounded-xl font-black text-xs uppercase tracking-widest transition-colors ${entryForm.type === 'CREDIT' ? 'bg-emerald-500 text-white' : 'bg-slate-100 text-slate-400 hover:bg-slate-200'}`}>Receive Cash/Credit</button>
                </div>

                <div className="space-y-4 mb-6">
                    <div className="flex items-center bg-slate-50 border-2 border-slate-200 rounded-2xl overflow-hidden focus-within:border-amber-400 transition-colors">
                        <div className="px-5 py-3 text-lg font-black text-slate-400 border-r border-slate-200">₹</div>
                        <input type="number" placeholder="Amount" value={entryForm.amount} onChange={e => setEntryForm({...entryForm, amount: e.target.value})} className="w-full p-4 text-lg font-black text-slate-800 bg-transparent outline-none" />
                    </div>
                    <input type="text" placeholder="Description / Reason" value={entryForm.reason} onChange={e => setEntryForm({...entryForm, reason: e.target.value})} className="w-full p-4 text-sm font-bold text-slate-800 bg-slate-50 border-2 border-slate-200 rounded-2xl outline-none focus:border-amber-400 transition-colors" />
                </div>
                <button onClick={submitManualEntry} className="w-full bg-amber-500 hover:bg-amber-600 text-white p-5 rounded-2xl font-black text-sm uppercase tracking-widest shadow-lg shadow-amber-500/30 transition-all active:scale-95">Save Entry</button>
             </div>
          </div>
       )}
    </div>
  );
}
