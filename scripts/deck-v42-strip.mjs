import { chromium } from '@playwright/test';
const BASE='http://localhost:5173';
const OUT='/private/tmp/claude-501/-Users-sth22-Genealogy-project-041726/8a6099cb-7e43-4460-aa0f-04d34d24f5ac/scratchpad';
const CASES=[{tag:'CONVOY-L',start:'thomas-hooker-1586',target:'john-haynes-1594',shots:[520,720,920]},
             {tag:'CONVOY-V',start:'aaron-burr-jr-1756',target:'sarah-edwards-1710',shots:[420,600,780]}];
const b=await chromium.launch();
const page=await (await b.newContext({viewport:{width:1680,height:1000},deviceScaleFactor:1})).newPage();
for(const c of CASES){
  await page.goto(`${BASE}/person/${c.start}`,{waitUntil:'networkidle'}); await page.waitForTimeout(350);
  await page.evaluate(tg=>{const a=[...document.querySelectorAll('a[data-cc]')].find(x=>(x.getAttribute('href')||'').endsWith('/person/'+tg));a?.scrollIntoView({block:'center'});},c.target);
  await page.waitForTimeout(150);
  const geo=await page.evaluate(tg=>{const a=[...document.querySelectorAll('a[data-cc]')].find(x=>(x.getAttribute('href')||'').endsWith('/person/'+tg));const r=a.getBoundingClientRect();return{x:r.left+r.width/2,y:r.top+r.height/2};},c.target);
  const start=Date.now(); await page.mouse.click(geo.x,geo.y);
  for(let i=0;i<c.shots.length;i++){const w=c.shots[i]-(Date.now()-start);if(w>0)await page.waitForTimeout(w);await page.screenshot({path:`${OUT}/v42-${c.tag}${i+1}.png`,animations:'allow'});}
  await page.waitForTimeout(700); console.log(`[${c.tag}] nav=${await page.evaluate(()=>location.pathname)}`);
}
await b.close();
