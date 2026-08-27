import React, { useState } from 'react';
import confetti from 'canvas-confetti';
import { 
  CheckSquare, 
  Square, 
  Plus, 
  Trash2, 
  Sparkles, 
  FileCheck2, 
  Smartphone, 
  Shirt, 
  HeartPulse, 
  Luggage
} from 'lucide-react';
import type { Trip, ChecklistItem } from '../types/travel';

interface ChecklistTabProps {
  trip: Trip;
  onUpdateTrip: (updatedTrip: Trip) => void;
  isReadOnly?: boolean;
}

const CATEGORY_ICONS: Record<string, any> = {
  'Documents & Money': FileCheck2,
  'Electronics': Smartphone,
  'Clothes': Shirt,
  'Toiletries & Medicine': HeartPulse,
  'Bangkok Specific': Sparkles,
  'Essentials': Luggage
};

export const ChecklistTab: React.FC<ChecklistTabProps> = ({
  trip,
  onUpdateTrip,
  isReadOnly
}) => {
  const [newItemTitle, setNewItemTitle] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<ChecklistItem['category']>('Bangkok Specific');

  const categories: ChecklistItem['category'][] = [
    'Documents & Money',
    'Bangkok Specific',
    'Electronics',
    'Clothes',
    'Toiletries & Medicine',
    'Essentials'
  ];

  const triggerConfetti = () => {
    try {
      confetti({
        particleCount: 80,
        spread: 60,
        origin: { y: 0.8 },
        colors: ['#10b981', '#0ea5e9', '#f59e0b', '#ec4899']
      });
    } catch {
      // Ignore if not loaded
    }
  };

  const handleToggle = (itemId: string) => {
    if (isReadOnly) return;
    const target = trip.checklist?.find(c => c.id === itemId);
    const willBeCompleted = target ? !target.completed : false;

    const updated = (trip.checklist || []).map(item => {
      if (item.id !== itemId) return item;
      return { ...item, completed: !item.completed };
    });

    onUpdateTrip({ ...trip, checklist: updated });

    if (willBeCompleted) {
      triggerConfetti();
    }
  };

  const handleAddItem = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newItemTitle.trim()) return;

    const newItem: ChecklistItem = {
      id: `c-${Date.now()}`,
      title: newItemTitle.trim(),
      category: selectedCategory,
      completed: false
    };

    onUpdateTrip({
      ...trip,
      checklist: [...(trip.checklist || []), newItem]
    });

    setNewItemTitle('');
  };

  const handleDeleteItem = (itemId: string) => {
    if (isReadOnly) return;
    onUpdateTrip({
      ...trip,
      checklist: (trip.checklist || []).filter(c => c.id !== itemId)
    });
  };

  const totalItems = trip.checklist?.length || 0;
  const completedItems = trip.checklist?.filter(c => c.completed).length || 0;
  const progressPercent = totalItems > 0 ? Math.round((completedItems / totalItems) * 100) : 0;

  return (
    <div className="space-y-6">
      {/* Top Banner Progress */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-6 shadow-xl flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="space-y-1 text-center sm:text-left">
          <h2 className="text-xl font-bold text-white flex items-center justify-center sm:justify-start gap-2">
            <Luggage className="w-5 h-5 text-emerald-400" /> Pre-Trip & Packing Readiness
          </h2>
          <p className="text-xs text-slate-400">
            Ensure travel documents, e-SIM, Bangkok outfits, and essentials are ready before departure!
          </p>
        </div>

        <div className="flex items-center gap-4 shrink-0">
          <div className="text-right">
            <div className="text-2xl font-black text-emerald-400 font-mono">{progressPercent}%</div>
            <div className="text-[11px] text-slate-400">{completedItems} of {totalItems} packed</div>
          </div>
          <div className="w-20 bg-slate-800 rounded-full h-3 overflow-hidden">
            <div
              className="bg-gradient-to-r from-emerald-500 to-teal-400 h-full rounded-full transition-all duration-500"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        </div>
      </div>

      {/* Add Item Bar */}
      {!isReadOnly && (
        <form onSubmit={handleAddItem} className="bg-slate-900/80 border border-slate-800 rounded-2xl p-3 sm:p-4 shadow-lg flex flex-col sm:flex-row gap-3">
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value as ChecklistItem['category'])}
            className="bg-slate-800 border border-slate-700 text-slate-200 text-xs font-semibold rounded-xl px-3 py-2.5 focus:outline-none focus:border-emerald-500"
          >
            {categories.map(cat => (
              <option key={cat} value={cat}>{cat}</option>
            ))}
          </select>

          <input
            type="text"
            value={newItemTitle}
            onChange={(e) => setNewItemTitle(e.target.value)}
            placeholder="Add new item (e.g. Umbrella, Extra THB cash, Power bank)..."
            className="flex-1 bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
          />

          <button
            type="submit"
            className="px-4 py-2 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold rounded-xl text-xs flex items-center justify-center gap-1.5 transition shrink-0"
          >
            <Plus className="w-4 h-4" /> Add Item
          </button>
        </form>
      )}

      {/* Categorized Lists */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {categories.map(cat => {
          const itemsInCat = (trip.checklist || []).filter(item => item.category === cat);
          if (itemsInCat.length === 0 && isReadOnly) return null;

          const Icon = CATEGORY_ICONS[cat] || Luggage;
          const completedInCat = itemsInCat.filter(i => i.completed).length;

          return (
            <div key={cat} className="bg-slate-900/70 border border-slate-800 rounded-3xl p-5 shadow-xl space-y-3">
              <div className="flex items-center justify-between pb-2 border-b border-slate-800">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
                    <Icon className="w-4 h-4" />
                  </div>
                  <h3 className="text-sm font-bold text-white">{cat}</h3>
                </div>
                <span className="text-xs font-mono text-slate-400">
                  {completedInCat} / {itemsInCat.length}
                </span>
              </div>

              <div className="space-y-1.5">
                {itemsInCat.map(item => (
                  <div
                    key={item.id}
                    className={`flex items-center justify-between p-2.5 rounded-xl border transition ${
                      item.completed
                        ? 'bg-slate-950/40 border-slate-800/60 text-slate-400'
                        : 'bg-slate-950/80 border-slate-800 text-slate-200 hover:border-slate-700'
                    }`}
                  >
                    <button
                      type="button"
                      onClick={() => handleToggle(item.id)}
                      disabled={isReadOnly}
                      className="flex items-center gap-2.5 text-left flex-1"
                    >
                      {item.completed ? (
                        <CheckSquare className="w-4 h-4 text-emerald-400 shrink-0" />
                      ) : (
                        <Square className="w-4 h-4 text-slate-500 shrink-0" />
                      )}
                      <span className={`text-xs ${item.completed ? 'line-through text-slate-500' : 'font-medium'}`}>
                        {item.title}
                      </span>
                    </button>

                    {!isReadOnly && (
                      <button
                        onClick={() => handleDeleteItem(item.id)}
                        className="p-1 text-slate-600 hover:text-red-400 transition"
                        title="Delete item"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                ))}

                {itemsInCat.length === 0 && (
                  <div className="text-xs text-slate-500 py-3 text-center">
                    No items in this category.
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
