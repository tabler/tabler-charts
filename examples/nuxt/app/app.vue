<script setup>
// Rendered on the server by Nuxt; the browser takes the SVG over on hydration.
import { BarChart, LineChart } from '@tabler/charts-vue'
import { reactive, ref } from 'vue'

const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
const revenue = reactive({
  labels: months,
  series: [
    { name: 'Revenue', values: [42, 48, 45, 53, 58, 61, 59, 66, 70, 68, 75, 82] },
    {
      name: 'Costs',
      values: [30, 31, 33, 34, 36, 35, 38, 40, 41, 43, 44, 47],
      dash: 4,
      width: 1.5,
    },
  ],
})
const channels = reactive({
  labels: ['Q1', 'Q2', 'Q3', 'Q4'],
  series: [
    { name: 'Direct', values: [120, 132, 101, 134] },
    { name: 'Search', values: [220, 182, 191, 234] },
    { name: 'Social', values: [150, 232, 201, 154] },
  ],
})
const hovered = ref(null)

// Reactive data changes in place update the chart (data is watched deeply).
function addQuarter() {
  channels.labels.push(`Q${channels.labels.length + 1}`)
  for (const s of channels.series) s.values.push(Math.round(100 + Math.random() * 150))
}
</script>

<template>
  <main>
    <h1>Nuxt SSR</h1>
    <section>
      <h2>Revenue — hover: {{ hovered ?? '–' }}</h2>
      <LineChart
        :data="revenue"
        :aspect-ratio="3"
        locale="en-US"
        title="Revenue and costs, 2026"
        points="last"
        @hover="({ hit }) => (hovered = hit ? hit.title : null)"
      />
    </section>
    <section>
      <h2>Channels</h2>
      <BarChart :data="channels" stacked :aspect-ratio="3" locale="en-US" title="Visits by channel" />
      <button type="button" @click="addQuarter">Add a quarter</button>
    </section>
  </main>
</template>
