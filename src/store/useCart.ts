import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export const useCart = create()(
  persist(
    (set, get: any) => ({
      items: [],
      addItem: (product: any) => {
        const items = get().items;
        const existing = items.find((i: any) => i.id === product.id);
        if (existing) {
          set({ items: items.map((i: any) => i.id === product.id ? { ...i, quantity: i.quantity + 1 } : i) });
        } else {
          set({ items: [...items, { ...product, quantity: 1 }] });
        }
      },
      removeItem: (id: string) => {
        const items = get().items;
        const existing = items.find((i: any) => i.id === id);
        if (existing?.quantity === 1) {
          set({ items: items.filter((i: any) => i.id !== id) });
        } else {
          set({ items: items.map((i: any) => i.id === id ? { ...i, quantity: i.quantity - 1 } : i) });
        }
      },
      clearCart: () => set({ items: [] }),
      getTotal: () => get().items.reduce((acc: number, item: any) => acc + (item.sellingPrice * item.quantity), 0),
    }),
    { name: 'goel-store-cart' }
  )
);
