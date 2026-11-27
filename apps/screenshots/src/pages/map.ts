import { map } from '@tabler/charts'
import { world } from '@tabler/charts/maps/world'
import { C, definePage } from '../page.ts'

// Years of life expected at birth, and the countries at each value.
const BY_YEARS: Record<number, string> = {
  85: 'JP',
  84: 'CH AU ES IT KR',
  83: 'SE NO FR CA IE IL AE IS',
  82: 'NZ NL AT FI PT GR BE DK QA LU SI',
  81: 'GB DE CL KW CR',
  80: 'CZ OM PA',
  79: 'US SA EE HR AL',
  78: 'PL CN CO PE IR UY CU SK JO LB BA',
  77: 'TR AR MY EC HU TN LK MK',
  76: 'BR DZ TH RO BG RS LV LT AM',
  75: 'MX MA VN BD NI',
  74: 'KZ PY BY AZ GE DO',
  73: 'RU UA VE LY KP GT HN SR',
  72: 'EG IN IQ SY MN UZ SV JM KG',
  71: 'ID TJ MD',
  70: 'PH NP TM KH GY',
  69: 'YE BO LA SN BW',
  68: 'PK UG MR GA ER',
  67: 'ET TZ MM RW MW NA',
  66: 'ZA SD ZM AF PG DJ',
  65: 'AO GH CG HT',
  64: 'KE MG CM SZ',
  63: 'MZ ZW BI',
  62: 'CD CI TG LR',
  61: 'NE BF SL',
  60: 'ML GN BJ',
  59: 'SO',
  57: 'CF SS LS',
  55: 'TD',
  54: 'NG',
}

export default definePage({
  title: 'Life expectancy at birth',
  subtitle: 'Years, both sexes, 2023',
  source: 'UN World Population Prospects 2024, rounded',
  width: 800,
  config: {
    type: map,
    map: world,
    data: Object.fromEntries(
      Object.entries(BY_YEARS).flatMap(([years, codes]) =>
        codes.split(' ').map((code) => [code, Number(years)]),
      ),
    ),
    min: 52,
    max: 86,
    colors: [C.grid, C.teal],
    format: (v: number) => `${v} y`,
  },
})
