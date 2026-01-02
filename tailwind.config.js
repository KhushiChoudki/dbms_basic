module.exports = {
  content: [
    "./src/**/*.{js,jsx,ts,tsx}",
    "./public/index.html"
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
      colors: {
        // We can add custom brand colors here if needed, but we will stick to tailwind defaults for now.
      }
    },
  },
  plugins: [],
};
