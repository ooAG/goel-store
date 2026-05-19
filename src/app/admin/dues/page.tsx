"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { MessageSquare, IndianRupee, Search, ChevronLeft } from "lucide-react";

export default function DuesManagement() {
  const [customers, setCustomers] = useState<any[]>([]);
  const [search, setSearch] = useState("");

  const fetchDues = () => fetch("/api/customers").then(res => res.json()).then(data => {
    setCustomers(data.filter((c: any) => c.dues < 0));
  });

  useEffect(() => { fetchDues(); }, []);

  const sendReminder = (c: any) => {
    const amount = Math.abs(c.dues);
    const msg = `Hello ${c.name}, this is a friendly reminder from Goel Store. You have a pending balance of ₹${amount}. Please transfer it at your earliest convenience. Thank you!`;
    window.open(`https://wa.me/91${c.phone}?text=${encodeURIComponent(msg)}`, "_blank");
  };

  const filtered = customers.filter(c => c.name.toLowerCase().includes(search.toLowerCase()) || c.phone.includes(search));

  return (
    <div className="p-4 sm:p-6 max-w-4xl mx-auto font-sans bg-gray-50 min-h-screen">
      <div className="mb-6 md:hidden"><Link href="/admin" className="flex items-center gap-1.5 text-xs font-black uppercase tracking-widest text-slate-400 hover:text-emerald-500 transition-colors"><ChevronLeft size={16}/> Dashboard</Link></div>
      <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4 mb-6">
        <h1 className="text-2xl sm:text-3xl font-black text-red-800">Pending Dues</h1>
        <div className="bg-red-100 text-red-700 px-4 py-2 rounded-2xl font-black text-center sm:text-left">
          Total Collection: ₹{Math.abs(customers.reduce((sum, c) => sum + c.dues, 0))}
        </div>
      </div>

      <div className="relative mb-6">
        <Search className="absolute left-4 top-3.5 text-gray-400" size={20} />
        <input 
          type="text" 
          placeholder="Search debtor name..." 
          className="w-full p-3.5 pl-12 rounded-2xl border border-gray-200 outline-none focus:ring-2 focus:ring-red-500 bg-white shadow-sm"
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      <div className="space-y-3">
        {filtered.length === 0 ? (
          <div className="text-center py-20 text-gray-400 font-bold bg-white rounded-3xl border-2 border-dashed">No pending dues found!</div>
        ) : (
          filtered.map(c => (
            <div key={c.id} className="bg-white p-5 rounded-3xl shadow-sm border border-gray-100 flex flex-col sm:flex-row justify-between sm:items-center gap-4">
              <div>
                <p className="font-black text-lg">{c.name}</p>
                <p className="text-sm text-gray-500 font-medium">{c.phone}</p>
              </div>
              <div className="flex items-center justify-between sm:justify-end gap-6 w-full sm:w-auto">
                <div className="text-left sm:text-right">
                  <p className="text-[10px] font-black text-gray-400 uppercase">Amount Due</p>
                  <p className="text-2xl font-black text-red-600">₹{Math.abs(c.dues)}</p>
                </div>
                <button 
                  onClick={() => sendReminder(c)}
                  className="bg-emerald-600 text-white p-4 rounded-2xl hover:bg-emerald-700 active:scale-95 transition-all shadow-lg shadow-emerald-100"
                >
                  <MessageSquare size={20} />
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
