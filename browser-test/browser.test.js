// Browsertests (Playwright): telefoon (iPhone/Android-emulatie), groot scherm en dashboard op 1920x1080.
// Draaien met `npm run test:browser`; Playwright staat niet in de repo (zero-dependency): PLAYWRIGHT_MODULE of /opt/node-tools.
import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { createLiveServer } from '../engine/server.js';

const require = createRequire(import.meta.url);
const { chromium, devices } = require(process.env.PLAYWRIGHT_MODULE ?? '/opt/node-tools/node_modules/playwright');
const exe = process.env.CHROMIUM_PATH ?? '/opt/pw-browsers/chromium';
const launch = () => chromium.launch({ executablePath: exe, args: ['--use-fake-ui-for-media-stream', '--use-fake-device-for-media-stream'] });

async function setup(opts = {}) {
  const srv = createLiveServer({ timeoutScale: 0.1, presenceSec: 3, ...opts });
  const port = await srv.listen();
  return { srv, base: `http://127.0.0.1:${port}` };
}
const until = async (fn, ms = 8000) => { const t = Date.now(); for (;;) { const v = await fn(); if (v) return v; if (Date.now() - t > ms) throw new Error('timeout'); await new Promise((r) => setTimeout(r, 100)); } };
// Beantwoordt alle prompts op de telefoon (foto, tekst, keuze) tot het spel klaar is.
async function playPhone(page, base, ms = 40000) {
  const t = Date.now();
  while (Date.now() - t < ms) {
    if ((await (await fetch(`${base}/api/dashboard`)).json()).state === 'done') return true;
    if (await page.locator('#snap').count()) await page.locator('#snap').click().catch(() => {});
    else if (await page.locator('#x').count()) { await page.fill('#x', 'een boom in de wind').catch(() => {}); await page.locator('#s').click().catch(() => {}); }
    else if (await page.locator('.pts button').count()) await page.locator('.pts button').first().click().catch(() => {});
    await page.waitForTimeout(250);
  }
  return false;
}
const startGame = (base, body) => fetch(`${base}/api/start`, { method: 'POST', body: JSON.stringify(body) }).then((r) => r.json());

for (const [label, dev] of [['iPhone', devices['iPhone 13']], ['Android', devices['Pixel 7']]]) {
  test(`telefoon (${label}): aanmelden, camera, antwoord, herverbinden, leesbaar`, async () => {
    const { srv, base } = await setup();
    const browser = await launch();
    try {
      const ctx = await browser.newContext({ ...dev, permissions: ['camera'] });
      const page = await ctx.newPage();
      await page.goto(`${base}/phone`);
      await page.fill('#n', 'Ann'); await page.fill('#t', 'T1'); await page.click('#j');
      await page.waitForSelector('text=T1');
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth), true, 'horizontaal scrollen op telefoon');
      assert.ok(await page.evaluate(() => parseFloat(getComputedStyle(document.body).fontSize)) >= 16);
      await startGame(base, { slug: 'levend-beeld', bots: 3, durationMin: 20, settings: { rounds: 1 } });
      // Fotoprompt: camera-element met stream
      await page.waitForSelector('#snap', { timeout: 8000 });
      await until(async () => page.evaluate(() => document.getElementById('v')?.srcObject != null));
      await page.click('#snap');
      // Herverbinden: pagina herladen herstelt dezelfde speler
      await page.reload();
      await page.waitForSelector(`text=Ann`);
      const state = await (await fetch(`${base}/api/dashboard`)).json();
      assert.equal(state.players.filter((p) => p.name === 'Ann').length, 1, 'dubbele speler na herladen');
      assert.ok(await playPhone(page, base), 'spel niet afgerond');
      await page.waitForSelector('text=punten', { timeout: 5000 });
    } finally { await browser.close(); await srv.close(); }
  });
}

test('telefoon: server herstart, speler meldt zich stil opnieuw aan', async () => {
  let { srv, base } = await setup();
  const port = Number(new URL(base).port);
  const browser = await launch();
  try {
    const page = await (await browser.newContext(devices['iPhone 13'])).newPage();
    await page.goto(`${base}/phone`);
    await page.fill('#n', 'Bo'); await page.click('#j'); await page.waitForSelector('text=Bo');
    await srv.close();
    srv = createLiveServer({ port, timeoutScale: 0.1 }); await srv.listen();
    await page.waitForFunction(async () => (await (await fetch('/api/dashboard')).json()).players.some((p) => p.name === 'Bo'), null, { timeout: 8000 });
  } finally { await browser.close(); await srv.close(); }
});

