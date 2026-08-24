/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./App.{js,jsx,ts,tsx}", "./src/**/*.{js,jsx,ts,tsx}"],
  presets: [require("nativewind/preset")],
  theme: {
    extend: {
      colors: {
        rider: {
          dark: "#0F172A",
          card: "#1E293B",
          border: "#334155",
          orange: "#F97316",
          amber: "#F59E0B",
          gold: "#EAB308",
        },
      },
    },
  },
  plugins: [],
};
