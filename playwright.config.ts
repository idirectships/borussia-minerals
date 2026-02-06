import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./tests",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  reporter: "html",
  use: {
    baseURL: "http://localhost:3000",
    trace: "on-first-retry",
  },
  projects: [
    {
      name: "Mobile Chrome",
      use: { ...devices["Pixel 7"] },
    },
    {
      name: "Mobile iPhone",
      use: {
        ...devices["iPhone 14"],
        // Use Chromium to emulate iPhone viewport (WebKit not installed)
        browserName: "chromium",
      },
    },
    {
      name: "Desktop Chrome",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
  webServer: {
    command: "pnpm dev",
    url: "http://localhost:3000",
    reuseExistingServer: true,
  },
});
