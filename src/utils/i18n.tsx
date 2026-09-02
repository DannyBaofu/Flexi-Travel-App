import React, { createContext, useContext, useState, useEffect } from 'react';

export type Lang = 'zh' | 'en';

const LANG_STORAGE_KEY = 'travelsync-lang';

type Entry = { zh: string; en: string };

const dict: Record<string, Entry> = {
  // ---- App shell ----
  appTagline: { zh: '旅行行程规划', en: 'Travel Itinerary Planner' },
  tabItinerary: { zh: '每日行程', en: 'Day-by-Day Schedule' },
  tabBudget: { zh: '预算与分账', en: 'Budget & Expense Splitter' },

  // ---- Navbar ----
  createNewTrip: { zh: '创建新行程', en: 'Create New Trip' },
  printTitle: { zh: '打印行程或保存为 PDF', en: 'Print Itinerary or Save as PDF' },
  tripSettings: { zh: '行程设置', en: 'Trip Settings' },
  shareTrip: { zh: '分享行程', en: 'Share Trip' },
  // Kept to one line: this banner sits above every screen on a phone
  readOnlyBanner: {
    zh: '只读模式 · 可以浏览，不能修改',
    en: 'Read-only · browse, but no edits'
  },

  // ---- Trip banner ----
  customizeTrip: { zh: '自定义行程', en: 'Customize Trip' },
  travelers: { zh: '{n} 位旅伴', en: '{n} Travelers' },
  daysNights: { zh: '{d} 天 {n} 夜', en: '{d} Days / {n} Nights' },
  events: { zh: '{n} 项', en: '{n} Events' },

  // ---- Itinerary view ----
  dayN: { zh: '第 {n} 天', en: 'Day {n}' },
  activitiesCount: { zh: '{n} 项活动', en: '{n} activities' },
  activityCountOne: { zh: '1 项活动', en: '1 activity' },
  allDaysOverview: { zh: '全部总览', en: 'All Days Overview' },
  singleDayView: { zh: '单日视图', en: 'Single Day View' },
  searchPlaceholder: { zh: '搜索地点、美食、寺庙…', en: 'Search places, foods, temples...' },
  all: { zh: '全部', en: 'All' },
  addActivity: { zh: '添加活动', en: 'Add Activity' },
  filteredItems: { zh: '筛选结果：{n} 项', en: 'Filtered: {n} items' },
  tips: { zh: '小贴士', en: 'Tips' },
  googleMaps: { zh: '谷歌地图', en: 'Google Maps' },
  moveEarlier: { zh: '上移', en: 'Move Earlier' },
  moveLater: { zh: '下移', en: 'Move Later' },
  duplicateActivity: { zh: '复制活动', en: 'Duplicate Activity' },
  editDetails: { zh: '编辑详情', en: 'Edit Details' },
  deleteActivity: { zh: '删除活动', en: 'Delete Activity' },
  noActivities: { zh: '当日没有符合筛选条件的活动。', en: 'No scheduled activities matching filters for this day.' },
  addFirstActivity: { zh: '添加第一个活动', en: 'Add First Activity' },
  confirmDeleteActivity: { zh: '确定要从行程中删除此活动吗？', en: 'Delete this activity from your schedule?' },
  // Short enough to sit in a chip on a 375px row

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
  splitEvenly: { zh: '平均分摊给 {n} 位旅伴', en: 'Split evenly across {n} travelers' },
  closeForm: { zh: '收起表单', en: 'Close Form' },
  logNewExpense: { zh: '记一笔支出', en: 'Log New Expense' },
  viewingSharedLedger: { zh: '正在查看共享账本', en: 'Viewing shared expense ledger' },
  expenseAmountQ: { zh: '花了多少？', en: 'How much?' },
  expenseWhatFor: { zh: '这笔是什么？', en: 'What was it for?' },
  expenseNoteOptional: { zh: '备注（可选）', en: 'Note (optional)' },
  expensePlaceholder: { zh: '例如：湄南河晚餐游船', en: 'e.g. Chao Phraya dinner cruise' },
  expenseMoreOptions: { zh: '更多选项', en: 'More options' },
  expensePaidByYou: { zh: '你付的', en: 'You paid' },
  expensePaidByOther: { zh: '{name} 付的', en: '{name} paid' },
  expenseYesterday: { zh: '昨天', en: 'Yesterday' },
  youLabel: { zh: '你', en: 'You' },
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
  splitByN: { zh: '{n} 人分摊', en: 'Split by {n}' },
  deleteExpense: { zh: '删除支出', en: 'Delete Expense' },
  noExpensesYet: { zh: '还没有记过支出。', en: 'No expenses logged yet.' },

  // ---- Checklist ----
  deleteItem: { zh: '删除物品', en: 'Delete item' },

  // ---- Expand/collapse ----

  // ---- Document ----
  docTitle: { zh: 'TravelSync - 行程规划与分享', en: 'TravelSync - Customizable Trip Planner & Sharing' },

  // ---- Activity modal ----
  editActivity: { zh: '编辑活动', en: 'Edit Activity' },
  addNewActivity: { zh: '添加新活动', en: 'Add New Activity' },
  daySchedule: { zh: '所属日程', en: 'Day Schedule' },
  time: { zh: '时间', en: 'Time' },
  activityTitleLabel: { zh: '活动名称 *', en: 'Activity Title *' },
  locationVenue: { zh: '地点 / 场所名称', en: 'Location / Venue Name' },
  estCostLabel: { zh: '预计花费（{cur}）', en: 'Estimated Cost ({cur})' },
  notesTips: { zh: '备注、小贴士与提醒', en: 'Notes, Tips & Reminders' },
  saveChanges: { zh: '保存修改', en: 'Save Changes' },

  // ---- New trip modal ----
  newTripSubtitle: { zh: '填写基本信息，稍后再添加每天的活动', en: 'Fill in the basics — add daily activities afterwards' },
  tripNameRequired: { zh: '行程名称 *', en: 'Trip Name *' },
  tripNamePlaceholder: { zh: '例如：曼谷之旅 2026', en: 'e.g. Bangkok Getaway 2026' },
  destinationCity: { zh: '目的地城市 *', en: 'Destination City *' },
  country: { zh: '国家', en: 'Country' },
  startDate: { zh: '开始日期', en: 'Start Date' },
  endDate: { zh: '结束日期', en: 'End Date' },
  destCurrencyCode: { zh: '目的地货币（代码）', en: 'Destination Currency (Code)' },
  createTrip: { zh: '创建行程', en: 'Create Trip' },

  // ---- Share modal ----
  safeShare: { zh: '安全分享给朋友', en: 'Safe Share with Friends' },
  shareSubtitle: { zh: '即时分享链接，支持 PIN 密码锁与离线二维码', en: 'Instant share link with PIN lock & offline QR code' },
  sharingPermissions: { zh: '分享权限与安全', en: 'Sharing Permissions & Security' },
  viewerReadOnly: { zh: '仅查看（只读）', en: 'Viewer (Read-Only)' },
  viewerDesc: { zh: '朋友只能查看行程和地图', en: 'Friends can only view schedule & maps' },
  copied: { zh: '已复制！', en: 'Copied!' },
  copyLink: { zh: '复制链接', en: 'Copy Link' },
  backupImport: { zh: '备份与导入行程', en: 'Backup & Import Itinerary' },
  exportJson: { zh: '导出行程 (.json)', en: 'Export Itinerary (.json)' },
  importJson: { zh: '导入行程 (.json)', en: 'Import Itinerary (.json)' },
  importSuccess: { zh: '行程导入成功！', en: 'Trip imported successfully!' },
  done: { zh: '完成', en: 'Done' },

  // ---- Taxi cards modal ----

  // ---- Trip settings modal ----
  tripSettingsTitle: { zh: '行程设置与自定义', en: 'Trip Settings & Customization' },
  tripSettingsSubtitle: { zh: '管理目的地、日期、货币与旅伴', en: 'Manage trip destination, dates, currency, and travelers' },
  generalInfo: { zh: '基本信息', en: 'General Information' },
  tripNameLabel: { zh: '行程名称', en: 'Trip Name' },
  destinationCityLabel: { zh: '目的地城市', en: 'Destination City' },
  travelDates: { zh: '出行日期', en: 'Travel Dates' },
  currenciesRate: { zh: '货币与汇率', en: 'Currencies & Exchange Rate' },
  destCurrencyLabel: { zh: '目的地货币', en: 'Destination Currency' },
  homeCurrencyLabel: { zh: '本国货币', en: 'Home Currency' },
  travelersCompanions: { zh: '旅伴', en: 'Travelers & Companions' },
  addFriendPlaceholder: { zh: '添加朋友姓名（例如 David）', en: 'Add friend name (e.g. David)' },
  add: { zh: '添加', en: 'Add' },
  coverPhoto: { zh: '封面图片', en: 'Cover Photo Banner' },
  deleteTrip: { zh: '删除行程', en: 'Delete Trip' },
  confirmDeleteTrip: { zh: '确定要删除「{title}」吗？', en: 'Are you sure you want to delete "{title}"?' },
  saveSettings: { zh: '保存设置', en: 'Save Settings' },

  // ---- Passcode modal ----
  passcodeTitle: { zh: '受密码保护的行程', en: 'Passcode Protected Itinerary' },
  passcodeDescPrefix: { zh: '组织者已为', en: 'The organizer has protected' },
  passcodeDescSuffix: { zh: '设置了安全 PIN 码。', en: 'with a security PIN.' },
  enterPin: { zh: '输入 PIN 密码', en: 'Enter PIN Passcode' },
  wrongPin: { zh: 'PIN 码不正确，请询问行程组织者。', en: 'Incorrect PIN code. Please ask the trip organizer.' },
  unlock: { zh: '解锁行程', en: 'Unlock Itinerary' },

  // ---- Print view ----
  printTravelers: { zh: '旅伴', en: 'Travelers' },
  printCurrency: { zh: '货币', en: 'Currency' },

  // ---- Roles ----
  memberBanner: {
    zh: '旅伴模式 · 可添加活动、记支出、勾清单',
    en: 'Member · add activities, log expenses, tick items'
  },
  shareAsAdmin: { zh: '管理员（完全控制）', en: 'Admin (Full Control)' },
  shareAsAdminDesc: { zh: '行程设置、删除、旅伴管理等全部权限', en: 'Full access: settings, deletions, manage travelers' },
  shareAsMember: { zh: '旅伴（基础编辑）', en: 'Member (Basic Edits)' },
  shareAsMemberDesc: { zh: '可编辑活动、勾选清单、记录支出', en: 'Can edit activities, tick checklists, log expenses' },
  memberShareNote: { zh: '只有管理员可以创建可编辑的分享链接，您可以分享只读链接。', en: 'Only the admin can create editable share links. You can share a read-only link.' },

  // ---- Cloud sync & auth ----
  signIn: { zh: '登录', en: 'Sign In' },
  signOut: { zh: '退出登录', en: 'Sign Out' },
  signInTitle: { zh: '登录云同步', en: 'Sign in to Cloud Sync' },
  signInSubtitle: { zh: '登录后行程可实时同步给所有旅伴', en: 'Sign in to sync trips live with all travelers' },
  authTabSignIn: { zh: '登录', en: 'Sign In' },
  authTabFirstTime: { zh: '首次使用', en: 'First Time' },
  authIdLabel: { zh: '账号 ID', en: 'Account ID' },
  authIdPlaceholder: { zh: '例如：danny', en: 'e.g. danny' },
  authIdHint: { zh: '由行程组织者提供，3–20 个字符，仅限小写字母、数字、. _ -', en: 'Given to you by the trip organizer. 3–20 characters: lowercase letters, numbers, . _ -' },
  authPasswordLabel: { zh: '密码', en: 'Password' },
  authPasswordPlaceholder: { zh: '输入组织者给你的密码', en: 'Enter the password you were given' },
  authSignInHint: { zh: '用行程组织者给你的账号 ID 和密码登录，登录后行程会实时同步。', en: 'Sign in with the ID and password the trip organizer gave you. Your trip then syncs live.' },
  authFirstTimeHint: { zh: '第一次使用请在这里建立账号：填入组织者给你的账号 ID 和密码即可，无需邮箱。', en: 'First time here? Set up your account with the exact ID and password the organizer gave you. No email needed.' },
  authSignInBtn: { zh: '登录', en: 'Sign In' },
  authCreateBtn: { zh: '建立账号并登录', en: 'Create Account & Sign In' },
  authWorking: { zh: '处理中…', en: 'Working…' },
  authBadId: { zh: '账号 ID 格式不正确：3–20 个字符，仅限小写字母、数字、. _ -', en: 'Invalid ID format: 3–20 characters, lowercase letters, numbers, . _ - only.' },
  authPasswordTooShort: { zh: '密码至少需要 {n} 个字符。', en: 'Password must be at least {n} characters.' },
  authWrongCredentials: { zh: '账号 ID 或密码不正确。若是第一次使用，请切换到「首次使用」建立账号。', en: 'Wrong ID or password. If this is your first time, switch to "First Time" to create the account.' },
  authIdTaken: { zh: '这个账号 ID 已经建立过了，请切换到「登录」。', en: 'That ID already exists — switch to "Sign In" instead.' },
  authTooManyTries: { zh: '尝试次数过多，请稍等几分钟再试。', en: 'Too many attempts. Please wait a few minutes and try again.' },
  authOffline: { zh: '连不上服务器，请检查网络后再试。', en: 'Cannot reach the server. Check your connection and try again.' },
  authConfirmEmailOn: { zh: '账号已建立，但云端仍要求邮箱验证。请组织者到 Supabase 后台关闭 Confirm email。', en: 'Account created, but the cloud still requires email confirmation. Ask the organizer to turn off "Confirm email" in Supabase.' },
  authFailed: { zh: '登录失败：{msg}', en: 'Sign-in failed: {msg}' },
  confirmSignOut: { zh: '确定退出登录？退出后将回到本地模式。', en: 'Sign out? You will return to local-only mode.' },
  inviteSection: { zh: '实时协作邀请（云同步）', en: 'Live Collaboration Invite (Cloud)' },
  createInviteBtn: { zh: '创建邀请链接', en: 'Create Invite Link' },
  creatingInvite: { zh: '创建中…', en: 'Creating…' },
  inviteHint: { zh: '朋友打开链接并登录后，即可实时同步这份行程 — 管理员的修改会即时出现在所有人手机上。', en: 'Friends who open this link and sign in will sync this trip live — admin edits appear on everyone’s phone instantly.' },
  inviteRequiresLogin: { zh: '登录后（右上角）即可创建实时邀请链接。', en: 'Sign in (top right) to create live invite links.' },
  joiningTrip: { zh: '正在加入行程…', en: 'Joining trip…' },
  joinFailed: { zh: '加入行程失败：{msg}', en: 'Failed to join trip: {msg}' },
  joinNeedsCloud: { zh: '这个邀请链接需要云同步，但本站尚未启用云同步。', en: 'This invite link needs cloud sync, which is not enabled on this site yet.' },
  inviteShortBadge: { zh: '短链接 · {n} 个字符', en: 'Short link · {n} characters' },
  inviteCodeLabel: { zh: '邀请码', en: 'Invite code' },
  inviteCodeHint: { zh: '朋友也可以直接输入这个邀请码，不一定要点链接。', en: 'Friends can also type this code in instead of tapping the link.' },
  inviteNewLink: { zh: '再建一个邀请链接', en: 'Create another invite link' },
  cloudOffNotice: {
    zh: '云同步尚未启用，所以目前只能用长快照链接分享，而且行程只保存在这台设备的浏览器里。',
    en: 'Cloud sync is not set up yet, so sharing only works through long snapshot links and trips are stored only in this browser.'
  },

  // ---- Phrasebook ----
  tabPhrases: { zh: '泰语速查', en: 'Thai Phrases' },
  phrasesHint: { zh: '直接把泰文大字出示给当地人看也可以！小贴士：男生句尾加 "krap (ครับ)"、女生加 "ka (ค่ะ)" 更有礼貌。', en: 'You can simply show the big Thai text to locals! Tip: men end sentences with "krap (ครับ)", women with "ka (ค่ะ)" to be polite.' },

  // ---- Live exchange rate ----

  // ---- Empty state ----
  emptyTitle: { zh: '还没有行程', en: 'No trips yet' },
  emptyHint: { zh: '创建你的第一个行程，开始安排每天的活动、预算和行李清单。', en: 'Create your first trip to start planning days, budget and packing.' },
  createFirstTrip: { zh: '创建第一个行程', en: 'Create Your First Trip' },

  // ---- Bottom tab bar (short labels — four across a 375px screen) ----
  tabItineraryShort: { zh: '行程', en: 'Plan' },
  tabBudgetShort: { zh: '预算', en: 'Budget' },
  tabPhrasesShort: { zh: '泰语', en: 'Thai' },

  // ---- Shared controls ----
  close: { zh: '关闭', en: 'Close' },
  more: { zh: '更多', en: 'More' },

  // ---- Invite code entry on the first screen ----
  haveInviteCode: { zh: '朋友给了你邀请码？', en: 'Got an invite code from a friend?' },
  inviteCodePlaceholder: { zh: '例如 AB3F7K', en: 'e.g. AB3F7K' },
  joinWithCode: { zh: '加入行程', en: 'Join Trip' },
  emptyOr: { zh: '或者', en: 'or' },

  // ---- Itinerary ----
  todayBadge: { zh: '今天', en: 'Today' },
  dayTotalLabel: { zh: '当日合计', en: 'Day total' },
  clearFilter: { zh: '清除筛选', en: 'Clear filter' },

  // ---- Budget: the personal answer comes first ----
  yourBalance: { zh: '你的余额', en: 'Your balance' },
  youAreOwed: { zh: '大家欠你', en: 'You are owed' },
  youOwe: { zh: '你需要付', en: 'You owe' },
  youAreSettled: { zh: '已结清，不欠不欠', en: 'All settled — nothing to pay' },
  whoAreYou: { zh: '你是哪一位？', en: 'Which one are you?' },
  pickYourselfHint: { zh: '选一下你自己，就能直接看到该收或该付多少。', en: 'Pick yourself to see what you owe or are owed.' },
  settleTheyPayYou: { zh: '{name} 付给你', en: '{name} pays you' },
  settleYouPay: { zh: '你付给 {name}', en: 'You pay {name}' },
  settlePersonToPerson: { zh: '{from} 付给 {to}', en: '{from} pays {to}' },
  groupTotalLabel: { zh: '全队总花费', en: 'Group total' },
  changePerson: { zh: '不是我', en: 'Not me' },

  // ---- Thai phrases: show mode ----
  tapPhraseHint: { zh: '点任意一句，放大出示给当地人看。', en: 'Tap any phrase to show it full-size to someone.' },
  showToLocal: { zh: '出示给对方看', en: 'Show this to them' },

  // ---- Shared cash pot ----
  kittyStart: { zh: '开一个公共基金', en: 'Start a shared fund' },
  kittyStartHint: { zh: '大家先各交一笔钱交给一个人保管，餐费直接从里面出。', en: 'Everyone hands one person the same amount up front, and spending comes out of the pot.' },
  kittyRemaining: { zh: '基金还剩', en: 'Left in the fund' },
  kittyUsedOf: { zh: '已用 {used} / 共 {total}', en: '{used} of {total} used' },
  kittyPotLine: { zh: '{n} 人 × {per}', en: '{n} people × {per}' },
  kittyHeldBy: { zh: '{name} 保管', en: 'held by {name}' },
  kittyNoHolder: { zh: '还没指定保管人', en: 'no holder set yet' },
  kittyAllCollected: { zh: '已收齐', en: 'all collected' },
  kittyWaitingOn: { zh: '还差 {names} 没交', en: 'still waiting on {names}' },
  kittyLow: { zh: '基金快用完了。', en: 'The fund is running low.' },
  kittyExhausted: { zh: '基金已经用完了，之后的支出回到大家分摊。', en: 'The fund is spent — later spending goes back to being split.' },
  // Follows the activityCountOne / activitiesCount pattern used elsewhere
  kittySplitBackOne: { zh: '有 1 笔基金付不起，已回到大家分摊。', en: 'One bill the fund could not cover went back to being split.' },
  kittySplitBack: { zh: '有 {n} 笔基金付不起，已回到大家分摊。', en: '{n} bills the fund could not cover went back to being split.' },
  kittyFromFund: { zh: '公基金', en: 'From fund' },
  kittySettings: { zh: '基金设置', en: 'Fund settings' },
  kittyPerPerson: { zh: '每人交多少（{cur}）', en: 'Amount per person ({cur})' },
  kittyHolder: { zh: '谁保管这笔钱', en: 'Who holds the money' },
  kittyCovers: { zh: '基金支付哪些类别', en: 'What the fund pays for' },
  kittyWhoPaidIn: { zh: '谁已经交了', en: 'Who has handed it over' },
  kittyTurnOff: { zh: '关闭基金', en: 'Turn off the fund' },
  kittyConfirmOff: { zh: '关闭公共基金？之前由基金支付的支出会回到大家分摊。', en: 'Turn off the shared fund? Expenses it covered will go back to being split.' },

  // ---- Place suggestions ----
  noPlacesFound: { zh: '没有找到地点，直接输入名字也可以。', en: 'No places found — you can just type the name.' },

  // ---- Personal spending (kept apart from the shared fund) ----
  personalSection: { zh: '我的花费', en: 'My spending' },
  personalPickHint: { zh: '选一下你是谁，就能看到你的花费', en: 'Pick who you are to see your own spending' },
  personalPaidOut: { zh: '你垫付的', en: 'You paid out' },
  personalYourShare: { zh: '你应分摊', en: 'Your share' },

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

  // Keep the browser tab title and <html lang> in sync with the UI language
  useEffect(() => {
    document.title = dict.docTitle[lang];
    document.documentElement.lang = lang === 'zh' ? 'zh-CN' : 'en';
  }, [lang]);

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
