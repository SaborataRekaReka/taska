import { useEffect, useRef } from 'react';
import styles from './GradientBackground.module.css';

interface GradientBlobProps {
  c0?: string;
  c1?: string;
  size?: number;
  scale?: number;
  className?: string;
}

function rnd(n: number, p = 2) { return +n.toFixed(p); }

export function GradientBlob({
  c0 = '#8a64eb',
  c1 = '#64e8de',
  size = 400,
  scale = 1,
  className = '',
}: GradientBlobProps) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const gradRef = useRef<SVGRadialGradientElement>(null);

  useEffect(() => {
    function handleMove(e: MouseEvent) {
      const el = wrapRef.current;
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

    window.addEventListener('mousemove', handleMove, { passive: true });
    return () => window.removeEventListener('mousemove', handleMove);
  }, []);

  const r = size / 2;
  const grainScale = Math.round(0.09 * size);

  return (
    <div ref={wrapRef} className={`${styles.blob} ${className}`}>
      <svg width="0" height="0" aria-hidden="true" className={styles.hidden}>
        <filter id="blob-distort" primitiveUnits="objectBoundingBox" x="-50%" y="-50%" width="200%" height="200%">
          <feTurbulence type="fractalNoise" baseFrequency=".00713" seed="5" />
          <feDisplacementMap in="SourceGraphic" scale=".3" yChannelSelector="R" />
        </filter>
        <filter id="blob-grain" x="-50%" y="-50%" width="200%" height="200%">
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
          id="blob-grad"
          ref={gradRef}
          gradientUnits="objectBoundingBox"
          fx=".25"
          fy=".75"
        >
          <stop stopColor={c0} />
          <stop stopColor={c1} offset=".5" />
          <stop stopColor={c1} stopOpacity="0" offset="1" />
        </radialGradient>
        <circle r="50%" fill="url(#blob-grad)" />
      </svg>
    </div>
  );
}
