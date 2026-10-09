import { chromium } from "playwright";
import { writeFile } from "node:fs/promises";
const url = process.env.BASE_URL ?? "http://127.0.0.1:3000";
const browser = await chromium.launch({
  executablePath: process.env.CHROMIUM_PATH ?? "/usr/bin/chromium",
  args: [
    "--no-sandbox",
    "--use-gl=angle",
    "--use-angle=swiftshader",
    "--enable-unsafe-swiftshader",
  ],
});
const page = await browser.newPage({ viewport: { width: 1920, height: 1080 } });
const errors = [];
page.on("pageerror", (error) => errors.push(error.message));
await page.goto(url);
const cdp = await page.context().newCDPSession(page);
const report = {
  url,
  viewport: "1920 × 1080",
  quality: "Adaptive",
  renderer: "",
  scenes: [],
  errors,
};
for (const [name, id] of [
  ["Living Room", "room"],
  ["Infinite Galaxy", "galaxy"],
  ["Living Nature", "nature"],
]) {
  await page.getByRole("button", { name: new RegExp(name) }).click();
  await page.waitForFunction((id) => window.__livingScreen?.scene === id, id, {
    timeout: 90000,
  });
  await page.getByRole("button", { name: "Enter ambient mode" }).click();
  await page.waitForTimeout(12000);
  const start = await page.evaluate(() => ({
    frames: window.__livingScreen.frames,
    time: performance.now(),
  }));
  await page.waitForTimeout(15000);
  const sample = await page.evaluate((start) => {
    const stats = window.__livingScreen;
    const gl = document.querySelector("canvas").getContext("webgl2");
    const ext = gl.getExtension("WEBGL_debug_renderer_info");
    return {
      ...stats,
      measuredFPS:
        ((stats.frames - start.frames) * 1000) /
        (performance.now() - start.time),
      renderer: ext
        ? gl.getParameter(ext.UNMASKED_RENDERER_WEBGL)
        : "Unavailable",
    };
  }, start);
  const memory = await cdp.send("Runtime.getHeapUsage");
  report.renderer = sample.renderer;
  report.scenes.push({
    scene: id,
    fps: Number(sample.measuredFPS.toFixed(1)),
    sampledFPS: sample.fps,
    dpr: sample.dpr,
    drawCalls: sample.calls,
    triangles: sample.triangles,
    geometries: sample.geometries,
    textures: sample.textures,
    jsHeapMiB: Number((memory.usedSize / 1048576).toFixed(1)),
  });
  console.log(JSON.stringify(report.scenes.at(-1)));
  await page.screenshot({ path: `artifacts/${id}.png` });
  await page.keyboard.press("Escape");
  if (id === "room") {
    await page.screenshot({ path: "artifacts/home.png" });
    await page.getByRole("button", { name: "Open settings" }).click();
    await page.getByRole("button", { name: "Daylight", exact: true }).click();
    await page.getByRole("button", { name: "Done", exact: true }).click();
    await page.getByRole("button", { name: "Enter ambient mode" }).click();
    await page.waitForTimeout(7000);
    await page.screenshot({ path: "artifacts/room.png" });
    await page.keyboard.press("Escape");
  }
}
await writeFile("artifacts/performance.json", JSON.stringify(report, null, 2));
console.log("Renderer:", report.renderer, "Errors:", errors.length);
await browser.close();
