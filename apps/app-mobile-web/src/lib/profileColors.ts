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
 * Maps mood, energy, and DayProfile into a color pair [c0, c1].
 *
 * Mood drives the overall warmth/coolness:
 *   1 (very bad) → desaturated cool grey-blue
 *   3 (neutral)  → balanced purple/teal
 *   5 (great)    → vibrant warm gold/coral
 *
 * Energy drives saturation and lightness:
 *   low energy  → muted, pastel
 *   high energy → vivid, saturated
 *
 * Profile axes add nuance:
 *   urgency  → pushes c0 toward reds/oranges
 *   importance → pushes c0 toward magentas
 *   load     → darkens slightly
 */
export function profileToColors(
  profile: DayProfile,
  mood: MoodLevel = 3,
  energy: number = 11,
): [string, string] {
  const moodNorm = (mood - 1) / 4;          // 0..1
  const energyNorm = Math.min(energy, 20) / 20; // 0..1
  const urg = profile.urgency / 100;
  const imp = profile.importance / 100;
  const lod = profile.load / 100;

  // --- c0: primary blob color ---
  // Mood shifts the entire hue range:
  //   bad mood (0)  → cool blue-grey (220)
  //   neutral (0.5) → purple-magenta (280-310)
  //   great (1)     → warm coral-gold (30-50)
  const moodHueBase = lerp(220, 50, moodNorm);
  // Urgency pushes toward red/orange regardless of mood
  const urgencyPush = urg * lerp(0, -40, urg);
  // Importance pushes toward magenta/purple
  const importancePush = imp * lerp(0, 30, imp);
  const c0Hue = moodHueBase + urgencyPush + importancePush;

  // Energy drives saturation
  const c0Sat = lerp(32, 76, energyNorm);
  // Load darkens slightly
  const c0Light = lerp(68, 56, lod * 0.6 + (1 - energyNorm) * 0.4);

  // --- c1: secondary blob color ---
  // Complementary to c0 but shifted by mood
  //   bad mood  → desaturated slate (200-230)
  //   neutral   → teal/mint (170-190)
  //   great     → warm peach/yellow (40-70)
  const c1HueBase = lerp(210, 60, moodNorm);
  const c1Hue = c1HueBase + imp * 15 - urg * 10;

  const c1Sat = lerp(28, 68, energyNorm);
  const c1Light = lerp(74, 60, lod * 0.5);

  return [hsl(c0Hue, c0Sat, c0Light), hsl(c1Hue, c1Sat, c1Light)];
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
