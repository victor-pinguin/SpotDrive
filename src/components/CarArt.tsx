import { useId } from 'react';
import type { BodyStyle, CarModel } from '../types/models';

/**
 * Stilisierte "Studio-Aufnahme" eines Fahrzeugs als SVG.
 * Wird für Testdaten und leere Garagenplätze genutzt, solange kein echtes Foto existiert.
 * Später ersetzbar durch Hersteller-Renderings oder 3D-Modelle (z. B. <model-viewer>).
 */

// Fahrzeug fährt nach rechts. Hinterrad x=95, Vorderrad x=305, Radmitte y=122.
const ARCH = 'L335,122 A30,30 0 0 0 275,122 L125,122 A30,30 0 0 0 65,122';
const BODY: Record<BodyStyle, { body: string; glass: string; wing?: string }> = {
  supercar: {
    body: `M18,114 L24,98 Q60,90 112,84 L162,60 Q205,48 246,53 L302,70 Q352,80 380,94 L386,110 Q387,121 376,122 ${ARCH} L22,122 Q16,120 18,114 Z`,
    glass: 'M150,78 L170,62 Q205,52 240,57 L284,74 Z',
  },
  hypercar: {
    body: `M16,112 L22,94 Q62,86 112,82 L164,58 Q205,46 246,50 L304,70 Q356,80 382,94 L388,110 Q389,121 378,122 ${ARCH} L20,122 Q14,119 16,112 Z`,
    glass: 'M152,76 L172,60 Q206,50 240,55 L286,73 Z',
    wing: 'M14,74 L64,74 L64,80 L14,80 Z M34,80 L40,92 M52,80 L50,90',
  },
  coupe: {
    body: `M18,112 Q20,96 48,90 Q90,82 122,78 Q160,46 212,44 Q262,46 302,78 L360,88 Q382,92 384,108 L382,122 ${ARCH} L22,122 Q16,119 18,112 Z`,
    glass: 'M138,78 Q168,54 210,52 Q248,54 280,78 Z',
  },
  gt: {
    body: `M16,110 Q18,94 56,88 L128,82 Q164,54 206,52 Q244,54 266,80 L352,88 Q382,92 384,108 L382,122 ${ARCH} L20,122 Q14,118 16,110 Z`,
    glass: 'M142,81 Q170,60 206,58 Q236,60 254,81 Z',
  },
  sedan: {
    body: `M16,110 Q18,94 48,90 L108,84 Q144,52 200,48 Q256,48 288,82 L358,88 Q382,92 384,108 L382,122 ${ARCH} L20,122 Q14,118 16,110 Z`,
    glass: 'M122,84 Q152,58 200,55 Q246,56 272,84 Z',
  },
  suv: {
    body: `M18,118 L20,80 Q24,62 58,58 L104,56 Q136,30 190,28 L272,30 Q304,34 324,62 L370,72 Q386,76 386,98 L384,122 ${ARCH} L22,122 Q17,121 18,118 Z`,
    glass: 'M114,58 Q142,36 190,35 L268,36 Q292,40 308,62 Z',
  },
};

function Wheel({ cx }: { cx: number }) {
  return (
    <g>
      <circle cx={cx} cy={122} r={25} fill="#0b0c0e" />
      <circle cx={cx} cy={122} r={17} fill="#2a2e34" stroke="#8b939c" strokeWidth={1.4} />
      {[0, 72, 144, 216, 288].map((a) => (
        <line
          key={a}
          x1={cx}
          y1={122}
          x2={cx + 15 * Math.cos((a * Math.PI) / 180)}
          y2={122 + 15 * Math.sin((a * Math.PI) / 180)}
          stroke="#a9b1ba"
          strokeWidth={2.4}
          strokeLinecap="round"
        />
      ))}
      <circle cx={cx} cy={122} r={4} fill="#c9ced4" />
    </g>
  );
}

export function CarArt({
  model,
  paint,
  className,
  showFloor = true,
  glow,
}: {
  model: Pick<CarModel, 'body' | 'paint'>;
  paint?: string;
  className?: string;
  showFloor?: boolean;
  glow?: string;
}) {
  const uid = useId().replace(/:/g, '');
  const color = paint ?? model.paint;
  const shape = BODY[model.body];
  return (
    <svg className={className} viewBox="0 0 400 170" role="img" aria-hidden="true">
      <defs>
        <linearGradient id={`p${uid}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#fff" stopOpacity=".55" />
          <stop offset=".18" stopColor={color} />
          <stop offset=".7" stopColor={color} />
          <stop offset="1" stopColor="#000" stopOpacity=".7" />
        </linearGradient>
        <linearGradient id={`s${uid}`} x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="#fff" stopOpacity="0" />
          <stop offset=".5" stopColor="#fff" stopOpacity=".35" />
          <stop offset="1" stopColor="#fff" stopOpacity="0" />
        </linearGradient>
        <linearGradient id={`g${uid}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#6e7f93" />
          <stop offset="1" stopColor="#0d1116" />
        </linearGradient>
        <radialGradient id={`f${uid}`} cx=".5" cy=".5" r=".5">
          <stop offset="0" stopColor={glow ?? '#000'} stopOpacity={glow ? '.5' : '.75'} />
          <stop offset="1" stopColor="#000" stopOpacity="0" />
        </radialGradient>
      </defs>
      {showFloor && <ellipse cx="200" cy="148" rx="190" ry="14" fill={`url(#f${uid})`} />}
      <g>
        <path d={shape.body} fill={`url(#p${uid})`} stroke="rgba(0,0,0,.5)" strokeWidth={1} />
        <path d={shape.body} fill={`url(#s${uid})`} opacity=".5" style={{ mixBlendMode: 'screen' }} />
        <path d={shape.glass} fill={`url(#g${uid})`} stroke="rgba(255,255,255,.12)" />
        {shape.wing && <path d={shape.wing} fill="#15171a" stroke="#15171a" strokeWidth={3} />}
        {/* Scheinwerfer & Rücklicht */}
        <path d="M366,92 L382,98 L380,102 L362,97 Z" fill="#f4f8ff" opacity=".9" />
        <path d="M20,100 L34,98 L34,103 L20,105 Z" fill="#ff2a2a" />
        {/* Schulterlinie */}
        <path d="M60,100 Q200,86 360,96" stroke="rgba(255,255,255,.25)" strokeWidth={1.2} fill="none" />
      </g>
      <Wheel cx={95} />
      <Wheel cx={305} />
    </svg>
  );
}
