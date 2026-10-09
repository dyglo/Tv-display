"use client";
import dynamic from "next/dynamic";
import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  ArrowRight,
  Check,
  ChevronDown,
  Clock3,
  Expand,
  Leaf,
  Monitor,
  Moon,
  Settings2,
  Volume2,
  VolumeX,
  X,
  Sunrise,
  Sparkles,
  House,
  ArrowUpRight,
} from "lucide-react";
import {
  scenes,
  localHour,
  timeLabel,
  type SceneId,
  type Quality,
} from "../lib/environment";
import SceneThumbnail from "./scene-thumbnail";
const Engine = dynamic(() => import("./scene-engine"), { ssr: false });
type Preferences = { scene: SceneId; quality: Quality; clock: boolean };
const initial: Preferences = { scene: "room", quality: "auto", clock: false };
export default function LivingScreen() {
  const [prefs, setPrefs] = useState(initial);
  const [ready, setReady] = useState(false);
  const [ambient, setAmbient] = useState(false);
  const [settings, setSettings] = useState(false);
  const [sound, setSound] = useState(false);
  const [now, setNow] = useState<Date | null>(null);
  const [status, setStatus] = useState("");
  const [hour, setHour] = useState<number | null>(null);
  const [wake, setWake] = useState(false);
  const [full, setFull] = useState(false);
  const controls = useRef<HTMLDivElement>(null);
  const previousFocus = useRef<HTMLElement | null>(null);
  const audio = useRef<AudioContext | null>(null);
  const gain = useRef<GainNode | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const setPreference = <K extends keyof Preferences>(
    key: K,
    value: Preferences[K],
  ) => setPrefs((p) => ({ ...p, [key]: value }));
  const announce = useCallback((message: string) => {
    setStatus(message);
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => setStatus(""), 5000);
  }, []);
  useEffect(() => {
    try {
      const saved = JSON.parse(
        localStorage.getItem("livingscreen.preferences") ?? "null",
      );
      if (saved) {
        setPrefs({
          scene: scenes.some((s) => s.id === saved.scene)
            ? saved.scene
            : "room",
          quality: ["auto", "low", "high"].includes(saved.quality)
            ? saved.quality
            : "auto",
          clock: !!saved.clock,
        });
      }
    } catch {}
    setReady(true);
    setNow(new Date());
    const id = setInterval(() => setNow(new Date()), 10000);
    return () => {
      clearInterval(id);
      if (timer.current) clearTimeout(timer.current);
    };
  }, []);
  useEffect(() => {
    if (ready)
      try {
        localStorage.setItem("livingscreen.preferences", JSON.stringify(prefs));
      } catch {}
  }, [prefs, ready]);
  useEffect(() => {
    const listener = () => {
      setFull(!!document.fullscreenElement);
      if (!document.fullscreenElement) setAmbient(false);
    };
    document.addEventListener("fullscreenchange", listener);
    return () => document.removeEventListener("fullscreenchange", listener);
  }, []);
  useEffect(() => {
    if (!ambient) return;
    let lock: WakeLockSentinel | null = null;
    let disposed = false;
    const acquire = async () => {
      if (document.hidden || !("wakeLock" in navigator)) return;
      try {
        const acquired = await navigator.wakeLock.request("screen");
        if (disposed) {
          await acquired.release();
          return;
        }
        lock = acquired;
        setWake(true);
        acquired.addEventListener("release", () => setWake(false));
      } catch {
        setWake(false);
      }
    };
    const visibility = () => {
      if (!document.hidden) void acquire();
    };
    void acquire();
    document.addEventListener("visibilitychange", visibility);
    return () => {
      disposed = true;
      document.removeEventListener("visibilitychange", visibility);
      void lock?.release();
      setWake(false);
    };
  }, [ambient]);
  useEffect(() => {
    if (gain.current && audio.current)
      gain.current.gain.setTargetAtTime(
        sound && prefs.scene === "nature" && !document.hidden ? 0.12 : 0,
        audio.current.currentTime,
        0.6,
      );
  }, [sound, prefs.scene]);
  useEffect(() => {
    const visibility = () => {
      if (audio.current && gain.current)
        gain.current.gain.setTargetAtTime(
          document.hidden ? 0 : sound && prefs.scene === "nature" ? 0.12 : 0,
          audio.current.currentTime,
          0.3,
        );
    };
    document.addEventListener("visibilitychange", visibility);
    return () => document.removeEventListener("visibilitychange", visibility);
  }, [sound, prefs.scene]);
  useEffect(
    () => () => {
      void audio.current?.close();
    },
    [],
  );
  const toggleSound = async () => {
    try {
      if (!audio.current) {
        const context = new AudioContext();
        audio.current = context;
        const buffer = context.createBuffer(
          1,
          context.sampleRate * 8,
          context.sampleRate,
        );
        const data = buffer.getChannelData(0);
        let last = 0;
        for (let i = 0; i < data.length; i++) {
          last = (last + (Math.random() * 2 - 1) * 0.02) / 1.02;
          data[i] = last * 3.5;
        }
        const source = context.createBufferSource();
        source.buffer = buffer;
        source.loop = true;
        const filter = context.createBiquadFilter();
        filter.type = "lowpass";
        filter.frequency.value = 620;
        const volume = context.createGain();
        volume.gain.value = 0;
        gain.current = volume;
        source.connect(filter).connect(volume).connect(context.destination);
        source.start();
        const lfo = context.createOscillator();
        lfo.frequency.value = 0.075;
        const depth = context.createGain();
        depth.gain.value = 140;
        lfo.connect(depth).connect(filter.frequency);
        lfo.start();
      }
      await audio.current.resume();
      setSound((v) => !v);
    } catch {
      announce("Ambient audio is unavailable in this browser");
    }
  };
  const enterAmbient = async () => {
    previousFocus.current = document.activeElement as HTMLElement;
    setSettings(false);
    setAmbient(true);
    try {
      if (
        !document.fullscreenElement &&
        document.documentElement.requestFullscreen
      )
        await document.documentElement.requestFullscreen();
      else if (!document.documentElement.requestFullscreen)
        announce("Fullscreen is unavailable. Ambient view fills this browser.");
    } catch {
      announce("Fullscreen is unavailable. Ambient view fills this browser.");
    }
  };
  const leaveAmbient = useCallback(() => {
    setAmbient(false);
    if (document.fullscreenElement)
      void document.exitFullscreen().catch(() => {});
    setTimeout(() => previousFocus.current?.focus(), 0);
  }, []);
  useEffect(() => {
    const keyboard = (event: KeyboardEvent) => {
      if (
        event.key === "Escape" ||
        event.key === "Backspace" ||
        event.key === "BrowserBack"
      ) {
        event.preventDefault();
        if (settings) {
          setSettings(false);
          setTimeout(
            () => document.getElementById("settings-button")?.focus(),
            0,
          );
        } else if (ambient) leaveAmbient();
        return;
      }
      if (ambient) {
        if (event.key === "Enter" || event.key.startsWith("Arrow")) {
          event.preventDefault();
          leaveAmbient();
        }
        return;
      }
      if (
        event.target instanceof HTMLInputElement ||
        event.target instanceof HTMLSelectElement
      )
        return;
      if (event.key.startsWith("Arrow")) {
        event.preventDefault();
        const buttons = Array.from(
          (settings
            ? document.getElementById("settings-panel")
            : controls.current
          )?.querySelectorAll<HTMLElement>(
            "button:not([disabled]), select, input",
          ) ?? [],
        );
        const current = buttons.indexOf(document.activeElement as HTMLElement);
        const direction =
          event.key === "ArrowLeft" || event.key === "ArrowUp" ? -1 : 1;
        buttons[
          (current + direction + buttons.length) % buttons.length
        ]?.focus();
      }
    };
    window.addEventListener("keydown", keyboard);
    return () => window.removeEventListener("keydown", keyboard);
  }, [ambient, settings, leaveAmbient]);
  useEffect(() => {
    if (settings) {
      previousFocus.current = document.activeElement as HTMLElement;
      document.getElementById("close-settings")?.focus();
    }
  }, [settings]);
  const current = scenes.find((s) => s.id === prefs.scene)!;
  const liveHour = hour ?? (now ? localHour(now) : 12);
  const icons = { room: House, galaxy: Sparkles, nature: Leaf };
  const SceneIcon = icons[prefs.scene];
  return (
    <main className={ambient ? "app ambient" : "app"}>
      {ready && (
        <Engine
          scene={prefs.scene}
          quality={prefs.quality}
          hourOverride={hour}
          onStatus={announce}
        />
      )}
      <div className="scene-vignette" />
      <div
        className="interface"
        ref={controls}
        aria-hidden={ambient}
        inert={ambient}
      >
        <header className="header">
          <Link className="brand" href="/" aria-label="LivingScreen home">
            <span className="brand-mark">
              <span />
              <span />
              <span />
            </span>
            Living<span className="brand-light">Screen</span>
            <span className="brand-period">.</span>
          </Link>
          <div className="header-right">
            <span className="tv-badge">
              <Monitor size={14} /> MADE FOR YOUR BIG SCREEN
            </span>
            <button
              id="settings-button"
              className={`icon-button ${settings ? "is-active" : ""}`}
              onClick={() => setSettings((v) => !v)}
              aria-label="Open settings"
              aria-expanded={settings}
            >
              <Settings2 size={21} />
            </button>
          </div>
        </header>
        <section className="intro">
          <div className="eyebrow">
            <span className="status-dot" /> A LITTLE LESS NOISE. A LITTLE MORE
            LIFE.
          </div>
          <h1>
            Make room
            <br />
            for <em>stillness.</em>
          </h1>
          <p>
            Beautiful worlds that breathe.
            <br />
            Turn your screen into somewhere else.
          </p>
        </section>
        <div className="scene-caption">
          <span className="caption-icon">
            <SceneIcon size={17} />
          </span>
          <div>
            <span>{current.name}</span>
            <small>
              {prefs.scene === "galaxy"
                ? "Beyond the everyday"
                : `${timeLabel(liveHour)} · ${hour === null ? "Following your local time" : "Lighting preview"}`}
            </small>
          </div>
          <span className="live-label">
            <span className="status-dot" /> LIVE
          </span>
        </div>
        <section className="library" aria-label="Choose an environment">
          <div className="library-heading">
            <div>
              <span className="eyebrow">YOUR ENVIRONMENTS</span>
              <span className="library-count">
                03 worlds. No destination needed.
              </span>
            </div>
            <span className="slow-note">
              Designed to slow things down <Leaf size={13} />
            </span>
          </div>
          <div className="scene-cards">
            {scenes.map((scene, index) => {
              const Icon = icons[scene.id];
              const active = scene.id === prefs.scene;
              return (
                <button
                  key={scene.id}
                  className={`scene-card ${active ? "selected" : ""}`}
                  aria-pressed={active}
                  onClick={() => setPreference("scene", scene.id)}
                >
                  <div className="card-image">
                    <SceneThumbnail scene={scene.id} />
                    <span className="card-number">0{index + 1}</span>
                    <span className="card-label">
                      {scene.label === "TIME-SYNCED" ? (
                        <Sunrise size={11} />
                      ) : scene.id === "galaxy" ? (
                        <Sparkles size={11} />
                      ) : (
                        <Volume2 size={11} />
                      )}{" "}
                      {scene.label}
                    </span>
                    {active && (
                      <span className="selected-check">
                        <Check size={13} />
                      </span>
                    )}
                  </div>
                  <div className="card-description">
                    <div>
                      <h2>{scene.name}</h2>
                      <p>{scene.subtitle}</p>
                    </div>
                    <span className="card-icon">
                      <Icon size={18} />
                    </span>
                  </div>
                </button>
              );
            })}
          </div>
          <div className="bottom-bar">
            <div className="quiet-controls">
              <button
                className="text-button"
                onClick={() => setPreference("clock", !prefs.clock)}
                aria-pressed={prefs.clock}
              >
                <Clock3 size={16} />
                Clock
                <span className={`toggle ${prefs.clock ? "on" : ""}`} />
              </button>
              <span className="divider" />
              <button
                className="text-button"
                onClick={() => {
                  setSettings(true);
                }}
              >
                <Monitor size={16} />
                {prefs.quality === "auto"
                  ? "Adaptive quality"
                  : prefs.quality === "low"
                    ? "Low power"
                    : "High quality"}
                <ChevronDown size={12} />
              </button>
              {prefs.scene === "nature" && (
                <>
                  <span className="divider" />
                  <button
                    className="text-button"
                    onClick={() => void toggleSound()}
                    aria-pressed={sound}
                  >
                    {sound ? <Volume2 size={16} /> : <VolumeX size={16} />}Sound{" "}
                    {sound ? "on" : "off"}
                  </button>
                </>
              )}
            </div>
            <button
              className="ambient-button"
              onClick={() => void enterAmbient()}
            >
              <Expand size={16} />
              Enter ambient mode
              <ArrowRight size={17} />
            </button>
          </div>
        </section>
        <footer>
          <span>
            <span className="tiny-dot" /> Always moving. Never in a hurry.
          </span>
          <div>
            <span className="keycap">←</span>
            <span className="keycap">→</span> navigate
            <span className="keycap enter">↵</span> select
            <span className="keycap enter">esc</span> back
          </div>
          <span className="footer-signature">
            A view worth leaving on <ArrowUpRight size={11} />
          </span>
        </footer>
      </div>
      {prefs.clock && now && (
        <div
          className={`clock-overlay ${ambient ? "clock-ambient" : ""}`}
          style={
            ambient
              ? {
                  transform: `translate(${Math.sin(now.getMinutes()) * 14}px, ${Math.cos(now.getMinutes()) * 9}px)`,
                }
              : undefined
          }
        >
          <time dateTime={now.toISOString()}>
            {now.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
          </time>
          <span>
            {now.toLocaleDateString([], {
              weekday: "short",
              month: "short",
              day: "numeric",
            })}
          </span>
        </div>
      )}
      {ambient && (
        <button
          className="ambient-exit"
          onClick={leaveAmbient}
          aria-label="Leave ambient mode"
        >
          <X size={18} />
          <span>Back to environments</span>
        </button>
      )}
      {settings && !ambient && (
        <div className="modal-backdrop" onClick={() => setSettings(false)}>
          <section
            className="settings-panel"
            id="settings-panel"
            role="dialog"
            aria-modal="true"
            aria-labelledby="settings-title"
            onClick={(e) => e.stopPropagation()}
            onKeyDown={(e) => {
              if (e.key === "Tab") {
                const items = Array.from(
                  e.currentTarget.querySelectorAll<HTMLElement>(
                    "button,select,input",
                  ),
                );
                const index = items.indexOf(
                  document.activeElement as HTMLElement,
                );
                if (e.shiftKey && index === 0) {
                  e.preventDefault();
                  items[items.length - 1]?.focus();
                } else if (!e.shiftKey && index === items.length - 1) {
                  e.preventDefault();
                  items[0]?.focus();
                }
              }
            }}
          >
            <div className="settings-heading">
              <div>
                <span className="eyebrow">MAKE IT YOURS</span>
                <h2 id="settings-title">A quieter screen.</h2>
              </div>
              <button
                className="icon-button"
                id="close-settings"
                onClick={() => {
                  setSettings(false);
                  previousFocus.current?.focus();
                }}
                aria-label="Close settings"
              >
                <X size={20} />
              </button>
            </div>
            <label className="setting-row">
              <div>
                <strong>Animation quality</strong>
                <p>Adaptive balances detail and smooth motion.</p>
              </div>
              <select
                value={prefs.quality}
                onChange={(e) =>
                  setPreference("quality", e.target.value as Quality)
                }
              >
                <option value="auto">Adaptive · 30 fps</option>
                <option value="low">Low power · 24 fps</option>
                <option value="high">High · 30 fps</option>
              </select>
            </label>
            <div className="setting-row">
              <div>
                <strong>Quiet clock</strong>
                <p>A dim clock that gently changes position in ambient mode.</p>
              </div>
              <button
                className={`toggle setting-toggle ${prefs.clock ? "on" : ""}`}
                onClick={() => setPreference("clock", !prefs.clock)}
                aria-label="Toggle clock"
                aria-pressed={prefs.clock}
              />
            </div>
            <div className="setting-row">
              <div>
                <strong>Nature sounds</strong>
                <p>Soft, synthesized water. Plays in Living Nature.</p>
              </div>
              <button
                className="sound-button"
                onClick={() => void toggleSound()}
                aria-pressed={sound}
              >
                {sound ? <Volume2 size={18} /> : <VolumeX size={18} />}{" "}
                {sound ? "On" : "Off"}
              </button>
            </div>
            <div className="lighting-preview">
              <div className="setting-row">
                <div>
                  <strong>Lighting preview</strong>
                  <p>
                    {hour === null
                      ? "Synced to the time on this device."
                      : `${String(Math.floor(hour)).padStart(2, "0")}:00 · ${timeLabel(hour)}`}
                  </p>
                </div>
                <button
                  className="text-button"
                  onClick={() => setHour(null)}
                  disabled={hour === null}
                >
                  Use local time
                </button>
              </div>
              <div className="time-presets">
                {[
                  { name: "Sunrise", hour: 6.5, Icon: Sunrise },
                  { name: "Daylight", hour: 12, Icon: Leaf },
                  { name: "Sunset", hour: 18, Icon: Sunrise },
                  { name: "Night", hour: 23, Icon: Moon },
                ].map((p) => (
                  <button
                    key={p.name}
                    onClick={() => setHour(p.hour)}
                    aria-pressed={hour === p.hour}
                  >
                    <p.Icon size={17} />
                    {p.name}
                  </button>
                ))}
              </div>
            </div>
            <p className="settings-note">
              Fullscreen and screen wake lock depend on your browser. Your
              Google TV sleep and power settings still apply.
            </p>
            <button
              className="ambient-button settings-done"
              onClick={() => {
                setSettings(false);
                previousFocus.current?.focus();
              }}
            >
              Done
              <Check size={17} />
            </button>
          </section>
        </div>
      )}
      {status && (
        <div className="toast" role="status">
          {status}
        </div>
      )}
      <span className="sr-only" role="status">
        {ambient
          ? `Ambient mode active. ${wake ? "Screen wake lock active." : ""} ${full ? "Fullscreen active." : ""} Press Enter or Back to return.`
          : ""}
      </span>
    </main>
  );
}
