import {hint} from './engine.mjs'
self.onmessage=({data})=>{try{self.postMessage({move:hint(data.board,data.cap,60000)})}catch{self.postMessage({move:null})}}
