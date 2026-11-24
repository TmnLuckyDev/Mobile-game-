import {campaign,daily,orders,endless,LEVEL_COUNT,ORDER_COUNT,validBoard,won,move,copy} from './engine.mjs'
import {THEMES,RECIPES} from './content.mjs'
export const KEY='pocket-foundry-v2', LEGACY='pocket-foundry-v1', BACKUP=KEY+'-backup'
export const today=()=>new Date().toISOString().slice(0,10)
export const modes=['campaign','daily','orders','endless']
export const defaults=()=>({version:2,level:1,records:{},daily:{},orderRecords:{},endlessRecords:{},endlessLevel:1,dailyTotal:0,sparks:0,metal:0,crafted:[],theme:'classic',owned:['classic'],settings:{audio:true,haptic:true,labels:true,largeSymbols:false,reducedMotion:false},activeByMode:{},weekly:null,lastDate:'',revision:0})
const integer=(v,max=100000000)=>Number.isInteger(v)&&v>=0&&v<=max?v:0
const dateKey=k=>typeof k==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(k)&&Number.isFinite(Date.parse(k))&&new Date(k).toISOString().slice(0,10)===k
export function puzzleFor(mode,level,date){return mode==='campaign'?campaign(level):mode==='orders'?orders(level):mode==='endless'?endless(level):daily(date)}
function records(src,valid,limit=10000){const out={};for(const [k,v] of Object.entries(src||{}).filter(([k])=>valid(k)).sort(([a],[b])=>/^\d+$/.test(a)&&/^\d+$/.test(b)?+a-+b:a.localeCompare(b)).slice(-limit)){if(v&&integer(v.stars,3)>0&&integer(v.moves,500)>0)out[k]={stars:v.stars,moves:v.moves}}return out}
const numberKey=(k,max)=>/^\d+$/.test(k)&&+k>=1&&+k<=max&&String(+k)===k
function active(a,d){
  if(!a||!modes.includes(a.mode)||!Array.isArray(a.history)||a.history.length>500)return null
  const max={campaign:d.level,orders:ORDER_COUNT,endless:d.endlessLevel}[a.mode]
  if(a.mode==='daily'?!dateKey(a.date):!Number.isInteger(a.level)||a.level<1||a.level>max)return null
  try{const p=puzzleFor(a.mode,a.level,a.date);if(!validBoard(a.board,p.cap,p.colors)||won(a.board,p.cap))return null
    let b=copy(p.board);for(const pair of a.history){if(!Array.isArray(pair)||pair.length!==2)return null;const result=move(b,p.cap,...pair);if(!result)return null;b=result.board}
    return JSON.stringify(b)===JSON.stringify(a.board)?{mode:a.mode,level:a.level,date:a.date,board:b,history:a.history}:null
  }catch{return null}
}
export function migrate(s){
  if(!s||![1,2].includes(s.version))return null
  const d=defaults();d.level=Math.max(1,integer(s.level,LEVEL_COUNT));d.endlessLevel=Math.max(1,integer(s.endlessLevel,100000));d.sparks=integer(s.sparks);d.metal=integer(s.metal);d.revision=integer(s.revision)
  d.records=records(s.records,k=>numberKey(k,LEVEL_COUNT));d.daily=records(s.daily,dateKey,730);d.orderRecords=records(s.orderRecords,k=>numberKey(k,ORDER_COUNT));d.endlessRecords=records(s.endlessRecords,k=>numberKey(k,100000),1000)
  d.dailyTotal=Math.max(integer(s.dailyTotal),Object.keys(d.daily).length);d.lastDate=dateKey(s.lastDate)?s.lastDate:''
  if(s.weekly&&dateKey(s.weekly.week))d.weekly={week:s.weekly.week,puzzles:integer(s.weekly.puzzles),daily:integer(s.weekly.daily),orders:integer(s.weekly.orders),claimed:['puzzles','daily','orders'].filter(k=>Array.isArray(s.weekly.claimed)&&s.weekly.claimed.includes(k))}
  if(s.version===1)d.metal=Object.keys(d.records).length*2+Object.keys(d.daily).length*3
  d.owned=['classic',...THEMES.filter(t=>t.cost>0&&Array.isArray(s.owned)&&s.owned.includes(t.id)).map(t=>t.id)]
  if(THEMES.some(t=>t.id===s.theme))d.theme=s.theme
  d.crafted=RECIPES.filter(r=>Array.isArray(s.crafted)&&s.crafted.includes(r.id)).map(r=>r.id)
  for(const k of Object.keys(d.settings))if(s.settings&&typeof s.settings[k]==='boolean')d.settings[k]=s.settings[k]
  for(const a of [s.active,...Object.values(s.activeByMode||{})]){const v=active(a,d);if(v)d.activeByMode[v.mode]=v}
  return d
}
function parse(storage,key){try{return migrate(JSON.parse(storage.getItem(key)||'null'))}catch{return null}}
const snapshots=new WeakMap()
export function load(storage){const main=parse(storage,KEY),backup=main?null:parse(storage,BACKUP),old=main||backup?null:parse(storage,LEGACY),data=main||backup||old||defaults();if(main||backup||old)snapshots.set(storage,JSON.stringify(data));return {data,recovered:!main&&!!backup,legacy:!main&&!backup&&!!old}}
export function persist(storage,data){const previous=snapshots.get(storage);if(previous)storage.setItem(BACKUP,previous);data.revision++;const serialized=JSON.stringify(data);storage.setItem(KEY,serialized);snapshots.set(storage,serialized)}
export function reset(storage){snapshots.delete(storage);for(const key of [KEY,BACKUP,LEGACY])storage.removeItem(key)}
