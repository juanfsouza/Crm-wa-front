import { Config } from 'tailwindcss';
import flyonui from 'flyonui';

const config: Config = {
  content: [
    './index.html',
    './src/**/*.{js,ts,jsx,tsx}',
  ],
  theme: {
    extend: {},
  },
  plugins: [flyonui],
};

export default config;