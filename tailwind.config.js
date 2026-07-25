/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  safelist: [
    // Tier accent colors used dynamically in digital pass / badge styling.
    // accent values: emerald (Budget), sky (Mid-tier), amber (Premium), rose (Luxury)
    {
      pattern: /^(bg|text|border|from|to|via|ring|shadow)-(emerald|sky|amber|rose)-(50|100|200|300|400|500|600|700|900)(\/\d+)?$/,
    },
    { pattern: /^(bg|text|border)-(emerald|sky|amber|rose)-(500|900)\/(10|20|30|40)$/, },
  ],
  theme: {
    extend: {},
  },
  plugins: [],
};
