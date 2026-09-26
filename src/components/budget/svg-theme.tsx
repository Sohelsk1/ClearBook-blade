/** Soft SVG wash behind every signed-in page. Static, so it does not move the numbers. */
export function SvgTheme() {
  return (
    <svg className="app-svg-theme" viewBox="0 0 1200 800" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
      <defs>
        <radialGradient id="cb-wash-green" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#10B981" stopOpacity="0.42" />
          <stop offset="100%" stopColor="#10B981" stopOpacity="0" />
        </radialGradient>
        <radialGradient id="cb-wash-blue" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#2563EB" stopOpacity="0.28" />
          <stop offset="100%" stopColor="#2563EB" stopOpacity="0" />
        </radialGradient>
        <radialGradient id="cb-wash-amber" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#D97706" stopOpacity="0.24" />
          <stop offset="100%" stopColor="#D97706" stopOpacity="0" />
        </radialGradient>
        <pattern id="cb-dots" width="20" height="20" patternUnits="userSpaceOnUse">
          <circle cx="1" cy="1" r="0.9" fill="currentColor" />
        </pattern>
      </defs>
      <rect width="1200" height="800" fill="url(#cb-dots)" />
      <ellipse cx="160" cy="40" rx="340" ry="220" fill="url(#cb-wash-green)" />
      <ellipse cx="1080" cy="120" rx="380" ry="250" fill="url(#cb-wash-blue)" />
      <ellipse cx="640" cy="780" rx="460" ry="220" fill="url(#cb-wash-amber)" />
    </svg>
  );
}
