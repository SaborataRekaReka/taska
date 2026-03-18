import { useEffect, useRef } from 'react';
import styles from './GradientBackground.module.css';

interface GradientBlobProps {
  c0?: string;
  c1?: string;
  size?: number;
  scale?: number;
  spread?: number;
  className?: string;
  interactive?: boolean;
  id?: string;
}

const DEFAULT_FX = 0.25;
const DEFAULT_FY = 0.75;

function rnd(n: number, p = 2) { return +n.toFixed(p); }

export function GradientBlob({
  c0 = '#8a64eb',
  c1 = '#64e8de',
  size = 400,
  scale = 1,
  spread = 0.5,
  className = '',
  interactive = true,
  id = 'blob',
}: GradientBlobProps) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const gradRef = useRef<SVGRadialGradientElement>(null);
  const resetFrameRef = useRef(0);

  useEffect(() => {
    if (!interactive) {
      return;
    }

    const el = wrapRef.current;
    if (!el) {
      return;
    }

    function handleMove(e: MouseEvent) {
      cancelAnimationFrame(resetFrameRef.current);
      const g = gradRef.current;
      if (!el || !g) return;

      const r = el.getBoundingClientRect();
      const dx = (e.clientX - r.x) / r.width - 0.5;
      const dy = (e.clientY - r.y) / r.height - 0.5;
      const m = Math.min(0.49, Math.hypot(dy, dx));
      const a = Math.atan2(dy, dx);

      g.setAttribute('fx', String(rnd(0.5 + m * Math.cos(a))));
      g.setAttribute('fy', String(rnd(0.5 + m * Math.sin(a))));
    }

    function handleLeave() {
      const g = gradRef.current;
      if (!g) return;

      const startFx = parseFloat(g.getAttribute('fx') ?? String(DEFAULT_FX));
      const startFy = parseFloat(g.getAttribute('fy') ?? String(DEFAULT_FY));
      let progress = 0;

      function step() {
        progress += 0.05;
        if (progress >= 1) {
          g.setAttribute('fx', String(DEFAULT_FX));
          g.setAttribute('fy', String(DEFAULT_FY));
          return;
        }
        const t = 1 - (1 - progress) ** 3;
        g.setAttribute('fx', String(rnd(startFx + (DEFAULT_FX - startFx) * t)));
        g.setAttribute('fy', String(rnd(startFy + (DEFAULT_FY - startFy) * t)));
        resetFrameRef.current = requestAnimationFrame(step);
      }

      resetFrameRef.current = requestAnimationFrame(step);
    }

    el.addEventListener('mousemove', handleMove, { passive: true });
    el.addEventListener('mouseleave', handleLeave);
    return () => {
      el.removeEventListener('mousemove', handleMove);
      el.removeEventListener('mouseleave', handleLeave);
      cancelAnimationFrame(resetFrameRef.current);
    };
  }, [interactive]);

  const r = size / 2;
  const grainScale = Math.round(0.09 * size);
  const midOffset = rnd(Math.max(0.1, Math.min(0.6, spread)));

  return (
    <div ref={wrapRef} className={`${styles.blob} ${className}`} style={interactive ? { pointerEvents: 'auto' } : undefined}>
      <svg width="0" height="0" aria-hidden="true" className={styles.hidden}>
        <filter id={`${id}-distort`} primitiveUnits="objectBoundingBox" x="-50%" y="-50%" width="200%" height="200%">
          <feTurbulence type="fractalNoise" baseFrequency=".00713" seed="5" />
          <feDisplacementMap in="SourceGraphic" scale=".3" yChannelSelector="R" />
        </filter>
        <filter id={`${id}-grain`} x="-50%" y="-50%" width="200%" height="200%">
          <feTurbulence type="fractalNoise" baseFrequency="7.13" />
          <feDisplacementMap in="SourceGraphic" scale={grainScale} yChannelSelector="R" />
        </filter>
      </svg>

      <svg
        viewBox={`${-r} ${-r} ${size} ${size}`}
        className={styles.svg}
        style={scale === 1 ? undefined : { transform: `scale(${scale})`, transformOrigin: 'center' }}
      >
        <radialGradient
          id={`${id}-grad`}
          ref={gradRef}
          gradientUnits="objectBoundingBox"
          fx={String(DEFAULT_FX)}
          fy={String(DEFAULT_FY)}
        >
          <stop stopColor={c0} />
          <stop stopColor={c1} offset={String(midOffset)} />
          <stop stopColor={c1} stopOpacity="0" offset="1" />
        </radialGradient>
        <circle r="50%" fill={`url(#${id}-grad)`} style={{ filter: `blur(18px) url(#${id}-distort) url(#${id}-grain)` }} />
      </svg>
    </div>
  );
}
