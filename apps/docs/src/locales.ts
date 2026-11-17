/**
 * Locales: the same three charts once per locale. The data is fixed, so the
 * only things that differ between sections are the `locale` option and the
 * translated names: digits, separators, currency, month names and calendars
 * all come from `Intl`.
 */
import '@tabler/charts/style.css'
import './site.css'
import { bar, Chart, donut, line } from '@tabler/charts'
import { setupThemeSwitch } from './theme.ts'

interface LocaleCase {
  /** BCP 47 tag passed to the charts as `locale`. */
  tag: string
  /** What to look for in this locale. */
  note: string
  revenueTitle: string
  visitorsTitle: string
  salesTitle: string
  revenue: string
  visitors: string
}

const LOCALES: LocaleCase[] = [
  {
    tag: 'en-US',
    note: 'The baseline: comma groups, a decimal point, $ before the number.',
    revenueTitle: 'Monthly revenue',
    visitorsTitle: 'Daily visitors',
    salesTitle: 'Sales by country',
    revenue: 'Revenue',
    visitors: 'Visitors',
  },
  {
    tag: 'pl-PL',
    note: 'Space groups, a decimal comma, compact words (mln) and USD after the number.',
    revenueTitle: 'Miesięczne przychody',
    visitorsTitle: 'Dzienna liczba odwiedzających',
    salesTitle: 'Sprzedaż według krajów',
    revenue: 'Przychody',
    visitors: 'Odwiedzający',
  },
  {
    tag: 'cs-CZ',
    note: 'Czech: space groups, a decimal comma, compact mil. and US$ after the number.',
    revenueTitle: 'Měsíční tržby',
    visitorsTitle: 'Denní návštěvníci',
    salesTitle: 'Prodeje podle zemí',
    revenue: 'Tržby',
    visitors: 'Návštěvníci',
  },
  {
    tag: 'de-CH',
    note: 'Swiss German: an apostrophe as the group separator.',
    revenueTitle: 'Monatlicher Umsatz',
    visitorsTitle: 'Tägliche Besucher',
    salesTitle: 'Umsatz nach Land',
    revenue: 'Umsatz',
    visitors: 'Besucher',
  },
  {
    tag: 'fr-FR',
    note: 'Narrow no-break space groups, a decimal comma, the currency after the number.',
    revenueTitle: 'Chiffre d’affaires mensuel',
    visitorsTitle: 'Visiteurs quotidiens',
    salesTitle: 'Ventes par pays',
    revenue: 'Chiffre d’affaires',
    visitors: 'Visiteurs',
  },
  {
    tag: 'mt-MT',
    note: 'Maltese: only the names are translated in Chrome, which ships no Maltese data and falls back to English formats.',
    revenueTitle: 'Dħul fix-xahar',
    visitorsTitle: 'Viżitaturi kuljum',
    salesTitle: 'Bejgħ skont il-pajjiż',
    revenue: 'Dħul',
    visitors: 'Viżitaturi',
  },
  {
    tag: 'ja-JP',
    note: 'Compact numbers count in myriads (万), months are numbered.',
    revenueTitle: '月間売上',
    visitorsTitle: '1日あたりの訪問者数',
    salesTitle: '国別売上',
    revenue: '売上',
    visitors: '訪問者数',
  },
  {
    tag: 'zh-CN',
    note: 'Simplified Chinese: compact numbers in 万, US$ for the dollar.',
    revenueTitle: '月度收入',
    visitorsTitle: '每日访客',
    salesTitle: '各国销售额',
    revenue: '收入',
    visitors: '访客',
  },
  {
    tag: 'vi-VN',
    note: 'Vietnamese: dot groups, a decimal comma, months numbered (Tháng 1).',
    revenueTitle: 'Doanh thu hàng tháng',
    visitorsTitle: 'Lượt khách truy cập hàng ngày',
    salesTitle: 'Doanh số theo quốc gia',
    revenue: 'Doanh thu',
    visitors: 'Khách truy cập',
  },
  {
    tag: 'hi-IN-u-nu-deva',
    note: 'Hindi with Devanagari digits, lakh grouping (12,34,567) and compact लाख.',
    revenueTitle: 'मासिक राजस्व',
    visitorsTitle: 'दैनिक आगंतुक',
    salesTitle: 'देश के अनुसार बिक्री',
    revenue: 'राजस्व',
    visitors: 'आगंतुक',
  },
  {
    tag: 'bn-BD',
    note: 'Bengali digits by default, lakh grouping.',
    revenueTitle: 'মাসিক আয়',
    visitorsTitle: 'দৈনিক দর্শনার্থী',
    salesTitle: 'দেশ অনুযায়ী বিক্রয়',
    revenue: 'আয়',
    visitors: 'দর্শনার্থী',
  },
  {
    tag: 'ar-EG',
    note: 'Right-to-left script, Eastern Arabic digits, Arabic separators.',
    revenueTitle: 'الإيرادات الشهرية',
    visitorsTitle: 'الزوار يوميًا',
    salesTitle: 'المبيعات حسب البلد',
    revenue: 'الإيرادات',
    visitors: 'الزوار',
  },
  {
    tag: 'fa-IR',
    note: 'Right-to-left, Persian digits and the Solar Hijri calendar: the dates read 1404–1405.',
    revenueTitle: 'درآمد ماهانه',
    visitorsTitle: 'بازدیدکنندگان روزانه',
    salesTitle: 'فروش بر اساس کشور',
    revenue: 'درآمد',
    visitors: 'بازدیدکنندگان',
  },
  {
    tag: 'he-IL',
    note: 'Right-to-left script with Western digits.',
    revenueTitle: 'הכנסות חודשיות',
    visitorsTitle: 'מבקרים יומיים',
    salesTitle: 'מכירות לפי מדינה',
    revenue: 'הכנסות',
    visitors: 'מבקרים',
  },
  {
    tag: 'th-TH',
    note: 'Thai script and the Buddhist calendar: 2026 is the year 2569.',
    revenueTitle: 'รายได้รายเดือน',
    visitorsTitle: 'ผู้เข้าชมรายวัน',
    salesTitle: 'ยอดขายตามประเทศ',
    revenue: 'รายได้',
    visitors: 'ผู้เข้าชม',
  },
  {
    tag: 'am-ET',
    note: 'Amharic in the Ge’ez script.',
    revenueTitle: 'ወርሃዊ ገቢ',
    visitorsTitle: 'ዕለታዊ ጎብኚዎች',
    salesTitle: 'ሽያጭ በአገር',
    revenue: 'ገቢ',
    visitors: 'ጎብኚዎች',
  },
  {
    tag: 'ta-IN',
    note: 'Tamil script with lakh grouping (12,34,567).',
    revenueTitle: 'மாதாந்திர வருவாய்',
    visitorsTitle: 'தினசரி பார்வையாளர்கள்',
    salesTitle: 'நாடு வாரியாக விற்பனை',
    revenue: 'வருவாய்',
    visitors: 'பார்வையாளர்கள்',
  },
  {
    tag: 'sw-KE',
    note: 'Swahili: Latin script, the compact unit goes before the number (M2).',
    revenueTitle: 'Mapato ya kila mwezi',
    visitorsTitle: 'Wageni wa kila siku',
    salesTitle: 'Mauzo kwa nchi',
    revenue: 'Mapato',
    visitors: 'Wageni',
  },
]

