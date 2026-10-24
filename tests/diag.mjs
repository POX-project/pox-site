import { createServer } from 'node:http';
import { readFile, writeFile, mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, extname, resolve } from 'node:path';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
const width = Number(process.argv[2] || 1440), root = fileURLToPath(new URL('../', import.meta.url));
const types = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.svg': 'image/svg+xml' };
const server = createServer(async (q, s) => { const p = new URL(q.url, 'http://x').pathname; try { s.setHeader('Content-Type', types[extname(p)] || 'text/plain'); s.end(await readFile(resolve(root, '.' + (p === '/' ? '/index.html' : p)))); } catch { s.writeHead(404).end(); } });
await new Promise(r => server.listen(0, '127.0.0.1', r));
const profile = await mkdtemp(join(tmpdir(), 'pox-diag-'));
await writeFile(join(profile, 'user.js'), 'user_pref("ui.primaryPointerCapabilities", 6);\nuser_pref("ui.allPointerCapabilities", 6);\n');
const ff = spawn('firefox', ['--headless', '--no-remote', '--profile', profile, '--remote-debugging-port', '9223'], { stdio: 'ignore' });
const delay = ms => new Promise(r => setTimeout(r, ms));
let ws, id = 0; const pend = new Map();
const cmd = (m, params = {}) => new Promise((ok, bad) => { const k = ++id; pend.set(k, { ok, bad }); ws.send(JSON.stringify({ id: k, method: m, params })); });
try {
  for (let n = 0; n < 60; n++) { try { ws = new WebSocket('ws://127.0.0.1:9223/session'); await new Promise((a, b) => { ws.onopen = a; ws.onerror = b; }); break; } catch { await delay(200); } }
  ws.onmessage = ({ data }) => { const m = JSON.parse(data), p = pend.get(m.id); if (p) m.type === 'error' ? p.bad(new Error(JSON.stringify(m))) : p.ok(m.result); };
  await cmd('session.new', { capabilities: {} });
  const { context } = await cmd('browsingContext.create', { type: 'tab' });
  await cmd('browsingContext.setViewport', { context, viewport: { width, height: 900 } });
  await cmd('browsingContext.navigate', { context, url: `http://127.0.0.1:${server.address().port}/index.html#projects`, wait: 'complete' });
  await delay(2500);
  const ev = async e => (await cmd('script.evaluate', { expression: e, target: { context }, awaitPromise: true })).result.value;
  // CSS-only check: drop the JS-set size and measure synchronously.
  console.log(await ev(`(() => { const w = document.querySelector('#wheel'); if (!w) return 'NO WHEEL'; w.style.removeProperty('--fs');
    const ws = [...w.querySelectorAll('.wi')].map(e => e.offsetWidth); return 'clientWidth=' + w.clientWidth + ' widest=' + Math.max(...ws) + ' chars=' + w.style.getPropertyValue('--chars') + ' fs=' + getComputedStyle(w.querySelector('.wi')).fontSize; })()`));
  await writeFile(join(root, 'tests/diag.png'), Buffer.from((await cmd('browsingContext.captureScreenshot', { context })).data, 'base64'));
} finally { ws?.close(); ff.kill('SIGKILL'); await delay(300); server.close(); await rm(profile, { recursive: true, force: true }); }
