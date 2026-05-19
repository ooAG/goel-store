"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { ClipboardList, Package, Users, Settings, ArrowRight } from "lucide-react";

export default function AdminDashboard() {
  const [stats, setStats] = useState({
    unattended: 0,
    pendingPayment: 0,
    delivered: 0,
    totalCustomers: 0
  });

  useEffect(() => {
    fetch(`/api/orders?t=${Date.now()}`)
      .then(res => res.json())
      .then(orders => {
        const unattended = orders.filter((o: any) => o.orderStatus === "NEW").length;
        const pendingPayment = orders.filter((o: any) => o.orderStatus === "FULFILLED" && o.paymentStatus === "PENDING").length;
        const delivered = orders.filter((o: any) => o.orderStatus === "FULFILLED" && (o.paymentStatus === "PAID" || o.paymentStatus === "DUES_ADDED")).length;
        
        fetch(`/api/customers?t=${Date.now()}`)
          .then(res => res.json())
          .then(custs => {
             setStats({
                unattended,
                pendingPayment,
                delivered,
                totalCustomers: Array.isArray(custs) ? custs.length : 0
             });
          }).catch(() => {});
      }).catch(() => {});
  }, []);

  const modules = [
    {
      title: "Live Orders",
      desc: "Manage fulfilling & payments",
      icon: <ClipboardList size={24} className="text-blue-500" />,
      bg: "bg-blue-50/50",
      path: "/admin/orders"
    },
    {
      title: "Products & Stock",
      desc: "Update catalog & prices",
      icon: <Package size={24} className="text-emerald-500" />,
      bg: "bg-emerald-50/50",
      path: "/admin/products"
    },
    {
      title: "Khata / Ledger",
      desc: "Manage customers & dues",
      icon: <Users size={24} className="text-amber-500" />,
      bg: "bg-amber-50/50",
      path: "/admin/customers"
    },
    {
      title: "Store Settings",
      desc: "Update UPI & config",
      icon: <Settings size={24} className="text-purple-500" />,
      bg: "bg-purple-50/50",
      path: "/admin/settings"
    }
  ];

  return (
    <div className="p-6 sm:p-10 max-w-5xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-black text-slate-800 tracking-tight">Overview Dashboard</h1>
        <p className="text-sm font-bold text-slate-400 mt-1">Select a module to manage your store configuration.</p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-10">
         <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm shadow-slate-200/50">
            <p className="text-[10px] font-black uppercase text-slate-400 tracking-wider">Unattended</p>
            <p className="text-2xl font-black text-amber-500 mt-1">{stats.unattended}</p>
         </div>
         <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm shadow-slate-200/50">
            <p className="text-[10px] font-black uppercase text-slate-400 tracking-wider">Pending Pay</p>
            <p className="text-2xl font-black text-blue-500 mt-1">{stats.pendingPayment}</p>
         </div>
         <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm shadow-slate-200/50">
            <p className="text-[10px] font-black uppercase text-slate-400 tracking-wider">Delivered</p>
            <p className="text-2xl font-black text-emerald-500 mt-1">{stats.delivered}</p>
         </div>
         <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm shadow-slate-200/50">
            <p className="text-[10px] font-black uppercase text-slate-400 tracking-wider">Total Customers</p>
            <p className="text-2xl font-black text-slate-700 mt-1">{stats.totalCustomers}</p>
         </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {modules.map((mod, index) => (
          <Link key={index} href={mod.path} className="group bg-white p-6 rounded-[2rem] border border-slate-100 hover:border-emerald-500/30 hover:shadow-xl hover:shadow-slate-200/60 transition-all flex justify-between items-center cursor-pointer shadow-md shadow-slate-100">
            <div className="flex items-center gap-5">
              <div className={`w-14 h-14 ${mod.bg} rounded-2xl flex items-center justify-center transition-transform group-hover:scale-105 shadow-inner`}>
                {mod.icon}
              </div>
              <div>
                <h3 className="font-black text-slate-800 text-lg leading-snug">{mod.title}</h3>
                <p className="text-xs font-bold text-slate-400 mt-0.5">{mod.desc}</p>
              </div>
            </div>
            <div className="w-10 h-10 bg-slate-50 group-hover:bg-emerald-500 group-hover:text-white rounded-full flex items-center justify-center text-slate-400 transition-colors">
              <ArrowRight size={18} />
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
