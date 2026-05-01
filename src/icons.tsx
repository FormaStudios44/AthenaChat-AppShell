// icons.tsx
// Named SVG icon components for Athena chat mode toggle.
//
// Design grid: 20×20 viewBox, displayed at 16×16 (scale 0.8).
// All strokes: 2px, round join, currentColor — inherit text color from context.
// No fill on any path.

// ─── IconChatFullscreen ───────────────────────────────────────────────────────
//
// Represents the docked / fullscreen state:
//   • Outer rect (the app frame), rx="4"
//   • Vertical divider at ~27 % from the left edge (sidebar / content split)
//   • Inner rect in the right content area (the chat panel), rx="2.5"
//
// Usage: show this icon when the window IS floating → clicking docks it.

export function IconChatFullscreen({ size = 16 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 20 20"
      fill="none"
      aria-hidden="true"
    >
      {/* Outer frame */}
      <rect
        x="1" y="1" width="18" height="18" rx="4"
        stroke="currentColor" strokeWidth="2" strokeLinejoin="round"
      />
      {/* Sidebar divider — ~27 % from left */}
      <line
        x1="5.5" y1="1" x2="5.5" y2="19"
        stroke="currentColor" strokeWidth="2"
      />
      {/* Chat panel inside the content area */}
      <rect
        x="8.5" y="3.5" width="7.5" height="13" rx="2.5"
        stroke="currentColor" strokeWidth="2" strokeLinejoin="round"
      />
    </svg>
  );
}

// ─── IconChatFloating ─────────────────────────────────────────────────────────
//
// Represents the floating window state:
//   • Ghost outer rect at 20 % opacity (the page behind the window), rx="4"
//   • Inner rect anchored to the bottom-right corner (~38 % wide × 70 % tall),
//     full-opacity stroke (the floating chat window), rx="2.5"
//
// Usage: show this icon when the window is NOT floating → clicking floats it.

export function IconChatFloating({ size = 16 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 20 20"
      fill="none"
      aria-hidden="true"
    >
      {/* Ghost page frame */}
      <rect
        x="1" y="1" width="18" height="18" rx="4"
        stroke="currentColor" strokeWidth="2" strokeOpacity="0.2" strokeLinejoin="round"
      />
      {/* Floating chat window — bottom-right, ~38 % wide × 72 % tall */}
      <rect
        x="10" y="4" width="7" height="13" rx="2.5"
        stroke="currentColor" strokeWidth="2" strokeLinejoin="round"
      />
    </svg>
  );
}
