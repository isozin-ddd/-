import {H,TAU,clamp,angle,stepCCD,arcHit,wallHit} from './physics.js';
export const VERSION='quality-1',MODES=['escape','multiply','last'];
export const DEFAULTS=Object.freeze({rings:3,balls:1,phase:-1.65,gap:1.05,rotation:.65,direction:'alternate',gravity:165,restitution:.97,speed:255,maxBalls:32,multiplyWhen:'hit',eliminateWhen:'escape',obstacles:'chicane',ending:'winner'});
export function normalizeQuality(raw={}){const c={...DEFAULTS};for(const [k,min,max,int] of [['rings',1,5,true],['balls',1,16,true],['phase',-3.1416,3.1416],['gap',.4,1.7],['rotation',0,1.5],['gravity',0,350],['restitution',.8,1],['speed',80,650],['maxBalls',2,48,true]])if(raw[k]!==undefined){const v=Number(raw[k]);if(!Number.isFinite(v)||v<min||v>max||int&&!Number.isInteger(v))throw Error(`Quality ${k}: ${min}..${max}`);c[k]=v}for(const [k,values] of Object.entries({direction:['alternate','clockwise','counterclockwise'],multiplyWhen:['hit','gate'],eliminateWhen:['escape','hazard'],obstacles:['chicane','spinner'],ending:['winner','podium']}))if(raw[k]!==undefined){if(!values.includes(raw[k]))throw Error('Quality '+k);c[k]=raw[k]}if(c.maxBalls<c.balls)throw Error('増殖上限は初期球数以上にしてください');return c}
function rng(seed){let a=seed>>>0;return()=>{a+=0x6d2b79f5;let t=Math.imul(a^a>>>15,1|a);t^=t+Math.imul(t^t>>>7,61|t);return((t^t>>>14)>>>0)/4294967296}}
export class QualityWorld{
 constructor(mode='escape',seed=10,duration=15,settings={}){if(!MODES.includes(mode))throw Error('Unknown quality work');this.mode=mode;this.seed=seed;this.duration=duration;this.config=normalizeQuality({...((mode==='last')?{balls:12,gap:1.45}:{}),...settings});this.random=rng(seed);this.tick=0;this.time=0;this.balls=[];this.rings=[];this.walls=[];this.events=[];this.nextId=0;this.nextEvent=0;this.outcome='';this.winner=null;this.cleared=0;this.eliminated=[];this.spawned=0;this.stats={contacts:0,pairTests:0,budgetStops:0,maxPenetration:0};this.cooldowns=new Map();this.trails=new Map();this.populate();}
 populate(){const c=this.config,n=c.balls;
  const count=this.mode==='escape'?c.rings:1;
  for(let i=0;i<count;i++)this.rings.push({id:'ring-'+i,x:270,y:462,r:this.mode==='escape'?105+i*(112/Math.max(1,count-1)):210,width:6,a:c.phase+i*1.8,omega:c.rotation*(c.direction==='counterclockwise'?-1:c.direction==='alternate'&&i%2?-1:1),gap:c.gap,cleared:false});
  for(let i=0;i<n;i++){const t=i*2.39996,r=n===1?0:18+Math.sqrt(i)*20;this.addBall(270+Math.cos(t)*r,425+Math.sin(t)*r,this.random()*TAU,11)}
  // The floor is visible geometry, not an invisible safety boundary.
  this.walls=[{id:'floor',x:270,y:794,length:460,width:4,a:0,omega:0},{id:'left',x:38,y:480,length:624,width:3,a:Math.PI/2,omega:0},{id:'right',x:502,y:480,length:624,width:3,a:Math.PI/2,omega:0},{id:'ceiling',x:270,y:166,length:460,width:3,a:0,omega:0}];
  if(this.mode==='multiply')this.walls.push({id:'splitter',x:270,y:485,length:90,width:10,a:.45,omega:.25});
  if(this.mode==='last')this.walls.push(...(c.obstacles==='spinner'?[{id:'rotor',x:270,y:463,length:145,width:8,a:.3,omega:.55}]:[{id:'deflector-a',x:205,y:445,length:92,width:8,a:.7,omega:0},{id:'deflector-b',x:330,y:515,length:92,width:8,a:-.6,omega:0}]));
  const old=this.balls;this.balls=[];for(const b of old){let placed=false;for(let tries=0;tries<2000;tries++){const a=this.random()*TAU,r=tries===0&&n===1?0:Math.sqrt(this.random())*72,x=270+Math.cos(a)*r,y=440+Math.sin(a)*r;if(this.rings.some(q=>Math.hypot(x-q.x,y-q.y)+b.r+q.width/2+2>=q.r))continue;if(this.balls.some(q=>Math.hypot(q.x-x,q.y-y)<q.r+b.r+2))continue;if(this.walls.some(w=>{const u=Math.cos(w.a),v=Math.sin(w.a),t=clamp((x-w.x)*u+(y-w.y)*v,-w.length/2,w.length/2);return Math.hypot(x-w.x-u*t,y-w.y-v*t)<b.r+w.width/2+2}))continue;b.x=x;b.y=y;this.balls.push(b);placed=true;break}if(!placed)throw Error('Initial layout cannot fit discs safely')}

 }
 addBall(x,y,heading,r=9){const b={id:this.nextId++,x,y,vx:Math.cos(heading)*this.config.speed,vy:Math.sin(heading)*this.config.speed,r,mass:r*r,color:this.nextId%5,dead:false};this.balls.push(b);return b}
 emit(type,x,y,time,extra={}){const e={id:this.nextEvent++,type,x,y,time,intensity:.5,...extra};this.events.push(e);if(this.events.length>4096)this.events.shift();return e}
 contact(h){const key=h.a.id+':'+h.key,last=this.cooldowns.get(key)??-1;
  if(h.impulse/h.a.mass>14&&h.time-last>.055){this.cooldowns.set(key,h.time);this.emit('hit',h.x,h.y,h.time,{ball:h.a.id,collider:h.key,endpoint:!!h.endpoint,intensity:clamp(h.impulse/h.a.mass/450,.1,1)});
   if(this.mode==='multiply'&&this.config.multiplyWhen==='hit')this.pendingSpawn=h.a;
   if(this.mode==='last'&&this.config.eliminateWhen==='hazard'&&h.wall&&!['floor','left','right','ceiling'].includes(h.wall.id)&&h.time>this.duration*.2&&this.balls.filter(b=>!b.dead).length>1)this.eliminate(h.a,h.time,'hazard');
  }
 }
 eliminate(b,time,reason){if(b.dead)return;b.dead=true;this.eliminated.push(b.id);this.emit('eliminate',b.x,b.y,time,{ball:b.id,reason});}
 spawnClear(parent){const quota=this.time<this.duration*.25?Math.min(3,this.config.maxBalls):this.time<this.duration*.68?Math.max(3,Math.ceil(this.config.maxBalls/3)):this.config.maxBalls;if(this.balls.length>=Math.min(quota,this.config.maxBalls)||this.time<(parent.spawnAt||0)+.18)return;const r=8;
  for(let i=0;i<24;i++){const a=i*TAU/24+Math.atan2(parent.vy,parent.vx),x=parent.x+Math.cos(a)*(parent.r+r+1),y=parent.y+Math.sin(a)*(parent.r+r+1);
   if(x<55||x>485||y<185||y>775||this.balls.some(b=>Math.hypot(b.x-x,b.y-y)<b.r+r+1))continue;
   if(this.rings.some(q=>!q.cleared&&Math.abs(Math.hypot(x-q.x,y-q.y)-q.r)<r+q.width/2+1))continue;
   if(this.walls.some(w=>{const a=w.a+w.omega*this.time,u=Math.cos(a),v=Math.sin(a),t=clamp((x-w.x)*u+(y-w.y)*v,-w.length/2,w.length/2);return Math.hypot(x-w.x-t*u,y-w.y-t*v)<r+w.width/2+1}))continue;
   const path={id:-1,x:parent.x,y:parent.y,vx:x-parent.x,vy:y-parent.y,r,mass:1};
   if(this.rings.some(q=>arcHit(path,{...q,a:q.a+q.omega*this.time,omega:0},1,0)))continue;
   if(this.walls.some(w=>wallHit(path,{...w,a:w.a+w.omega*this.time,omega:0},1,0)))continue;
   const child=this.addBall(x,y,a,r);parent.spawnAt=this.time;child.spawnAt=this.time;this.spawned++;this.emit('multiply',x,y,this.time,{ball:child.id});return;
  }
 }
 step(){const c=this.config,active=this.balls.filter(b=>!b.dead),maxV=Math.max(1,...active.map(b=>Math.hypot(b.vx,b.vy))),minR=Math.min(...active.map(b=>b.r),8),maxAngular=Math.max(0,...this.rings.map(r=>Math.abs(r.omega)*r.r),...this.walls.map(w=>Math.abs(w.omega)*w.length/2));const sub=Math.min(64,Math.max(1,Math.ceil(Math.max(maxV,maxAngular)*H/(minR*.6)))),dt=H/sub;
  for(let s=0;s<sub;s++){const start=this.tick*H+s*dt;this.time=start+dt;
   for(const b of this.balls)if(!b.dead){b.vy+=c.gravity*dt;const drag=Math.exp(-.006*dt);b.vx*=drag;b.vy*=drag;}
   stepCCD(this.balls,this.rings,this.walls,dt,start,{restitution:c.restitution,friction:.012,stats:this.stats,onContact:h=>this.contact(h)});
   for(const b of this.balls){if(b.dead)continue;for(const ring of this.rings){if(ring.cleared)continue;const distance=Math.hypot(b.x-ring.x,b.y-ring.y);
     if(distance>ring.r+ring.width/2+b.r+.005&&!b['outside'+ring.id]){b['outside'+ring.id]=true;
      if(this.mode==='escape'){ring.cleared=true;ring.clearedAt=this.time;this.cleared++;this.emit('escape',b.x,b.y,this.time,{ball:b.id,ring:ring.id});}
      if(this.mode==='multiply'&&c.multiplyWhen==='gate')this.pendingSpawn=b;
      if(this.mode==='last'&&c.eliminateWhen==='escape'&&this.balls.filter(x=>!x.dead).length>1)this.eliminate(b,this.time,'escaped arena');
     }
   }}
   if(this.pendingSpawn){if(!this.pendingSpawn.dead)this.spawnClear(this.pendingSpawn);this.pendingSpawn=null;}
   this.balls=this.balls.filter(b=>!b.dead);
   if(!this.outcome){if(this.mode==='escape'&&this.cleared===this.rings.length)this.finish('ALL RINGS CLEARED',this.balls[0]);if(this.mode==='multiply'&&this.balls.length===c.maxBalls)this.finish('POPULATION '+c.maxBalls+' REACHED',this.balls[0]);if(this.mode==='last'&&this.balls.length===1)this.finish('BALL '+(this.balls[0].id+1)+' SURVIVES',this.balls[0]);}
  }
  this.tick++;this.time=this.tick*H;
  if(this.tick%4===0)for(const b of this.balls){const t=this.trails.get(b.id)||[];t.push({x:b.x,y:b.y,time:this.time});while(t.length>7)t.shift();this.trails.set(b.id,t)}
  if(this.time>=this.duration-1e-6&&!this.outcome){this.outcome=this.mode==='escape'?`${this.cleared}/${this.rings.length} CLEARED — TIME UP`:this.mode==='last'?`${this.balls.length} STILL IN PLAY`:`${this.balls.length}/${c.maxBalls} — TIME UP`;this.emit('timeout',270,462,this.time)}
 }
 finish(text,b){this.outcome=text;this.winner=b.id;this.emit('goal',b.x,b.y,this.time,{ball:b.id})}
 advance(t){const target=Math.floor(clamp(t,0,this.duration)/H+1e-7);while(this.tick<target)this.step()}
 snapshot(){return {time:this.time,balls:this.balls.map(b=>({...b})),rings:this.rings.map(r=>({...r})),walls:this.walls.map(w=>({...w})),events:this.events.map(e=>({...e})),outcome:this.outcome,winner:this.winner,cleared:this.cleared,eliminated:[...this.eliminated],spawned:this.spawned,stats:{...this.stats}}}
}
