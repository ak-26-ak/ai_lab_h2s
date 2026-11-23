import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./src/**/*.{ts,tsx}'],
  theme: { extend: { keyframes: { slideIn: { from: { transform: 'translateX(100%)' }, to: { transform: 'translateX(0)' } }, fadeUp: { from: { opacity: '0', transform: 'translateY(8px)' }, to: { opacity: '1', transform: 'translateY(0)' } } }, animation: { slideIn: 'slideIn .25s ease-out', fadeUp: '.3s ease-out fadeUp' } } },
  plugins: []
};

export default config;
