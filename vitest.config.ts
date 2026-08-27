import { fileURLToPath } from 'node:url'
import { mergeConfig, defineConfig, configDefaults } from 'vitest/config'
import viteConfig from './vite.config'

export default mergeConfig(
  viteConfig,
  defineConfig({
    test: {
      environment: 'jsdom',
      exclude: [...configDefaults.exclude, 'e2e/**'],
      root: fileURLToPath(new URL('./', import.meta.url)),
      // formatDate/formatDateTime (src/lib/formatDate.ts) format using the
      // runtime's default timezone, not a fixed IANA zone — pinned here so
      // date-formatting tests are deterministic regardless of the machine/CI
      // running them. Matches the mock data's own +03 timestamps.
      env: { TZ: 'Europe/Istanbul' },
    },
  }),
)
