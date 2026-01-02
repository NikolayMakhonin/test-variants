import type { PlaywrightTestConfig } from '@playwright/test'

const config: PlaywrightTestConfig = {
  // webServer: {
  //   command: 'pnpm run build && pnpm run preview',
  //   port: 4173,
  // },
  testDir: 'src',
  // include **/*.e2e.ts but exclude **/temp/**
  testMatch: /^(?:(?![\\/]temp[\\/]).)*\.e2e\.[jt]s$/,
}

export default config
