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
        paper: '#FAF7F2',
        ink: {
          DEFAULT: '#211E1A',
          soft: '#4A453E',
          faint: '#8A837A',
        },
        coral: {
          DEFAULT: '#E85D3D',
          deep: '#C74A2E',
          tint: '#FBEAE4',
        },
        sage: {
          DEFAULT: '#7A8B6F',
          tint: '#EDF0EA',
        },
        line: '#E7E1D8',
      },
      fontFamily: {
        display: ['var(--font-fraunces)', 'Georgia', 'serif'],
        sans: ['var(--font-inter)', 'system-ui', 'sans-serif'],
      },
      maxWidth: {
        feed: '44rem',
        site: '72rem',
        article: '42rem',
      },
    },
  },
  plugins: [],
};
