/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        brown: {
          50: '#fdf8f3',
          100: '#f7e6d5',
          200: '#e9c4a8',
          300: '#d7a074',
          400: '#c27c4a',
          500: '#a85f32',
          600: '#8a4a26',
          700: '#6f3a1f',
          800: '#552c18',
          900: '#3b1f12',
        },
      },
    },
  },
  plugins: [],
};
