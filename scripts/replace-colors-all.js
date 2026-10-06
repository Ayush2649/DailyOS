// scripts/replace-colors-all.js
// This script replaces any hex colour literal (e.g., "#10B981") in .tsx/.ts files under the `app` folder
// with a CSS variable reference. For now we map all literals to the primary colour variable.
// You can extend the `fallbackVar` mapping or add specific entries as needed.

const fs = require('fs');
const path = require('path');
const glob = require('glob');

const patterns = ['app/**/*.tsx', 'app/**/*.ts'];
const fallbackVar = 'var(--color-primary)'; // default replacement

function replaceHexLiterals(content) {
  // Match # followed by 3 or 6 hex digits
  return content.replace(/#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})\b/g, fallbackVar);
}

function processFile(filePath) {
  let content = fs.readFileSync(filePath, 'utf8');n  const original = content;
  content = replaceHexLiterals(content);
  if (content !== original) {
    fs.writeFileSync(filePath, content, 'utf8');
    console.log(`Updated ${filePath}`);
  }
}

patterns.forEach(pattern => {
  const files = glob.sync(pattern, { ignore: ['node_modules/**'] });
  files.forEach(processFile);
});

console.log('All hex literals in app folder replaced with', fallbackVar);
