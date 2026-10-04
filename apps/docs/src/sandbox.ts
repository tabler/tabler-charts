/**
 * An empty page with the library and its adapters on `window`, for browser
 * tests that build their own charts (tests/visual/transitions.spec.ts,
 * lifecycle.spec.ts): `tc` (the library), `tcElements` (with
 * <tabler-chart> and the shadow <tabler-chart-shadow> defined),
 * `tcBootstrap`, and React and Vue with their components.
 */
import '@tabler/charts/style.css'
import * as tc from '@tabler/charts'
import * as tcBootstrap from '@tabler/charts-bootstrap'
import * as tcElements from '@tabler/charts-elements'
import { shadow } from '@tabler/charts-elements/shadow'
import * as tcReact from '@tabler/charts-react'
import * as tcVue from '@tabler/charts-vue'
import * as React from 'react'
import { flushSync } from 'react-dom'
import * as ReactDOM from 'react-dom/client'
import * as Vue from 'vue'

tcElements.defineChartElement()
tcElements.defineChartElement({ tag: 'tabler-chart-shadow', shadow })

Object.assign(window, {
  tc,
  tcBootstrap,
  tcElements,
  tcReact,
  tcVue,
  React,
  ReactDOM,
  flushSync,
  Vue,
})
document.body.dataset.ready = ''
