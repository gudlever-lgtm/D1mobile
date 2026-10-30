'use strict';
(() => {
const $=id=>document.getElementById(id), canvas=$('game');
const W=23,H=19, AGGRO_RANGE=3, keys=new Set();
let mode='title',depth=1,gold=0,kills=0,potions=3,weapon=0,enemies=[],loot=[],effects=[],map=[],time=0,last=0,attackCD=0,spellCD=0,noteTime=0;
let player={x:3.5,y:3.5,hp:100,mp:60,dx:1,dy:0}, joy={x:0,y:0,id:null},stairs={x:19.5,y:15.5};
function notify(s){$('message').textContent=s;noteTime=3;}
function buildLevel(){
 map=Array.from({length:H},(_,y)=>Array.from({length:W},(_,x)=> x===0||y===0||x===W-1||y===H-1||((x%6===0)&&(y%5!==3)&&(y>3))?1:0));
 player.x=3.5;player.y=3.5;enemies=[];loot=[];effects=[];
 for(let i=0;i<5+depth*3;i++){let x,y;do{x=3+Math.random()*(W-5);y=4+Math.random()*(H-6);}while(solid(x,y)||Math.hypot(x-player.x,y-player.y)<4||Math.hypot(x-stairs.x,y-stairs.y)<1);enemies.push({x,y,hp:22+depth*8,max:22+depth*8,cd:Math.random(),boss:false,aggro:false,moving:false});}
 if(depth===3)enemies.push({x:19.5,y:15.5,hp:220,max:220,cd:0,boss:true,aggro:false,moving:false});
 notify(depth===3?'Gravens vogter venter.':'Ryd katakomberne. Find den lysende trappe.'); sync();
}
function solid(x,y){return !map[Math.floor(y)]||map[Math.floor(y)][Math.floor(x)]!==0;}
// Trace every crossed grid cell, including both sides of a diagonal corner.
function hasLineOfSight(a,b){
 if(solid(a.x,a.y)||solid(b.x,b.y))return false;
 let x=Math.floor(a.x),y=Math.floor(a.y),endX=Math.floor(b.x),endY=Math.floor(b.y);
 const dx=b.x-a.x,dy=b.y-a.y,sx=Math.sign(dx),sy=Math.sign(dy);
 const deltaX=dx?Math.abs(1/dx):Infinity,deltaY=dy?Math.abs(1/dy):Infinity;
 let nextX=dx?((sx>0?x+1:x)-a.x)/dx:Infinity;
 let nextY=dy?((sy>0?y+1:y)-a.y)/dy:Infinity;
 while(x!==endX||y!==endY){
  if(Math.abs(nextX-nextY)<1e-10){
   if(solid(x+sx+.5,y+.5)||solid(x+.5,y+sy+.5))return false;
   x+=sx;y+=sy;nextX+=deltaX;nextY+=deltaY;
  }else if(nextX<nextY){x+=sx;nextX+=deltaX;}
  else{y+=sy;nextY+=deltaY;}
  if(solid(x+.5,y+.5))return false;
 }
 return true;
}
function updateEnemy(e,dt){
 e.moving=false;
 if(e.hp<=0)return;
 const dx=player.x-e.x,dy=player.y-e.y,d=Math.hypot(dx,dy);
 const visible=hasLineOfSight(e,player);
 if(!e.aggro&&d<=AGGRO_RANGE&&visible){
  e.aggro=true;
  effects.push({x:e.x,y:e.y,t:.35,text:'!',color:'#e7bc70'});
 }
 e.cd-=dt;
 if(!e.aggro)return;
 if(d>.75){
  const beforeX=e.x,beforeY=e.y,speed=e.boss?.75:1.15;
  move(e,dx/d*dt*speed,dy/d*dt*speed);
  e.moving=e.x!==beforeX||e.y!==beforeY;
 }
 if(d<.95&&e.cd<=0&&visible){
  const damage=e.boss?18:6+depth*2;
  player.hp=Math.max(0,player.hp-damage);e.cd=1.1;
  effects.push({x:player.x,y:player.y,t:.25,text:'−'+damage,color:'#ff6969'});
  if(player.hp<=0)finish(false);
 }
}
function move(o,dx,dy){let r=o.boss?.34:.23;if(!solid(o.x+dx+r*Math.sign(dx),o.y-r)&&!solid(o.x+dx+r*Math.sign(dx),o.y+r))o.x+=dx;if(!solid(o.x-r,o.y+dy+r*Math.sign(dy))&&!solid(o.x+r,o.y+dy+r*Math.sign(dy)))o.y+=dy;}
function sync(){ document.documentElement.style.setProperty('--life',player.hp+'%');document.documentElement.style.setProperty('--magic',(player.mp/60*100)+'%');$('health').value=player.hp;$('hp').textContent=Math.ceil(player.hp)+' / 100';$('mana').value=player.mp;$('mp').textContent=Math.floor(player.mp)+' / 60';$('depth').textContent='NIVEAU '+['I','II','III'][depth-1];$('gold').textContent=gold;$('kills').textContent=kills+' faldne';$('potions').textContent='DRIK · '+potions;$('weapon').textContent=['† Rustent sværd','† Jernsværd','† Askeklinge'][Math.min(weapon,2)];}
function finish(won){mode=won?'won':'dead';$('overlay').classList.remove('hidden');$('overlay').querySelector('h2').textContent=won?'Mørket er brudt.':'Asken kalder igen.';$('overlay').querySelector('p:not(.eyebrow)').textContent=`${kills} faldne · ${gold} guld · niveau ${depth}`;$('start').textContent='SPIL IGEN ↻';}
function hurt(e,d){e.aggro=true;e.hp-=d;effects.push({x:e.x,y:e.y,t:.35,text:Math.round(d),color:'#e3bf84'});if(e.hp<=0){kills++;loot.push({x:e.x,y:e.y,type:e.boss?'crown':kills%5===0?'sword':kills%3===0?'potion':'gold'});if(e.boss)finish(true);}}
function attack(){if(mode!=='playing'||attackCD>0)return;attackCD=.4;effects.push({x:player.x+player.dx*.6,y:player.y+player.dy*.6,t:.22,slash:true,color:'#eedbb7'});enemies.forEach(e=>{if(e.hp>0&&Math.hypot(e.x-player.x,e.y-player.y)<1.65&&hasLineOfSight(player,e))hurt(e,14+weapon*7);});sync();}
function spell(){if(mode!=='playing'||spellCD>0)return;if(player.mp<15){notify('Du mangler mana.');return;}player.mp-=15;spellCD=.8;effects.push({x:player.x,y:player.y,t:.5,fire:true,color:'#e89b4d'});enemies.forEach(e=>{if(e.hp>0&&Math.hypot(e.x-player.x,e.y-player.y)<3.8&&hasLineOfSight(player,e))hurt(e,30+weapon*5);});sync();}
function heal(){if(mode!=='playing')return;if(!potions){notify('Ingen drikke tilbage.');return;}if(player.hp>=100){notify('Dit liv er allerede fuldt.');return;}potions--;player.hp=Math.min(100,player.hp+50);notify('+50 liv');sync();}
function start(){depth=1;gold=0;kills=0;potions=3;weapon=0;player={x:3.5,y:3.5,hp:100,mp:60,dx:1,dy:0};attackCD=spellCD=0;$('pause').textContent='Ⅱ';$('pause').classList.remove('is-paused');keys.clear();release();mode='playing';$('overlay').classList.add('hidden');buildLevel();}
function update(dt){if(mode!=='playing')return;time+=dt;attackCD=Math.max(0,attackCD-dt);spellCD=Math.max(0,spellCD-dt);noteTime-=dt;$('message').style.opacity=noteTime>0?1:0;player.mp=Math.min(60,player.mp+dt*3);
 let dx=joy.x+(keys.has('d')||keys.has('arrowright')?1:0)-(keys.has('a')||keys.has('arrowleft')?1:0),dy=joy.y+(keys.has('s')||keys.has('arrowdown')?1:0)-(keys.has('w')||keys.has('arrowup')?1:0),n=Math.hypot(dx,dy);if(n>.08){const sx=dx/Math.max(1,n),sy=dy/Math.max(1,n);dx=sx+sy*2;dy=sy*2-sx;const worldLength=Math.hypot(dx,dy);dx=dx/worldLength*Math.min(1,n);dy=dy/worldLength*Math.min(1,n);player.dx=dx;player.dy=dy;move(player,dx*3.3*dt,dy*3.3*dt);}
 if(keys.has(' '))attack();if(keys.has('f'))spell();
 enemies.forEach(e=>updateEnemy(e,dt));
 loot=loot.filter(l=>{if(Math.hypot(l.x-player.x,l.y-player.y)>.65)return true;if(l.type==='potion'){potions++;notify('Helbredelsesdrik samlet op');}else if(l.type==='sword'){weapon=Math.min(2,weapon+1);notify('En bedre klinge!');}else{gold+=10+depth*5;notify('+'+(10+depth*5)+' guld');}return false;});
 effects.forEach(e=>e.t-=dt);effects=effects.filter(e=>e.t>0);if(depth<3&&enemies.every(e=>e.hp<=0)&&Math.hypot(player.x-stairs.x,player.y-stairs.y)<.8){depth++;player.hp=Math.min(100,player.hp+25);player.mp=60;buildLevel();}sync();}
function draw(){
 DungeonRenderer.draw(canvas,{map,player,enemies,loot,effects,stairs,time,depth,attackCD,
  moving:Math.hypot(joy.x,joy.y)>.08||['w','a','s','d','arrowup','arrowdown','arrowleft','arrowright'].some(k=>keys.has(k))});
}
$('start').onclick=start;$('attack').onpointerdown=attack;$('spell').onpointerdown=spell;$('heal').onpointerdown=heal;
$('pause').onclick=()=>{if(mode==='playing'){mode='paused';$('pause').textContent='▶';notify('Pause');$('message').style.opacity=1;}else if(mode==='paused'){mode='playing';$('pause').textContent='Ⅱ';notify('Fortsæt ned i mørket.');}$('pause').classList.toggle('is-paused',mode==='paused');};
addEventListener('keydown',e=>{if([' ','ArrowUp','ArrowDown','ArrowLeft','ArrowRight'].includes(e.key))e.preventDefault();keys.add(e.key.toLowerCase());if(e.key.toLowerCase()==='e'&&!e.repeat)heal();});addEventListener('keyup',e=>keys.delete(e.key.toLowerCase()));
function release(){joy={x:0,y:0,id:null};$('stick').style.transform='';}addEventListener('blur',()=>{keys.clear();release();if(mode==='playing')$('pause').click();});
$('joystick').onpointerdown=e=>{if(joy.id!==null)return;joy.id=e.pointerId;$('joystick').setPointerCapture(e.pointerId);joystick(e);};function joystick(e){if(e.pointerId!==joy.id)return;let r=$('joystick').getBoundingClientRect(),x=e.clientX-r.left-r.width/2,y=e.clientY-r.top-r.height/2,n=Math.hypot(x,y),s=Math.min(1,28/(n||1));x*=s;y*=s;joy.x=x/28;joy.y=y/28;$('stick').style.transform=`translate(${x}px,${y}px)`;}$('joystick').onpointermove=joystick;$('joystick').onpointerup=release;$('joystick').onpointercancel=release;
buildLevel();function loop(now){let dt=Math.min(.05,(now-last)/1000||0);last=now;update(dt);draw();requestAnimationFrame(loop);}requestAnimationFrame(loop);
})();
