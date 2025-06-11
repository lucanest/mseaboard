module.exports = {
  darkMode: 'class',
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  safelist: [
    'bg-green-200', 'bg-yellow-200', 'bg-red-200', 'bg-purple-200', 'bg-gray-200',
    'bg-pink-200', 'bg-blue-200', 'bg-blue-100', 'bg-red-100', 'bg-teal-200',
    'bg-orange-300', 'bg-green-100', 'bg-purple-300', 'bg-purple-100', 'bg-white',
    'text-5xl', 'w-16', 'h-16'
  ],
  theme: {
    extend: {},
  },
  plugins: [],
};

