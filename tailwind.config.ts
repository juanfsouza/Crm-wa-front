import { Config } from 'tailwindcss';
import flyonui from 'flyonui';

const config: Config = {
  content: [
    './index.html',
    './src/**/*.{js,ts,jsx,tsx}',
    './node_modules/flyonui/dist/**/*.{js,css}',
  ],
  theme: {
    extend: {
      colors: {
        orange: { DEFAULT: '#f97316', dark: '#ea580c' },
        green: { DEFAULT: '#22c55e', dark: '#16a34a' },
        red: { DEFAULT: '#ef4444', dark: '#dc2626' },
        gray: { DEFAULT: '#4b5563' },
        yellow: { DEFAULT: '#eab308' },
      },
    },
  },
  plugins: [flyonui],
};

export default config;