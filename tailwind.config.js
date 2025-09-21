/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: 'rgb(var(--color-primary) / <alpha-value>)',
          light: 'rgb(var(--color-primary-light) / <alpha-value>)',
          dark: 'rgb(var(--color-primary-dark) / <alpha-value>)',
        },
        secondary: {
          DEFAULT: 'rgb(var(--color-secondary) / <alpha-value>)',
          light: 'rgb(var(--color-secondary-light) / <alpha-value>)',
          dark: 'rgb(var(--color-secondary-dark) / <alpha-value>)',
        },
      },
      fontFamily: {
        sans: ['Inter', 'sans-serif'],
      },
      animation: {
        'fade-in': 'fadeIn 0.5s ease-in-out',
        'scale': 'scale 0.3s ease-in-out',
      },
      boxShadow: {
        'soft': '0 4px 20px -5px rgba(0, 0, 0, 0.1)',
      },
    },
  },
    plugins: [
      function({ addUtilities }) {
        const newUtilities = {
          '.no-scrollbar': {
            '@media (max-width: 768px)': {
              '-ms-overflow-style': 'none',
              'scrollbar-width': 'none',
              '&::-webkit-scrollbar': {
                display: 'none'
              }
            }
          },
          '.hide-scrollbar': {
            '@media (max-width: 768px)': {
              '-ms-overflow-style': 'none',
              'scrollbar-width': 'none',
              '&::-webkit-scrollbar': {
                display: 'none'
              }
            }
          }
        }
        addUtilities(newUtilities)
      }
    ],
};