// -- The data: identical in every locale ---------------------------------------

const DAY = 86_400_000
const YEAR = 2026

/** Revenue per month of 2026, in US dollars. */
const REVENUE = [
  842_000, 915_500, 1_120_000, 1_084_300, 1_372_900, 1_561_000, 1_498_750, 1_730_200, 1_905_000,
  2_148_600, 2_390_400, 2_871_300,
]

/** 120 days from 1 January 2026 (UTC): a slow rise with a weekly dip. */
const DAYS = Array.from({ length: 120 }, (_, i) => Date.UTC(YEAR, 0, 1) + i * DAY)
const VISITORS = DAYS.map((stamp, i) => {
  const weekend = [0, 6].includes(new Date(stamp).getUTCDay()) ? 0.72 : 1
  return Math.round(
    (18_400 + i * 95 + 3_600 * Math.sin(i / 9) + 1_250 * Math.sin(i / 2.3)) * weekend,
  )
})

/** Sales by country, in US dollars; the names come from `Intl.DisplayNames`. */
const SALES: [region: string, value: number][] = [
  ['US', 4_812_400],
  ['DE', 2_376_150],
  ['JP', 1_954_800],
  ['BR', 1_208_300],
  ['IN', 987_650],
  ['PL', 641_200],
]

const USD = { style: 'currency', currency: 'USD' } as const

