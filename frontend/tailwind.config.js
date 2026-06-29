/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        ink: "#172033",
        calm: "#2f6f73",
        mist: "#eef6f5",
      },
    },
  },
  plugins: [],
};
