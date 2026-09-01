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
  /** 3px timeline spine tone — decorative only, never carries meaning
   *  on its own. Runs tonally from brand through to grey. */
  spine: string;
}

export const categoryMetaMap: Record<ActivityCategory, CategoryMeta> = {
  flight: {
    label: 'Flight & Transit',
    labelZh: '航班交通',
    icon: Plane,
    spine: 'bg-spine-3'
  },
  hotel: {
    label: 'Stay & Hotel',
    labelZh: '住宿酒店',
    icon: Hotel,
    spine: 'bg-spine-2'
  },
  food: {
    label: 'Food & Dining',
    labelZh: '美食餐饮',
    icon: Utensils,
    spine: 'bg-spine-1'
  },
  sightseeing: {
    label: 'Sightseeing & Culture',
    labelZh: '观光文化',
    icon: Camera,
    spine: 'bg-spine-2'
  },
  shopping: {
    label: 'Shopping & Market',
    labelZh: '购物市集',
    icon: ShoppingBag,
    spine: 'bg-spine-3'
  },
  transport: {
    label: 'Transport & Ride',
    labelZh: '交通出行',
    icon: Car,
    spine: 'bg-spine-3'
  },
  nightlife: {
    label: 'Nightlife & Bars',
    labelZh: '夜生活酒吧',
    icon: Moon,
    spine: 'bg-spine-1'
  },
  relax: {
    label: 'Relax & Massage',
    labelZh: '放松按摩',
    icon: Sparkles,
    spine: 'bg-spine-4'
  },
  other: {
    label: 'Other Activity',
    labelZh: '其他活动',
    icon: HelpCircle,
    spine: 'bg-spine-4'
  }
};
