// Dependency-free smoke test using Firefox's WebDriver BiDi endpoint.
// Run: node tests/browser.mjs (requires Firefox in PATH).
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { readFile, mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, extname, resolve } from 'node:path';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../', import.meta.url));
const maintainers = JSON.parse(await readFile(join(root, 'data/maintainers.json')));
// Test optional links without inventing published maintainer accounts.
maintainers[0].socials = [
  { label: 'GitHub', url: 'https://github.com/example' },
  { label: 'Unsafe', url: 'javascript:alert(1)' },
  { label: 'Empty', url: '' }
];
const types = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.svg': 'image/svg+xml' };
const server = createServer(async (req, res) => {
  const path = new URL(req.url, 'http://localhost').pathname;
  const file = resolve(root, '.' + (path === '/' ? '/index.html' : path));
  if (!file.startsWith(root)) { res.writeHead(403).end(); return; }
  try {
    res.setHeader('Content-Type', types[extname(file)] || 'application/octet-stream');
    res.end(path === '/data/maintainers.json' ? JSON.stringify(maintainers) : await readFile(file));
  } catch { res.writeHead(404).end(); }
});
await new Promise(r => server.listen(0, '127.0.0.1', r));
const base = `http://127.0.0.1:${server.address().port}`;
const profile = await mkdtemp(join(tmpdir(), 'pox-browser-'));
const firefox = spawn('firefox', ['--headless', '--no-remote', '--profile', profile, '--remote-debugging-port', '9222'], { stdio: ['ignore', 'ignore', 'pipe'] });
let logs = '';
firefox.stderr.on('data', data => { logs += data; });
let ws;
let id = 0;
const pending = new Map();
const delay = ms => new Promise(r => setTimeout(r, ms));
const command = (method, params = {}) => new Promise((resolve, reject) => {
  const key = ++id;
  const timeout = setTimeout(() => { pending.delete(key); reject(new Error(`Timed out: ${method}`)); }, 10000);
  pending.set(key, { resolve, reject, timeout });
  ws.send(JSON.stringify({ id: key, method, params }));
});
try {
  for (let n = 0; n < 60; n++) {
    try {
      ws = new WebSocket('ws://127.0.0.1:9222/session');
      await new Promise((resolve, reject) => { ws.onopen = resolve; ws.onerror = reject; });
      break;
    } catch { await delay(200); }
  }
  assert.equal(ws?.readyState, WebSocket.OPEN, logs);
  ws.onmessage = ({ data }) => {
    const message = JSON.parse(data);
    const task = pending.get(message.id);
    if (!task) return;
    clearTimeout(task.timeout); pending.delete(message.id);
    if (message.type === 'error') task.reject(new Error(JSON.stringify(message)));
    else task.resolve(message.result);
  };
  await command('session.new', { capabilities: {} });
  const { context } = await command('browsingContext.create', { type: 'tab' });
  const evaluate = async expression => {
    const result = await command('script.evaluate', { expression, target: { context }, awaitPromise: true });
    assert.notEqual(result.type, 'exception', JSON.stringify(result.exceptionDetails));
    return result.result.value;
  };
  const visit = async path => {
    await command('browsingContext.navigate', { context, url: base + path, wait: 'complete' });
    await evaluate(`new Promise((resolve, reject) => {
      let attempts = 0;
      const check = () => {
        if (document.querySelector('#links a')) resolve(true);
        else if (++attempts > 100) reject(new Error('App failed to initialize'));
        else setTimeout(check, 50);
      }; check();
    })`);
    await delay(150);
  };
  for (const width of [320, 390, 768, 1440]) {
    await command('browsingContext.setViewport', { context, viewport: { width, height: 900 } });
    await visit('/index.html');
    assert.equal(await evaluate(`document.querySelector('#aboutus').nextElementSibling.id`), 'devices');
    assert.equal(await evaluate(`document.querySelectorAll('.device-card').length`), 2);
    assert.equal(await evaluate(`document.querySelectorAll('.mdesc').length`), 4);
    assert.equal(await evaluate(`document.querySelectorAll('.social-link').length`), 1);
    assert.equal(await evaluate(`document.querySelector('.social-link').rel`), 'noopener noreferrer');
    assert.equal(await evaluate(`document.documentElement.scrollWidth <= innerWidth`), true, `Overflow at ${width}px`);
    if (width <= 900) {
      assert.equal(await evaluate(`document.querySelectorAll('.row').length`), 6);
      assert.equal(await evaluate(`getComputedStyle(document.querySelector('.reveal')).opacity`), '1');
      assert.equal(await evaluate(`getComputedStyle(document.querySelector('#links')).display`), 'none');
      await evaluate(`document.querySelector('.nav-toggle').click()`);
      assert.equal(await evaluate(`document.querySelector('.nav-toggle').getAttribute('aria-expanded')`), 'true');
      assert.notEqual(await evaluate(`getComputedStyle(document.querySelector('#links')).display`), 'none');
      await evaluate(`document.dispatchEvent(new KeyboardEvent('keydown', {key:'Escape', bubbles:true}))`);
      assert.equal(await evaluate(`document.querySelector('.nav-toggle').getAttribute('aria-expanded')`), 'false');
    }
    await visit('/devices.html');
    assert.equal(await evaluate(`document.querySelector('h1').textContent`), 'Supported devices.');
    assert.equal(await evaluate(`document.querySelectorAll('.device-card').length`), 2);
    assert.equal(await evaluate(`document.documentElement.scrollWidth <= innerWidth`), true);
    await visit('/request.html?device=Redmi%20Note%208%20Pro%20(begonia)');
    assert.equal(await evaluate(`document.querySelector('#device').value`), 'Redmi Note 8 Pro (begonia)');
    assert.equal(await evaluate(`document.documentElement.scrollWidth <= innerWidth`), true);
    await visit('/project.html?id=pox-os');
    assert.equal(await evaluate(`document.querySelector('h1').textContent.replace(/\\s/g, ' ')`), 'POX OS');
    assert.equal(await evaluate(`document.documentElement.scrollWidth <= innerWidth`), true);
    console.log(`PASS: home, devices, request, project at ${width}px`);
  }
  console.log('PASS: optional social links, URL filtering, mobile menu, and request prefill');
} finally {
  ws?.close();
  firefox.kill('SIGTERM');
  await new Promise(r => { if (firefox.exitCode !== null) r(); else { firefox.once('exit', r); setTimeout(() => { firefox.kill('SIGKILL'); r(); }, 3000).unref(); } });
  await new Promise(r => server.close(r));
  await rm(profile, { recursive: true, force: true });
}
