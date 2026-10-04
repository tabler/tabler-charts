/**
 * An empty page with the whole library on `window.tc`, for browser tests
 * that build their own charts (tests/visual/transitions.spec.ts).
 */
import '@tabler/charts/style.css'
import * as tc from '@tabler/charts'

;(window as unknown as { tc: typeof tc }).tc = tc
document.body.dataset.ready = ''
