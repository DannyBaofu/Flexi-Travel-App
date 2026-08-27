import { 
  Plane, 
  Hotel, 
  Utensils, 
  Camera, 
  ShoppingBag, 
  Car, 
  Moon, 
  Sparkles, 
  HelpCircle
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import type { ActivityCategory } from '../types/travel';

export interface CategoryMeta {
  label: string;
  icon: LucideIcon;
  bgColor: string;
  textColor: string;
  borderColor: string;
  badgeBg: string;
}

export const categoryMetaMap: Record<ActivityCategory, CategoryMeta> = {
  flight: {
    label: 'Flight & Transit',
    icon: Plane,
    bgColor: 'bg-sky-500/10',
    textColor: 'text-sky-400',
    borderColor: 'border-sky-500/30',
    badgeBg: 'bg-sky-500/20'
  },
  hotel: {
    label: 'Stay & Hotel',
    icon: Hotel,
    bgColor: 'bg-indigo-500/10',
    textColor: 'text-indigo-400',
    borderColor: 'border-indigo-500/30',
    badgeBg: 'bg-indigo-500/20'
  },
  food: {
    label: 'Food & Dining',
    icon: Utensils,
    bgColor: 'bg-amber-500/10',
    textColor: 'text-amber-400',
    borderColor: 'border-amber-500/30',
    badgeBg: 'bg-amber-500/20'
  },
  sightseeing: {
    label: 'Sightseeing & Culture',
    icon: Camera,
    bgColor: 'bg-emerald-500/10',
    textColor: 'text-emerald-400',
    borderColor: 'border-emerald-500/30',
    badgeBg: 'bg-emerald-500/20'
  },
  shopping: {
    label: 'Shopping & Market',
    icon: ShoppingBag,
    bgColor: 'bg-pink-500/10',
    textColor: 'text-pink-400',
    borderColor: 'border-pink-500/30',
    badgeBg: 'bg-pink-500/20'
  },
  transport: {
    label: 'Transport & Ride',
    icon: Car,
    bgColor: 'bg-blue-500/10',
    textColor: 'text-blue-400',
    borderColor: 'border-blue-500/30',
    badgeBg: 'bg-blue-500/20'
  },
  nightlife: {
    label: 'Nightlife & Bars',
    icon: Moon,
    bgColor: 'bg-purple-500/10',
    textColor: 'text-purple-400',
    borderColor: 'border-purple-500/30',
    badgeBg: 'bg-purple-500/20'
  },
  relax: {
    label: 'Relax & Massage',
    icon: Sparkles,
    bgColor: 'bg-teal-500/10',
    textColor: 'text-teal-400',
    borderColor: 'border-teal-500/30',
    badgeBg: 'bg-teal-500/20'
  },
  other: {
    label: 'Other Activity',
    icon: HelpCircle,
    bgColor: 'bg-slate-500/10',
    textColor: 'text-slate-400',
    borderColor: 'border-slate-500/30',
    badgeBg: 'bg-slate-500/20'
  }
};
