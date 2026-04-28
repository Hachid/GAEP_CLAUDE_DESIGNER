import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './lib/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        primary: { DEFAULT: '#1a237e', dark: '#121858' },
        accent: '#2563eb',
        gaep: {
          orange: '#f97316',
          green: '#16a34a',
          danger: '#ef4444',
          purple: '#7c3aed',
          bg: '#f3f4f6',
          border: '#e2e8f0',
          text: '#1e293b',
          muted: '#64748b',
        },
      },
      fontFamily: {
        sans: ['Segoe UI', 'Roboto', 'Helvetica', 'sans-serif'],
      },
    },
  },
  plugins: [],
}

export default config
