/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        clinical: {
          950: '#090a0d', // Viewport near-black
          900: '#0e1117', // Main background
          850: '#141820', // Panel dark chrome
          800: '#1a1f2c', // Surface / Card
          750: '#222838', // Hover / subtle border
          700: '#2d354a', // Default border
          600: '#47536f', // Inactive text / subtle icons
          400: '#8e9bb3', // Muted clinical text
          200: '#d1d8e6', // High-contrast labels
          100: '#f0f3fa', // Bright white/gray text
        },
        organ: {
          spleen: '#8b5cf6', // Purple/Violet
          liver: '#3b82f6',  // Blue
          kidney_r: '#10b981', // Emerald
          kidney_l: '#06b6d4', // Cyan
          pancreas: '#f59e0b', // Amber
          lesion: '#ef4444',   // Red signal
        }
      },
      fontFamily: {
        sans: ['Inter', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'sans-serif'],
        mono: ['JetBrains Mono', 'Fira Code', 'Menlo', 'monospace']
      }
    },
  },
  plugins: [],
}
