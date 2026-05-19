"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, ShoppingCart, PackageCheck, Settings, Users, LogOut } from "lucide-react";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  const menuItems = [
    { icon: <LayoutDashboard size={20} />, label: "Dashboard", path: "/admin" },
    { icon: <ShoppingCart size={20} />, label: "Live Orders", path: "/admin/orders" },
    { icon: <PackageCheck size={20} />, label: "Inventory", path: "/admin/products" },
    { icon: <Users size={20} />, label: "Customers", path: "/admin/customers" },
    // Strictly mapped configuration anchor endpoint to avoid broke loops
    { icon: <Settings size={20} />, label: "Settings", path: "/admin/settings" },
  ];

  return (
    <div className="min-h-screen bg-slate-50 flex">
      {/* Sidebar Desktop */}
      <aside className="w-64 bg-slate-900 text-slate-300 hidden md:flex flex-col justify-between p-6 shrink-0 shadow-2xl">
        <div className="space-y-8">
          <div className="px-3 py-2 flex items-center gap-3">
            <div className="p-2 bg-emerald-500 text-white rounded-xl shadow-lg"><ShoppingCart size={20}/></div>
            <div>
               <h2 className="text-lg font-black text-white tracking-tight">Goel Store</h2>
               <p className="text-[10px] uppercase font-black text-emerald-400 tracking-wider">Admin Engine</p>
            </div>
          </div>
          <nav className="space-y-1">
            {menuItems.map((item) => {
              const isActive = pathname === item.path;
              return (
                <Link key={item.path} href={item.path} className={`flex items-center gap-3.5 px-4 py-3.5 rounded-xl font-black text-xs uppercase tracking-wider transition-all ${isActive ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/20' : 'text-slate-400 hover:bg-slate-800 hover:text-slate-200'}`}>
                  {item.icon} {item.label}
                </Link>
              );
            })}
          </nav>
        </div>
        <button onClick={() => { localStorage.clear(); window.location.href="/admin"; }} className="w-full bg-slate-800 hover:bg-rose-950 hover:text-rose-400 p-4 rounded-xl font-black text-xs uppercase tracking-widest transition-colors flex items-center justify-center gap-2 border border-slate-700/50"><LogOut size={16}/> Exit Engine</button>
      </aside>

      {/* Main Container Section */}
      <div className="flex-1 flex flex-col min-w-0">
         {/* Mobile Navigation Header */}
         <header className="md:hidden bg-slate-900 p-4 flex items-center justify-between text-white shadow-lg">
            <div className="flex items-center gap-2">
               <div className="p-1.5 bg-emerald-500 rounded-lg"><ShoppingCart size={16}/></div>
               <span className="font-black text-sm tracking-tight">Goel Store Admin</span>
            </div>
            <nav className="flex items-center gap-1">
               {menuItems.map((item) => {
                  const isActive = pathname === item.path;
                  return (
                     <Link key={item.path} href={item.path} className={`p-2.5 rounded-lg transition-colors ${isActive ? 'bg-emerald-500 text-white' : 'text-slate-400 hover:bg-slate-800'}`}>
                        {item.icon}
                     </Link>
                  );
               })}
            </nav>
         </header>
         <main className="flex-1 overflow-y-auto w-full max-w-[1600px] mx-auto pb-20">{children}</main>
      </div>
    </div>
  );
}
