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
  labelZh: string;
  icon: LucideIcon;
  bgColor: string;
  textColor: string;
  borderColor: string;
  badgeBg: string;
}

export const categoryMetaMap: Record<ActivityCategory, CategoryMeta> = {
  flight: {
    label: 'Flight & Transit',
    labelZh: '航班交通',
    icon: Plane,
    bgColor: 'bg-sky-500/10',
    textColor: 'text-sky-400',
    borderColor: 'border-sky-500/30',
    badgeBg: 'bg-sky-500/20'
  },
  hotel: {
    label: 'Stay & Hotel',
    labelZh: '住宿酒店',
    icon: Hotel,
    bgColor: 'bg-indigo-500/10',
    textColor: 'text-indigo-400',
    borderColor: 'border-indigo-500/30',
    badgeBg: 'bg-indigo-500/20'
  },
  food: {
    label: 'Food & Dining',
    labelZh: '美食餐饮',
    icon: Utensils,
    bgColor: 'bg-amber-500/10',
    textColor: 'text-amber-400',
    borderColor: 'border-amber-500/30',
    badgeBg: 'bg-amber-500/20'
  },
  sightseeing: {
    label: 'Sightseeing & Culture',
    labelZh: '观光文化',
    icon: Camera,
    bgColor: 'bg-emerald-500/10',
    textColor: 'text-emerald-400',
    borderColor: 'border-emerald-500/30',
    badgeBg: 'bg-emerald-500/20'
  },
  shopping: {
    label: 'Shopping & Market',
    labelZh: '购物市集',
    icon: ShoppingBag,
    bgColor: 'bg-pink-500/10',
    textColor: 'text-pink-400',
    borderColor: 'border-pink-500/30',
    badgeBg: 'bg-pink-500/20'
  },
  transport: {
    label: 'Transport & Ride',
    labelZh: '交通出行',
    icon: Car,
    bgColor: 'bg-blue-500/10',
    textColor: 'text-blue-400',
    borderColor: 'border-blue-500/30',
    badgeBg: 'bg-blue-500/20'
  },
  nightlife: {
    label: 'Nightlife & Bars',
    labelZh: '夜生活酒吧',
    icon: Moon,
    bgColor: 'bg-purple-500/10',
    textColor: 'text-purple-400',
    borderColor: 'border-purple-500/30',
    badgeBg: 'bg-purple-500/20'
  },
  relax: {
    label: 'Relax & Massage',
    labelZh: '放松按摩',
    icon: Sparkles,
    bgColor: 'bg-teal-500/10',
    textColor: 'text-teal-400',
    borderColor: 'border-teal-500/30',
    badgeBg: 'bg-teal-500/20'
  },
  other: {
    label: 'Other Activity',
    labelZh: '其他活动',
    icon: HelpCircle,
    bgColor: 'bg-slate-500/10',
    textColor: 'text-slate-400',
    borderColor: 'border-slate-500/30',
    badgeBg: 'bg-slate-500/20'
  }
};
