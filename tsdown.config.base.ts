import type { UserConfig } from 'tsdown'

/**
 * Shared build defaults for every published package.
 * Packages spread this into their own `tsdown.config.ts` and set `entry`.
 */
export const baseConfig: UserConfig = {
  format: ['esm', 'cjs'],
  platform: 'neutral',
  target: 'es2022',
  dts: true,
  sourcemap: true,
  clean: true,
  treeshake: true,
}
