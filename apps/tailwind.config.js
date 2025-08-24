import animate from "tailwindcss-animate"

/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  // Tailwind CSS v4 uses @theme in CSS for configuration
  // This config is minimal, mainly for the animate plugin
  plugins: [animate],
}