test('groot scherm 1920x1080: tekst ≥ 32px, taal nl/en, geen ongepaste tekst', async () => {
  const { srv, base } = await setup();
  const browser = await launch();
  try {
    for (const lang of ['nl', 'en']) {
      await fetch(`${base}/api/join`, { method: 'POST', body: JSON.stringify({ name: `Z${lang}`, teamId: 'T1' }) });
    }
    const page = await (await browser.newContext({ viewport: { width: 1920, height: 1080 } })).newPage();
    await page.goto(`${base}/screen`);
    await startGame(base, { slug: 'stille-post', lang: 'en', bots: 4, durationMin: 20, settings: { rounds: 1 } });
    await until(async () => (await page.locator('.line').count()) > 0);
    const sizes = await page.evaluate(() => [...document.querySelectorAll('.line,.board p,h1,h2')].map((e) => parseFloat(getComputedStyle(e).fontSize)));
    assert.ok(sizes.length > 2 && sizes.every((s) => s >= 32), `kleine tekst op scherm: ${sizes}`);
    assert.equal(await page.evaluate(() => document.documentElement.lang), 'en');
    const text = (await page.innerText('body')).toLowerCase();
    assert.ok(!/fuck|kut|shit|nazi/.test(text));
    await page.screenshot({ path: process.env.SHOT_DIR ? `${process.env.SHOT_DIR}/screen.png` : undefined });
  } finally { await browser.close(); await srv.close(); }
});

test('dashboard 1920x1080: start, spelers, stand, correctie, export geldig', async () => {
  const { srv, base } = await setup();
  const browser = await launch();
  try {
    const page = await (await browser.newContext({ viewport: { width: 1920, height: 1080 } })).newPage();
    await page.goto(`${base}/dashboard`);
    await page.selectOption('#g', 'levend-beeld'); await page.fill('#b', '4'); await page.fill('#m', '20');
    await page.click('form#f button');
    await until(async () => (await (await fetch(`${base}/api/dashboard`)).json()).state === 'done', 20000);
    await page.waitForSelector('text=export geldig');
    const d = await (await fetch(`${base}/api/dashboard`)).json();
    const e = d.entries.find((x) => x.points > 0);
    await page.fill('#ce', e.id); await page.fill('#cd', String(-e.points)); await page.fill('#cr', 'Correctie: browsertest');
    await page.click('form#c button');
    await until(async () => (await (await fetch(`${base}/api/dashboard`)).json()).entries.some((x) => x.corrects === e.id));
    assert.ok(await page.locator('table#pl tr').count() >= 5);
  } finally { await browser.close(); await srv.close(); }
});

test('moderatie in de browser: ongepast antwoord van telefoon bereikt het scherm niet', async () => {
  const { srv, base } = await setup();
  const browser = await launch();
  try {
    const phone = await (await browser.newContext(devices['Pixel 7'])).newPage();
    await phone.goto(`${base}/phone`); await phone.fill('#n', 'Cy'); await phone.fill('#t', 'T2'); await phone.click('#j'); await phone.waitForSelector('text=Cy');
    const screen = await (await browser.newContext({ viewport: { width: 1920, height: 1080 } })).newPage();
    await screen.goto(`${base}/screen`);
    await startGame(base, { slug: 'levend-beeld', bots: 4, durationMin: 20, settings: { rounds: 1 } });
    await phone.waitForSelector('#x', { timeout: 15000 });   // gokprompt voor het rader-team
    await phone.fill('#x', 'f u c k dit'); await phone.click('#s');
    assert.ok(await playPhone(phone, base), 'spel niet afgerond');
    const text = (await screen.innerText('body')).toLowerCase().replace(/[^a-z]/g, '');
    assert.ok(!text.includes('fuck'));
  } finally { await browser.close(); await srv.close(); }
});

