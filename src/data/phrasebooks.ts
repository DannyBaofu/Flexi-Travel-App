import { Heart, ShoppingBag, MapPin, Utensils, Hash, Stamp, Camera, Bath, LifeBuoy } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

export interface Phrase {
  text: string; // the local script — big, can be shown to someone
  pron: string; // romanized pronunciation
  zh: string;
  en: string;
}

export interface PhraseCategory {
  icon: LucideIcon;
  zh: string;
  en: string;
  phrases: Phrase[];
}

export interface Phrasebook {
  lang: 'th' | 'ja';
  // i18n keys, so the tab can name the language it actually holds
  tabKey: string;
  tabShortKey: string;
  hintKey: string;
  categories: PhraseCategory[];
}

const THAI: PhraseCategory[] = [
  {
    icon: Heart,
    zh: '礼貌用语',
    en: 'Politeness',
    phrases: [
      { text: 'สวัสดีครับ / ค่ะ', pron: 'Sa-wat-dee (krap/ka)', zh: '你好', en: 'Hello' },
      { text: 'ขอบคุณครับ / ค่ะ', pron: 'Khop khun (krap/ka)', zh: '谢谢', en: 'Thank you' },
      { text: 'ขอโทษครับ / ค่ะ', pron: 'Khor thot (krap/ka)', zh: '对不起 / 借过一下', en: 'Sorry / Excuse me' },
      { text: 'ไม่เป็นไร', pron: 'Mai pen rai', zh: '没关系', en: 'No problem / It’s okay' },
      { text: 'ใช่ / ไม่ใช่', pron: 'Chai / Mai chai', zh: '是 / 不是', en: 'Yes / No' }
    ]
  },
  {
    icon: ShoppingBag,
    zh: '购物砍价',
    en: 'Shopping & Bargaining',
    phrases: [
      { text: 'เท่าไหร่ครับ / คะ?', pron: 'Tao-rai (krap/ka)?', zh: '多少钱？', en: 'How much is this?' },
      { text: 'แพงไป', pron: 'Phaeng pai', zh: '太贵了', en: 'Too expensive' },
      { text: 'ลดหน่อยได้ไหม?', pron: 'Lot noi dai mai?', zh: '能便宜一点吗？', en: 'Can you give a cheaper price?' },
      { text: 'เอาอันนี้', pron: 'Ao an nee', zh: '我要这个', en: 'I’ll take this one' },
      { text: 'ดูเฉยๆ', pron: 'Du choei choei', zh: '我只是看看', en: 'Just looking' }
    ]
  },
  {
    icon: MapPin,
    zh: '问路',
    en: 'Directions',
    phrases: [
      { text: '...อยู่ที่ไหน?', pron: '... yoo tee nai?', zh: '……在哪里？（前面接地名）', en: 'Where is ...? (say the place first)' },
      { text: 'ห้องน้ำอยู่ที่ไหน?', pron: 'Hong nam yoo tee nai?', zh: '厕所在哪里？', en: 'Where is the toilet?' },
      { text: 'สถานีรถไฟฟ้าอยู่ที่ไหน?', pron: 'Sa-tha-nee rot-fai-fa yoo tee nai?', zh: 'BTS/MRT 车站在哪里？', en: 'Where is the BTS/MRT station?' },
      { text: 'ไกลไหม?', pron: 'Glai mai?', zh: '远吗？', en: 'Is it far?' },
      { text: 'ช่วยชี้แผนที่ให้หน่อย', pron: 'Chuay chee phaen-tee hai noi', zh: '请帮我在地图上指一下', en: 'Please point it on the map' }
    ]
  },
  {
    icon: Utensils,
    zh: '餐饮点餐',
    en: 'Food & Ordering',
    phrases: [
      { text: 'ไม่เผ็ด', pron: 'Mai phet', zh: '不要辣', en: 'Not spicy' },
      { text: 'เผ็ดนิดหน่อย', pron: 'Phet nit noi', zh: '一点点辣', en: 'A little spicy' },
      { text: 'ไม่ใส่ผักชี', pron: 'Mai sai phak-chee', zh: '不要香菜', en: 'No coriander' },
      { text: 'อร่อยมาก!', pron: 'A-roi mak!', zh: '很好吃！', en: 'Very delicious!' },
      { text: 'เช็คบิลครับ / ค่ะ', pron: 'Check bin (krap/ka)', zh: '买单', en: 'The bill, please' },
      { text: 'ขอน้ำเปล่า', pron: 'Khor nam plao', zh: '要一杯白开水', en: 'Plain water, please' }
    ]
  },
  {
    icon: Hash,
    zh: '数字（砍价必备）',
    en: 'Numbers (for bargaining)',
    phrases: [
      { text: 'หนึ่ง สอง สาม สี่ ห้า', pron: 'Neung, Song, Sam, See, Haa', zh: '1 2 3 4 5', en: '1 2 3 4 5' },
      { text: 'หก เจ็ด แปด เก้า สิบ', pron: 'Hok, Jet, Paet, Gao, Sip', zh: '6 7 8 9 10', en: '6 7 8 9 10' },
      { text: 'ยี่สิบ / ห้าสิบ', pron: 'Yee-sip / Haa-sip', zh: '20 / 50', en: '20 / 50' },
      { text: 'หนึ่งร้อย / ห้าร้อย', pron: 'Neung roi / Haa roi', zh: '100 / 500', en: '100 / 500' },
      { text: 'หนึ่งพัน', pron: 'Neung phan', zh: '1000', en: '1000' }
    ]
  }
];

