// Original seeded, fixed-step simulation. No downloaded media or music.
export const VERSION='viral-3';
const TAU=Math.PI*2, H=1/120, palette=['#62ffda','#bd86ff','#ffcf69','#ff6aa9','#6abaff'];
const specs=[
['escape','Neon Ring Escape','Can It Escape?','Break three rotating rings through their openings.'],
['multiply','Ball Multiplication Challenge','What Happens at 32?','Each wall impact splits a ball. Gather 32 to unlock the exit.'],
['center','Reach the Center','Can It Reach the Center?','Cross nested rotating gates into the central target.'],
['last','Last Ball Standing','Only One Survives!','A contracting arena eliminates marbles at its edge. Last survivor wins.'],
['color','Color Gate Survival','Which Color Escapes?','Only the matching color can pass each changing gate.'],
['spiral','Infinite Spiral Drop','Follow the Spiral!','A marble rolls down a constrained helical rail under projected gravity.'],
['gravity','Gravity Switch','Which Way Is Down?','Every ring break turns gravity by 90 degrees.'],
['fusion','Ball Fusion Challenge','Will They All Merge?','Ten attracting marbles conserve area and momentum when they fuse.'],
['destroy','Ring Destruction','Can It Break Them All?','Solid rings crack after three physical impacts.'],
['timing','Perfect Timing Escape','Wait for the Beat!','A rotating gate opens for one quarter of each beat.'],
['oneexit','100 Balls One Exit','100 Balls. One Exit.','One hundred tiny marbles compete for one narrow opening.'],
['magnetic','Magnetic Chaos','Can It Beat the Magnet?','A moving magnet bends the ball around off-center gates.'],
['shrink','Shrinking Arena','How Small Can It Get?','The arena contracts. Center target unlocks after 65% of the stage.'],
['reverse','Reverse Gravity','Escape Through the Top!','Upward gravity feeds a rotating top exit.'],
['race','Rainbow Marble Race','Which Ball Wins?','Five separated peg lanes produce a seeded race to the finish.'],
['chain','Chain Reaction Rings','Will They All Fall?','Breaking a ring triggers a delayed cascade through its neighbors.'],
['split','Split and Survive','One Ball. Many Chances.','Each cleared ring splits the moving ball into two.'],
['impossible','Impossible Center','Can It Find the Path?','Offset nested gates and orbiting bumpers guard a small target.'],
['transform','Final Ball Transformation','Watch the Final Ball!','The last ring transforms the marble into a larger golden sphere.'],
['ultimate','Ultimate Ring Challenge','Can It Beat All Three?','Bumpers, a pulsing ring, a timed gate and one bonus ring on passage.']
];
export const templates=specs.map(([mode,name,caption,description])=>({id:'viral-'+mode,genre:'viral',mode,name,caption,description,hook:caption,loop:'resolved ending',ending:'Visible success or honest timeout',originality:'Original procedural stage and synthesized audio'}));
function rng(seed){let a=seed>>>0;return()=>{a+=0x6d2b79f5;let t=Math.imul(a^a>>>15,1|a);t^=t+Math.imul(t^t>>>7,61|t);return((t^t>>>14)>>>0)/4294967296}}
const clamp=(x,a,b)=>Math.max(a,Math.min(b,x)),angle=x=>Math.atan2(Math.sin(x),Math.cos(x));
export class World{
 constructor(mode,seed,duration=15){this.rootMode=mode;this.mode=mode;this.seed=seed;this.duration=duration;this.random=rng(seed);this.time=0;this.tick=0;this.events=[];this.balls=[];this.particles=[];this.hits=0;this.cleared=0;this.outcome='';this.chapter=-1;this.nextId=0;this.maxBalls=32;this.setup(0);}
 spawn(x,y,r=9){const a=this.random()*TAU;const b={id:this.nextId++,x,y,px:x,py:y,vx:Math.cos(a)*180,vy:Math.sin(a)*180,r,color:palette[this.nextId%5],spin:a,trail:[],cooldown:0,escaped:false};this.balls.push(b);return b;}
 setup(chapter){this.mode=this.chapters>1?[this.rootMode,'gravity','fusion','ultimate'][chapter%4]:this.rootMode;this.chapter=chapter;this.won=false;this.balls=[];this.rings=[];this.chapterEnd=(chapter+1)*this.duration/this.chapters;this.outcome='';const inward=['center','impossible'].includes(this.mode);const n=inward?4:this.mode==='oneexit'||this.mode==='last'||this.mode==='shrink'||this.mode==='fusion'||this.mode==='timing'||this.mode==='reverse'?1:this.mode==='race'||this.mode==='spiral'?0:3;this.cascade=0;this.extraRing=false;this.stageCleared=0;this.eliminated=0;this.obstacles=[];
 for(let i=0;i<n;i++)this.rings.push({r:inward?70+i*43:115+i*42,a:this.random()*TAU,speed:(i%2?-.45:.55)*(1+chapter*.2),gap:.72,broken:false});
 this.spawn(inward?475:270,inward?470:420);
 this.maxBalls=this.mode==='oneexit'?100:this.mode==='split'?16:32;
 if(['last','color','fusion','oneexit','race'].includes(this.mode)){this.balls=[];const n={last:12,color:5,fusion:10,oneexit:100,race:5}[this.mode];for(let i=0;i<n;i++){const a=i*TAU/n;const b=this.spawn(this.mode==='race'?70+i*100:270+Math.cos(a)*(this.mode==='oneexit'?110:80),this.mode==='race'?215:470+Math.sin(a)*80,this.mode==='oneexit'?4:this.mode==='fusion'?8:9);if(this.mode==='race'){b.vx=0;b.vy=this.random()*30;b.lane=i;}}}
 if(this.mode==='race')for(let lane=0;lane<5;lane++)for(let row=0;row<5;row++)this.obstacles.push({x:70+lane*100+(row%2?18:-18),y:320+row*78,r:8});
 if(this.mode==='spiral'){this.trackU=0;this.trackSpeed=80+this.random()*30;this.balls[0].x=270;this.balls[0].y=220;}
 if(this.mode==='impossible'||this.mode==='ultimate')for(let i=0;i<3;i++)this.obstacles.push({x:270,y:470,r:13,orbit:110+i*30,phase:i*2.1});
 if(this.mode==='impossible'||this.mode==='magnetic')this.rings.forEach((q,i)=>{q.cx=270+Math.sin(i+1)*18;q.cy=470+Math.cos(i+1)*18});
 if(['oneexit','last','shrink','fusion','reverse'].includes(this.mode))this.rings[0].r=210;
 if(this.mode==='oneexit')this.rings[0].gap=.33;
 if(this.mode==='reverse')this.rings[0].a=-Math.PI/2;
 }
 goal(message,b){if(this.won)return;this.won=true;this.outcome=message;this.emit(b,350,0,'goal');}

