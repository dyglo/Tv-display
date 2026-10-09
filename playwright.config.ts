import { defineConfig } from "@playwright/test";
export default defineConfig({
  testDir: "./tests",
  timeout: 120000,
  workers: 1,
  use: {
    baseURL: process.env.BASE_URL ?? "http://127.0.0.1:3000",
    viewport: { width: 1280, height: 720 },
    launchOptions: {
      executablePath: process.env.CHROMIUM_PATH ?? "/usr/bin/chromium",
      args: [
        "--no-sandbox",
        "--enable-webgl",
        "--use-gl=angle",
        "--use-angle=swiftshader",
        "--enable-unsafe-swiftshader",
      ],
    },
  },
});
