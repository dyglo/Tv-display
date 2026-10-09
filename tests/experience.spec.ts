import { test, expect } from "@playwright/test";
import { solarState } from "../lib/environment";

test("solar cycle is continuous across midnight and separates day from night", () => {
  expect(solarState(12).daylight).toBe(1);
  expect(solarState(23).night).toBe(1);
  expect(solarState(6.5).warmth).toBeGreaterThan(0.1);
  const a = solarState(23.999);
  const b = solarState(0.001);
  expect(Math.abs(a.elevation - b.elevation)).toBeLessThan(0.001);
  for (let h = 0; h < 24; h += 0.01)
    expect(
      Math.abs(solarState(h).daylight - solarState(h + 0.01).daylight),
    ).toBeLessThan(0.01);
});

test("scene selection, genuine animation, preferences, remote navigation and fullscreen", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto("/");
  await expect(page.getByRole("heading", { level: 1 })).toContainText(
    "stillness",
  );
  await page.waitForFunction(
    () => !!window.__livingScreen?.frames && window.__livingScreen.frames > 10,
  );
  const start = await page.evaluate(() => window.__livingScreen!.frames);
  await expect
    .poll(() => page.evaluate(() => window.__livingScreen!.frames), {
      timeout: 15000,
    })
    .toBeGreaterThan(start + 8);
  for (const [name, id] of [
    ["Infinite Galaxy", "galaxy"],
    ["Living Nature", "nature"],
    ["Living Room", "room"],
  ]) {
    const card = page.getByRole("button", { name: new RegExp(name) });
    await card.click();
    await expect(card).toHaveAttribute("aria-pressed", "true");
    await page.waitForFunction((id) => window.__livingScreen?.scene === id, id);
  }
  await page.getByRole("button", { name: /Infinite Galaxy/ }).focus();
  await page.keyboard.press("ArrowRight");
  await expect(
    page.getByRole("button", { name: /Living Nature/ }),
  ).toBeFocused();
  await page.keyboard.press("Enter");
  await expect(
    page.getByRole("button", { name: /Living Nature/ }),
  ).toHaveAttribute("aria-pressed", "true");
  await page.getByRole("button", { name: "Clock", exact: true }).click();
  await page.reload();
  await expect(
    page.getByRole("button", { name: /Living Nature/ }),
  ).toHaveAttribute("aria-pressed", "true");
  await expect(page.locator(".clock-overlay")).toBeVisible();
  await page.getByRole("button", { name: /Sound off/ }).click();
  await expect(page.getByRole("button", { name: /Sound on/ })).toHaveAttribute(
    "aria-pressed",
    "true",
  );
  await page.getByRole("button", { name: "Enter ambient mode" }).click();
  await expect(page.locator("main")).toHaveClass("app ambient");
  await expect(page.locator(".interface")).toBeHidden();
  expect(await page.evaluate(() => !!document.fullscreenElement)).toBe(true);
  await page.keyboard.press("Escape");
  await expect(page.locator("main")).toHaveClass("app");
  expect(errors).toEqual([]);
});

