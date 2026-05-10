/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/**/*.{js,jsx,ts,tsx}",
    "./public/index.html"
  ],
  theme: {
    extend: {
      colors: {
        mcdo: {
          red: '#DA291C',
          yellow: '#FFC72C',
        }
      }
    },
  },
  plugins: [],
}
