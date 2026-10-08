// GitHub Pages serves 404.html for unknown paths. Mirroring index.html keeps
// deep links working if client-side routing is ever added.
import { copyFileSync } from 'node:fs';

copyFileSync('dist/index.html', 'dist/404.html');
console.log('✓ dist/404.html copied from dist/index.html');
