/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/**/*.{html,ts}",
  ],
  theme: {
    extend: {
      colors: {
        violet: {
          500: '#8B5CF6',
        },
        dark: {
          bg: '#0F172A', // Slate 900 equivalent for space theme
        }
      },
      fontFamily: {
        sans: ['"Space Grotesk"', '"Inter"', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'monospace'],
      },
    },
  },
  plugins: [],
}

