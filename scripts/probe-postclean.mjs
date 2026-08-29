/**
 * POST-CLEANUP REGRESSION. The dead path-switch machinery came out of ConnectAnyoneModal; this asserts
 * the three modals still open, animate, and close — and that Paths to Thomas, which shares nothing with
 * the cleanup but shares the page, is untouched.
 */
import { chromium } from 'playwright';
const b = await chromium.launch();
const pg = await b.newPage();
await pg.setViewportSize({ width: 1440, height: 900 });
const errs = [];
pg.on('pageerror', (e) => errs.push('PAGEERROR ' + e.message));
pg.on('console', (m) => m.type() === 'error' && errs.push('CONSOLE ' + m.text()));

const sleep = (ms) => pg.waitForTimeout(ms);
const n = (sel) => pg.locator(sel).count();

await pg.goto('http://localhost:5173/person/aaron-burr-jr-1756', { waitUntil: 'networkidle' });
await sleep(1200);

// --- 1. PATHS TO THOMAS, the shipped feature, must still work end to end
await pg.locator('.connect-thomas').click();
await sleep(1400);
const thomasRungs = await n('.ladder .rung');
const tabs = await n('.ladder-tab');
if (tabs > 1) { await pg.locator('.ladder-tab').nth(1).click(); await sleep(1400); }
const afterSwitch = await n('.ladder .rung');
await pg.keyboard.press('Escape');
await sleep(1000);
const thomasGone = (await n('.ladder')) === 0;

// --- 2. CONNECT TO ANYONE: picker -> pick -> V -> close
await sleep(400);
await pg.locator('.connect-anyone').click();
await sleep(900);
const pickerOpen = (await n('.veil')) > 0 && (await n('.picker-box input')) > 0;
await pg.locator('.picker-box input').first().fill('sarah pierpont');
await sleep(700);
const rows = await n('.pick');
await pg.keyboard.press('Enter');
await sleep(1800);
const vRungs = await n('.ladder .person-box');
const sentence = (await pg.locator('.ladder-head').first().innerText().catch(() => '')).trim();
const bar = await pg.locator('.v-apex, .v-apex-single').count();
  const barH = await pg.locator('.v-apex, .v-apex-single').first().evaluate(e => +e.getBoundingClientRect().height.toFixed(1)).catch(() => -1);
const stuck = await pg.evaluate(() =>
  [...document.querySelectorAll('.ladder .person-box')].filter((e) => e.getBoundingClientRect().height < 30).length
);
await pg.locator('.ladder .ladder-x').first().click();
await sleep(2600);
const vGone = (await n('.ladder')) === 0 && (await n('.veil')) === 0;

// --- 3. REOPEN: everything resets, no ghost from the previous session
await pg.locator('.connect-anyone').click();
await sleep(900);
const reopenClean = (await n('.ladder')) === 0;
const boxText = await pg.locator('.picker-box input').first().inputValue();
await pg.keyboard.press('Escape');
await sleep(900);

// --- 4. MAIN SEARCH still types
await sleep(700);
await pg.locator('.search-trigger, [data-search-trigger], header button').first().click();
await sleep(900);
let typed = '(no box)';
const box = pg.locator('input[type="search"], .veil input, input').first();
if (await box.count()) {
  await box.type('talcott', { delay: 70 });
  await sleep(600);
  typed = await box.inputValue();
}

console.log(JSON.stringify({
  thomas: { rungs: thomasRungs, tabs, afterSwitch, closed: thomasGone },
  anyone: { pickerOpen, rows, vRungs, bar, barH, sentence: sentence.slice(0, 90), squashed: stuck, closed: vGone },
  reopen: { noGhostRungs: reopenClean, boxEmpty: boxText === '' },
  search: { typed },
  errors: errs.slice(0, 6)
}, null, 2));
await b.close();
