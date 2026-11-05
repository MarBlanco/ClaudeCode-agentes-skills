// Comprueba que la app de prueba de qa-explorer conserve sus defectos sembrados
// (si alguien la "arregla", la prueba de aceptación del agente deja de medir algo).
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { createServer, request } from 'node:http';
import { handler } from './fixtures/qa-app/server.mjs';

let server;
let base;

before(async () => {
  server = createServer(handler());
  await new Promise((r) => server.listen(0, '127.0.0.1', r));
  base = `http://127.0.0.1:${server.address().port}`;
});

after(() => server.close());

test('sirve las páginas del recorrido', async () => {
  for (const p of ['/', '/product.html', '/cart.html', '/checkout.html', '/contact.html', '/app.js']) {
    assert.equal((await fetch(base + p)).status, 200, p);
  }
});

test('D2: el enlace Nosotros responde 404', async () => {
  assert.equal((await fetch(`${base}/about.html`)).status, 404);
});

test('D7: el envío de contacto responde 500', async () => {
  assert.equal((await fetch(`${base}/api/contact`, { method: 'POST', body: 'x' })).status, 500);
});

test('D1, D3, D4, D5, D6 siguen sembrados en el código', async () => {
  const index = await (await fetch(`${base}/`)).text();
  assert.match(index, /window\.analytics\.track/);
  assert.match(index, /<button type="button">Suscribirme<\/button>/);
  assert.match(await (await fetch(`${base}/style.css`)).text(), /\.promo \{ width: 1100px/);
  assert.match(await (await fetch(`${base}/app.js`)).text(), /sum \+ l\.price, 0/);
  assert.match(await (await fetch(`${base}/contact.html`)).text(), /name="email" type="text"/);
});

// fetch normaliza "/../"; http.request envía la ruta cruda.
function rawStatus(path) {
  return new Promise((resolve, reject) => {
    const req = request({ host: '127.0.0.1', port: server.address().port, path }, (res) => {
      res.resume();
      resolve(res.statusCode);
    });
    req.on('error', reject);
    req.end();
  });
}

test('no sirve archivos fuera de public', async () => {
  for (const p of ['/../server.mjs', '/%2e%2e/server.mjs', '/..%5Cserver.mjs', '/..\\server.mjs', '/../EXPECTED.md', '/EXPECTED.md']) {
    assert.notEqual(await rawStatus(p), 200, p);
  }
});

test('las páginas servidas no revelan los defectos sembrados', async () => {
  for (const p of ['/', '/app.js', '/style.css', '/contact.html', '/cart.html', '/product.html', '/checkout.html']) {
    assert.doesNotMatch(await (await fetch(base + p)).text(), /sembrado|defecto/i, p);
  }
});
