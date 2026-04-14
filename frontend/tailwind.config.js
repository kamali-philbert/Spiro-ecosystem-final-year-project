/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Spiro brand colors
        spiro: {
          blue:    '#2B3EE6',  // royal blue (logo background)
          yellow:  '#C8F000',  // yellow-green (logo text)
          green:   '#3DB54A',  // moto green
          50:      '#f5f7ff',
          100:     '#e8ecff',
          200:     '#c8f000',  // yellow accent
          300:     '#a0c400',
          400:     '#C8F000',  // primary yellow
          500:     '#2B3EE6',  // primary blue
          600:     '#1e2eb8',
          700:     '#1a27a0',
          800:     '#141e80',
          900:     '#0e1560',
        },
        dark: {
          900: '#080c1a',
          800: '#0d1230',
          700: '#111840',
          600: '#1a2255',
        }
      },
      fontFamily: {
        sans: ['Inter', 'sans-serif'],
      },
    },
  },
  plugins: [],
}
