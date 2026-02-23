/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: '#005BAA', // Azul Cruzeiro Oficial
          light: '#0073D6',
          dark: '#004280',
          foreground: '#FFFFFF',
        },
        secondary: {
          DEFAULT: '#FFFFFF', // Branco
          light: '#F3F4F6', // Cinza muito claro
          dark: '#E5E7EB', // Cinza claro
          foreground: '#005BAA',
        },
        accent: {
          DEFAULT: '#FFD700', // Dourado Estrelas
          light: '#FFE44D',
          dark: '#B39700',
        },
        background: {
          DEFAULT: '#002D5A', // Azul Profundo Fundo
          dark: '#001A33',
          card: 'rgba(255, 255, 255, 0.95)', // Card claro (quase branco)
        }
      },
      fontFamily: {
        sans: ['Inter', 'sans-serif'],
        display: ['Montserrat', 'sans-serif'], // Fonte para títulos
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
    function ({ addUtilities }) {
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
