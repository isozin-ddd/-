/* Original kinematic mechanisms, synchronized deterministic triggers. */
const specs=[
 ['spiral','Domino Spiral','The center is only the beginning.','A widening spiral of standing dominoes','domino-spiral'],
 ['machine','Marble Machine','One marble starts everything.','Rails, ramps and catcher cups relay a polished marble','marble-machine'],
 ['gears','Gear Cascade','A little turn changes everything.','Meshing highlighted gears engage in alternating directions','gears'],
 ['blocks','Falling Blocks','Watch the last block.','A staircase of blocks folds into a precisely fitted stack','blocks'],
 ['stages','Multi-Stage Trigger','From one motion to another.','Dominoes transfer into gears, marbles and a final fan','stages'],
 ['endless','Endless Domino','Always one step ahead.','A closed figure-eight domino route transfers an endless pulse','endless'],
 ['ball-gear','Ball to Gear Reaction','Drop. Turn. Release.','A descending ball unlocks gears and releases a line of marbles','ball-gear'],
 ['perfect','Perfect Chain','Every piece has a part.','An orderly serpentine relay lights each completed section','perfect'],
 ['puzzle','Mechanical Puzzle','The missing move.','Sliding gates and a moving key reveal a path through a tile puzzle','puzzle'],
 ['gravity','Gravity Machine','Gravity does the work.','Counterweights descend, pulling pulleys and opening a final gate','gravity'],
 ['rube','Little Big Machine','Small start. Big finish.','Ramps, a lever, a wheel and hanging chimes form a miniature relay','rube'],
 ['circular','Circular Reaction','Back where it began.','A radial circuit transfers its pulse around an illuminated ring','circular'],
 ['delayed','Delayed Trigger','Wait for it.','A compact domino relay pauses at a balancing pendulum then resumes','delayed'],
 ['color','Color Chain','A wave of color.','Hexagonal cells change material in a diagonal spreading wave','color'],
 ['burst','Final Bloom','One last surprise.','A branching domino tree ends in a bounded sparkling flower','burst']
];
export const templates=specs.map((s,i)=>({id:'chain-'+s[0],genre:'domino',name:s[1],caption:s[2],description:s[3],motion:s[4],hook:'The first active trigger is already moving at the opening',ending:s[4]==='burst'?'bounded particle flower':s[4]==='delayed'?'pause then final relay':'last stage completes the visible route',loop:['endless','circular'].includes(s[0])?'seamless':'reset',quality_principles:['clear cause and effect','trigger-synced sound','polished material shading'],originality:'Original path layout and procedural mechanism. Kinematic animation, not a full rigid-body simulation.'}));
const TAU=Math.PI*2,palette=['#8ef1cf','#b4a3ff','#f7bd87','#8cd6f4','#ef91b7'];
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v)),smooth=v=>{v=clamp(v,0,1);return v*v*(3-2*v)};
function rng(seed){let a=seed>>>0;return()=>{a+=0x6d2b79f5;let t=Math.imul(a^a>>>15,1|a);t^=t+Math.imul(t^t>>>7,61|t);return((t^t>>>14)>>>0)/4294967296}}
function backdrop(c){const g=c.createLinearGradient(0,0,540,960);g.addColorStop(0,'#15253a');g.addColorStop(.55,'#080e1b');g.addColorStop(1,'#1d2b3b');c.fillStyle=g;c.fillRect(0,0,540,960);const h=c.createRadialGradient(270,440,20,270,440,330);h.addColorStop(0,'#7586b128');h.addColorStop(1,'#00000000');c.fillStyle=h;c.fillRect(0,100,540,720);c.strokeStyle='#b9d6fa10';for(let y=220;y<790;y+=55){c.beginPath();c.moveTo(30,y);c.lineTo(510,y);c.stroke()}c.fillStyle='#7ba0b515';c.beginPath();c.ellipse(270,790,230,25,0,0,TAU);c.fill()}
function line(c,a,b,width=5,color='#7195b4'){c.save();c.lineCap='round';c.strokeStyle='#0008';c.lineWidth=width+5;c.beginPath();c.moveTo(a.x+2,a.y+5);c.lineTo(b.x+2,b.y+5);c.stroke();c.strokeStyle=color;c.lineWidth=width;c.beginPath();c.moveTo(a.x,a.y);c.lineTo(b.x,b.y);c.stroke();c.strokeStyle='#e0f4ff66';c.lineWidth=1;c.beginPath();c.moveTo(a.x,a.y-2);c.lineTo(b.x,b.y-2);c.stroke();c.restore()}
function ball(c,x,y,r,color){const g=c.createRadialGradient(x-r*.4,y-r*.5,1,x+r*.1,y+r*.2,r*1.2);g.addColorStop(0,'#fff');g.addColorStop(.2,color);g.addColorStop(.8,color);g.addColorStop(1,'#183049');c.fillStyle=g;c.shadowColor='#0008';c.shadowBlur=7;c.shadowOffsetY=5;c.beginPath();c.arc(x,y,r,0,TAU);c.fill();c.shadowBlur=0;c.shadowOffsetY=0}
function block(c,x,y,angle,color,width=15,height=45){c.save();c.translate(x,y);c.rotate(angle);c.fillStyle='#0005';c.fillRect(-width/2+5,-height+5,width,height);const g=c.createLinearGradient(-width/2,0,width/2,0);g.addColorStop(0,color);g.addColorStop(.55,color);g.addColorStop(1,'#1b3049');c.fillStyle=g;c.fillRect(-width/2,-height,width,height);c.fillStyle='#fff8';c.fillRect(-width/2,-height,3,height);c.fillStyle='#ffffff22';c.fillRect(-width/2,-height,width,5);c.restore()}
function gear(c,x,y,r,rotation,color,active){c.save();c.translate(x,y);c.rotate(rotation);c.fillStyle='#0007';c.beginPath();c.arc(3,5,r,0,TAU);c.fill();const g=c.createRadialGradient(-r*.4,-r*.4,2,0,0,r);g.addColorStop(0,'#e3f6ff');g.addColorStop(.35,color);g.addColorStop(1,'#263b58');c.fillStyle=g;c.beginPath();for(let i=0;i<64;i++){const a=i*TAU/64,rr=r*(i%4<2?1:.85);if(!i)c.moveTo(Math.cos(a)*rr,Math.sin(a)*rr);else c.lineTo(Math.cos(a)*rr,Math.sin(a)*rr)}c.closePath();c.fill();c.strokeStyle=active?'#bcffe8':'#6e8da7';c.lineWidth=2;c.stroke();c.fillStyle='#111e31';c.beginPath();c.arc(0,0,r*.32,0,TAU);c.fill();c.strokeStyle='#d6f4ff';c.lineWidth=2;c.beginPath();c.arc(0,0,r*.12,0,TAU);c.stroke();c.restore()}
function pointPath(kind,count,phase){const out=[];for(let i=0;i<count;i++){const q=i/(count-1);let x,y;
 if(kind==='domino-spiral'){const a=q*TAU*2.5+phase,r=35+q*180;x=270+Math.cos(a)*r;y=465+Math.sin(a)*r*1.1}
 else if(kind==='endless'){const a=q*TAU;x=270+Math.sin(a)*190;y=470+Math.sin(a*2)*190}
 else if(kind==='circular'){const a=q*TAU+phase;x=270+Math.cos(a)*200;y=475+Math.sin(a)*235}
 else if(kind==='burst'){const row=Math.floor(i/6),col=i%6;x=270+(col-2.5)*(35+row*7);y=245+row*88}
 else if(kind==='perfect'||kind==='delayed'){const row=Math.floor(i/6),col=row%2?5-i%6:i%6;x=80+col*76;y=240+row*86}
 else {x=80+q*380;y=270+q*410+Math.sin(q*TAU*2+phase)*60}
 out.push({x,y})}return out}
