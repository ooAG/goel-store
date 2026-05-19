"use client";
import { useCart } from "@/store/useCart";
import { Plus, Minus, ShoppingBag } from "lucide-react";
import { motion } from "framer-motion";

export const ProductCard = ({ product }: { product: any }) => {
    const { items, addItem, removeItem } = useCart() as any;
    const cartItem = items.find((i: any) => i.id === product.id);
    const qty = cartItem?.quantity || 0;

    // Direct synchronous haptic trigger right at the top execution layer
    const executeActionWithVibe = (action: () => void) => {
        if (typeof navigator !== "undefined" && navigator.vibrate) {
            navigator.vibrate(50); // Stronger burst pulse to pierce through layout limits
        }
        action();
    };

    return (
        <div className="bg-white p-3 rounded-[2rem] border border-slate-100 shadow-sm hover:shadow-xl hover:border-green-300 transition-all flex flex-col justify-between group relative">
            
            <div className="w-full aspect-square bg-slate-50/60 rounded-[1.5rem] overflow-hidden flex items-center justify-center relative border border-slate-100/50 mb-3">
                {product.image ? (
                    <img 
                      src={product.image} 
                      alt={product.name} 
                      className="w-[85%] h-[85%] object-contain group-hover:scale-105 transition-transform duration-300 mix-blend-multiply" 
                      referrerPolicy="no-referrer" 
                    />
                ) : (
                    <ShoppingBag size={24} className="text-slate-300" />
                )}
                
                {product.unit && (
                    <div className="absolute bottom-2 left-2 px-2 py-0.5 bg-white border border-slate-100 rounded-md font-black text-[8px] uppercase text-slate-500 tracking-wider shadow-sm">
                        {product.unit}
                    </div>
                )}
            </div>

            <div className="px-1 flex-1 flex flex-col justify-between">
                <h3 className="text-xs font-black text-slate-800 leading-snug line-clamp-2 mb-2 h-9 capitalize">{product.name?.toLowerCase()}</h3>
                
                <div className="mt-auto space-y-3">
                    <div className="flex items-baseline gap-1.5 flex-wrap">
                        <span className="text-base font-black text-slate-900">₹{product.sellingPrice}</span>
                        {product.mrp > product.sellingPrice && (
                            <span className="text-[10px] font-bold text-slate-400 line-through">
                                ₹{product.mrp}
                            </span>
                        )}
                    </div>

                    {qty > 0 ? (
                        <div className="flex items-center justify-between bg-green-600 text-white rounded-xl p-1 shadow-md border border-green-700">
                            <button onClick={() => executeActionWithVibe(() => removeItem(product.id))} className="w-8 h-8 flex items-center justify-center text-white/80 hover:text-white transition-colors"><Minus size={14} strokeWidth={3}/></button>
                            <span className="font-black text-xs text-white">{qty}</span>
                            <button onClick={() => executeActionWithVibe(() => addItem(product))} className="w-8 h-8 flex items-center justify-center text-white/80 hover:text-white transition-colors"><Plus size={14} strokeWidth={3}/></button>
                        </div>
                    ) : (
                        <button onClick={() => executeActionWithVibe(() => addItem(product))} className="w-full py-2.5 bg-white text-green-600 border border-green-200 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-green-600 hover:text-white hover:border-green-600 transition-all shadow-sm active:scale-95">
                            ADD
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
};

export const StickyCart = ({ onCheckout }: { onCheckout: () => void }) => {
    const { items, getTotal } = useCart() as any;
    if (!items || items.length === 0) return null;

    const totalItems = items.reduce((sum: number, i: any) => sum + i.quantity, 0);

    return (
        <motion.div 
            initial={{ y: 100, opacity: 0 }} 
            animate={{ y: 0, opacity: 1 }} 
            exit={{ y: 100, opacity: 0 }}
            className="fixed bottom-6 left-0 right-0 z-[150] w-full px-4 sm:px-6 pointer-events-none"
        >
            <div className="max-w-xl mx-auto pointer-events-auto">
                <button 
                    onClick={() => {
                        if (typeof navigator !== "undefined" && navigator.vibrate) {
                            navigator.vibrate(50);
                        }
                        onCheckout();
                    }} 
                    className="w-full bg-green-600 hover:bg-green-700 text-white p-4.5 rounded-2xl shadow-[0_12px_40px_rgba(22,163,74,0.35)] flex items-center justify-between transition-all active:scale-98 border border-green-500/30"
                >
                    <div className="flex items-center gap-3">
                        <div className="bg-white/20 px-3 py-1.5 rounded-lg flex items-center justify-center font-black text-xs">
                            {totalItems} {totalItems === 1 ? 'Item' : 'Items'}
                        </div>
                        <span className="font-black text-xs uppercase tracking-widest text-white/95">View Basket</span>
                    </div>
                    <span className="font-black text-lg text-white">₹{getTotal()}</span>
                </button>
            </div>
        </motion.div>
    );
};
