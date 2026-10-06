// scripts/replace-tailwind-colors.js
// Replaces Tailwind color utility classes (e.g., text-gray-400, bg-gray-100) with
// arbitrary value classes that reference the CSS variables defined in themes.css.
// Run with: `node scripts/replace-tailwind-colors.js`

const fs = require('fs');
const glob = require('glob');

const patterns = ['app/**/*.tsx', 'app/**/*.ts'];

// Mapping of Tailwind color utilities to CSS variable references.
// You can extend this mapping as needed.
const classMap = {
  // Text colors
  'text-gray-400': 'text-[var(--text-2)]',
  'text-gray-500': 'text-[var(--text-2)]',
  'text-gray-600': 'text-[var(--text-3)]',
  'text-gray-700': 'text-[var(--text-3)]',
  'text-gray-800': 'text-[var(--text-1)]',
  'text-gray-900': 'text-[var(--text-1)]',
  // Background colors
  'bg-gray-100': 'bg-[var(--surface-1)]',
  'bg-gray-200': 'bg-[var(--surface-2)]',
  'bg-gray-300': 'bg-[var(--surface-3)]',
  'bg-gray-400': 'bg-[var(--surface-0)]',
  // Border colors (used via class names or inline style)
  'border-gray-200': 'border-[var(--border)]',
  // Add more mappings as you discover them.
};

function replaceInFile(filePath) {
  let content = fs.readFileSync(filePath, 'utf8');
  const original = content;
  for (const [oldClass, newClass] of Object.entries(classMap)) {
    const regex = new RegExp(`\\b${oldClass}\\b`, 'g');
    content = content.replace(regex, newClass);
  }
  if (content !== original) {
    fs.writeFileSync(filePath, content, 'utf8');
    console.log(`Updated ${filePath}`);
  }
}

patterns.forEach(pattern => {
  const files = glob.sync(pattern, { ignore: ['node_modules/**'] });
  files.forEach(replaceInFile);
});

console.log('Tailwind color class replacement finished.');
