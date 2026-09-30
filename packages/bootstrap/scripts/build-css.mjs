/** Write dist/bootstrap.css and dist/tabler.css, compiled from scss/ and minified. */
import { mkdirSync, writeFileSync } from 'node:fs'
import { mappingStyles, tablerStyles } from './styles.mjs'

const dist = new URL('../dist/', import.meta.url)
mkdirSync(dist, { recursive: true })
writeFileSync(new URL('bootstrap.css', dist), mappingStyles())
writeFileSync(new URL('tabler.css', dist), tablerStyles())
