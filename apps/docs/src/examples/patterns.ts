import { bar, Chart } from '@tabler/charts'
import '@tabler/charts/style.css'

new Chart('#chart', {
  type: bar,
  data: {
    labels: ['Q1', 'Q2', 'Q3', 'Q4'],
    series: [
      { name: 'Free', values: [42, 51, 47, 63] },
      { name: 'Pro', values: [31, 35, 39, 44] },
      { name: 'Team', values: [18, 22, 27, 31] },
    ],
  },
  // true: always; 'auto' (the default): in forced colors only; false: never.
  // With true, the points of line, radar and scatter charts get shapes too
  // (shapes: true gives them shapes without the patterns).
  patterns: true,
  locale: 'en-US',
})

// The lines and dots of the patterns take --tc-pattern-color (the surface by default):
// .my-charts { --tc-pattern-color: #fff; }
