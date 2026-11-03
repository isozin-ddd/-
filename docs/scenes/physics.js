/* Original deterministic mechanisms. This is a small 2D solver, not a rigid-body engine. */
const specs=[
 ['ring-escape','Rotating Ring Escape','Find the opening.','Rotating circular boundary with a moving escape slot','ring'],
 ['maze','Bouncing Ball Maze','One way through.','Alternating shelves and a descending ball corridor','maze'],
 ['funnel','Gravity Funnel','Everything finds its way.','Inclined funnel walls focus a shower through a narrow neck','funnel'],
 ['race','Marble Race','Who reaches the finish?','Parallel peg lanes turn a falling race into different routes','race'],
 ['multiplication','Ball Multiplication','One becomes many.','A floor impact releases additional original spheres','multiply'],
 ['spiral','Spiral Drop','Around, then down.','A constrained helical rail projects depth and a descending marble','spiral'],
 ['magnetic','Magnetic Ball','An invisible force.','A moving magnetic attractor bends gravity-driven trajectories','magnetic'],
 ['sorting','Color Sorting','Every color, a home.','Three constrained paths route matching marbles into separate cups','sorting'],
 ['paddles','Falling Obstacles','The path keeps changing.','Oscillating paddles redirect falling bodies','paddles'],
 ['gap','Narrow Gap Challenge','Will it fit?','A narrow central slot creates an exact-fit falling challenge','gap'],
 ['elastic','Elastic Collision','Pass the momentum.','Differently sized spheres exchange normal impulses inside a glass box','elastic'],
 ['orbit','Orbit Breakout','Leave the ordinary orbit.','A central attractor and offset launch speeds create orbital crossings','orbit'],
 ['survival','Multi-Ball Survival','Stay inside the light.','A rotating polygon of sloped deflectors catches a multiball shower','survival'],
 ['chain-bounce','Chain Bounce','Every bounce matters.','Staggered angled bumpers carry a marble across the stage','chainbounce'],
 ['timing','Perfect Timing Drop','Wait for the moment.','A timed mechanical gate briefly clears a descending path','timing']
];
export const templates=specs.map((s,i)=>({id:'phy-'+s[0],genre:'ball',name:s[1],caption:s[2],description:s[3],motion:s[4],hook:i<3?'First impact or nearly closed gap is visible immediately':'Motion begins in the first half-second',ending:['escape or near miss','collected marbles','visible momentum transfer'][i%3],loop:'reset',quality_principles:['single focal area','material highlights','collision-synced sound'],originality:'Original procedural geometry and seeded launch states; no external footage'}));
const TAU=Math.PI*2,colors=['#96f6d2','#ae9dff','#ffbe83','#fa87aa','#75c9ff'];
function random(seed){let a=seed>>>0;return()=>{a+=0x6d2b79f5;let t=Math.imul(a^a>>>15,1|a);t^=t+Math.imul(t^t>>>7,61|t);return((t^t>>>14)>>>0)/4294967296}}
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
function background(c){const bg=c.createLinearGradient(0,0,540,960);bg.addColorStop(0,'#17243b');bg.addColorStop(.55,'#080f20');bg.addColorStop(1,'#15283a');c.fillStyle=bg;c.fillRect(0,0,540,960);const halo=c.createRadialGradient(270,390,10,270,390,340);halo.addColorStop(0,'#5a6f9550');halo.addColorStop(1,'#11182700');c.fillStyle=halo;c.fillRect(0,100,540,700);c.strokeStyle='#88b8dc10';c.lineWidth=1;for(let y=180;y<810;y+=60){c.beginPath();c.moveTo(25,y);c.lineTo(515,y);c.stroke()}const floor=c.createLinearGradient(0,770,0,920);floor.addColorStop(0,'#b6e8f52a');floor.addColorStop(1,'#101a2d00');c.fillStyle=floor;c.fillRect(20,770,500,150);c.strokeStyle='#d2edff55';c.beginPath();c.moveTo(25,770);c.lineTo(515,770);c.stroke()}
function sphere(c,x,y,r,color,alpha=1){c.save();c.globalAlpha=alpha;c.fillStyle='#00000040';c.beginPath();c.ellipse(x+5,773,r*.9,r*.21,0,0,TAU);c.fill();const g=c.createRadialGradient(x-r*.4,y-r*.48,r*.04,x+r*.15,y+r*.1,r*1.15);g.addColorStop(0,'#fff');g.addColorStop(.14,color);g.addColorStop(.62,color);g.addColorStop(1,'#182b49');c.fillStyle=g;c.shadowColor=color+'55';c.shadowBlur=12;c.beginPath();c.arc(x,y,r,0,TAU);c.fill();c.shadowBlur=0;c.strokeStyle='#ffffff8a';c.lineWidth=1;c.beginPath();c.arc(x-r*.15,y-r*.2,r*.68,3.5,5.2);c.stroke();c.restore()}
function rail(c,x1,y1,x2,y2,width=10){c.save();c.lineCap='round';c.strokeStyle='#00000070';c.lineWidth=width+8;c.beginPath();c.moveTo(x1+2,y1+5);c.lineTo(x2+2,y2+5);c.stroke();const g=c.createLinearGradient(x1,y1-6,x2+1,y2+6);g.addColorStop(0,'#d0e6ff');g.addColorStop(.45,'#4a6a8e');g.addColorStop(1,'#162a43');c.strokeStyle=g;c.lineWidth=width;c.beginPath();c.moveTo(x1,y1);c.lineTo(x2,y2);c.stroke();c.strokeStyle='#dffaff80';c.lineWidth=1;c.beginPath();c.moveTo(x1,y1-3);c.lineTo(x2,y2-3);c.stroke();c.restore()}
function label(c,meta,t,duration,caption){c.fillStyle='#a9c3d8';c.font='12px -apple-system,sans-serif';c.letterSpacing='1px';c.fillText('ORIGINAL / PHYSICS LAB',30,63);c.fillStyle='#9cf5ce';c.fillRect(30,85,42,2);if(caption){c.fillStyle='#081120be';c.fillRect(25,824,490,65);c.fillStyle='#effbff';c.font='bold 24px -apple-system,sans-serif';c.textAlign='center';c.fillText(meta.caption,270,865,470);c.textAlign='left'}c.fillStyle='#9cf5ce88';c.fillRect(30,908,480*clamp(t/duration,0,1),2)}
function lineCollision(b,line){const [ax,ay,bx,by]=line,dx=bx-ax,dy=by-ay,len2=dx*dx+dy*dy,u=clamp(((b.x-ax)*dx+(b.y-ay)*dy)/len2,0,1),px=ax+u*dx,py=ay+u*dy,vx=b.x-px,vy=b.y-py,d=Math.hypot(vx,vy);if(d<b.r+5&&d>0){const nx=vx/d,ny=vy/d,v=b.vx*nx+b.vy*ny;if(v<0){b.x=px+nx*(b.r+5);b.y=py+ny*(b.r+5);b.vx-=1.78*v*nx;b.vy-=1.78*v*ny;return Math.abs(v)}}return 0}
export function create(templateId,seed,options={}){
 const meta=templates.find(x=>x.id===templateId)||templates[0],mode=meta.motion,duration=options.duration||6,rng=random(seed),phase=rng()*TAU;
 const count=mode==='multiply'?18:mode==='elastic'?6:mode==='race'?10:mode==='sorting'?15:8;
 const bodies=Array.from({length:count},(_,i)=>({x:mode==='elastic'?80+i*68:90+rng()*360,y:mode==='elastic'?430+rng()*90:170+rng()*120,vx:(rng()-.5)*(mode==='elastic'?250:140),vy:rng()*35,r:mode==='gap'?13:mode==='elastic'?14+i*3:16+rng()*8,color:colors[i%5],born:mode==='multiply'?i*.20:mode==='sorting'?i*.13:0}));
 if(mode==='ring')for(let i=0;i<bodies.length;i++){const a=i*TAU/bodies.length+phase,r=50+rng()*65;bodies[i].x=270+Math.cos(a)*r;bodies[i].y=445+Math.sin(a)*r}
 let lines=[];if(mode==='maze')for(let i=0;i<4;i++)lines.push(i%2?[150,260+i*112,500,260+i*112]:[40,260+i*112,390,260+i*112]);
 if(mode==='funnel')lines=[[40,310,225,620],[500,310,315,620],[225,620,225,735],[315,620,315,735]];
 if(mode==='gap')lines=[[30,400,246,400],[294,400,510,400],[30,610,242,610],[298,610,510,610]];
 if(mode==='chainbounce')for(let i=0;i<6;i++)lines.push(i%2?[330,240+i*76,440,270+i*76]:[95,240+i*76,205,270+i*76]);
 if(mode==='survival')for(let i=0;i<7;i++){const a=i*TAU/7;lines.push([270+200*Math.cos(a),470+200*Math.sin(a),270+200*Math.cos(a+.5),470+200*Math.sin(a+.5)])}
 const frames=[],events=[];const fps=60,steps=Math.ceil(duration*120),physics=!['spiral','sorting'].includes(mode);
 function event(time,intensity,pitch){if(events.length<160&&(events.length===0||time-events.at(-1).time>.035))events.push({time,intensity:clamp(intensity/300,.08,.8),pitch})}
 for(let step=0;step<=steps;step++){
  const t=step/120;
  if(step%2===0)frames.push(bodies.map(b=>({x:b.x,y:b.y,r:b.r,color:b.color,visible:t>=b.born})));
  if(!physics)continue;
  const dynamic=lines.slice();
  if(mode==='paddles')for(let i=0;i<4;i++){const x=270+Math.sin(t*1.3+i)*115,y=270+i*110;dynamic.push([x-95,y-15*Math.cos(t+i),x+95,y+15*Math.cos(t+i)])}
  if(mode==='timing'){const shift=Math.sin(t*2+phase)*100;dynamic.push([30,390,225+shift,390],[315+shift,390,510,390])}
  if(mode==='race')for(let row=0;row<5;row++)for(let col=0;col<5;col++){const x=85+col*92+(row%2)*35,y=310+row*75;dynamic.push([x-3,y,x+3,y])}
  for(let i=0;i<bodies.length;i++){
   const b=bodies[i];if(t<b.born)continue;let ax=0,ay=mode==='elastic'?0:mode==='orbit'?0:440;
   if(mode==='magnetic'){const mx=270+Math.sin(t*1.6+phase)*120,my=440+Math.cos(t*1.1)*80,dx=mx-b.x,dy=my-b.y,d=Math.max(50,Math.hypot(dx,dy));ax+=dx/d*500;ay+=dy/d*500}
   if(mode==='orbit'){const dx=270-b.x,dy=455-b.y,d=Math.max(70,Math.hypot(dx,dy));ax=dx/d*220;ay=dy/d*220;if(step===0){b.vx=-(b.y-455)*.8;b.vy=(b.x-270)*.8}}
   b.vx+=ax/120;b.vy+=ay/120;b.vx=clamp(b.vx,-650,650);b.vy=clamp(b.vy,-650,650);b.x+=b.vx/120;b.y+=b.vy/120;
   if(b.x<25+b.r||b.x>515-b.r){b.x=clamp(b.x,25+b.r,515-b.r);b.vx*=-.92;event(t,Math.abs(b.vx),520+i*35)}
   if(b.y>755-b.r){b.y=755-b.r;b.vy=-Math.abs(b.vy)*(mode==='multiply'?.96:.83);event(t,Math.abs(b.vy),380+i*31)}
   if(b.y<135+b.r){b.y=135+b.r;b.vy=Math.abs(b.vy)}
   for(const line of dynamic){const impact=lineCollision(b,line);if(impact)event(t,impact,600+i*23)}
   if(mode==='ring'){
    const dx=b.x-270,dy=b.y-445,d=Math.hypot(dx,dy),ang=Math.atan2(dy,dx),gap=t*.75+phase,delta=Math.atan2(Math.sin(ang-gap),Math.cos(ang-gap));
    if(d>177-b.r&&d<194&&Math.abs(delta)>.30){const nx=dx/d,ny=dy/d,v=b.vx*nx+b.vy*ny;if(v>0){b.x=270+nx*(177-b.r);b.y=445+ny*(177-b.r);b.vx-=1.9*v*nx;b.vy-=1.9*v*ny;event(t,v,740+i*28)}}
   }
  }
  if(physics)for(let i=0;i<bodies.length;i++)for(let j=i+1;j<bodies.length;j++){
   const a=bodies[i],b=bodies[j];if(t<a.born||t<b.born)continue;const dx=b.x-a.x,dy=b.y-a.y,d=Math.hypot(dx,dy),sum=a.r+b.r;if(d>0&&d<sum){const nx=dx/d,ny=dy/d,over=(sum-d)/2;a.x-=nx*over;a.y-=ny*over;b.x+=nx*over;b.y+=ny*over;const v=(b.vx-a.vx)*nx+(b.vy-a.vy)*ny;if(v<0){a.vx+=v*nx;a.vy+=v*ny;b.vx-=v*nx;b.vy-=v*ny;event(t,Math.abs(v),480+i*18)}}
  }
 }
 if(mode==='sorting')for(let i=0;i<15;i++){const time=i*(.11+(seed%7)*.012)+2.6;if(time<=duration)events.push({time,intensity:.25,pitch:500+(i%3)*130})}
 if(mode==='spiral')for(let i=0;i<7;i++)for(let turn=1;turn<=3;turn++){const progress=(turn/3-i*.13)/.84;if(progress>=0&&progress<=1)events.push({time:progress*duration,intensity:.14,pitch:460+i*52})}
 events.sort((a,b)=>a.time-b.time);
 const visible=frames.flatMap(frame=>frame.filter(b=>b.visible));const bounds={minX:Math.min(...visible.map(b=>b.x-b.r)),maxX:Math.max(...visible.map(b=>b.x+b.r)),minY:Math.min(...visible.map(b=>b.y-b.r)),maxY:Math.max(...visible.map(b=>b.y+b.r))};
 return {metadata:meta,eventsBetween(a,b){return events.filter(e=>e.time>a&&e.time<=b)},stats:{bodyCount:count,eventCount:events.length,trajectoryBounds:bounds,solver:'fixed 120Hz 2D'},draw(c,w,h,time,dt,caption){
  const t=clamp(time,0,duration),p=t/duration;c.save();c.scale(w/540,h/960);background(c);
  // A restrained breathing camera remains deterministic and keeps all objects in safe margins.
  c.save();const zoom=1+.015*Math.sin(p*Math.PI);c.translate(270,450);c.scale(zoom,zoom);c.translate(-270,-450);
  if(mode==='ring'){c.save();c.translate(270,445);c.rotate(t*.75+phase);c.strokeStyle='#89dbeccc';c.shadowBlur=14;c.shadowColor='#8ddefb';c.lineWidth=10;c.beginPath();c.arc(0,0,182,.30,TAU-.30);c.stroke();c.shadowBlur=0;c.strokeStyle='#efffff';c.lineWidth=2;c.beginPath();c.arc(0,0,177,.30,TAU-.30);c.stroke();c.restore()}
  for(const line of lines)rail(c,...line);
  if(mode==='race')for(let row=0;row<5;row++)for(let col=0;col<5;col++)sphere(c,85+col*92+(row%2)*35,310+row*75,6,'#b7c7db');
  if(mode==='paddles')for(let i=0;i<4;i++){const x=270+Math.sin(t*1.3+i)*115,y=270+i*110;rail(c,x-95,y-15*Math.cos(t+i),x+95,y+15*Math.cos(t+i),12)}
  if(mode==='timing'){const shift=Math.sin(t*2+phase)*100;rail(c,30,390,225+shift,390,16);rail(c,315+shift,390,510,390,16);c.fillStyle='#9bffd2';c.fillRect(253+shift,372,34,3)}
  if(mode==='magnetic'||mode==='orbit'){const x=mode==='orbit'?270:270+Math.sin(t*1.6+phase)*120,y=mode==='orbit'?455:440+Math.cos(t*1.1)*80;c.strokeStyle='#aa9eff44';for(let r=45;r<150;r+=30){c.beginPath();c.arc(x,y,r,0,TAU);c.stroke()}sphere(c,x,y,25,'#c0b0ff')}
  if(mode==='spiral'){
   for(let back=0;back<2;back++)for(let i=0;i<150;i++){const a=i/149*TAU*3+phase,y=220+i/149*470,x=270+Math.sin(a)*155,depth=Math.cos(a);if((depth<0)!==(back===0))continue;rail(c,x,y,x+Math.cos(a)*7,y+3,5)}
   for(let i=0;i<7;i++){const q=(p*.84+i*.13)%1,a=q*TAU*3+phase;sphere(c,270+Math.sin(a)*155,220+q*470,13+Math.cos(a)*3,colors[i%5])}
  }else if(mode==='sorting'){
   for(let i=0;i<3;i++){const x=100+i*170+Math.sin(phase+i)*14;rail(c,x-60,685,x-60,755,6);rail(c,x+60,685,x+60,755,6);rail(c,x-60,755,x+60,755,6);c.fillStyle=colors[i]+'22';c.fillRect(x-55,705,110,45)}
   for(let i=0;i<15;i++){const q=clamp((t-i*(.11+(seed%7)*.012))/2.6,0,1),k=i%3,start=270+Math.sin(phase)*45,target=100+k*170+Math.sin(phase+k)*14,x=start+(target-start)*(q*q*(3-2*q)),y=170+q*550-(i%5)*9*q;sphere(c,x,y,12,colors[k])}
  }else{
   const ix=clamp(Math.floor(t*fps),0,frames.length-1),next=Math.min(ix+1,frames.length-1),f=t*fps-ix;
   for(let i=0;i<count;i++){const a=frames[ix][i],b=frames[next][i];if(!a.visible)continue;sphere(c,a.x+(b.x-a.x)*f,a.y+(b.y-a.y)*f,a.r,a.color)}
  }
  c.restore();label(c,meta,t,duration,caption);c.restore();
 }};
}
