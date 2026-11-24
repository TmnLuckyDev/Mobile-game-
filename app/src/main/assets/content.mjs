export const THEMES = [
  {id:'classic',name:'Amber Forge',cost:0,bg:'#3d3230',accent:'#e8b66a'},
  {id:'moss',name:'Moss Workshop',cost:120,bg:'#294238',accent:'#a3d67b'},
  {id:'frost',name:'Glacier Vault',cost:240,bg:'#263c53',accent:'#9edaff'},
  {id:'neon',name:'Neon Foundry',premium:true,bg:'#36304d',accent:'#c4a8fd'},
  {id:'royal',name:'Velvet Foundry',premium:true,bg:'#492e47',accent:'#eeb5dc'},
  {id:'copper',name:'Copper Atelier',cost:450,bg:'#4b3027',accent:'#e8a06f'},
  {id:'moon',name:'Moonlit Studio',cost:720,bg:'#273448',accent:'#b5c9fb'}
]
export const RECIPES = [
  {id:'lantern',name:'Brass lantern',icon:'lantern',metal:2,sparks:35,desc:'Light the entrance to your forge.'},
  {id:'vase',name:'Copper vase',icon:'vase',metal:4,sparks:80,desc:'A graceful centerpiece for the workbench.'},
  {id:'bell',name:'Jade wind bell',icon:'bell',metal:6,sparks:130,desc:'A little music in the workshop.'},
  {id:'clock',name:'Silver clock',icon:'clock',metal:9,sparks:190,desc:'A clockwork treasure.'},
  {id:'crown',name:'Amber diadem',icon:'crown',metal:13,sparks:280,desc:'A masterfully wrought showpiece.'},
  {id:'star',name:'Celestial sculpture',icon:'star',metal:18,sparks:420,desc:'The centerpiece of a master foundry.'},
  {id:'lantern2',name:'Moonstone lantern',icon:'lantern',metal:24,sparks:550,desc:'A second light for the gallery.'},
  {id:'clock2',name:'Astral timepiece',icon:'clock',metal:32,sparks:720,desc:'A final display of precision.'}
]
const shapes={lantern:'<path d="M22 19h36l-5 8v30l7 6H20l7-6V27Z" fill="#bb824a"/><rect x="32" y="30" width="16" height="24" rx="4" fill="#ffe18c"/><path d="M33 19v-5a7 7 0 0 1 14 0v5" fill="none" stroke="#eac28b" stroke-width="4"/>',vase:'<path d="M29 12h22v9c0 9 12 12 12 28 0 14-9 20-23 20s-23-6-23-20c0-16 12-19 12-28Z" fill="#d18a65"/><path d="M25 39q15 8 30 0M25 52q15 8 30 0" stroke="#ffe0a5" stroke-width="3" fill="none"/>',bell:'<path d="M40 9v9M26 30c0-15 28-15 28 0l8 29H18Z" fill="#76c5a1" stroke="#e4eac2" stroke-width="3"/><circle cx="40" cy="65" r="6" fill="#ffd58a"/>',clock:'<circle cx="40" cy="40" r="28" fill="#bac8da" stroke="#e3d2a3" stroke-width="5"/><path d="M40 20v21l14 8" fill="none" stroke="#314051" stroke-width="5" stroke-linecap="round"/><circle cx="40" cy="40" r="4" fill="#9b7751"/>',crown:'<path d="M13 24l16 13 11-20 11 20 16-13-6 32H19Z" fill="#e8b852" stroke="#fff0a2" stroke-width="3"/><path d="M20 62h40" stroke="#b67a43" stroke-width="6"/><circle cx="40" cy="42" r="5" fill="#e98780"/>',star:'<path d="M40 8l10 21 23 3-17 17 4 23-20-11-20 11 4-23L7 32l23-3Z" fill="#bad5f5" stroke="#ffe1a2" stroke-width="3"/><circle cx="40" cy="40" r="8" fill="#e4aeee"/>'}
export function treasureArt(id){const item=RECIPES.find(r=>r.id===id);return `<svg class="treasure-art" viewBox="0 0 80 80" aria-hidden="true">${shapes[item?.icon]||shapes.star}</svg>`}
