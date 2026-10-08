const token = (name) => `rgb(var(--${name}) / <alpha-value>)`;

/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        bg: token('bg'),
        surface: token('surface'),
        'surface-2': token('surface-2'),
        border: token('border'),
        text: token('text'),
        muted: token('muted'),
        accent: token('accent'),
        'accent-deep': token('accent-deep'),
        'accent-text': token('accent-text'),
        'on-accent': token('on-accent'),
        danger: token('danger'),
      },
      fontFamily: {
        sans: [
          'ui-rounded',
          '"SF Pro Rounded"',
          'system-ui',
          '-apple-system',
          '"Segoe UI"',
          'Roboto',
          '"Helvetica Neue"',
          'Arial',
          'sans-serif',
        ],
      },
      boxShadow: {
        card: '0 1px 0 rgb(255 255 255 / 0.04) inset, 0 10px 30px -18px rgb(0 0 0 / 0.55)',
        glow: '0 1px 0 rgb(255 255 255 / 0.28) inset, 0 10px 36px -8px rgb(var(--accent) / 0.7), 0 2px 6px rgb(0 0 0 / 0.25)',
      },
    },
  },
  plugins: [],
};
