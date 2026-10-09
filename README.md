# LivingScreen

Live: https://livingscreen.vercel.app

A browser-local ambient display for television. Next.js, TypeScript, Tailwind CSS and React Three Fiber. No account, database, external assets or paid APIs.

## Run

```sh
npm ci
npm run dev
```

Open http://localhost:3000. For production: `npm run build && npm start`.

## TV controls

- Arrow keys move between controls; Enter selects.
- Enter ambient mode requests browser fullscreen and a screen wake lock where supported.
- Back, Escape, Enter or an arrow key leaves ambient mode. Back/Escape closes settings first.
- The clock is optional, dimmed and slowly repositioned in ambient mode.
- Scene, quality and clock preferences persist in localStorage. Sound always needs a user gesture.

## Rendering

Only the selected environment is mounted. Geometry, sky/water/nebula shaders, starfields and audio are procedural. Distant trees are instanced. Heavy 3D code loads separately from the interface.

An explicit render scheduler caps High and Adaptive at 30 FPS and Low power at 24 FPS. Adaptive starts at DPR 1 and caps the backing width at 1920; High caps at 2560. Low starts at DPR 0.65 and caps the backing width at 1280. Adaptive lowers DPR in five-second windows if measured rendering falls below 22 FPS, down to DPR 0.5 (or 960 backing pixels wide on a 4K viewport). Only High uses real-time shadows; the higher backing resolution provides additional edge detail. Quality changes preserve the existing WebGL context. Rendering and audio stop while the document is hidden. Lost WebGL contexts show recovery UI and resume rendering after restoration; Retry provides manual recovery. Unsupported WebGL2 uses an animated CSS environment while keeping controls operational.

Room and nature follow the device's local clock. Sunrise and sunset are artistic fixed-time cycles (approximately 06:00 and 18:00), not geographic/astronomical calculations. Lighting smoothly blends; settings offer preview times and a return to local time. Galaxy combines drifting, rotating depth-layered stars, animated procedural nebula and rotating planetary geometry. Nature audio is softly filtered generated noise, not a recorded wildlife soundtrack.

## Verification

```sh
npm run lint
npm run typecheck
npm run build
npm start
npm test
```

Tests use Chromium at `/usr/bin/chromium` by default; override `CHROMIUM_PATH` for another installation. Set `BASE_URL` to test a deployment. `window.__livingScreen` provides sampled rendered FPS, DPR, frame count and Three.js geometry/texture/draw-call counts; it does not report GPU memory bytes. See `VERIFICATION.md` for measured results.

## Physical TV limitations

A browser cannot override Google TV sleep, power saving, screensaver or panel protection settings. Wake lock and fullscreen availability depend on the TCL browser. Validate actual remote key codes, WebGL2 support, audio, 1080p/4K readability, sustained performance and multi-hour stability on the intended device. Set Low power if Adaptive remains slow. Scenes use lightweight procedural art rather than downloaded photographic assets.
