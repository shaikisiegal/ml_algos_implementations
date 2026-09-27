// Prepares `dist/` for GitHub Pages after `expo export -p web`.
import { copyFileSync, writeFileSync } from 'node:fs';

// Pages has no SPA rewrites: serve the app for unknown paths (e.g. a reload on /timeline).
copyFileSync('dist/index.html', 'dist/404.html');
// Stop Jekyll from dropping the `_expo/` folder (underscore dirs are ignored by default).
writeFileSync('dist/.nojekyll', '');
console.log('dist/ ready for GitHub Pages');
