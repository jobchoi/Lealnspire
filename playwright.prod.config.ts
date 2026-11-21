import { defineConfig, devices } from '@playwright/test'

// 배포용 빌드(production) E2E: 루트(/)와 하위 경로(/lealnspire/) 두 가지로 빌드해 미리보기 서버에서 확인합니다.
// 실행: npm run e2e:prod  (vite preview --outDir/--base는 설치된 vite 8.3.8의 `vite preview --help`로 확인)
const servers = [
  { name: 'root', base: '/', port: 4173, outDir: 'dist-e2e/root' },
  { name: 'subpath', base: '/lealnspire/', port: 4174, outDir: 'dist-e2e/subpath' },
]

export default defineConfig({
  testDir: 'e2e',
  testMatch: '**/*.prod.ts',
  outputDir: 'e2e-results/prod',
  retries: 0,
  reporter: [['list']],
  use: { trace: 'retain-on-failure', screenshot: 'only-on-failure' },
  webServer: servers.map(s => ({
    command: `npx vite build --base=${s.base} --outDir ${s.outDir} --emptyOutDir && npx vite preview --base ${s.base} --outDir ${s.outDir} --port ${s.port} --strictPort`,
    url: `http://localhost:${s.port}${s.base}`,
    reuseExistingServer: false,
    timeout: 120_000,
  })),
  projects: servers.flatMap(s => [
    { name: `${s.name}-desktop`, use: { ...devices['Desktop Chrome'], viewport: { width: 1280, height: 720 }, baseURL: `http://localhost:${s.port}${s.base}` } },
    { name: `${s.name}-phone`, use: { ...devices['Desktop Chrome'], viewport: { width: 375, height: 667 }, hasTouch: true, isMobile: true, baseURL: `http://localhost:${s.port}${s.base}` } },
  ]),
})
