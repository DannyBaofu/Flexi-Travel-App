import React, { createContext, useContext, useState, useEffect } from 'react';

export type Lang = 'zh' | 'en';

const LANG_STORAGE_KEY = 'travelsync-lang';

type Entry = { zh: string; en: string };

const dict: Record<string, Entry> = {
  // ---- App shell ----
  appTagline: { zh: '旅行行程规划', en: 'Travel Itinerary Planner' },
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

  // ---- Expand/collapse ----
  expandAll: { zh: '全部展开', en: 'Expand All' },
  collapseAll: { zh: '全部收起', en: 'Collapse All' },

  // ---- Document ----
  docTitle: { zh: 'TravelSync - 行程规划与分享', en: 'TravelSync - Customizable Trip Planner & Sharing' },

  // ---- Activity modal ----
  editActivity: { zh: '编辑活动', en: 'Edit Activity' },
  addNewActivity: { zh: '添加新活动', en: 'Add New Activity' },
  activityModalSubtitle: { zh: '自定义详情、地图与当地地址', en: 'Customize details, maps, and local addresses' },
  daySchedule: { zh: '所属日程', en: 'Day Schedule' },
  time: { zh: '时间', en: 'Time' },
  timePlaceholder: { zh: '例如 09:30 AM', en: 'e.g. 09:30 AM' },
  activityTitleLabel: { zh: '活动名称 *', en: 'Activity Title *' },
  activityTitlePlaceholder: { zh: '例如：郑王庙（黎明寺）参观', en: 'e.g. Wat Arun (Temple of Dawn) Visit' },
  locationVenue: { zh: '地点 / 场所名称', en: 'Location / Venue Name' },
  locationPlaceholder: { zh: '例如：Wat Arun Ratchawararam', en: 'e.g. Wat Arun Ratchawararam' },
  thaiAddressLabel: { zh: '泰文地址 / 司机提示', en: 'Thai Address / Show Driver Note' },
  thaiAddressHint: { zh: '方便向曼谷出租车 / Grab 司机出示', en: 'Useful to show Bangkok taxi/Grab drivers' },
  gmapsLinkLabel: { zh: '谷歌地图链接（可选）', en: 'Google Maps Link (Optional)' },
  estCostLabel: { zh: '预计花费（{cur}）', en: 'Estimated Cost ({cur})' },
  alreadyBooked: { zh: '已预订 / 已确认', en: 'Already Booked / Reserved' },
  notesTips: { zh: '备注、小贴士与提醒', en: 'Notes, Tips & Reminders' },
  notesPlaceholder: { zh: '例如：着装要求需遮盖肩膀和膝盖。下午阳光强，记得带伞。', en: 'e.g. Dress code: covered shoulders and knees. Bring umbrella for afternoon sun.' },
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
  collabEdit: { zh: '协作编辑', en: 'Collaborative Edit' },
  collabEditDesc: { zh: '朋友可以自定义和添加活动', en: 'Friends can customize & add activities' },
  viewerReadOnly: { zh: '仅查看（只读）', en: 'Viewer (Read-Only)' },
  viewerDesc: { zh: '朋友只能查看行程和地图', en: 'Friends can only view schedule & maps' },
  requirePin: { zh: '需要 PIN 密码', en: 'Require PIN / Passcode' },
  setPasscode: { zh: '设置 4 位密码（例如 2026）', en: 'Set a 4-digit Passcode (e.g. 2026)' },
  pinPlaceholder: { zh: '输入给朋友的 PIN 码', en: 'Enter PIN code for friends' },
  pinHint: { zh: '朋友需要输入此密码才能解锁行程。', en: 'Friends will be prompted for this code to unlock the itinerary.' },
  shareableLink: { zh: '可分享的网页链接', en: 'Shareable Web Link' },
  copied: { zh: '已复制！', en: 'Copied!' },
  copyLink: { zh: '复制链接', en: 'Copy Link' },
  scanWithPhone: { zh: '用手机相机扫码', en: 'Scan with Mobile Phone Camera' },
  qrHint: { zh: '朋友用 iPhone 或安卓手机相机对准此二维码，即可在手机浏览器中直接打开这份行程！', en: 'Friends can point their iPhone or Android camera at this QR code to instantly load this trip itinerary directly into their mobile browser!' },
  worksOffline: { zh: '打开后可离线使用', en: 'Works offline once opened' },
  backupImport: { zh: '备份与导入行程', en: 'Backup & Import Itinerary' },
  exportJson: { zh: '导出行程 (.json)', en: 'Export Itinerary (.json)' },
  importJson: { zh: '导入行程 (.json)', en: 'Import Itinerary (.json)' },
  importSuccess: { zh: '行程导入成功！', en: 'Trip imported successfully!' },
  done: { zh: '完成', en: 'Done' },

  // ---- Taxi cards modal ----
  taxiModalTitle: { zh: '出租车司机卡片', en: 'Show Taxi Driver Cards' },
  bangkokTool: { zh: '曼谷旅行工具', en: 'Bangkok Travel Tool' },
  taxiModalSubtitle: { zh: '大字泰文卡片，轻松向司机展示目的地', en: 'Large Thai text flashcards to easily communicate destinations to drivers' },
  destCards: { zh: '目的地卡片', en: 'Destination Cards' },
  addPlace: { zh: '添加地点', en: 'Add Place' },
  noTaxiCards: { zh: '暂无打车卡。', en: 'No taxi cards yet.' },
  handyPhrases: { zh: '常用打车泰语', en: 'Handy Taxi Phrases' },
  addCustomCard: { zh: '添加自定义打车卡', en: 'Add Custom Taxi Card' },
  placeNameEn: { zh: '地点名称（英文）', en: 'Place Name (English)' },
  placeNameTh: { zh: '地点名称（泰文）', en: 'Place Name (Thai Script)' },
  fullThaiAddress: { zh: '完整泰文地址 / 地标', en: 'Full Thai Address / Landmark' },
  nearestStationLabel: { zh: '最近的 BTS / MRT 站', en: 'Nearest BTS / MRT Station' },
  noteForDriverLabel: { zh: '给司机的提示', en: 'Note for Driver' },
  saveCard: { zh: '保存卡片', en: 'Save Card' },
  tapFullscreen: { zh: '在手机上全屏展示', en: 'Tap or show full-screen on mobile phone' },
  taxiTip: { zh: '提示：可直接向曼谷的 Grab、Bolt、嘟嘟车或计价出租车司机出示此卡。', en: 'Tip: Show this card directly to Grab, Bolt, Tuk-tuk or Metered Taxi drivers in Bangkok.' },
  deleteCard: { zh: '删除卡片', en: 'Delete Card' },
  selectOrAdd: { zh: '在左侧选择目的地，或添加新的打车卡。', en: 'Select a destination on the left or add a new taxi card.' },

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
  printTaxiCards: { zh: '🚕 曼谷出租车卡片（出示给司机）', en: '🚕 Bangkok Taxi Flashcards for Drivers' },
  printStation: { zh: '车站', en: 'Station' },

  // ---- Roles ----
  roleAdmin: { zh: '管理员', en: 'Admin' },
  roleMember: { zh: '旅伴', en: 'Member' },
  roleViewer: { zh: '访客', en: 'Viewer' },
  memberBanner: {
    zh: '🤝 您以旅伴身份协作：可添加/编辑活动、勾选清单、记录支出。行程设置与删除由管理员管理。',
    en: '🤝 You are collaborating as a Member: add & edit activities, tick checklists, log expenses. Trip settings & deletions are managed by the Admin.'
  },
  shareAsAdmin: { zh: '管理员（完全控制）', en: 'Admin (Full Control)' },
  shareAsAdminDesc: { zh: '行程设置、删除、旅伴管理等全部权限', en: 'Full access: settings, deletions, manage travelers' },
  shareAsMember: { zh: '旅伴（基础编辑）', en: 'Member (Basic Edits)' },
  shareAsMemberDesc: { zh: '可编辑活动、勾选清单、记录支出', en: 'Can edit activities, tick checklists, log expenses' },
  memberShareNote: { zh: '只有管理员可以创建可编辑的分享链接，您可以分享只读链接。', en: 'Only the admin can create editable share links. You can share a read-only link.' },
  qrTooLong: { zh: '行程内容较多，超出二维码容量。请使用「复制链接」或「系统分享」发送给朋友。', en: 'This trip is too large for a QR code. Use "Copy Link" or "Share via…" instead.' },
  nativeShare: { zh: '系统分享…', en: 'Share via…' },
  copyFailed: { zh: '复制失败，请长按链接手动复制。', en: 'Copy failed — long-press the link to copy it manually.' },

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
  cloudOn: { zh: '云同步已开启', en: 'Cloud sync on' },
  inviteSection: { zh: '实时协作邀请（云同步）', en: 'Live Collaboration Invite (Cloud)' },
  createInviteBtn: { zh: '创建邀请链接', en: 'Create Invite Link' },
  creatingInvite: { zh: '创建中…', en: 'Creating…' },
  inviteHint: { zh: '朋友打开链接并登录后，即可实时同步这份行程 — 管理员的修改会即时出现在所有人手机上。', en: 'Friends who open this link and sign in will sync this trip live — admin edits appear on everyone’s phone instantly.' },
  inviteRequiresLogin: { zh: '登录后（右上角）即可创建实时邀请链接。', en: 'Sign in (top right) to create live invite links.' },
  joiningTrip: { zh: '正在加入行程…', en: 'Joining trip…' },
  joinFailed: { zh: '加入行程失败：{msg}', en: 'Failed to join trip: {msg}' },
  joinNeedsCloud: { zh: '这个邀请链接需要云同步，但本站尚未启用云同步。', en: 'This invite link needs cloud sync, which is not enabled on this site yet.' },
  snapshotSection: { zh: '快照分享（离线，无需登录）', en: 'Snapshot Share (offline, no login needed)' },
  inviteRecommended: { zh: '推荐', en: 'Recommended' },
  inviteShortBadge: { zh: '短链接 · {n} 个字符', en: 'Short link · {n} characters' },
  inviteCodeLabel: { zh: '邀请码', en: 'Invite code' },
  inviteCodeHint: { zh: '朋友也可以直接输入这个邀请码，不一定要点链接。', en: 'Friends can also type this code in instead of tapping the link.' },
  inviteNewLink: { zh: '再建一个邀请链接', en: 'Create another invite link' },
  snapshotLengthWarn: {
    zh: '这条快照链接有 {n} 个字符，WhatsApp、iMessage 或浏览器可能会截断它，二维码也放不下。要稳定分享，请登录后使用上方的短邀请链接。',
    en: 'This snapshot link is {n} characters long. WhatsApp, iMessage or the browser may cut it off, and it will not fit in a QR code. For reliable sharing, sign in and use the short invite link above.'
  },
  snapshotIsCopy: {
    zh: '快照链接发出去的是一份副本：朋友之后的修改不会同步回你这里，你的修改也不会传给他们。',
    en: 'A snapshot link sends a frozen copy: your friends’ later edits never reach you, and yours never reach them.'
  },
  cloudOffNotice: {
    zh: '云同步尚未启用，所以目前只能用长快照链接分享，而且行程只保存在这台设备的浏览器里。',
    en: 'Cloud sync is not set up yet, so sharing only works through long snapshot links and trips are stored only in this browser.'
  },

  // ---- Phrasebook ----
  tabPhrases: { zh: '泰语速查', en: 'Thai Phrases' },
  phrasesHint: { zh: '直接把泰文大字出示给当地人看也可以！小贴士：男生句尾加 "krap (ครับ)"、女生加 "ka (ค่ะ)" 更有礼貌。', en: 'You can simply show the big Thai text to locals! Tip: men end sentences with "krap (ครับ)", women with "ka (ค่ะ)" to be polite.' },

  // ---- Live exchange rate ----
  liveRate: { zh: '实时', en: 'live' },

  // ---- Empty state ----
  emptyTitle: { zh: '还没有行程', en: 'No trips yet' },
  emptyHint: { zh: '创建你的第一个行程，开始安排每天的活动、预算和行李清单。', en: 'Create your first trip to start planning days, budget and packing.' },
  createFirstTrip: { zh: '创建第一个行程', en: 'Create Your First Trip' },
  noChecklistItems: { zh: '清单还是空的，在上方添加第一项。', en: 'Your checklist is empty — add your first item above.' },

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
