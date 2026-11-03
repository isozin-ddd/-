// Original procedural studio studies. Jelly, glass and liquid are visual approximations.
const TAU=Math.PI*2, COLORS=['#75d9cf','#f7adbc','#b9a3ed','#f4cb85','#91bde8'];
const defs=[
 ['jelly-compression','Jelly Compression','Watch it bounce back','A translucent jelly block compresses under a floating glass press.','compression','seamless',[.5]],
 ['glass-cutting','Prism Cut','A clean cut, a new color','A luminous cutting plane separates a glass prism into offset slices.','cut','reset',[.32,.5,.68]],
 ['color-mixing','Chromatic Confluence','Two colors, one perfect blend','Three liquid-like translucent lobes converge and separate on a ceramic dish.','mix','seamless',[.5]],
 ['smooth-ripple','Porcelain Ripple','One drop. Endless circles.','An isolated falling droplet opens concentric luminous rings in a shallow pool.','ripple','reset',[.16]],
 ['soft-deformation','Soft Sculpture','Softness in slow motion','A soft torus deforms through a moving circular aperture.','deform','seamless',[.25,.75]],
 ['liquid-gradient','Gradient Pour','Follow the color','A continuous ribbon of gradient liquid curls into a sculpted vessel.','pour','seamless',[.25,.75]],
 ['bubble-popping','Glass Bubble Garden','Wait for the last bubble','An ordered garden of translucent bubbles pops in a diagonal traveling wave.','bubble','reset',[.14,.205,.27,.335,.4,.465,.53,.595,.66,.725,.79,.855]],
 ['particle-flow','Silk Particle Flow','Everything finds its path','Glowing bead-like particles flow through interwoven curved channels.','flow','reset',[.25,.75]],
 ['perfect-slicing','Layered Slices','Every slice fits','A layered rounded loaf separates into a perfectly spaced accordion stack.','slice','seamless',[.2,.35,.5,.65,.8]],
 ['symmetry-arrangement','Petal Alignment','Almost aligned...','Glossy petal tiles rotate into a precisely symmetric flower and disperse.','symmetry','seamless',[.5]],
 ['crystal-formation','Crystal Bloom','A tiny spark becomes a crystal','A transparent faceted crystal grows radially from a single glowing nucleus.','crystal','reset',[.18,.34,.5,.66,.82]],
 ['melting-shapes','Wax to Water','Nothing stays sharp','A polished cube rounds, collapses and reforms as a calm reflective pool.','melt','seamless',[.5]],
 ['satisfying-fill','Perfect Fill','Not a drop too much','A narrow stream fills a rounded transparent chamber to an exact engraved line.','fill','reset',[.18,.77]],
 ['layer-peeling','Ribbon Peel','One layer at a time','A colored film peels from a curved ceramic cylinder into a floating ribbon.','peel','seamless',[.25,.5,.75]],
 ['seamless-liquid','Liquid Infinity','No beginning. No end.','A seamless traveling wave circulates through an impossible-looking liquid infinity channel.','infinity','seamless',[.25,.75]]
];
export const templates=defs.map(([slug,name,caption,description,motion,loop,beats],i)=>({id:'asmr-'+slug,genre:'asmr',name,caption,description,motion,hook:{half_second:'One clear tactile focal object is visible immediately',one_second:caption,three_seconds:description},ending:loop==='seamless'?'Returns to the opening pose and phase':'Completes its transformation; an intentional edit restarts the next cycle',loop,beats,render_family:motion,originality_notes:'Original mathematical geometry and synthesized sound; no downloaded reference media',limitations:'Stylized Canvas 2D visual approximation, not measured fluid or material simulation',quality:{max_particles:72,contrast:'soft object / dark outline',camera:'fixed studio with a subtle periodic push'},featured:i<3}));
function rng(seed){let a=seed>>>0;return()=>{a+=0x6D2B79F5;let t=Math.imul(a^a>>>15,1|a);t^=t+Math.imul(t^t>>>7,61|t);return((t^t>>>14)>>>0)/4294967296}}
const clamp=x=>Math.max(0,Math.min(1,x)),smooth=x=>{x=clamp(x);return x*x*(3-2*x)};
function ellipse(c,x,y,rx,ry,fill,stroke){c.beginPath();c.ellipse(x,y,Math.max(.1,rx),Math.max(.1,ry),0,0,TAU);if(fill){c.fillStyle=fill;c.fill()}if(stroke){c.strokeStyle=stroke;c.lineWidth=2;c.stroke()}}
function round(c,x,y,w,h,r){r=Math.max(0,Math.min(r,w/2,h/2));c.beginPath();c.moveTo(x+r,y);c.arcTo(x+w,y,x+w,y+h,r);c.arcTo(x+w,y+h,x,y+h,r);c.arcTo(x,y+h,x,y,r);c.arcTo(x,y,x+w,y,r);c.closePath()}
function glossy(c,x,y,rx,ry,color,alpha=1){c.save();c.globalAlpha*=alpha;const g=c.createRadialGradient(x-rx*.32,y-ry*.38,2,x,y,Math.max(rx,ry));g.addColorStop(0,'#ffffff');g.addColorStop(.12,color);g.addColorStop(.72,color);g.addColorStop(1,'#456074');ellipse(c,x,y,rx,ry,g,'#ffffff75');ellipse(c,x-rx*.22,y-ry*.38,rx*.27,ry*.1,'#ffffff75');c.restore()}
function backdrop(c,phase){const g=c.createLinearGradient(0,0,540,960);g.addColorStop(0,'#f6ede3');g.addColorStop(.6,'#d8e0e2');g.addColorStop(1,'#b8c9d0');c.fillStyle=g;c.fillRect(0,0,540,960);const l=c.createRadialGradient(140,200,2,270,450,460);l.addColorStop(0,'#ffffff9c');l.addColorStop(1,'#ffffff00');c.fillStyle=l;c.fillRect(0,0,540,900);c.strokeStyle='#ffffff75';c.lineWidth=1;c.beginPath();c.moveTo(0,730);c.lineTo(540,730);c.stroke();ellipse(c,274,732,194,27,'#42576520');}
function prism(c,x,y,w,h,color){const g=c.createLinearGradient(x,y,x+w,y+h);g.addColorStop(0,'#ffffffc0');g.addColorStop(.28,color);g.addColorStop(.55,'#ffffff90');g.addColorStop(1,color);c.save();c.shadowColor='#45607030';c.shadowBlur=18;c.shadowOffsetY=14;round(c,x,y,w,h,18);c.fillStyle=g;c.fill();c.shadowBlur=0;c.strokeStyle='#ffffffba';c.lineWidth=2;c.stroke();c.fillStyle='#ffffff75';round(c,x+8,y+8,w*.25,h-16,8);c.fill();c.restore()}
function pathRibbon(c,p,color,width){c.strokeStyle=color;c.lineWidth=width;c.lineCap='round';c.lineJoin='round';c.beginPath();p(c);c.stroke()}
function footer(c,label,caption){c.fillStyle='#4d6675';c.font='13px -apple-system, sans-serif';c.textAlign='left';c.fillText('ORIGINAL / MATERIAL STUDIES',30,54);if(caption){c.fillStyle='#163a4e';c.textAlign='center';c.font='600 25px -apple-system, sans-serif';c.fillText(typeof caption==='string'?caption:label,270,854,470)}c.textAlign='left';}
export function create(templateId,seed,options={}){
 seed=seed>>>0;
 const template=templates.find(t=>t.id===templateId)||templates[0],index=templates.indexOf(template),duration=options.duration||6,random=rng(seed),color=COLORS[seed%COLORS.length],color2=COLORS[(seed+2)%COLORS.length],phase=random()*TAU;
 const particles=Array.from({length:64},(_,i)=>({u:i/64,s:.6+random()*.6,r:3+random()*4}));
 function draw(c,w,h,t,dt,caption){
  const p=((t/duration)%1+1)%1,q=(1-Math.cos(TAU*p))/2; c.save();c.scale(w/540,h/960);backdrop(c,phase);c.save();const zoom=1+.015*Math.sin(Math.PI*p)**2;c.translate(270,475);c.scale(zoom,zoom);c.translate(-270,-475);
  if(index===0){
   const squish=smooth(q),bw=220+72*squish,bh=228-126*squish,x=270-bw/2,y=692-bh;
   prism(c,x,y,bw,bh,color+'ba');for(let i=0;i<7;i++)ellipse(c,x+25+(i*47+seed%29)%(bw-50),y+28+(i*31)%(Math.max(30,bh-50)),3,4,'#ffffff95');
   prism(c,109,421+116*squish,322,23,'#d5e9f090');ellipse(c,270,414+116*squish,145,13,'#ffffff95');pathRibbon(c,z=>{z.moveTo(140,688);z.quadraticCurveTo(270,708,402,688)},'#ffffff90',3);
  }else if(index===1){
   const cut=smooth(p),split=smooth((p-.28)/.5);for(let i=0;i<5;i++){const shift=(i-2)*split*13;prism(c,156+shift,348+i*62,230,59,(i%2?color:color2)+'a5')}
   const y=326+cut*330;pathRibbon(c,z=>{z.moveTo(102,y);z.lineTo(421,y+22)},'#ffffff',4);pathRibbon(c,z=>{z.moveTo(100,y+6);z.lineTo(418,y+28)},color2,2);ellipse(c,416,y+22,8,8,'#ffffff');
  }else if(index===2){
   ellipse(c,270,594,202,116,'#ffffff65','#ffffffc0');c.save();c.globalCompositeOperation='multiply';for(let i=0;i<3;i++){const a=i*TAU/3+phase,rad=112*(1-q*.87);glossy(c,270+Math.cos(a)*rad,548+Math.sin(a)*rad*.57,73+q*20,70+q*10,COLORS[(seed+i)%5],.74)}c.restore();ellipse(c,241,514,33,12,'#ffffff80');
  }else if(index===3){
   ellipse(c,270,579,222,114,'#486e8820');ellipse(c,270,566,211,101,'#b6e5ea90','#ffffff');for(let i=0;i<7;i++){const k=(p-.16-i*.05+1)%1,rad=10+k*200;c.save();c.globalAlpha=(1-k)*.8;ellipse(c,270,555,rad,rad*.44,null,'#ffffff');ellipse(c,270,558,rad+3,rad*.44,null,color);c.restore()}const dropY=p<.16?235+p/.16*300:555;glossy(c,270,dropY,12,p<.16?24:3,color,p<.16?1:0);
  }else if(index===4){
   for(let layer=0;layer<24;layer++){const a=layer/24*TAU,rr=118+25*Math.sin(a*3+TAU*p);glossy(c,270+Math.cos(a)*rr,513+Math.sin(a)*rr*(.8-.35*q),34,42-13*q,color,.88)}ellipse(c,270,514,67,35,'#d5dfe1');ellipse(c,270,515,64,32,null,'#ffffffb0');prism(c,91,654,358,14,'#e7f3ef');
  }else if(index===5){
   c.save();round(c,132,499,276,197,40);c.clip();const g=c.createLinearGradient(0,420,0,710);g.addColorStop(0,color2);g.addColorStop(.6,color);g.addColorStop(1,'#7a9fbd');c.fillStyle=g;c.fillRect(130,540,280,170);c.beginPath();for(let x=130;x<=410;x+=5){const y=543+15*Math.sin((x-130)/65-TAU*p);x===130?c.moveTo(x,y):c.lineTo(x,y)}c.lineTo(410,710);c.lineTo(130,710);c.fillStyle='#ffffff60';c.fill();c.restore();round(c,132,499,276,197,40);c.strokeStyle='#ffffff';c.lineWidth=3;c.stroke();for(let j=0;j<3;j++)pathRibbon(c,z=>{z.moveTo(260+j*9,228);z.bezierCurveTo(177+q*70,343,354-q*85,401,270+j*3,554)},[color+'c0','#ffffff85',color2+'a0'][j],18-j*5);
  }else if(index===6){
   for(let i=0;i<12;i++){const row=Math.floor(i/3),col=i%3,x=150+col*120,y=331+row*97,beat=.14+i*.065,k=p-beat;
    if(k<0)glossy(c,x,y,37,37,COLORS[(seed+i)%5],.5);else if(k<.1){const u=k/.1;ellipse(c,x,y,37+u*24,37+u*24,null,`rgba(255,255,255,${1-u})`);for(let j=0;j<7;j++){const a=j*TAU/7;ellipse(c,x+Math.cos(a)*u*52,y+Math.sin(a)*u*52,3*(1-u)+.5,3*(1-u)+.5,color)}}else{ellipse(c,x,y,22,4,'#47657616')}
   }
  }else if(index===7){
   for(let lane=0;lane<3;lane++)pathRibbon(c,z=>{z.moveTo(90+lane*70,240);z.bezierCurveTo(500,360,20,530,370+lane*35,720)},'#ffffff40',19);
   for(const particle of particles){const u=(particle.u+p)%1,lane=Math.floor(particle.u*3),x=(1-u)**3*(90+lane*70)+3*(1-u)**2*u*500+3*(1-u)*u*u*20+u**3*(370+lane*35),y=(1-u)**3*240+3*(1-u)**2*u*360+3*(1-u)*u*u*530+u**3*720;glossy(c,x,y,particle.r,particle.r,COLORS[(seed+lane)%5],.95)}
  }else if(index===8){
   const spread=q*13;for(let i=0;i<10;i++){const x=154+i*23+(i-4.5)*spread,y=373+Math.sin(i*.34+phase)*q*12;prism(c,x,y,23,257,COLORS[(seed+i)%5]+'c0');for(let j=0;j<5;j++)pathRibbon(c,z=>{z.moveTo(x+3,y+45+j*37);z.lineTo(x+20,y+45+j*37)},'#ffffff70',3)}
  }else if(index===9){
   for(let i=0;i<12;i++){const a=i*TAU/12+(1-q)*Math.sin(i*3+phase)*.75,rad=108+(1-q)*47;c.save();c.translate(270+Math.cos(a)*rad,500+Math.sin(a)*rad);c.rotate(a+Math.PI/2+(1-q)*.8);glossy(c,0,0,23,62,COLORS[(seed+i)%5],.9);c.restore()}glossy(c,270,500,38,38,color2);ellipse(c,270,692,176,11,'#45647610');
  }else if(index===10){
   const grow=smooth(p/.82);for(let i=11;i>=0;i--){const a=i*TAU/12+phase,len=(95+45*Math.sin(i*1.7+phase))*grow; c.save();c.translate(270,526);c.rotate(a);const g=c.createLinearGradient(0,0,0,-len);g.addColorStop(0,color+'a0');g.addColorStop(1,'#ffffffc0');c.beginPath();c.moveTo(-19*grow,0);c.lineTo(-14*grow,-len*.75);c.lineTo(0,-len);c.lineTo(14*grow,-len*.75);c.lineTo(19*grow,0);c.closePath();c.fillStyle=g;c.fill();c.strokeStyle='#ffffffc0';c.lineWidth=1;c.stroke();c.beginPath();c.moveTo(0,0);c.lineTo(0,-len);c.stroke();c.restore()}glossy(c,270,526,30*grow+3,30*grow+3,color2);
  }else if(index===11){
   const melt=q,ww=190+150*melt,hh=220*(1-melt)+26,x=270-ww/2,y=672-hh;const g=c.createLinearGradient(x,y,x+ww,y+hh);g.addColorStop(0,'#ffffff');g.addColorStop(.25,color);g.addColorStop(1,color2);c.save();c.shadowColor='#254c6530';c.shadowBlur=20;round(c,x,y,ww,hh,12+hh*.36*melt);c.fillStyle=g;c.fill();c.restore();ellipse(c,244,y+hh*.16,ww*.22,Math.max(3,hh*.05),'#ffffff80');for(let i=0;i<4;i++)ellipse(c,150+i*75,692,13*melt,4*melt,color+'a0');
  }else if(index===12){
   const fill=smooth((p-.08)/.7),waterY=685-fill*250;prism(c,143,350,254,349,'#d9f0f240');c.save();round(c,153,360,234,329,30);c.clip();const g=c.createLinearGradient(150,waterY,370,690);g.addColorStop(0,color+'c0');g.addColorStop(1,color2+'db');c.fillStyle=g;c.beginPath();c.moveTo(150,699);c.lineTo(150,waterY);for(let x=150;x<=390;x+=5)c.lineTo(x,waterY+Math.sin(x/25-TAU*p*3)*5);c.lineTo(390,699);c.closePath();c.fill();c.restore();if(p>.08&&p<.78)pathRibbon(c,z=>{z.moveTo(270,225);z.lineTo(270,waterY)},'#ffffffb0',14);c.setLineDash([5,6]);pathRibbon(c,z=>{z.moveTo(160,435);z.lineTo(380,435)},'#274c6570',2);c.setLineDash([]);
  }else if(index===13){
   prism(c,176,335,188,357,'#e8ecef');for(let i=0;i<7;i++)pathRibbon(c,z=>{z.moveTo(190,366+i*45);z.lineTo(350,366+i*45)},COLORS[(seed+i)%5]+'a0',20);const u=q;pathRibbon(c,z=>{z.moveTo(187,400);z.bezierCurveTo(160-u*80,390-u*100,390+u*10,370-u*150,350,545-u*60);z.bezierCurveTo(330,625-u*80,430,625,427,683)},color,26);pathRibbon(c,z=>{z.moveTo(187,393);z.bezierCurveTo(160-u*80,383-u*100,390+u*10,363-u*150,350,538-u*60)},'#ffffff90',4);
  }else{
   const infinity=(u)=>({x:270+175*Math.cos(u)/(1+Math.sin(u)**2),y:510+145*Math.sin(u)*Math.cos(u)/(1+Math.sin(u)**2)});
   for(let j=0;j<3;j++){c.beginPath();for(let k=0;k<=160;k++){const u=k/160*TAU,a=infinity(u);k?c.lineTo(a.x,a.y+j*4):c.moveTo(a.x,a.y+j*4)}c.strokeStyle=['#65869435',color+'a0','#ffffff90'][j];c.lineWidth=[43,29,3][j];c.stroke()}
   for(let i=0;i<24;i++){const a=infinity(i/24*TAU+TAU*p);glossy(c,a.x,a.y,9,9,COLORS[(seed+i)%5],.8)}
  }
  c.restore();footer(c,template.caption,caption);c.restore();
 }
 function eventsBetween(a,b){const events=[];if(b<=a)return events;const first=Math.floor(a/duration),last=Math.min(first+3,Math.floor(b/duration));for(let cycle=first;cycle<=last;cycle++)for(let i=0;i<template.beats.length;i++){const time=(cycle+template.beats[i])*duration;if(time>a&&time<=b)events.push({time,intensity:index===6?.35:.18,pitch:420+(seed%180)+i*45,kind:template.motion})}return events}
 return{draw,eventsBetween,stats:{template_id:template.id,particle_limit:64,physics:'procedural material approximation',loop:template.loop}};
}
