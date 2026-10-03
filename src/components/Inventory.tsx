import React, { useState, useEffect } from 'react';
import { cn } from '../lib/utils';
import { toast } from 'react-hot-toast';
import { collection, onSnapshot, doc, updateDoc, query, orderBy, setDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';

interface InventoryItem {
  id?: string;
  name: string;
  category: string;
  stock: number;
  unit: string;
  level: string;
}

export function InventoryView() {
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const userRole = localStorage.getItem('sps_user_role') || 'student';
  const canEdit = userRole === 'principal' || userRole === 'director';
  const [isEditing, setIsEditing] = useState(false);

  useEffect(() => {
    const q = query(collection(db, 'inventory'), orderBy('name', 'asc'));
    const unsubscribe = onSnapshot(q, async (snapshot) => {
      if (snapshot.empty && items.length === 0) {
        // Seed initial data if empty and we haven't already seen data
        const initialItems = [
          { name: 'Computer Desks', category: 'Furniture', stock: 45, unit: 'pcs', level: 'good' },
          { name: 'Whiteboard Markers', category: 'Stationery', stock: 12, unit: 'boxes', level: 'low' },
          { name: 'A4 Paper Reams', category: 'Stationery', stock: 8, unit: 'reams', level: 'critical' },
          { name: 'Sports Jerseys', category: 'Sports', stock: 120, unit: 'sets', level: 'good' },
        ];
        
        for (const item of initialItems) {
          await setDoc(doc(collection(db, 'inventory')), item);
        }
      } else {
        const inventoryData = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        })) as InventoryItem[];
        setItems(inventoryData);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const handleStockUpdate = async (id: string, newStock: number) => {
    try {
      let level = 'good';
      if (newStock < 10) level = 'critical';
      else if (newStock < 20) level = 'low';

      await updateDoc(doc(db, 'inventory', id), {
        stock: newStock,
        level: level
      });
    } catch (error) {
      console.error('Error updating stock:', error);
      toast.error('Failed to update stock');
    }
  };

  if (loading && items.length === 0) {
    return (
      <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-100 dark:border-slate-800 shadow-sm animate-pulse">
        <div className="p-8 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
          <div className="h-6 w-32 bg-slate-100 dark:bg-slate-800 rounded"></div>
          <div className="h-10 w-24 bg-slate-100 dark:bg-slate-800 rounded-xl"></div>
        </div>
        <div className="p-8 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="space-y-4">
              <div className="flex justify-between items-center">
                <div className="h-3 w-16 bg-slate-100 dark:bg-slate-800 rounded"></div>
                <div className="h-2 w-2 bg-slate-100 dark:bg-slate-800 rounded-full"></div>
              </div>
              <div className="h-5 w-3/4 bg-slate-100 dark:bg-slate-800 rounded"></div>
              <div className="flex items-baseline gap-2">
                <div className="h-8 w-12 bg-slate-100 dark:bg-slate-800 rounded"></div>
                <div className="h-3 w-8 bg-slate-50 dark:bg-slate-800/50 rounded"></div>
              </div>
              <div className="h-1 w-full bg-slate-100 dark:bg-slate-800 rounded-full"></div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-100 dark:border-slate-800 shadow-sm">
      <div className="p-8 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
        <h2 className="font-bold text-slate-900 dark:text-white">Inventory Status</h2>
        <div className="flex gap-2">
          {canEdit && (
            <button 
              onClick={() => {
                if (isEditing) toast.success('Inventory state locked');
                setIsEditing(!isEditing);
              }}
              className={cn(
                "px-4 py-2 rounded-xl text-xs font-bold transition-all uppercase tracking-widest",
                isEditing ? "bg-green-500 text-white" : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700"
              )}
            >
              {isEditing ? 'Save Changes' : 'Update Stock'}
            </button>
          )}
        </div>
      </div>
      <div className="p-8 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 text-left">
        {items.map((item, i) => (
          <div key={i} className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest">{item.category}</span>
              <div className={cn(
                "w-2 h-2 rounded-full",
                item.level === 'good' ? "bg-green-500" : item.level === 'low' ? "bg-yellow-500 shadow-[0_0_8px_rgba(234,179,8,0.5)]" : "bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.5)] animate-pulse"
              )}></div>
            </div>
            <h4 className="font-bold text-slate-900 dark:text-white">{item.name}</h4>
            <div className="flex items-baseline gap-1">
              {isEditing ? (
                <input 
                  type="number" 
                  defaultValue={item.stock} 
                  onChange={(e) => {
                    if (item.id) handleStockUpdate(item.id, parseInt(e.target.value) || 0);
                  }}
                  className="w-20 px-2 py-1 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded font-black text-lg dark:text-white outline-none focus:ring-1 focus:ring-yellow-400"
                />
              ) : (
                <span className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">{item.stock}</span>
              )}
              <span className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase">{item.unit}</span>
            </div>
            <div className="w-full bg-slate-100 dark:bg-slate-800 h-1 rounded-full overflow-hidden">
               <div className={cn(
                 "h-full rounded-full transition-all duration-1000",
                 item.level === 'good' ? "w-4/5 bg-green-500" : item.level === 'low' ? "w-1/4 bg-yellow-500" : "w-1/10 bg-red-500"
               )}></div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