// -- The page -------------------------------------------------------------------

setupThemeSwitch()
for (const link of document.querySelectorAll('.site-nav a')) {
  if (link.getAttribute('href') === '/locales.html') link.setAttribute('aria-current', 'page')
}

const root = document.getElementById('locales') as HTMLElement
const jump = document.getElementById('locale-groups') as HTMLElement
const count = document.getElementById('locale-count')
if (count) count.textContent = String(LOCALES.length)

const english = new Intl.DisplayNames('en', { type: 'language' })

function card(grid: HTMLElement, lang: string, title: string): HTMLElement {
  const figure = document.createElement('figure')
  figure.className = 'gallery-item'
  figure.dataset.title = title
  const caption = document.createElement('figcaption')
  caption.dir = 'auto'
  const strong = document.createElement('strong')
  strong.textContent = title
  caption.append(strong)
  const host = document.createElement('div')
  host.lang = lang
  figure.append(caption, host)
  grid.append(figure)
  return host
}

for (const item of LOCALES) {
  const { tag } = item
  // The language part alone: `hi-IN-u-nu-deva` is Hindi, whatever its digits.
  const lang = new Intl.Locale(tag).language
  const native = new Intl.DisplayNames(tag, { type: 'language' }).of(lang) ?? tag
  const name = english.of(lang) ?? tag

  const link = document.createElement('a')
  link.href = `#${tag}`
  link.textContent = name
  jump.append(link)

  const heading = document.createElement('h2')
  heading.className = 'case-group'
  heading.id = tag
  heading.dataset.locale = tag
  const nativeName = document.createElement('span')
  nativeName.lang = lang
  nativeName.textContent = native
  heading.append(nativeName, ` · ${name} `)
  const code = document.createElement('code')
  code.textContent = tag
  heading.append(code)

  // One number and one date, so the conventions show before the charts do.
  const sample = `${new Intl.NumberFormat(tag).format(1_234_567.89)} · ${new Intl.DateTimeFormat(
    tag,
    { dateStyle: 'long', timeZone: 'UTC' },
  ).format(Date.UTC(YEAR, 2, 14))}`
  const note = document.createElement('p')
  note.className = 'group-note'
  const sampleText = document.createElement('bdi')
  sampleText.lang = lang
  sampleText.textContent = sample
  note.append(`${item.note} `, sampleText)

  const grid = document.createElement('div')
  grid.className = 'gallery'
  root.append(heading, note, grid)

  const month = new Intl.DateTimeFormat(tag, { month: 'short', timeZone: 'UTC' })
  new Chart(card(grid, lang, item.revenueTitle), {
    type: bar,
    locale: tag,
    title: item.revenueTitle,
    y: { format: { ...USD, notation: 'compact' } },
    data: {
      // The 15th, so calendars with other month boundaries still name twelve months.
      labels: REVENUE.map((_, m) => month.format(Date.UTC(YEAR, m, 15))),
      series: [{ name: item.revenue, values: REVENUE }],
    },
  })

  new Chart(card(grid, lang, item.visitorsTitle), {
    type: line,
    locale: tag,
    title: item.visitorsTitle,
    points: 'none',
    x: { type: 'time', utc: true },
    data: { labels: DAYS, series: [{ name: item.visitors, values: VISITORS }] },
  })

  const region = new Intl.DisplayNames(tag, { type: 'region' })
  new Chart(card(grid, lang, item.salesTitle), {
    type: donut,
    locale: tag,
    title: item.salesTitle,
    format: { ...USD, notation: 'compact' },
    data: SALES.map(([code, value]) => ({ name: region.of(code) ?? code, value })),
  })
}
