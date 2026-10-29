// Copies only the files the live site needs into dist/ (no tests, docs or git data).
import { cp, rm, mkdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { join } from 'node:path';

const root = fileURLToPath(new URL('../', import.meta.url));
const dist = join(root, 'dist');
await rm(dist, { recursive: true, force: true });
await mkdir(dist, { recursive: true });
for (const f of ['index.html', 'devices.html', 'projects.html', 'project.html', 'request.html', 'css', 'js', 'data', 'assets']) {
  await cp(join(root, f), join(dist, f), { recursive: true });
}
console.log('Built site into dist/');