// Written around what a shrine-stamp, manhole-cover, onsen-hotel trip
// actually has to ask a stranger, not a general phrasebook: the stamp counter
// and the manhole card desk come before the numbers.
const JAPANESE: PhraseCategory[] = [
  {
    icon: Heart,
    zh: '礼貌用语',
    en: 'Politeness',
    phrases: [
      { text: 'すみません', pron: 'Sumimasen', zh: '不好意思 / 请问（叫店员也用）', en: 'Excuse me (also to call staff)' },
      { text: 'ありがとうございます', pron: 'Arigatou gozaimasu', zh: '谢谢', en: 'Thank you' },
      { text: 'お願いします', pron: 'Onegai shimasu', zh: '麻烦你了 / 拜托', en: 'Please' },
      { text: '大丈夫です', pron: 'Daijoubu desu', zh: '没关系 / 不用了', en: 'It’s fine / No, thank you' },
      { text: '日本語が話せません', pron: 'Nihongo ga hanasemasen', zh: '我不会说日语', en: 'I don’t speak Japanese' },
      { text: '英語か中国語は大丈夫ですか？', pron: 'Eigo ka chuugokugo wa daijoubu desu ka?', zh: '可以说英语或中文吗？', en: 'Is English or Chinese okay?' }
    ]
  },
  {
    icon: Stamp,
    zh: '御朱印',
    en: 'Goshuin (shrine & temple stamps)',
    phrases: [
      { text: '御朱印をお願いします', pron: 'Goshuin o onegai shimasu', zh: '请给我御朱印', en: 'A goshuin, please' },
      { text: '御朱印はどこでいただけますか？', pron: 'Goshuin wa doko de itadakemasu ka?', zh: '御朱印在哪里领？', en: 'Where can I get a goshuin?' },
      { text: '御朱印は何時までですか？', pron: 'Goshuin wa nanji made desu ka?', zh: '御朱印受理到几点？', en: 'Until what time do you give goshuin?' },
      { text: 'このページにお願いします', pron: 'Kono peeji ni onegai shimasu', zh: '请写在这一页', en: 'On this page, please' },
      { text: '書き置きでも大丈夫です', pron: 'Kakioki demo daijoubu desu', zh: '现成的纸张版也可以', en: 'A pre-written sheet is fine' },
      { text: '御朱印帳はありますか？', pron: 'Goshuinchou wa arimasu ka?', zh: '有卖御朱印帐吗？', en: 'Do you sell goshuin books?' },
      { text: 'おいくらですか？', pron: 'Oikura desu ka?', zh: '多少钱？', en: 'How much is it?' }
    ]
  },
  {
    icon: Camera,
    zh: '井盖卡与拍照',
    en: 'Manhole cards & photos',
    phrases: [
      { text: 'マンホールカードをください', pron: 'Manhooru kaado o kudasai', zh: '请给我一张井盖卡', en: 'A manhole card, please' },
      { text: 'マンホールカードはまだありますか？', pron: 'Manhooru kaado wa mada arimasu ka?', zh: '井盖卡还有吗？', en: 'Do you still have manhole cards?' },
      { text: 'このマンホールはどこにありますか？', pron: 'Kono manhooru wa doko ni arimasu ka?', zh: '这个井盖在哪里？（给对方看照片）', en: 'Where is this manhole cover? (show the photo)' },
      { text: '写真を撮ってもいいですか？', pron: 'Shashin o totte mo ii desu ka?', zh: '可以拍照吗？', en: 'May I take a photo?' },
      { text: '写真を撮ってもらえますか？', pron: 'Shashin o totte moraemasu ka?', zh: '能帮我们拍张照吗？', en: 'Could you take our photo?' }
    ]
  },
  {
    icon: MapPin,
    zh: '问路乘车',
    en: 'Directions & trains',
    phrases: [
      { text: '…はどこですか？', pron: '... wa doko desu ka?', zh: '……在哪里？（前面接地名）', en: 'Where is ...? (say the place first)' },
      { text: 'トイレはどこですか？', pron: 'Toire wa doko desu ka?', zh: '厕所在哪里？', en: 'Where is the toilet?' },
      { text: '駅はどこですか？', pron: 'Eki wa doko desu ka?', zh: '车站在哪里？', en: 'Where is the station?' },
      { text: 'この電車は…に行きますか？', pron: 'Kono densha wa ... ni ikimasu ka?', zh: '这班电车去……吗？（中间接站名）', en: 'Does this train go to ...?' },
      { text: '歩いて何分ぐらいですか？', pron: 'Aruite nanpun gurai desu ka?', zh: '走路大概几分钟？', en: 'About how many minutes on foot?' },
      { text: '地図で教えてください', pron: 'Chizu de oshiete kudasai', zh: '请帮我在地图上指一下', en: 'Please show me on the map' },
      { text: 'ATMはどこですか？', pron: 'Ee-tee-emu wa doko desu ka?', zh: 'ATM 在哪里？', en: 'Where is an ATM?' }
    ]
  },
  {
    icon: Utensils,
    zh: '餐饮点餐',
    en: 'Food & Ordering',
    phrases: [
      { text: 'これをください', pron: 'Kore o kudasai', zh: '我要这个（指着菜单）', en: 'This one, please (point at the menu)' },
      { text: '英語のメニューはありますか？', pron: 'Eigo no menyuu wa arimasu ka?', zh: '有英文菜单吗？', en: 'Do you have an English menu?' },
      { text: 'おすすめは何ですか？', pron: 'Osusume wa nan desu ka?', zh: '有什么推荐？', en: 'What do you recommend?' },
      { text: '…は食べられません', pron: '... wa taberaremasen', zh: '我不能吃……（前面接食物）', en: 'I can’t eat ... (say the food first)' },
      { text: 'お水をください', pron: 'Omizu o kudasai', zh: '请给我水', en: 'Water, please' },
      { text: 'お会計をお願いします', pron: 'Okaikei o onegai shimasu', zh: '买单', en: 'The bill, please' },
      { text: 'カードは使えますか？', pron: 'Kaado wa tsukaemasu ka?', zh: '可以刷卡吗？', en: 'Can I pay by card?' },
      { text: 'ごちそうさまでした', pron: 'Gochisousama deshita', zh: '多谢款待（吃完说）', en: 'Thank you for the meal (after eating)' }
    ]
  },
  {
    icon: ShoppingBag,
    zh: '购物免税',
    en: 'Shopping & tax-free',
    phrases: [
      { text: 'いくらですか？', pron: 'Ikura desu ka?', zh: '多少钱？', en: 'How much is this?' },
      { text: '免税できますか？', pron: 'Menzei dekimasu ka?', zh: '可以免税吗？', en: 'Can I buy this tax-free?' },
      { text: 'これはありますか？', pron: 'Kore wa arimasu ka?', zh: '有这个吗？（给对方看图片）', en: 'Do you have this? (show the picture)' },
      { text: '試着してもいいですか？', pron: 'Shichaku shite mo ii desu ka?', zh: '可以试穿吗？', en: 'May I try it on?' },
      { text: '袋をください', pron: 'Fukuro o kudasai', zh: '请给我袋子', en: 'A bag, please' },
      { text: '見ているだけです', pron: 'Mite iru dake desu', zh: '我只是看看', en: 'Just looking' }
    ]
  },
  {
    icon: Bath,
    zh: '温泉酒店',
    en: 'Onsen & hotel',
    phrases: [
      { text: 'チェックインをお願いします', pron: 'Chekkuin o onegai shimasu', zh: '我要办理入住', en: 'Check-in, please' },
      { text: '大浴場は何時までですか？', pron: 'Daiyokujou wa nanji made desu ka?', zh: '大浴场开到几点？', en: 'Until what time is the bath open?' },
      { text: '朝食は何時からですか？', pron: 'Choushoku wa nanji kara desu ka?', zh: '早餐几点开始？', en: 'What time does breakfast start?' },
      { text: '荷物を預かってもらえますか？', pron: 'Nimotsu o azukatte moraemasu ka?', zh: '可以寄放行李吗？', en: 'Could you keep my luggage?' },
      { text: 'Wi-Fiのパスワードを教えてください', pron: 'Waifai no pasuwaado o oshiete kudasai', zh: '请告诉我 Wi-Fi 密码', en: 'What is the Wi-Fi password?' }
    ]
  },
  {
    icon: LifeBuoy,
    zh: '紧急求助',
    en: 'When something goes wrong',
    phrases: [
      { text: '助けてください', pron: 'Tasukete kudasai', zh: '请帮帮我', en: 'Please help me' },
      { text: '道に迷いました', pron: 'Michi ni mayoimashita', zh: '我迷路了', en: 'I’m lost' },
      { text: '具合が悪いです', pron: 'Guai ga warui desu', zh: '我身体不舒服', en: 'I feel unwell' },
      { text: '財布をなくしました', pron: 'Saifu o nakushimashita', zh: '我的钱包丢了', en: 'I lost my wallet' },
      { text: 'パスポートをなくしました', pron: 'Pasupooto o nakushimashita', zh: '我的护照丢了', en: 'I lost my passport' }
    ]
  },
  {
    icon: Hash,
    zh: '数字与数量',
    en: 'Numbers & counting',
    phrases: [
      { text: 'いち に さん よん ご', pron: 'Ichi, ni, san, yon, go', zh: '1 2 3 4 5', en: '1 2 3 4 5' },
      { text: 'ろく なな はち きゅう じゅう', pron: 'Roku, nana, hachi, kyuu, juu', zh: '6 7 8 9 10', en: '6 7 8 9 10' },
      { text: '百 / 千 / 一万', pron: 'Hyaku / sen / ichiman', zh: '100 / 1000 / 10000', en: '100 / 1,000 / 10,000' },
      { text: '一つ / 二つ / 三つ', pron: 'Hitotsu / futatsu / mittsu', zh: '一个 / 两个 / 三个', en: 'One / two / three (things)' },
      { text: '一人 / 二人 / 三人', pron: 'Hitori / futari / sannin', zh: '一位 / 两位 / 三位', en: 'One / two / three (people)' }
    ]
  }
];

const BOOKS: Record<Phrasebook['lang'], Phrasebook> = {
  th: {
    lang: 'th',
    tabKey: 'tabPhrases',
    tabShortKey: 'tabPhrasesShort',
    hintKey: 'phrasesHint',
    categories: THAI
  },
  ja: {
    lang: 'ja',
    tabKey: 'tabPhrasesJa',
    tabShortKey: 'tabPhrasesShortJa',
    hintKey: 'phrasesHintJa',
    categories: JAPANESE
  }
};

/**
 * Which phrasebook a trip gets. The trip's own currency is the one field that
 * already says which country it is in — the destination is free text ("Tohoku",
 * "曼谷") — so a yen trip speaks Japanese and everything else keeps the Thai
 * book the tab has always had.
 */
export function phrasebookFor(currency: string | undefined): Phrasebook {
  return currency?.trim().toUpperCase() === 'JPY' ? BOOKS.ja : BOOKS.th;
}
