// Site-wide checks for the portfolio.
//
//   npm install
//   npm test
//
// Starts its own local server over the repo, opens every page in Chromium and
// checks it. Needs a Chromium that Playwright can find; if there isn't one,
// run `npx playwright install chromium` once.
//
// This file is public along with the rest of the repo, so it checks for kinds
// of private detail (phone numbers, implementation notes) rather than listing
// the actual values.

const { chromium } = require('playwright');
const fs = require('fs');
const http = require('http');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const PAGES = fs.readdirSync(ROOT).filter(f => f.endsWith('.html')).sort();
// Requests to these may fail offline or behind a firewall without meaning
// anything: analytics and the laptop API widget.
const EXTERNAL_OK = /googletagmanager|google-analytics|ngrok/;

const TYPES = {
  '.html': 'text/html', '.css': 'text/css', '.js': 'text/javascript',
  '.png': 'image/png', '.jpg': 'image/jpeg', '.pdf': 'application/pdf',
  '.mp4': 'video/mp4', '.svg': 'image/svg+xml', '.json': 'application/json',
  '.pptx': 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
};

function serve() {
  const server = http.createServer((req, res) => {
    const rel = decodeURIComponent(req.url.split('?')[0]).replace(/^\/+/, '') || 'index.html';
    const file = path.join(ROOT, rel);
    if (!file.startsWith(ROOT) || !fs.existsSync(file) || fs.statSync(file).isDirectory()) {
      res.writeHead(404); return res.end();
    }
    res.writeHead(200, { 'Content-Type': TYPES[path.extname(file)] || 'application/octet-stream' });
    fs.createReadStream(file).pipe(res);
  });
  return new Promise(resolve => server.listen(0, '127.0.0.1', () => resolve(server)));
}

