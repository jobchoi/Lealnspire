import { defineConfig, devices } from '@playwright/test'

// 사용자 시나리오 E2E. 실행: npm run e2e (개발 서버가 없으면 자동으로 띄움)
export default defineConfig({
  testDir: 'e2e',
  testMatch: '**/*.e2e.ts',
  outputDir: 'e2e-results',
  fullyParallel: true,
  retries: 0,
  reporter: [['list']],
  use: {
    baseURL: 'http://localhost:5173',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
  webServer: {
    command: 'npm run dev -- --port 5173 --strictPort',
    url: 'http://localhost:5173',
    reuseExistingServer: true,
    timeout: 60_000,
  },
  projects: [
    { name: 'desktop', use: { ...devices['Desktop Chrome'], viewport: { width: 1280, height: 720 } } },
    { name: 'phone', use: { ...devices['Desktop Chrome'], viewport: { width: 375, height: 667 }, hasTouch: true, isMobile: true } },
    { name: 'small-phone', use: { ...devices['Desktop Chrome'], viewport: { width: 360, height: 560 }, hasTouch: true, isMobile: true }, grep: /@layout/ },
  ],
})