test("lighting previews, quality, context restoration and hidden-page pause", async ({
  page,
}) => {
  await page.goto("/");
  await page.waitForFunction(
    () => !!window.__livingScreen?.frames && window.__livingScreen.frames > 10,
  );
  await page.getByRole("button", { name: "Open settings" }).click();
  for (const [name, hour] of [
    ["Sunrise", 6.5],
    ["Daylight", 12],
    ["Sunset", 18],
    ["Night", 23],
  ] as const) {
    await page.getByRole("button", { name, exact: true }).click();
    await page.waitForFunction((h) => window.__livingScreen?.hour === h, hour);
  }
  await expect
    .poll(() => page.evaluate(() => window.__livingScreen?.solar.night), {
      timeout: 12000,
    })
    .toBeGreaterThan(0.9);
  await page.getByRole("button", { name: "Use local time" }).click();
  await page.waitForFunction(
    () =>
      Math.abs(
        window.__livingScreen!.hour -
          (new Date().getHours() + new Date().getMinutes() / 60),
      ) < 0.1,
  );
  await page.getByRole("combobox").selectOption("low");
  await page.waitForFunction(
    () => !!window.__livingScreen && window.__livingScreen.dpr <= 0.65,
  );
  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog")).toBeHidden();
  await page.evaluate(() => {
    Object.defineProperty(document, "hidden", {
      configurable: true,
      value: true,
    });
    document.dispatchEvent(new Event("visibilitychange"));
  });
  const frames = await page.evaluate(() => window.__livingScreen!.frames);
  await page.waitForTimeout(800);
  expect(await page.evaluate(() => window.__livingScreen!.frames)).toBe(frames);
  await page.evaluate(() => {
    Object.defineProperty(document, "hidden", {
      configurable: true,
      value: false,
    });
    document.dispatchEvent(new Event("visibilitychange"));
  });
  await expect
    .poll(() => page.evaluate(() => window.__livingScreen!.frames), {
      timeout: 15000,
    })
    .toBeGreaterThan(frames + 2);
  await page.evaluate(() => {
    const gl = document.querySelector("canvas")!.getContext("webgl2")!;
    const ext = gl.getExtension("WEBGL_lose_context")!;
    ext.loseContext();
    setTimeout(() => ext.restoreContext(), 1500);
  });
  await expect(page.getByText("Restoring your environment…")).toBeVisible();
  await expect(page.getByText("Restoring your environment…")).toBeHidden({
    timeout: 15000,
  });
  const count = await page.evaluate(() => window.__livingScreen!.frames);
  await expect
    .poll(() => page.evaluate(() => window.__livingScreen!.frames), {
      timeout: 15000,
    })
    .toBeGreaterThan(count + 3);
  await page.evaluate(() =>
    document
      .querySelector("canvas")!
      .getContext("webgl2")!
      .getExtension("WEBGL_lose_context")!
      .loseContext(),
  );
  await expect(
    page.getByRole("button", { name: "Retry", exact: true }),
  ).toBeFocused();
  await page.keyboard.press("Enter");
  await expect(page.getByText("Restoring your environment…")).toBeHidden();
  const retried = await page.evaluate(() => window.__livingScreen!.frames);
  await expect
    .poll(() => page.evaluate(() => window.__livingScreen!.frames), {
      timeout: 30000,
    })
    .toBeGreaterThan(retried + 3);
});

test("unsupported WebGL has an animated fallback and usable controls", async ({
  page,
}) => {
  await page.addInitScript(() => {
    const original = HTMLCanvasElement.prototype.getContext;
    HTMLCanvasElement.prototype.getContext = function (
      this: HTMLCanvasElement,
      type: string,
      ...args: unknown[]
    ) {
      if (type === "webgl2" || type === "webgl") return null;
      return Reflect.apply(original, this, [type, ...args]);
    } as typeof original;
  });
  await page.goto("/");
  await expect(page.locator(".fallback-landscape")).toBeVisible();
  await page.getByRole("button", { name: /Infinite Galaxy/ }).click();
  await expect(page.locator(".scene-galaxy .fallback-landscape")).toBeVisible();
  await page.getByRole("button", { name: "Enter ambient mode" }).click();
  await expect(page.locator("main")).toHaveClass("app ambient");
  await page.keyboard.press("Enter");
  await expect(page.locator("main")).toHaveClass("app");
});

test("4K and mobile layouts keep controls within the viewport", async ({
  page,
}) => {
  for (const size of [
    { width: 3840, height: 2160 },
    { width: 390, height: 844 },
  ]) {
    await page.setViewportSize(size);
    await page.goto("/");
    await expect(
      page.getByRole("button", { name: "Enter ambient mode" }),
    ).toBeVisible();
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
    if (size.width === 3840) {
      await page.waitForFunction(() => !!window.__livingScreen);
      expect(
        await page.evaluate(() => window.__livingScreen!.dpr),
      ).toBeLessThanOrEqual(0.5);
    }
  }
});

test("repeated scene switches release previous scene resources", async ({
  page,
}) => {
  await page.goto("/");
  await page.waitForFunction(() => (window.__livingScreen?.frames ?? 0) > 10);
  const baseline = await page.evaluate(() => ({ ...window.__livingScreen! }));
  for (let cycle = 0; cycle < 2; cycle++) {
    for (const [name, id] of [
      ["Infinite Galaxy", "galaxy"],
      ["Living Nature", "nature"],
      ["Living Room", "room"],
    ]) {
      await page.getByRole("button", { name: new RegExp(name) }).click();
      await page.waitForFunction(
        (id) => window.__livingScreen?.scene === id,
        id,
      );
      const frame = await page.evaluate(() => window.__livingScreen!.frames);
      await expect
        .poll(() => page.evaluate(() => window.__livingScreen!.frames), {
          timeout: 15000,
        })
        .toBeGreaterThan(frame + 2);
    }
  }
  const after = await page.evaluate(() => window.__livingScreen!);
  expect(after.geometries).toBeLessThanOrEqual(baseline.geometries + 2);
  expect(after.textures).toBeLessThanOrEqual(baseline.textures);
});
