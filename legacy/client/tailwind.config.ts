import type { Config } from 'tailwindcss'

export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        bg: 'var(--color-bg)',
        surface: 'var(--color-surface)',
        'surface-2': 'var(--color-surface-2)',
        'surface-3': 'var(--color-surface-3)',
        border: 'var(--color-border)',
        'border-strong': 'var(--color-border-strong)',
        text: 'var(--color-text)',
        muted: 'var(--color-muted)',
        subtle: 'var(--color-subtle)',
        primary: {
          DEFAULT: 'var(--color-primary)',
          hover: 'var(--color-primary-hover)',
          soft: 'var(--color-primary-soft)',
        },
        accent: 'var(--color-accent)',
        success: 'var(--color-success)',
        warning: 'var(--color-warning)',
        danger: 'var(--color-danger)',
        pink: 'var(--color-pink)',
      },
      fontFamily: {
        display: ['"Space Grotesk"', 'sans-serif'],
        sans: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'monospace'],
        pixel: ['"Press Start 2P"', 'monospace'],
      },
      borderRadius: {
        control: '10px',
        card: '14px',
        panel: '20px',
      },
      boxShadow: {
        glow: '0 0 0 1px rgba(139,92,246,0.4), 0 8px 30px rgba(139,92,246,0.18)',
        'pixel-sm': '3px 3px 0 rgba(0,0,0,0.55)',
        'pixel-md': '4px 4px 0 rgba(0,0,0,0.55)',
        'pixel-lg': '6px 6px 0 rgba(0,0,0,0.5)',
        card: '0 1px 2px rgba(0,0,0,0.4), 0 8px 24px rgba(0,0,0,0.25)',
      },
      keyframes: {
        shimmer: {
          '0%': { backgroundPosition: '-400px 0' },
          '100%': { backgroundPosition: '400px 0' },
        },
        float: {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-8px)' },
        },
        equalizer: {
          '0%, 100%': { transform: 'scaleY(0.4)' },
          '50%': { transform: 'scaleY(1)' },
        },
        'pan-slow': {
          '0%': { backgroundPosition: '0% 50%' },
          '100%': { backgroundPosition: '100% 50%' },
        },
        'pulse-ring': {
          '0%': { transform: 'scale(1)', opacity: '0.6' },
          '100%': { transform: 'scale(1.6)', opacity: '0' },
        },
        'pixel-blink': {
          '0%, 49%': { opacity: '1' },
          '50%, 100%': { opacity: '0.15' },
        },
      },
      animation: {
        shimmer: 'shimmer 1.6s linear infinite',
        float: 'float 5s ease-in-out infinite',
        'pixel-blink': 'pixel-blink 1.1s steps(1) infinite',
        equalizer: 'equalizer 0.8s ease-in-out infinite',
        'pan-slow': 'pan-slow 60s linear infinite alternate',
        'spin-slow': 'spin 8s linear infinite',
        'pulse-ring': 'pulse-ring 1.6s cubic-bezier(0.22,1,0.36,1) infinite',
      },
    },
  },
  plugins: [],
} satisfies Config
