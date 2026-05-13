/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        // Tokens used by the UI shell. Background-first, neutral, with a single accent.
        bg: {
          base: '#0b0f17',
          panel: '#111827',
          subtle: '#1f2937',
          hover: '#2a3447',
        },
        ink: {
          primary: '#e5e7eb',
          secondary: '#9ca3af',
          muted: '#6b7280',
        },
        accent: {
          DEFAULT: '#22d3ee', // cyan-400
          subtle: '#155e75',
        },
        border: {
          DEFAULT: '#1f2937',
          strong: '#374151',
        },
        // Suitability ramp anchors (mirrors src/lib/colorRamp.ts).
        suit: {
          0: '#440154',
          25: '#414487',
          50: '#2a788e',
          75: '#22a884',
          100: '#fde725',
        },
      },
      fontFamily: {
        sans: [
          'Inter',
          'ui-sans-serif',
          'system-ui',
          '-apple-system',
          'Segoe UI',
          'Roboto',
          'sans-serif',
        ],
        mono: ['ui-monospace', 'SFMono-Regular', 'Menlo', 'Consolas', 'monospace'],
      },
    },
  },
  plugins: [],
}
