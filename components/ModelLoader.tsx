export default function ModelLoader() {
  return <div className="model-loader" aria-hidden="true">
    <svg className="model-loader-disc" viewBox="0 0 160 160" fill="none">
      <circle cx="80" cy="80" r="65" stroke="currentColor" strokeWidth="1.5" />
      <circle cx="80" cy="80" r="59" stroke="currentColor" strokeOpacity=".25" />
      <circle cx="80" cy="80" r="22" stroke="currentColor" strokeOpacity=".5" />
      <circle cx="80" cy="80" r="9" stroke="currentColor" strokeWidth="2" />
      <g className="model-loader-compass">
        <path d="M80 20 85 37 80 32 75 37Z" fill="currentColor" />
        <path d="M80 140 85 123 80 128 75 123Z" fill="currentColor" opacity=".45" />
        <path d="M20 80H35M125 80H140" stroke="currentColor" />
        <path d="M42 42 49 49M111 111 118 118M42 118 49 111M111 49 118 42" stroke="currentColor" opacity=".5" />
        <path d="M34 66A48 48 0 0 1 66 34M94 126A48 48 0 0 0 126 94" stroke="currentColor" strokeWidth="3" strokeLinecap="round" opacity=".45" />
      </g>
    </svg>
    <span className="model-loader-caption">Unearthing your treasure…</span>
  </div>;
}
