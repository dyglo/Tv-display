export type SceneId = "room" | "galaxy" | "nature";
export type Quality = "auto" | "low" | "high";
export const scenes = [
  {
    id: "room" as const,
    name: "Living Room",
    subtitle: "A quiet place. A changing sky.",
    label: "TIME-SYNCED",
    icon: "room",
  },
  {
    id: "galaxy" as const,
    name: "Infinite Galaxy",
    subtitle: "Lose yourself in the cosmos.",
    label: "INFINITE",
    icon: "galaxy",
  },
  {
    id: "nature" as const,
    name: "Living Nature",
    subtitle: "A little closer to the wild.",
    label: "AMBIENT AUDIO",
    icon: "nature",
  },
];
export function solarState(hour: number) {
  const elevation = Math.sin(((hour - 6) / 24) * Math.PI * 2);
  const daylight = Math.max(0, Math.min(1, (elevation + 0.12) / 0.65));
  const twilight = Math.max(0, 1 - Math.abs(elevation) / 0.32);
  return {
    elevation,
    daylight,
    twilight,
    warmth: twilight * daylight,
    night: 1 - daylight,
  };
}
export function localHour(date = new Date()) {
  return date.getHours() + date.getMinutes() / 60 + date.getSeconds() / 3600;
}
export function timeLabel(hour: number) {
  return hour < 5 || hour >= 20
    ? "Nightfall"
    : hour < 8
      ? "Sunrise"
      : hour < 17
        ? "Daylight"
        : "Golden hour";
}
export function random(seed: number) {
  let value = seed;
  return () => {
    value = (Math.imul(value, 1664525) + 1013904223) >>> 0;
    return value / 4294967296;
  };
}
