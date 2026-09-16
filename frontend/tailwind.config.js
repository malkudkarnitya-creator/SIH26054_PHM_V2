/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        aerospace: '#050816',
        cyan: '#00E5FF',
        indigo: '#4F46E5',
        success: '#22C55E',
        danger: '#EF4444',
      },
    },
  },
  plugins: [],
}
