"use client";
import { useEffect, useState, useRef } from "react";
import Link from "next/link";
import { CheckCircle2, AlertCircle, X, Banknote, BookOpen, Sparkles, Package, Edit, Activity, Plus, Minus, Search, User, Trash2, RotateCcw, LogOut, ChevronLeft, RefreshCw } from "lucide-react";
import toast, { Toaster } from "react-hot-toast";
import { useRouter } from "next/navigation";

export default function AdminOrders() {
  const router = useRouter();
  const [orders, setOrders] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("UNATTENDED"); 
  const [searchTerm, setSearchTerm] = useState(""); 
  const [isProcessing, setIsProcessing] = useState(false); 
  
  const [settleModal, setSettleModal] = useState<any>(null);
  const [amountReceived, setAmountReceived] = useState<number | string>("");
  const [udhaarModal, setUdhaarModal] = useState<any>(null);
  const [dispatchModal, setDispatchModal] = useState<any>(null);
  const [cancelModal, setCancelModal] = useState<any>(null);
  const [khataPreview, setKhataPreview] = useState<any>(null);

  const [reviseModal, setReviseModal] = useState<any>(null);
  const [reviseItems, setReviseItems] = useState<any[]>([]);
  const [initialReviseItems, setInitialReviseItems] = useState<any[]>([]); 
  const [productSearch, setProductSearch] = useState("");

  // Sound Engine Ref Memory Tracker
  const ordersCountTrackerRef = useRef<number | null>(null);

  const fetchData = async (showLoader = false) => {
    if(showLoader) setLoading(true);
    try {
       const [rOrd, rProd] = await Promise.all([
           fetch(`/api/orders?t=${Date.now()}`),
           fetch(`/api/products?t=${Date.now()}`)
       ]);
       const freshOrders = await rOrd.json();
       const freshProducts = await rProd.json();

       setOrders(freshOrders || []);
       setProducts(freshProducts || []);

       // 🚨 LIVE LOUD CHIME: Trigger tingting.wav when orders array length grows dynamically
       if (ordersCountTrackerRef.current !== null && freshOrders.length > ordersCountTrackerRef.current) {
          try {
             new Audio("/sounds/tingting.wav").play();
          } catch(e) {}
       }
       ordersCountTrackerRef.current = freshOrders.length;
    } catch (e) {}
    setLoading(false);
  };

  useEffect(() => {
    fetchData(true);
    const intervalId = setInterval(() => { fetchData(false); }, 5000);
    return () => clearInterval(intervalId);
  }, []);

  const handleAction = async (orderObj: any, action: string, amountReceived?: number, revisedItems?: any[]) => {
    setIsProcessing(true);
    const tId = toast.loading("Processing...");
    try {
      const res = await fetch("/api/orders", { 
          method: "PATCH", 
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ id: orderObj.id, action, amountReceived, items: revisedItems }) 
      });
      const data = await res.json();
      
      if (data.error) {
          toast.error(data.error, { id: tId });
      } else {
          toast.success("Done!", { id: tId });
          setSettleModal(null); setUdhaarModal(null); setDispatchModal(null); setReviseModal(null); setCancelModal(null);
          await fetchData(false); 

          let msg = "";
          const pName = orderObj.customer.name;
          const storeHeader = `🏪 *GOEL STORE*\n------------------------\n`;
          const orderRef = `🧾 *Order ID:* #${orderObj.id}\n`;

          if(action === "MARK_FULFILLED") {
              msg = `${storeHeader}📦 *ORDER DISPATCHED* 🚀\n\nHi ${pName},\nYour order is packed and out for delivery!\n\n${orderRef}💰 *Bill Amount:* ₹${orderObj.totalAmount}\n\nThank you for shopping with us! 😊`;
          }
          if(action === "REVISE_ORDER") {
              const revisedTotal = revisedItems?.reduce((s:any,i:any)=>s+(i.sellingPrice*i.quantity),0);
              if (revisedTotal === 0) {
                 msg = `${storeHeader}❌ *ORDER CANCELLED* 🚫\n\nHi ${pName},\nYour order has been entirely cancelled as per updates.\n\n${orderRef}Refunds (if any) have been safely added to your Khata.`;
              } else {
                 msg = `${storeHeader}📝 *ORDER REVISED* 🔄\n\nHi ${pName},\nYour order items/bill has been updated.\n\n${orderRef}💵 *New Bill Total:* ₹${revisedTotal}\n\nFeel free to reach out for any questions!`;
              }
          }
          if(action === "SETTLE_PAYMENT") {
              msg = `${storeHeader}✅ *PAYMENT RECEIVED* 💸\n\nHi ${pName},\nWe have successfully received your payment.\n\n${orderRef}💰 *Amount Received:* ₹${amountReceived}\n\nThank you for your prompt payment! 🙏`;
          }
          if(action === "MARK_DUES") {
              msg = `${storeHeader}📒 *KHATA UPDATED* ✍️\n\nHi ${pName},\nYour order amount has been added to your store Khata (Udhaar).\n\n${orderRef}⏳ *Amount Added:* ₹${orderObj.totalAmount}\n\nYou can pay this later at your convenience.`;
          }
          if(action === "CANCEL_ORDER") {
              msg = `${storeHeader}❌ *ORDER CANCELLED* 🚫\n\nHi ${pName},\nYour order has been cancelled.\n\n${orderRef}Refunds (if any) or Store Credit have been safely added to your Khata.\n\nWe hope to serve you again soon!`;
          }

          if (msg) {
              setTimeout(() => {
                  window.location.href = `whatsapp://send?phone=91${orderObj.customer.phone}&text=${encodeURIComponent(msg)}`;
              }, 400);
          }
      }
    } catch(e) { 
        toast.error("Update Failed", { id: tId }); 
    } finally {
        setIsProcessing(false);
    }
  };

  const getClaimedAmount = (assignedQr: string) => {
      if (assignedQr && assignedQr.includes("VPA_CLAIMED:")) {
          const parts = assignedQr.split("VPA_CLAIMED:");
          const amtStr = parts[parts.length - 1]?.trim(); 
          if (amtStr && !isNaN(Number(amtStr))) {
              return Number(amtStr);
          }
      }
      return null;
  };

  const openSettleModal = (o: any) => {
      setSettleModal(o);
      const claimed = getClaimedAmount(o.assignedQr);
      setAmountReceived(claimed !== null ? claimed : o.totalAmount);
  };
  
  const openReviseModal = (o: any) => {
      setReviseModal(o);
      const items = o.items.map((i: any) => ({
          productId: i.productId, customName: i.customName || i.product?.name,
          sellingPrice: i.sellingPrice, quantity: i.quantity
      }));
      setReviseItems(items);
      setInitialReviseItems(JSON.parse(JSON.stringify(items))); 
  };

  const handleReviseQty = (index: number, delta: number) => {
      const newItems = [...reviseItems];
      newItems[index].quantity += delta;
      if (newItems[index].quantity <= 0) { newItems.splice(index, 1); }
      setReviseItems(newItems);
  };

  const addNewProduct = (p: any) => {
      const existing = reviseItems.find(i => i.productId === p.id);
      if (existing) setReviseItems(reviseItems.map(i => i.productId === p.id ? { ...i, quantity: i.quantity + 1 } : i));
      else setReviseItems([...reviseItems, { productId: p.id, customName: p.name, sellingPrice: p.sellingPrice, quantity: 1 }]);
      setProductSearch("");
  };

  const handleLogout = () => {
      localStorage.clear();
      router.push("/admin"); 
  };

  const isUnattended = (o: any) => o.orderStatus === "NEW";
  const isPendingPay = (o: any) => o.orderStatus === "FULFILLED" && o.paymentStatus === "PENDING";
  const isDelivered = (o: any) => o.orderStatus === "FULFILLED" && (o.paymentStatus === "PAID" || o.paymentStatus === "DUES_ADDED");
  const isCancelled = (o: any) => o.orderStatus === "CANCELLED";

  const counts = {
      ALL: orders.length,
      UNATTENDED: orders.filter(isUnattended).length,
      PENDING_PAYMENT: orders.filter(isPendingPay).length,
      DELIVERED: orders.filter(isDelivered).length,
      CANCELLED: orders.filter(isCancelled).length,
  };

  const tabs = [
      { id: "UNATTENDED", label: "Naye Orders (Unattended)" },
      { id: "PENDING_PAYMENT", label: "Udhari / Bacha Paisa" },
      { id: "DELIVERED", label: "Delivered (Sabh Sahi)" },
      { id: "CANCELLED", label: "Cancelled (Radd Orders)" },
      { id: "ALL", label: "Saare Orders (Master Log)" }
  ];

  const filteredOrders = orders.filter(o => {
      const q = searchTerm.toLowerCase();
      const matchesSearch = o.customer.name.toLowerCase().includes(q) || o.customer.phone.includes(q) || o.id.toLowerCase().includes(q) || o.customer.customId?.toLowerCase().includes(q);
      if (!matchesSearch) return false;

      if (filter === "ALL") return true;
      if (filter === "UNATTENDED") return isUnattended(o);
      if (filter === "PENDING_PAYMENT") return isPendingPay(o);
      if (filter === "DELIVERED") return isDelivered(o);
      if (filter === "CANCELLED") return isCancelled(o);
      return true;
  });

  // 🔥 SIDEBAR SORT HIGHLIGHT COLORS (Beautiful Distinct Theme Styles)
  const getSidebarTabClass = (tabId: string, isActive: boolean) => {
    if (!isActive) return "text-slate-400 hover:bg-slate-800/60 hover:text-slate-100 bg-transparent";
    switch(tabId) {
      case "UNATTENDED": return "bg-amber-600 text-white shadow-md shadow-amber-600/20 font-black scale-[1.02]";
      case "PENDING_PAYMENT": return "bg-blue-600 text-white shadow-md shadow-blue-600/20 font-black scale-[1.02]";
      case "DELIVERED": return "bg-emerald-600 text-white shadow-md shadow-emerald-600/20 font-black scale-[1.02]";
      case "CANCELLED": return "bg-rose-600 text-white shadow-md shadow-rose-600/20 font-black scale-[1.02]";
      default: return "bg-indigo-600 text-white shadow-md shadow-indigo-600/20 font-black scale-[1.02]";
    }
  };

  // 🔥 HUMAN-READABLE TOP BANNER CONTEXT (Zero tech jargon, clean instructions)
  const getDynamicHeaderBannerContext = (filterId: string) => {
    switch(filterId) {
      case "UNATTENDED": return { title: "🚨 NAYE ORDERS (Pack Karna Hai)", desc: "Fresh customer orders jo abhi dukan par aaye hain. Inhe pack karke Dispatch dabao." };
      case "PENDING_PAYMENT": return { title: "⏳ PENDING PAYMENT VERIFICATION (Udhari / Hisab)", desc: "Orders packed aur delivered hain par customer se cash/UPI payment receive karna bacha hai." };
      case "DELIVERED": return { title: "✅ DELIVERED ORDERS LOG (Sabh Sahi)", desc: "Safely delivered aur fully settled transactions ka safe history snapshot record." };
      case "CANCELLED": return { title: "❌ CANCELLED ORDERS (Radd Kiye Huye)", desc: "Jo orders radd (cancel) ho gaye hain, maal inventory mein wapas add ho chuka hai." };
      default: return { title: "📋 SAARE ORDERS KA MANIFEST (Master Log)", desc: "Dukan par aaj tak aaye huye har ek order transaction ki poori clear dynamic history list." };
    }
  };

  const billAmount = settleModal?.totalAmount || 0;
  const receivedAmount = Number(amountReceived) || 0;
  const diff = receivedAmount - billAmount;
  const revisedTotal = reviseItems.reduce((sum, i) => sum + (i.sellingPrice * i.quantity), 0);
  
  const hasChanges = initialReviseItems.length !== reviseItems.length || reviseItems.some((item, idx) => {
      const initial = initialReviseItems[idx];
      return !initial || initial.productId !== item.productId || initial.quantity !== item.quantity;
  });

  const headerContext = getDynamicHeaderBannerContext(filter);

  if (loading && orders.length === 0) return <div className="p-10 text-center text-slate-400 font-bold">Loading Live Orders...</div>;

  return (
    <div className="flex min-h-screen bg-slate-50">
       <Toaster position="top-right" />
       
       {/* MAIN WORKSPACE PANEL */}
       <div className="flex-1 md:pl-64 p-4 sm:p-10 w-full max-w-full">
          <div className="mb-4 md:hidden"><Link href="/admin" className="flex items-center gap-1.5 text-xs font-black uppercase tracking-widest text-slate-400 hover:text-emerald-500 transition-colors"><ChevronLeft size={16}/> Dashboard</Link></div>
          
          {/* HIGH-VISIBILITY BANNER BAR */}
          <div className="mb-8 p-6 bg-white border border-slate-200 rounded-[2rem] shadow-sm max-w-4xl flex flex-col gap-1">
             <h2 className="text-lg font-black tracking-tight text-slate-900">{headerContext.title}</h2>
             <p className="text-xs text-slate-400 font-bold leading-relaxed uppercase tracking-wider">{headerContext.desc}</p>
          </div>

          <div className="flex flex-col gap-5 mb-8 max-w-4xl">
             <div className="relative w-full">
                <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                <input type="text" placeholder="Search by Customer Name, Phone, ID or Order ID..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="w-full bg-white border border-slate-200 text-sm font-bold text-slate-800 py-4 pl-11 pr-4 rounded-2xl outline-none focus:border-emerald-400 focus:ring-4 focus:ring-emerald-500/10 shadow-sm transition-all" />
             </div>
          </div>
          
          {/* ORDERS ITERATOR VIEW LOGIC */}
          <div className="space-y-6 max-w-4xl">
             {filteredOrders.length === 0 && (<div className="p-12 text-center text-slate-400 bg-white rounded-[2rem] border border-slate-200 border-dashed shadow-sm">No orders found matching your criteria.</div>)}

             {filteredOrders.map(o => {
                const claimedAmt = getClaimedAmount(o.assignedQr);
                return (
                <div key={o.id} className="bg-white p-5 sm:p-8 rounded-[2rem] border border-slate-100 shadow-xl shadow-slate-200/40 flex flex-col md:flex-row justify-between gap-6 transition-all hover:border-emerald-200">
                   <div className="flex-1">
                      <div className="flex flex-wrap items-center gap-3 mb-4">
                          <h3 className="font-black text-xl text-slate-800">#{o.id}</h3>
                          <span className="text-[10px] font-bold text-slate-500 bg-slate-100 px-2 py-1.5 rounded-md uppercase tracking-widest">{new Date(o.createdAt).toLocaleString('en-IN', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</span>
                          <span className={`px-3 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest ${o.orderStatus === 'NEW' ? 'bg-amber-100 text-amber-600' : o.orderStatus === 'CANCELLED' ? 'bg-rose-100 text-rose-600' : 'bg-emerald-100 text-emerald-600'}`}>{o.orderStatus === 'NEW' ? 'IN PROGRESS' : o.orderStatus}</span>
                          {o.orderStatus !== 'CANCELLED' && (
                              <span className={`px-3 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest ${o.paymentStatus === 'PAID' ? 'bg-emerald-100 text-emerald-600' : o.paymentStatus === 'DUES_ADDED' ? 'bg-rose-100 text-rose-600' : 'bg-amber-100 text-amber-600'}`}>{o.paymentStatus === 'DUES_ADDED' ? 'UDHAAR' : o.paymentStatus}</span>
                          )}
                      </div>
                      
                      <div className="bg-slate-50 p-5 rounded-2xl inline-block mb-4 border border-slate-100 w-full md:min-w-[260px] md:w-auto shadow-inner">
                         <div className="flex items-center justify-between mb-2">
                            <p className="text-sm font-black text-slate-800">{o.customer.name}</p>
                            <span className="text-[10px] font-black text-amber-600 bg-amber-100 px-2 py-1 rounded-md">{o.customer.customId}</span>
                         </div>
                         <p className="text-xs font-bold text-slate-500">{o.customer.phone}</p>
                         <p className="text-xs font-medium text-slate-500 mt-2 mb-4 leading-relaxed">{o.customer.address}</p>
                         <button onClick={() => setKhataPreview(o.customer)} disabled={isProcessing} className="w-full justify-center inline-flex items-center gap-2 text-[10px] font-black text-amber-600 bg-amber-100 px-3 py-2.5 rounded-xl uppercase tracking-widest hover:bg-amber-200 transition-colors disabled:opacity-50"><Activity size={14}/> View Khata</button>
                      </div>
                      
                      <div className="flex items-center gap-4 mb-4">
                          <div className="flex flex-col">
                              <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Total Bill</span>
                              <span className="text-2xl font-black text-emerald-500">₹{o.totalAmount}</span>
                          </div>
                      </div>

                      <div className="mt-4 pt-5 border-t border-dashed border-slate-200 space-y-3 w-full bg-slate-50/50 p-4 sm:p-5 rounded-3xl">
                          <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">Order Items</p>
                          {o.items.length === 0 && <p className="text-xs text-rose-500 font-bold italic">📦 All items returned / Order cancelled</p>}
                          {o.items.map((i: any) => (
                              <div key={i.id} className="flex justify-between text-sm font-bold text-slate-700">
                                  <span>{i.product?.name || i.customName} <span className="text-slate-400 ml-1">x{i.quantity}</span></span>
                                  <span>₹{i.sellingPrice * i.quantity}</span>
                              </div>
                          ))}
                          <div className="flex justify-between items-center text-[10px] font-black uppercase text-slate-500 pt-4 mt-4 border-t border-slate-200 tracking-widest">
                              <span>Payment Mode</span>
                              <span className="text-slate-700 bg-white px-3 py-1.5 rounded-lg border border-slate-200">
                                 {o.paymentMode === "UPI" && claimedAmt !== null
                                   ? `UPI (Claimed: ₹${claimedAmt})` 
                                   : o.paymentMode?.replace('_', ' ')}
                              </span>
                          </div>
                      </div>
                   </div>

                   {/* INTERACTIVE OPERATIONS CONTEXT PANEL */}
                   <div className="flex flex-col gap-3 md:min-w-[180px] justify-center border-t md:border-t-0 md:border-l border-slate-100 pt-6 md:pt-0 md:pl-6">
                      {o.orderStatus === "NEW" && (
                          <>
                            <button onClick={() => setDispatchModal(o)} disabled={isProcessing} className="w-full bg-slate-900 hover:bg-slate-800 text-white py-4 px-6 rounded-2xl font-black text-xs uppercase tracking-widest flex items-center justify-center gap-2 shadow-lg transition-colors disabled:opacity-50"><Package size={16}/> Dispatch</button>
                            <button onClick={() => openReviseModal(o)} disabled={isProcessing} className="w-full bg-slate-100 hover:bg-slate-200 text-slate-700 py-3 px-6 rounded-2xl font-black text-[10px] uppercase tracking-widest flex items-center justify-center gap-2 transition-colors disabled:opacity-50"><Edit size={14}/> Revise Order</button>
                            <button onClick={() => setCancelModal(o)} disabled={isProcessing} className="w-full bg-rose-50 hover:bg-rose-100 text-rose-500 border border-rose-200 py-3 px-6 rounded-2xl font-black text-[10px] uppercase tracking-widest flex items-center justify-center gap-2 transition-colors mt-2 disabled:opacity-50"><Trash2 size={14}/> Cancel Order</button>
                          </>
                      )}
                      {o.orderStatus === "FULFILLED" && (
                          <button onClick={() => openReviseModal(o)} disabled={isProcessing} className="w-full bg-blue-50 hover:bg-blue-100 text-blue-600 border border-blue-200 py-4 px-6 rounded-2xl font-black text-xs uppercase tracking-widest flex items-center justify-center gap-2 transition-colors shadow-sm disabled:opacity-50"><RotateCcw size={16}/> Return Items</button>
                      )}
                      {(o.paymentStatus === "PENDING" || o.paymentStatus === "DUES_ADDED") && o.orderStatus !== "CANCELLED" && (
                          <button onClick={() => openSettleModal(o)} disabled={isProcessing} className="w-full bg-emerald-50 hover:bg-emerald-100 text-emerald-600 border border-emerald-200 py-4 px-6 rounded-2xl font-black text-xs uppercase tracking-widest flex items-center justify-center gap-2 transition-colors disabled:opacity-50 mt-auto"><Banknote size={16}/> Settle Pay</button>
                      )}
                      {o.paymentStatus === "PENDING" && o.orderStatus !== "CANCELLED" && (
                          // 🔥 GOD MODE AUTHORIZATION: Pushes debt directly into customer khata ledger tables bypass structures safely 🔥
                          <button onClick={() => setUdhaarModal(o)} disabled={isProcessing} className="w-full bg-rose-50 hover:bg-rose-100 text-rose-600 border border-rose-200 py-4 px-6 rounded-2xl font-black text-[10px] uppercase tracking-widest flex items-center justify-center gap-2 transition-colors disabled:opacity-50"><BookOpen size={16}/> Move to Khata</button>
                      )}
                   </div>
                </div>
             );})}
          </div>
       </div>

       {/* FULL DETAILED MODALS LAYER ACTIONS SCHEMAS CONTAINER */}
       {cancelModal && (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-50 flex items-center justify-center p-4">
             <div className="w-full max-w-sm bg-white rounded-[2.5rem] p-8 shadow-2xl relative text-center border border-slate-100">
                <Trash2 size={48} className="text-rose-500 mx-auto mb-4" />
                <h3 className="text-2xl font-black text-slate-800 mb-2">Cancel Order?</h3>
                <p className="text-sm text-slate-500 font-medium mb-8">This will cancel Order #{cancelModal.id} and safely refund any paid amount/credit to Khata.</p>
                <div className="flex gap-3">
                   <button onClick={() => setCancelModal(null)} disabled={isProcessing} className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-600 p-4 rounded-2xl font-black text-xs uppercase tracking-widest transition-colors disabled:opacity-50">Wait</button>
                   <button onClick={() => handleAction(cancelModal, "CANCEL_ORDER")} disabled={isProcessing} className="flex-1 bg-rose-500 hover:bg-rose-600 text-white p-4 rounded-2xl font-black text-xs uppercase tracking-widest shadow-lg shadow-rose-500/30 transition-colors disabled:opacity-50">{isProcessing ? 'Processing...' : 'Yes, Cancel'}</button>
                </div>
             </div>
          </div>
       )}

       {khataPreview && (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-50 flex items-center justify-center p-4">
             <div className="w-full max-w-md bg-white rounded-[2.5rem] p-8 shadow-2xl relative border border-slate-100">
                <button onClick={() => setKhataPreview(null)} disabled={isProcessing} className="absolute top-6 right-6 p-2 bg-slate-100 rounded-full text-slate-400 hover:text-rose-500 transition-colors disabled:opacity-50"><X size={20}/></button>
                <h3 className="text-2xl font-black text-slate-800 mb-1">Khata Preview</h3>
                <p className="text-xs font-bold text-slate-500 mb-6 flex items-center gap-1"><User size={12}/> {khataPreview.name} ({khataPreview.phone})</p>
                <div className={`p-5 rounded-2xl mb-6 flex justify-between items-center shadow-inner ${khataPreview.dues < 0 ? 'bg-rose-50 border-2 border-rose-200 text-rose-600' : khataPreview.dues > 0 ? 'bg-emerald-50 border-2 border-emerald-200 text-emerald-600' : 'bg-white border-2 border-slate-200 text-slate-500'}`}>
                    <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">{khataPreview.dues < 0 ? 'To Pay (Udhaar)' : khataPreview.dues > 0 ? 'Store Credit' : 'Amount Due'}</span>
                    <span className={`text-2xl font-black ${khataPreview.dues < 0 ? 'text-rose-600' : khataPreview.dues > 0 ? 'text-emerald-600' : 'text-slate-800'}`}>₹{Math.abs(khataPreview.dues)}</span>
                </div>
                <h4 className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-3 ml-1">Recent Transactions</h4>
                <div className="space-y-3 max-h-60 overflow-y-auto pr-1">
                   {khataPreview.ledger && khataPreview.ledger.length > 0 ? (
                       khataPreview.ledger.map((l: any) => (
                          <div key={l.id} className="p-4 bg-slate-50 rounded-2xl border border-slate-100 flex justify-between items-center gap-4">
                             <div><p className="text-[11px] font-bold text-slate-700 leading-tight">{l.reason}</p><p className="text-[9px] text-slate-400 uppercase mt-1.5 font-bold">{new Date(l.createdAt).toLocaleDateString()} • {new Date(l.createdAt).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})}</p></div>
                             <span className={`font-black text-sm whitespace-nowrap ${l.amount < 0 ? 'text-rose-500' : 'text-emerald-500'}`}>{l.amount < 0 ? '' : '+'}₹{Math.abs(l.amount)}</span>
                          </div>
                       ))
                   ) : (<div className="p-4 text-center text-xs font-bold text-slate-400 bg-slate-50 rounded-2xl border border-slate-100 border-dashed">No transactions yet.</div>)}
                </div>
             </div>
          </div>
       )}

       {reviseModal && (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-50 flex items-center justify-center p-4">
             <div className="w-full max-w-lg bg-white rounded-[2.5rem] p-8 shadow-2xl relative text-left border border-slate-100">
                <button onClick={() => setReviseModal(null)} disabled={isProcessing} className="absolute top-6 right-6 p-2 bg-slate-100 rounded-full text-slate-400 hover:text-rose-500 transition-colors disabled:opacity-50"><X size={20}/></button>
                <div className="flex items-center gap-3 mb-6">
                    {reviseModal.orderStatus === 'FULFILLED' ? <RotateCcw size={28} className="text-blue-500" /> : <Edit size={28} className="text-blue-500" />}
                    <h3 className="text-2xl font-black text-slate-800">{reviseModal.orderStatus === 'FULFILLED' ? 'Return / Revise Items' : 'Revise Order'}</h3>
                </div>
                <div className="relative mb-6">
                    <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input type="text" disabled={isProcessing} placeholder="Search product to add..." value={productSearch} onChange={e => setProductSearch(e.target.value)} className="w-full bg-slate-50 border border-slate-200 text-sm font-bold text-slate-800 p-3 pl-11 rounded-xl outline-none focus:border-blue-400 disabled:opacity-50" />
                    {productSearch && (
                        <div className="absolute top-full left-0 right-0 mt-2 bg-white border border-slate-200 rounded-xl shadow-xl max-h-48 overflow-y-auto z-10">
                            {products.filter(p => p.name.toLowerCase().includes(productSearch.toLowerCase())).map(p => (
                                <div key={p.id} onClick={() => addNewProduct(p)} className="p-3 hover:bg-blue-50 border-b border-slate-100 cursor-pointer flex justify-between items-center text-sm font-bold"><span className="text-slate-700">{p.name}</span><span className="text-emerald-500">₹{p.sellingPrice} <Plus size={14} className="inline ml-2 text-blue-500"/></span></div>
                            ))}
                        </div>
                    )}
                </div>
                <div className="space-y-3 mb-6 max-h-60 overflow-y-auto pr-2">
                    {reviseItems.length === 0 && <p className="text-xs text-center text-rose-500 font-bold p-4 bg-rose-50 rounded-xl">Order empty. This will process as a complete return/cancellation.</p>}
                    {reviseItems.map((item, idx) => (
                        <div key={idx} className="flex justify-between items-center bg-slate-50 p-4 rounded-2xl border border-slate-100 shadow-inner">
                            <div className="flex-1 pr-2"><p className="text-xs font-bold text-slate-800 leading-tight">{item.customName}</p><p className="text-[10px] text-emerald-500 font-black mt-1">₹{item.sellingPrice}</p></div>
                            <div className="flex items-center gap-3 bg-white border border-slate-200 rounded-xl p-1 shadow-sm"><button onClick={() => handleReviseQty(idx, -1)} disabled={isProcessing} className="text-slate-400 hover:text-rose-500 p-1 disabled:opacity-50"><Minus size={14}/></button><span className="font-black text-slate-800 text-xs w-4 text-center">{item.quantity}</span><button onClick={() => handleReviseQty(idx, 1)} disabled={isProcessing} className="text-emerald-500 p-1 disabled:opacity-50"><Plus size={14}/></button></div>
                        </div>
                    ))}
                </div>
                <div className="flex justify-between items-center pt-6 border-t border-slate-100 mb-6">
                    <span className="text-xs font-black uppercase tracking-widest text-slate-400">New Bill Total</span>
                    <span className="text-3xl font-black text-blue-600">₹{revisedTotal}</span>
                </div>
                <button disabled={!hasChanges || isProcessing} onClick={() => handleAction(reviseModal, "REVISE_ORDER", undefined, reviseItems)} className="w-full bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-white p-5 rounded-2xl font-black text-xs uppercase tracking-widest shadow-lg shadow-blue-500/30 transition-all active:scale-95">{isProcessing ? 'Updating...' : hasChanges ? 'Confirm Updates' : 'No Changes Made'}</button>
             </div>
          </div>
       )}

       {dispatchModal && (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-50 flex items-center justify-center p-4">
             <div className="w-full max-w-sm bg-white rounded-[2.5rem] p-8 shadow-2xl relative text-center border border-slate-100">
                <Package size={48} className="text-slate-800 mx-auto mb-4" />
                <h3 className="text-2xl font-black text-slate-800 mb-2">Dispatch Order?</h3>
                <p className="text-sm text-slate-500 font-medium mb-8">Confirm that Order #{dispatchModal.id} is ready.</p>
                <div className="flex gap-3"><button onClick={() => setDispatchModal(null)} disabled={isProcessing} className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-600 p-4 rounded-2xl font-black text-xs uppercase tracking-widest transition-colors disabled:opacity-50">Cancel</button><button onClick={() => handleAction(dispatchModal, "MARK_FULFILLED")} disabled={isProcessing} className="flex-1 bg-slate-900 hover:bg-slate-800 text-white p-4 rounded-2xl font-black text-xs uppercase tracking-widest shadow-lg transition-colors disabled:opacity-50">{isProcessing ? 'Wait...' : 'Dispatch'}</button></div>
             </div>
          </div>
       )}

       {udhaarModal && (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-50 flex items-center justify-center p-4">
             <div className="w-full max-w-sm bg-white rounded-[2.5rem] p-8 shadow-2xl relative border border-slate-100 text-center">
                <AlertCircle size={48} className="text-amber-500 mx-auto mb-4" />
                <h3 className="text-2xl font-black text-slate-800 mb-2">Mark as Udhaar?</h3>
                <p className="text-sm text-slate-500 font-medium mb-8">This will add <span className="font-black text-amber-500">₹{udhaarModal.totalAmount}</span> to Khata.</p>
                <div className="flex gap-3"><button onClick={() => setUdhaarModal(null)} disabled={isProcessing} className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-600 p-4 rounded-2xl font-black text-xs uppercase tracking-widest transition-colors disabled:opacity-50">Cancel</button><button onClick={() => handleAction(udhaarModal, "MARK_DUES")} disabled={isProcessing} className="flex-1 bg-amber-500 hover:bg-amber-600 text-white p-4 rounded-2xl font-black text-xs uppercase tracking-widest shadow-lg shadow-amber-500/30 transition-colors disabled:opacity-50">{isProcessing ? 'Wait...' : 'Confirm'}</button></div>
             </div>
          </div>
       )}

       {settleModal && (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-50 flex items-center justify-center p-4">
             <div className="w-full max-w-md bg-white rounded-[2.5rem] p-8 shadow-2xl relative border border-slate-100">
                <button onClick={() => setSettleModal(null)} disabled={isProcessing} className="absolute top-6 right-6 p-2 bg-slate-100 rounded-full text-slate-400 hover:text-rose-500 transition-colors disabled:opacity-50"><X size={20}/></button>
                <h3 className="text-2xl font-black text-slate-800 mb-6">Settle Payment</h3>
                <div className="bg-slate-50 p-5 rounded-2xl mb-6 flex justify-between items-center border border-slate-200 shadow-inner">
                    <span className="text-sm font-bold text-slate-500 uppercase tracking-widest">Total Bill</span>
                    <span className="text-3xl font-black text-slate-800">₹{billAmount}</span>
                </div>
                <div className="mb-6">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2 mb-2 block">Amount Received (Cash / UPI)</label>
                    <div className="flex items-center bg-white border-2 border-emerald-500 rounded-2xl overflow-hidden shadow-[0_0_15px_rgba(16,185,129,0.2)] transition-all">
                        <div className="px-6 py-4 text-xl font-black text-emerald-500 bg-emerald-50 border-r border-emerald-200">₹</div>
                        <input type="number" min="0" value={amountReceived} disabled={isProcessing} onChange={e => setAmountReceived(e.target.value)} className="w-full p-4 text-2xl font-black text-slate-800 outline-none disabled:opacity-50" />
                    </div>
                </div>
                <div className="mb-8 p-5 rounded-2xl bg-slate-50 border border-slate-100 text-sm font-bold shadow-inner">
                    {diff === 0 && <p className="text-slate-600 flex items-center gap-3"><CheckCircle2 size={18} className="text-emerald-500"/> Exact amount.</p>}
                    {diff < 0 && <p className="text-rose-500 flex items-center gap-3"><AlertCircle size={14}/> Shortfall of ₹{Math.abs(diff)} goes to Udhaar.</p>}
                    {diff > 0 && <p className="text-emerald-600 flex items-center gap-3"><Sparkles size={18}/> Excess of ₹{diff} goes to Credit.</p>}
                </div>
                <button onClick={() => handleAction(settleModal, "SETTLE_PAYMENT", receivedAmount)} disabled={isProcessing} className="w-full bg-emerald-500 hover:bg-emerald-600 text-white p-6 rounded-[1.5rem] font-black text-sm uppercase tracking-widest shadow-xl shadow-emerald-500/30 transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed">{isProcessing ? 'Processing...' : 'Confirm Settlement'}</button>
             </div>
          </div>
       )}
    </div>
  );
}
