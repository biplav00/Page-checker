import { defineConfig } from "@playwright/test";

export default defineConfig({
  reporter: [["list"], ["html", { outputFolder: "playwright-report", open: "never" }]],
  use: {
    headless: true,
    screenshot: "only-on-failure",
  },
  workers: 4, // Number of parallel workers (adjust as needed)
});
