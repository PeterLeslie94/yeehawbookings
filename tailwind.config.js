/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        'country-orange': '#D2691E',
        'country-brown': '#8B4513',
        'country-tan': '#D2B48C',
        'country-cream': '#F5E6D3',
        'country-dark': '#654321',
      },
      fontFamily: {
        'western': ['Rye', 'serif'],
        'bebas': ['Bebas Neue', 'sans-serif'],
      },
    },
  },
  plugins: [],
}