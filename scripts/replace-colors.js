// scripts/replace-colors.js
// Scans TSX/TS files and replaces hard‑coded colour literals with CSS variable references.
// Run with: `node scripts/replace-colors.js`

const fs = require('fs');
const path = require('path');
const glob = require('glob');

// Files to process
const patterns = ['components/**/*.tsx', 'components/**/*.ts', 'app/**/*.tsx', 'app/**/*.ts'];

// Map literal colour values to CSS variables (Tailwind arbitrary value syntax)
const colourMap = {
  '#ffffff': 'var(--surface-0)',
  '#f4f5f2': 'var(--surface-1)',
  '#eaeee9': 'var(--surface-2)',
  '#dee5de': 'var(--surface-3)',
  '#202823': 'var(--text-1)',
  '#56615a': 'var(--text-2)',
  '#737f77': 'var(--text-3)',
  '#4d6b59': 'var(--accent)',
  '#40594b': 'var(--accent-hover)',
  '#9b8057': 'var(--accent-2)',
  // add more as discovered
};

function replaceInFile(filePath) {
  let content = fs.readFileSync(filePath, 'utf8');
  const original = content;
  for (const [hex, varRef] of Object.entries(colourMap)) {
    const regex = new RegExp(hex, 'gi');
    content = content.replace(regex, varRef);
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

console.log('Colour replacement finished.');
