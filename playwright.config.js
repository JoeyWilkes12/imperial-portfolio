import { defineConfig } from "@playwright/test";

const port = process.env.TEST_PORT || process.env.PORT || "4314";
const baseURL = `http://127.0.0.1:${port}`;

export default defineConfig({
  testDir: "./tests",
  outputDir: "./output/playwright/results",
  reporter: "line",
  use: {
    baseURL,
    trace: "retain-on-failure"
  },
  webServer: {
    command: "node tests/static-server.mjs",
    url: baseURL,
    env: { PORT: port },
    reuseExistingServer: false
  },
  projects: [
    { name: "desktop", use: { viewport: { width: 1440, height: 900 } } },
    { name: "mobile", use: { viewport: { width: 390, height: 844 } } }
  ]
});
