import { area, donut, sparkline } from '@tabler/charts'
import { chart, el } from '../dom.ts'
import { C, definePage } from '../page.ts'

// A made-up online store: thirty days, the same on every run.
let seed = 11
const random = () => {
  seed = (seed * 16807) % 2147483647
  return (seed - 1) / 2147483646
}
/** Thirty daily values around `base`, growing by `growth` over the month, with a weekly rhythm. */
const month = (base: number, growth: number, noise: number) =>
  Array.from({ length: 30 }, (_, day) => {
    const weekend = day % 7 === 5 || day % 7 === 6 ? 1.18 : 1
    return Math.round(base * (1 + (growth * day) / 29) * weekend * (1 + (random() - 0.5) * noise))
  })

const revenue = month(1380, 0.32, 0.18)
const previous = month(1290, 0.1, 0.18)
const orders = month(38, 0.22, 0.22)
const conversion = month(340, 0.12, 0.12).map((v) => v / 100)
const basket = revenue.map(
  (value, day) => Math.round((value / (orders[day] as number)) * 100) / 100,
)

const usd = { style: 'currency', currency: 'USD', maximumFractionDigits: 0 } as const
const DAYS = Array.from({ length: 30 }, (_, day) => Date.UTC(2026, 9, day + 1))

const TILES = [
  { name: 'Revenue', value: '$48,210', change: '+12.4%', up: true, data: revenue, color: C.blue },
  { name: 'Orders', value: '1,284', change: '+8.1%', up: true, data: orders, color: C.teal },
  {
    name: 'Conversion rate',
    value: '3.6%',
    change: '+0.4 pp',
    up: true,
    data: conversion,
    color: C.violet,
  },
  {
    name: 'Average order',
    value: '$37.50',
    change: '−2.3%',
    up: false,
    data: basket,
    color: C.amber,
  },
]

export default definePage({
  title: 'Store overview',
  subtitle: 'October 2026, against the month before',
  width: 896,
  render(body) {
    const tiles = el('div', 'tiles')
    tiles.style.setProperty('--columns', '4')
    for (const tile of TILES) {
      const box = el('div', 'tile')
      const change = el('div', 'tile-change', `${tile.change} on last month`)
      change.dataset.trend = tile.up ? 'up' : 'down'
      box.append(el('div', 'tile-label', tile.name), el('div', 'tile-value', tile.value), change)
      chart(
        box,
        { type: sparkline, variant: 'area', height: 36, name: tile.name, data: tile.data },
        { '--tc-color-1': tile.color },
      )
      tiles.append(box)
    }

    const panels = el('div', 'panels')
    const trend = el('div', 'panel')
    trend.append(el('div', 'panel-title', 'Revenue by day'))
    chart(trend, {
      type: area,
      title: 'Revenue by day',
      data: {
        labels: DAYS,
        series: [
          { name: 'October', values: revenue, color: C.blue },
          { name: 'September', values: previous, color: C.slate },
        ],
      },
      x: { type: 'time', utc: true },
      y: { format: usd },
      curve: 'monotone',
      fill: 'gradient',
      aspectRatio: 2.15,
    })

    const channels = el('div', 'panel')
    channels.append(el('div', 'panel-title', 'Orders by channel'))
    chart(channels, {
      type: donut,
      title: 'Orders by channel',
      data: [
        { name: 'Search', value: 512, color: C.blue },
        { name: 'Direct', value: 386, color: C.teal },
        { name: 'Email', value: 231, color: C.amber },
        { name: 'Social', value: 155, color: C.violet },
      ],
      center: { label: 'orders' },
      gap: 3,
      cornerRadius: 6,
      aspectRatio: 1.05,
    })

    panels.append(trend, channels)
    body.append(tiles, panels)
  },
})
