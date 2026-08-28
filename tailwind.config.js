import tailwindcssAnimate from 'tailwindcss-animate'

/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: ['./index.html', './src/**/*.{vue,js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        // Tokens are bare OKLCH channels in main.css (`--x: L C H`), wrapped
        // here as `oklch(var(--x) / <alpha-value>)` so opacity-modifiers
        // (`bg-success/15`) work — Tailwind v3.4 can't parse a color out of
        // a plain `var(--x)`. Tailwind v4 removes this constraint.
        background: 'oklch(var(--background) / <alpha-value>)',
        foreground: 'oklch(var(--foreground) / <alpha-value>)',
        card: {
          DEFAULT: 'oklch(var(--card) / <alpha-value>)',
          foreground: 'oklch(var(--card-foreground) / <alpha-value>)',
        },
        popover: {
          DEFAULT: 'oklch(var(--popover) / <alpha-value>)',
          foreground: 'oklch(var(--popover-foreground) / <alpha-value>)',
        },
        toast: {
          DEFAULT: 'oklch(var(--toast) / <alpha-value>)',
          foreground: 'oklch(var(--toast-foreground) / <alpha-value>)',
        },
        primary: {
          DEFAULT: 'oklch(var(--primary) / <alpha-value>)',
          foreground: 'oklch(var(--primary-foreground) / <alpha-value>)',
        },
        secondary: {
          DEFAULT: 'oklch(var(--secondary) / <alpha-value>)',
          foreground: 'oklch(var(--secondary-foreground) / <alpha-value>)',
        },
        muted: {
          DEFAULT: 'oklch(var(--muted) / <alpha-value>)',
          foreground: 'oklch(var(--muted-foreground) / <alpha-value>)',
        },
        panel: {
          active: {
            DEFAULT: 'oklch(var(--panel-active) / <alpha-value>)',
            foreground: 'oklch(var(--panel-active-foreground) / <alpha-value>)',
          },
        },
        accent: {
          DEFAULT: 'oklch(var(--accent) / <alpha-value>)',
          foreground: 'oklch(var(--accent-foreground) / <alpha-value>)',
        },
        destructive: {
          DEFAULT: 'oklch(var(--destructive) / <alpha-value>)',
          foreground: 'oklch(var(--destructive-foreground) / <alpha-value>)',
        },
        border: 'oklch(var(--border) / <alpha-value>)',
        input: 'oklch(var(--input) / <alpha-value>)',
        ring: 'oklch(var(--ring) / <alpha-value>)',
        success: 'oklch(var(--success) / <alpha-value>)',
        warning: 'oklch(var(--warning) / <alpha-value>)',
      },
      // Tailwind's default opacity scale only defines multiples of 5
      // (5, 10, 15, 20, ...). This project's color-opacity modifiers
      // (bg-X/4, bg-X/8, bg-X/12, ...) include fractions outside that
      // scale — a modifier with no matching key here silently generates
      // no CSS at all, not a fallback. Only the fractions actually
      // missing from the default scale are added.
      opacity: {
        4: '0.04',
        8: '0.08',
        12: '0.12',
      },
      borderRadius: {
        DEFAULT: 'var(--radius)',
        md: 'calc(var(--radius) - 4px)',
        sm: 'calc(var(--radius) - 8px)',
      },
      fontFamily: {
        sans: ['Sora', 'system-ui', 'sans-serif'],
        mono: ["'IBM Plex Mono'", 'monospace'],
      },
    },
  },
  plugins: [tailwindcssAnimate],
}
