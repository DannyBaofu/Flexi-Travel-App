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
import type { Trip, ChecklistItem, TripRole } from '../types/travel';
import { useI18n } from '../utils/i18n';
import { card, btnPrimarySm, input, select, money } from './ui';

interface ChecklistTabProps {
  trip: Trip;
  onUpdateTrip: (updatedTrip: Trip) => void;
  role: TripRole;
}

const CATEGORY_T_KEYS: Record<string, string> = {
  'Documents & Money': 'cat_documents',
  'Electronics': 'cat_electronics',
  'Clothes': 'cat_clothes',
  'Toiletries & Medicine': 'cat_toiletries',
  'Bangkok Specific': 'cat_bangkok',
  'Essentials': 'cat_essentials'
};

const CATEGORY_ICONS: Record<string, React.ElementType> = {
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
  role
}) => {
  const { t } = useI18n();
  const isAdmin = role === 'admin';
  const isReadOnly = role === 'viewer';
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
    // Celebration should not be mandatory.
    try {
      if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return;
      confetti({
        particleCount: 80,
        spread: 60,
        origin: { y: 0.8 },
        colors: ['#3930DB', '#8B85EC', '#8A5D0B', '#EDECFD']
      });
    } catch {
      // Ignore if not loaded
    }
  };

  const handleToggle = (itemId: string) => {
    if (isReadOnly) return;
    const target = trip.checklist?.find(c => c.id === itemId);
    const willBeCompleted = target ? !target.completed : false;

    const updated = (trip.checklist || []).map(item =>
      item.id === itemId ? { ...item, completed: !item.completed } : item
    );

    onUpdateTrip({ ...trip, checklist: updated });

    if (willBeCompleted) triggerConfetti();
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

    onUpdateTrip({ ...trip, checklist: [...(trip.checklist || []), newItem] });
    setNewItemTitle('');
  };

  const handleDeleteItem = (itemId: string) => {
    if (!isAdmin) return;
    onUpdateTrip({ ...trip, checklist: (trip.checklist || []).filter(c => c.id !== itemId) });
  };

  const totalItems = trip.checklist?.length || 0;
  const completedItems = trip.checklist?.filter(c => c.completed).length || 0;
  const progressPercent = totalItems > 0 ? Math.round((completedItems / totalItems) * 100) : 0;

  return (
    <div className="space-y-4">
      {/* Progress header */}
      <div className={`${card} px-4 py-3 flex items-center gap-3`}>
        <Luggage className="w-4 h-4 text-muted shrink-0" />
        <span className="text-sm font-semibold text-ink shrink-0">{t('checklistTitle')}</span>
        <div className="flex-1 bg-mist rounded-full h-1.5 overflow-hidden">
          <div
            className="bg-brand h-full rounded-full transition-all duration-500"
            style={{ width: `${progressPercent}%` }}
          />
        </div>
        <span className={`text-xs font-semibold text-ink shrink-0 ${money}`}>{progressPercent}%</span>
        <span className={`text-[11px] text-muted shrink-0 hidden sm:inline ${money}`}>
          {t('packedCount', { done: completedItems, total: totalItems })}
        </span>
      </div>

      {/* Add item */}
      {!isReadOnly && (
        <form onSubmit={handleAddItem} className={`${card} p-3 flex flex-col sm:flex-row gap-2`}>
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value as ChecklistItem['category'])}
            className={`${select} sm:w-auto shrink-0`}
          >
            {categories.map(cat => (
              <option key={cat} value={cat}>{t(CATEGORY_T_KEYS[cat] || cat)}</option>
            ))}
          </select>

          <input
            type="text"
            value={newItemTitle}
            onChange={(e) => setNewItemTitle(e.target.value)}
            placeholder={t('checklistPlaceholder')}
            className={`${input} flex-1`}
          />

          <button type="submit" className={`${btnPrimarySm} shrink-0 py-2.5`}>
            <Plus className="w-4 h-4" /> {t('addItem')}
          </button>
        </form>
      )}

      {totalItems === 0 && (
        <div className="text-center py-10 border border-dashed border-hairline rounded-card bg-paper">
          <p className="text-sm text-muted">{t('noChecklistItems')}</p>
        </div>
      )}

      {/* Categorized lists */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {categories.map(cat => {
          const itemsInCat = (trip.checklist || []).filter(item => item.category === cat);
          if (itemsInCat.length === 0) return null;

          const Icon = CATEGORY_ICONS[cat] || Luggage;
          const completedInCat = itemsInCat.filter(i => i.completed).length;
          const catPercent = Math.round((completedInCat / itemsInCat.length) * 100);

          // Done work sinks; what is left is always what you see first.
          const ordered = [
            ...itemsInCat.filter(i => !i.completed),
            ...itemsInCat.filter(i => i.completed)
          ];

          return (
            <div key={cat} className={`${card} p-4 space-y-3`}>
              <div className="space-y-2 pb-1">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <Icon className="w-4 h-4 text-muted shrink-0" />
                    <h3 className="text-sm font-semibold text-ink truncate">
                      {t(CATEGORY_T_KEYS[cat] || cat)}
                    </h3>
                  </div>
                  <span className={`text-xs text-muted shrink-0 ${money}`}>
                    {completedInCat}/{itemsInCat.length}
                  </span>
                </div>
                {/* A 2px bar scans faster than "3 / 8" */}
                <div className="w-full bg-mist rounded-full h-[3px] overflow-hidden">
                  <div
                    className="bg-brand h-full rounded-full transition-all duration-300"
                    style={{ width: `${catPercent}%` }}
                  />
                </div>
              </div>

              <div className="space-y-0.5">
                {ordered.map(item => (
                  <div
                    key={item.id}
                    className={`flex items-center gap-1 rounded-control transition ${
                      item.completed ? 'opacity-55' : ''
                    }`}
                  >
                    <button
                      type="button"
                      onClick={() => handleToggle(item.id)}
                      disabled={isReadOnly}
                      className="flex items-center gap-2.5 text-left flex-1 min-h-[44px] px-2 rounded-control hover:bg-mist disabled:hover:bg-transparent transition"
                    >
                      {item.completed ? (
                        <CheckSquare className="w-4 h-4 text-brand shrink-0" />
                      ) : (
                        <Square className="w-4 h-4 text-faint shrink-0" />
                      )}
                      <span className={`text-sm ${item.completed ? 'line-through text-muted' : 'text-ink'}`}>
                        {item.title}
                      </span>
                    </button>

                    {isAdmin && (
                      <button
                        onClick={() => handleDeleteItem(item.id)}
                        className="w-10 h-10 inline-flex items-center justify-center rounded-control text-faint hover:text-clay hover:bg-clay-tint transition shrink-0"
                        title={t('deleteItem')}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
