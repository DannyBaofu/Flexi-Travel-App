import React, { createContext, useContext, useState } from 'react';

export type Lang = 'zh' | 'en';

const LANG_STORAGE_KEY = 'travelsync-lang';

type Entry = { zh: string; en: string };

const dict: Record<string, Entry> = {
  // ---- App shell ----
  loading: { zh: '正在加载您的旅行计划…', en: 'Loading Your Travel Planner...' },
  appTagline: { zh: 'TravelSync • 安全的在线行程分享与规划', en: 'TravelSync • Safe Online Trip Sharing & Itinerary Planner' },
  tabItinerary: { zh: '每日行程', en: 'Day-by-Day Schedule' },
  tabBudget: { zh: '预算与分账', en: 'Budget & Expense Splitter' },
  tabChecklist: { zh: '行李清单', en: 'Packing & Checklist' },
  showTaxiCards: { zh: '出示打车卡', en: 'Show Taxi Cards' },

  // ---- Navbar ----
  newTrip: { zh: '新建行程', en: 'New Trip' },
  createNewTrip: { zh: '创建新行程', en: 'Create New Trip' },
  taxiCards: { zh: '打车卡', en: 'Taxi Cards' },
  showDriverTaxiCards: { zh: '向司机出示打车卡', en: 'Show Driver Taxi Cards' },
  printTitle: { zh: '打印行程或保存为 PDF', en: 'Print Itinerary or Save as PDF' },
  tripSettings: { zh: '行程设置', en: 'Trip Settings' },
  shareTrip: { zh: '分享行程', en: 'Share Trip' },
  readOnlyBanner: {
    zh: '👁️ 正在以只读模式查看共享行程。您可以浏览行程、地图和打车卡！',
    en: '👁️ Viewing Shared Itinerary in Read-Only Mode. You can browse schedule, maps, and taxi cards!'
  },

  // ---- Trip banner ----
  customizeTrip: { zh: '自定义行程', en: 'Customize Trip' },
  travelers: { zh: '{n} 位旅伴', en: '{n} Travelers' },
  totalDuration: { zh: '总天数', en: 'Total Duration' },
  daysNights: { zh: '{d} 天 {n} 夜', en: '{d} Days / {n} Nights' },
  scheduledActivities: { zh: '已安排活动', en: 'Scheduled Activities' },
  events: { zh: '{n} 项', en: '{n} Events' },
  estimatedBudget: { zh: '预算估算', en: 'Estimated Budget' },
  packingChecklist: { zh: '行李清单', en: 'Packing & Checklist' },

  // ---- Itinerary view ----
  dayN: { zh: '第 {n} 天', en: 'Day {n}' },
  activitiesCount: { zh: '{n} 项活动', en: '{n} activities' },
  activityCountOne: { zh: '1 项活动', en: '1 activity' },
  allDaysOverview: { zh: '全部总览', en: 'All Days Overview' },
  singleDayView: { zh: '单日视图', en: 'Single Day View' },
  searchPlaceholder: { zh: '搜索地点、美食、寺庙…', en: 'Search places, foods, temples...' },
  all: { zh: '全部', en: 'All' },
  dayEstCost: { zh: '当日预计花费', en: 'Day Estimated Cost' },
  addActivity: { zh: '添加活动', en: 'Add Activity' },
  mealsCount: { zh: '{n} 餐', en: '{n} meals' },
  mealCountOne: { zh: '1 餐', en: '1 meal' },
  filteredItems: { zh: '筛选结果：{n} 项', en: 'Filtered: {n} items' },
  tips: { zh: '小贴士', en: 'Tips' },
  thaiTaxiCard: { zh: '泰文打车卡', en: 'Thai Taxi Card' },
  googleMaps: { zh: '谷歌地图', en: 'Google Maps' },
  moveEarlier: { zh: '上移', en: 'Move Earlier' },
  moveLater: { zh: '下移', en: 'Move Later' },
  duplicateActivity: { zh: '复制活动', en: 'Duplicate Activity' },
  editDetails: { zh: '编辑详情', en: 'Edit Details' },
  deleteActivity: { zh: '删除活动', en: 'Delete Activity' },
  noActivities: { zh: '当日没有符合筛选条件的活动。', en: 'No scheduled activities matching filters for this day.' },
  addFirstActivity: { zh: '添加第一个活动', en: 'Add First Activity' },
  confirmDeleteActivity: { zh: '确定要从行程中删除此活动吗？', en: 'Delete this activity from your schedule?' },
  markBooked: { zh: '标记为已预订 / 已完成', en: 'Mark as booked/completed' },
  markPending: { zh: '标记为待定', en: 'Mark as pending' },

  // ---- Transport connector ----
  approxMinutes: { zh: '约 {n} 分钟', en: '~{n} min' },
  directions: { zh: '查看路线', en: 'Directions' },
  mode_bts: { zh: 'BTS 轻轨', en: 'BTS Skytrain' },
  mode_mrt: { zh: 'MRT 地铁', en: 'MRT Subway' },
  mode_boat: { zh: '渡轮', en: 'River Boat' },
  mode_taxi: { zh: '出租车 / Grab', en: 'Taxi / Grab' },
  mode_walk: { zh: '步行', en: 'Walk' },
  mode_bus: { zh: '公交车', en: 'Bus' },
  mode_train: { zh: '火车', en: 'Train' },
  mode_airportRail: { zh: '机场快线', en: 'Airport Rail Link' },

  // ---- Budget tracker ----
  totalGroupSpent: { zh: '团队总支出', en: 'Total Group Spent' },
  perPersonAverage: { zh: '人均支出', en: 'Per Person Average' },
  splitEvenly: { zh: '平均分摊给 {n} 位旅伴', en: 'Split evenly across {n} travelers' },
  quickAction: { zh: '快捷操作', en: 'Quick Action' },
  closeForm: { zh: '收起表单', en: 'Close Form' },
  logNewExpense: { zh: '记一笔支出', en: 'Log New Expense' },
  viewingSharedLedger: { zh: '正在查看共享账本', en: 'Viewing shared expense ledger' },
  addTravelExpense: { zh: '添加旅行支出', en: 'Add Travel Expense' },
  expenseDescription: { zh: '支出描述 *', en: 'Expense Description *' },
  expensePlaceholder: { zh: '例如：湄南河晚餐游船 / Grab 打车', en: 'e.g. Chao Phraya Dinner Cruise / Grab Taxi' },
  amountLabel: { zh: '金额（{cur}）*', en: 'Amount ({cur}) *' },
  rateLabel: { zh: '汇率', en: 'Rate' },
  category: { zh: '类别', en: 'Category' },
  date: { zh: '日期', en: 'Date' },
  paidBy: { zh: '付款人', en: 'Paid By' },
  splitWithLabel: { zh: '分摊人（这笔由谁分摊？）', en: 'Split With (Whose share is this?)' },
  saveExpense: { zh: '保存支出', en: 'Save Expense' },
  cancel: { zh: '取消', en: 'Cancel' },
  groupSettlement: { zh: '团队结算摘要', en: 'Group Settlement Summary' },
  settlementHint: { zh: '智能债务简化算法自动算出最简还款方案。', en: 'Smart debt simplification algorithm calculates exact repayments.' },
  allBalanced: { zh: '🎉 当前所有支出已结清！', en: '🎉 All expenses are currently balanced!' },
  individualBalances: { zh: '个人余额', en: 'Individual Balances' },
  categoryBreakdown: { zh: '类别明细', en: 'Category Breakdown' },
  expenseHistory: { zh: '支出记录', en: 'Expense History' },
  paidByLabel: { zh: '付款人', en: 'Paid by' },
  splitByN: { zh: '{n} 人分摊', en: 'Split by {n}' },
  deleteExpense: { zh: '删除支出', en: 'Delete Expense' },
  noExpensesYet: { zh: '暂无支出记录。点击上方「记一笔支出」开始记录。', en: 'No expenses logged yet. Click "Log New Expense" above to get started.' },

  // ---- Checklist ----
  checklistTitle: { zh: '行前准备与打包', en: 'Pre-Trip & Packing Readiness' },
  checklistHint: { zh: '出发前确认证件、e-SIM、曼谷穿搭与必需品都已备齐！', en: 'Ensure travel documents, e-SIM, Bangkok outfits, and essentials are ready before departure!' },
  packedCount: { zh: '已备好 {done} / {total} 项', en: '{done} of {total} packed' },
  addItem: { zh: '添加物品', en: 'Add Item' },
  checklistPlaceholder: { zh: '添加新物品（如：雨伞、泰铢现金、充电宝）…', en: 'Add new item (e.g. Umbrella, Extra THB cash, Power bank)...' },
  noItemsInCategory: { zh: '此类别暂无物品。', en: 'No items in this category.' },
  deleteItem: { zh: '删除物品', en: 'Delete item' },
  cat_documents: { zh: '证件与钱财', en: 'Documents & Money' },
  cat_electronics: { zh: '电子产品', en: 'Electronics' },
  cat_clothes: { zh: '衣物', en: 'Clothes' },
  cat_toiletries: { zh: '洗漱与药品', en: 'Toiletries & Medicine' },
  cat_bangkok: { zh: '曼谷专属', en: 'Bangkok Specific' },
  cat_essentials: { zh: '必需品', en: 'Essentials' },

  // ---- Shared trip / passcode ----
  sharedTrip: { zh: '共享行程', en: 'Shared Trip' }
};

