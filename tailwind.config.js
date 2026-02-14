/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        brand: {
          bg: '#0A0E17',
          card: '#111827',
          card2: '#1A2035',
          border: '#1F2937',
        },
      },
    },
  },
  plugins: [],
};
