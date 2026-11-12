function Blossom({ x, y, scale, extra = false }: { x: number; y: number; scale: number; extra?: boolean }) {
  return (
    <g className={extra ? 'blossom blossom-extra' : 'blossom'} transform={`translate(${x} ${y}) scale(${scale})`}>
      {[0, 72, 144, 216, 288].map((deg) => (
        <ellipse key={deg} className="petal" cx="0" cy="-11" rx="5.2" ry="9.2" transform={`rotate(${deg})`} />
      ))}
      <circle className="pistil" r="2.3" />
    </g>
  )
}

export function Scene() {
  return (
    <div className="scene" aria-hidden="true">
      <svg className="scene-svg" viewBox="0 0 1200 800" preserveAspectRatio="xMidYMid slice">
        <defs>
          <pattern id="washi" width="160" height="160" patternUnits="userSpaceOnUse">
            <path d="M12 28 C 48 18, 70 46, 128 30" fill="none" stroke="currentColor" strokeWidth="0.7" />
            <path d="M6 96 C 40 84, 78 118, 150 100" fill="none" stroke="currentColor" strokeWidth="0.45" />
            <path d="M90 140 C 110 132, 124 150, 156 142" fill="none" stroke="currentColor" strokeWidth="0.4" />
          </pattern>
          <pattern id="seigaiha" width="72" height="36" patternUnits="userSpaceOnUse">
            <path d="M0 36 A 36 36 0 0 1 72 36" fill="none" stroke="currentColor" strokeWidth="0.8" />
            <path d="M-36 36 A 36 36 0 0 1 36 36" fill="none" stroke="currentColor" strokeWidth="0.8" />
            <path d="M36 36 A 36 36 0 0 1 108 36" fill="none" stroke="currentColor" strokeWidth="0.8" />
            <path d="M0 18 A 36 36 0 0 1 72 18" fill="none" stroke="currentColor" strokeWidth="0.45" />
          </pattern>
          <linearGradient id="wave-fade" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="white" stopOpacity="0" />
            <stop offset="0.62" stopColor="white" stopOpacity="0.2" />
            <stop offset="1" stopColor="white" stopOpacity="1" />
          </linearGradient>
          <mask id="wave-mask">
            <rect width="1200" height="800" fill="url(#wave-fade)" />
          </mask>
        </defs>
        <rect className="washi" width="1200" height="800" fill="url(#washi)" />
        <rect className="waves" width="1200" height="800" fill="url(#seigaiha)" mask="url(#wave-mask)" />
        <path className="branch" d="M1040 8 C 980 70, 940 120, 900 188 C 878 230, 860 250, 834 286" />
        <path className="branch" d="M900 188 C 940 200, 980 176, 1010 150" />
        <Blossom x={1042} y={36} scale={1.15} />
        <Blossom x={986} y={92} scale={0.85} />
        <Blossom x={908} y={168} scale={1} />
        <Blossom x={846} y={262} scale={0.72} extra />
        <Blossom x={78} y={86} scale={0.9} />
        <Blossom x={46} y={150} scale={0.62} extra />
        <Blossom x={118} y={690} scale={1.05} />
        <Blossom x={70} y={742} scale={0.7} extra />
        <ellipse className="loose" cx="180" cy="46" rx="7" ry="12" transform="rotate(-28 180 46)" />
        <ellipse className="loose loose-extra" cx="1120" cy="420" rx="6" ry="11" transform="rotate(36 1120 420)" />
        <ellipse className="loose" cx="40" cy="460" rx="6" ry="10" transform="rotate(18 40 460)" />
        <ellipse className="loose loose-extra" cx="1140" cy="640" rx="8" ry="13" transform="rotate(-20 1140 640)" />
        <ellipse className="loose loose-extra" cx="210" cy="760" rx="6" ry="11" transform="rotate(40 210 760)" />
      </svg>
    </div>
  )
}
