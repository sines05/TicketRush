import tailwindcssAnimate from "tailwindcss-animate";

/** @type {import('tailwindcss').Config} */
export default {
  darkMode: ["class"],
  content: [
    './index.html',
    './src/**/*.{js,jsx}',
  ],
  theme: {
    container: {
      center: true,
      padding: "2rem",
      screens: {
        "2xl": "1400px",
      },
    },
    extend: {
      colors: {
        border: "hsl(var(--tr-border))",
        input: "hsl(var(--tr-input))",
        ring: "hsl(var(--tr-ring))",
        background: "hsl(var(--tr-background))",
        foreground: "hsl(var(--tr-foreground))",
        primary: {
          DEFAULT: "hsl(var(--tr-primary))",
          foreground: "hsl(var(--tr-primary-foreground))",
        },
        secondary: {
          DEFAULT: "hsl(var(--tr-secondary))",
          foreground: "hsl(var(--tr-secondary-foreground))",
        },
        destructive: {
          DEFAULT: "hsl(var(--tr-destructive))",
          foreground: "hsl(var(--tr-destructive-foreground))",
        },
        muted: "hsl(var(--tr-muted))",
        "muted-foreground": "hsl(var(--tr-muted-foreground))",
        accent: {
          DEFAULT: "hsl(var(--tr-accent))",
          foreground: "hsl(var(--tr-accent-foreground))",
        },
        popover: {
          DEFAULT: "hsl(var(--tr-popover))",
          foreground: "hsl(var(--tr-popover-foreground))",
        },
        card: {
          DEFAULT: "hsl(var(--tr-card))",
          foreground: "hsl(var(--tr-card-foreground))",
        },
        // Legacy compatibility colors
        bg: 'rgb(var(--tr-bg) / <alpha-value>)',
        surface: 'rgb(var(--tr-surface) / <alpha-value>)',
        text: 'rgb(var(--tr-text) / <alpha-value>)',
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
      },
      borderRadius: {
        lg: "var(--tr-radius)",
        md: "calc(var(--tr-radius) - 2px)",
        sm: "calc(var(--tr-radius) - 4px)",
      },
      fontFamily: {
        sans: ["Geist", "Inter", "system-ui", "sans-serif"],
        mono: ["Geist Mono", "Fira Code", "monospace"],
      },
      keyframes: {
        "accordion-down": {
          from: { height: "0" },
          to: { height: "var(--radix-accordion-content-height)" },
        },
        "accordion-up": {
          from: { height: "var(--radix-accordion-content-height)" },
          to: { height: "0" },
        },
        "fade-in-up": {
          "0%": {
            opacity: "0",
            transform: "translateY(10px)",
          },
          "100%": {
            opacity: "1",
            transform: "translateY(0)",
          },
        },
        "scale-in": {
          "0%": {
            opacity: "0",
            transform: "scale(0.98)",
          },
          "100%": {
            opacity: "1",
            transform: "scale(1)",
          },
        },
      },
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
        "fade-in-up": "fade-in-up 0.5s cubic-bezier(0.16, 1, 0.3, 1)",
        "scale-in": "scale-in 0.4s cubic-bezier(0.16, 1, 0.3, 1)",
      },

    },
  },
  plugins: [tailwindcssAnimate],
}
