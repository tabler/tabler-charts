/**
 * Bundlewatch reports the bundles that `pnpm size` measures, with the same
 * budgets: scripts/size.mjs writes each bundle and its budget to .size/, so
 * run `pnpm size` first. With BUNDLEWATCH_GITHUB_TOKEN set (CI), pull
 * requests get a status comparing every size with main.
 */
const { readFileSync } = require('node:fs')

const watched = JSON.parse(readFileSync(`${__dirname}/.size/budgets.json`, 'utf8'))

module.exports = {
  files: watched.map(({ path, budget }) => ({
    path,
    // Budgets are in kB of 1000 bytes, like scripts/size.mjs.
    maxSize: `${Math.round(budget * 1000)}B`,
    compression: 'gzip',
  })),
  ci: { trackBranches: ['main'] },
}
