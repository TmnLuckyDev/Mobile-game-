import test from 'node:test'
import assert from 'node:assert/strict'
import {campaign,daily,move,amount,won,validBoard,complete,hint,stars,LEVEL_COUNT} from '../app/src/main/assets/engine.mjs'

function verify(p){
  assert(validBoard(p.board,p.cap,p.colors))
  assert(!won(p.board,p.cap))
  let b=p.board
  for(const [from,to] of p.path){const m=move(b,p.cap,from,to);assert(m,`Illegal certified move ${from} → ${to}`);b=m.board;assert(validBoard(b,p.cap,p.colors))}
  assert(won(b,p.cap))
  assert.equal(p.par,p.path.length)
}

test('all campaign puzzles are deterministic, distinct, valid and solvable',()=>{
  const layouts=new Set()
  for(let n=1;n<=LEVEL_COUNT;n++){
    const p=campaign(n);verify(p);assert.deepEqual(p,campaign(n));layouts.add(JSON.stringify(p.board))
  }
  assert.equal(layouts.size,LEVEL_COUNT)
})
test('366 daily challenges have valid certified solutions',()=>{
  for(let n=0;n<366;n++){
    const day=new Date(Date.UTC(2028,0,n+1)).toISOString().slice(0,10);verify(daily(day))
  }
})
test('transfer uses the top matching run and respects capacity and locked molds',()=>{
  const b=[[0,1,1],[1,1,1],[0,0,0,0],[]]
  assert.equal(amount(b,4,0,1),1)
  assert.deepEqual(move(b,4,0,1).board,[[0,1],[1,1,1,1],[0,0,0,0],[]])
  assert.equal(amount(b,4,2,3),0)
  assert.equal(amount(b,4,0,2),0)
  assert.equal(amount(b,4,0,0),0)
  assert.equal(amount(b,4,-1,0),0)
  assert.equal(amount(b,4,0,5),0)
  assert.equal(amount(b,4,3,0),0)
  assert.deepEqual(b,[[0,1,1],[1,1,1],[0,0,0,0],[]])
  assert(complete(b[2],4))
})
test('hint returns a legal move and scores remain monotonic',()=>{
  const p=campaign(1), h=hint(p.board,p.cap)
  assert(h && amount(p.board,p.cap,...h)>0)
  assert.equal(stars(3,3),3);assert.equal(stars(4,3),2);assert.equal(stars(6,3),1)
})
test('invalid saves fail validation',()=>{
  assert(!validBoard(null,4,2));assert(!validBoard([[0,0,0,0,0],[],[]],4,2));assert(!validBoard([[0,0,0,0],[1,1,1,8],[]],4,2));assert(!validBoard([[0,0,0,0],[],[]],4,2))
})
