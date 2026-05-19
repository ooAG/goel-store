"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { Plus, Image as ImageIcon, Tag, IndianRupee, Scale, Edit2, Trash2, Search, X, ChevronLeft, Sparkles, FolderOpen, Layers, Type } from "lucide-react";
import toast, { Toaster } from "react-hot-toast";

export default function AdminProducts() {
  const [products, setProducts] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [form, setForm] = useState({ name: "", mrp: "", sellingPrice: "", category: "", unit: "", image: "" });
  const [loading, setLoading] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  
  const [renamingCategoryKey, setRenamingCategoryKey] = useState<string | null>(null);
  const [globalRenameString, setGlobalRenameString] = useState("");

  const fetchProducts = () => fetch("/api/products").then(res => res.json()).then(setProducts);

  useEffect(() => { fetchProducts(); }, []);

  const submitProduct = async (e: any) => {
    e.preventDefault();
    setLoading(true);
    const tId = toast.loading("Save kar rahe hain...");
    
    try {
      if (editingId) {
        await fetch("/api/products", {
          method: "PUT",
          body: JSON.stringify({ id: editingId, ...form, mrp: parseFloat(form.mrp), sellingPrice: parseFloat(form.sellingPrice) }),
        });
      } else {
        await fetch("/api/products", {
          method: "POST",
          body: JSON.stringify({ ...form, mrp: parseFloat(form.mrp), sellingPrice: parseFloat(form.sellingPrice) }),
        });
      }
      
      toast.success("Product save ho gaya!", { id: tId });
      setForm({ name: "", mrp: "", sellingPrice: "", category: "", unit: "", image: "" });
      setEditingId(null);
      await fetchProducts();
    } catch(err) {
      toast.error("Save karne mein dikkat aayi.", { id: tId });
    } finally {
      setLoading(false);
    }
  };

  const handleGlobalCategoryRenameSubmit = async (oldName: string) => {
    if (!globalRenameString || globalRenameString.trim() === "") return toast.error("Naam khali nahi chhod sakte.");
    const targetNewName = globalRenameString.trim();
    
    const tId = toast.loading(`'${oldName}' ko '${targetNewName}' mein badal rahe hain...`);
    try {
      const res = await fetch("/api/categories", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ oldCategory: oldName, newCategory: targetNewName })
      });
      if (res.ok) {
        toast.success("Sabhi products mein category badal gayi!", { id: tId });
        setRenamingCategoryKey(null);
        setGlobalRenameString("");
        await fetchProducts();
      } else {
        toast.error("Rename nahi ho paaya.", { id: tId });
      }
    } catch (e) {
      toast.error("Network issue, connect nahi ho paaya.", { id: tId });
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Kya aap sach mein is product ko delete karna chahte hain?")) return;
    const tId = toast.loading("Deleting row...");
    await fetch(`/api/products?id=${id}`, { method: "DELETE" });
    toast.success("Product delete ho gaya.", { id: tId });
    fetchProducts();
  };

  const handleEdit = (p: any) => {
    setEditingId(p.id);
    setForm({ 
      name: p.name, 
      mrp: p.mrp.toString(), 
      sellingPrice: p.sellingPrice.toString(), 
      category: p.category, 
      unit: p.unit || "", 
      image: p.image || ""
    });
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const cancelEdit = () => {
    setEditingId(null);
    setForm({ name: "", mrp: "", sellingPrice: "", category: "", unit: "", image: "" });
  };

  const displayedProducts = products.filter(p => p.name.toLowerCase().includes(searchQuery.toLowerCase()) || p.category.toLowerCase().includes(searchQuery.toLowerCase()));

  const masterUniqueCategoriesList = Array.from(new Set(
    products.map(p => p.category?.trim()).filter(Boolean)
  ));

  return (
    <div className="p-4 sm:p-10 max-w-7xl mx-auto font-sans bg-slate-50 min-h-screen text-slate-900 selection:bg-emerald-500/20">
      <Toaster position="top-right" />
      <div className="mb-6 md:hidden"><Link href="/admin" className="flex items-center gap-1.5 text-xs font-black uppercase tracking-widest text-slate-400 hover:text-emerald-500 transition-colors"><ChevronLeft size={16}/> Dashboard</Link></div>
      
      <div className="mb-10 p-6 bg-white border border-slate-200 rounded-[2rem] shadow-sm max-w-4xl flex items-center justify-between">
        <div>
          <h1 className="text-2xl sm:text-4xl font-black tracking-tight text-slate-900">Store Catalog Management</h1>
          <p className="text-slate-400 font-bold text-xs sm:text-sm uppercase tracking-wider mt-1">Products, Prices aur Categories manage karein</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        <div className="lg:col-span-4 space-y-6">
          <form onSubmit={submitProduct} className="bg-white p-6 rounded-[2.5rem] shadow-2xl shadow-slate-200/60 border border-slate-100 flex flex-col gap-4 sticky top-6">
            <div className="flex justify-between items-center mb-2">
              <h2 className="font-black text-sm uppercase tracking-widest text-slate-800 flex items-center gap-2">
                {editingId ? <><Edit2 size={16} className="text-blue-500"/> Edit Product Row</> : <><Plus size={16} className="text-emerald-500"/> Create New Entry</>}
              </h2>
              {editingId && <button type="button" onClick={cancelEdit} className="text-slate-400 hover:text-rose-500 p-1.5 bg-slate-50 rounded-full transition-colors"><X size={16}/></button>}
            </div>
            
            <div>
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 mb-1 block">Product Title Name</label>
              <input placeholder="e.g. Maggi 2-Minute Noodles Masala" className="w-full bg-slate-50 border border-slate-200 p-4 rounded-xl text-sm font-bold text-slate-800 outline-none focus:border-emerald-400 focus:ring-4 focus:ring-emerald-500/5 transition-all shadow-inner" value={form.name} onChange={e => setForm({...form, name: e.target.value})} required />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 mb-1 block">Maximum MRP (₹)</label>
                <input placeholder="14" type="number" step="0.01" className="w-full bg-slate-50 border border-slate-200 p-4 rounded-xl text-sm font-bold text-slate-800 outline-none focus:border-emerald-400 shadow-inner" value={form.mrp} onChange={e => setForm({...form, mrp: e.target.value})} required />
              </div>
              <div>
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 mb-1 block">Selling Price (₹)</label>
                <input placeholder="12" type="number" step="0.01" className="w-full bg-slate-50 border border-slate-200 p-4 rounded-xl text-sm font-bold text-slate-800 outline-none focus:border-emerald-400 shadow-inner" value={form.sellingPrice} onChange={e => setForm({...form, sellingPrice: e.target.value})} required />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 mb-1 block">Category Name</label>
                <input 
                  list="existing-store-categories" 
                  placeholder="e.g. Snacks" 
                  className="w-full bg-slate-50 border border-slate-200 p-4 rounded-xl text-sm font-bold text-slate-800 outline-none focus:border-emerald-400 shadow-inner" 
                  value={form.category} 
                  onChange={e => setForm({...form, category: e.target.value})} 
                  required 
                /> 
                <datalist id="existing-store-categories">
                  {masterUniqueCategoriesList.map(cat => (
                    <option key={cat} value={cat} />
                  ))}
                </datalist>
              </div>
              <div>
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 mb-1 block">Unit Pack Size</label>
                <input placeholder="e.g. 70g" className="w-full bg-slate-50 border border-slate-200 p-4 rounded-xl text-sm font-bold text-slate-800 outline-none focus:border-emerald-400 shadow-inner" value={form.unit} onChange={e => setForm({...form, unit: e.target.value})} required />
              </div>
            </div>

            <div>
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 mb-1 block flex items-center gap-1"><ImageIcon size={12}/> Product Picture Image URL</label>
              <input placeholder="https://example.com/image.png" className="w-full bg-slate-50 border border-slate-200 p-3.5 rounded-xl text-xs font-bold text-slate-800 outline-none focus:border-emerald-400 shadow-inner" value={form.image} onChange={e => setForm({...form, image: e.target.value})} />
            </div>

            <button type="submit" disabled={loading} className={`w-full text-white p-4.5 rounded-2xl font-black mt-2 text-xs uppercase tracking-widest shadow-xl transition-all active:scale-95 disabled:opacity-50 ${editingId ? 'bg-blue-600 hover:bg-blue-700 shadow-blue-500/20' : 'bg-emerald-500 hover:bg-emerald-600 shadow-emerald-500/20'}`}>
              {loading ? 'Processing Database Transaction...' : editingId ? 'Update Rows' : 'Push to Live Catalog'}
            </button>
          </form>

          {/* 🔥 DEDICATED GLOBAL RENAME ENGINE COMPONENT HOOK */}
          <div className="bg-white p-5 rounded-[2rem] border border-slate-100 shadow-xl shadow-slate-200/40">
             <h3 className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-4 flex items-center gap-1.5"><Layers size={14}/> Global Category Renamer</h3>
             <div className="space-y-3 max-h-64 overflow-y-auto pr-1">
                {masterUniqueCategoriesList.map((catName) => {
                   const isRenamingActiveMode = renamingCategoryKey === catName;
                   return (
                   <div key={catName} className="p-3.5 bg-slate-50 border border-slate-200/80 rounded-2xl flex flex-col gap-2 shadow-inner">
                      <div className="flex justify-between items-center w-full">
                         {isRenamingActiveMode ? (
                            <div className="flex items-center gap-1 w-full">
                               <input type="text" placeholder="New name" value={globalRenameString} onChange={e => setGlobalRenameString(e.target.value)} className="text-xs font-black p-2 border border-amber-400 rounded-xl bg-white w-full outline-none shadow-sm" />
                               <button type="button" onClick={() => handleGlobalCategoryRenameSubmit(catName)} className="bg-emerald-500 text-white p-2 rounded-xl font-black text-[10px] px-3 uppercase shadow-sm">Save</button>
                               <button type="button" onClick={() => { setRenamingCategoryKey(null); setGlobalRenameString(""); }} className="bg-slate-200 text-slate-500 p-2 rounded-xl text-[10px] px-2.5">X</button>
                            </div>
                         ) : (
                            <div className="flex justify-between items-center w-full px-1">
                               <span className="text-xs font-black text-slate-700 uppercase tracking-wide">{catName}</span>
                               <button type="button" onClick={() => { setRenamingCategoryKey(catName); setGlobalRenameString(catName); }} className="text-blue-500 hover:bg-blue-50 px-2.5 py-1 rounded-lg border border-blue-100 font-black text-[10px] uppercase flex items-center gap-1 transition-all shadow-sm" title="Global Rename"><Type size={11}/> Rename Global</button>
                            </div>
                         )}
                      </div>
                   </div>
                )})}
             </div>
          </div>
        </div>

        {/* CARDS CONTAINER WINDOW */}
        <div className="lg:col-span-8">
          <div className="mb-6 relative max-w-xl">
            <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
            <input type="text" placeholder="Search by name title or specific category fields..." className="w-full bg-white border border-slate-200 p-4 pl-12 rounded-2xl font-bold text-sm text-slate-800 outline-none focus:border-emerald-400 shadow-sm transition-all" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} />
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-5">
            {displayedProducts.length === 0 ? (
              <div className="col-span-full text-center py-24 text-slate-400 bg-white border border-slate-200 border-dashed rounded-[2.5rem] font-black text-sm uppercase tracking-wider">No catalog items matches query.</div>
            ) : (
              displayedProducts.map((p: any) => (
                <div key={p.id} className="bg-white rounded-[2rem] border border-slate-200/60 shadow-md hover:shadow-xl transition-all flex flex-col justify-between overflow-hidden relative group p-3 sm:p-4 hover:border-emerald-300">
                  
                  <div className="w-full aspect-square bg-slate-50 rounded-2xl flex-shrink-0 border border-slate-100/50 overflow-hidden flex items-center justify-center relative shadow-inner mb-3">
                    {p.image ? (
                      <img src={p.image} className="w-full h-full object-contain p-3 group-hover:scale-105 transition-transform duration-300" alt={p.name} />
                    ) : (
                      <ImageIcon size={28} className="text-slate-300" />
                    )}
                    <div className="absolute bottom-2 left-2 px-2.5 py-0.5 bg-white border border-slate-200 rounded-md font-black text-[9px] uppercase text-slate-700 shadow-sm tracking-wide">
                       {p.unit || "1 Pack"}
                    </div>
                  </div>

                  <div className="flex-grow flex flex-col justify-between gap-2.5">
                    <div>
                       <div className="inline-flex items-center gap-1 text-[8px] font-black uppercase text-slate-400 bg-slate-100 px-2 py-0.5 rounded shadow-inner tracking-wider mb-1">
                          <Tag size={8}/> {p.category}
                       </div>
                       <h3 className="font-black text-xs sm:text-sm leading-snug text-slate-800 line-clamp-2 h-10">{p.name}</h3>
                    </div>

                    <div className="flex items-end justify-between pt-2 border-t border-slate-50">
                       <div className="flex flex-col">
                          <span className="text-[8px] font-black uppercase text-slate-400 tracking-widest line-through mb-0.5">₹{p.mrp}</span>
                          <span className="text-base sm:text-xl font-black text-slate-900 leading-none">₹{p.sellingPrice}</span>
                       </div>
                       
                       <div className="flex gap-1">
                          <button onClick={() => handleEdit(p)} className="bg-blue-50 hover:bg-blue-100 text-blue-600 p-2.5 rounded-xl border border-blue-100 transition-colors shadow-sm"><Edit2 size={13}/></button>
                          <button onClick={() => handleDelete(p.id)} className="bg-rose-50 hover:bg-rose-100 text-rose-500 p-2.5 rounded-xl border border-rose-100 transition-colors shadow-sm"><Trash2 size={13}/></button>
                       </div>
                    </div>
                  </div>

                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