export function create(templateId,seed,options={}){
 const meta=templates.find(x=>x.id===templateId)||templates[0],kind=meta.motion,duration=options.duration||6,rand=rng(seed),phase=rand()*TAU,spreadX=.88+rand()*.16,spreadY=.91+rand()*.10,points=pointPath(kind,36,phase);
 const events=[];for(let i=0;i<36;i++){let q=.05+i/35*.82;if(kind==='delayed')q=i<18?.04+i*.009:.52+(i-18)*.021;events.push({time:q*duration,intensity:i===35?.7:.16+(i%5)*.045,pitch:420+(i%8)*58})}
 const at=(i,t)=>smooth((t-events[i].time)/Math.max(.10,duration*.045));
 let audioEvents=events;
 const select=indices=>indices.map(i=>events[i]);
 if(kind==='gears')audioEvents=select([0,4,8,12,16,20,24,28]);
 if(kind==='blocks')audioEvents=select(Array.from({length:18},(_,i)=>i*2));
 if(kind==='stages')audioEvents=select([...Array.from({length:10},(_,i)=>i),10,14,18,...Array.from({length:8},(_,i)=>24+i)]);
 if(kind==='gravity')audioEvents=select([0,10,20]);
 if(kind==='marble-machine')audioEvents=Array.from({length:5},(_,i)=>({time:(i+1)/5/1.15*duration,intensity:.35,pitch:420+i*80}));
 if(kind==='ball-gear')audioEvents=[.27,.30,...Array.from({length:8},(_,i)=>.5+i*.035)].map((q,i)=>({time:q*duration,intensity:.3,pitch:430+i*45}));
 if(kind==='puzzle')audioEvents=Array.from({length:9},(_,i)=>({time:(i+1)/9/1.12*duration,intensity:.23,pitch:420+i*48}));
 if(kind==='rube')audioEvents=[{time:.28*duration,intensity:.4,pitch:430},{time:.43*duration,intensity:.3,pitch:610},...select([22,24,26,28,30,32,34])];
 if(kind==='color')audioEvents=Array.from({length:13},(_,i)=>({time:i/20*duration,intensity:.2,pitch:400+i*35}));
 if(kind==='burst')audioEvents=[...events,{time:.84*duration,intensity:.7,pitch:1050}];
 if(meta.loop==='seamless')audioEvents=Array.from({length:36},(_,i)=>({time:i/36*duration,intensity:.2,pitch:460+(i%8)*50}));
 audioEvents.sort((a,b)=>a.time-b.time);
 const sparks=Array.from({length:48},()=>({angle:rand()*TAU,speed:40+rand()*150,color:palette[Math.floor(rand()*palette.length)],r:1+rand()*2}));
 function gearRow(c,t,n=8){for(let i=0;i<n;i++){const x=120+(i%3)*150,y=275+Math.floor(i/3)*170,active=t>events[i*4].time,rot=active?(t-events[i*4].time)*(i%2?-.9:.9):0;gear(c,x,y,61,rot,palette[(i+seed)%5],active)}}
 return {metadata:meta,eventsBetween(a,b){return audioEvents.filter(e=>e.time>a&&e.time<=b)},stats:{nodeCount:36,particleCount:48,solver:'bounded deterministic kinematic relay'},draw(c,w,h,time,dt,caption){
  let t=clamp(time,0,duration);if(meta.loop==='seamless')t=time%duration;const p=t/duration;
  c.save();c.scale(w/540,h/960);backdrop(c);c.save();const zoom=1+.018*Math.sin(p*(meta.loop==='seamless'?TAU:Math.PI));c.translate(270,465);c.scale(zoom*spreadX,zoom*spreadY);c.translate(-270,-465);
  if(['domino-spiral','endless','perfect','circular','delayed','burst'].includes(kind)){
   for(let i=0;i<points.length-1;i++)line(c,points[i],points[i+1],2,'#627d9b44');
   for(let i=35;i>=0;i--){const pt=points[i],next=points[(i+1)%36],a=meta.loop==='seamless'?Math.pow((1+Math.cos(TAU*(p-i/36)))/2,10):at(i,t),direction=Math.atan2(next.y-pt.y,next.x-pt.x);c.save();c.translate(pt.x,pt.y);c.rotate(direction-Math.PI/2);block(c,0,0,-a*1.3,palette[(i+seed)%5],kind==='perfect'?17:14,kind==='circular'?35:42);c.restore();if(a>0&&a<1){c.fillStyle='#bbffe77a';c.beginPath();c.arc(pt.x,pt.y,6+13*Math.sin(a*Math.PI),0,TAU);c.fill()}}
   if(kind==='delayed'){const swing=Math.sin(t*5)*.55;c.strokeStyle='#d8efff';c.lineWidth=3;c.beginPath();c.moveTo(270,390);c.lineTo(270+Math.sin(swing)*55,390+Math.cos(swing)*55);c.stroke();ball(c,270+Math.sin(swing)*55,390+Math.cos(swing)*55,13,'#e4c992')}
   if(kind==='burst'&&p>.84){const age=(p-.84)*duration;for(const s of sparks){const radius=s.speed*age;c.globalAlpha=clamp(1-age/1.2,0,1);ball(c,270+Math.cos(s.angle)*radius,600+Math.sin(s.angle)*radius+age*age*70,s.r,s.color)}c.globalAlpha=1}
  }else if(kind==='gears'){gearRow(c,t)}
  else if(kind==='marble-machine'){
   const rails=[{x:65,y:255},{x:445,y:340},{x:95,y:435},{x:445,y:535},{x:105,y:650},{x:270,y:740}];for(let i=0;i<rails.length-1;i++)line(c,rails[i],rails[i+1],10);const q=clamp(p*1.15,0,1)*(rails.length-1),i=Math.min(rails.length-2,Math.floor(q)),f=q-i,a=rails[i],b=rails[i+1];ball(c,a.x+(b.x-a.x)*f,a.y+(b.y-a.y)*f-16,16,palette[seed%5]);for(const pt of rails)gear(c,pt.x,pt.y+28,17,t*.8,'#8097b3',true);
  }else if(kind==='blocks'){
   for(let i=0;i<18;i++){const col=i%6,row=Math.floor(i/6),a=at(i*2,t),x=85+col*73,y=335+row*145;block(c,x,y+a*(125-row*20),a*Math.PI/2,palette[(i+seed)%5],36,76)}
  }else if(kind==='stages'){
   for(let i=0;i<10;i++)block(c,65+i*42,295,-at(i,t)*1.35,palette[i%5],14,50);for(let i=0;i<3;i++)gear(c,130+i*140,450,59,Math.max(0,t-events[10+i*4].time)*(i%2?-1:1),palette[(i+seed)%5],t>events[10+i*4].time);for(let i=0;i<8;i++){const a=at(24+i,t);ball(c,80+i*53,620+a*100,14,palette[i%5])}
  }else if(kind==='ball-gear'){
   const drop=smooth(p/.3);line(c,{x:270,y:190},{x:270,y:390},4);ball(c,270,190+drop*175,21,palette[seed%5]);for(let i=0;i<3;i++)gear(c,145+i*125,465,55,Math.max(0,p-.27)*8*(i%2?-1:1),palette[(i+seed)%5],p>.27);line(c,{x:70,y:665},{x:470,y:710},9);for(let i=0;i<8;i++){const a=smooth((p-.5-i*.035)*5);ball(c,85+i*44,625+a*105,13,palette[i%5])}
  }else if(kind==='puzzle'){
   const route=[[0,0],[1,0],[1,1],[2,1],[2,2],[3,2],[3,3],[2,3],[1,3],[0,3]];
   for(let row=0;row<4;row++)for(let col=0;col<4;col++){const n=row*4+col,x=108+col*108,y=280+row*108,slide=at(n*2,t)*15;c.fillStyle='#314762';c.fillRect(x-42,y-42+slide,84,84);c.strokeStyle='#a8cced77';c.strokeRect(x-42,y-42+slide,84,84);c.fillStyle='#19283d';c.fillRect(x-24,y-24+slide,48,48)}const q=clamp(p*1.12,0,1)*(route.length-1),ix=Math.min(route.length-2,Math.floor(q)),f=q-ix;ball(c,108+(route[ix][0]+(route[ix+1][0]-route[ix][0])*f)*108,280+(route[ix][1]+(route[ix+1][1]-route[ix][1])*f)*108,20,palette[seed%5]);
  }else if(kind==='gravity'){
   for(let i=0;i<3;i++){const x=120+i*150,a=at(i*10,t);gear(c,x,270,35,a*3,palette[i],a>0);line(c,{x:x-28,y:270},{x:x-28,y:440+a*170},3);line(c,{x:x+28,y:270},{x:x+28,y:610-a*170},3);block(c,x-28,440+a*170,0,palette[i],38,50);block(c,x+28,610-a*170,0,palette[(i+2)%5],38,50)}
  }else if(kind==='rube'){
   line(c,{x:60,y:245},{x:310,y:325},10);const a=smooth(p/.28);ball(c,75+225*a,225+72*a,17,palette[seed%5]);const lever=smooth((p-.25)/.2);line(c,{x:115,y:460-lever*45},{x:420,y:460+lever*45},14);block(c,270,490,0,'#9ba6b8',35,45);gear(c,145,620,66,Math.max(0,p-.43)*8,palette[1],p>.43);for(let i=0;i<7;i++){const f=at(22+i*2,t);line(c,{x:275+i*31,y:580},{x:275+i*31+Math.sin(f*2)*15,y:690},3);ball(c,275+i*31+Math.sin(f*2)*15,690,10,palette[i%5])}
  }else if(kind==='color'){
   for(let row=0;row<8;row++)for(let col=0;col<6;col++){const x=80+col*76+(row%2)*36,y=260+row*59;
    const q=smooth((p-(row+col)/20)*7),color=palette[(row+col+seed)%5];c.save();c.translate(x,y);c.rotate(q*Math.PI/6);c.fillStyle=q>.1?color:'#34455c';c.shadowBlur=q>0&&q<1?14:0;c.shadowColor=color;c.beginPath();for(let j=0;j<6;j++){const a=j*TAU/6;const xx=Math.cos(a)*32,yy=Math.sin(a)*32;if(j)c.lineTo(xx,yy);else c.moveTo(xx,yy)}c.closePath();c.fill();c.shadowBlur=0;c.strokeStyle='#ffffff77';c.lineWidth=1;c.stroke();c.restore()}
  }
  c.restore();c.fillStyle='#a9c3d8';c.font='12px -apple-system,sans-serif';c.fillText('ORIGINAL / CHAIN STUDIO',30,63);c.fillStyle='#b8a5ff';c.fillRect(30,85,42,2);if(caption){c.fillStyle='#081120c0';c.fillRect(25,824,490,65);c.fillStyle='#effbff';c.font='bold 23px -apple-system,sans-serif';c.textAlign='center';c.fillText(meta.caption,270,865,470)}c.restore();
 }};
}
