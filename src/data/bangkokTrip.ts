import type { Trip } from '../types/travel';

export const bangkokDefaultTrip: Trip = {
  id: 'bkk-2026-trip',
  title: 'Bangkok Adventure 🇹🇭 (5th - 10th)',
  destination: 'Bangkok',
  country: 'Thailand',
  startDate: '2026-10-05',
  endDate: '2026-10-10',
  coverImage: 'https://images.unsplash.com/photo-1508009603885-50cf7c579365?auto=format&fit=crop&w=1600&q=80',
  currency: 'THB',
  homeCurrency: 'USD',
  exchangeRate: 35.5, // 1 USD = 35.5 THB
  travelers: [
    { id: 't1', name: 'Alex (You)', avatarColor: '#10b981', isOwner: true },
    { id: 't2', name: 'Sarah', avatarColor: '#0ea5e9' },
    { id: 't3', name: 'Mike', avatarColor: '#f59e0b' },
    { id: 't4', name: 'Jessica', avatarColor: '#ec4899' }
  ],
  shareSettings: {
    isPublic: true,
    isPasswordProtected: false,
    allowGuestEdits: true
  },
  days: [
    {
      id: 'day-1',
      dayNumber: 1,
      dateString: '2026-10-05',
      dayOfWeek: 'Monday (5th)',
      title: 'Arrival, River Breeze & Sunset Wat Arun',
      summary: 'Touchdown in Bangkok, hotel check-in, ferry ride along Chao Phraya River, sunset views at Wat Arun, and rooftop welcome drinks.',
      activities: [
        {
          id: 'act-1-1',
          transportToNext: { mode: 'airportRail', durationMin: 45, costHint: '~45 THB/人', note: 'Airport Rail Link to Phaya Thai, then BTS Sukhumvit line', noteZh: '机场快线至 Phaya Thai 站，转 BTS 素坤逸线' },
          time: '11:30 AM',
          title: 'Arrive at Suvarnabhumi Airport (BKK)',
          category: 'flight',
          locationName: 'Suvarnabhumi International Airport (BKK)',
          locationAddress: '999 Soi Mu Ban Nakhon Thong 1, Nong Prue, Bang Phli District, Samut Prakan 10540',
          thaiAddress: 'ท่าอากาศยานสุวรรณภูมิ',
          googleMapsUrl: 'https://maps.google.com/?q=Suvarnabhumi+Airport',
          cost: 0,
          notes: 'Clear customs, pick up pre-booked AIS / True 5G e-SIM at Exit Gate 7, withdraw THB from ATM (SuperRich has best exchange rate on B Floor near Airport Rail Link).',
          booked: true
        },
        {
          id: 'act-1-2',
          transportToNext: { mode: 'walk', durationMin: 5, note: 'Walk into the hotel lobby', noteZh: '步行进入酒店大堂' },
          time: '01:00 PM',
          title: 'Airport Rail Link / Grab to Sukhumvit Hotel',
          category: 'transport',
          locationName: 'Sukhumvit / Siam Area Hotel',
          locationAddress: 'Sukhumvit Soi 24, Khlong Toei, Bangkok',
          thaiAddress: 'โรงแรมใจกลางสุขุมวิท ซอย 24',
          cost: 450,
          notes: 'Use Grab or Airport Rail Link (45 THB/person to Phaya Thai station, transfer to BTS Sukhumvit line).',
          booked: true
        },
        {
          id: 'act-1-3',
          transportToNext: { mode: 'boat', durationMin: 50, costHint: '~30 THB/人', note: 'BTS to Saphan Taksin, then blue-flag tourist boat to Wat Arun pier', noteZh: 'BTS 至 Saphan Taksin 站，转蓝旗观光船至郑王庙码头' },
          time: '02:30 PM',
          title: 'Hotel Check-in & Freshen Up',
          category: 'hotel',
          locationName: 'Grand Sukhumvit Hotel',
          cost: 0,
          notes: 'Drop luggage, charge phones, pack sunscreen and sunglasses.',
          booked: true
        },
        {
          id: 'act-1-4',
          transportToNext: { mode: 'taxi', durationMin: 30, costHint: '~200 THB', note: 'Cross-river ferry, then Grab to Tichuca', noteZh: '过河渡轮后打 Grab 前往' },
          time: '04:30 PM',
          title: 'Wat Arun (Temple of Dawn) at Sunset',
          category: 'sightseeing',
          locationName: 'Wat Arun Ratchawararam',
          locationAddress: '158 Thanon Wang Doem, Wat Arun, Bangkok Yai, Bangkok 10600',
          thaiAddress: 'วัดอรุณราชวรารามราชวรมหาวิหาร (วัดอรุณ)',
          googleMapsUrl: 'https://maps.google.com/?q=Wat+Arun+Bangkok',
          cost: 200,
          notes: 'Take BTS to Saphan Taksin, then Chao Phraya Express Boat (Blue Flag tourist boat 30 THB) to Tha Tien or Wat Arun pier. Dress code: covered shoulders and knees!',
          booked: false
        },
        {
          id: 'act-1-5',
          time: '07:30 PM',
          title: 'Dinner by the River & Tichuca Rooftop Bar',
          category: 'nightlife',
          locationName: 'Tichuca Rooftop Bar (T-One Building 46th Floor)',
          locationAddress: '8 Sukhumvit 40 Alley, Phra Khanong, Khlong Toei, Bangkok 10110',
          thaiAddress: 'ทิชูก้า รูฟท็อป บาร์ ชั้น 46 ตึก T-One สุขุมวิท 40',
          googleMapsUrl: 'https://maps.google.com/?q=Tichuca+Rooftop+Bar+Bangkok',
          cost: 1200,
          notes: 'Famous glowing avatar tree jellyfish bar with panoramic 360-degree skyline views. Passport copy or photo ID required at entrance!',
          booked: true
        }
      ]
    },
    {
      id: 'day-2',
      dayNumber: 2,
      dateString: '2026-10-06',
      dayOfWeek: 'Tuesday (6th)',
      title: 'Grand Palace, Wat Pho & Yaowarat Chinatown',
      summary: 'Explore Thailand’s most sacred royal temples, experience authentic Thai massage at Wat Pho, and embark on a street food feast in Chinatown.',
      activities: [
        {
          id: 'act-2-1',
          transportToNext: { mode: 'walk', durationMin: 10, note: 'Walk south along Sanam Chai Rd', noteZh: '沿 Sanam Chai 路向南步行' },
          time: '08:30 AM',
          title: 'The Grand Palace & Wat Phra Kaew (Emerald Buddha)',
          category: 'sightseeing',
          locationName: 'The Grand Palace',
          locationAddress: 'Na Phra Lan Rd, Phra Borom Maha Ratchawang, Phra Nakhon, Bangkok 10200',
          thaiAddress: 'พระบรมมหาราชวัง และ วัดพระแก้ว',
          googleMapsUrl: 'https://maps.google.com/?q=Grand+Palace+Bangkok',
          cost: 500,
          notes: 'Go early to beat the midday heat and tour groups. Strict dress code applies (no shorts, no sleeveless tops, no ripped jeans). Ticket includes entry to Wat Phra Kaew.',
          booked: false
        },
        {
          id: 'act-2-2',
          transportToNext: { mode: 'taxi', durationMin: 15, costHint: '~60 THB', note: 'Short taxi or tuk-tuk ride', noteZh: '打车或嘟嘟车前往' },
          time: '11:30 AM',
          title: 'Wat Pho (Temple of Reclining Buddha) & Thai Massage',
          category: 'relax',
          locationName: 'Wat Phra Chetuphon (Wat Pho)',
          locationAddress: '2 Sanam Chai Rd, Phra Borom Maha Ratchawang, Phra Nakhon, Bangkok 10200',
          thaiAddress: 'วัดพระเชตุพนวิมลมังคลาราม (วัดโพธิ์)',
          googleMapsUrl: 'https://maps.google.com/?q=Wat+Pho+Bangkok',
          cost: 560,
          notes: 'See the 46m long gold-leaf reclining Buddha. Wat Pho is the birthplace of traditional Thai massage; book a 1-hour traditional foot/body massage inside the grounds (350-400 THB).',
          booked: false
        },
        {
          id: 'act-2-3',
          transportToNext: { mode: 'taxi', durationMin: 25, costHint: '~120 THB', note: 'Grab to Ari neighborhood', noteZh: '打 Grab 前往阿里社区' },
          time: '01:30 PM',
          title: 'Lunch at Krua Apsorn (Award-winning Thai cuisine)',
          category: 'food',
          locationName: 'Krua Apsorn Dinso Branch',
          locationAddress: '169 Dinso Rd, Wat Bowon Niwet, Phra Nakhon, Bangkok 10200',
          thaiAddress: 'ร้านครัวอัปษร ถนนดินสอ',
          googleMapsUrl: 'https://maps.google.com/?q=Krua+Apsorn+Dinso',
          cost: 400,
          notes: 'Royal culinary favorites! Must try: Crab meat omelette, Green curry with fish balls, and Stir-fried yellow curry crab.',
          booked: false
        },
        {
          id: 'act-2-4',
          transportToNext: { mode: 'mrt', durationMin: 40, costHint: '~40 THB/人', note: 'BTS from Ari, transfer to MRT, alight at Wat Mangkon', noteZh: 'BTS 阿里站出发转 MRT，至龙莲寺站 (Wat Mangkon)' },
          time: '03:30 PM',
          title: 'Afternoon Rest / Cafe Break at Ari neighborhood',
          category: 'relax',
          locationName: 'Nana Coffee Roasters / Gump’s Ari',
          locationAddress: 'Soi Ari 4, Phaya Thai, Bangkok',
          thaiAddress: 'ซอยอารีย์ แขวงพญาไท กรุงเทพฯ',
          cost: 250,
          notes: 'Charming hipster cafe neighborhood with specialty drip coffee, Thai tea boba, and photogenic spots.',
          booked: false
        },
        {
          id: 'act-2-5',
          time: '06:30 PM',
          title: 'Yaowarat Chinatown Michelin Street Food Crawl',
          category: 'food',
          locationName: 'Yaowarat Road Chinatown',
          locationAddress: 'Yaowarat Rd, Samphanthawong, Bangkok 10100',
          thaiAddress: 'ถนนเยาวราช ไชน่าทาวน์',
          googleMapsUrl: 'https://maps.google.com/?q=Yaowarat+Road+Bangkok',
          cost: 650,
          notes: 'Neon street wonderland! Must eat: Guay Jub Ouan Pochana (rolled noodles with peppery crispy pork), Nai Ek Roll Noodles, toasted sweet buns (Yaowarat Toast Bread), and fresh durian/mango sticky rice.',
          booked: false
        }
      ]
    },
    {
      id: 'day-3',
      dayNumber: 3,
      dateString: '2026-10-07',
      dayOfWeek: 'Wednesday (7th)',
      title: 'Shopping Extravaganza, Pratunam & Jodd Fairs Night Market',
      summary: 'Explore world-class malls and budget wholesale fashion markets, followed by the buzzing nightlife of Jodd Fairs.',
      activities: [
        {
          id: 'act-3-1',
          transportToNext: { mode: 'walk', durationMin: 8, note: 'Walk to Pratunam (Pink Shirt)', noteZh: '步行至水门鸡饭（粉红制服）' },
          time: '10:00 AM',
          title: 'Platinum Fashion Mall & CentralWorld Shopping',
          category: 'shopping',
          locationName: 'The Platinum Fashion Mall & CentralWorld',
          locationAddress: '222 Phetchaburi Rd, Thanon Phaya Thai, Ratchathewi, Bangkok 10400',
          thaiAddress: 'เดอะ แพลทินัม แฟชั่น มอลล์ และ เซ็นทรัลเวิลด์',
          googleMapsUrl: 'https://maps.google.com/?q=Platinum+Fashion+Mall+Bangkok',
          cost: 1500,
          notes: '6 floors of air-conditioned wholesale fashion, clothes, bags, and accessories. Buy 3+ items for instant wholesale discount.',
          booked: false
        },
        {
          id: 'act-3-2',
          transportToNext: { mode: 'walk', durationMin: 18, note: 'Walk via Ratchaprasong skywalk', noteZh: '经 Ratchaprasong 空中步道步行' },
          time: '01:00 PM',
          title: 'Lunch at Food Republic / Go-Ang Pratunam Chicken Rice',
          category: 'food',
          locationName: 'Go-Ang Pratunam Chicken Rice (Pink Shirt)',
          locationAddress: '962 Phetchaburi Rd, Makkasan, Ratchathewi, Bangkok 10400',
          thaiAddress: 'โกอ่าง ข้าวมันไก่ประตูน้ำ (เสื้อชมพู)',
          googleMapsUrl: 'https://maps.google.com/?q=Go-Ang+Pratunam+Chicken+Rice',
          cost: 150,
          notes: 'Michelin Bib Gourmand Hainanese chicken rice served with savory chili soy dipping sauce and piping hot winter melon broth.',
          booked: false
        },
        {
          id: 'act-3-3',
          transportToNext: { mode: 'mrt', durationMin: 30, costHint: '~45 THB/人', note: 'BTS to Asok, transfer to MRT Phra Ram 9 (Exit 2)', noteZh: 'BTS 至 Asok 站转 MRT 至 Phra Ram 9 站 2 号出口' },
          time: '03:00 PM',
          title: 'Siam Paragon & Siam Square Walking Street',
          category: 'shopping',
          locationName: 'Siam Square One & Siam Center',
          locationAddress: 'Rama I Rd, Pathum Wan, Bangkok 10330',
          thaiAddress: 'สยามสแควร์ และ สยามพารากอน',
          cost: 300,
          notes: 'Trendy youth lifestyle hub, flagship Pop Mart store, Gentle Woman, and local Thai streetwear labels.',
          booked: false
        },
        {
          id: 'act-3-4',
          time: '06:30 PM',
          title: 'Jodd Fairs Night Market (Rama 9 / DanNeramit)',
          category: 'nightlife',
          locationName: 'Jodd Fairs Night Market',
          locationAddress: 'Rama IX Rd, Huai Khwang, Bangkok 10310',
          thaiAddress: 'จ๊อดแฟร์ พระราม 9 (MRT พระราม 9)',
          googleMapsUrl: 'https://maps.google.com/?q=Jodd+Fairs+Bangkok',
          cost: 800,
          notes: 'The trendiest night market in Bangkok! Must try: Leng Saap (Spicy Mountain Pork Ribs volcano), raw marinated salmon/prawns, crispy butter pancakes, fresh watermelon smoothies, and draft craft beers.',
          booked: false
        }
      ]
    },
    {
      id: 'day-4',
      dayNumber: 4,
      dateString: '2026-10-08',
      dayOfWeek: 'Thursday (8th)',
      title: 'ICONSIAM, Giant Golden Buddha & River Dinner Cruise',
      summary: 'Visit Thailand’s premier riverside mega-mall with indoor floating market, marvel at the 69-meter Wat Paknam Buddha, and enjoy a dinner cruise.',
      activities: [
        {
          id: 'act-4-1',
          transportToNext: { mode: 'mrt', durationMin: 40, costHint: '~50 THB/人', note: 'MRT to Krung Thon Buri, then BTS Gold Line to Charoen Nakhon', noteZh: 'MRT 至 Krung Thon Buri，转 BTS 金线至 Charoen Nakhon 站' },
          time: '10:00 AM',
          title: 'Wat Paknam Phasi Charoen (Giant Golden Buddha)',
          category: 'sightseeing',
          locationName: 'Wat Paknam Bhasicharoen',
          locationAddress: '300 Ratchamongkhon Prasat Alley, Pak Khlong Phasi Charoen, Phasi Charoen, Bangkok 10160',
          thaiAddress: 'วัดปากน้ำ ภาษีเจริญ (พระพุทธรูปองค์ใหญ่)',
          googleMapsUrl: 'https://maps.google.com/?q=Wat+Paknam+Bangkok',
          cost: 100,
          notes: 'Magnificent 69-meter tall golden seated Buddha statue and stunning cosmic emerald glass stupa on the top floor.',
          booked: false
        },
        {
          id: 'act-4-2',
          transportToNext: { mode: 'walk', durationMin: 5, note: 'Walk through the mall to the riverside', noteZh: '穿过商场步行至河滨' },
          time: '12:30 PM',
          title: 'ICONSIAM & SOOKSIAM Indoor Floating Market',
          category: 'food',
          locationName: 'ICONSIAM / SookSiam Ground Floor',
          locationAddress: '299 Charoen Nakhon Rd, Khlong Ton Sai, Khlong San, Bangkok 10600',
          thaiAddress: 'ไอคอนสยาม สุขสยาม ถนนเจริญนคร',
          googleMapsUrl: 'https://maps.google.com/?q=ICONSIAM+Bangkok',
          cost: 500,
          notes: 'Air-conditioned replica of traditional Thai floating markets with foods from 77 provinces: boat noodles, grilled river prawns, coconut ice cream, and traditional crafts.',
          booked: false
        },
        {
          id: 'act-4-3',
          transportToNext: { mode: 'walk', durationMin: 10, note: 'Walk to ICONSIAM pier for boarding', noteZh: '步行至 ICONSIAM 码头登船' },
          time: '04:00 PM',
          title: 'Riverside Park & Apple Store Terrace at ICONSIAM',
          category: 'relax',
          locationName: 'ICONSIAM River Park',
          cost: 0,
          notes: 'Catch the breeze overlooking the Chao Phraya River and watch tourist ferries cruise by.',
          booked: false
        },
        {
          id: 'act-4-4',
          time: '07:00 PM',
          title: 'Chao Phraya Princess Luxury Dinner Cruise',
          category: 'food',
          locationName: 'Asiatique / ICONSIAM Pier 2',
          locationAddress: 'Chao Phraya River, Bangkok',
          thaiAddress: 'เรือดินเนอร์เจ้าพระยา ท่าเรือไอคอนสยาม',
          cost: 1400,
          notes: '2-hour cruise with international buffet, live saxophone band, and illuminated night views of Wat Arun, Grand Palace, and Rama VIII Bridge.',
          booked: true
        }
      ]
    },
    {
      id: 'day-5',
      dayNumber: 5,
      dateString: '2026-10-09',
      dayOfWeek: 'Friday (9th)',
      title: 'Maeklong Railway & Floating Market Day Trip + Luxury Spa',
      summary: 'Witness the thrilling train passing through the market stalls, ride a longtail boat through coconut canals, and indulge in a relaxing 2-hour Thai herbal spa.',
      activities: [
        {
          id: 'act-5-1',
          transportToNext: { mode: 'taxi', durationMin: 40, note: 'Tour van transfer', noteZh: '跟团面包车接送' },
          time: '07:30 AM',
          title: 'Maeklong Railway Market (Talad Rom Hub)',
          category: 'sightseeing',
          locationName: 'Maeklong Railway Market',
          locationAddress: 'Mae Klong, Mueang Samut Songkhram District, Samut Songkhram 75000',
          thaiAddress: 'ตลาดร่มหุบ แม่กลอง สมุทรสงคราม',
          googleMapsUrl: 'https://maps.google.com/?q=Maeklong+Railway+Market',
          cost: 800,
          notes: 'Watch shopkeepers pull back their awnings and market baskets within seconds as the real passenger train chugs directly through the middle of the market!',
          booked: true
        },
        {
          id: 'act-5-2',
          transportToNext: { mode: 'taxi', durationMin: 90, note: 'Drive back to Sukhumvit, Bangkok', noteZh: '乘车返回曼谷市区素坤逸' },
          time: '11:00 AM',
          title: 'Damnoen Saduak / Amphawa Floating Market',
          category: 'sightseeing',
          locationName: 'Damnoen Saduak Floating Market',
          locationAddress: 'Damnoen Saduak, Ratchaburi 70130',
          thaiAddress: 'ตลาดน้ำดำเนินสะดวก ราชบุรี',
          cost: 500,
          notes: 'Hop on a traditional wooden paddleboat and buy fresh grilled coconut pancakes, mango sticky rice, and noodle soup directly from boat vendors.',
          booked: true
        },
        {
          id: 'act-5-3',
          transportToNext: { mode: 'mrt', durationMin: 40, costHint: '~45 THB/人', note: 'BTS to Asok, MRT to Sanam Chai, walk to Tha Tien', noteZh: 'BTS 至 Asok 转 MRT 至 Sanam Chai 站，步行至塔田码头' },
          time: '04:30 PM',
          title: '2-Hour Thai Herbal Aromatherapy & Hot Stone Spa',
          category: 'relax',
          locationName: "Let's Relax Spa / Yunomori Onsen & Spa Sukhumvit",
          locationAddress: 'Sukhumvit Soi 39 or Soi 26, Bangkok',
          thaiAddress: 'เล็ทส์ รีแลกซ์ สปา / ยูโนโมริ ออนเซ็น สุขุมวิท',
          cost: 1600,
          notes: 'Rejuvenate tired legs with a signature Thai herbal compress ball massage and organic warm essential oil treatment.',
          booked: true
        },
        {
          id: 'act-5-4',
          time: '08:00 PM',
          title: 'Farewell Dinner at Supanniga Eating Room',
          category: 'food',
          locationName: 'Supanniga Eating Room Tha Tien Pier',
          locationAddress: '392/25-26 Maha Rat Rd, Phra Borom Maha Ratchawang, Bangkok 10200',
          thaiAddress: 'ร้านสุพรรณิการ์ อีทติ้ง รูม ท่าเตียน',
          googleMapsUrl: 'https://maps.google.com/?q=Supanniga+Eating+Room+Tha+Tien',
          cost: 950,
          notes: 'Authentic Trat and northeastern Thai recipes (Crab curry, Massaman beef, crispy leaf salad) with night view of illuminated Wat Arun.',
          booked: true
        }
      ]
    },
    {
      id: 'day-6',
      dayNumber: 6,
      dateString: '2026-10-10',
      dayOfWeek: 'Saturday (10th)',
      title: 'Souvenir Haul at Big C, Cafe Hopping & Departure',
      summary: 'Stock up on famous Thai snacks and gifts, grab a final Thai iced milk tea, and transfer smoothly to the airport for the flight home.',
      activities: [
        {
          id: 'act-6-1',
          transportToNext: { mode: 'walk', durationMin: 15, note: 'Walk via skywalk to Siam Square', noteZh: '经空中步道步行至暹罗广场' },
          time: '09:30 AM',
          title: 'Big C Supercenter Rajdamri (Souvenir Central)',
          category: 'shopping',
          locationName: 'Big C Supercenter Rajdamri',
          locationAddress: '97/11 Ratchadamri Rd, Lumphini, Pathum Wan, Bangkok 10330',
          thaiAddress: 'บิ๊กซี ราชดำริ (ตรงข้ามเซ็นทรัลเวิลด์)',
          googleMapsUrl: 'https://maps.google.com/?q=Big+C+Supercenter+Rajdamri',
          cost: 1800,
          notes: 'Huge dedicated souvenir aisle! Must buy: ChaTraMue Thai tea tin, dried durian/mango, Tom Yum Pretz, Tao Kae Noi seaweed, Siam banana crispy rolls, and Counterpain analgesic balm.',
          booked: false
        },
        {
          id: 'act-6-2',
          transportToNext: { mode: 'bts', durationMin: 15, costHint: '~30 THB/人', note: 'BTS back to hotel for luggage', noteZh: 'BTS 回酒店取行李' },
          time: '12:00 PM',
          title: 'Last Thai Lunch: Som Tam Nua & Mango Tango',
          category: 'food',
          locationName: 'Som Tam Nua Siam Square',
          locationAddress: '392/14 Siam Square Soi 5, Pathum Wan, Bangkok 10330',
          thaiAddress: 'ส้มตำนัว สยามสแควร์ ซอย 5',
          cost: 400,
          notes: 'Signature spicy papaya salad (Som Tam), crispy fried chicken wings with garlic chips, sticky rice in bamboo basket.',
          booked: false
        },
        {
          id: 'act-6-3',
          transportToNext: { mode: 'walk', durationMin: 15, note: 'Check-in, VAT refund & immigration', noteZh: '办理值机、退税与出境安检' },
          time: '02:00 PM',
          title: 'Hotel Check-out & Grab to Suvarnabhumi Airport',
          category: 'transport',
          locationName: 'Suvarnabhumi Airport (BKK)',
          thaiAddress: 'สนามบินสุวรรณภูมิ อาคารผู้โดยสารขาออก',
          cost: 500,
          notes: 'Ensure arriving at airport 3 hours prior to departure for VAT refund customs stamp (VAT Refund Office before immigration) and duty-free collection.',
          booked: true
        },
        {
          id: 'act-6-4',
          time: '05:30 PM',
          title: 'Flight Departure & Safe Journey Home ✈️',
          category: 'flight',
          locationName: 'BKK Departure Gates',
          cost: 0,
          notes: 'Boarding gate closes 20 minutes before departure. Reflect on a marvelous Bangkok trip!',
          booked: true
        }
      ]
    }
  ],
  expenses: [
    {
      id: 'exp-1',
      title: 'Hotel Booking (5 Nights Sukhumvit Deluxe)',
      amount: 14500,
      currency: 'THB',
      category: 'hotel',
      date: '2026-10-05',
      paidByTravelerId: 't1',
      splitWithTravelerIds: ['t1', 't2', 't3', 't4']
    },
    {
      id: 'exp-2',
      title: 'Airport Private Van Transfer (Suvarnabhumi to Hotel)',
      amount: 900,
      currency: 'THB',
      category: 'transport',
      date: '2026-10-05',
      paidByTravelerId: 't2',
      splitWithTravelerIds: ['t1', 't2', 't3', 't4']
    },
    {
      id: 'exp-3',
      title: 'Chao Phraya Princess Dinner Cruise (4 Pax)',
      amount: 5600,
      currency: 'THB',
      category: 'food',
      date: '2026-10-08',
      paidByTravelerId: 't1',
      splitWithTravelerIds: ['t1', 't2', 't3', 't4']
    },
    {
      id: 'exp-4',
      title: 'Maeklong Railway & Floating Market Tour',
      amount: 3200,
      currency: 'THB',
      category: 'sightseeing',
      date: '2026-10-09',
      paidByTravelerId: 't3',
      splitWithTravelerIds: ['t1', 't2', 't3', 't4']
    }
  ],
  checklist: [
    { id: 'c-1', category: 'Documents & Money', title: 'Passport (valid for > 6 months)', completed: true },
    { id: 'c-2', category: 'Documents & Money', title: 'Thailand Arrival Digital Card / Visa requirements', completed: true },
    { id: 'c-3', category: 'Documents & Money', title: 'Flight tickets downloaded offline / printed', completed: true },
    { id: 'c-4', category: 'Documents & Money', title: 'Travel Insurance with Medical Coverage', completed: true },
    { id: 'c-5', category: 'Documents & Money', title: 'Cash in THB or Multi-currency card (YouTrip/Wise)', completed: false },
    { id: 'c-6', category: 'Electronics', title: 'AIS / True 5G e-SIM or roaming activated', completed: true },
    { id: 'c-7', category: 'Electronics', title: 'Power Bank (Max 20,000mAh for carry-on luggage)', completed: false },
    { id: 'c-8', category: 'Electronics', title: 'Universal plug adapter (Type A/B/C)', completed: true },
    { id: 'c-9', category: 'Clothes', title: 'Modest temple attire (long pants/skirt, covered shoulders)', completed: false },
    { id: 'c-10', category: 'Clothes', title: 'Comfortable slip-on walking shoes (easy for temple entry)', completed: true },
    { id: 'c-11', category: 'Clothes', title: 'Lightweight breathable cotton clothes & sunglasses', completed: false },
    { id: 'c-12', category: 'Toiletries & Medicine', title: 'Mosquito repellent spray (DEET / Citronella)', completed: true },
    { id: 'c-13', category: 'Toiletries & Medicine', title: 'Stomach / Diarrhea medicine (Po Chai / Charcoal pills)', completed: true },
    { id: 'c-14', category: 'Toiletries & Medicine', title: 'Sunscreen SPF 50+ & Aloe Vera gel', completed: false },
    { id: 'c-15', category: 'Bangkok Specific', title: 'Grab / Bolt / Line MAN apps pre-installed on phone', completed: true },
    { id: 'c-16', category: 'Bangkok Specific', title: 'Google Maps offline map of Bangkok downloaded', completed: false }
  ],
  taxiCards: [
    {
      id: 'tc-1',
      nameEnglish: 'Grand Palace & Wat Phra Kaew',
      nameThai: 'พระบรมมหาราชวัง และ วัดพระศรีรัตนศาสดาราม',
      thaiAddress: 'ถนนหน้าพระลาน แขวงพระบรมมหาราชวัง เขตพระนคร กรุงเทพฯ',
      nearestStation: 'MRT Sanam Chai (Exit 1)',
      noteForDriver: 'กรุณาเปิดมิเตอร์ด้วยครับ/ค่ะ (Please turn on the meter)'
    },
    {
      id: 'tc-2',
      nameEnglish: 'Wat Arun (Temple of Dawn)',
      nameThai: 'วัดอรุณราชวรารามราชวรมหาวิหาร (วัดแจ้ง)',
      thaiAddress: '158 ถนนวังเดิม แขวงวัดอรุณ เขตบางกอกใหญ่ กรุงเทพฯ',
      nearestStation: 'MRT Itsaraphap / Tha Tien Ferry Pier',
      noteForDriver: 'ส่งที่หน้าประตูทางเข้าวัดอรุณ'
    },
    {
      id: 'tc-3',
      nameEnglish: 'ICONSIAM Shopping Mall',
      nameThai: 'ศูนย์การค้า ไอคอนสยาม',
      thaiAddress: '299 ถนนเจริญนคร แขวงคลองต้นไทร เขตคลองสาน กรุงเทพฯ',
      nearestStation: 'BTS Gold Line Charoen Nakhon Station',
      noteForDriver: 'ส่งที่จุด Drop-off ประตูสุขสยาม'
    },
    {
      id: 'tc-4',
      nameEnglish: 'Jodd Fairs Night Market (Rama 9)',
      nameThai: 'ตลาดจ๊อดแฟร์ พระราม 9',
      thaiAddress: 'ถนนพระราม 9 ด้านหลังเซ็นทรัลพระราม 9 แขวงห้วยขวาง กรุงเทพฯ',
      nearestStation: 'MRT Phra Ram 9 (Exit 2)',
      noteForDriver: 'ส่งที่ตลาดจ๊อดแฟร์ หลังเซ็นทรัลพระราม 9'
    },
    {
      id: 'tc-5',
      nameEnglish: 'Chatuchak Weekend Market',
      nameThai: 'ตลาดนัดจตุจักร',
      thaiAddress: 'ถนนกำแพงเพชร 2 แขวงจตุจักร เขตจตุจักร กรุงเทพฯ',
      nearestStation: 'BTS Mo Chit / MRT Chatuchak Park',
      noteForDriver: 'ส่งที่ทางเข้าตลาดนัดจตุจักร ประตู 1'
    },
    {
      id: 'tc-6',
      nameEnglish: 'Suvarnabhumi Airport (Departure Terminal)',
      nameThai: 'ท่าอากาศยานสุวรรณภูมิ (อาคารผู้โดยสารขาออก ชั้น 4)',
      thaiAddress: 'อาคารผู้โดยสารขาออก ชั้น 4 ประตู 4-8 สนามบินสุวรรณภูมิ',
      nearestStation: 'Airport Rail Link Suvarnabhumi Station',
      noteForDriver: 'ไปสนามบินสุวรรณภูมิ ผู้โดยสารขาออกชั้น 4 (ขึ้นทางด่วน)'
    }
  ],
  createdAt: '2026-08-27T00:00:00.000Z',
  updatedAt: '2026-08-27T00:00:00.000Z'
};
