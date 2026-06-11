const paths = {
  dashboard: "M4 4h7v7H4V4zm9 0h7v7h-7V4zM4 13h7v7H4v-7zm9 0h7v7h-7v-7z",
  forecast: "M12 3v2m0 14v2M4.2 4.2l1.4 1.4m13.2 13.2l1.4 1.4M3 12h2m14 0h2M4.2 19.8l1.4-1.4M18.4 5.6l1.4-1.4M12 8a4 4 0 100 8 4 4 0 000-8z",
  radar: "M12 20a8 8 0 100-16 8 8 0 000 16zm0-3a5 5 0 100-10 5 5 0 000 10zm0-3a2 2 0 100-4 2 2 0 000 4z",
  rain: "M8 16v-4m4 4v-6m4 6v-2M6 20h12a2 2 0 002-2v-1a6 6 0 00-6-6H10a6 6 0 00-6 6v1a2 2 0 002 2z",
  waves: "M3 12c2-2 4-2 6 0s4 2 6 0 4-2 6 0M3 17c2-2 4-2 6 0s4 2 6 0 4-2 6 0",
  shield: "M12 3l8 3v6c0 5-3.5 8.5-8 9-4.5-.5-8-4-8-9V6l8-3z",
  fire: "M12 3c1 3 3 4.5 3 7a3 3 0 11-6 0c0-2.5 2-4 3-7zM8 21h8",
  climate: "M12 3v18M5 8h14M7 14h10",
  news: "M6 6h12v12H6V6zm3 3h6m-6 3h4",
  cloud: "M7 16a4 4 0 014-4h.5A5.5 5.5 0 0118 13.5 4 4 0 0116 20H8a3 3 0 01-1-4z",
  settings: "M12 8a4 4 0 110 8 4 4 0 010-8zm8 4l2 1-1 2 2 1-2 1 1 2-2-1-2 1 1-2-2-1 2-1-1-2 2 1 2-1z",
  home: "M4 10l8-6 8 6v9a1 1 0 01-1 1h-5v-6H10v6H5a1 1 0 01-1-1v-9z",
  share: "M8 12l8-4-8-4v3H4v2h4v3zm4 5l8-4-8-4",
  star: "M12 3l2.4 6.8H22l-5.5 4.2 2.1 6.8L12 17.8 5.4 20.8l2.1-6.8L2 9.8h7.6L12 3z",
  refresh: "M4 12a8 8 0 0113.7-5.7M20 12a8 8 0 01-13.7 5.7M16 5h4V1M8 19H4v4",
  phone: "M8 3h8l1 3v12l-1 3H8l-1-3V6l1-3z",
  info: "M12 8v4m0 4h.01M12 3a9 9 0 110 18 9 9 0 010-18z",
  clock: "M12 8v4l3 2M12 3a9 9 0 110 18 9 9 0 010-18z",
  arrow: "M5 12h14m-6-6l6 6-6 6",
  chevron: "M9 6l6 6-6 6",
};

export function NavIcon({ name, size = 18, className = "" }) {
  const d = paths[name] || paths.dashboard;
  return (
    <svg
      className={className}
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d={d} />
    </svg>
  );
}

export function SentinelaLogo({ size = 40 }) {
  return (
    <div className="sr-logo" style={{ width: size, height: size }}>
      <svg viewBox="0 0 48 48" width={size} height={size} aria-hidden="true">
        <path
          d="M22 4 30 7 36 13 39 20 37 27 41 34 36 42 27 44 19 41 12 43 7 37 9 29 6 22 10 14 16 10Z"
          fill="#17a34a"
        />
        <path
          d="M26 22c3.3.3 6.8 2.1 8.4 5.2 1.5 2.9.9 6.4-1.8 9.8-2.4 2.9-6.5 4-10.6 3.2 3.3-2.9 5.6-6.3 6.1-10.1.3-2.4-.4-5-2.1-8.1Z"
          fill="#0ea5e9"
          opacity="0.9"
        />
        <path
          d="M11 35 27 8 36 19 18 42Z"
          fill="#facc15"
          opacity="0.88"
        />
        <path
          d="M22 4 30 7 36 13 39 20 37 27 41 34 36 42 27 44 19 41 12 43 7 37 9 29 6 22 10 14 16 10Z"
          fill="none"
          stroke="#dff7ff"
          strokeWidth="1.4"
          strokeLinejoin="round"
        />
        <circle cx="29.5" cy="31" r="2.1" fill="#f8fafc" />
        <path d="M29.5 31 23 39M29.5 31l7 7" stroke="#f8fafc" strokeWidth="1.3" strokeLinecap="round" />
        <path d="M33 28.5a6 6 0 0 1 2.4 5.6" stroke="#f8fafc" strokeWidth="1.3" strokeLinecap="round" fill="none" />
        <path d="M36 25.8a10 10 0 0 1 4 9.5" stroke="#f8fafc" strokeWidth="1.3" strokeLinecap="round" fill="none" opacity="0.82" />
      </svg>
    </div>
  );
}
