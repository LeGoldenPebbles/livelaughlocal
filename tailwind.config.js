/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './app/**/*.{js,jsx}',
    './components/**/*.{js,jsx}',
    './lib/**/*.{js,jsx}',
  ],
  theme: {
    extend: {
      colors: {
        paper: '#F7F2EA',
        ink: {
          DEFAULT: '#181715',
          soft: '#46423C',
          faint: '#8A847A',
        },
        coral: {
          DEFAULT: '#EF5A3C',
          deep: '#D14328',
          tint: '#FCE9E3',
        },
        sage: {
          DEFAULT: '#385348',
          tint: '#DCE4DA',
        },
        line: '#E8E1D2',
      },
      fontFamily: {
        display: ['var(--font-fraunces)', 'Georgia', 'serif'],
        sans: ['var(--font-inter)', 'system-ui', 'sans-serif'],
      },
      maxWidth: {
        feed: '44rem',
        site: '80rem',
        article: '42rem',
      },
    },
  },
  plugins: [],
};
