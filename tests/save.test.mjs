import test from 'node:test'
import assert from 'node:assert/strict'
import {campaign,daily,orders,endless,move,won,validBoard,ORDER_COUNT} from '../app/src/main/assets/engine.mjs'
import {defaults,KEY,LEGACY,BACKUP,load,migrate,persist,reset} from '../app/src/main/assets/save.mjs'
import {claimQuest,recordVictory,weeklyProgress} from '../app/src/main/assets/economy.mjs'
const storage=()=>{const m=new Map();return {getItem:k=>m.get(k)||null,setItem:(k,v)=>m.set(k,v),removeItem:k=>m.delete(k)}}
const firstMove=(mode,p,level,date)=>({mode,level,date,board:move(p.board,p.cap,...p.path[0]).board,history:[p.path[0]]})
test('legacy migration preserves campaign records, money, settings and an unfinished board',()=>{
  const s=storage();s.setItem(LEGACY,JSON.stringify({version:1,level:2,sparks:135,records:{1:{stars:3,moves:3}},owned:['classic','moss'],theme:'moss',settings:{audio:false},active:firstMove('campaign',campaign(2),2,'2026-11-24')}));const d=load(s).data
  assert.equal(d.level,2);assert.equal(d.sparks,135);assert.equal(d.metal,2);assert.equal(d.theme,'moss');assert.equal(d.settings.audio,false);assert.equal(d.activeByMode.campaign.history.length,1)
})
test('two independent saves survive a day change and invalid main revision restores backup',()=>{
  const s=storage(),d=defaults();d.activeByMode.campaign=firstMove('campaign',campaign(1),1,'2026-11-24');d.activeByMode.daily=firstMove('daily',daily('2026-11-23'),1,'2026-11-23');d.dailyTotal=1000;d.sparks=50;persist(s,d);d.sparks=70;persist(s,d);s.setItem(KEY,'invalid');const result=load(s);assert(result.recovered);assert.equal(result.data.sparks,50);assert.equal(result.data.dailyTotal,1000);assert.equal(result.data.activeByMode.daily.date,'2026-11-23');assert.equal(result.data.activeByMode.campaign.history.length,1);reset(s);assert.equal(s.getItem(BACKUP),null)
})
test('semantic corruption of one active board does not delete other progress',()=>{
  const d=defaults();d.sparks=99;d.activeByMode.campaign={mode:'campaign',level:1,history:[[55,3]],board:campaign(1).board};d.activeByMode.daily=firstMove('daily',daily('2026-11-24'),1,'2026-11-24');const clean=migrate(d);assert.equal(clean.sparks,99);assert.equal(clean.activeByMode.campaign,undefined);assert(clean.activeByMode.daily)
})
test('special orders and mastery variants are constructively solvable',()=>{
  for(const p of [...Array.from({length:ORDER_COUNT},(_,i)=>orders(i+1)),...Array.from({length:80},(_,i)=>endless(i+1))]){assert(validBoard(p.board,p.cap,p.colors));let b=p.board;for(const pair of p.path){const m=move(b,p.cap,...pair);assert(m);b=m.board}assert(won(b,p.cap))}
})
test('weekly goal rewards are idempotent and progress resets without penalties',()=>{
  const d=defaults();for(const mode of ['campaign','daily','orders'])recordVictory(d,'2026-11-24',mode);assert(claimQuest(d,'2026-11-24','puzzles'));assert(!claimQuest(d,'2026-11-24','puzzles'));assert.equal(d.sparks,60);assert.equal(d.metal,2);assert.equal(weeklyProgress(d,'2026-12-01').puzzles,0);assert.equal(d.sparks,60);assert.deepEqual(migrate(d).weekly,d.weekly)
})
