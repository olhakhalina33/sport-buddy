/** @type {import('tailwindcss').Config} */
const v = (name) => `rgb(var(--${name}) / <alpha-value>)`;

export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        page: v('bg-page'),
        surface: v('bg-surface'),
        fg: v('text-primary'),
        muted: v('text-secondary'),
        faint: v('text-disabled'),
        danger: v('text-error'),
        onbtn: v('text-on-button'),
        line: v('border-default'),
        'line-off': v('border-disabled'),
        'line-err': v('border-error'),
        brand: v('btn-default'),
        'brand-hover': v('btn-hover'),
        'btn-off': v('btn-disabled'),
        accent: v('accent'),
        'accent-fg': v('accent-fg'),
        success: '#079455',
        warning: '#DC6803',
      },
      fontFamily: {
        sans: ['Montserrat', 'system-ui', 'Segoe UI', 'Arial', 'sans-serif'],
      },
      fontSize: {
        h4: ['23px', { lineHeight: '120%', fontWeight: '600' }],
        h5: ['20px', { lineHeight: '120%', fontWeight: '700' }],
        p: ['14px', { lineHeight: '150%' }],
        ps: ['12px', { lineHeight: '150%' }],
        btn: ['16px', { lineHeight: '150%', fontWeight: '700' }],
      },
      maxWidth: { app: '480px' },
      keyframes: {
        'fade-up': { from: { opacity: '0', transform: 'translateY(8px)' }, to: { opacity: '1', transform: 'none' } },
        pop: { '0%': { transform: 'scale(0.6)', opacity: '0' }, '100%': { transform: 'scale(1)', opacity: '1' } },
        bump: { '0%,100%': { transform: 'scale(1)' }, '50%': { transform: 'scale(1.15)' } },
      },
      animation: {
        'fade-up': 'fade-up 280ms ease-out both',
        pop: 'pop 220ms ease-out both',
        bump: 'bump 300ms ease-out',
      },
    },
  },
  plugins: [],
};
