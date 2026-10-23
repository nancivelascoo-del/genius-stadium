// Fails if any file the service worker precaches is missing from the deploy folder (default _site).
// A missing file would 404 on the live site and stop the offline cache from installing.
const fs = require('fs'), path = require('path');
const dir = process.argv[2] || '_site';
const src = fs.readFileSync(path.join(dir, 'sw.js'), 'utf8');
const m = src.match(/const FILES = (\[[\s\S]*?\]);/);
if (!m) { console.error('FILES list not found in sw.js'); process.exit(1); }
const files = Function('return ' + m[1])();
const miss = files.filter(f => f !== './' && !fs.existsSync(path.join(dir, f)));
if (miss.length) { console.error('Missing from ' + dir + ':', miss); process.exit(1); }
console.log('All ' + files.length + ' precached files present in ' + dir);
