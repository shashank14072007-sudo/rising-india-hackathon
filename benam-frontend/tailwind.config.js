/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        benam: {
          bg: "#040a0f",
          panel: "rgba(10, 21, 32, 0.7)",
          accent: "#00d4ff",
          accent2: "#00ff9d",
          urgent: "#ff4d4d"
        }
      },
      backdropBlur: {
        xs: '2px',
      }
    },
  },
  plugins: [],
}
