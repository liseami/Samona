/**
 * [INPUT]: 无依赖，纯数据模块
 * [OUTPUT]: 对外提供 LINES 常量与 Line 类型——20 国语言的同一句标语
 * [POS]: i18n 的唯一数据源，被 App 消费用于轮换渲染
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 */

export interface Line {
  t: string;                 // 译文
  lang: string;              // BCP-47 语言标签，交给浏览器选形
  dir?: 'ltr' | 'rtl';       // 文字方向，缺省 ltr
}

// ============ 20 国语言 · 同一句话：人类唯一需要的 AI 应用 ============
export const LINES: Line[] = [
  { t: 'The only AI app humanity will ever need.', lang: 'en' },
  { t: '人类唯一需要的 AI 应用。', lang: 'zh' },
  { t: 'La única app de IA que la humanidad necesitará.', lang: 'es' },
  { t: 'मानवता को जिस एकमात्र AI ऐप की ज़रूरत होगी।', lang: 'hi' },
  { t: 'تطبيق الذكاء الاصطناعي الوحيد الذي ستحتاجه البشرية.', lang: 'ar', dir: 'rtl' },
  { t: 'O único app de IA de que a humanidade precisará.', lang: 'pt' },
  { t: 'Единственное ИИ-приложение, которое понадобится человечеству.', lang: 'ru' },
  { t: '人類が必要とする唯一のAIアプリ。', lang: 'ja' },
  { t: "La seule app d'IA dont l'humanité aura besoin.", lang: 'fr' },
  { t: 'Die einzige KI-App, die die Menschheit je brauchen wird.', lang: 'de' },
  { t: '인류에게 필요한 유일한 AI 앱.', lang: 'ko' },
  { t: "L'unica app di IA di cui l'umanità avrà bisogno.", lang: 'it' },
  { t: 'İnsanlığın ihtiyaç duyacağı tek yapay zekâ uygulaması.', lang: 'tr' },
  { t: 'Ứng dụng AI duy nhất mà nhân loại cần.', lang: 'vi' },
  { t: 'แอป AI เดียวที่มนุษยชาติต้องการ', lang: 'th' },
  { t: 'Satu-satunya aplikasi AI yang dibutuhkan umat manusia.', lang: 'id' },
  { t: 'De enige AI-app die de mensheid ooit nodig heeft.', lang: 'nl' },
  { t: 'Jedyna aplikacja SI, jakiej ludzkość będzie potrzebować.', lang: 'pl' },
  { t: 'Єдиний ШІ-застосунок, який знадобиться людству.', lang: 'uk' },
  { t: 'Η μόνη εφαρμογή ΤΝ που θα χρειαστεί ποτέ η ανθρωπότητα.', lang: 'el' },
];
