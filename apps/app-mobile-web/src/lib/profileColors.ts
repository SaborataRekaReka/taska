import type { DayProfile, MoodLevel } from '../components/my-day/types';

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

function hsl(h: number, s: number, l: number): string {
  return `hsl(${Math.round(h)}, ${Math.round(s)}%, ${Math.round(l)}%)`;
}

function hsla(h: number, s: number, l: number, a: number): string {
  return `hsla(${Math.round(h)}, ${Math.round(s)}%, ${Math.round(l)}%, ${a.toFixed(2)})`;
}

function withAlpha(color: string, alpha: number): string {
  const m = color.match(/hsl\((\d+),\s*(\d+)%,\s*(\d+)%\)/);
  if (!m) {
    return color;
  }
  const [, h, s, l] = m;
  return hsla(Number(h), Number(s), Number(l), alpha);
}

/**
 * Maps mood and DayProfile into a vibrant color pair [c0, c1].
 *
 * Color-mood mapping based on Valdez & Mehrabian (1994), Kaya & Epps (2004):
 *   1 (very bad)  → Deep blue (220°) — sadness, withdrawal
 *   2 (low)       → Blue-violet (255°) — melancholy, introspection
 *   3 (calm)      → Violet-purple (285°) — neutral, balanced
 *   4 (good)      → Rose-magenta (335°) — warmth, positive affect
 *   5 (great)     → Coral-gold (25°) — joy, high-arousal positive
 *
 * Energy does NOT affect color — it controls blob scale (size of colored area).
 * Colors are always vibrant with no grey/muddy tones.
 *
 * c1 is offset ~100° from c0 for a complementary vibrant pair.
 */
export function profileToColors(
  profile: DayProfile,
  mood: MoodLevel = 3,
): [string, string] {
  const moodNorm = (mood - 1) / 4;
  const urg = profile.urgency / 100;
  const imp = profile.importance / 100;

  // Mood hue path: 220 → 255 → 285 → 335 → 385 (=25°)
  // Using a cubic easing through the color wheel
  const moodHueBase = moodNorm < 0.5
    ? lerp(220, 285, moodNorm * 2)
    : lerp(285, 385, (moodNorm - 0.5) * 2);
  const urgencyPush = urg * -30;
  const importancePush = imp * 20;
  const c0Hue = (moodHueBase + urgencyPush + importancePush) % 360;

  const c0Sat = lerp(55, 72, moodNorm);
  const c0Light = lerp(72, 66, imp * 0.3 + urg * 0.2);

  const hueOffset = lerp(105, 95, moodNorm) + imp * 8 - urg * 6;
  const c1Hue = (c0Hue + hueOffset) % 360;
  const c1Sat = lerp(50, 70, moodNorm);
  const c1Light = lerp(76, 68, urg * 0.3);

  return [hsl(c0Hue, c0Sat, c0Light), hsl(c1Hue, c1Sat, c1Light)];
}

/**
 * Converts energy (1-20) to gradient spread (mid stop offset).
 * Low energy → c0 is tiny dot inside c1 (spread=0.12).
 * High energy → c0 fills center richly (spread=0.55).
 */
export function energyToSpread(energy: number): number {
  const norm = Math.min(energy, 20) / 20;
  return lerp(0.12, 0.55, norm);
}

/**
 * Converts a [c0, c1] color pair into a CSS background string
 * suitable for the main page. Uses the exact same hues at lower opacity
 * so the background matches the modal blob.
 */
export function dayColorsToBackground(colors: [string, string]): string {
  const [c0, c1] = colors;

  const c0Strong = withAlpha(c0, 0.34);
  const c1Strong = withAlpha(c1, 0.3);
  const c0Soft = withAlpha(c0, 0.18);
  const c1Soft = withAlpha(c1, 0.16);

  return [
    `radial-gradient(ellipse 62% 54% at 56% 28%, ${c0Strong} 0%, transparent 72%)`,
    `radial-gradient(ellipse 52% 58% at 32% 74%, ${c1Strong} 0%, transparent 68%)`,
    `linear-gradient(122deg, ${c0Soft} 0%, ${c1Soft} 100%)`,
  ].join(', ');
}

/**
 * Wraps the raw [c0, c1] into softer versions (lower opacity)
 * for the main page background, preserving the exact hues.
 */
export function softenColors(colors: [string, string]): [string, string] {
  const parsed = colors.map((c) => {
    const m = c.match(/hsl\((\d+),\s*(\d+)%,\s*(\d+)%\)/);
    if (!m) return c;
    const [, h, s, l] = m;
    return hsla(Number(h), Math.max(Number(s) - 10, 18), Math.min(Number(l) + 8, 82), 0.28);
  });
  return parsed as [string, string];
}
