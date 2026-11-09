/** Continuous discs against discs, finite capsules and rotating arc capsules.
 * Length: stage px; time: seconds. Fixed120Hz gravity integration, analytic TOI
 * within rotation-bounded microsteps. A contact-budget exhaustion stops motion;
 * it never advances a body through a collider to catch up with wall time.
 */
export const TAU=Math.PI*2,H=1/120;
export const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
export const angle=v=>Math.atan2(Math.sin(v),Math.cos(v));
const EPS=1e-7,SKIN=.002;
export function circleTOI(x,y,vx,vy,r,limit){
 const a=vx*vx+vy*vy,b=2*(x*vx+y*vy),c=x*x+y*y-r*r;
 if(a<EPS)return null;
 const discriminant=b*b-4*a*c;if(discriminant<0)return null;
 const root=Math.sqrt(discriminant),roots=[(-b-root)/(2*a),(-b+root)/(2*a)];
 return roots.filter(t=>t>=-EPS&&t<=limit+EPS).map(t=>Math.max(0,t));
}
function pointHit(ball,x,y,vx,vy,r,dt,key){
 const initial=Math.hypot(ball.x-x,ball.y-y),sum=ball.r+r;if(initial<sum-SKIN){const nx=(ball.x-x)/(initial||1),ny=(ball.y-y)/(initial||1);return {t:0,a:ball,nx:initial?nx:1,ny,sx:vx,sy:vy,x:x+nx*r,y:y+ny*r,key,penetration:sum-initial}}
 const roots=circleTOI(ball.x-x,ball.y-y,ball.vx-vx,ball.vy-vy,ball.r+r,dt)||[];
 for(const t of roots){const dx=ball.x+ball.vx*t-x-vx*t,dy=ball.y+ball.vy*t-y-vy*t,d=Math.hypot(dx,dy)||1,nx=dx/d,ny=dy/d;
  if((ball.vx-vx)*nx+(ball.vy-vy)*ny<-EPS)return {t,a:ball,nx,ny,sx:vx,sy:vy,x:x+vx*t+nx*r,y:y+vy*t+ny*r,key};}
 return null;
}
export function arcHit(ball,ring,dt,time){
 if(ring.cleared)return null;const phase=ring.a+ring.omega*time,reach=ball.r+ring.width/2,candidates=[];
 const dx0=ball.x-ring.x,dy0=ball.y-ring.y,d0=Math.hypot(dx0,dy0),theta0=Math.atan2(dy0,dx0);if(d0>EPS&&Math.abs(d0-ring.r)<reach-SKIN&&Math.abs(angle(theta0-phase))>=ring.gap/2){const side=d0>=ring.r?1:-1,x=ring.x+dx0/d0*(ring.r+side*ring.width/2),y=ring.y+dy0/d0*(ring.r+side*ring.width/2);candidates.push({t:0,a:ball,nx:side*dx0/d0,ny:side*dy0/d0,sx:-ring.omega*(y-ring.y),sy:ring.omega*(x-ring.x),x,y,key:ring.id,ring,penetration:reach-Math.abs(d0-ring.r)})}
 for(const side of [-1,1]){const radius=ring.r+side*reach;if(radius<=0)continue;
  const roots=circleTOI(ball.x-ring.x,ball.y-ring.y,ball.vx,ball.vy,radius,dt)||[];
  for(const t of roots){const dx=ball.x+ball.vx*t-ring.x,dy=ball.y+ball.vy*t-ring.y,d=Math.hypot(dx,dy)||1,theta=Math.atan2(dy,dx),nx=side*dx/d,ny=side*dy/d;
   // Geometry matches round-capped Canvas arcs. End caps are separate circles.
   if(Math.abs(angle(theta-phase-ring.omega*t))<ring.gap/2)continue;
   if(ball.vx*nx+ball.vy*ny>=-EPS)continue;
   const x=ring.x+dx/d*(ring.r+side*ring.width/2),y=ring.y+dy/d*(ring.r+side*ring.width/2);
   candidates.push({t,a:ball,nx,ny,sx:-ring.omega*(y-ring.y),sy:ring.omega*(x-ring.x),x,y,key:ring.id,ring});}
 }
 if(ring.gap>0)for(const sign of [-1,1]){const theta=phase+sign*ring.gap/2,x=ring.x+Math.cos(theta)*ring.r,y=ring.y+Math.sin(theta)*ring.r;
  const hit=pointHit(ball,x,y,-ring.omega*(y-ring.y),ring.omega*(x-ring.x),ring.width/2,dt,ring.id);if(hit)candidates.push({...hit,ring,endpoint:true});}
 return candidates.sort((a,b)=>a.t-b.t)[0]||null;
}
export function wallHit(ball,wall,dt,time){
 const theta=wall.a+wall.omega*time,ux=Math.cos(theta),uy=Math.sin(theta),nx=-uy,ny=ux,half=wall.length/2,reach=ball.r+wall.width/2,candidates=[];
 const px=(ball.x-wall.x)*ux+(ball.y-wall.y)*uy,py=(ball.x-wall.x)*nx+(ball.y-wall.y)*ny;
 const along=clamp(px,-half,half),cx=wall.x+along*ux,cy=wall.y+along*uy,svx=-wall.omega*(cy-wall.y),svy=wall.omega*(cx-wall.x),vn=(ball.vx-svx)*nx+(ball.vy-svy)*ny;
 if(Math.abs(py)<reach-SKIN&&Math.abs(px)<=half){const side=py>=0?1:-1;candidates.push({t:0,a:ball,nx:side*nx,ny:side*ny,sx:svx,sy:svy,x:cx+side*wall.width/2*nx,y:cy+side*wall.width/2*ny,key:wall.id,wall,penetration:reach-Math.abs(py)})}
 for(const side of [-1,1])if(vn*side<-EPS){const t=(side*reach-py)/vn,projection=px+((ball.vx-svx)*ux+(ball.vy-svy)*uy)*t;
  if(t>=-EPS&&t<=dt+EPS&&Math.abs(projection)<=half)candidates.push({t:Math.max(0,t),a:ball,nx:side*nx,ny:side*ny,sx:svx,sy:svy,x:wall.x+projection*ux+side*wall.width/2*nx,y:wall.y+projection*uy+side*wall.width/2*ny,key:wall.id,wall});}
 for(const sign of [-1,1]){const x=wall.x+sign*half*ux,y=wall.y+sign*half*uy,h=pointHit(ball,x,y,-wall.omega*(y-wall.y),wall.omega*(x-wall.x),wall.width/2,dt,wall.id);if(h)candidates.push({...h,wall});}
 return candidates.sort((a,b)=>a.t-b.t)[0]||null;
}
export function sweptPairs(balls,dt){
 // Insert swept AABBs, not just end positions, into broad-phase cells.
 const cells=new Map(),pairs=new Set(),result=[],size=48;
 balls.forEach((b,i)=>{const ex=b.x+b.vx*dt,ey=b.y+b.vy*dt;
  for(let x=Math.floor((Math.min(b.x,ex)-b.r)/size);x<=Math.floor((Math.max(b.x,ex)+b.r)/size);x++)for(let y=Math.floor((Math.min(b.y,ey)-b.r)/size);y<=Math.floor((Math.max(b.y,ey)+b.r)/size);y++){const key=x+','+y,bucket=cells.get(key)||[];for(const j of bucket){const k=j+':'+i;if(!pairs.has(k)){pairs.add(k);result.push([balls[j],b])}}bucket.push(i);cells.set(key,bucket)}});return result;
}
export function stepCCD(balls,rings,walls,dt,start,{restitution=.96,friction=.012,onContact=()=>{},stats={}}={}){
 let left=dt,elapsed=0,iterations=0;let live=balls.filter(b=>!b.dead);
 // Resolve pre-existing disc overlaps by inverse mass, independently of velocity.
 for(let pass=0;pass<3;pass++)for(const [a,b] of sweptPairs(live,0)){let dx=a.x-b.x,dy=a.y-b.y,d=Math.hypot(dx,dy),over=a.r+b.r-d;stats.maxDiscOverlap=Math.max(stats.maxDiscOverlap||0,over);if(over<=SKIN)continue;if(d<EPS){dx=1;dy=0;d=1}const nx=dx/d,ny=dy/d,ia=1/a.mass,ib=1/b.mass,c=(over+SKIN)/(ia+ib);a.x+=nx*c*ia;a.y+=ny*c*ia;b.x-=nx*c*ib;b.y-=ny*c*ib;}
 while(left>EPS&&iterations++<64){let first=null;
  const accept=h=>{if(h&&(!first||h.t<first.t-EPS))first=h};
  for(const b of live){for(const r of rings)accept(arcHit(b,r,left,start+elapsed));for(const w of walls)accept(wallHit(b,w,left,start+elapsed));}
  for(const [a,b] of sweptPairs(live,left)){stats.pairTests=(stats.pairTests||0)+1;const roots=circleTOI(a.x-b.x,a.y-b.y,a.vx-b.vx,a.vy-b.vy,a.r+b.r,left)||[];
   for(const t of roots){const dx=a.x+a.vx*t-b.x-b.vx*t,dy=a.y+a.vy*t-b.y-b.vy*t,d=Math.hypot(dx,dy)||1,nx=dx/d,ny=dy/d;
    if((a.vx-b.vx)*nx+(a.vy-b.vy)*ny<-EPS){accept({t,a,b,nx,ny,x:a.x+a.vx*t-nx*a.r,y:a.y+a.vy*t-ny*a.r,key:'pair-'+Math.min(a.id,b.id)+'-'+Math.max(a.id,b.id)});break;}}
  }
  const span=first?first.t:left;for(const b of live){b.x+=b.vx*span;b.y+=b.vy*span}elapsed+=span;left-=span;if(!first)break;
  const h=first,{a,b,nx,ny}=h,rvx=a.vx-(b?b.vx:h.sx),rvy=a.vy-(b?b.vy:h.sy),vn=rvx*nx+rvy*ny,ia=1/a.mass,ib=b?1/b.mass:0,j=-(1+restitution)*Math.min(0,vn)/(ia+ib);
  a.vx+=j*nx*ia;a.vy+=j*ny*ia;a.x+=nx*((h.penetration||0)+SKIN);a.y+=ny*((h.penetration||0)+SKIN);stats.maxPenetration=Math.max(stats.maxPenetration||0,h.penetration||0);
  if(b){b.vx-=j*nx*ib;b.vy-=j*ny*ib;b.x-=nx*SKIN;b.y-=ny*SKIN}
  const tangent=rvx*(-ny)+rvy*nx,jt=clamp(-tangent/(ia+ib),-j*friction,j*friction);a.vx-=jt*ny*ia;a.vy+=jt*nx*ia;if(b){b.vx+=jt*ny*ib;b.vy-=jt*nx*ib}
  onContact({...h,time:start+elapsed,impulse:j});live=live.filter(b=>!b.dead);stats.contacts=(stats.contacts||0)+1;
 }
 if(left>EPS)stats.budgetStops=(stats.budgetStops||0)+1;
 return elapsed;
}
