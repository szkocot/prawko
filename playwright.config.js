const { defineConfig } = require('@playwright/test');

module.exports = defineConfig({
  testDir: './tests',
  use: {
    baseURL: 'http://localhost:3333',
    screenshot: 'on',
    serviceWorkers: 'block',
  },
  webServer: {
    command: 'python3 -m http.server 3333 -d src',
    port: 3333,
    reuseExistingServer: true,
  },
  projects: [
    {
      name: 'chromium',
      use: { browserName: 'chromium', viewport: { width: 420, height: 900 } },
    },
  ],
});
