/** Write dist/bootstrap.css: scss/_charts.scss compiled and minified. */
import { mkdirSync, writeFileSync } from 'node:fs'
import { mappingStyles } from './styles.mjs'

const out = new URL('../dist/bootstrap.css', import.meta.url)
mkdirSync(new URL('.', out), { recursive: true })
writeFileSync(out, mappingStyles())
