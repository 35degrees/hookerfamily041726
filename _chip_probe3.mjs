import { chromium } from 'playwright';
const b = await chromium.launch(); const pg = await b.newPage();
for (const url of ['francis-gillette-1807','william-minot-1817','edward-gillette-1840']) for (const [w,h] of [[1440,900],[1280,800]]) {
  await pg.setViewportSize({width:w,height:h});
  await pg.goto('http://localhost:5173/person/'+url, {waitUntil:'networkidle'}); await pg.waitForTimeout(1200);
  const r = await pg.evaluate(() => [...document.querySelectorAll('[data-chip-name]')].map(e=>{const s=e.querySelector('[data-fit]');const rg=document.createRange();rg.selectNodeContents(s);
    const tw=rg.getBoundingClientRect().width, nw=e.getBoundingClientRect().width; return `${s.textContent.trim().slice(0,24)}@${parseFloat(getComputedStyle(e).fontSize).toFixed(1)}${tw>nw+0.01?' CUT':''}`}));
  console.log(url,w,r.join(' | '));
}
await b.close();
