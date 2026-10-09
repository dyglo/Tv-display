# LivingScreen verification

## Production checks

- ESLint: passed with no warnings or errors.
- TypeScript: passed.
- Next.js production build: passed. The main page is statically prerendered; initial route JavaScript is 115 kB, with the Three.js engine loaded separately.
- HTTP: local production server returned 200.

## Browser scenarios

Chromium with software WebGL (SwiftShader), against `next start`:

1. Solar cycle: midday/night separation, sunrise warmth and continuity across midnight.
2. Scene selection: all three scenes, increasing rendered frame count, arrows/Enter, localStorage scene and clock persistence, user-activated nature sound, actual browser fullscreen and Escape exit.
3. Lighting and lifecycle: sunrise/daylight/sunset/night previews, smooth illumination, return to device local time, Low quality, hidden-page rendering pause/resume, forced WebGL context loss and restoration with resumed animation.
4. Compatibility: WebGL disabled; animated CSS fallback, scene selection, ambient entry and Enter exit.
5. Layout: 3840 × 2160 and 390 × 844; controls remain visible, no horizontal overflow, adaptive 4K DPR cap.
6. Resources: repeated galaxy/nature/room switching returns geometry and texture counts to baseline.

The full browser run passed scenarios 1, 2, 4, 5 and 6. Scenario 3 found a quality-change lifecycle problem; after fixing it, the focused scenario 3 rerun passed (40.4 seconds). The corrected scheduler preserves the WebGL context across quality changes and resumes the native renderer after restoration. Initial verified issues (icon sizing, adaptive DPR reset, TypeScript, lint and render lifecycle) were fixed before deployment.

## Performance

Measurements are taken in 1920 × 1080 fullscreen ambient mode, Adaptive quality, after a 12-second warm-up, over a 15-second frame-count sampling window. JavaScript heap comes from Chromium's `Runtime.getHeapUsage`. GPU memory bytes are not available; Three.js geometry/texture counts are reported instead. Results are in `artifacts/performance.json`. All three reached DPR 0.5 (a 960 × 540 backing buffer on the 1080p viewport). No page errors were observed.

| Scene | Rendered FPS | JS heap (MiB) | Draw calls | Geometries | Textures |
| --- | ---: | ---: | ---: | ---: | ---: |
| room | 3.2 | 10.9 | 111 | 55 | 2 |
| galaxy | 10.8 | 9.2 | 19 | 21 | 1 |
| nature | 4.3 | 11.2 | 50 | 35 | 0 |

These are software-renderer results on the cloud test machine, not TCL GPU results. The final adaptive floor also allows a 4K viewport to reach a 960-pixel-wide backing buffer; Low caps backing width at 1280. Adaptive resolution updates do not show UI notices in ambient mode. No minimum FPS assertion is imposed on this software renderer.

## Deployment

Production target: the connected NextQ Vercel team, project `livingscreen`. This is a public display app with no authentication, database, paid APIs or environment secrets. Deployment URL and HTTP/browser checks are recorded after publishing.

## Required physical TCL testing

- Browser/WebGL2 support and real remote arrow, Enter and Back key behavior.
- Actual fullscreen and wake-lock support.
- Adaptive/Low/High rendering FPS and thermal behavior at 1080p and 4K.
- Multi-hour operation, audio, network interruption and hardware context recovery.
- Google TV sleep, screensaver and panel-protection settings remain outside browser control.

Sunrise/sunset are a local-clock artistic cycle (around 06:00/18:00), not location-specific astronomical times. The visuals use procedural geometry and materials rather than photographic assets. The CSS compatibility fallback is intentionally simpler than the 3D scenes.
