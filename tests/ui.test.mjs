import test from 'node:test'
import assert from 'node:assert/strict'
import {createServer} from 'node:http'
import {readFile,mkdir} from 'node:fs/promises'
import {fileURLToPath} from 'node:url'
import {join} from 'node:path'
import {createRequire} from 'node:module'
import {campaign,daily} from '../app/src/main/assets/engine.mjs'

const require=createRequire(import.meta.url)
const {chromium}=require('playwright')
const assets=fileURLToPath(new URL('../app/src/main/assets/',import.meta.url))
const files={'/':'index.html','/index.html':'index.html','/style.css':'style.css','/app.mjs':'app.mjs','/engine.mjs':'engine.mjs','/save.mjs':'save.mjs','/content.mjs':'content.mjs','/hint-worker.mjs':'hint-worker.mjs','/economy.mjs':'economy.mjs'}
const server=createServer(async(req,res)=>{
  const name=files[req.url];if(!name){res.writeHead(404);res.end();return}
  res.setHeader('Content-Type',name.endsWith('.mjs')?'text/javascript':name.endsWith('.css')?'text/css':'text/html')
  res.end(await readFile(join(assets,name)))
})
await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve))
const browser=await chromium.launch({headless:true,executablePath:process.env.CHROMIUM_PATH||undefined,args:['--no-sandbox']})
const url=`http://127.0.0.1:${server.address().port}`
const click=async(page,act,value)=>{
  const selector=`[data-act="${act}"]${value===undefined?'':`[data-value="${value}"]`}`
  const modal=page.locator(`.modal ${selector}`)
  await (await modal.count()?modal.first():page.locator(selector).first()).click()
}
const solve=async(page,p)=>{for(const [a,b] of p.path){await click(page,'tube',a);await click(page,'tube',b)}}
const setup=async()=>{const context=await browser.newContext({viewport:{width:390,height:844},isMobile:true,deviceScaleFactor:2,hasTouch:true});const page=await context.newPage();const errors=[];page.on('pageerror',e=>errors.push(String(e)));page.on('console',m=>{if(m.type()==='error'&&!m.text().includes('404'))errors.push(m.text())});await page.goto(url);await page.locator('[data-act="continue"]').waitFor();return{page,context,errors}}

test('mobile journey: tutorial, resume, undo, hint, win, next level, records',async()=>{
  const{page,context,errors}=await setup()
  try{
    await click(page,'continue');assert.equal(await page.locator('.tube').count(),4)
    await click(page,'hint');assert.equal(await page.locator('.hint-from').count(),1)
    await click(page,'tube',0);await click(page,'tube',2)
    await click(page,'home');await page.reload();assert.match(await page.locator('[data-act="continue"]').innerText(),/Resume/)
    await click(page,'continue');assert.equal(await page.locator('.game-header strong').first().innerText(),'1')
    await click(page,'undo');assert.equal(await page.locator('.game-header strong').first().innerText(),'0')
    await solve(page,campaign(1));assert.match(await page.locator('.modal').innerText(),/Perfectly forged/)
    assert.match(await page.locator('.modal').innerText(),/50 sparks/)
    await click(page,'next');assert.equal(await page.locator('.game-screen h1').innerText(),'Level 2')
    await click(page,'home');await click(page,'stats');assert.match(await page.locator('.stat').first().innerText(),/1\/100/)
    assert.deepEqual(errors,[])
  }finally{await context.close()}
})
test('daily puzzle and reset; billing unavailable is honest; no overflow on small screen',async()=>{
  const{page,context,errors}=await setup()
  try{
    await page.setViewportSize({width:360,height:640});await click(page,'daily')
    assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false)
    await solve(page,daily(new Date().toISOString().slice(0,10)));assert.match(await page.locator('.modal').innerText(),/Perfectly forged/)
    await click(page,'next');assert.match(await page.locator('.card').filter({hasText:'Daily forge'}).innerText(),/complete/)
    await click(page,'workshop');assert(await page.locator('[data-act="buy"]').isDisabled());await click(page,'home');await click(page,'settings');await click(page,'setting','labels');await page.reload();await click(page,'settings');assert.equal(await page.locator('[data-value="labels"]').getAttribute('aria-checked'),'false')
    await click(page,'reset');await click(page,'confirm-reset');assert.match(await page.locator('.nav').innerText(),/0/)
    assert.deepEqual(errors,[])
  }finally{await context.close()}
})
test('separate campaign/daily resume and permanent crafting',async()=>{
  const{page,context,errors}=await setup()
  try{
    await click(page,'continue');await click(page,'tube',0);await click(page,'tube',2);await click(page,'home');await click(page,'daily');await click(page,'home');await page.reload();await click(page,'continue');assert.equal(await page.locator('.game-header strong').first().innerText(),'1');await click(page,'undo');await solve(page,campaign(1));await click(page,'workshop');await click(page,'craft','lantern');assert.match(await page.locator('[data-act="craft"][data-value="lantern"]').innerText(),/On display/);await page.reload();await click(page,'workshop');assert.match(await page.locator('[data-act="craft"][data-value="lantern"]').innerText(),/On display/);await click(page,'home');assert.match(await page.locator('[data-act="daily"]').innerText(),/Resume/);assert.deepEqual(errors,[])
  }finally{await context.close()}
})
test('corrupt local save does not crash; high-level portrait and landscape boards fit horizontally',async()=>{
  const{page,context,errors}=await setup()
  try{
    await page.evaluate(()=>localStorage.setItem('pocket-foundry-v1','{broken'));await page.reload();assert.match(await page.locator('h2').first().innerText(),/Level 1/)
    await page.evaluate(()=>localStorage.setItem('pocket-foundry-v1',JSON.stringify({version:1,level:100})));await page.reload();await click(page,'continue');assert.equal(await page.locator('.tube').count(),11)
    assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false)
    await page.setViewportSize({width:844,height:390});assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false)
    assert.deepEqual(errors,[])
  }finally{await context.close()}
})
test('capture real gameplay images for release review',async()=>{
  if(!process.env.ARTIFACT_DIR)return
  await mkdir(process.env.ARTIFACT_DIR,{recursive:true})
  const context=await browser.newContext({viewport:{width:390,height:844},deviceScaleFactor:1,reducedMotion:'reduce'})
  const page=await context.newPage()
  try{
    await page.goto(url);await page.locator('[data-act="continue"]').waitFor()
    await page.screenshot({path:join(process.env.ARTIFACT_DIR,'01-home.png'),animations:'disabled'})
    await click(page,'continue');await page.screenshot({path:join(process.env.ARTIFACT_DIR,'02-puzzle.png'),animations:'disabled'})
    await solve(page,campaign(1));await page.screenshot({path:join(process.env.ARTIFACT_DIR,'03-victory.png'),animations:'disabled'})
    await click(page,'home');await click(page,'workshop');await page.screenshot({path:join(process.env.ARTIFACT_DIR,'04-workshop.png'),animations:'disabled'})
  }finally{await context.close()}
})
test.after(async()=>{await browser.close();server.close()})