let pass = 0, fail = 0;
function check(name, ok, detail = '') {
  ok ? pass++ : fail++;
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? ' — ' + detail : ''}`);
}

(async () => {
  const server = await serve();
  const BASE = `http://127.0.0.1:${server.address().port}`;
  const browser = await chromium.launch();
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  const page = await ctx.newPage();

  // ---- every page: loads, no local failures, no errors -------------------
  const localLinks = new Set();
  for (const f of PAGES) {
    const errors = [];
    const onConsole = m => { if (m.type() === 'error' && !EXTERNAL_OK.test(m.text())) errors.push(m.text()); };
    const onPageErr = e => errors.push(String(e));
    // An embedded PDF is aborted by a browser with no PDF viewer; whether the
    // file exists is the link check's job, not this one's.
    const onFail = r => {
      if (!r.url().startsWith(BASE)) return;
      if (r.url().endsWith('.pdf') && r.failure()?.errorText === 'net::ERR_ABORTED') return;
      errors.push('failed: ' + r.url());
    };
    page.on('console', onConsole); page.on('pageerror', onPageErr); page.on('requestfailed', onFail);
    const res = await page.goto(`${BASE}/${f}`, { waitUntil: 'load' });
    await page.waitForTimeout(150);
    page.off('console', onConsole); page.off('pageerror', onPageErr); page.off('requestfailed', onFail);

    const info = await page.evaluate(() => ({
      text: document.body.innerText,
      links: [...document.querySelectorAll('a[href], img[src], video[src], link[href], script[src]')]
        .map(n => n.getAttribute('href') || n.getAttribute('src')),
    }));
    // Blocked third-party requests surface as network errors; local ones don't.
    const real = errors.filter(e => !/ERR_FAILED|ERR_TUNNEL|ERR_NAME|ERR_INTERNET/.test(e) || e.startsWith('failed: '));
    check(`${f} loads cleanly`, res.status() === 200 && real.length === 0, real.slice(0, 3).join(' | '));

    for (const l of info.links) {
      if (!l || /^(https?:|mailto:|#|data:)/.test(l)) continue;
      localLinks.add(l.split('#')[0]);
    }
    check(`${f} has no placeholder text`, !/placeholder/i.test(info.text));
    check(`${f} shows no phone number`, !/(\+44\s?|\b0)7\d{3}\s?\d{3}\s?\d{3}/.test(info.text));
  }

  // ---- every local link and asset resolves -------------------------------
  const broken = [];
  for (const l of localLinks) {
    const r = await page.request.get(`${BASE}/${l.replace(/^\.\//, '')}`);
    if (r.status() !== 200) broken.push(`${l} (${r.status()})`);
  }
  check(`all ${localLinks.size} local links and assets resolve`, broken.length === 0, broken.join(', '));

  // ---- back links: referrer wins, deep link falls back -------------------
  await page.goto(`${BASE}/degree-bsc.html`);
  await page.click('a[href="project-pacman-ai.html"]');
  await page.waitForSelector('.topbar__label');
  check('back link names the page you came from', (await page.textContent('.topbar__label')).trim() === 'BSc');
  const fresh = await browser.newPage();
  await fresh.goto(`${BASE}/project-clucker.html`);
  await fresh.waitForSelector('.topbar__back');
  check('deep link falls back to the declared parent',
    (await fresh.getAttribute('.topbar__back', 'href')) === 'degree-bsc.html');
  await fresh.close();
  await page.goto(`${BASE}/project-clucker.html`);
  await page.click('main a[href="project-games-collection.html"]');
  await page.waitForSelector('.topbar__label');
  check('a page reachable from two places names the right one',
    (await page.textContent('.topbar__label')).trim() === 'Clucker');

  // ---- certifications ----------------------------------------------------
  await page.goto(`${BASE}/certifications.html`);
  const kinds = await page.evaluate(() => [...document.querySelectorAll('.timeline-item')]
    .map(li => li.querySelector('.tag')?.textContent.trim()));
  const firstOther = kinds.findIndex(k => k !== 'Certification');
  check('every certification entry leads with a kind tag', kinds.every(Boolean), kinds.join(', '));
  check('real certifications are listed before everything else',
    kinds[0] === 'Certification' && (firstOther === -1 || kinds.slice(firstOther).every(k => k !== 'Certification')),
    kinds.join(', '));

  // An entry button may only be visible once it has a real link.
  const links = await page.evaluate(() => [...document.querySelectorAll('.entry-link')]
    .map(a => ({ href: a.getAttribute('href'), shown: a.offsetParent !== null, newTab: a.target === '_blank' })));
  check('entry buttons only show once they have a link',
    links.length > 0 && links.every(c => c.shown === !!c.href && c.newTab), JSON.stringify(links));

  // ---- Journey Together --------------------------------------------------
  await page.goto(`${BASE}/project-journey-together.html`);
  const jt = await page.evaluate(() => {
    const t = document.body.innerText;
    return {
      stores: !!document.querySelector('a[href*="apps.apple.com"]') && !!document.querySelector('a[href*="play.google.com"]'),
      noRepoLink: !document.querySelector('main a[href*="github.com"]'),
      authorship: /why not make it myself/i.test(t),
    };
  });
  check('Journey Together keeps its guarantees', Object.values(jt).every(Boolean), JSON.stringify(jt));

  // ---- home cards: each number matches what the section actually holds ---
  await page.goto(`${BASE}/index.html`);
  const cards = await page.evaluate(() => [...document.querySelectorAll('a.card')]
    .map(a => ({ href: a.getAttribute('href'), meta: a.querySelector('.card__meta')?.textContent.trim() })));
  const wrong = [];
  for (const c of cards) {
    const m = /^(\d+) /.exec(c.meta || '');
    if (!m) continue;   // "PDF", or a section still in progress
    await page.goto(`${BASE}/${c.href}`);
    const n = await page.evaluate(() =>
      document.querySelectorAll('main ul.timeline > li, main ul.card-grid > li, main ul.skill-list > li').length);
    if (n !== Number(m[1])) wrong.push(`${c.href}: card says ${m[1]}, page has ${n}`);
  }
  check('home card counts match their sections', wrong.length === 0, wrong.join(' | '));

  // ---- the no-JS menu matches the main page list -------------------------
  // site.js builds the menu for everyone with JavaScript; each page also
  // carries a plain copy for those without. Every copy should list the same
  // pages, in the same order, leaving out only the page it sits on.
  const siteJs = fs.readFileSync(path.join(ROOT, 'assets/js/site.js'), 'utf8');
  const listed = [...siteJs.match(/var PAGES = \[([\s\S]*?)\];/)[1]
    .matchAll(/href: "([^"]+)", label: "([^"]+)"/g)].map(m => `${m[1]}|${m[2]}`);
  const offMenu = [];
  for (const f of PAGES) {
    const html = fs.readFileSync(path.join(ROOT, f), 'utf8');
    const block = (html.match(/<noscript>[\s\S]*?<\/noscript>/) || [''])[0];
    const got = [...block.matchAll(/<a href="([^"]+)">([^<]+)<\/a>/g)]
      .map(m => `${m[1]}|${m[2].replace(/&amp;/g, '&')}`);
    const want = listed.filter(e => !e.startsWith(`${f}|`));
    if (got.join() !== want.join()) offMenu.push(f);
  }
  check('every no-JS menu matches the main page list', offMenu.length === 0, offMenu.join(', '));

  // ---- every page has the tab icon ---------------------------------------
  // Whether the files exist is the link check's job; this one catches a new
  // page that was copied from somewhere without the icon lines.
  const ICONS = ['favicon.svg', 'favicon-32.png', 'apple-touch-icon.png'];
  const noIcon = PAGES.filter(f => {
    const html = fs.readFileSync(path.join(ROOT, f), 'utf8');
    return !ICONS.every(i => html.includes(`href="assets/img/${i}"`));
  });
  check('every page has the tab icon', noIcon.length === 0, noIcon.join(', '));

  // ---- phone width: nothing scrolls sideways -----------------------------
  const mobile = await browser.newPage({ viewport: { width: 375, height: 812 } });
  const wide = [];
  for (const f of PAGES) {
    await mobile.goto(`${BASE}/${f}`);
    const over = await mobile.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
    if (over > 1) wide.push(`${f} (+${over}px)`);
  }
  check('no page scrolls sideways at 375px', wide.length === 0, wide.join(', '));
  await mobile.close();

  // ---- without JavaScript, content is still visible ----------------------
  const nojs = await browser.newContext({ javaScriptEnabled: false });
  const np = await nojs.newPage();
  await np.goto(`${BASE}/certifications.html`);
  const hidden = await np.evaluate(() => [...document.querySelectorAll('[data-reveal]')]
    .filter(n => parseFloat(getComputedStyle(n).opacity) < 1).length);
  check('without JavaScript nothing is stuck invisible', hidden === 0, `${hidden} hidden`);
  await nojs.close();

  await browser.close();
  server.close();
  console.log(`\n${pass}/${pass + fail} checks passed`);
  process.exit(fail ? 1 : 0);
})();
