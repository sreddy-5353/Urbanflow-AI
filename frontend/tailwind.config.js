/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        darkBg: {
          deep: "#0B132B",      // Deepest background
          card: "#1C2541",      // Card background
          border: "#3A506B",    // Border highlights
        },
        brand: {
          neonCyan: "#6FFFE9",  // Neon cyan highlight
          teal: "#5BC0BE",      // Primary brand color
          green: "#10B981",     // Carbon tracker green
          red: "#EF4444",       // Emergency alert red
        }
      },
      fontFamily: {
        sans: ['Outfit', 'Inter', 'sans-serif'],
      },
      boxShadow: {
        glass: '0 8px 32px 0 rgba(0, 0, 0, 0.37)',
        neonCyan: '0 0 15px rgba(110, 255, 233, 0.4)',
        neonRed: '0 0 15px rgba(239, 68, 68, 0.5)',
      }
    },
  },
  plugins: [],
}
