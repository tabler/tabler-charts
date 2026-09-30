import { describe, expect, test } from 'vitest'
import pkg from '../package.json'
import * as charts from './index.ts'

describe('@tabler/charts', () => {
  test('exposes the package version', () => {
    expect(charts.VERSION).toBe(pkg.version)
  })
})