function interpolate(template: string, params?: Record<string, string | number>): string {
  if (!params) return template;
  return template.replace(/\{(\w+)\}/g, (_, key) => String(params[key] ?? `{${key}}`));
}

// Weekday translation: data stores English weekday strings like "Monday (5th)"
const weekdayZh: Record<string, string> = {
  Monday: '星期一',
  Tuesday: '星期二',
  Wednesday: '星期三',
  Thursday: '星期四',
  Friday: '星期五',
  Saturday: '星期六',
  Sunday: '星期日'
};

export function translateWeekday(dayOfWeek: string, lang: Lang): string {
  if (lang !== 'zh') return dayOfWeek;
  let result = dayOfWeek;
  for (const [en, zh] of Object.entries(weekdayZh)) {
    result = result.replace(en, zh);
  }
  return result;
}

interface I18nContextValue {
  lang: Lang;
  setLang: (lang: Lang) => void;
  t: (key: string, params?: Record<string, string | number>) => string;
}

const I18nContext = createContext<I18nContextValue>({
  lang: 'zh',
  setLang: () => {},
  t: (key) => key
});

export const I18nProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [lang, setLangState] = useState<Lang>(() => {
    try {
      const stored = localStorage.getItem(LANG_STORAGE_KEY);
      if (stored === 'zh' || stored === 'en') return stored;
    } catch { /* storage unavailable */ }
    return 'zh';
  });

  const setLang = (next: Lang) => {
    setLangState(next);
    try {
      localStorage.setItem(LANG_STORAGE_KEY, next);
    } catch { /* storage unavailable */ }
  };

  const t = (key: string, params?: Record<string, string | number>) => {
    const entry = dict[key];
    if (!entry) return key;
    return interpolate(entry[lang], params);
  };

  return (
    <I18nContext.Provider value={{ lang, setLang, t }}>
      {children}
    </I18nContext.Provider>
  );
};

// eslint-disable-next-line react-refresh/only-export-components
export function useI18n(): I18nContextValue {
  return useContext(I18nContext);
}