test('spellenoverzicht: alle spellen zichtbaar, starten en wisselen', async () => {
  const { srv, base } = await setup();
  const browser = await launch();
  try {
    const page = await browser.newPage({ viewport: { width: 1920, height: 1080 } });
    await page.goto(`${base}/games`); await page.waitForSelector('.card');
    const titles = await page.locator('.card h2').allTextContents();
    assert.ok(titles.length >= 3 && titles.includes('Levend Beeld'));
    await page.fill('#b', '8'); await page.fill('#m', '20');
    await page.click('button[data-s="stille-post"]');
    await until(async () => (await (await fetch(`${base}/api/state`)).json()).slug === 'stille-post');
    await page.click('button[data-s="demo"]');            // wisselen: stopt het lopende spel en start een ander
    await until(async () => (await (await fetch(`${base}/api/state`)).json()).slug === 'demo');
    await page.selectOption('#l', 'en');
    assert.ok((await page.locator('.card h2').allTextContents()).includes('Living Picture'));
    if (process.env.SHOT) await page.screenshot({ path: process.env.SHOT });
  } finally { await browser.close(); await srv.close(); }
});

// Wie is Wie: klaar-knop, prompt, koppelen met plaatjes op de telefoon; galerij met beelden op het grote scherm.
test('wie-is-wie: telefoon (iPhone) en groot scherm 1920x1080 met galerij', async () => {
  const { srv, base } = await setup();
  const browser = await launch();
  try {
    const phone = await (await browser.newContext(devices['iPhone 13'])).newPage();
    phone.setDefaultTimeout(2000);   // de telefoon rendert elke 800 ms opnieuw: geen 30 s wachten op een verdwenen knop
    await phone.goto(`${base}/phone`); await phone.fill('#n', 'Ann'); await phone.fill('#t', 'T1'); await phone.click('#j'); await phone.waitForSelector('text=Ann');
    const screen = await (await browser.newContext({ viewport: { width: 1920, height: 1080 } })).newPage();
    await screen.goto(`${base}/screen`);
    await startGame(base, { slug: 'wie-is-wie', bots: 9, durationMin: 20 });
    let matched = false, prompted = false, gallery = null;
    const t = Date.now();
    while (Date.now() - t < 60000) {
      if ((await (await fetch(`${base}/api/dashboard`)).json()).state === 'done') break;
      if (await phone.locator('#rd').count()) await phone.click('#rd').catch(() => {});
      else if (await phone.locator('select.m').count()) {
        assert.ok(await phone.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth), 'horizontaal scrollen bij koppelen');
        assert.ok(await phone.evaluate(() => [...document.querySelectorAll('.mi img')].every((i) => i.complete && i.naturalWidth > 0)), 'plaatje niet geladen');
        for (const sel of await phone.locator('select.m').all()) await sel.selectOption({ index: 1 }).catch(() => {});
        await phone.click('#mm').catch(() => {}); matched = true;
      } else if (await phone.locator('#x').count()) { await phone.fill('#x', 'een egel die elke ochtend drie keer rond de vijver loopt en dan fluit').catch(() => {}); await phone.click('#s').catch(() => {}); prompted = true; }
      if (!gallery && await screen.locator('.grid img').count()) {
        await screen.waitForFunction(() => [...document.querySelectorAll('.grid img')].every((i) => i.complete && i.naturalWidth > 0), null, { timeout: 5000 });
        gallery = await screen.evaluate(() => ({ n: document.querySelectorAll('.grid img').length, sizes: [...document.querySelectorAll('.grid figcaption,.line')].map((e) => parseFloat(getComputedStyle(e).fontSize)) }));
        if (process.env.SHOT_DIR) await screen.screenshot({ path: `${process.env.SHOT_DIR}/wie-is-wie-screen.png` });
      }
      await phone.waitForTimeout(200);
    }
    assert.ok(prompted, 'geen prompt op de telefoon'); assert.ok(matched, 'geen koppelscherm op de telefoon');
    assert.ok(gallery && gallery.n >= 2, 'geen galerij op het grote scherm');
    assert.ok(gallery.sizes.every((s) => s >= 32), `kleine tekst: ${gallery.sizes}`);
    const d = await (await fetch(`${base}/api/dashboard`)).json();
    assert.equal(d.state, 'done'); assert.equal(d.valid, true);
    // Regressie (live run): punten met lange decimalen en eindscherm zonder uitslagregel.
    await screen.waitForTimeout(1500);
    const board = await screen.locator('#board p').allTextContents();
    assert.ok(board.every((x) => /— -?\d+(\.\d{1,2})?$/.test(x)), `stand onleesbaar: ${board}`);
    assert.ok(await screen.locator('text=Uitslag').isVisible(), 'uitslag niet zichtbaar op eindscherm');
  } finally { await browser.close(); await srv.close(); }
});
