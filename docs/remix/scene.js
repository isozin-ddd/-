import {createCustomScene} from '../custom-physics.js';
import {validateDesign,ARCHETYPES} from './design.js';
export function createRemixScene(raw){
 const d=validateDesign(raw),base={...d.custom},a=ARCHETYPES.find(a=>a.id===d.archetype);let phase=0,best=null,crossings=0,previous=new Map(),state=null;
 const palettes={midnight:['#121b34','#050917'],aurora:['#103934','#071321'],ember:['#35212c','#100b20']},palette=palettes[d.stage?.background]||palettes.midnight;
 const physical=createCustomScene(d.custom,{background(ctx){const g=ctx.createLinearGradient(0,0,540,960);g.addColorStop(0,palette[0]);g.addColorStop(1,palette[1]);ctx.fillStyle=g;ctx.fillRect(0,0,540,960);ctx.strokeStyle='#b1dcd91a';ctx.lineWidth=1;for(let x=30;x<540;x+=40){ctx.beginPath();ctx.moveTo(x,125);ctx.lineTo(x,785);ctx.stroke()}ctx.strokeStyle='#a5d4d444';ctx.strokeRect(24,125,492,660)},onStep(s){
  const {time,balls,walls,rings,config:c}=s;if(time<=s.step*1.1){best=null;crossings=0;previous=new Map()}
  phase=d.timeline.filter(e=>e.at<=time).at(-1)?.phase||0;const p=phase/(d.timeline.length-1),mid=time>=d.duration*.28;
  c.gravity=base.gravity;c.gravityDirection=base.gravityDirection;c.restitution=base.restitution;c.gapWidth=base.gapWidth;c.multiplyOnHit=false;c.mergeBalls=false;c.breakWalls=false;c.wallMoveSpeed=0;c.wallRotation=0;
  switch(d.rule){case'opening':c.gapWidth=Math.min(160,base.gapWidth+phase*10);rings.forEach((r,i)=>r.angle=base.gapPosition+(i%2?-1:1)*base.ringRotation*time);break;
   case'tide':c.gravityDirection=base.gravityDirection+phase*65;c.gravity=base.gravity*(1+p);break;
   case'multiply':c.multiplyOnHit=mid&&time<d.duration*.85;c.multiplyCount=1;break;
   case'merge':c.mergeBalls=mid;c.gravityDirection=90;c.gravity=50;break;
   case'race':rings.forEach((r,i)=>r.angle=base.gapPosition+(i%2?-1:1)*(mid?-1:1)*base.ringRotation*time);c.gravity=20;break;
   case'obstacles':walls.forEach((w,i)=>w.broken=i/Math.max(1,walls.length)>.25+p*.75);break;
   case'break':c.breakWalls=mid;c.restitution=.99;if(mid)walls.forEach(w=>w.health=Math.min(w.health,60));break;
   case'pendulum':walls.forEach((w,i)=>{w.angle=w.baseAngle+Math.sin(time*(.6+p)+i)*35;w.x=Math.max(50,Math.min(490,w.baseX+Math.sin(time+i)*35))});break;
   case'reverse':c.gravityDirection=phase%2?270:90;c.gravity=base.gravity*(1+p*.5);break;
   case'pulse':c.restitution=Math.min(1.12,.82+phase*.04);c.gravityDirection=base.gravityDirection+phase*40;break;
  }
  const center=d.custom.stage.ringCenter;for(const b of balls){const radial=Math.hypot(b.x-center.x,b.y-center.y),old=previous.get(b.id);if(old!==undefined&&old<base.ringRadius&&radial>=base.ringRadius)crossings++;previous.set(b.id,radial);const value=d.rule==='merge'?b.mass:d.rule==='tide'?b.y:d.rule==='pendulum'?-b.y:d.rule==='reverse'?-radial:d.rule==='pulse'?.5*b.mass*(b.vx*b.vx+b.vy*b.vy):radial;if(!best||value>best.value)best={id:b.id,value}}
  state={phase,time,crossings,best:best?{...best}:null,ballCount:balls.length,brokenWalls:walls.filter(w=>w.broken).length,goal:d.ending};
 }});
 function draw(ctx,w,h,t,dt,caption){ctx.save();if(d.stage?.camera==='slow_zoom'){const z=1+.035*Math.min(1,t/d.duration);ctx.translate(w/2,h/2);ctx.scale(z,z);ctx.translate(-w/2,-h/2)}physical.draw(ctx,w,h,Math.min(t,d.duration),dt,false);ctx.restore();ctx.save();ctx.scale(w/540,h/960);ctx.fillStyle=palette[0];ctx.fillRect(20,30,500,79);ctx.fillStyle='#d8fff5';ctx.font='bold 19px -apple-system,sans-serif';ctx.fillText(a.name.toUpperCase(),30,61,480);ctx.font='12px -apple-system,sans-serif';ctx.fillStyle='#a9bcd1';ctx.fillText(`${physical.stats.ballCount} balls · ${physical.stats.wallCount} walls · ${physical.stats.ringCount} rings`,30,88);
 const event=d.timeline.filter(e=>e.at<=t).at(-1)||d.timeline[0],final=t>=d.duration*.9;ctx.fillStyle='#060c1bdf';ctx.fillRect(25,805,490,105);ctx.fillStyle=final?'#ffc79c':'#9af4d3';ctx.font='bold 18px -apple-system,sans-serif';if(caption)ctx.fillText(final?'RESULT / '+d.ending.toUpperCase():event.label.toUpperCase(),40,838,460);ctx.font='14px -apple-system,sans-serif';ctx.fillStyle='#edf6ff';const value=d.rule==='multiply'?physical.stats.ballCount:d.rule==='break'?physical.stats.brokenWallCount:d.rule==='obstacles'?crossings:best?Math.round(best.value*10)/10:0;ctx.fillText(final?`${best?.id||'No leader'} · measured ${value}`:`PHASE ${phase+1} / ${d.timeline.length} · ${Math.max(0,d.duration-t).toFixed(1)}s`,40,868,460);ctx.fillStyle='#5ee9c1';ctx.fillRect(40,888,460*Math.min(1,t/d.duration),3);ctx.restore();}
 return {draw,stats:physical.stats,getState:()=>({...physical.getState(),remix:state}),eventsBetween(from,to){const e=physical.eventsBetween(from,to).map((e,i)=>({...e,pitch:d.sound.base*(d.sound.scale==='major'?[1,1.125,1.25,1.5,1.875]:[1,1.125,1.25,1.5,1.667])[(Math.abs(e.ring||0)+i)%5]}));return [...e,...d.timeline.filter(p=>p.at>from&&p.at<=to).map(p=>({time:p.at,type:p.at>=d.duration*.9?'goal':'phase',pitch:d.sound.base*(1+p.phase*.12),intensity:.7}))]},design:d};
}
