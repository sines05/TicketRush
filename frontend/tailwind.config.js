/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        bg: 'rgb(var(--tr-bg) / <alpha-value>)',
        surface: 'rgb(var(--tr-surface) / <alpha-value>)',
        text: 'rgb(var(--tr-text) / <alpha-value>)',
        muted: 'rgb(var(--tr-muted) / <alpha-value>)',
        onBrand: 'rgb(var(--tr-on-brand) / <alpha-value>)',
        brand: {
          50: 'rgb(var(--tr-brand-50) / <alpha-value>)',
          600: 'rgb(var(--tr-brand-600) / <alpha-value>)',
          700: 'rgb(var(--tr-brand-700) / <alpha-value>)'
        },
        danger: 'rgb(var(--tr-danger) / <alpha-value>)',
        success: 'rgb(var(--tr-success) / <alpha-value>)',
        warning: 'rgb(var(--tr-warning) / <alpha-value>)',
        seat: {
          available: 'rgb(var(--tr-seat-available) / <alpha-value>)',
          locked: 'rgb(var(--tr-seat-locked) / <alpha-value>)',
          sold: 'rgb(var(--tr-seat-sold) / <alpha-value>)',
          selected: 'rgb(var(--tr-seat-selected) / <alpha-value>)'
        }
      }
    }
  },
  plugins: []
};
