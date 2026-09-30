import type { Hit } from '@tabler/charts'
import { BarChart, DonutChart } from '@tabler/charts-vue'
import { createApp, defineComponent, h, reactive, ref } from 'vue'
import type { Demo } from '../demo.ts'

const SOURCES = ['Direct', 'Search', 'Social', 'Referral']
const WEEKS = ['W1', 'W2', 'W3', 'W4', 'W5', 'W6']

const CODE = `<script setup>
import { BarChart } from '@tabler/charts-vue'
const data = reactive({ labels, series })
</script>

<template>
  <BarChart :data="data" stacked :aspect-ratio="3" locale="en-US" @hover="({ hit }) => …" />
</template>

// data.series[0].values.push(42) updates the chart: data is watched deeply.`

const App = defineComponent(() => {
  const data = reactive({
    labels: [...WEEKS],
    series: SOURCES.slice(0, 3).map((name) => ({
      name,
      values: WEEKS.map(() => Math.round(20 + Math.random() * 60)),
    })),
  })
  const stacked = ref(true)
  const hovered = ref<Hit | null>(null)
  const addWeek = () => {
    data.labels.push(`W${data.labels.length + 1}`)
    // Changed in place: no new object, the deep watch picks it up.
    for (const s of data.series) s.values.push(Math.round(20 + Math.random() * 60))
  }
  const totals = () =>
    data.series.map((s) => ({ name: s.name, value: s.values.reduce((a, b) => a + b, 0) }))

  return () =>
    h('div', [
      h('pre', { style: 'overflow-x: auto' }, [h('code', CODE)]),
      h('div', { style: 'display: grid; grid-template-columns: 2fr 1fr; gap: 16px' }, [
        h(BarChart, {
          data,
          stacked: stacked.value,
          'aspect-ratio': 2,
          locale: 'en-US',
          onHover: ({ hit }: { hit: Hit | null }) => {
            hovered.value = hit
          },
        }),
        h(DonutChart, { data: totals(), 'aspect-ratio': 1, locale: 'en-US', legend: false }),
      ]),
      h('div', { class: 'demo-controls' }, [
        h('button', { type: 'button', onClick: addWeek }, 'Add a week (in place)'),
        h(
          'button',
          { type: 'button', onClick: () => (stacked.value = !stacked.value) },
          stacked.value ? 'Grouped' : 'Stacked',
        ),
        h('span', `@hover: ${hovered.value ? hovered.value.title : '–'}`),
      ]),
    ])
})

export const vueDemo: Demo = {
  id: 'vue',
  title: 'Vue',
  description:
    '@tabler/charts-vue: <LineChart>, <BarChart>, … and <TablerChart :type>, plus useChart() for your own element. Options are attributes (kebab-case works), data is watched deeply so reactive arrays can change in place, events are emitted (@hover, @click, @legend-toggle, @render). Renders on the server (Nuxt too) and the browser takes the SVG over.',
  mount(el) {
    createApp(App).mount(el)
  },
}
