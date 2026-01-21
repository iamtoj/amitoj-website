/** @type {import('tailwindcss').Config} */
export default {
  content: ['./src/**/*.{astro,html,js,jsx,md,mdx,svelte,ts,tsx,vue}'],
  theme: {
    extend: {
      colors: {
        // Primary background - warm beige/oat
        oat: {
          50: '#FDFCFA',
          100: '#FAF8F4',
          200: '#F5F0E6',  // Primary background
          300: '#EBE3D4',
          400: '#DDD2BD',
          500: '#C9B89A',
        },
        // Accent blue - soft pastel, evokes sky and clarity
        sky: {
          100: '#E8F2F8',
          200: '#D4E8F2',
          300: '#B8D4E3',  // Primary accent
          400: '#9BC2D6',
          500: '#7DAFC9',
        },
        // Accent green - sage, natural and grounded
        sage: {
          100: '#E5EAE1',
          200: '#CDD7C6',
          300: '#B2BDA0',  // Primary accent
          400: '#9AAA85',
          500: '#82966A',
        },
        // Text colors
        ink: {
          DEFAULT: '#2D2A26',  // Deep warm charcoal for body text
          light: '#5A5651',     // Secondary text
          muted: '#8A857E',     // Tertiary/caption text
        },
      },
      fontFamily: {
        serif: ['Garamond', 'EB Garamond', 'Georgia', 'Times New Roman', 'serif'],
        sans: ['system-ui', '-apple-system', 'sans-serif'],
      },
      fontSize: {
        // Typography scale for readability
        'body': ['1.125rem', { lineHeight: '1.75' }],      // 18px
        'lg': ['1.25rem', { lineHeight: '1.7' }],          // 20px
        'xl': ['1.5rem', { lineHeight: '1.5' }],           // 24px
        '2xl': ['1.875rem', { lineHeight: '1.4' }],        // 30px
        '3xl': ['2.25rem', { lineHeight: '1.3' }],         // 36px
        '4xl': ['3rem', { lineHeight: '1.2' }],            // 48px
        '5xl': ['3.75rem', { lineHeight: '1.1' }],         // 60px
      },
      spacing: {
        // Generous spacing for zen minimalism
        '18': '4.5rem',
        '22': '5.5rem',
        '30': '7.5rem',
      },
      maxWidth: {
        'prose': '65ch',       // Optimal reading width
        'content': '1100px',   // Main content container
      },
    },
  },
  plugins: [],
};
