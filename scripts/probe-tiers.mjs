/** The three modals at three viewports. 2.75's discipline says every phase verifies at three; 4 and 6 did not. */
import { chromium } from 'playwright';
const b = await chromium.launch(); const pg = await b.newPage();
const VPS = [[1440,900,'desktop'],[1024,768,'tablet-land'],[768,1024,'tablet-port'],[390,844,'phone']];
const out = [];
for (const [w,h,name] of VPS) {
  await pg.setViewportSize({ width: w, height: h });
  await pg.goto('http://localhost:5173/person/aaron-burr-jr-1756', { waitUntil: 'networkidle' });
  await pg.waitForTimeout(1400);
  const r = { vp: `${name} ${w}x${h}` };
  const overflow = () => pg.evaluate(() => ({
    bodyScrollX: document.documentElement.scrollWidth - document.documentElement.clientWidth,
    offscreen: [...document.querySelectorAll('.person-box, .connect-btn, .pick')]
      .filter(e => { const b = e.getBoundingClientRect(); return b.width && (b.right > innerWidth + 1 || b.left < -1 || b.bottom > innerHeight + 1 || b.top < -1); }).length
  }));
  r.page = await overflow();
  // connect buttons reachable?
  r.btns = await pg.locator('.connect-btn').count();
  const cb = pg.locator('.connect-anyone');
  if (await cb.count()) {
    const box = await cb.boundingBox();
    r.btnBox = box ? `${Math.round(box.width)}x${Math.round(box.height)} @y${Math.round(box.y)}` : 'none';
    try {
      await cb.click({ timeout: 4000 }); await pg.waitForTimeout(900);
      r.pickerBox = await pg.locator('.picker-box').boundingBox().then(x => x ? `${Math.round(x.width)}w @y${Math.round(x.y)}` : 'none').catch(()=> 'none');
      await pg.locator('.picker-box input').first().fill('sarah pierpont'); await pg.waitForTimeout(700);
      await pg.keyboard.press('Enter'); await pg.waitForTimeout(1900);
      r.v = await overflow();
      r.vRungs = await pg.locator('.ladder .person-box').count();
      r.headWraps = await pg.locator('.ladder-head').first().boundingBox().then(x => x ? Math.round(x.height) : -1).catch(()=>-1);
    } catch (e) { r.err = String(e).slice(0,60); }
  }
  out.push(r);
}
console.log(JSON.stringify(out, null, 1));
await b.close();
