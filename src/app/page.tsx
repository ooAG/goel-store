"use client";
import { useEffect, useState, useRef } from "react";
import { ProductCard, StickyCart } from "@/components/StoreComponents";
import { useCart } from "@/store/useCart";
import { ShoppingBag, Search, ChevronLeft, User, Phone, LogOut, MapPin, Banknote, BookOpen, Sparkles, Pencil, CreditCard, RefreshCw, AlertCircle, ArrowRight, Download, ShoppingCart, CheckCircle2, FileText, Hash, ChevronDown, X, Plus, Minus, Bike, Clock } from "lucide-react";
import toast, { Toaster } from "react-hot-toast";
import { motion, AnimatePresence } from "framer-motion";

const spring = { type: "spring", stiffness: 400, damping: 30 } as const;

const runWithHapticPulse = (callback: () => void) => {
  if (typeof navigator !== "undefined" && navigator.vibrate) {
    navigator.vibrate(40);
  }
  callback();
};

export default function Storefront() {
  const [products, setProducts] = useState<any[]>([]);
  const [phone, setPhone] = useState("");
  const [isPhoneVerified, setIsPhoneVerified] = useState(false);
  const [customerInfo, setCustomerInfo] = useState<any>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [showProfile, setShowProfile] = useState(false);
  const [isCheckingOut, setIsCheckingOut] = useState(false);
  
  const [checkoutForm, setCheckoutForm] = useState({ name: "", address: "", paymentMode: "" });
  const [isEditingAddress, setIsEditingAddress] = useState(false); 
  const [isEditingProfile, setIsEditingProfile] = useState(false); 
  const [isSavingProfile, setIsSavingProfile] = useState(false); // ANTI-SPAM SAVING STATE

  const [successScreen, setSuccessScreen] = useState<any>({ show: false, orderId: "", total: 0, orderItems: [], assignedQr: "", type: "CASH", waPrefix: "", debt: 0, creditUsed: 0 });
  
  const [creditErrorData, setCreditErrorData] = useState({ show: false, message: "", dues: 0, customerId: "" });
  const [addedItemsState, setAddedItemsState] = useState<Record<string, boolean>>({});
  const [isConfirmingPhone, setIsConfirmingPhone] = useState(false);

  const [upiStatus, setUpiStatus] = useState<"PENDING" | "FAILED">("PENDING");
  const [upiPayAmount, setUpiPayAmount] = useState<number | string>("");
  const [paymentConfig, setPaymentConfig] = useState<any>(null);
  const [expandedOrder, setExpandedOrder] = useState<string | null>(null);
  const [activeTrackingOrderModal, setActiveTrackingOrderModal] = useState<any>(null);

  const [currentTime, setCurrentTime] = useState(Date.now());

  const [hasClickedUpiUri, setHasClickedUpiUri] = useState(false);
  const [isEditingAmount, setIsEditingAmount] = useState(false);
  const [qrCountdown, setQrCountdown] = useState(5);
  const countdownIntervalRef = useRef<NodeJS.Timeout | null>(null);

  const [showInstallBanner, setShowInstallBanner] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);

  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const successScreenRef = useRef<any>(successScreen);
  const { items, clearCart, addItem, removeItem } = useCart() as any;

  useEffect(() => {
    successScreenRef.current = successScreen;
  }, [successScreen]);

  function resetFilters() {
     setSelectedCategory(null);
     setSearchQuery("");
     if (typeof window !== "undefined") {
       window.scrollTo({ top: 0, behavior: "smooth" });
     }
  }

  useEffect(() => {
     if (!showProfile && !isCartOpen) {
        setIsConfirmingPhone(false);
     }
  }, [showProfile, isCartOpen]);

  useEffect(() => {
      const clockInterval = setInterval(() => setCurrentTime(Date.now()), 10000);
      return () => clearInterval(clockInterval);
  }, []);

  function loadProducts() {
    fetch(`/api/products?t=${Date.now()}`)
      .then(res => res.json())
      .then(data => setProducts(data || []))
      .catch(() => {});
  }

  function forceBackgroundDataRefresh() {
    loadProducts();
    if (phone && isPhoneVerified) {
       fetch(`/api/customers/by-phone?phone=${phone}&t=${Date.now()}`)
         .then(res => res.json())
         .then(data => {
            if (data) {
               setCustomerInfo(data);
               setCheckoutForm(prev => ({ ...prev, name: data.name || "", address: data.address || "" }));
            }
         }).catch(() => {});
    }
  }

  function handleLogin() {
    if (phone.length !== 10) return toast.error("Please sahi 10-digit mobile number likhein! 📱");
    setIsConfirmingPhone(true);
  }

  function lookupCustomerPhone() {
    const tId = toast.loading("Aapka mobile number verify ho raha hai... 📱");
    fetch(`/api/customers/by-phone?phone=${phone}&t=${Date.now()}`)
      .then(res => { if (res.ok) return res.json(); throw new Error(); })
      .then(custData => {
         setCustomerInfo(custData);
         setCheckoutForm({ name: custData?.name || "", address: custData?.address || "", paymentMode: "" });
         setIsPhoneVerified(true);
         setIsEditingAddress(false);
         localStorage.setItem("cachedCustomerPhone", phone);
         toast.success(`Welcome back, ${custData.name || 'Customer'}! Aapka swagat hai. ✨`, { id: tId });
         setShowProfile(false);
         setIsCartOpen(false);
      })
      .catch(() => {
         setCustomerInfo(null);
         setCheckoutForm({ name: "", address: "", paymentMode: "" });
         setIsPhoneVerified(true);
         setIsEditingAddress(true);
         toast.error("Mobile number verification match nahi ho paya! ❌", { id: tId });
      });
  }

  function triggerPwaInstall() {
      if (!deferredPrompt) return;
      deferredPrompt.prompt();
      deferredPrompt.userChoice.then(({ outcome }: any) => {
         if (outcome === "accepted") setShowInstallBanner(false);
      });
      setDeferredPrompt(null);
  }

  function triggerWhatsApp(explicitDataBlock: any, statusPrefix = "", customPaid?: number) {
    const orderId = explicitDataBlock.orderId;
    const itemsOrdered = explicitDataBlock.orderItems || [];
    const totalBill = explicitDataBlock.total;
    const payMode = explicitDataBlock.type;
    const finalPaidAmountValue = customPaid !== undefined ? customPaid : (explicitDataBlock.finalPayAmount !== undefined ? explicitDataBlock.finalPayAmount : totalBill);

    let modeLabel = "_Cash on Delivery / COD_";
    if (payMode === "UPI" || payMode === "UPI_PAID") {
      if (explicitDataBlock.assignedQr && explicitDataBlock.assignedQr !== "CASH") {
         const cleanQr = explicitDataBlock.assignedQr.split(" | VPA_CLAIMED:")[0].trim();
         modeLabel = `*UPI (${cleanQr})*`;
      } else {
         const dynamicUpiFallback = paymentConfig?.upiAccounts?.[0];
         modeLabel = dynamicUpiFallback ? `*UPI (${dynamicUpiFallback.name} - ${dynamicUpiFallback.vpa})*` : "*UPI Online App*";
      }
    } else if (payMode === "STORE_CREDIT") modeLabel = "*Store Credit Adjustment*";
    else if (payMode === "UDHAAR") modeLabel = "*Khata (Udhaar Mode)*";

    let msg = `*=== ORDER INVOICE ===*\n`;
    msg += `👋 *Hello, maine aapke Store se order kiya hai!*\n\n`;
    if (statusPrefix) msg += `${statusPrefix}\n\n`;
    
    msg += `🆔 *Order ID:* #${orderId}\n`;
    msg += `👤 *Name:* *${checkoutForm.name}*\n`;
    msg += `📍 *Delivery Address:* _${checkoutForm.address}_\n\n`;
    
    msg += `📦 *Items List:*\n`;
    itemsOrdered.forEach((i: any) => { msg += `▪️ _${i.name}_ *(x${i.quantity})* - *₹${i.sellingPrice * i.quantity}*\n`; });
    
    msg += `\n-------------------------\n`;
    if (explicitDataBlock.debt > 0) msg += `📒 *Old Dues Added:* +₹${explicitDataBlock.debt}\n`;
    if (explicitDataBlock.creditUsed > 0) msg += `🎁 *Credit Used:* -₹${explicitDataBlock.creditUsed}\n`;
    msg += `✨ *Total Bill:* *₹${totalBill}*\n`;
    msg += `💳 *Payment Method:* ${modeLabel}\n`;

    if (payMode !== "CASH" && payMode !== "COD_SWITCHED") {
       msg += `💵 *Amount Sent:* *₹${finalPaidAmountValue}*\n`;
       const currentCartItemsTotal = itemsOrdered.reduce((sum: number, i: any) => sum + (i.sellingPrice * i.quantity), 0);
       const netPaidTowardsDues = Number(finalPaidAmountValue) - currentCartItemsTotal;
       
       if (netPaidTowardsDues > 0) {
          msg += `📉 *Khata Dues Reduced by:* -₹${netPaidTowardsDues}\n`;
       } else if (netPaidTowardsDues < 0) {
          msg += `📒 *New Dues Added to Khata:* +₹${Math.abs(netPaidTowardsDues)}\n`;
       }
    }
    msg += `-------------------------\n`;
    msg += `\n🙏 _Kindly order deliver kar dijiye aur mera khata update kar dijiye. Thank you!_`;

    setSuccessScreen({ show: false, orderId: "", total: 0, orderItems: [], assignedQr: "", type: "CASH", waPrefix: "", debt: 0, creditUsed: 0 }); 
    forceBackgroundDataRefresh();
    setShowProfile(true);

    window.location.href = `whatsapp://send?phone=${paymentConfig?.whatsappNumber || "917838036086"}&text=${encodeURIComponent(msg)}`;
  }

  function saveUpdatedAddressDetails() {
      if (isSavingProfile) return; // Prevent spam clicks
      if (!checkoutForm.name?.trim() || checkoutForm.name.trim().length < 3) { toast.error("Please apna naam sahi se likhein (Kam se kam 3 letters)!"); return; }
      if (!checkoutForm.address?.trim() || checkoutForm.address.trim().length < 5) { toast.error("Please delivery address complete bharein!"); return; }
      
      setIsSavingProfile(true);
      const tId = toast.loading("Profile details save ho rahi hain... 💾");
      
      fetch("/api/customers/update-profile", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ phone, name: checkoutForm.name.trim(), address: checkoutForm.address.trim() }) })
        .then(res => {
           setIsSavingProfile(false);
           if (res.ok) {
              setIsEditingAddress(false);
              setIsEditingProfile(false); // FIXED: Auto hide profile edit mode
              toast.success("Profile settings successfully save ho gayi! ✅", { id: tId });
              fetch(`/api/customers/by-phone?phone=${phone}&t=${Date.now()}`).then(r => r.json()).then(setCustomerInfo);
           } else toast.error("Profile update karne me dikkat aayi, please fir se try karein!", { id: tId });
        }).catch(() => {
           setIsSavingProfile(false);
           toast.error("Server synchronization mismatch runtime gate error.", { id: tId });
        });
  }

  function submitOrder() {
    if (items.length === 0) { toast.error("Aapki cart khali hai, pehle kuch items jodh lijiye! 🛒"); return; }
    if (!isPhoneVerified) { toast.error("Order karne ke liye mobile number verify karna zaroori hai! 📱"); return; }
    if (!checkoutForm.name?.trim() || checkoutForm.name.trim().length < 3) { setIsEditingAddress(true); toast.error("Please apna naam sahi se likhein!"); return; }
    if (!checkoutForm.address?.trim() || checkoutForm.address.trim().length < 5) { setIsEditingAddress(true); toast.error("Please complete delivery address bharein!"); return; }
    
    const resolvedMode = effectiveTotal === 0 ? "STORE_CREDIT" : checkoutForm.paymentMode;
    if (effectiveTotal > 0 && !checkoutForm.paymentMode) { toast.error("Please payment ke liye koi ek option select karein! 💳"); return; }
    
    setIsCheckingOut(true);
    const tId = toast.loading("Aapka order joda ja raha hai... ⏳");
    
    let upiInfo = "CASH";
    if (resolvedMode === "UPI") {
       if (paymentConfig?.upiAccounts && paymentConfig.upiAccounts.length > 0) {
          const randomIndex = Math.floor(Math.random() * paymentConfig.upiAccounts.length);
          const acc = paymentConfig.upiAccounts[randomIndex];
          upiInfo = `${acc.name} (${acc.vpa})`;
       } else {
          const emergencyFallbackNodes = [
             { name: "Adarsh Goel", vpa: "mny@ptyes" },
             { name: "Paril Goel", vpa: "paril@ptyes" },
             { name: "Mamta Goel", vpa: "pyme@slc" }
          ];
          const localRandomIndex = Math.floor(Math.random() * emergencyFallbackNodes.length);
          const pickedFallback = emergencyFallbackNodes[localRandomIndex];
          upiInfo = `${pickedFallback.name} (${pickedFallback.vpa})`;
       }
    }

    fetch("/api/orders", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ phone, name: checkoutForm.name.trim(), address: checkoutForm.address.trim(), items, paymentMode: resolvedMode, assignedQr: upiInfo, clientCartTotal: cartTotal, clientDues: customerInfo?.dues || 0 }) })
      .then(async res => {
         const resData = await res.json();
         if (res.ok) return resData;
         throw new Error(resData.error || "Order complete karne me dikkat aayi.");
      })
      .then(resData => {
         if (resolvedMode !== "UPI") { try { new Audio("/sounds/ching.wav").play(); } catch(e) {} }
         toast.success("Order successfully ho gaya! Verification complete... 🎉", { id: tId });
         setUpiStatus("PENDING");
         if (resolvedMode === "UPI") setUpiPayAmount(effectiveTotal);
         
         const payloadState = { show: true, orderId: resData.id, total: effectiveTotal, orderItems: [...items], assignedQr: upiInfo, type: resolvedMode, waPrefix: "", debt: debt, creditUsed: Math.min(cartTotal, storeCredit) };
         setSuccessScreen(payloadState);
         clearCart(); setIsCartOpen(false);
      })
      .catch((err) => {
         toast.dismiss(tId);
         if (err.message.includes("limit exceeded") || err.message.includes("Udhaar limit")) {
            const pristineSanitizedErrorString = err.message.replace(/-/g, "");
            setCreditErrorData({
               show: true,
               message: pristineSanitizedErrorString,
               dues: Math.abs(customerInfo?.dues || 0),
               customerId: customerInfo?.customId || "N/A"
            });
         } else {
            toast.error(err.message, { duration: 5000 });
         }
      }).finally(() => setIsCheckingOut(false));
  }

  function handleCarouselCardAdd(item: any) {
     const isInCart = items.some((it: any) => String(it.id) === String(item.id));
     if (isInCart) {
        removeItem(item.id);
        toast.success(`${item.name} cart se hata diya gaya! 🤝`);
     } else {
        for (let k = 0; k < item.lastQuantity; k++) { addItem(item); }
        toast.success(`${item.name} (x${item.lastQuantity}) cart me jodh diya! 🛒`);
     }
  }

  function handleUpiPaid() {
     const amt = Number(upiPayAmount) || Number(successScreen.total);
     const cleanBaseQr = successScreen.assignedQr.split(" | VPA_CLAIMED:")[0];
     const patchedQrMeta = `${cleanBaseQr} | VPA_CLAIMED:${amt}`;
     fetch("/api/orders", { method: "PATCH", body: JSON.stringify({ id: successScreen.orderId, action: "CHANGE_QR", assignedQr: patchedQrMeta }) })
       .then(() => {
          try { new Audio("/sounds/ching.wav").play(); } catch(e) {}
          const explicitUpiState = { ...successScreen, assignedQr: patchedQrMeta, type: "UPI_PAID", finalPayAmount: amt, waPrefix: "" };
          setSuccessScreen(explicitUpiState);
          setTimeout(() => triggerWhatsApp(explicitUpiState, "", amt), 1500);
       });
  }
  
  function convertToCod() {
    fetch("/api/orders", { method: "PATCH", body: JSON.stringify({ id: successScreen.orderId, action: "CONVERT_TO_COD" }) })
      .then(() => {
         try { new Audio("/sounds/ching.wav").play(); } catch(e) {}
         const explicitCodState = { ...successScreen, type: "COD_SWITCHED", waPrefix: "💵 *SWITCHED TO CASH ON DELIVERY*" };
         setSuccessScreen(explicitCodState);
         setTimeout(() => triggerWhatsApp(explicitCodState, "💵 *SWITCHED TO CASH ON DELIVERY*"), 1500);
      });
  }

  function cancelOrder() {
    const tId = toast.loading("Order cancel ho raha hai... ❌");
    fetch("/api/orders", { method: "PATCH", body: JSON.stringify({ id: successScreen.orderId, action: "CANCEL_ORDER" }) })
      .then(() => {
         toast.success("Order cancel kar diya gaya.", { id: tId });
         setSuccessScreen({ show: false, orderId: "", total: 0, orderItems: [], assignedQr: "", type: "CANCELLED", waPrefix: "" });
         loadProducts(); setShowProfile(true);
      });
  }

  function tryAnotherUpi() {
     if (paymentConfig?.upiAccounts?.length > 1) {
        const currentVpa = successScreen.assignedQr.split("(")[1]?.split(")")[0]?.trim();
        const available = paymentConfig.upiAccounts.filter((acc: any) => acc.vpa !== currentVpa);
        if (available.length > 0) {
           const newAcc = available[Math.floor(Math.random() * available.length)];
           const currentPayClaim = Number(upiPayAmount) || successScreen.total;
           let newQr = `${newAcc.name} (${newAcc.vpa}) | VPA_CLAIMED:${currentPayClaim}`;
           setSuccessScreen((prev: any) => ({ ...prev, assignedQr: newQr })); setUpiStatus("PENDING"); setHasClickedUpiUri(false); setQrCountdown(5);
           fetch("/api/orders", { method: "PATCH", body: JSON.stringify({ id: successScreen.orderId, action: "CHANGE_QR", assignedQr: newQr }) });
        }
     } else toast.error("Koi doosra payment address available nahi mila.");
  }

  function reorderPastOrder(pastOrderBlock: any) {
     let addedCount = 0;
     pastOrderBlock.items?.forEach((i: any) => {
        const targetId = i.productId || i.id;
        const liveMatch = products.find(p => p.id === targetId);
        if (liveMatch) {
           for (let k = 0; k < (i.quantity || 1); k++) { addItem(liveMatch); }
           addedCount++;
        }
     });
     if (addedCount > 0) {
        toast.success("Purane items current cart me append ho gaye hain! 🛒");
        setShowProfile(false);
        setIsCartOpen(true);
     } else {
        toast.error("Is order ke items abhi dukan me available nahi hain.");
     }
  }

  const cartTotal = items.reduce((sum: number, item: any) => {
     const match = products.find(p => p.id === item.id);
     return sum + ((match ? match.sellingPrice : item.sellingPrice) * item.quantity);
  }, 0);

  const storeCredit = customerInfo?.dues > 0 ? Number(customerInfo.dues) : 0;
  const inProgressLiveOrder = customerInfo?.orders?.find((o: any) => o.orderStatus === "NEW");
  const hasPendingVerificationOrder = customerInfo?.orders?.some((o: any) => o.orderStatus !== "CANCELLED" && o.paymentStatus === "PENDING");
  const debt = (customerInfo?.dues < 0 && !hasPendingVerificationOrder) ? Math.abs(Number(customerInfo.dues)) : 0;
  const effectiveTotal = Math.max(0, cartTotal - storeCredit) + debt;

  const netTotalSavingsAmount = items.reduce((accum: number, it: any) => {
     const match = products.find(p => p.id === it.id);
     const cleanMrp = match ? (match.mrp || match.sellingPrice) : (it.mrp || it.sellingPrice);
     const cleanSp = match ? match.sellingPrice : it.sellingPrice;
     return accum + (Math.max(0, cleanMrp - cleanSp) * it.quantity);
  }, 0);

  const isUpiValid = Number(upiPayAmount) > 0;
  let upiLink = "";
  if (successScreen.show && successScreen.assignedQr && isUpiValid) {
      const cleanQr = successScreen.assignedQr.split(" | VPA_CLAIMED:")[0].trim();
      const upiName = cleanQr.split("(")[0].trim();
      const upiVpa = cleanQr.split("(")[1]?.split(")")[0]?.trim();
      upiLink = `upi://pay?pa=${upiVpa || "mny@ptyes"}&pn=${encodeURIComponent(upiName || "Adarsh Goel")}&am=${upiPayAmount}&tn=${encodeURIComponent("Order " + successScreen.orderId)}&cu=INR`;
  }

  const hasSavedDetails = checkoutForm.name && checkoutForm.address;
  const userAllowedLimitAmount = Number(customerInfo?.creditLimit || 0);
  const isUdhaarEligible = customerInfo && customerInfo.creditEnabled === true && ((cartTotal + debt) <= userAllowedLimitAmount);

  let trackerMessage = "";
  let isOverdue = false;
  if (inProgressLiveOrder) {
     const orderTimeRawMs = new Date(inProgressLiveOrder.createdAt).getTime();
     const expectedTimeMs = orderTimeRawMs + 30 * 60000;
     if (currentTime > expectedTimeMs) {
        trackerMessage = "Order is on the way 🛵";
        isOverdue = true;
     } else {
        const expectedTimeString = new Date(expectedTimeMs).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
        trackerMessage = `Delivery expected by ${expectedTimeString}`;
     }
  }

  const pastOrderedItemsList = (() => {
     if (!customerInfo?.orders) return [];
     const map = new Map();
     customerInfo.orders.forEach((o: any) => {
        if (o.orderStatus === "CANCELLED") return;
        o.items?.forEach((i: any) => {
           const targetId = i.productId || i.id;
           if (!targetId) return;
           const liveMatch = products.find(p => p.id === targetId);
           if (!map.has(targetId)) {
              map.set(targetId, {
                 id: targetId,
                 name: liveMatch?.name || i.customName || "Product Record",
                 image: liveMatch?.image || i.image || "",
                 sellingPrice: liveMatch?.sellingPrice || i.sellingPrice || 0,
                 mrp: liveMatch?.mrp || i.mrp || liveMatch?.sellingPrice || i.sellingPrice,
                 unit: liveMatch?.unit || i.unit || "1 pc",
                 lastQuantity: i.quantity || 1
              });
           }
        });
     });
     return Array.from(map.values());
  })();

  useEffect(() => {
     if (isCartOpen && phone && isPhoneVerified) {
        fetch(`/api/customers/by-phone?phone=${phone}&t=${Date.now()}`)
          .then(res => res.json())
          .then(data => {
             if (data) {
                setCustomerInfo(data);
                setCheckoutForm(prev => ({ ...prev, name: data.name || "", address: data.address || "" }));
             }
          }).catch(() => {});
     }
  }, [isCartOpen, phone, isPhoneVerified, cartTotal]);

  useEffect(() => {
    if (successScreen.show && successScreen.type === "UPI") {
        const amt = Number(successScreen.total) || 0;
        setUpiPayAmount(amt); setHasClickedUpiUri(false); setIsEditingAmount(false); setQrCountdown(5);
        if (countdownIntervalRef.current) clearInterval(countdownIntervalRef.current);
        countdownIntervalRef.current = setInterval(() => {
            setQrCountdown((prev) => { if (prev <= 1) { clearInterval(countdownIntervalRef.current!); return 0; } return prev - 1; });
        }, 1000);
    } else if (successScreen.show && successScreen.type !== "CANCELLED" && successScreen.type !== "UPI_PAID" && successScreen.type !== "COD_SWITCHED") {
        if (timerRef.current) clearTimeout(timerRef.current);
        const autoSnap = { ...successScreen };
        timerRef.current = setTimeout(() => triggerWhatsApp(autoSnap, successScreen.waPrefix), 4500);
    }
    return () => { if (timerRef.current) clearTimeout(timerRef.current); };
  }, [successScreen.show, successScreen.type]);

  useEffect(() => {
    loadProducts();
    const savedPhone = localStorage.getItem("cachedCustomerPhone");
    if (savedPhone && savedPhone.length === 10) {
        setPhone(savedPhone); setIsPhoneVerified(true);
        fetch(`/api/customers/by-phone?phone=${savedPhone}&t=${Date.now()}`)
          .then(res => { if (res.ok) return res.json(); throw new Error(); })
          .then(data => {
             if (data) {
                setCustomerInfo(data);
                setCheckoutForm({ name: data.name || "", address: data.address || "", paymentMode: "" });
             }
          }).catch(() => {});
    }
    const promptHandler = (e: any) => { e.preventDefault(); setDeferredPrompt(e); setShowInstallBanner(true); };
    window.addEventListener("beforeinstallprompt", promptHandler);
    return () => window.removeEventListener("beforeinstallprompt", promptHandler);
  }, []);

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 antialiased selection:bg-emerald-500/20">
      <Toaster position="bottom-center" />
      
      {/* 🔥 FIX: Increased bottom padding (pb-44) so that the Live Tracking Banner doesn't overlap the last products */}
      <div className="w-full max-w-2xl mx-auto min-h-screen relative pb-44 bg-white border-x border-slate-200/60 shadow-xl">
        
        <div className="w-full bg-slate-900 text-yellow-400 py-2.5 px-4 flex justify-center border-b border-slate-800 select-none">
          <span className="text-[11px] font-black tracking-widest uppercase font-mono shadow-sm animate-pulse text-center" style={{ textShadow: "0 0 10px rgba(250, 204, 21, 0.8)" }}>
             ⚡ Delivery on all 7 days • 1pm to 10 pm ⚡
          </span>
        </div>

        <header className="sticky top-0 z-40 px-5 py-3.5 flex justify-between items-center bg-white/95 backdrop-blur-md border-b border-slate-100 shadow-sm">
          <div onClick={() => runWithHapticPulse(resetFilters)} className="flex items-center gap-2 cursor-pointer group select-none">
             <div className="w-9 h-9 p-1.5 bg-yellow-400 rounded-xl shadow-sm flex items-center justify-center transition-transform group-hover:scale-105">
                <ShoppingCart size={18} className="text-black font-black" />
             </div>
             <h1 className="text-xl font-black tracking-tight text-slate-900 leading-none mt-0.5">
                GOEL STORE
             </h1>
          </div>
          
          <div className="flex items-center gap-2">
             {isPhoneVerified && customerInfo?.name ? (
                <div onClick={() => runWithHapticPulse(() => { setShowProfile(true); })} className="cursor-pointer flex items-center gap-1.5 bg-slate-50 border border-slate-200/80 px-3.5 py-2 rounded-xl hover:bg-slate-100 transition-all shadow-sm">
                    <User size={14} className="text-slate-600" />
                    <span className="text-xs font-black capitalize text-slate-800 max-w-[100px] truncate">{customerInfo.name}</span>
                </div>
             ) : (
                <button onClick={() => runWithHapticPulse(() => { setShowProfile(true); })} className="cursor-pointer text-xs font-black text-black bg-yellow-400 border border-yellow-400 px-4 py-2 rounded-xl uppercase tracking-wider transition-colors shadow-sm active:scale-95">Login</button>
             )}
          </div>
        </header>

        <AnimatePresence>
            {showInstallBanner && (
               <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} className="mx-4 mt-4 bg-slate-900 text-white p-4 rounded-2xl flex items-center justify-between shadow-lg border border-slate-800 relative z-50">
                   <div className="flex items-center gap-3">
                      <Download size={18} className="text-amber-400 shrink-0 animate-bounce" />
                      <div>
                         <p className="text-xs font-black uppercase tracking-wider text-amber-400">Goel Store App Install karein</p>
                         <p className="text-[10px] text-slate-400 font-bold mt-0.5">Ek click me home screen se direct order karne ke liye.</p>
                      </div>
                   </div>
                   <div className="flex items-center gap-2">
                      <button onClick={() => runWithHapticPulse(triggerPwaInstall)} className="bg-amber-400 text-black px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-wider shadow-sm transition-all active:scale-95">Add</button>
                      <button onClick={() => runWithHapticPulse(() => setShowInstallBanner(false))} className="text-slate-400 p-1 hover:text-white"><X size={16}/></button>
                   </div>
               </motion.div>
            )}
        </AnimatePresence>

        <div className="px-4 py-4 sticky top-[65px] bg-white z-30 border-b border-slate-100 shadow-sm">
          <div className="relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
              <input type="text" placeholder="Search 'atta', 'maggi', 'milk', 'biscuits'..." className="w-full bg-slate-50 border border-slate-200/80 p-4 pl-11 rounded-2xl font-bold text-sm outline-none focus:bg-white focus:border-green-500 focus:ring-4 focus:ring-green-500/5 transition-all text-slate-800 shadow-inner" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} />
          </div>
        </div>

        <main className="px-4 py-6">
          <AnimatePresence mode="wait">
            {searchQuery || selectedCategory ? (
                <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}>
                    <button onClick={() => runWithHapticPulse(resetFilters)} className="flex items-center gap-1.5 text-slate-600 font-black mb-6 text-xs bg-slate-100 border border-slate-200 px-4 py-2.5 rounded-full uppercase tracking-wider hover:bg-slate-200 transition-colors shadow-sm">
                       <ChevronLeft size={14}/> Back To Overview
                    </button>
                    <div className="grid grid-cols-2 gap-4">
                       {products.filter(p => searchQuery ? (p.name.toLowerCase().includes(searchQuery.toLowerCase())) : p.category === selectedCategory).map(p => <ProductCard key={p.id} product={p} />)}
                    </div>
                </motion.div>
            ) : (
                <div className="space-y-6">
                   
                   {isPhoneVerified && pastOrderedItemsList.length > 0 && (
                      <div className="mb-4 space-y-3 select-none">
                         <div className="flex justify-between items-center px-1">
                            <h2 className="text-xs font-black uppercase tracking-widest text-slate-400 flex items-center gap-1">🔄 Order Again</h2>
                            {pastOrderedItemsList.length > 4 && <span className="text-[10px] font-bold text-emerald-600 uppercase tracking-wide">Swipe Left →</span>}
                         </div>
                         <div className="flex gap-3 overflow-x-auto pb-3 pt-1 scrollbar-none snap-x snap-mandatory">
                            {pastOrderedItemsList.map((item: any) => {
                               const isInCart = items.some((it: any) => String(it.id) === String(item.id));
                               const currentCartQtyValue = items.find((it: any) => String(it.id) === String(item.id))?.quantity || 0;
                               return (
                               <motion.div key={item.id} whileTap={{ scale: 0.96 }} className="w-28 bg-slate-50 border border-slate-100/80 rounded-2xl p-2.5 shrink-0 flex flex-col justify-between snap-start relative shadow-sm hover:shadow-md transition-all">
                                  <div className="w-full aspect-square bg-white rounded-xl p-1 flex items-center justify-center overflow-hidden border border-slate-100 mb-1.5 shadow-inner">
                                     {item.image ? <img src={item.image} className="w-full h-full object-contain mix-blend-multiply" referrerPolicy="no-referrer" alt="" /> : <ShoppingBag size={14} className="text-slate-300" />}
                                  </div>
                                  <div className="min-w-0">
                                     <p className="text-[11px] font-black text-slate-800 truncate leading-tight capitalize">{item.name.toLowerCase()}</p>
                                     <p className="text-[9px] text-slate-400 font-bold tracking-wide mt-0.5">{item.unit || "1 unit"}</p>
                                  </div>
                                  <div className="flex items-center justify-between mt-2 pt-2 border-t border-slate-100/60 h-[30px]">
                                     <span className="text-[11px] font-black text-slate-900">₹{item.sellingPrice}</span>
                                     {isInCart ? (
                                        <div className="flex items-center gap-2 bg-green-600 text-white font-black px-2 py-1 rounded-xl shadow-sm border border-green-700 shrink-0 select-none text-[11px] h-[26px] whitespace-nowrap min-w-max">
                                           <button onClick={(e) => { e.stopPropagation(); runWithHapticPulse(() => removeItem(item.id)); }} className="text-white/90 hover:text-white px-0.5 font-black text-xs">-</button>
                                           <span className="font-black w-3 text-center text-white text-[10px]">{currentCartQtyValue}</span>
                                           <button onClick={(e) => { e.stopPropagation(); runWithHapticPulse(() => addItem(item)); }} className="text-white/90 hover:text-white px-0.5 font-black text-xs">+</button>
                                        </div>
                                     ) : (
                                        <button onClick={() => runWithHapticPulse(() => handleCarouselCardAdd(item))} className="p-1 px-2.5 bg-emerald-50 text-emerald-600 border border-emerald-100 hover:bg-emerald-600 hover:text-white rounded-xl text-[9px] font-black uppercase tracking-wider transition-all shadow-sm border whitespace-nowrap shrink-0 min-w-max h-[26px]">
                                           + Add ({item.lastQuantity})
                                        </button>
                                     )}
                                  </div>
                               </motion.div>
                            )})}
                            {pastOrderedItemsList.length > 4 && (
                               <div onClick={() => runWithHapticPulse(() => { setShowProfile(true); })} className="w-24 bg-gradient-to-br from-emerald-50 to-slate-50 border border-dashed border-emerald-200 rounded-2xl p-3 shrink-0 flex flex-col items-center justify-center cursor-pointer text-center select-none snap-start shadow-sm gap-1.5 group">
                                  <div className="w-8 h-8 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center transition-transform group-hover:scale-110 shadow-inner"><ArrowRight size={14} strokeWidth={3} /></div>
                                  <span className="text-[10px] font-black text-emerald-700 uppercase tracking-widest leading-none">View All</span>
                               </div>
                            )}
                         </div>
                      </div>
                   )}

                   <div className="px-1"><h2 className="text-sm font-black uppercase tracking-widest text-slate-400">Shop by Category</h2></div>
                   <div className="grid grid-cols-4 gap-x-3 gap-y-5">
                       {products.length > 0 && Array.from(new Set(products.map(p => p.category))).map((cat: any) => {
                           const associatedProductsPics = products.filter(p => p.category === cat && p.image).map(p => p.image);
                           const count = associatedProductsPics.length;
                           return (
                           <motion.div key={cat} whileTap={{ scale: 0.95 }} onClick={() => runWithHapticPulse(() => setSelectedCategory(cat))} className="flex flex-col items-center cursor-pointer select-none group text-center">
                               <div className="w-full aspect-square bg-slate-50 border border-slate-100 rounded-2xl sm:rounded-3xl flex items-center justify-center overflow-hidden relative transition-all group-hover:shadow-md group-hover:border-slate-200/60">
                                  {count >= 4 ? (
                                     <div className="grid grid-cols-2 grid-rows-2 w-full h-full gap-0.5 p-0.5 bg-slate-100">
                                        {associatedProductsPics.slice(0, 4).map((imgUrl, i) => (
                                           <div key={i} className="bg-white rounded-md overflow-hidden flex items-center justify-center p-0.5">
                                              <img src={imgUrl} className="w-full h-full object-contain mix-blend-multiply" referrerPolicy="no-referrer" alt=""/>
                                           </div>
                                        ))}
                                     </div>
                                  ) : count > 0 ? (
                                     <img src={associatedProductsPics[0]} referrerPolicy="no-referrer" className="w-[88%] h-[88%] object-contain mix-blend-multiply group-hover:scale-105 transition-transform duration-300" alt="" />
                                  ) : ( <div className="text-slate-400"><ShoppingBag size={22}/></div> )}
                               </div>
                               <h3 className="text-[11px] font-black text-slate-700 leading-tight mt-2 w-full truncate px-0.5 group-hover:text-black capitalize tracking-wide">{cat?.toLowerCase()}</h3>
                           </motion.div>
                       )})}
                   </div>
                </div>
            )}
          </AnimatePresence>
        </main>
      </div>

      <AnimatePresence>
         {isPhoneVerified && inProgressLiveOrder && !isCartOpen && !showProfile && (
            <motion.div initial={{ y: 80, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 80, opacity: 0 }} onClick={() => runWithHapticPulse(() => setActiveTrackingOrderModal(inProgressLiveOrder))} className="fixed bottom-24 inset-x-4 max-w-md mx-auto bg-white border border-slate-200 p-3 rounded-2xl flex items-center justify-between shadow-[0_8px_30px_rgb(0,0,0,0.12)] cursor-pointer z-40 select-none">
                <div className="flex items-center gap-3">
                   <div className="w-10 h-10 rounded-full bg-emerald-50 flex items-center justify-center border border-emerald-100 shrink-0 relative overflow-hidden">
                      <div className="w-full h-full bg-emerald-400 rounded-full animate-ping absolute opacity-20"></div>
                      <Clock size={18} className="text-emerald-600 relative z-10"/>
                   </div>
                   <div>
                      <p className="text-[12px] font-black text-slate-800">Aapka order pack ho raha hai 📦</p>
                      <p className={`text-[10px] font-black mt-0.5 ${isOverdue ? 'text-amber-500' : 'text-emerald-600'}`}>{trackerMessage}</p>
                   </div>
                </div>
                <div className="w-8 h-8 bg-slate-50 rounded-full flex items-center justify-center text-slate-400 border border-slate-100">
                   <ArrowRight size={14} />
                </div>
            </motion.div>
         )}
      </AnimatePresence>

      {!isCartOpen && !showProfile && !successScreen.show && (
         <StickyCart onCheckout={() => runWithHapticPulse(() => setIsCartOpen(true))} />
      )}

      <AnimatePresence>
         {activeTrackingOrderModal && (
            <>
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setActiveTrackingOrderModal(null)} className="fixed inset-0 bg-slate-900/60 z-[300] backdrop-blur-sm" />
                <motion.div initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }} transition={spring} className="fixed inset-x-0 bottom-0 w-full max-w-2xl mx-auto bg-white rounded-t-[2rem] z-[310] max-h-[90vh] flex flex-col overflow-hidden shadow-2xl border-t border-slate-200">
                    <div className="p-5 flex justify-between items-center bg-white border-b border-slate-100 shadow-sm">
                       <div className="flex items-center gap-2">
                          <Clock size={18} className="text-emerald-600" />
                          <h2 className="text-base font-black text-slate-900">Order #{activeTrackingOrderModal.id} Live Tracking</h2>
                       </div>
                       <button onClick={() => runWithHapticPulse(() => setActiveTrackingOrderModal(null))} className="bg-slate-100 p-2 rounded-full text-slate-500 hover:bg-slate-200 transition-colors"><X size={16}/></button>
                    </div>
                    <div className="flex-1 overflow-y-auto p-5 space-y-5 bg-slate-50/50">
                       <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm text-center space-y-2">
                          <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Expected Delivery Frame</p>
                          <p className={`text-2xl font-black tracking-tight ${isOverdue ? 'text-amber-500' : 'text-emerald-600'}`}>
                             {isOverdue ? "🛵 Order is on the way!" : `⏱️ ${trackerMessage.replace('Delivery expected ', '')}`}
                          </p>
                          <p className="text-[11px] text-slate-500 font-bold pt-1">Placed at: {new Date(activeTrackingOrderModal.createdAt).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})} • Delivery partner is packing items safely.</p>
                       </div>
                       
                       <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm space-y-3">
                          <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">📦 Items Summary Breakdowns</p>
                          <div className="divide-y divide-slate-100">
                             {activeTrackingOrderModal.items?.map((i: any) => {
                                const targetId = i.productId || i.id;
                                const match = products.find(p => p.id === targetId);
                                return (
                                <div key={i.id} className="flex items-center justify-between py-2.5 text-xs font-bold text-slate-800">
                                   <div className="flex items-center gap-3">
                                      <div className="w-10 h-10 bg-slate-50 rounded-lg border border-slate-100 p-1 flex items-center justify-center shrink-0">
                                         {match?.image ? <img src={match.image} referrerPolicy="no-referrer" className="w-full h-full object-contain mix-blend-multiply" alt=""/> : <ShoppingBag size={12} className="text-slate-300"/>}
                                      </div>
                                      <div>
                                         <p className="font-black text-slate-900">{match?.name || i.customName || "Store Product"}</p>
                                         <p className="text-[10px] text-slate-400 font-bold">Qty: x{i.quantity}</p>
                                      </div>
                                   </div>
                                   <span className="font-black text-slate-900">₹{i.sellingPrice * i.quantity}</span>
                                </div>
                             )})}
                          </div>
                       </div>

                       <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm space-y-2.5 text-xs font-bold text-slate-600">
                          <div className="flex justify-between"><span className="text-slate-400">Total Items Price:</span><span className="text-slate-900 font-black">₹{activeTrackingOrderModal.originalAmount || activeTrackingOrderModal.totalAmount}</span></div>
                          <div className="flex justify-between"><span className="text-slate-400">Delivery Fee:</span><span className="text-green-600 font-black tracking-wide uppercase">FREE</span></div>
                          {activeTrackingOrderModal.originalAmount > activeTrackingOrderModal.totalAmount && (
                             <div className="flex justify-between text-green-600 font-black bg-green-50 p-2 rounded-xl"><span>🎁 Store Credit Deducted:</span><span>-₹{activeTrackingOrderModal.originalAmount - activeTrackingOrderModal.totalAmount}</span></div>
                          )}
                          <div className="flex justify-between pt-2 border-t border-slate-100 text-sm font-black text-slate-900"><span>Grand Total Bill Amount:</span><span className="text-lg font-black text-slate-900">₹{activeTrackingOrderModal.totalAmount}</span></div>
                       </div>
                    </div>
                 </motion.div>
            </>
         )}
      </AnimatePresence>

      <AnimatePresence>
        {isCartOpen && (
            <>
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setIsCartOpen(false)} className="fixed inset-0 bg-slate-900/60 z-[50] backdrop-blur-sm" />
                <motion.div initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }} transition={spring} className="fixed inset-x-0 bottom-0 w-full max-w-2xl mx-auto bg-white rounded-t-[2rem] z-[60] max-h-[94vh] flex flex-col overflow-hidden shadow-2xl border-t border-slate-200">
                    <div className="p-5 flex justify-between items-center bg-white border-b border-slate-100 shadow-sm">
                       <div className="flex items-center gap-2">
                          <ShoppingCart size={20} className="text-slate-800" />
                          <h2 className="text-lg font-black text-slate-900">Checkout Summary</h2>
                          <span className="text-xs bg-slate-100 px-2 py-0.5 rounded-md font-bold text-slate-500">{items.length} {items.length === 1 ? 'item' : 'items'}</span>
                       </div>
                       <button onClick={() => runWithHapticPulse(() => setIsCartOpen(false))} className="bg-slate-100 p-2 rounded-full text-slate-500 hover:bg-slate-200 transition-colors"><X size={16}/></button>
                    </div>
                    <div className="flex-1 overflow-y-auto p-4 space-y-5">
                        <div className="bg-white border border-slate-200/60 rounded-2xl p-3 shadow-sm divide-y divide-slate-100">
                          {items.length === 0 ? (
                             <div className="text-center py-12 text-slate-400 font-bold text-sm flex flex-col items-center justify-center gap-2">
                                <ShoppingCart size={40} className="text-slate-200" />Aapki cart khali hai.
                             </div>
                          ) : items.map((item: any) => {
                             const match = products.find(p => p.id === item.id);
                             const liveSp = match ? match.sellingPrice : item.sellingPrice;
                             const liveMrp = match ? (match.mrp || match.sellingPrice) : (item.mrp || item.sellingPrice);
                             return (
                             <div key={item.id} className="flex items-center justify-between py-3 text-xs font-bold text-slate-800 first:pt-1 last:pb-1">
                                <div className="flex items-center gap-3 min-w-0 flex-1">
                                   <div className="w-12 h-12 bg-slate-50 rounded-xl p-1 border border-slate-100/60 flex-shrink-0 flex items-center justify-center overflow-hidden">
                                      {item.image ? <img src={item.image} referrerPolicy="no-referrer" className="w-full h-full object-contain mix-blend-multiply" alt="" /> : <ShoppingBag size={14} className="text-slate-400" />}
                                   </div>
                                   <div className="min-w-0 flex-1">
                                      <p className="font-black text-slate-900 text-sm truncate">{item.name}</p>
                                      <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mt-0.5">₹{liveSp} {match?.unit ? `• ${match.unit}` : ''}</p>
                                   </div>
                                </div>
                                <div className="flex items-center gap-3 bg-green-600 text-white font-black px-2 py-1.5 rounded-xl shadow-sm border border-green-700 shrink-0 ml-4">
                                   <button onClick={() => runWithHapticPulse(() => removeItem(item.id))} className="text-white/80 p-0.5 hover:text-white transition-colors"><Minus size={12} strokeWidth={3}/></button>
                                   <span className="font-black text-xs w-4 text-center text-white">{item.quantity}</span>
                                   <button onClick={() => runWithHapticPulse(() => addItem(item))} className="text-white/80 p-0.5 hover:text-white transition-colors"><Plus size={12} strokeWidth={3}/></button>
                                </div>
                                <div className="text-right min-w-[60px] ml-4">
                                   <p className="font-black text-slate-900 text-sm">₹{liveSp * item.quantity}</p>
                                   {liveMrp > liveSp && <p className="text-[10px] text-slate-400 font-medium line-through">₹{liveMrp * item.quantity}</p>}
                                </div>
                             </div>
                          )})}
                        </div>

                        {/* 🔥 FIX: CLEAR SWIPE HINT IN PEOPLE ALSO ADDED */}
                        {items.length > 0 && products.length > 0 && (
                           <div className="space-y-2 bg-slate-50 border border-slate-100 p-3 rounded-2xl select-none block overflow-hidden">
                              <div className="flex justify-between items-center px-1">
                                 <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest flex items-center gap-1">✨ People Also Added</p>
                                 <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-0.5">Swipe <ArrowRight size={10}/></span>
                              </div>
                              <div className="flex gap-3 overflow-x-auto pb-1.5 pt-1 scrollbar-none snap-x snap-mandatory">
                                  {products
                                     .filter(p => !items.some((it: any) => it.id === p.id))
                                     .slice(0, 10)
                                     .map((p: any) => (
                                        <div key={p.id} className="w-24 bg-white p-2 border border-slate-200/50 rounded-xl shrink-0 flex flex-col justify-between shadow-sm snap-start relative">
                                           <div className="w-full aspect-square bg-slate-50 rounded-xl p-1 flex items-center justify-center overflow-hidden border border-slate-100/60 mb-1.5 shadow-inner">
                                              {p.image ? <img src={p.image} className="w-full h-full object-contain mix-blend-multiply" referrerPolicy="no-referrer" alt="" /> : <ShoppingBag size={12} className="text-slate-300" />}
                                           </div>
                                           <p className="text-[10px] font-black text-slate-700 truncate capitalize leading-tight mb-1">{p.name.toLowerCase()}</p>
                                           <div className="flex items-center justify-between mt-auto pt-1.5 border-t border-slate-50">
                                              <span className="text-[10px] font-black text-slate-900">₹{p.sellingPrice}</span>
                                              <button onClick={() => runWithHapticPulse(() => { addItem(p); toast.success(`${p.name} jodh diya! 🛒`); })} className="text-[10px] bg-emerald-600 hover:bg-emerald-700 text-white font-black px-1.5 py-0.5 rounded-lg shadow-sm">+</button>
                                           </div>
                                        </div>
                                     ))}
                              </div>
                           </div>
                        )}

                        {items.length > 0 && (
                           <div className="space-y-4">
                               <div className="bg-white p-4 rounded-2xl border border-slate-200/60 shadow-sm space-y-3">
                                  <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest flex items-center gap-1.5"><CheckCircle2 size={12} className="text-slate-400"/> Step 1: Account Context Details</p>
                                  {!isConfirmingPhone ? (
                                     <div className="flex gap-2">
                                        <div className="relative flex-1">
                                           <Phone className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
                                           <input type="tel" maxLength={10} placeholder="Enter 10-digit Phone" value={phone} onChange={e => { setPhone(e.target.value.replace(/\D/g, '')); setIsPhoneVerified(false); }} className="w-full bg-slate-50 border border-slate-200/80 p-3.5 pl-11 rounded-xl font-bold text-xs text-slate-800 outline-none focus:border-green-500 transition-colors" />
                                        </div>
                                        <button onClick={() => runWithHapticPulse(handleLogin)} className={`px-5 rounded-xl text-xs font-black uppercase tracking-wider flex items-center gap-1.5 transition-all shadow-sm ${isPhoneVerified ? 'bg-green-50 text-green-600 border border-green-200' : 'bg-green-600 hover:bg-green-700 text-white'}`}>{isPhoneVerified ? "Verified ✓" : "Verify"}</button>
                                     </div>
                                  ) : (
                                     <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-2.5">
                                        <p className="text-xs font-bold text-slate-700 text-center">Kya <span className="font-black text-slate-900">+91 {phone}</span> aapka sahi number hai?</p>
                                        <div className="flex gap-2">
                                           <button onClick={() => runWithHapticPulse(() => setIsConfirmingPhone(false))} className="flex-1 py-2 bg-white border border-slate-200 text-slate-700 font-black rounded-xl text-[11px] uppercase tracking-wider shadow-sm">Nahi, Edit karein</button>
                                           <button onClick={() => runWithHapticPulse(() => { setIsConfirmingPhone(false); lookupCustomerPhone(); })} className="flex-1 py-2 bg-green-600 hover:bg-green-700 text-white font-black rounded-xl text-[11px] uppercase tracking-wider shadow-md">Haan, Sahi Hai</button>
                                        </div>
                                     </div>
                                  )}
                               </div>

                               {isPhoneVerified && (
                                  <motion.div initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
                                      <div className="bg-white p-4 rounded-2xl border border-slate-200/60 shadow-sm space-y-3">
                                          <div className="flex justify-between items-center">
                                             <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest flex items-center gap-1.5"><MapPin size={12}/> Step 2: Delivery Address Location</p>
                                             {hasSavedDetails && <button onClick={() => runWithHapticPulse(() => setIsEditingAddress(!isEditingAddress))} type="button" className="p-1 bg-slate-50 rounded-lg text-slate-400 hover:text-green-600 transition-colors"><Pencil size={12} /></button>}
                                          </div>
                                          {(!hasSavedDetails || isEditingAddress) ? (
                                              <div className="space-y-3 pt-1">
                                                 <input placeholder="Customer Full Name" value={checkoutForm.name} onChange={e => setCheckoutForm({...checkoutForm, name: e.target.value})} className="w-full bg-slate-50 border border-slate-200 p-3.5 rounded-xl text-xs font-bold text-slate-800 outline-none focus:border-green-500 shadow-sm" />
                                                 <textarea placeholder="Complete Delivery Address (House/Gali/Mohalla)" value={checkoutForm.address} onChange={e => setCheckoutForm({...checkoutForm, address: e.target.value})} className="w-full bg-slate-50 border border-slate-200 p-3.5 rounded-xl text-xs font-bold h-16 text-slate-800 outline-none resize-none focus:border-green-500 shadow-sm" />
                                                 <button disabled={isSavingProfile} onClick={() => runWithHapticPulse(saveUpdatedAddressDetails)} type="button" className="w-full py-3 bg-green-600 hover:bg-green-700 text-white rounded-xl text-xs font-black uppercase tracking-widest shadow-md disabled:opacity-50">
                                                    {isSavingProfile ? "Saving..." : "Confirm Address Details"}
                                                 </button>
                                              </div>
                                          ) : (
                                              <div className="p-3 bg-slate-50 border border-slate-100 rounded-xl flex items-start gap-2.5">
                                                 <MapPin size={15} className="text-slate-400 shrink-0 mt-0.5" />
                                                 <div>
                                                    <p className="text-xs font-black capitalize text-slate-800">{checkoutForm.name}</p>
                                                    <p className="text-[11px] text-slate-500 mt-0.5 leading-relaxed font-bold">{checkoutForm.address}</p>
                                                 </div>
                                              </div>
                                          )}
                                      </div>

                                      <div className="bg-white p-5 rounded-2xl border border-slate-200/60 shadow-sm space-y-4">
                                          <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest flex items-center gap-1.5"><FileText size={12}/> Bill Details</p>
                                          <div className="text-xs font-bold text-slate-600 space-y-2.5">
                                             <div className="flex justify-between items-center"><span className="text-slate-500">Basket Items Price:</span><span className="text-slate-900 font-black">₹{cartTotal}</span></div>
                                             <div className="flex justify-between items-center"><span className="text-slate-500 flex items-center gap-1"><Bike size={13} className="text-slate-400"/> Delivery Partner Fee:</span><span><span className="line-through text-slate-400 font-medium mr-1.5">₹35</span><span className="text-green-600 font-black tracking-wide bg-green-50 px-1.5 py-0.5 rounded">FREE</span></span></div>
                                             {netTotalSavingsAmount > 0 && <div className="flex justify-between text-green-600 font-black bg-green-50 p-2 rounded-xl tracking-wide"><span>🎉 Total Savings on Bill:</span><span>-₹{netTotalSavingsAmount}</span></div>}
                                             {debt > 0 && <div className="flex justify-between items-center text-rose-500 pt-1 border-t border-slate-100"><span>📒 Old Khata Dues (To Pay):</span><span className="font-black">+₹{debt}</span></div>}
                                             {storeCredit > 0 && <div className="flex justify-between items-center text-green-600 pt-1 border-t border-slate-100"><span>🎁 Store Credit Deducted:</span><span className="font-black">-₹{Math.min(cartTotal, storeCredit)}</span></div>}
                                          </div>
                                      </div>

                                      <div className="bg-white p-4 rounded-2xl border border-slate-200/60 shadow-sm space-y-3">
                                          <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest text-center flex items-center gap-1"><CreditCard size={12}/> Select Payment Method</p>
                                          {effectiveTotal > 0 ? (
                                              <div className={`grid ${isUdhaarEligible ? 'grid-cols-3' : 'grid-cols-2'} gap-2.5`}>
                                                  <button type="button" onClick={() => runWithHapticPulse(() => setCheckoutForm({...checkoutForm, paymentMode: "CASH"}))} className={`p-3 rounded-xl border-2 flex flex-col items-center gap-1 transition-all ${checkoutForm.paymentMode === "CASH" ? "border-green-600 bg-green-50 text-green-600" : "border-slate-100 bg-slate-50 text-slate-400 hover:border-slate-200"}`}><Banknote size={18} /><span className="text-[9px] font-black uppercase tracking-wider">Cash / COD</span></button>
                                                  <button type="button" onClick={() => runWithHapticPulse(() => setCheckoutForm({...checkoutForm, paymentMode: "UPI"}))} className={`p-3 rounded-xl border-2 flex flex-col items-center gap-1 transition-all ${checkoutForm.paymentMode === "UPI" ? "border-green-600 bg-green-50 text-green-600" : "border-slate-100 bg-slate-50 text-slate-400 hover:border-slate-200"}`}><CreditCard size={18} /><span className="text-[9px] font-black uppercase tracking-wider">UPI App Online</span></button>
                                                  {isUdhaarEligible && (
                                                     <button type="button" onClick={() => runWithHapticPulse(() => setCheckoutForm({...checkoutForm, paymentMode: "UDHAAR"}))} className={`p-3 rounded-xl border-2 flex flex-col items-center gap-1 transition-all ${checkoutForm.paymentMode === "UDHAAR" ? "border-green-600 bg-green-50 text-green-600" : "border-slate-100 bg-slate-50 text-slate-400 hover:border-slate-200"}`}><BookOpen size={18} /><span className="text-[9px] font-black uppercase tracking-wider">Write to Khata</span></button>
                                                  )}
                                              </div>
                                          ) : ( <div className="p-3 text-center text-xs font-black text-green-600 bg-green-50 border border-green-200 rounded-xl uppercase tracking-wide">Fully Covered By Available Credit ✨</div> )}
                                      </div>

                                      <div className="flex justify-between items-center p-5 bg-white rounded-2xl border border-slate-200 shadow-md mt-2">
                                         <div><p className="text-[9px] font-black text-slate-400 tracking-widest uppercase">To Pay Grand Total</p><p className="text-3xl font-black text-slate-900 tracking-tight leading-none mt-1">₹{effectiveTotal}</p></div>
                                         <button type="button" onClick={() => runWithHapticPulse(submitOrder)} disabled={isCheckingOut} className="bg-green-600 hover:bg-green-700 text-white px-8 py-4 rounded-xl font-black text-xs uppercase tracking-widest transition-all active:scale-95 shadow-md shadow-green-600/10 disabled:opacity-50">{isCheckingOut ? "Order ho raha hai..." : "Confirm & Place Order"}</button>
                                      </div>
                                  </motion.div>
                               )}
                           </div>
                        )}
                    </div>
                </motion.div>
            </>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {creditErrorData.show && (
           <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-[250] flex flex-col items-center justify-center p-4">
              <motion.div initial={{ scale: 0.9, y: 15 }} animate={{ scale: 1, y: 0 }} className="w-full max-w-sm bg-white rounded-[2rem] p-6 text-center shadow-2xl my-auto border border-slate-100 space-y-4">
                 <div className="w-12 h-12 bg-rose-50 text-rose-500 rounded-2xl flex items-center justify-center mx-auto border border-rose-100"><AlertCircle size={22}/></div>
                 <h3 className="text-base font-black text-slate-900 tracking-tight">Khata Limit Cross! 📒</h3>
                 <p className="text-xs text-slate-600 font-bold leading-relaxed px-2">
                    {creditErrorData.message}. Please old dues clear kariye.
                 </p>
                 <div className="grid grid-cols-2 gap-2.5 pt-2">
                    <button onClick={() => runWithHapticPulse(() => {
                       setCheckoutForm(prev => ({ ...prev, paymentMode: "CASH" }));
                       setCreditErrorData({ show: false, message: "", dues: 0, customerId: "" });
                    })} className="bg-slate-50 border border-slate-200 text-slate-700 py-3.5 rounded-xl font-black text-xs uppercase tracking-wider transition-colors active:scale-95 shadow-sm">Switch to Cash</button>
                    
                    <button onClick={() => runWithHapticPulse(() => {
                       const dynamicOutsMessage = `Hi, mujhe apna pichla bacha hua khata clear karwana hai! 🙏\n\n▪️ Total Outstanding Dues: ₹${creditErrorData.dues}\n🆔 Customer ID: ${creditErrorData.customerId}`;
                       window.location.href = `whatsapp://send?phone=${paymentConfig?.whatsappNumber || "917838036086"}&text=${encodeURIComponent(dynamicOutsMessage)}`;
                       setCreditErrorData({ show: false, message: "", dues: 0, customerId: "" });
                    })} className="bg-rose-500 hover:bg-rose-600 text-white py-3.5 rounded-xl font-black text-xs uppercase tracking-wider transition-colors active:scale-95 shadow-md shadow-rose-500/10">Clear Udhaar Balance</button>
                 </div>
              </motion.div>
           </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {successScreen.show && successScreen.type === "UPI" && (
           <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-[200] flex flex-col items-center justify-center p-4">
              <motion.div initial={{ scale: 0.9, y: 15 }} animate={{ scale: 1, y: 0 }} className="w-full max-w-sm bg-white rounded-[2rem] p-6 text-center shadow-2xl my-auto border border-slate-100">
                 <h2 className="text-lg font-black text-slate-800 mb-4 flex items-center justify-center gap-2">Scan & Pay 📱</h2>
                 <div className="bg-slate-50 p-4 rounded-xl mb-4 border border-slate-100">
                    <div className="text-[10px] font-black uppercase tracking-widest opacity-60 text-slate-500 text-left mb-1">Order Amount Parameters</div>
                    <div className="flex items-center justify-center gap-2">
                        <span className="text-lg font-black text-slate-400">₹</span>
                        <input type="number" min="1" disabled={!isEditingAmount} value={upiPayAmount} onChange={(e) => setUpiPayAmount(e.target.value)} className="text-2xl font-black bg-transparent w-20 text-center outline-none border-none text-emerald-600" />
                        <button onClick={() => runWithHapticPulse(() => setIsEditingAmount(!isEditingAmount))} className="text-blue-500 hover:underline text-xs font-black shrink-0">{isEditingAmount ? "Lock" : "Change Amount"}</button>
                    </div>
                 </div>
                 <div className="bg-slate-50 p-4 rounded-2xl inline-block mb-4 border border-slate-100 shadow-sm">
                    {isUpiValid ? <img src={`https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${encodeURIComponent(upiLink)}`} alt="QR" className="w-40 h-40 mx-auto rounded-xl" /> : <div className="w-40 h-40 flex items-center justify-center bg-slate-50 rounded-xl text-slate-400 text-xs font-bold">Enter valid amount</div>}
                 </div>
                 <div className="space-y-2.5">
                    {isUpiValid ? <a href={upiLink} onClick={() => runWithHapticPulse(() => setHasClickedUpiUri(true))} className="block w-full bg-blue-600 hover:bg-blue-700 text-white p-4 rounded-xl font-black text-xs uppercase tracking-widest shadow-md text-center transition-colors">Pay via UPI App</a> : <button disabled className="block w-full bg-slate-200 text-slate-400 p-4 rounded-xl font-black text-xs uppercase cursor-not-allowed text-center">Pay via UPI App</button>}
                    {(hasClickedUpiUri || qrCountdown === 0) ? <button onClick={() => runWithHapticPulse(handleUpiPaid)} className="w-full bg-emerald-500 hover:bg-emerald-600 text-white p-4 rounded-xl font-black text-xs uppercase tracking-widest shadow-md transition-colors">I have Paid</button> : <div className="w-full text-center py-3 bg-slate-50 rounded-xl text-[11px] font-bold text-slate-400 border border-slate-100">⏳ Unlock Payment Button in {qrCountdown}s...</div>}
                    <button onClick={() => runWithHapticPulse(() => setUpiStatus(upiStatus === "FAILED" ? "PENDING" : "FAILED"))} className="w-full text-slate-400 font-bold text-[10px] uppercase py-2 hover:text-slate-600 text-center">Payment Issues / Options?</button>
                 </div>
                 {upiStatus === "FAILED" && (
                    <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} className="mt-4 pt-4 border-t border-slate-100 flex flex-col gap-2">
                       <p className="text-[9px] font-black uppercase tracking-wider text-slate-400 mb-1 text-center">Alternative Actions</p>
                       {paymentConfig?.upiAccounts?.length > 1 && <button onClick={() => runWithHapticPulse(tryAnotherUpi)} className="w-full bg-blue-50 hover:bg-blue-100 text-blue-600 p-3.5 rounded-xl font-black text-[10px] uppercase flex items-center justify-center gap-2 transition-colors"><RefreshCw size={14}/> Try Another QR</button>}
                       <button onClick={() => runWithHapticPulse(convertToCod)} className="w-full bg-amber-50 hover:bg-amber-100 text-amber-600 p-3 rounded-xl font-black text-[10px] uppercase flex items-center justify-center gap-2 transition-colors border border-amber-200"><Banknote size={14}/> Switch to Cash / COD</button>
                       <button onClick={() => runWithHapticPulse(cancelOrder)} className="w-full bg-rose-50 hover:bg-rose-100 text-rose-500 p-3 rounded-xl font-black text-[10px] uppercase flex items-center justify-center gap-2 transition-colors border border-rose-200"><AlertCircle size={14}/> Cancel Order</button>
                    </motion.div>
                 )}
              </motion.div>
           </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {successScreen.show && successScreen.type !== "UPI" && successScreen.type !== "CANCELLED" && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="fixed inset-0 bg-white z-[100] flex flex-col items-center justify-center p-12 text-center">
                <div className="w-24 h-24 bg-emerald-50 rounded-[2rem] flex items-center justify-center mb-6 border border-emerald-100">
                  <svg className="w-12 h-12 text-emerald-500" fill="none" stroke="currentColor" strokeWidth="8" viewBox="0 0 24 24"><path d="M20 6L9 17l-5-5" /></svg>
                </div>
                <h2 className="text-2xl font-black text-slate-900 tracking-tight mb-2">Order Mil Gaya! 🎉</h2>
                <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.2 }} className="mt-4 p-4 bg-amber-50 border border-amber-200/80 rounded-2xl max-w-sm text-xs font-bold text-amber-800 shadow-sm leading-relaxed text-center">
                   📢 <span className="uppercase font-black text-amber-900">Zaroori Note:</span> Is order ka payment status maalik ke check karne ke baad live ledger par update hoga. Tab tak account settings par dues dikhte rahenge.
                </motion.div>
                <div className="w-full max-w-xs h-1 bg-slate-100 rounded-full overflow-hidden mt-6">
                   <motion.div initial={{ width: 0 }} animate={{ width: "100%" }} transition={{ duration: 4.0 }} className="h-full bg-emerald-500" />
                </div>
            </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showProfile && (
            <>
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setShowProfile(false)} className="fixed inset-0 bg-slate-900/60 z-[50] backdrop-blur-sm" />
                <motion.div initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }} transition={spring} className="fixed inset-x-0 bottom-0 w-full max-w-2xl mx-auto bg-white rounded-t-[2.5rem] z-[60] max-h-[85vh] flex flex-col overflow-hidden shadow-2xl border-t border-slate-200">
                    {!isPhoneVerified ? (
                       <div className="flex-1 overflow-y-auto p-6 flex flex-col items-center justify-center text-center relative bg-slate-50/50 py-12">
                          <button onClick={() => runWithHapticPulse(() => setShowProfile(false))} className="absolute top-6 right-6 bg-slate-100 p-2.5 rounded-full text-slate-500 hover:bg-slate-200 transition-colors"><X size={16}/></button>
                          <div className="w-16 h-16 bg-emerald-50 rounded-2xl flex items-center justify-center mb-4 border border-emerald-100 text-emerald-500"><User size={32} /></div>
                          <h3 className="text-2xl font-black text-slate-800 mb-2">Welcome to Goel Store</h3>
                          <p className="text-xs text-slate-500 font-bold mb-6 max-w-xs leading-relaxed">Enter your 10-digit phone number to check your Profile, Khata Ledger, and Order History instantly.</p>
                          <div className="w-full max-w-xs space-y-3 bg-white p-5 rounded-3xl border border-slate-200 shadow-sm text-left">
                             {!isConfirmingPhone ? (
                                <>
                                   <div className="space-y-1">
                                      <label className="text-[10px] font-black uppercase text-slate-400 tracking-wider ml-1">Phone Number</label>
                                      <div className="relative">
                                         <Phone className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
                                         <input type="tel" maxLength={10} placeholder="Enter 10-digit phone" value={phone} onChange={e => { setPhone(e.target.value.replace(/\D/g, '')); setIsPhoneVerified(false); }} className="w-full bg-slate-50 border border-slate-200 p-3.5 pl-11 rounded-xl font-bold text-xs text-slate-800 outline-none focus:border-emerald-500" />
                                      </div>
                                   </div>
                                   <button onClick={() => runWithHapticPulse(handleLogin)} className="w-full bg-emerald-500 hover:bg-emerald-600 text-white py-3.5 rounded-xl font-black text-xs uppercase tracking-widest shadow-md">Verify Identity</button>
                                </>
                             ) : (
                                <div className="space-y-3 text-center">
                                   <p className="text-xs font-bold text-slate-700">Kya <span className="font-black text-slate-900">+91 {phone}</span> aapka sahi number hai?</p>
                                   <div className="flex gap-2">
                                      <button onClick={() => runWithHapticPulse(() => setIsConfirmingPhone(false))} className="flex-1 py-2.5 bg-slate-100 text-slate-700 font-black rounded-xl text-[11px] uppercase tracking-wider shadow-sm border border-slate-200">Edit Karein</button>
                                      <button onClick={() => runWithHapticPulse(() => { setIsConfirmingPhone(false); lookupCustomerPhone(); })} className="flex-1 py-2.5 bg-emerald-500 hover:bg-emerald-600 text-white font-black rounded-xl text-[11px] uppercase tracking-wider shadow-md">Haan, Sahi Hai</button>
                                   </div>
                                </div>
                             )}
                          </div>
                       </div>
                    ) : (!customerInfo || !customerInfo.name) ? (
                       <div className="flex-1 overflow-y-auto p-6 flex flex-col justify-center relative bg-slate-50/50 py-12">
                          <button onClick={() => runWithHapticPulse(() => { setShowProfile(false); })} className="absolute top-6 right-6 bg-slate-100 p-2.5 rounded-full text-slate-500 hover:bg-slate-200 transition-colors"><X size={16}/></button>
                          <div className="text-center mb-6">
                             <div className="w-16 h-16 bg-emerald-50 rounded-2xl flex items-center justify-center mx-auto mb-4 border border-emerald-100 text-emerald-500"><User size={28} /></div>
                             <h3 className="text-xl font-black text-slate-800">Complete Profile Setup</h3>
                             <p className="text-xs text-slate-500 font-bold mt-1">Please enter your name and address to unlock your Khata account layer.</p>
                          </div>
                          <div className="w-full max-w-md mx-auto bg-white border border-slate-200 p-5 rounded-3xl space-y-4 shadow-sm">
                             <div className="space-y-1">
                                <label className="text-[10px] font-black uppercase text-slate-400 tracking-wider ml-1">Full Name</label>
                                <input placeholder="Enter Name (Min 3 letters)" value={checkoutForm.name} onChange={e => setCheckoutForm({...checkoutForm, name: e.target.value})} className="w-full bg-slate-50 border border-green-500 p-3.5 rounded-xl text-xs font-bold text-slate-800 outline-none focus:border-green-500" />
                             </div>
                             <div className="space-y-1">
                                <label className="text-[10px] font-black uppercase text-slate-400 tracking-wider ml-1">Delivery Address</label>
                                <textarea placeholder="Enter Complete Address" value={checkoutForm.address} onChange={e => setCheckoutForm({...checkoutForm, address: e.target.value})} className="w-full bg-slate-50 border border-slate-200 p-3.5 rounded-xl text-xs font-bold h-16 text-slate-800 outline-none resize-none focus:border-green-500" />
                             </div>
                             <button disabled={isSavingProfile} onClick={() => runWithHapticPulse(saveUpdatedAddressDetails)} type="button" className="w-full py-3.5 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl text-xs font-black uppercase tracking-widest shadow-md disabled:opacity-50">
                                {isSavingProfile ? "Saving..." : "Complete Setup"}
                             </button>
                          </div>
                       </div>
                    ) : (
                       <>
                          <div className="p-5 flex justify-between items-center border-b border-slate-100 bg-white">
                             <h2 className="text-xl font-black text-slate-800">Profile Drawer</h2>
                             <button onClick={() => runWithHapticPulse(() => setShowProfile(false))} className="bg-slate-100 p-2.5 rounded-full text-slate-500 hover:bg-slate-200 transition-colors"><X size={16}/></button>
                          </div>
                          
                          {/* 🔥 FIXED: SLEEK & COMPACT PROFILE UI TO REVEAL ORDER HISTORY */}
                          <div className="flex-1 overflow-y-auto p-5 space-y-5 bg-slate-50/50">
                              <div className="bg-white border border-slate-100 rounded-[1.5rem] p-5 text-center shadow-sm relative">
                                  {!isEditingProfile ? (
                                     <>
                                        <button onClick={() => runWithHapticPulse(() => { setCheckoutForm({ name: customerInfo?.name || "", address: customerInfo?.address || "", paymentMode: "" }); setIsEditingProfile(true); })} className="absolute top-4 right-4 text-blue-500 bg-blue-50 p-1.5 rounded-lg hover:bg-blue-100 transition-colors"><Pencil size={14}/></button>
                                        <p className="text-xl font-black text-slate-900 capitalize tracking-tight leading-none mb-1.5">{customerInfo?.name}</p>
                                        <div className="flex items-center justify-center gap-2 mb-3">
                                           <p className="inline-flex items-center gap-0.5 text-[9px] font-black uppercase text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-md tracking-wider shadow-inner border border-emerald-100/30">
                                              <Hash size={10}/> {customerInfo?.customId || customerInfo?.id?.slice(-5).toUpperCase()}
                                           </p>
                                           <p className="text-slate-500 font-bold text-[10px] flex items-center gap-1"><Phone size={10}/> +91 {phone}</p>
                                        </div>
                                        <p className="text-slate-500 text-[10px] font-bold max-w-[250px] mx-auto bg-slate-50 p-2 rounded-lg border border-slate-200 truncate">📍 {customerInfo?.address || "Delivery location save nahi hai."}</p>
                                     </>
                                  ) : (
                                     <div className="space-y-3 text-left bg-slate-50 p-3 rounded-xl border border-slate-200">
                                        <p className="text-[10px] font-black uppercase text-slate-400 tracking-wider">Account Settings Edit</p>
                                        <input placeholder="Full Name" value={checkoutForm.name} onChange={e => setCheckoutForm({...checkoutForm, name: e.target.value})} className="w-full bg-white border border-slate-200 p-2.5 rounded-lg text-xs font-bold text-slate-800 outline-none focus:border-emerald-500" />
                                        <textarea placeholder="Complete Delivery Address" value={checkoutForm.address} onChange={e => setCheckoutForm({...checkoutForm, address: e.target.value})} className="w-full bg-white border border-slate-200 p-2.5 rounded-lg text-xs font-bold h-12 text-slate-800 outline-none resize-none focus:border-green-500" />
                                        <div className="flex gap-2 pt-1">
                                           <button disabled={isSavingProfile} onClick={() => runWithHapticPulse(saveUpdatedAddressDetails)} className="flex-1 py-2 bg-emerald-500 hover:bg-emerald-600 text-white font-black rounded-lg text-[10px] uppercase tracking-wider shadow-sm disabled:opacity-50">{isSavingProfile ? "Saving..." : "Save Changes"}</button>
                                           <button onClick={() => runWithHapticPulse(() => setIsEditingProfile(false))} className="px-3 py-2 bg-slate-200 text-slate-600 font-bold rounded-lg text-[10px] uppercase tracking-wider">Cancel</button>
                                        </div>
                                     </div>
                                  )}

                                  <div className={`p-4 rounded-xl relative overflow-hidden shadow-inner border-2 mt-4 ${customerInfo?.dues < 0 ? 'bg-rose-50 border-rose-200 text-rose-600' : customerInfo?.dues > 0 ? 'bg-emerald-50 border-emerald-200 text-emerald-600' : 'bg-slate-50 border-slate-200 text-slate-500'}`}>
                                      <div className="flex justify-between items-center mb-1">
                                          <p className="text-[9px] font-black uppercase tracking-widest opacity-80">{customerInfo?.dues < 0 ? 'To Pay (Udhaar)' : customerInfo?.dues > 0 ? 'Store Credit' : 'Koi outstanding nahi hai!'}</p>
                                          {/* 🔥 FIXED: MERGED DOWNLOAD STATEMENT BUTTON INSIDE KHATA CARD TO SAVE SPACE */}
                                          <button onClick={() => runWithHapticPulse(async () => {
                                              if (!customerInfo?.id) return toast.error("Aapka profile layer abhi sync ho raha hai...");
                                              const tId = toast.loading("Downloading PDF... 📄");
                                              try {
                                                  const res = await fetch(`/api/customers/pdf?id=${customerInfo.id}&t=${Date.now()}`);
                                                  if (!res.ok) throw new Error();
                                                  const blob = await res.blob(); const url = window.URL.createObjectURL(blob);
                                                  const a = document.createElement('a'); a.href = url;
                                                  const now = new Date();
                                                  const pristineFormattedName = (customerInfo.name || "Customer").replace(/\s+/g, '_');
                                                  a.download = `Khata_Ledger_${pristineFormattedName}_${String(now.getDate()).padStart(2, '0')}${String(now.getMonth() + 1).padStart(2, '0')}${now.getFullYear()}.pdf`;
                                                  document.body.appendChild(a); a.click(); a.remove(); toast.success("Ledger downloaded! 💾", { id: tId });
                                              } catch(e) { toast.error("PDF download fail ho gaya!", { id: tId }); }
                                          })} className="text-[9px] font-black text-slate-600 bg-white/60 px-2 py-1 rounded shadow-sm flex items-center gap-1 border border-slate-200/50 hover:bg-white transition-colors"><FileText size={10}/> Statement</button>
                                      </div>
                                      <h3 className="text-3xl font-black tracking-tighter text-left">₹{Math.abs(customerInfo?.dues || 0)}</h3>
                                      {customerInfo?.dues < 0 && (
                                         <button onClick={() => runWithHapticPulse(() => { window.location.href=`whatsapp://send?phone=${paymentConfig?.whatsappNumber || '917838036086'}&text=${encodeURIComponent(`Hi, mujhe apna pichla bacha hua khata clear karwana hai! 🙏\n\n▪️ Total Outstanding Dues: ₹${Math.abs(customerInfo.dues)}\n🆔 Customer ID: ${customerInfo?.customId || customerInfo?.id?.slice(-5).toUpperCase()}`)}`; })} className="mt-3 w-full bg-rose-500 hover:bg-rose-600 text-white py-2.5 rounded-lg font-black text-[10px] uppercase tracking-widest shadow-md flex items-center justify-center gap-1.5 transition-colors">Clear Udhaar <ArrowRight size={12}/></button>
                                      )}
                                  </div>
                              </div>

                              <div className="space-y-3">
                                  <h4 className="font-black text-slate-400 text-[10px] uppercase tracking-widest ml-1">Order History</h4>
                                  {customerInfo?.orders?.length > 0 ? customerInfo.orders.map((o: any) => {
                                      const displayStatus = o.orderStatus === 'NEW' ? 'IN PROGRESS' : o.orderStatus;
                                      let paymentInfo = o.paymentMode?.replace('_', ' ') || "CASH";
                                      if (o.paymentMode === 'UPI' && o.assignedQr) { paymentInfo += ` • ${o.assignedQr.split('(')[0].trim()}`; }
                                      return (
                                      <div key={o.id} className="p-4 rounded-2xl bg-white border border-slate-100 shadow-sm space-y-3">
                                          <div className="flex justify-between items-center cursor-pointer" onClick={() => runWithHapticPulse(() => setExpandedOrder(expandedOrder === o.id ? null : o.id))}>
                                              <div>
                                                 <p className="font-black text-slate-800 text-sm">#{o.id}</p>
                                                 <p className="text-[9px] text-slate-400 font-bold uppercase mt-0.5 tracking-wider">{new Date(o.createdAt).toLocaleDateString('en-GB')} {new Date(o.createdAt).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</p>
                                                 <p className="text-[9px] font-black uppercase text-blue-500 mt-1 flex items-center gap-1"><CreditCard size={10}/> {paymentInfo}</p>
                                              </div>
                                              <div className="text-right flex items-center gap-2 select-none">
                                                 <div><p className="font-black text-base text-emerald-600">₹{o.totalAmount}</p><span className={`text-[8px] font-black uppercase tracking-wider ${displayStatus.includes('IN PROGRESS') ? 'text-amber-500' : 'text-emerald-500'}`}>{displayStatus}</span></div>
                                                 
                                                 <button onClick={(e) => { e.stopPropagation(); runWithHapticPulse(() => reorderPastOrder(o)); }} className="bg-slate-900 hover:bg-slate-800 text-white px-2.5 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-widest transition-colors shadow-sm shrink-0 whitespace-nowrap ml-1">
                                                    Reorder
                                                 </button>

                                                 <div className={`p-1 bg-slate-50 rounded-full text-slate-400 transition-transform duration-300 ${expandedOrder === o.id ? 'rotate-180 bg-emerald-50 text-emerald-500' : ''}`}><ChevronDown size={14} /></div>
                                              </div>
                                          </div>
                                          <AnimatePresence>
                                              {expandedOrder === o.id && (
                                                  <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} className="pt-2 border-t border-dashed border-slate-100 space-y-2 overflow-hidden">
                                                      {o.items.map((i: any) => (<div key={i.id} className="flex justify-between text-[10px] font-bold text-slate-500"><span>{i.product?.name || i.customName} <span className="text-slate-300 ml-0.5">x{i.quantity}</span></span><span className="text-slate-700">₹{i.sellingPrice * i.quantity}</span></div>))}
                                                      {o.originalAmount > o.totalAmount && (
                                                          <div className="flex justify-between items-center text-[9px] font-black text-emerald-600 bg-emerald-50 p-2 rounded-md mt-2 border border-emerald-100 uppercase tracking-widest"><span className="flex items-center gap-1"><Sparkles size={10}/> Credit Applied</span><span>-₹{o.originalAmount - o.totalAmount}</span></div>
                                                      )}
                                                  </motion.div>
                                              )}
                                          </AnimatePresence>
                                      </div>
                                  )}) : ( <div className="p-5 text-center border border-dashed border-slate-200 rounded-2xl bg-white text-slate-400 text-[10px] font-bold uppercase tracking-wider">Abhi tak koi purana order nahi mil paya.</div> )}
                              </div>
                          </div>
                          
                          {/* 🔥 FIXED: SECURE & INSTANT LOGOUT WITH CONFIRMATION POPUP */}
                          <div className="p-4 bg-white border-t border-slate-100">
                             <button onClick={() => runWithHapticPulse(() => { 
                                 if(window.confirm("Kya aap sach me logout karna chahte hain? Sabhi details clear ho jayengi.")) {
                                     localStorage.clear(); 
                                     window.location.replace("/");
                                 }
                             })} className="w-full p-3.5 bg-rose-50 border border-rose-100 hover:bg-rose-100 text-rose-500 rounded-xl font-black text-xs uppercase tracking-widest text-center flex items-center justify-center gap-2 transition-colors">
                                <LogOut size={14}/> Logout Session
                             </button>
                          </div>
                       </>
                    )}
                </motion.div>
            </>
        )}
      </AnimatePresence>
    </div>
  );
}