 get chapters(){return this.duration>=61?Math.ceil(this.duration/23):1;}
 emit(b,intensity,ring=0,type='hit'){if(this.events.length&&this.time-this.events.at(-1).time<.025&&type==='hit')return;this.events.push({time:this.time,intensity:clamp(intensity/350,.1,1),ring,type,pitch:261.63*[1,1.125,1.25,1.5,1.667][(ring+b.id)%5]*(type==='goal'?2:1)});if(this.events.length>400)this.events.shift();for(let k=0;k<5;k++){const a=this.random()*TAU;this.particles.push({x:b.x,y:b.y,vx:Math.cos(a)*90,vy:Math.sin(a)*90,life:.4,color:b.color})}}
 step(){this.tick++;this.time=this.tick*H;const chapter=Math.min(this.chapters-1,Math.floor(this.time/(this.duration/this.chapters)));if(chapter!==this.chapter)this.setup(chapter);
 const progress=(this.time-this.chapter*this.duration/this.chapters)/(this.duration/this.chapters),final=progress>.84;
 for(let i=0;i<this.rings.length;i++){const ring=this.rings[i];ring.a+=ring.speed*H;ring.gap=final?3.4:1.3+Math.sin(this.time*Math.PI)*.1;
 if(this.mode==='oneexit')ring.gap=.33;if(this.mode==='last'||this.mode==='fusion'||this.mode==='destroy'||this.mode==='shrink')ring.gap=0;
 if(this.mode==='last'||this.mode==='shrink')ring.r=210-150*clamp(progress,0,1);
 if(this.mode==='ultimate'&&i===1)ring.r=157+Math.sin(this.time*2)*15;
 if(this.mode==='timing'||this.mode==='ultimate'&&i===2)ring.gap=(this.time%1)<.25?1.6:0;
 if(this.mode==='color')ring.allowed=Math.floor(this.time/2+i)%5;
 }
 for(const q of this.obstacles)if(q.orbit){q.x=270+Math.cos(this.time*.7+q.phase)*q.orbit;q.y=470+Math.sin(this.time*.7+q.phase)*q.orbit;}
 if(this.mode==='chain'&&this.cascade&&this.time>=this.cascade){const q=this.rings.find(q=>!q.broken);if(q){q.broken=true;this.cleared++;this.emit(this.balls[0],250,this.cleared,'break');this.cascade=this.time+.45;}else this.cascade=0;}

 for(const b of [...this.balls]){b.px=b.x;b.py=b.y;b.cooldown=Math.max(0,b.cooldown-H);if(b.escaped||b.finished)continue;
 if(this.mode==='spiral'){const u=this.trackU,r=170*(1-u*.3),a=u*TAU*3,dx=TAU*3*Math.cos(a)*r-51*Math.sin(a),dy=530,arc=Math.hypot(dx,dy);this.trackSpeed=Math.min(450,this.trackSpeed+800*dy/arc*H);this.trackU=Math.min(1,u+this.trackSpeed/arc*H);b.x=270+Math.sin(this.trackU*TAU*3)*170*(1-this.trackU*.3);b.y=220+this.trackU*530;b.spin+=this.trackSpeed*H/b.r;if(this.trackU>=1){this.goal('SPIRAL CLEARED!',b);b.finished=true;}if(this.tick%4===0){b.trail.push([b.x,b.y]);if(b.trail.length>12)b.trail.shift();}continue;}
 let ax=0,ay=this.chapter%2?-160:160;if(this.chapter>=2){ax=Math.sin(this.time)*150;ay+=Math.cos(this.time*.6)*100;}
 if(['center','impossible','fusion','shrink','magnetic'].includes(this.mode)){const d=Math.hypot(270-b.x,470-b.y)||1;const targetX=this.mode==='magnetic'?270+Math.sin(this.time)*100:270,targetY=this.mode==='magnetic'?470+Math.cos(this.time*.8)*95:470;const tangent=['center','impossible'].includes(this.mode)?125:0;
 ax=(targetX-b.x)/d*180-(470-b.y)/d*tangent;ay=(targetY-b.y)/d*180+(270-b.x)/d*tangent;}
 if(this.mode==='reverse')ay=-220;
 if(this.mode==='gravity'){const turn=this.stageCleared*Math.PI/2;ax=Math.sin(turn)*230;ay=Math.cos(turn)*230;}
 b.vx=(b.vx+ax*H)*.9998;b.vy=(b.vy+ay*H)*.9998;const speed=Math.hypot(b.vx,b.vy);if(speed>390){b.vx*=390/speed;b.vy*=390/speed}if(this.mode==='fusion'){b.vx*=.98;b.vy*=.98;}b.x+=b.vx*H;b.y+=b.vy*H;b.spin+=b.vx*H/b.r;
 for(let i=0;i<this.rings.length;i++){const q=this.rings[i];if(q.broken)continue;const cx=q.cx||270,cy=q.cy||470,dx=b.x-cx,dy=b.y-cy,d=Math.hypot(dx,dy)||1,old=Math.hypot(b.px-cx,b.py-cy),inside=old<q.r,gap=(this.mode!=='color'||palette.indexOf(b.color)===q.allowed)&&Math.abs(angle(Math.atan2(dy,dx)-q.a))<q.gap/2-b.r/q.r;
 if((old-q.r)*(d-q.r)<=0&&gap){if(!['center','impossible'].includes(this.mode)||d<old){
 if(this.mode==='oneexit'||this.mode==='color'||this.mode==='reverse'){b.escaped=true;this.goal(this.mode==='color'?'MATCHING COLOR ESCAPED!':this.mode==='oneexit'?'FIRST OF 100 ESCAPED!':'TOP EXIT REACHED!',b);}
 else{q.broken=true;this.cleared++;this.stageCleared++;this.emit(b,300,i,'break');if(this.mode==='ultimate'&&!this.extraRing){this.extraRing=true;this.rings.push({r:235,a:this.random()*TAU,speed:-.65,gap:1.3,broken:false});}if(this.mode==='chain')this.cascade=this.time+.45;if(this.mode==='split'&&this.balls.length<this.maxBalls){const child=this.spawn(b.x,b.y,7);child.vx=-b.vx;child.vy=b.vy;}
 if(this.mode==='transform'&&this.rings.filter(r=>!r.broken).length===1){b.r=21;b.color='#ffcf69';this.emit(b,350,i,'transform');}}
 }continue;}
 if(Math.abs(d-q.r)<b.r+3&&!gap){if(this.mode==='last'&&progress>.08&&this.balls.filter(x=>!x.dead).length>1){b.dead=true;this.eliminated++;this.emit(b,200,i,'eliminate');continue;}const nx=dx/d,ny=dy/d,normal=b.vx*nx+b.vy*ny;if((inside&&normal>0)||(!inside&&normal<0)){b.x=cx+nx*(q.r+(inside?-1:1)*(b.r+3));b.y=cy+ny*(q.r+(inside?-1:1)*(b.r+3));b.vx-=1.94*normal*nx;b.vy-=1.94*normal*ny;this.hit(b,Math.abs(normal),i);if(this.mode==='destroy'){q.damage=(q.damage||0)+1;if(q.damage>=3){q.broken=true;this.stageCleared++;this.emit(b,300,i,'break');}}}}
 }
 if(this.mode==='multiply'&&this.balls.length>=32&&b.y>815){b.escaped=true;continue;}
 if(this.mode==='shrink'&&progress<=.65){const dx=b.x-270,dy=b.y-470,d=Math.hypot(dx,dy)||1;if(d<39){const v=(b.vx*dx+b.vy*dy)/d;b.x=270+dx/d*39;b.y=470+dy/d*39;if(v<0){b.vx-=1.9*v*dx/d;b.vy-=1.9*v*dy/d;this.hit(b,-v,2)}}}
 for(const q of this.obstacles){const dx=b.x-q.x,dy=b.y-q.y,d=Math.hypot(dx,dy)||1;if(d<b.r+q.r){const nx=dx/d,ny=dy/d,v=b.vx*nx+b.vy*ny;b.x=q.x+nx*(b.r+q.r);b.y=q.y+ny*(b.r+q.r);if(v<0){b.vx-=1.9*v*nx;b.vy-=1.9*v*ny;this.hit(b,-v,2)}}}
 if(this.mode==='race'){const left=25+b.lane*100+b.r,right=115+b.lane*100-b.r;if(b.x<left||b.x>right){b.x=clamp(b.x,left,right);b.vx*=-.9;}if(b.y>748)this.goal('LANE '+(b.lane+1)+' WINS!',b);}
 if(this.mode==='spiral'&&b.y>745)this.goal('SPIRAL CLEARED!',b);
 for(const [axis,lo,hi] of [['x',30+b.r,510-b.r],['y',185+b.r,780-b.r]])if((b[axis]<lo||b[axis]>hi)&&!(axis==='y'&&b.y>hi&&this.mode==='multiply'&&this.balls.length>=32)){b[axis]=clamp(b[axis],lo,hi);b[axis==='x'?'vx':'vy']*=-.96;this.hit(b,200,0)}
 const d=Math.hypot(b.x-270,b.y-470);if(['center','impossible','shrink'].includes(this.mode)&&d<29&&(this.mode!=='shrink'||progress>.65)||this.mode==='escape'&&this.rings.every(q=>q.broken)||this.mode==='multiply'&&this.balls.length>=32){this.outcome=['center','impossible','shrink'].includes(this.mode)?'CENTER REACHED!':this.mode==='multiply'?'32 BALLS • GATE UNLOCKED!':'ESCAPED!';if(!this.won){this.won=true;if(['center','impossible','shrink'].includes(this.mode)){b.x=270;b.y=470;b.vx=b.vy=0;b.finished=true;b.trail=[];}this.emit(b,350,0,'goal')}}
 if(this.tick%4===0){b.trail.push([b.x,b.y]);if(b.trail.length>12)b.trail.shift();}
 }
 // Pairwise impulse with inverse mass and positional correction. Bounded population.
 for(let i=0;i<this.balls.length;i++)for(let j=i+1;j<this.balls.length;j++){const a=this.balls[i],b=this.balls[j];if(a.dead||b.dead||a.escaped||b.escaped)continue;const dx=b.x-a.x,dy=b.y-a.y,d=Math.hypot(dx,dy),sum=a.r+b.r;if(d<sum&&d>.0001){if(this.mode==='fusion'&&!a.dead&&!b.dead){const ma=a.r*a.r,mb=b.r*b.r;a.vx=(a.vx*ma+b.vx*mb)/(ma+mb);a.vy=(a.vy*ma+b.vy*mb)/(ma+mb);a.x=(a.x*ma+b.x*mb)/(ma+mb);a.y=(a.y*ma+b.y*mb)/(ma+mb);a.r=Math.sqrt(ma+mb);b.dead=true;this.emit(a,200,2,'merge');continue;}const nx=dx/d,ny=dy/d,over=(sum-d)/2;a.x-=nx*over;a.y-=ny*over;b.x+=nx*over;b.y+=ny*over;const v=(b.vx-a.vx)*nx+(b.vy-a.vy)*ny;if(v<0){const impulse=-.96*v;a.vx-=impulse*nx;a.vy-=impulse*ny;b.vx+=impulse*nx;b.vy+=impulse*ny;this.emit(a,-v,1)}}}
 for(const p of this.particles){p.x+=p.vx*H;p.y+=p.vy*H;p.life-=H}this.particles=this.particles.filter(p=>p.life>0).slice(-100);
 this.balls=this.balls.filter(b=>!b.dead);
 if(this.mode==='last'&&this.balls.length===1)this.goal('LAST BALL STANDING!',this.balls[0]);
 if(this.mode==='fusion'&&this.balls.length===1)this.goal('ALL TEN MERGED!',this.balls[0]);
 if(['gravity','destroy','timing','chain','split','transform','ultimate','magnetic'].includes(this.mode)&&this.rings.every(q=>q.broken))this.goal('CHALLENGE CLEARED!',this.balls[0]);
 if(progress>=.94&&!this.outcome)this.outcome='TIME UP • TRY ANOTHER SEED';
 }
 hit(b,v,i){this.hits++;this.emit(b,v,i);if(this.mode==='multiply'&&this.balls.length<this.maxBalls&&!b.cooldown){b.cooldown=.35;const c=this.spawn(b.x,b.y,7);c.x+=18;c.vx=-b.vy;c.vy=b.vx;c.cooldown=.35;}}
 advance(t){const target=Math.floor(clamp(t,0,this.duration)/H);while(this.tick<target)this.step();}
}
export function create(id,seed,options={}){const meta=templates.find(t=>t.id===id)||templates[0],duration=options.duration||15;let w=new World(meta.mode,seed,duration),quality=1,slow=0;
 return {get world(){return w},eventsBetween(a,b){return w.events.filter(e=>e.time>a&&e.time<=b)},draw(c,width,height,t,dt,caption=true){const started=performance.now();if(t<w.time-H)w=new World(meta.mode,seed,duration);w.advance(t);c.save();c.scale(width/540,height/960);c.fillStyle='#050711';c.fillRect(0,0,540,960);const halo=c.createRadialGradient(270,470,10,270,470,300);halo.addColorStop(0,'#202249');halo.addColorStop(1,'#050711');c.fillStyle=halo;c.fillRect(0,160,540,650);
 c.save();const zoom=1+.018*Math.sin(t*.5);c.translate(270,470);c.scale(zoom,zoom);c.translate(-270,-470);
 for(let i=0;i<w.rings.length;i++){const r=w.rings[i];if(r.broken)continue;c.strokeStyle=palette[r.allowed??i%5];c.shadowColor=c.strokeStyle;c.shadowBlur=quality?18:0;c.lineWidth=5;c.lineCap='round';c.beginPath();c.arc(r.cx||270,r.cy||470,r.r,r.a+r.gap/2,r.a+TAU-r.gap/2);c.stroke();}
 c.shadowBlur=0;if(w.mode==='spiral'){c.strokeStyle='#bd86ff';c.lineWidth=4;c.beginPath();for(let i=0;i<=160;i++){const u=i/160,x=270+Math.sin(u*TAU*3)*170*(1-u*.3),y=220+u*530;if(i)c.lineTo(x,y);else c.moveTo(x,y);}c.stroke();}
 for(const q of w.obstacles){c.fillStyle='#8ba0d8';c.beginPath();c.arc(q.x,q.y,q.r,0,TAU);c.fill();}if(w.mode==='race'){c.strokeStyle='#62ffda44';c.lineWidth=1;for(let i=0;i<=5;i++){c.beginPath();c.moveTo(20+i*100,200);c.lineTo(20+i*100,760);c.stroke()}c.strokeStyle='#fff';c.beginPath();c.moveTo(20,750);c.lineTo(520,750);c.stroke();}
 if(w.mode==='multiply'){c.strokeStyle=w.balls.length>=32?'#62ffda':'#ff6aa9';c.lineWidth=5;c.beginPath();c.moveTo(45,780);c.lineTo(w.balls.length>=32?160:495,780);if(w.balls.length>=32){c.moveTo(380,780);c.lineTo(495,780)}c.stroke();}
 if(['center','impossible','shrink'].includes(w.mode)){c.strokeStyle='#62ffda';c.lineWidth=2;c.beginPath();c.arc(270,470,28,0,TAU);c.stroke();c.fillStyle='#62ffda';c.font='10px sans-serif';c.textAlign='center';c.fillText('GOAL',270,474)}
 for(const b of w.balls){if(b.escaped)continue;if(quality){c.strokeStyle=b.color+'44';c.lineWidth=b.r;c.beginPath();b.trail.forEach(([x,y],i)=>i?c.lineTo(x,y):c.moveTo(x,y));c.stroke();}const g=c.createRadialGradient(b.x-b.r*.35,b.y-b.r*.4,0,b.x,b.y,b.r);g.addColorStop(0,'#ffffff');g.addColorStop(.3,b.color);g.addColorStop(1,'#152039');c.fillStyle=g;c.shadowColor=b.color;c.shadowBlur=quality?15:0;c.beginPath();c.arc(b.x,b.y,b.r,0,TAU);c.fill();c.shadowBlur=0;c.strokeStyle='#ffffff77';c.beginPath();c.arc(b.x,b.y,b.r*.65,b.spin,b.spin+1.4);c.stroke();}
 for(const p of w.particles){c.globalAlpha=p.life/.4;c.fillStyle=p.color;c.fillRect(p.x,p.y,3,3)}c.globalAlpha=1;c.restore();c.textAlign='center';c.fillStyle='#9da5c5';c.font='12px sans-serif';c.fillText('VIRAL BOUNCING BALL / ORIGINAL',270,62);if(caption){c.fillStyle='#f5f7ff';c.font='bold 29px sans-serif';c.fillText(t<3?meta.caption:w.outcome||(templates.find(x=>x.mode===w.mode)||meta).name,270,112,490)}c.fillStyle='#62ffda';c.font='15px sans-serif';c.fillText(`STAGE ${w.chapter+1}/${w.chapters}   •   ${w.balls.length} BALLS   •   ${w.hits} HITS`,270,831);c.fillStyle='#a1a9cb';c.font='13px sans-serif';c.fillText(w.outcome||(templates.find(x=>x.mode===w.mode)||meta).description,270,870,480);c.fillStyle='#62ffda';c.fillRect(30,910,480*Math.min(1,t/duration),3);c.restore();if(performance.now()-started>22)slow++;if(slow>15)quality=0;}};
}
