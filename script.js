function boot(){
'use strict';
// 외부 효과음 파일을 불러오지 않고 Web Audio API로 효과음을 합성합니다.
const W=960,H=540,FT=350,FB=505,EX=910,DX=[220,400,580,760],TAU=Math.PI*2;
const $=i=>document.getElementById(i),cv=$('game'),ctx=cv.getContext('2d');
const rnd=(a,b)=>a+Math.random()*(b-a),pick=a=>a[Math.random()*a.length|0],cl=(v,a,b)=>v<a?a:v>b?b:v,lerp=(a,b,t)=>a+(b-a)*t,pad=n=>String(n).padStart(2,'0');
const ET={
player:{sc:1.04,body:'#a9a9a9',head:'#d6d6d6',acc:'scarf',w:'pistol'},
pistol:{hp:40,sp:75,range:380,dmg:8,aim:.5,cd:1.3,mag:5,rl:1.9,score:100,dodge:.35,sc:1,body:'#8a8a8a',acc:'cap',w:'pistol'},
dagger:{hp:35,sp:200,dmg:12,score:120,dodge:.6,sc:.96,body:'#9c9c9c',acc:'wrap',w:'dagger'},
rifle:{hp:90,sp:60,range:430,dmg:9,aim:.65,cd:1.1,mag:20,rl:2.4,score:250,dodge:.15,sc:1.1,body:'#6d6d6d',head:'#b4b4b4',acc:'vest',w:'rifle'},
shield:{hp:75,sp:55,range:340,dmg:8,aim:.55,cd:1.5,mag:5,rl:2,score:200,dodge:.1,sc:1.06,body:'#7b7b7b',acc:'helmet',w:'pistol'}};
const MZ={pistol:[45,8],rifle:[86,6]};
/* ---------- 사운드 ---------- */
let AC,master,dry,verb,vol=.5,muted=false,voices=0;const last={};
const GAP={pistol:.08,epistol:.09,rifle:.07,hit:.05,shield:.09,reload:.3,door:.15,roll:.2};
const GV={pistol:.8,epistol:.6,rifle:.7,reload:.5,melee:.8,shield:.8};
// 합성 대체음: [길이, 필터, 주파수, Q, 음량, 저음 펀치]
const SY={pistol:[.12,'bandpass',1800,.7,.7,150],epistol:[.14,'bandpass',1300,.6,.55,120],rifle:[.2,'lowpass',2800,.6,.7,95],reload:[.07,'highpass',2500,1,.35,0],melee:[.12,'highpass',2200,.5,.45,0],shield:[.28,'bandpass',3300,7,.6,0],hit:[.1,'lowpass',1000,.7,.6,110],door:[.5,'lowpass',650,.9,.8,80],roll:[.25,'bandpass',900,.3,.5,0],dodge:[.2,'highpass',2400,.3,.45,0]};
const out=n=>{n.connect(dry);n.connect(verb);};
function initAudio(){
 if(AC){AC.resume();return;}
 AC=new(window.AudioContext||window.webkitAudioContext)();
 const comp=AC.createDynamicsCompressor();master=AC.createGain();master.gain.value=vol;master.connect(comp);comp.connect(AC.destination);
 dry=AC.createGain();dry.connect(master);
 const n=AC.sampleRate*.35|0,ir=AC.createBuffer(2,n,AC.sampleRate);
 for(let c=0;c<2;c++){const d=ir.getChannelData(c);for(let i=0;i<n;i++)d[i]=(Math.random()*2-1)*Math.pow(1-i/n,3);}
 verb=AC.createConvolver();verb.buffer=ir;const wet=AC.createGain();wet.gain.value=.22;verb.connect(wet);wet.connect(master);
}
function synth(n,v){
 const p=SY[n];if(!p)return;const[d,t,f,q,g,th]=p,t0=AC.currentTime,len=AC.sampleRate*d|0,b=AC.createBuffer(1,len,AC.sampleRate),a=b.getChannelData(0);
 for(let i=0;i<len;i++)a[i]=(Math.random()*2-1)*Math.pow(1-i/len,3);
 const s=AC.createBufferSource(),fl=AC.createBiquadFilter(),gn=AC.createGain();
 s.buffer=b;fl.type=t;fl.frequency.value=f;fl.Q.value=q;gn.gain.value=g*v;s.connect(fl);fl.connect(gn);out(gn);s.start();
 if(th){const o=AC.createOscillator(),og=AC.createGain();o.frequency.setValueAtTime(th,t0);o.frequency.exponentialRampToValueAtTime(40,t0+.12);og.gain.setValueAtTime(g*v*.9,t0);og.gain.exponentialRampToValueAtTime(.001,t0+.14);o.connect(og);out(og);o.start();o.stop(t0+.15);}
}
function play(n,v=1){
 if(!AC)return;
 const t=AC.currentTime;
 if(t-(last[n]||0)<(GAP[n]||.05)||voices>8)return;
 last[n]=t;
 synth(n,v*(GV[n]||1));
}
function setVol(){if(master)master.gain.value=muted?0:vol;$('muteBtn').textContent=muted?'🔇':'🔊';}
/* ---------- 상태 ---------- */
const K={},M={x:480,y:270,down:false};
const newP=()=>({type:'player',S:1.04,x:70,y:430,dir:1,hp:100,sh:100,mag:15,ammo:15,fcd:0,rl:0,roll:0,rT:.42,rcd:0,rvx:0,rvy:0,hurt:0,kx:0,inv:0,nohit:0,anim:0,recoil:0,mv:false,aa:1,la:0,aimA:0,flash:0});
let G={state:'menu',area:1,score:0,shake:0,tr:0,sw:false,t:0,hfx:0,msgT:0},P=newP(),A,E=[],B=[],PT=[];
const show=(id,on)=>$(id).classList.toggle('hidden',!on);
function say(t,s=2){$('msg').textContent=t;$('msg').classList.add('show');G.msgT=s;}
const alive=()=>E.reduce((n,e)=>n+(e.dead?0:1),0)+A.spawn.filter(s=>s.stage<2).length;
function initArea(){
 const a=G.area,n=cl(Math.floor((a+1)/2)+(Math.random()<.5?1:0),1,4);
 const pool=a<2?['pistol']:a<3?['pistol','dagger']:a<4?['pistol','dagger','rifle']:['pistol','dagger','rifle','shield','shield'];
 const ds=[0,1,2,3].sort(()=>Math.random()-.5);
 A={fight:false,clear:false,ex:0,lights:[130,480,830],
  doors:DX.map(x=>({x,open:0,broken:false,shake:0})),
  crates:[310,490,670].map(x=>({x:x+rnd(-18,18),s:rnd(44,62)})),
  spawn:ds.slice(0,n).map((d,i)=>({door:d,type:pick(pool),mode:Math.random()<.5?'open':'break',t:.9+i*.7,stage:0,u:0}))};
}
function resetGame(){
 G={state:'play',area:1,score:0,shake:0,tr:0,sw:false,t:G.t,hfx:0,msgT:0};
 P=newP();E=[];B=[];PT=[];M.down=false;initArea();
 show('startScreen',0);show('pauseScreen',0);show('overScreen',0);say('AREA 01',1.6);hud();
}
function startGame(){initAudio();resetGame();}
function gameOver(){G.state='over';M.down=false;$('finalScore').textContent=String(G.score);show('overScreen',1);}
function togglePause(){
 if(G.state==='play'){G.state='pause';show('pauseScreen',1);}
 else if(G.state==='pause'){G.state='play';show('pauseScreen',0);}
 M.down=false;for(const k in K)K[k]=false;
}
/* ---------- 파티클 ---------- */
const dust=(x,y,n)=>{for(let i=0;i<n;i++)PT.push({k:'dust',x:x+rnd(-40,40),y:y+rnd(-30,0),vx:rnd(-30,30),vy:rnd(-40,-8),sz:rnd(8,16),life:rnd(.6,1.1),max:1.1});};
const sparks=(x,y,n,dir,cols)=>{for(let i=0;i<n;i++)PT.push({k:'spark',x,y,vx:dir*rnd(40,260)+rnd(-80,80),vy:rnd(-200,60),g:500,col:pick(cols),life:rnd(.2,.45),max:.45});};
function debris(d){
 for(let i=0;i<16;i++)PT.push({k:'deb',x:d.x+rnd(-40,40),y:FT-rnd(20,160),vx:rnd(-220,220),vy:rnd(-320,-60),g:900,r:0,vr:rnd(-10,10),sz:rnd(6,14),col:pick(['#55555a','#3a3a3e','#6a6a70']),fy:FT+rnd(8,40),life:2,max:2});
 dust(d.x,FT-40,10);
}
function updPT(dt){
 for(const p of PT){p.life-=dt;p.x+=(p.vx||0)*dt;p.y+=(p.vy||0)*dt;if(p.g)p.vy+=p.g*dt;if(p.vr)p.r+=p.vr*dt;if(p.fy&&p.y>p.fy){p.y=p.fy;p.vy*=-.3;p.vx*=.5;p.vr*=.5;}}
 PT=PT.filter(p=>p.life>0);
}
/* ---------- 전투 ---------- */
function shoot(c,a,w,own,dmg,spd){
 const la=c.dir>0?a:Math.PI-a,[len,up]=MZ[w],S=c.S,co=Math.cos(la),si=Math.sin(la);
 const lx=12+co*(24+len)+si*up,ly=-56+si*(24+len)-co*up,mx=c.x+c.dir*S*lx,my=c.y+S*ly;
 B.push({x:mx,y:my,vx:Math.cos(a)*spd,vy:Math.sin(a)*spd,dmg,own,life:1.5});
 PT.push({k:'flash',x:mx,y:my,a,sz:w==='rifle'?36:26,life:.06,max:.06});
 PT.push({k:'shell',x:mx-Math.cos(a)*30,y:my-Math.sin(a)*30,vx:-c.dir*rnd(40,110),vy:rnd(-170,-90),g:800,r:0,vr:rnd(-12,12),sz:7,col:'#c9b26b',fy:c.y,life:1.2,max:1.2});
 c.recoil=1;G.shake=Math.max(G.shake,own==='p'?2.5:1.5);
 play(own==='p'?'pistol':w==='rifle'?'rifle':'epistol',own==='p'?1:.8);
}
function hurtP(dmg,kx){
 if(P.roll>0||P.inv>0||P.hp<=0)return false;
 P.nohit=0;
 if(P.sh>=30){P.sh-=30;P.inv=.4;play('dodge');PT.push({k:'txt',x:P.x,y:P.y-140,vy:-50,t:'DODGE',life:.8,max:.8});sparks(P.x,P.y-60,6,-kx,['#fff','#ff4040']);return true;}
 P.hp-=dmg;P.hurt=.25;P.kx=kx*180;P.inv=.35;P.flash=.1;G.shake=9;G.hfx=.6;play('hit');sparks(P.x,P.y-70,8,kx,['#ff3b3b','#fff','#777']);
 if(P.hp<=0){P.hp=0;gameOver();}
 return true;
}
function hitE(e,dmg,dx){
 e.hp-=dmg;e.hurt=e.type==='rifle'?.13:.22;e.kx=dx*(e.type==='rifle'?80:180);e.flash=.08;
 play('hit',.8);sparks(e.x,e.y-70*e.S,8,dx,['#fff','#ff4040','#999']);G.shake=Math.max(G.shake,4);
 if(e.hp<=0)kill(e);
}
function kill(e){
 if(e.dead)return;e.dead=true;e.dt=0;G.score+=ET[e.type].score;P.sh=Math.min(100,P.sh+25);
 dust(e.x,e.y,4);sparks(e.x,e.y-60,12,-e.dir,['#fff','#ff4040','#777']);play('hit',1);
}
function hitCheck(b){
 if(b.own==='p'){
  for(const e of E){
   if(e.dead)continue;const S=e.S;
   if(e.type==='shield'&&e.su>.7&&b.vx*e.dir<0){
    const sx=e.x+e.dir*30*S;
    if(Math.abs(b.x-sx)<12*S&&b.y>e.y-100*S&&b.y<e.y-8*S){
     b.dead=true;sparks(b.x,b.y,9,-Math.sign(b.vx),['#fff','#ffd27a','#aaa']);play('shield');G.shake=Math.max(G.shake,3);
     if(++e.blocks>=5){e.blocks=0;e.sdT=1.8;}
     return;
    }
   }
   if(Math.abs(b.x-e.x)<24*S&&b.y>e.y-122*S&&b.y<e.y){b.dead=true;hitE(e,b.dmg,Math.sign(b.vx));return;}
  }
 }else if(P.hp>0&&P.roll<=0&&P.inv<=0&&Math.abs(b.x-P.x)<22*P.S&&b.y>P.y-120*P.S&&b.y<P.y){b.dead=true;hurtP(b.dmg,Math.sign(b.vx));}
}
function updBullets(dt){
 for(const b of B){
  const n=Math.ceil(Math.hypot(b.vx,b.vy)*dt/10);
  for(let i=0;i<n&&!b.dead;i++){b.x+=b.vx*dt/n;b.y+=b.vy*dt/n;hitCheck(b);}
  b.life-=dt;if(b.life<=0||b.x<-20||b.x>W+20||b.y<0||b.y>H)b.dead=true;
 }
 B=B.filter(b=>!b.dead);
}
/* ---------- 플레이어 ---------- */
function reloadP(){if(P.rl<=0&&P.ammo<P.mag&&P.roll<=0){P.rl=1.2;play('reload');}}
function updP(dt){
 const p=P;p.anim+=dt;p.fcd-=dt;p.rcd-=dt;p.inv-=dt;p.nohit+=dt;p.flash-=dt;p.recoil=Math.max(0,p.recoil-dt*7);p.mv=false;
 if(p.nohit>2.5)p.sh=Math.min(100,p.sh+22*dt);
 if(p.rl>0){p.rl-=dt;if(p.rl<=0)p.ammo=p.mag;}
 const ax=(K.KeyD||K.ArrowRight?1:0)-(K.KeyA||K.ArrowLeft?1:0),ay=(K.KeyS||K.ArrowDown?1:0)-(K.KeyW||K.ArrowUp?1:0);
 if(p.hurt>0){p.hurt-=dt;p.x+=p.kx*dt;p.kx*=Math.pow(.02,dt);}
 else if(p.roll>0){p.roll-=dt;p.x+=p.rvx*dt;p.y+=p.rvy*dt;if(Math.random()<.4)dust(p.x,p.y,1);}
 else if((K.ShiftLeft||K.ShiftRight)&&p.rcd<=0){
  const l=Math.hypot(ax,ay)||1,dx=(ax||ay)?ax/l:p.dir,dy=(ax||ay)?ay/l:0;
  p.roll=p.rT;p.rvx=dx*480;p.rvy=dy*320;p.rcd=.9;if(dx)p.dir=Math.sign(dx);play('roll');
 }else{const l=Math.hypot(ax,ay)||1;p.x+=ax/l*240*dt;p.y+=ay/l*170*dt;p.mv=!!(ax||ay);}
 p.x=cl(p.x,40,A.clear?W-20:830);p.y=cl(p.y,FT+14,FB);
 if(p.roll<=0)p.dir=M.x>=p.x?1:-1;
 const sx=p.x+p.dir*12*p.S,sy=p.y-56*p.S,a=Math.atan2(M.y-sy,M.x-sx);
 let la=p.dir>0?a:Math.PI-a;la=cl(Math.atan2(Math.sin(la),Math.cos(la)),-1.3,1.3);p.la=la;p.aimA=p.dir>0?la:Math.PI-la;
 if(M.down&&p.roll<=0&&p.hurt<=0&&p.rl<=0&&p.fcd<=0){
  if(p.ammo>0){shoot(p,p.aimA,'pistol','p',14,950);p.ammo--;p.fcd=.17;}else reloadP();
 }
 if(p.ammo<=0)reloadP();
}
/* ---------- 적 ---------- */
function mkE(type,x,y,ty){
 const c=ET[type];
 return{type,S:c.sc,x,y,ty,dir:-1,hp:c.hp,st:'enter',t:0,fcd:rnd(.5,1.2),ammo:c.mag||0,shots:0,blocks:0,sdT:0,su:1,sUp:true,hurt:0,kx:0,anim:rnd(0,6),recoil:0,mv:false,aa:.3,la:0,wa:-.3,vt:0,boost:0,vsd:1,seed:rnd(0,6),dead:false,dt:0,flash:0,hit:false};
}
function findTY(x){
 for(let i=0;i<30;i++){
  const ty=rnd(FT+30,FB-10);
  if(Math.abs(ty-P.y)<60&&Math.abs(x-P.x)<140)continue;
  if(E.some(e=>!e.dead&&Math.abs(e.x-x)<80&&Math.abs((e.ty||e.y)-ty)<45))continue;
  return ty;
 }
 return rnd(FT+40,FB-20);
}
function updSpawn(dt){
 for(const s of A.spawn){
  if(s.stage===2)continue;s.t-=dt;const d=A.doors[s.door];
  if(s.stage===0&&s.t<=0){s.stage=1;s.u=.55;d.shake=.55;play('door');dust(d.x,FT+2,8);}
  if(s.stage===1){
   s.u-=dt;
   if(s.mode==='open')d.open=cl(1-s.u/.55,0,1);
   else if(s.u<.3&&!d.broken){d.broken=true;d.open=1;G.shake=10;play('door',1.2);play('hit');debris(d);}
   if(s.u<=0){s.stage=2;d.open=1;E.push(mkE(s.type,d.x,FT+4,findTY(d.x)));}
  }
 }
 if(!A.fight&&A.spawn.every(s=>s.stage===2)&&E.every(e=>e.dead||e.st!=='enter')){A.fight=true;say('FIGHT!',1.2);}
}
function efire(e){
 const c=ET[e.type],S=e.S,sx=e.x+e.dir*12*S,sy=e.y-56*S,a=Math.atan2(P.y-62-sy,P.x-sx)+rnd(-.05,.05);
 shoot(e,a,c.w,'e',c.dmg,c.w==='rifle'?720:600);
}
function sepV(e){
 let x=0,y=0;
 for(const o of E){if(o===e||o.dead)continue;const ox=e.x-o.x,oy=e.y-o.y;if(Math.abs(ox)<66&&Math.abs(oy)<34){x+=Math.sign(ox||1)*45;y+=Math.sign(oy||Math.random()-.5)*60;}}
 return[x,y];
}
function rmove(e,c,dt,dx,ad){
 let vx=0;
 if(ad<c.range*.7)vx=-Math.sign(dx)*c.sp*1.15;else if(ad>c.range*1.1)vx=Math.sign(dx)*c.sp;
 e.vt-=dt;if(e.vt<=0){e.vt=rnd(1.2,2.6);e.ty=cl(P.y+rnd(-90,90),FT+20,FB);}
 if(Math.random()<c.dodge*dt){e.ty=cl(e.y+pick([-1,1])*rnd(50,90),FT+20,FB);e.boost=.25;}
 const d=e.ty-e.y;let vy=Math.sign(d)*Math.min(Math.abs(d)/dt,e.boost>0?190:65);
 const s=sepV(e);vx+=s[0];vy+=s[1];
 e.x=cl(e.x+vx*dt,34,W-34);e.y=cl(e.y+vy*dt,FT+15,FB);e.mv=Math.abs(vx)+Math.abs(vy)>8;
}
function updE(e,dt){
 const c=ET[e.type],S=e.S;e.anim+=dt;e.flash-=dt;e.recoil=Math.max(0,e.recoil-dt*6);
 if(e.dead){e.dt+=dt;return;}
 const dx=P.x-e.x,ad=Math.abs(dx);
 if(e.st!=='slash')e.dir=dx>=0?1:-1;
 {const sx=e.x+e.dir*12*S,sy=e.y-56*S,a=Math.atan2(P.y-62-sy,P.x-sx);let la=e.dir>0?a:Math.PI-a;e.la=cl(Math.atan2(Math.sin(la),Math.cos(la)),-1.3,1.3);}
 e.sdT-=dt;e.sUp=e.type==='shield'&&e.st!=='aim'&&e.sdT<=0;e.su+=((e.sUp?1:0)-e.su)*Math.min(1,dt*10);
 e.aa+=(((e.st==='aim'||e.st==='burst')?1:.3)-e.aa)*Math.min(1,dt*9);e.mv=false;
 if(e.hurt>0){
  e.hurt-=dt;e.x=cl(e.x+e.kx*dt,34,W-34);e.kx*=Math.pow(.01,dt);
  if(e.hurt<=0&&['aim','burst','windup','slash'].includes(e.st)){e.st='move';e.fcd=Math.max(e.fcd,.5);}
  return;
 }
 e.t-=dt;e.fcd-=dt;e.boost-=dt;
 switch(e.st){
 case'enter':{const d=e.ty-e.y;e.y+=Math.sign(d)*Math.min(Math.abs(d),100*dt);e.mv=true;if(Math.abs(d)<2)e.st='wait';break;}
 case'wait':if(A.fight){e.st='move';e.fcd=rnd(.5,1.4);}break;
 case'move':case'reload':
  if(e.type==='dagger'){
   e.wa=-.3;
   const gy=P.y+Math.sin(e.anim*3+e.seed)*30;let vy=cl((gy-e.y)*4,-170,170);
   const vx=ad>70?Math.sign(dx)*c.sp*(ad<240?.8:1):0;
   if(Math.random()<c.dodge*dt){e.boost=.3;e.vsd=pick([-1,1]);}
   if(e.boost>0)vy=e.vsd*200;
   const s=sepV(e);
   e.x=cl(e.x+(vx+s[0])*dt,34,W-34);e.y=cl(e.y+(vy+s[1])*dt,FT+15,FB);e.mv=true;
   if(e.fcd<=0&&ad<130&&Math.abs(P.y-e.y)<26){e.st='windup';e.t=.4;}
  }else{
   rmove(e,c,dt,dx,ad);
   if(e.st==='reload'){if(e.t<=0){e.ammo=c.mag;e.st='move';e.fcd=.5;}}
   else if(e.fcd<=0&&ad<650){e.st='aim';e.t=c.aim;}
  }
  break;
 case'aim':
  if(e.t<=0){
   if(c.w==='rifle'){e.st='burst';e.shots=5;e.t=0;}
   else{efire(e);e.ammo--;e.fcd=c.cd*rnd(.8,1.3);e.sdT=.5;e.st='move';if(e.ammo<=0){e.st='reload';e.t=c.rl;play('reload',.7);}}
  }
  break;
 case'burst':
  if(e.t<=0){
   if(e.shots>0&&e.ammo>0){efire(e);e.shots--;e.ammo--;e.t=.11;}
   else{e.fcd=c.cd*rnd(.9,1.4);e.st='move';if(e.ammo<=0){e.st='reload';e.t=c.rl;play('reload',.7);}}
  }
  break;
 case'windup':e.wa=lerp(-.3,-2.1,1-cl(e.t/.4,0,1));if(e.t<=0){e.st='slash';e.t=.2;e.hit=false;}break;
 case'slash':
  e.wa=lerp(-2.1,.9,1-cl(e.t/.2,0,1));e.x=cl(e.x+e.dir*340*dt,34,W-34);e.mv=true;
  if(!e.hit&&e.t<.12){e.hit=true;play('melee');if(Math.abs(P.x-e.x)<88&&e.dir*(P.x-e.x)>-12&&Math.abs(P.y-e.y)<30)hurtP(c.dmg,e.dir);}
  if(e.t<=0){e.st='recover';e.t=.9;}
  break;
 case'recover':e.wa=.9;if(e.t<=0){e.st='move';e.fcd=.6;}break;
 }
}
/* ---------- 업데이트 ---------- */
function update(dt){
 G.shake=Math.max(0,G.shake-dt*30);G.hfx=Math.max(0,G.hfx-dt*1.5);
 if(G.msgT>0&&(G.msgT-=dt)<=0)$('msg').classList.remove('show');
 if(G.tr>0){
  G.tr+=dt*2.2;
  if(!G.sw&&G.tr>=1){G.sw=true;G.area++;E=[];B=[];PT=[];P.x=60;initArea();say('AREA '+pad(G.area),1.6);}
  if(G.tr>=2){G.tr=0;G.sw=false;}
  return;
 }
 updP(dt);if(G.state!=='play')return;
 updSpawn(dt);for(const e of E)updE(e,dt);
 updBullets(dt);updPT(dt);
 E=E.filter(e=>!e.dead||e.dt<1.1);
 A.doors.forEach(d=>d.shake=Math.max(0,d.shake-dt));
 A.ex=A.clear?Math.min(1,A.ex+dt*1.6):0;
 if(A.fight&&!A.clear&&alive()===0){A.clear=true;play('door');say('AREA CLEAR ▶ 오른쪽 문이 열렸습니다',3);}
 if(A.clear&&P.x>EX-30&&G.tr===0)G.tr=.001;
}
function hud(){
 $('areaInfo').textContent='AREA '+pad(G.area)+' | ENEMIES LEFT: '+(A?alive():0);
 $('hpFill').style.width=P.hp+'%';$('shFill').style.width=P.sh+'%';
 $('score').textContent='SCORE '+String(G.score).padStart(6,'0');
 $('ammo').textContent=P.rl>0?'RELOADING...':'AMMO '+P.ammo+' / '+P.mag;
 $('hurtFx').style.opacity=G.hfx;
}
/* ---------- 그리기 ---------- */
function rr(x,y,w,h,r,f,st=1){
 ctx.beginPath();ctx.moveTo(x+r,y);ctx.arcTo(x+w,y,x+w,y+h,r);ctx.arcTo(x+w,y+h,x,y+h,r);ctx.arcTo(x,y+h,x,y,r);ctx.arcTo(x,y,x+w,y,r);ctx.closePath();
 if(f){ctx.fillStyle=f;ctx.fill();}if(st)ctx.stroke();
}
function drawDoor(d){
 const sh=d.shake>0?Math.sin(G.t*70)*d.shake*7:0,x=d.x-46+sh,y=FT-182,w=92,h=182;
 ctx.lineWidth=4;ctx.strokeStyle='#050505';
 rr(x-6,y-6,w+12,h+6,4,'#3b3b40');
 ctx.fillStyle='#050506';ctx.fillRect(x,y,w,h);
 if(d.open>0||d.broken){const g=ctx.createLinearGradient(x,0,x+w,0);g.addColorStop(0,'#0a0a0c');g.addColorStop(1,'#222226');ctx.fillStyle=g;ctx.fillRect(x,y,w,h);}
 if(!d.broken){
  const lw=w*(1-d.open*.86);ctx.fillStyle='#55555b';ctx.fillRect(x,y,lw,h);
  ctx.fillStyle='#46464b';ctx.fillRect(x+lw*.12,y+18,lw*.76,60);ctx.fillRect(x+lw*.12,y+96,lw*.76,64);
  ctx.fillStyle='#bbb';ctx.beginPath();ctx.arc(x+lw-9,y+h*.55,4,0,TAU);ctx.fill();
 }else{
  ctx.fillStyle='#4c4c52';ctx.beginPath();ctx.moveTo(x,y);ctx.lineTo(x+18,y);ctx.lineTo(x+10,y+40);ctx.lineTo(x+22,y+70);ctx.lineTo(x+6,y+110);ctx.lineTo(x+14,y+h);ctx.lineTo(x,y+h);ctx.fill();
 }
 ctx.strokeRect(x,y,w,h);
 ctx.fillStyle=d.open>.2?'#ddd':'#3a0a0a';ctx.beginPath();ctx.arc(x+w/2,y-18,5,0,TAU);ctx.fill();
}


function drawExit() {
  const x = EX - 52;
  const y = FT - 196;
  const w = 104;
  const h = 196;

  const open = Math.max(0, Math.min(1, Number(A.ex) || 0));
  const doorH = h * (1 - open);

    ctx.lineWidth = 4;
  ctx.strokeStyle = '#050505';
  rr(x - 8, y - 8, w + 16, h + 8, 4, '#2f2f34');

  ctx.fillStyle = '#0b0b0d';
  ctx.fillRect(x, y, w, h);

  ctx.fillStyle = '#000000';
  ctx.fillRect(x, y, w, h);

  // 위쪽에서 내려오는 문
  if (doorH > 0) {
    ctx.fillStyle = '#4a4a50';
    ctx.fillRect(x, y, w, doorH);

    // 문의 가로 보강대
    ctx.fillStyle = '#38383d';
    for (let i = 0; i < 4; i++) {
      const barY = y + 10 + i * 44;
      if (barY + 8 < y + doorH - 4) {
        ctx.fillRect(x + 6, barY, w - 12, 8);
      }
    }
  }

  // 문 외곽선
  ctx.strokeStyle = '#050505';
  ctx.lineWidth = 4;
  ctx.strokeRect(x, y, w, h);

  // 잠금 상태 확인
  const locked = !A.clear;
  const pulse = Math.sin(G.t * 6) > 0;

  // 출구 위의 표시등
  ctx.fillStyle = locked
    ? (pulse ? '#ff2b2b' : '#6a0a0a')
    : '#eeeeee';

  ctx.beginPath();
  ctx.arc(EX, y - 22, 8, 0, Math.PI * 2);
  ctx.fill();
  
}


function drawBG(){
 let g=ctx.createLinearGradient(0,0,0,FT);g.addColorStop(0,'#141416');g.addColorStop(1,'#27272b');ctx.fillStyle=g;ctx.fillRect(0,0,W,FT);
 ctx.fillStyle='rgba(255,255,255,.035)';for(let x=0;x<W;x+=120)ctx.fillRect(x,40,3,FT-54);
 ctx.fillStyle='#0c0c0e';ctx.fillRect(0,0,W,36);ctx.fillStyle='#1f1f22';ctx.fillRect(0,58,W,8);ctx.fillStyle='#101012';ctx.fillRect(0,FT-12,W,12);
 A.doors.forEach(drawDoor);drawExit();
 ctx.lineWidth=3;ctx.strokeStyle='#050505';
 for(const c of A.crates){const l=c.x-c.s/2,r=c.x+c.s/2,t=FT-c.s+4;rr(l,t,c.s,c.s,3,'#4b4b46');ctx.beginPath();ctx.moveTo(l,t);ctx.lineTo(r,FT+4);ctx.moveTo(r,t);ctx.lineTo(l,FT+4);ctx.stroke();}
 g=ctx.createLinearGradient(0,FT,0,H);g.addColorStop(0,'#2c2c30');g.addColorStop(1,'#0f0f11');ctx.fillStyle=g;ctx.fillRect(0,FT,W,H-FT);
 ctx.strokeStyle='rgba(255,255,255,.05)';ctx.lineWidth=1;
 for(let i=-8;i<=18;i++){ctx.beginPath();ctx.moveTo(480+(i*60-480)*.6,FT);ctx.lineTo(480+(i*60-480)*1.6,H);ctx.stroke();}
 for(let i=1;i<6;i++){const y=FT+i*i*5;ctx.beginPath();ctx.moveTo(0,y);ctx.lineTo(W,y);ctx.stroke();}
 ctx.globalCompositeOperation='lighter';
 A.lights.forEach((x,i)=>{const f=Math.sin(G.t*2.3+i*7)>.985?.3:1,r=ctx.createRadialGradient(x,40,4,x,40,300);r.addColorStop(0,`rgba(255,255,255,${.2*f})`);r.addColorStop(1,'rgba(255,255,255,0)');ctx.fillStyle=r;ctx.fillRect(x-300,0,600,H);});
 ctx.globalCompositeOperation='source-over';ctx.strokeStyle='#050505';ctx.lineWidth=2;
 A.lights.forEach(x=>rr(x-40,34,80,8,3,'#ddd'));
}
const WP={
pistol(){
 ctx.lineWidth=2;ctx.strokeStyle='#050505';
 rr(-8,-3,36,6,2,'#3a3a3f');
 ctx.beginPath();ctx.moveTo(-9,-1);ctx.lineTo(3,-1);ctx.lineTo(1,17);ctx.lineTo(-11,17);ctx.closePath();ctx.fillStyle='#2a2a2d';ctx.fill();ctx.stroke();
 rr(-9,-13,46,10,3,'#2c2c31');rr(37,-11,8,6,2,'#151517');
 ctx.strokeStyle='#777';ctx.lineWidth=1.5;ctx.beginPath();ctx.moveTo(-5,-11);ctx.lineTo(33,-11);for(let i=0;i<3;i++){ctx.moveTo(-6+i*4,-12);ctx.lineTo(-6+i*4,-5);}ctx.stroke();
 ctx.strokeStyle='#050505';ctx.lineWidth=2;ctx.beginPath();ctx.arc(13,3,5,0,Math.PI);ctx.stroke();
 ctx.beginPath();ctx.moveTo(12,3);ctx.lineTo(11,8);ctx.stroke();
 rr(-7,-16,3,3,1,'#111');rr(32,-16,3,3,1,'#111');
},
rifle(){
 ctx.lineWidth=2;ctx.strokeStyle='#050505';
 ctx.beginPath();ctx.moveTo(-54,-8);ctx.lineTo(-18,-10);ctx.lineTo(-18,6);ctx.lineTo(-32,13);ctx.lineTo(-54,11);ctx.closePath();ctx.fillStyle='#3a3a3e';ctx.fill();ctx.stroke();
 rr(-57,-9,5,22,2,'#18181a');rr(-18,-13,42,17,3,'#2a2a2e');rr(24,-11,28,13,2,'#3c3c41');
 ctx.strokeStyle='#1a1a1c';ctx.lineWidth=1.5;ctx.beginPath();for(let i=0;i<4;i++){ctx.moveTo(29+i*6,-8);ctx.lineTo(29+i*6,-1);}ctx.stroke();
 ctx.strokeStyle='#050505';ctx.lineWidth=2;
 rr(52,-8,26,5,1,'#1b1b1d');rr(76,-10,11,9,2,'#101011');rr(68,-16,3,8,1,'#101011');
 rr(-10,-24,30,10,3,'#18181a');rr(-6,-15,5,3,1,'#101011');rr(12,-15,5,3,1,'#101011');
 ctx.fillStyle='#6a6a74';ctx.beginPath();ctx.arc(20,-19,3,0,TAU);ctx.fill();
 ctx.beginPath();ctx.moveTo(2,4);ctx.lineTo(15,4);ctx.lineTo(20,25);ctx.lineTo(8,25);ctx.closePath();ctx.fillStyle='#1f1f22';ctx.fill();ctx.stroke();
 ctx.beginPath();ctx.moveTo(-15,4);ctx.lineTo(-5,4);ctx.lineTo(-8,20);ctx.lineTo(-18,20);ctx.closePath();ctx.fillStyle='#26262a';ctx.fill();ctx.stroke();
},
dagger(){
 ctx.lineWidth=2;ctx.strokeStyle='#050505';
 rr(-12,-4,17,8,3,'#26262a');
 ctx.strokeStyle='#555';ctx.beginPath();ctx.moveTo(-7,-3);ctx.lineTo(-7,3);ctx.moveTo(-2,-3);ctx.lineTo(-2,3);ctx.stroke();ctx.strokeStyle='#050505';
 rr(5,-10,5,20,2,'#5a5a60');
 ctx.beginPath();ctx.moveTo(10,-5);ctx.lineTo(47,-1.5);ctx.lineTo(54,0);ctx.lineTo(47,2.5);ctx.lineTo(10,5);ctx.closePath();ctx.fillStyle='#d6d6da';ctx.fill();ctx.stroke();
 ctx.strokeStyle='#8e8e94';ctx.beginPath();ctx.moveTo(12,0);ctx.lineTo(50,0);ctx.stroke();
}};
function drawChar(c){
 const s=ET[c.type],S=c.S,fl=c.flash>0,F=col=>fl?'#fff':col,O='#0a0a0a';
 ctx.save();ctx.translate(c.x,c.y);
 ctx.fillStyle='rgba(0,0,0,.5)';ctx.beginPath();ctx.ellipse(0,2,38*S,10*S,0,0,TAU);ctx.fill();
 if(c.inv>0)ctx.globalAlpha=.55;
 if(c.dead){const k=Math.min(1,c.dt*3);ctx.globalAlpha=1-cl((c.dt-.6)/.45,0,1);ctx.translate(-c.dir*k*26,0);ctx.rotate(-c.dir*k*1.45);}
 else if(c.roll>0){const p=1-c.roll/c.rT;ctx.translate(0,-48*S);ctx.rotate(c.dir*p*TAU);ctx.translate(0,48*S);}
 else if(c.hurt>0)ctx.rotate(-c.dir*.16);
 ctx.scale(c.dir*S,c.roll>0?S*.82:S);
 ctx.lineJoin=ctx.lineCap='round';ctx.strokeStyle=O;ctx.lineWidth=4;
 const mv=c.mv&&!c.dead,t=c.anim,sw=mv?Math.sin(t*13):0,bob=mv?-Math.abs(Math.sin(t*13))*3:Math.sin(t*2.6)*-1.5;
 for(const i of[-1,1])rr(i*9+sw*i*8-7,-15-(mv?Math.max(0,sw*i)*6:0),14,15,5,F('#4a4a4d'));
 ctx.save();ctx.translate(0,bob);
 if(s.acc==='scarf'){ctx.fillStyle='#d3222a';ctx.beginPath();ctx.moveTo(-14,-64);ctx.quadraticCurveTo(-34,-62+Math.sin(t*6)*5,-46,-52+Math.sin(t*6+1)*8);ctx.lineTo(-30,-54);ctx.quadraticCurveTo(-24,-58,-14,-57);ctx.closePath();ctx.fill();ctx.lineWidth=3;ctx.stroke();ctx.lineWidth=4;}
 const body=()=>{ctx.beginPath();ctx.moveTo(-20,-66);ctx.lineTo(20,-66);ctx.quadraticCurveTo(27,-40,24,-14);ctx.lineTo(-24,-14);ctx.quadraticCurveTo(-27,-40,-20,-66);ctx.closePath();};
 body();ctx.fillStyle=F(s.body);ctx.fill();
 ctx.save();ctx.clip();ctx.fillStyle='rgba(0,0,0,.25)';ctx.fillRect(-30,-70,22,60);
 if(s.acc==='wrap'){ctx.fillStyle='#161616';ctx.fillRect(-30,-50,60,6);ctx.fillRect(-30,-36,60,5);}
 if(s.acc==='vest'){ctx.fillStyle='#262628';ctx.fillRect(-30,-64,60,36);ctx.fillStyle='#38383b';for(let i=0;i<3;i++)ctx.fillRect(-16+i*12,-44,9,12);}
 if(s.acc==='scarf'){ctx.fillStyle='#d3222a';ctx.fillRect(-30,-66,60,9);}
 ctx.restore();ctx.lineWidth=4;body();ctx.stroke();
 const hx=4,hy=-91+bob*.4;
 ctx.save();ctx.beginPath();ctx.ellipse(hx,hy,31,37,0,0,TAU);ctx.fillStyle=F('#8c8c8c');ctx.fill();ctx.clip();
 ctx.fillStyle=F(s.head||'#c8c8c8');ctx.beginPath();ctx.ellipse(hx+8,hy-1,27,36,0,0,TAU);ctx.fill();ctx.restore();
 ctx.beginPath();ctx.ellipse(hx,hy,31,37,0,0,TAU);ctx.lineWidth=4.5;ctx.stroke();
 if(s.acc==='cap'||s.acc==='helmet'){
  const h=s.acc==='helmet';ctx.beginPath();ctx.ellipse(hx,hy,31.5,37.5,0,Math.PI*(h?1.06:1.15),Math.PI*(h?1.94:1.85));ctx.closePath();
  ctx.fillStyle=h?'#2d2d31':'#1d1d1f';ctx.fill();ctx.lineWidth=4;ctx.stroke();if(!h)rr(hx+8,hy-22,28,6,3,'#1d1d1f');
 }
 ctx.lineWidth=3;ctx.strokeStyle=O;ctx.beginPath();ctx.moveTo(hx+3,hy-4);ctx.lineTo(hx+27,hy-4);ctx.moveTo(hx+15,hy-18);ctx.lineTo(hx+15,hy+10);ctx.stroke();
 const dag=s.w==='dagger',la=dag?c.wa:lerp(.95,c.la,c.aa),L=dag?22:lerp(18,26,c.aa),sx=12,sy=-56+bob;
 const hand=[sx+Math.cos(la)*L,sy+Math.sin(la)*L],u=[Math.cos(la),Math.sin(la)],dn=[-u[1],u[0]];
 const arm=(x1,y1,x2,y2)=>{ctx.lineCap='round';ctx.strokeStyle=O;ctx.lineWidth=11;ctx.beginPath();ctx.moveTo(x1,y1);ctx.lineTo(x2,y2);ctx.stroke();ctx.strokeStyle=F('#8a8a8a');ctx.lineWidth=6;ctx.stroke();ctx.strokeStyle=O;};
 const fist=(x,y)=>{ctx.lineWidth=3.5;rr(x-7,y-6,14,12,4,F('#c4c4c4'));};
 arm(sx,sy,hand[0],hand[1]);
 ctx.save();ctx.translate(hand[0],hand[1]);ctx.rotate(la);ctx.translate(-c.recoil*6,0);WP[s.w]();ctx.restore();
 fist(hand[0],hand[1]);
 if(s.w==='rifle'){const bx=hand[0]+u[0]*34+dn[0]*5,by=hand[1]+u[1]*34+dn[1]*5;arm(-12,sy,bx,by);fist(bx,by);}
 else if(s.acc==='helmet'){
  const shx=lerp(-26,32,c.su),shy=lerp(-30,-52,c.su)+bob;
  arm(-12,sy,shx-4,shy);fist(shx-4,shy);
  ctx.save();ctx.translate(shx,shy);ctx.rotate(lerp(.3,0,c.su));ctx.lineWidth=4;
  rr(-12,-46,24,92,9,F('#505057'));rr(-7,-40,14,80,6,F('#7a7a82'));
  ctx.fillStyle='rgba(255,255,255,.2)';ctx.fillRect(-4,-36,3,70);ctx.fillStyle='#d3222a';ctx.fillRect(-7,-4,14,8);ctx.restore();
 }else if(s.w==='pistol'){const bx=hand[0]+u[0]*6+dn[0]*8,by=hand[1]+u[1]*6+dn[1]*8;arm(-12,sy,bx,by);fist(bx,by);}
 else{const ix=-26+Math.sin(t*(mv?13:3))*3,iy=-38;arm(-12,sy,ix,iy);fist(ix,iy);}
 ctx.restore();ctx.restore();
}
function drawPT(){
 for(const p of PT){
  const k=Math.max(0,p.life/p.max);
  switch(p.k){
  case'dust':ctx.fillStyle=`rgba(150,150,155,${k*.35})`;ctx.beginPath();ctx.arc(p.x,p.y,p.sz*(2-k),0,TAU);ctx.fill();break;
  case'spark':ctx.strokeStyle=p.col;ctx.lineWidth=2;ctx.globalAlpha=k;ctx.beginPath();ctx.moveTo(p.x,p.y);ctx.lineTo(p.x-p.vx*.03,p.y-p.vy*.03);ctx.stroke();ctx.globalAlpha=1;break;
  case'deb':case'shell':ctx.save();ctx.translate(p.x,p.y);ctx.rotate(p.r);ctx.fillStyle=p.col;ctx.fillRect(-p.sz/2,-p.sz/4,p.sz,p.sz/2);ctx.restore();break;
  case'flash':ctx.save();ctx.translate(p.x,p.y);ctx.rotate(p.a);ctx.globalCompositeOperation='lighter';ctx.fillStyle='#ffe9b8';ctx.beginPath();ctx.moveTo(-4,0);ctx.lineTo(p.sz*.35,-8);ctx.lineTo(p.sz,0);ctx.lineTo(p.sz*.35,8);ctx.closePath();ctx.fill();ctx.fillStyle='#fff';ctx.beginPath();ctx.arc(0,0,7,0,TAU);ctx.fill();ctx.restore();break;
  case'txt':ctx.fillStyle=`rgba(255,60,60,${k})`;ctx.font='bold 16px Consolas,monospace';ctx.textAlign='center';ctx.fillText(p.t,p.x,p.y);break;
  }
 }
}
const vig=ctx.createRadialGradient(W/2,H/2,H*.3,W/2,H/2,W*.62);vig.addColorStop(0,'rgba(0,0,0,0)');vig.addColorStop(1,'rgba(0,0,0,.7)');
function render(){
 ctx.save();const s=G.shake;ctx.translate(rnd(-s,s)*.5,rnd(-s,s)*.5);
 drawBG();[P,...E].sort((a,b)=>a.y-b.y).forEach(drawChar);
 ctx.lineCap='round';
 for(const b of B){ctx.strokeStyle=b.own==='p'?'#fff':'#ff4a4a';ctx.lineWidth=b.own==='p'?2.5:3;ctx.beginPath();ctx.moveTo(b.x-b.vx*.02,b.y-b.vy*.02);ctx.lineTo(b.x,b.y);ctx.stroke();}
 drawPT();ctx.restore();
 ctx.fillStyle=vig;ctx.fillRect(0,0,W,H);
 if(G.state==='play'){ctx.strokeStyle='#e1252b';ctx.lineWidth=2;ctx.beginPath();ctx.arc(M.x,M.y,10,0,TAU);ctx.moveTo(M.x-16,M.y);ctx.lineTo(M.x-6,M.y);ctx.moveTo(M.x+6,M.y);ctx.lineTo(M.x+16,M.y);ctx.moveTo(M.x,M.y-16);ctx.lineTo(M.x,M.y-6);ctx.moveTo(M.x,M.y+6);ctx.lineTo(M.x,M.y+16);ctx.stroke();}
 if(G.tr>0){ctx.fillStyle=`rgba(0,0,0,${G.tr<1?G.tr:2-G.tr})`;ctx.fillRect(0,0,W,H);}
}
/* ---------- 루프(1회만 시작) ---------- */
let lt=0;
function loop(ts){
 requestAnimationFrame(loop);
 const dt=Math.min(.05,(ts-lt)/1000||0);lt=ts;G.t+=dt;
 if(G.state==='play'){update(dt);if(G.state!=='menu')hud();}
 render();
}
/* ---------- 입력 ---------- */
addEventListener('keydown',e=>{
 if(e.code==='Escape'){if(G.state==='play'||G.state==='pause')togglePause();return;}
 if(['ArrowUp','ArrowDown','ArrowLeft','ArrowRight','Space'].includes(e.code))e.preventDefault();
 if(e.code==='KeyR'&&!e.repeat){if(G.state==='over')startGame();else if(G.state==='play')reloadP();}
 K[e.code]=true;
});
addEventListener('keyup',e=>{K[e.code]=false;});
addEventListener('mousemove',e=>{const r=cv.getBoundingClientRect();M.x=(e.clientX-r.left)*W/r.width;M.y=(e.clientY-r.top)*H/r.height;});
cv.addEventListener('mousedown',e=>{if(e.button===0)M.down=true;});
addEventListener('mouseup',()=>{M.down=false;});
cv.addEventListener('contextmenu',e=>e.preventDefault());
document.addEventListener('visibilitychange',()=>{if(document.hidden&&G.state==='play')togglePause();});
$('startBtn').onclick=startGame;$('restartBtn').onclick=startGame;$('pauseRestartBtn').onclick=startGame;$('resumeBtn').onclick=togglePause;
$('muteBtn').onclick=()=>{muted=!muted;setVol();};
$('vol').oninput=e=>{vol=e.target.value/100;setVol();};
initArea();A.spawn=[];hud();
requestAnimationFrame(loop);
}
document.readyState==='loading'?document.addEventListener('DOMContentLoaded',boot):boot();