import {LEVEL_COUNT,ORDER_COUNT,COLORS,move,amount,won,complete,stars,hint,copy} from './engine.mjs'
import {THEMES,RECIPES,treasureArt} from './content.mjs'
import {defaults,load,persist,reset,puzzleFor,today} from './save.mjs'
import {QUESTS,weeklyProgress,recordVictory,claimQuest} from './economy.mjs'
import {createSound} from './sound.mjs'

const root = document.querySelector('#app')
const SHAPES = ['◆','●','▲','■','✦','♥','⬟','✚','◈','☰']
const loaded=load(localStorage)
let data=loaded.data, screen='home', game=null, selected=-1, guidance=null, message='', messageKind='', modal=null
let worker=null,hintTimer=null,hintCache=new Map(),animation=null,modalFocus=null
const currentDay=()=>[today(),data.lastDate].sort().pop()
const active=mode=>data.activeByMode[mode]
let billing={available:false,owned:false,price:'',message:''}, toastTimer=null
const audio=createSound()
function save(){try{persist(localStorage,data)}catch{showToast('Progress could not be saved on this device.')}}
function showToast(text){const t=document.querySelector('#toast');t.textContent=text;t.classList.add('show');clearTimeout(toastTimer);toastTimer=setTimeout(()=>t.classList.remove('show'),2600)}
function sound(kind='tap'){
  if(data.settings.haptic){try{if(window.FoundryNative)window.FoundryNative.haptic(kind==='win'?'strong':'light');else if(navigator.vibrate)navigator.vibrate(kind==='win'?[22,45,32]:10)}catch{}}
  if(data.settings.audio)audio.play(kind)
}
function theme(){return THEMES.find(t=>t.id===data.theme)||THEMES[0]}
function has(t){return t.premium?billing.owned:data.owned.includes(t.id)}
function applyTheme(){document.body.className=`theme-${has(theme())?theme().id:'classic'} ${data.settings.largeSymbols?'large-symbols':''} ${data.settings.reducedMotion?'reduced-motion':''} ${billing.owned?'plus-owned':''}`}
function progress(value,total){return `<div class="progress" role="progressbar" aria-valuenow="${value}" aria-valuemin="0" aria-valuemax="${total}" data-progress="${Math.round(100*value/Math.max(1,total))}"><span></span></div>`}
function priceText(){return billing.available&&billing.price?billing.price:'Unavailable'}
function escape(s){return String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))}
function header(title,label='WORKSHOP',back='home'){return `<div class="bar"><button class="icon-btn" data-act="${back}" aria-label="Go back">‹</button><div class="title"><div class="eyebrow">${label}</div><h1>${title}</h1></div><span class="pill">✦ ${data.sparks}</span></div>`}
const art=`<svg class="forge-art" viewBox="0 0 180 220" aria-hidden="true"><defs><linearGradient id="metal" x2="1" y2="1"><stop stop-color="#b7c2ca"/><stop offset=".5" stop-color="#5a6877"/><stop offset="1" stop-color="#263441"/></linearGradient><linearGradient id="fire" x2="0" y2="1"><stop stop-color="#ffefb0"/><stop offset=".55" stop-color="#ffad51"/><stop offset="1" stop-color="#f26642"/></linearGradient></defs><path class="smoke" d="M100 73c-30-19 10-38-9-61 35 16 23 42 39 53Z"/><g fill="#f6c77c"><circle cx="44" cy="45" r="3"/><circle cx="145" cy="22" r="3"/><circle cx="129" cy="58" r="2"/><circle cx="65" cy="20" r="2"/></g><path fill="#8d563d" d="M28 143V83l20-47h84l20 47v60Z"/><path fill="#ad7956" d="M41 144V87l17-39h64l17 39v57Z"/><path fill="#2c2830" d="M59 143v-43q0-29 31-29t31 29v43Z"/><path fill="url(#fire)" d="M70 139q-12-24 9-42-2 15 11 17 17-25 7-37 35 33 14 62Z"/><path fill="#fff0a6" d="M87 139q-5-15 5-26 14 10 7 26Z"/><rect x="20" y="138" width="140" height="17" rx="4" fill="url(#metal)"/><path fill="url(#metal)" d="M30 166h125l-19 15-23 6v11h17v10H53v-10h18v-14l-26-5Z"/><path fill="#e5b56c" d="m66 167 16-15h36l10 15Z"/><path fill="#ffeda7" d="m67 167 16-13h34l8 13Z"/></svg>`
function home(){
  const count=Object.keys(data.records).length,totalStars=Object.values(data.records).reduce((a,b)=>a+b.stars,0), done=data.daily[currentDay()],a=active('campaign'),d=active('daily')
  return `<div class="bar"><div><div class="eyebrow">Pocket Foundry</div><p class="muted">Make something beautiful.</p></div><button class="icon-btn" data-act="settings" aria-label="Settings">⚙</button></div>
  <section class="hero">${art}<div class="hero-copy"><div class="eyebrow">A cozy color puzzle</div><h1>Sort.<br>Forge.<br>Shine.</h1><p>A little calm in every glowing ingot.</p></div></section>
  <section class="card stack"><div class="bar"><div><div class="eyebrow">The campaign</div><h2>${count===LEVEL_COUNT&&!a?'Master Foundry':`Level ${a?a.level:data.level}`}</h2></div><span class="pill">★ ${totalStars}/${LEVEL_COUNT*3}</span></div>${progress(count,LEVEL_COUNT)}<button class="primary wide" data-act="continue">${a?'Resume puzzle':count===LEVEL_COUNT?'Replay final level':'Play campaign'} <span aria-hidden="true">▶</span></button><button class="secondary wide" data-act="levels">All 100 levels</button></section>
  <section class="card row"><div class="grow stack"><div class="tag">Daily forge · UTC</div><h3>${done?'Daily challenge complete':'A fresh puzzle every day'}</h3><p>${d?`Unfinished puzzle from ${d.date}.`:done?`${done.moves} moves · ${'★'.repeat(done.stars)}`:'One shared challenge. No timer, no pressure.'}</p></div><button class="secondary" data-act="daily">${d?'Resume':done?'Replay':'Play'}</button></section>
  <section class="card stack"><div class="bar"><div><div class="tag">Your living forge</div><h2>${data.crafted.length}/${RECIPES.length} treasures</h2></div><span class="pill">▰ ${data.metal} metal</span></div><p>Turn your victories into crafted objects and display them in your workshop.</p><div class="row"><button class="secondary grow" data-act="workshop">Craft & decorate</button><button class="secondary grow" data-act="orders-menu">Special orders</button></div><button class="secondary wide" data-act="endless">${active('endless')?'Resume mastery':'Endless mastery'} · ${data.endlessLevel}</button><button class="secondary wide" data-act="quests">Weekly commissions</button></section>
  <nav class="nav" aria-label="Main menu"><button data-act="workshop"><span class="symbol">✦</span><strong>${data.sparks}</strong> Workshop</button><button data-act="stats"><span class="symbol">★</span><strong>${totalStars}</strong> Records</button><button data-act="settings"><span class="symbol">⚙</span><strong>Options</strong> Settings</button></nav>`
}
function levels(){let html=header('All levels','The campaign');for(let block=0;block<10;block++){const start=block*10+1,end=start+9;html+=`<div class="section-label"><h3>${['Apprentice','Ember Lane','Copper Works','Quartz Hall','Jade Gardens','Sapphire Works','Moonstone','Royal Vault','Frost Forge','Master Foundry'][block]}</h3><span class="muted">${start}–${end}</span></div><div class="level-list">`;for(let n=start;n<=end;n++){const rec=data.records[n],locked=n>data.level;html+=`<button class="level ${locked?'locked':n===data.level?'current':''}" data-act="level" data-value="${n}" ${locked?'disabled':''} aria-label="Level ${n}${locked?', locked':rec?`, ${rec.stars} stars`:''}">${n}<small>${locked?'◆':rec?'★'.repeat(rec.stars)+'☆'.repeat(3-rec.stars):'☆☆☆'}</small></button>`}html+='</div>'}return html}
function openGame(mode,level=data.level,date=currentDay(),resume=true){
  cancelHint();const p=puzzleFor(mode,level,date),a=active(mode)
  const same=resume&&a&&(mode==='daily'?a.date===date:a.level===level)
  game={...p,initial:copy(p.board),board:same?copy(a.board):copy(p.board),history:same?[...a.history]:[],mode,level,date}
  selected=-1;guidance=mode==='campaign'&&level===1&&!same?p.path[0]:null;message=guidance?'Start by tapping glowing mold 1, then mold 3.':'Tap a stack, then tap a matching stack or an empty mold.';messageKind='';modal=null;screen='game';storeGame();render()
}
function storeGame(){if(game&&!won(game.board,game.cap))data.activeByMode[game.mode]={mode:game.mode,level:game.level,date:game.date,board:copy(game.board),history:game.history.map(v=>[...v])};else if(game)delete data.activeByMode[game.mode];data.lastDate=currentDay();save()}
function gameHTML(){
  const done=game.board.filter(t=>complete(t,game.cap)).length,n=game.history.length, count=game.board.length
  let html=`<div class="bar"><button class="icon-btn" data-act="home" aria-label="Back to home">‹</button><div class="title"><div class="eyebrow">${({daily:'Daily forge',campaign:'Campaign',orders:game.variant,endless:'Endless mastery'})[game.mode]}</div><h1>${game.mode==='daily'?'Daily puzzle':game.mode==='orders'?`Order ${game.level}`:`Level ${game.level}`}</h1></div><span class="pill">✦ ${data.sparks}</span></div><div class="game-header"><div><strong>${n}</strong><small>Moves</small></div><div><strong>${game.par}</strong><small>3-star target</small></div><div><strong>${done}/${game.colors}</strong><small>Forged</small></div></div><div class="game-progress">${progress(done,game.colors)}</div><div class="board-wrap"><div class="board" data-cols="${count<=4?count:count<=6?3:count<=9?4:Math.ceil(count/3)}" data-land-cols="${Math.ceil(count/2)}" data-slots="${game.cap}" aria-label="Color sorting puzzle">`
  game.board.forEach((tube,i)=>{
    const finished=complete(tube,game.cap),legal=selected>=0&&amount(game.board,game.cap,selected,i)>0
    html+=`<button class="tube ${selected===i?'selected':''} ${legal?'legal':''} ${finished?'complete':''} ${guidance?.[0]===i?'hint-from':''} ${guidance?.[1]===i?'hint-to':''}" data-act="tube" data-value="${i}" aria-label="Mold ${i+1}, ${tube.length?tube.map(c=>COLORS[c]).join(', '):'empty'}${finished?', forged':''}" aria-pressed="${selected===i}">${finished?'<span class="seal" aria-hidden="true">✓</span>':''}`
    for(let j=game.cap-1;j>=0;j--){const c=tube[j];html+=`<span class="slot">${c!==undefined?`<span class="ore" data-color="${c}">${data.settings.labels?SHAPES[c]:''}</span>`:''}</span>`}html+=`<span class="mold-number" aria-hidden="true">${i+1}</span></button>`
  })
  html+=`</div></div><div class="message ${messageKind}" role="status">${escape(message)}</div><div class="controls"><button class="control" data-act="undo" ${!n?'disabled':''}><strong>↶</strong>Undo</button><button class="control" data-act="hint"><strong>✦</strong>Hint</button><button class="control" data-act="restart"><strong>⟳</strong>Restart</button></div>`
  if(game.level===1&&game.mode==='campaign'&&n===0)html+='<div class="banner">Group four matching ingots to forge a mold. Completed molds are locked.</div>'
  return html
}
function selectTube(i){
  if(!game||modal||won(game.board,game.cap))return
  cancelHint()
  const tube=game.board[i]
  if(selected===i){selected=-1;message='Choose a mold to sort.';messageKind='';render();return}
  if(selected<0){if(!tube.length||complete(tube,game.cap)){message=complete(tube,game.cap)?'This mold is already forged!':'Choose a mold containing ingots.';messageKind='alert';sound('error')}else{selected=i;guidance=null;message='Select a highlighted mold for matching ingots.';messageKind='';sound()}render();return}
  const result=move(game.board,game.cap,selected,i)
  if(!result){if(tube.length&&!complete(tube,game.cap)){selected=i;message='Choose a matching or empty mold.';messageKind=''}else{message='Those ingots do not fit. Try another mold.';messageKind='alert';sound('error')}render();return}
  if(game.history.length>=500){message='Move limit reached. Undo or restart this puzzle.';messageKind='alert';render();return}
  const from=selected,source=root.querySelector(`[data-act="tube"][data-value="${from}"] .ore`),sourceRect=source?.getBoundingClientRect(),color=game.board[from][game.board[from].length-1];game.history.push([from,i]);game.board=result.board;selected=-1;guidance=null;animation={to:i,from,sourceRect,color,forged:complete(game.board[i],game.cap)}
  const finished=complete(game.board[i],game.cap)
  message=finished?'Beautiful! One mold forged.':'Nice move. Keep sorting.';messageKind=finished?'good':'';sound(finished?'forge':'tap')
  if(won(game.board,game.cap)){finish();return}
  if(!game.board.some((_,a)=>game.board.some((_,b)=>amount(game.board,game.cap,a,b)))){message='No moves left. Use Undo or Restart to try again.';messageKind='alert'}
  // Cap impractically long histories to keep saves bounded; restart remains available.
  if(game.mode==='campaign'&&game.level===1&&game.history.length<game.path.length){const [a,b]=game.path[game.history.length];if(amount(game.board,game.cap,a,b)){guidance=[a,b];message=`Now tap mold ${a+1}, then mold ${b+1}.`}}
  storeGame();render()
}
function finish(){
  const moves=game.history.length,rank=stars(moves,game.par),records=({campaign:data.records,daily:data.daily,orders:data.orderRecords,endless:data.endlessRecords})[game.mode],k=game.mode==='daily'?game.date:game.level,previous=records[k]
  const reward=previous?Math.max(0,rank-previous.stars)*10:(game.mode==='daily'?35:20)+rank*10
  const metal=previous?0:game.mode==='orders'?5:game.mode==='daily'?3:2
  data.sparks+=reward;data.metal+=metal;records[k]={stars:Math.max(rank,previous?.stars||0),moves:Math.min(moves,previous?.moves||moves)}
  if(game.mode==='daily'&&!previous)data.dailyTotal++
  if(!previous)recordVictory(data,currentDay(),game.mode)
  if(game.mode==='endless')data.endlessLevel=Math.min(100000,Math.max(data.endlessLevel,game.level+1))
  if(game.mode==='campaign')data.level=Math.min(LEVEL_COUNT,Math.max(data.level,game.level+1))
  data.lastDate=currentDay();delete data.activeByMode[game.mode];save();sound('win');modal={type:'win',rank,reward,moves,metal};render()
}
function undo(){if(!game?.history.length)return;cancelHint();game.history.pop();game.board=copy(game.initial);for(const pair of game.history)game.board=move(game.board,game.cap,...pair).board;selected=-1;guidance=null;message='Last move undone.';messageKind='';sound();storeGame();render()}
function cancelHint(){if(worker){worker.terminate();worker=null}clearTimeout(hintTimer);hintTimer=null}
function showHint(){
  if(!game)return
  cancelHint()
  selected=-1
  let known=copy(game.initial), match=null
  if(JSON.stringify(known)===JSON.stringify(game.board))match=game.path[0]
  for(let i=0;!match&&i<game.path.length;i++){known=move(known,game.cap,...game.path[i]).board;if(JSON.stringify(known)===JSON.stringify(game.board))match=game.path[i+1]}
  const key=JSON.stringify([game.cap,game.board]), finishHint=result=>{cancelHint();guidance=result;if(guidance){if(hintCache.size>100)hintCache.clear();hintCache.set(key,result);message=`Try mold ${guidance[0]+1}, then mold ${guidance[1]+1}.`;messageKind='good'}else{message='No hint found within the search budget. Try undo or restart.';messageKind='alert'}render()}
  if(match||hintCache.has(key)){finishHint(match||hintCache.get(key));return}
  message='Looking for a move…';messageKind='';render()
  try{worker=new Worker('./hint-worker.mjs',{type:'module'});worker.onmessage=e=>finishHint(e.data.move);worker.onerror=()=>finishHint(null);worker.postMessage({board:game.board,cap:game.cap});hintTimer=setTimeout(()=>finishHint(null),750)}catch{finishHint(hint(game.board,game.cap,5000))}
}
function workshop(){
  const shelf=RECIPES.map(r=>`<div class="shelf-item ${data.crafted.includes(r.id)?'':'silhouette'}" title="${r.name}">${treasureArt(r.id)}</div>`).join('')
  return header('Workshop','Craft & decorate')+`<section class="workshop-scene"><div class="scene-top"><span class="tag">Your forge</span><span class="pill">▰ ${data.metal} metal</span></div><div class="scene-fire">${art}</div><div class="treasure-shelf">${shelf}</div><div class="scene-caption">${data.crafted.length} of ${RECIPES.length} treasures crafted</div></section><section class="card stack"><h2>Crafting recipes</h2><p>Win puzzles for metal and sparks. Create permanent treasures that change your workshop.</p><div class="recipes">${RECIPES.map(r=>{const made=data.crafted.includes(r.id),can=data.metal>=r.metal&&data.sparks>=r.sparks;return `<button class="recipe ${made?'crafted':''}" data-act="craft" data-value="${r.id}" ${made?'disabled':''}>${treasureArt(r.id)}<span><strong>${r.name}</strong><small>${made?'On display':`▰ ${r.metal} · ✦ ${r.sparks}`}</small><small>${r.desc}</small></span><span class="recipe-state">${made?'✓':can?'Craft':'Locked'}</span></button>`}).join('')}</div></section><div class="card stack"><h2>Customize your forge</h2><p>Change the atmosphere, metal finish and workbench.</p><div class="themes">${THEMES.map(t=>`<button class="theme-card ${data.theme===t.id&&has(t)?'selected':''}" data-act="theme" data-value="${t.id}"><span class="swatch" data-theme="${t.id}"><i></i><i></i><i></i></span><strong>${t.name}</strong><small>${data.theme===t.id&&has(t)?'Equipped':has(t)?'Equip':t.premium?'Foundry Plus':`✦ ${t.cost}`}</small></button>`).join('')}</div></div><section class="card stack"><div class="tag">One-time purchase</div><h2>Foundry Plus</h2><p>Exclusive Neon and Velvet workshop styles, polished crystal mold finishes and premium glow effects. Every puzzle and crafting recipe remains free.</p><div class="premium-preview"><span class="premium-gem">✦</span><span class="premium-gem">◆</span><span class="premium-gem">✧</span></div><button class="primary" data-act="buy" ${!billing.available||billing.owned?'disabled':''}>${billing.owned?'Purchased':billing.available?`Unlock · ${escape(priceText())}`:'Available via Google Play'}</button><button class="secondary" data-act="restore" ${!window.FoundryNative?'disabled':''}>Restore purchases</button><p class="tiny" role="status">No subscriptions, no random paid rewards, no forced ads. ${escape(billing.message)}</p></section>`
}
function ordersMenu(){return header('Special orders','Commission board')+`<div class="card stack"><h2>Made to order</h2><p>24 special puzzles with different mold sizes and sometimes only one reserve. Finish each order for five metal.</p>${progress(Object.keys(data.orderRecords).length,ORDER_COUNT)}</div><div class="level-list">${Array.from({length:ORDER_COUNT},(_,i)=>{const n=i+1,r=data.orderRecords[n];return `<button class="level" data-act="order" data-value="${n}">${n}<small>${r?'★'.repeat(r.stars):'◇'}</small></button>`}).join('')}</div>`}
function quests(){const w=weeklyProgress(data,currentDay());return header('Weekly commissions','No streak penalties')+`<div class="card stack"><h2>Forge at your own pace</h2><p>Optional weekly goals. Claims add metal and sparks. Missing a week never removes progress.</p><p class="muted">Week of ${w.week}</p></div>${QUESTS.map(q=>`<section class="card stack"><div class="bar"><h3>${q.title}</h3><span class="pill">${Math.min(w[q.id],q.target)}/${q.target}</span></div>${progress(Math.min(w[q.id],q.target),q.target)}<p>+${q.sparks} sparks · +${q.metal} metal</p><button class="secondary" data-act="claim-quest" data-value="${q.id}" ${w.claimed.includes(q.id)||w[q.id]<q.target?'disabled':''}>${w.claimed.includes(q.id)?'Claimed':'Claim reward'}</button></section>`).join('')}`}
function stats(){const entries=Object.values(data.records),sum=entries.reduce((a,b)=>a+b.stars,0);let streak=0,day=new Date(`${currentDay()}T00:00:00Z`);if(!data.daily[currentDay()])day.setUTCDate(day.getUTCDate()-1);while(data.daily[day.toISOString().slice(0,10)]){streak++;day.setUTCDate(day.getUTCDate()-1)}return header('Your records','Mastery')+`<div class="grid2"><div class="card stat"><strong>${entries.length}/${LEVEL_COUNT}</strong><p>Levels solved</p></div><div class="card stat"><strong>${sum}</strong><p>Stars earned</p></div><div class="card stat"><strong>${data.dailyTotal}</strong><p>Lifetime daily puzzles</p></div><div class="card stat"><strong>${streak}</strong><p>Day streak</p></div><div class="card stat"><strong>${Object.keys(data.orderRecords).length}/${ORDER_COUNT}</strong><p>Special orders</p></div><div class="card stat"><strong>${data.endlessLevel-1}</strong><p>Mastery levels</p></div></div><div class="card stack"><div class="tag">Campaign mastery</div><h2>${sum}/${LEVEL_COUNT*3} stars</h2>${progress(sum,LEVEL_COUNT*3)}<p>Replay any unlocked level to improve your record and earn extra sparks.</p><button class="primary" data-act="levels">Choose a level</button></div>`}
function settings(){return header('Settings','Your foundry')+`<div class="stack">${[['audio','Sound effects'],['haptic','Haptic feedback'],['labels','Color symbols'],['largeSymbols','Larger symbols'],['reducedMotion','Reduced motion']].map(([id,name])=>`<button class="setting" data-act="setting" data-value="${id}" role="switch" aria-checked="${data.settings[id]}"><span>${name}</span><span class="toggle ${data.settings[id]?'on':''}">${data.settings[id]?'ON':'OFF'}</span></button>`).join('')}<button class="secondary" data-act="privacy">Privacy & data</button><button class="secondary" data-act="restore" ${window.FoundryNative?'':'disabled'}>Restore purchases</button><button class="secondary" data-act="reset">Reset local progress</button></div><p class="tiny">Pocket Foundry · Version 1.1.0<br>Offline-first. No account required.</p>`}
function privacy(){return header('Privacy & data','Information','settings')+`<div class="card privacy"><h2>Your device, your progress</h2><p>No account is required to play. Puzzle progress, settings and earned sparks are saved locally on your device. The game does not send gameplay data to a server or display advertisements.</p><h3>Google Play purchases</h3><p>Optional purchases are processed by Google Play under Google's privacy policy. The app receives product and purchase status information to deliver and restore your purchased theme pack. It does not receive your payment card details.</p><h3>Reset local data</h3><p>Use Reset local progress in Settings to remove puzzle progress and settings. Google Play purchases remain associated with your Play account and can be restored.</p></div>`}
function modalHTML(){if(!modal)return '';let body='';if(modal.type==='win'){const {rank,reward,moves,metal}=modal;body=`<div class="medal victory-glow">✦</div><h1 id="modal-title">${game.mode==='campaign'&&game.level===LEVEL_COUNT?'Master Foundry!':'Perfectly forged!'}</h1><div class="stars">${'★'.repeat(rank)+'☆'.repeat(3-rank)}</div><p>${moves} moves · +${reward} sparks · +${metal} metal</p><button class="primary" data-act="next">${game.mode==='campaign'&&game.level<LEVEL_COUNT||game.mode==='endless'?'Next level':'Back to home'}</button><button class="secondary" data-act="workshop">Craft a treasure</button><button class="secondary" data-act="home">Home</button>`}else if(modal.type==='restart'){body='<h2 id="modal-title">Start over?</h2><p>All moves in this puzzle will be reset.</p><button class="primary" data-act="confirm-restart">Restart puzzle</button><button class="secondary" data-act="close">Keep playing</button>'}else if(modal.type==='reset'){body='<h2 id="modal-title">Reset local progress?</h2><p>This deletes your puzzle records, sparks and settings on this device. Play purchases can be restored.</p><button class="primary" data-act="confirm-reset">Reset progress</button><button class="secondary" data-act="close">Cancel</button>'}else if(modal.type==='switch'){body='<h2 id="modal-title">Start another puzzle?</h2><p>Your unfinished puzzle in this mode will be replaced. Other modes are saved separately.</p><button class="primary" data-act="confirm-switch">Start puzzle</button><button class="secondary" data-act="close">Cancel</button>'}return `<div class="modal-backdrop"><section class="modal" role="dialog" aria-modal="true" aria-labelledby="modal-title">${body}</section></div>`}
function render(){
  const focus=document.activeElement?.dataset, key=focus?.act?{act:focus.act,value:focus.value}:null
  if(modal&&key&&!document.activeElement.closest('.modal'))modalFocus=key
  applyTheme();root.className=screen==='game'?'game-screen':''
  root.innerHTML=({home,levels,game:gameHTML,workshop,stats,settings,privacy,quests,'orders-menu':ordersMenu}[screen]||home)()+modalHTML()
  for(const p of root.querySelectorAll('[data-progress]'))p.firstElementChild.style.width=`${p.dataset.progress}%`
  for(const b of root.querySelectorAll('.board')){b.style.setProperty('--cols',b.dataset.cols);b.style.setProperty('--land-cols',b.dataset.landCols);b.style.setProperty('--slots',b.dataset.slots)}
  for(const s of root.querySelectorAll('.swatch')){const t=THEMES.find(x=>x.id===s.dataset.theme);s.style.setProperty('--sample',t.bg);s.style.setProperty('--sample-accent',t.accent)}
  if(modal){for(const child of root.children)if(!child.classList.contains('modal-backdrop')){child.setAttribute('inert','');child.setAttribute('aria-hidden','true')}root.querySelector('.modal button')?.focus({preventScroll:true})}
  else{const target=modalFocus||key;modalFocus=null;if(target){const candidate=[...root.querySelectorAll('button[data-act]')].find(b=>b.dataset.act===target.act&&b.dataset.value===target.value&&!b.disabled);candidate?.focus({preventScroll:true})}}
  if(animation&&screen==='game'){
    const target=root.querySelector(`[data-act="tube"][data-value="${animation.to}"]`);target?.classList.add(animation.forged?'forge-impact':'drop-impact');const end=target?.querySelector('.ore')?.getBoundingClientRect(),start=animation.sourceRect
    if(start&&end&&!modal&&!data.settings.reducedMotion&&!window.matchMedia('(prefers-reduced-motion: reduce)').matches){const flying=document.createElement('span');flying.className='ore flying-ore';flying.dataset.color=animation.color;flying.textContent=data.settings.labels?SHAPES[animation.color]:'';flying.setAttribute('aria-hidden','true');Object.assign(flying.style,{left:`${start.left}px`,top:`${start.top}px`,width:`${start.width}px`,height:`${start.height}px`});document.body.append(flying);if(flying.animate){const a=flying.animate([{transform:'translate(0,0)'},{transform:`translate(${(end.left-start.left)/2}px,${Math.min(-30,(end.top-start.top)/2-30)}px)`},{transform:`translate(${end.left-start.left}px,${end.top-start.top}px)`,opacity:0}],{duration:260,easing:'ease-out'});a.onfinish=()=>flying.remove();a.oncancel=()=>flying.remove()}else flying.remove()}
    animation=null
  }
}
function navigate(s){cancelHint();screen=s;selected=-1;guidance=null;modal=null;render();window.scrollTo(0,0)}
function requestGame(mode,level=data.level,date=currentDay()){
  const a=active(mode)
  if(a&&(mode==='daily'?a.date!==date:a.level!==level)){modal={type:'switch',mode,level,date};render();return}
  openGame(mode,level,date)
}
function nativeAction(name){try{window.FoundryNative?.[name]()}catch{showToast('Google Play is not available right now.')}}
window.foundryBillingUpdate=(value)=>{if(!value||typeof value!=='object')return;billing={available:value.available===true,owned:value.owned===true,price:typeof value.price==='string'?value.price:'',message:typeof value.message==='string'?value.message:''};if(screen==='workshop'||screen==='settings')render();else applyTheme()}
window.foundryBack=()=>{if(modal){if(modal.type==='win')navigate('home');else{modal=null;render()}return true}if(screen==='home')return false;navigate(screen==='privacy'?'settings':'home');return true}
root.addEventListener('click',e=>{
  const button=e.target.closest('button[data-act]');if(!button||button.disabled)return
  const {act,value}=button.dataset
  if(modal&&!button.closest('.modal'))return
  switch(act){
    case 'home':case 'levels':case 'workshop':case 'stats':case 'settings':case 'privacy':case 'orders-menu':case 'quests':navigate(act);break
    case 'continue':requestGame('campaign',active('campaign')?.level||data.level);break
    case 'level':if(+value<=data.level)requestGame('campaign',+value);break
    case 'daily':requestGame('daily',data.level,active('daily')?.date||currentDay());break
    case 'order':requestGame('orders',+value);break
    case 'endless':requestGame('endless',active('endless')?.level||data.endlessLevel);break
    case 'tube':selectTube(+value);break
    case 'undo':undo();break
    case 'hint':showHint();break
    case 'restart':modal={type:'restart'};render();break
    case 'close':modal=null;render();break
    case 'confirm-restart':openGame(game.mode,game.level,game.date,false);break
    case 'confirm-switch':{const m=modal;openGame(m.mode,m.level,m.date,false);break}
    case 'next':if(game.mode==='campaign'&&game.level<LEVEL_COUNT||game.mode==='endless')openGame(game.mode,game.level+1,currentDay(),false);else navigate('home');break
    case 'craft':{const r=RECIPES.find(x=>x.id===value);if(!r||data.crafted.includes(r.id))break;if(data.metal<r.metal||data.sparks<r.sparks){showToast('Earn more metal and sparks by solving puzzles.');break}data.metal-=r.metal;data.sparks-=r.sparks;data.crafted.push(r.id);save();sound('forge');render();showToast(`${r.name} added to your display!`);break}
    case 'claim-quest':if(claimQuest(data,currentDay(),value)){save();render();sound('forge');showToast('Commission reward claimed!')}break
    case 'theme':{const t=THEMES.find(x=>x.id===value);if(!t)break;if(has(t)){data.theme=t.id;save();render()}else if(t.premium){showToast('Unlock Foundry Plus to use this theme.')}else if(data.sparks>=t.cost){data.sparks-=t.cost;data.owned.push(t.id);data.theme=t.id;save();sound('forge');render()}else showToast(`Earn ${t.cost-data.sparks} more sparks.`);break}
    case 'setting':if(Object.prototype.hasOwnProperty.call(data.settings,value)){data.settings[value]=!data.settings[value];save();render()}break
    case 'buy':nativeAction('buyPlus');break
    case 'restore':nativeAction('restore');showToast('Checking Google Play purchases…');break
    case 'reset':modal={type:'reset'};render();break
    case 'confirm-reset':data=defaults();game=null;try{reset(localStorage)}catch{}save();navigate('home');showToast('Local progress reset.');break
  }
})
document.addEventListener('keydown',e=>{if(e.key==='Escape'){e.preventDefault();window.foundryBack()}else if(e.key==='Tab'&&modal){const buttons=[...root.querySelectorAll('.modal button:not(:disabled)')];if(!buttons.length)return;if(e.shiftKey&&document.activeElement===buttons[0]){e.preventDefault();buttons[buttons.length-1].focus()}else if(!e.shiftKey&&document.activeElement===buttons[buttons.length-1]){e.preventDefault();buttons[0].focus()}}})
document.addEventListener('visibilitychange',()=>{if(document.hidden){cancelHint();audio.suspend()}})
render();if(loaded.recovered)showToast('Your last valid save was recovered.');if(loaded.legacy||loaded.recovered)save();nativeAction('ready')
