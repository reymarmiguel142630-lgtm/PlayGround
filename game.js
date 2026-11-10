import * as THREE from 'three';

const mount = document.querySelector('#game');
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x10192c);
scene.fog = new THREE.Fog(0x10192c, 28, 118);
const camera = new THREE.PerspectiveCamera(54, innerWidth / innerHeight, .1, 180);
camera.position.set(0, 5.2, 8.5);
camera.lookAt(0, .3, -11);
const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
renderer.setPixelRatio(Math.min(devicePixelRatio, 1.65));
renderer.setSize(innerWidth, innerHeight);
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.12;
mount.appendChild(renderer.domElement);

scene.add(new THREE.HemisphereLight(0xbde9ff, 0x182439, 2.0));
const keyLight = new THREE.DirectionalLight(0xffe6b5, 3.1);
keyLight.position.set(-5, 12, 4); scene.add(keyLight);
const rimLight = new THREE.PointLight(0x3cddc7, 24, 38, 2);
rimLight.position.set(4, 5, -10); scene.add(rimLight);
const mat = (color, roughness=.55, metalness=0, emissive=0x000000, intensity=0) => new THREE.MeshStandardMaterial({ color, roughness, metalness, emissive, emissiveIntensity:intensity });
const mats = {
  road: mat(0x25364b,.9), seam:mat(0x31475a), edge:mat(0x51d4bd,.36,.25,0x0b897b,.7), line:mat(0x577386,.45,0,0x244456,.5),
  gold:mat(0xffc64e,.24,.62,0x8c4a00,.3), goldtop:mat(0xffe294,.2,.3,0xffa900,.5),
  crate:mat(0xf05e71,.42,.12,0x8e183a,.18), crateTop:mat(0xffa06e,.4), crateLine:mat(0x702d48),
  mint:mat(0x9debd4,.32,.14,0x317a6e,.15), blue:mat(0x4c83a5,.3,.2), visor:mat(0x14283d,.15,.4), eye:mat(0xbdfbde,.2,.1,0x73ffcc,2.4), shoe:mat(0xffc961,.35,.1),
  plant:mat(0x42a899,.8), plant2:mat(0x9bd67b,.8), pink:mat(0xff718b,.4,.1,0x8c1738,.5), white:mat(0xe4faf2,.35)
};
const boxGeo = new THREE.BoxGeometry(1,1,1);
const cylinderGeo = new THREE.CylinderGeometry(.42,.42,.2,16);
const studTopGeo = new THREE.CylinderGeometry(.29,.31,.12,16);
const laneX = [-2.25, 0, 2.25];
let running=false, over=false, time=0, distance=0, studs=0, speed=15, lane=1, jumpY=0, jumpV=0, spawnZ=-35, toastTimer=0;
let best = Number(localStorage.getItem('studRunBest') || 0);
const $ = s => document.querySelector(s);
$('#best').textContent = `${best}m`;

function block(parent, geometry, material, pos, scale, radius=0) {
  const mesh = new THREE.Mesh(geometry, material);
  mesh.position.set(...pos); mesh.scale.set(...scale); mesh.castShadow=false; mesh.receiveShadow=false;
  if(radius) mesh.rotation.y=radius;
  parent.add(mesh); return mesh;
}

// A repeating runway and glowing lane rails make the forward motion easy to read.
const segments=[];
for(let i=0;i<14;i++){
  const g=new THREE.Group(); g.position.z=12-i*16; scene.add(g);
  block(g,boxGeo,mats.road,[0,-.38,-8],[9.2,.55,16]);
  block(g,boxGeo,mats.seam,[0,-.095,-.2],[9.12,.025,.08]);
  for(const x of [-4.56,4.56]) block(g,boxGeo,mats.edge,[x,-.06,-8],[.13,.14,16]);
  for(const x of [-1.12,1.12]) for(let z=-2;z>-16;z-=4) block(g,boxGeo,mats.line,[x,-.095,z],[.025,.018,1.8]);
  // Little luminous bolts along the track's shoulders.
  for(const x of [-4.12,4.12]) for(let z=-3;z>-16;z-=5) block(g,new THREE.SphereGeometry(.09,8,6),mats.goldtop,[x,-.02,z],[1,1,1]);
  segments.push(g);
}
const ground=new THREE.Mesh(new THREE.PlaneGeometry(220,360),mat(0x15243a,1));
ground.rotation.x=-Math.PI/2;ground.position.set(0,-.72,-100);scene.add(ground);

// Roadside chunky plants / beacons, placed in paired rows and recycled with the runway.
const scenery=[];
for(let i=0;i<18;i++){
  const side=i%2?1:-1, g=new THREE.Group();g.position.set(side*(6.5+Math.random()*1.5),-.12,8-i*10);scene.add(g);
  if(i%3===0){
    block(g,boxGeo,mats.pink,[0,.55,0],[.22,1.1,.22]);
    block(g,new THREE.SphereGeometry(.24,10,8),mats.goldtop,[0,1.17,0],[1,1,1]);
  } else {
    block(g,new THREE.SphereGeometry(.55,8,6),i%2?mats.plant:mats.plant2,[0,.42,0],[.86,1.2,.8]);
    block(g,new THREE.SphereGeometry(.38,8,6),mats.plant2,[.24,.75,.03],[.85,.9,.8]);
  }
  scenery.push(g);
}

// The little block-built runner.
const player=new THREE.Group();scene.add(player);player.position.set(0,0,0);
const avatar=new THREE.Group();player.add(avatar);
block(avatar,boxGeo,mats.blue,[0,.77,0],[.8,.72,.48]);
block(avatar,boxGeo,mats.mint,[0,1.42,-.01],[.89,.8,.67]);
block(avatar,boxGeo,mats.visor,[0,1.45,.34],[.68,.37,.09]);
for(const x of [-.2,.2]) block(avatar,new THREE.SphereGeometry(.065,10,8),mats.eye,[x,1.48,.4],[1,1,1]);
const leftArm=new THREE.Group();leftArm.position.set(-.51,1.04,0);avatar.add(leftArm);
block(leftArm,boxGeo,mats.mint,[0,-.2,0],[.24,.55,.27]);
const rightArm=new THREE.Group();rightArm.position.set(.51,1.04,0);avatar.add(rightArm);
block(rightArm,boxGeo,mats.mint,[0,-.2,0],[.24,.55,.27]);
for(const x of [-.24,.24]){
  block(avatar,boxGeo,mats.shoe,[x,.28,.05],[.32,.22,.48]);
  block(avatar,boxGeo,mats.visor,[x,.13,.09],[.34,.08,.51]);
}
const shadow=new THREE.Mesh(new THREE.CircleGeometry(.65,20),new THREE.MeshBasicMaterial({color:0x07111e,transparent:true,opacity:.38}));
shadow.rotation.x=-Math.PI/2;shadow.position.set(0,-.085,.06);scene.add(shadow);

const studsPool=[],obstacles=[];
function makeStud(){
  const g=new THREE.Group();
  const body=new THREE.Mesh(cylinderGeo,mats.gold);g.add(body);
  const top=new THREE.Mesh(studTopGeo,mats.goldtop);top.position.y=.15;g.add(top);
  const ring=new THREE.Mesh(new THREE.TorusGeometry(.34,.035,6,16),mats.goldtop);ring.rotation.x=Math.PI/2;ring.position.y=.105;g.add(ring);
  g.userData={phase:Math.random()*6.28,active:true};scene.add(g);studsPool.push(g);return g;
}
function makeObstacle(){
  const g=new THREE.Group();
  const body=new THREE.Mesh(boxGeo,mats.crate);body.scale.set(1.25,1.12,.95);body.position.y=.56;g.add(body);
  const top=new THREE.Mesh(boxGeo,mats.crateTop);top.scale.set(1.29,.1,.99);top.position.set(0,1.13,0);g.add(top);
  const slash=new THREE.Mesh(boxGeo,mats.crateLine);slash.scale.set(.12,1.05,1.01);slash.rotation.z=.55;slash.position.set(0,.57,0);g.add(slash);
  g.userData={active:true};scene.add(g);obstacles.push(g);return g;
}
for(let i=0;i<15;i++)makeStud();
for(let i=0;i<8;i++)makeObstacle();
function placeInitial(){
  // Rows alternate safe lanes; the player always has a clear choice.
  for(let i=0;i<studsPool.length;i++){
    const row=Math.floor(i/3), col=i%3, z=-13-row*8.6;
    studsPool[i].position.set(laneX[col],.42,z);studsPool[i].visible=true;studsPool[i].userData.active=true;
  }
  for(let i=0;i<obstacles.length;i++){
    const row=Math.floor(i/2), col=i%2===0?0:2, z=-45-row*19-(i%2)*8;
    obstacles[i].position.set(laneX[col],0,z);obstacles[i].visible=true;obstacles[i].userData.active=true;
  }
  spawnZ=-35;
}
placeInitial();

let audioCtx=null;
function blip(freq=660,duration=.09,type='sine',volume=.035){
  try{
    audioCtx ||= new (window.AudioContext||window.webkitAudioContext)();
    if(audioCtx.state==='suspended')audioCtx.resume();
    const osc=audioCtx.createOscillator(),gain=audioCtx.createGain();
    osc.type=type;osc.frequency.setValueAtTime(freq,audioCtx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(Math.max(90,freq*.62),audioCtx.currentTime+duration);
    gain.gain.setValueAtTime(volume,audioCtx.currentTime);gain.gain.exponentialRampToValueAtTime(.001,audioCtx.currentTime+duration);
    osc.connect(gain);gain.connect(audioCtx.destination);osc.start();osc.stop(audioCtx.currentTime+duration);
  }catch{}
}
function showToast(){
  const el=$('#toast');el.classList.add('show');toastTimer=.75;
}
function changeLane(dir){if(!running)return;lane=Math.max(0,Math.min(2,lane+dir));blip(240+lane*45,.055,'triangle',.018)}
function jump(){if(!running||jumpY>0)return;jumpV=8.6;blip(310,.12,'sine',.025)}
function startGame(){
  studs=0;distance=0;speed=15;lane=1;jumpY=0;jumpV=0;time=0;over=false;running=true;
  player.position.set(0,0,0);avatar.position.y=0;placeInitial();
  $('#studCount').textContent='000';$('#distance').textContent='0m';$('#overlay').classList.add('hidden');
  blip(520,.15,'triangle',.03);
}
function endGame(){
  if(!running)return;running=false;over=true;
  const meters=Math.floor(distance);best=Math.max(best,meters);localStorage.setItem('studRunBest',String(best));$('#best').textContent=`${best}m`;
  $('#message').textContent='The track keeps going… and so can you. Ready for another run?';
  $('#start').innerHTML='Run it back&nbsp; ↻';$('#foot').textContent='YOUR BEST: '+best+' METERS';
  $('#overlay').classList.remove('hidden');blip(175,.34,'sawtooth',.045);
}
$('#start').addEventListener('click',startGame);
$('#left').addEventListener('pointerdown',e=>{e.preventDefault();changeLane(-1)});
$('#right').addEventListener('pointerdown',e=>{e.preventDefault();changeLane(1)});
$('#jump').addEventListener('pointerdown',e=>{e.preventDefault();jump()});
window.addEventListener('keydown',e=>{
  if(['ArrowLeft','ArrowRight','ArrowUp',' ','a','d','w'].includes(e.key))e.preventDefault();
  if(e.key==='ArrowLeft'||e.key==='a')changeLane(-1);
  if(e.key==='ArrowRight'||e.key==='d')changeLane(1);
  if(e.key==='ArrowUp'||e.key===' '||e.key==='w')jump();
  if(!running&&(e.key==='Enter'||e.key===' '))startGame();
});
let touchStart=null;
renderer.domElement.addEventListener('pointerdown',e=>{touchStart={x:e.clientX,y:e.clientY};});
renderer.domElement.addEventListener('pointerup',e=>{
  if(!touchStart||!running)return;
  const dx=e.clientX-touchStart.x,dy=e.clientY-touchStart.y;
  if(Math.abs(dx)>30&&Math.abs(dx)>Math.abs(dy))changeLane(dx<0?-1:1);
  else if(dy < -28)jump();
  touchStart=null;
});

function recycle(group,list,spacingMin,spacingMax){
  if(group.position.z<6)return;
  let far=-20;for(const item of list)if(item!==group)far=Math.min(far,item.position.z);
  group.position.z=far-(spacingMin+Math.random()*(spacingMax-spacingMin));
  group.visible=true;group.userData.active=true;
  if(list===obstacles){
    const safe=Math.floor(Math.random()*3);let col=Math.floor(Math.random()*3);if(col===safe)col=(col+1+Math.floor(Math.random()*2))%3;
    group.position.x=laneX[col];
  }else group.position.x=laneX[Math.floor(Math.random()*3)];
}
function update(dt){
  if(running){
    time+=dt;speed=Math.min(25,15+distance*.028);distance+=speed*dt*.36;
    $('#distance').textContent=`${Math.floor(distance)}m`;
    const targetX=laneX[lane];player.position.x+=(targetX-player.position.x)*Math.min(1,dt*11);
    player.position.y=jumpY;
    jumpY+=jumpV*dt;jumpV-=22*dt;if(jumpY<0){jumpY=0;jumpV=0}
    avatar.position.y=jumpY+Math.sin(time*11)*.035;
    avatar.rotation.z+=(laneX[lane]-player.position.x)*-.025;
    leftArm.rotation.z=Math.sin(time*13)*.28;rightArm.rotation.z=-Math.sin(time*13)*.28;
    shadow.position.x=player.position.x;shadow.scale.setScalar(1-jumpY*.12);shadow.material.opacity=Math.max(.12,.38-jumpY*.13);
    camera.position.x+=(player.position.x*.16-camera.position.x)*dt*2.5;
    for(const g of segments){g.position.z+=speed*dt;if(g.position.z>20)g.position.z-=224}
    for(const g of scenery){g.position.z+=speed*dt;if(g.position.z>17)g.position.z-=180}
    for(const g of studsPool){
      if(!g.visible)continue;g.position.z+=speed*dt;g.rotation.y+=dt*1.6;g.position.y=.43+Math.sin(time*5+g.userData.phase)*.1;
      if(Math.abs(g.position.z)<.88&&Math.abs(g.position.x-player.position.x)<.92){
        g.visible=false;g.userData.active=false;studs++;$('#studCount').textContent=String(studs).padStart(3,'0');showToast();blip(740+Math.min(studs,10)*35,.1,'sine',.035);
        if(navigator.vibrate)navigator.vibrate(12);
      }
      recycle(g,studsPool,13,22);
    }
    for(const g of obstacles){
      if(!g.visible)continue;g.position.z+=speed*dt;
      if(Math.abs(g.position.z)<.78&&Math.abs(g.position.x-player.position.x)<1.02&&jumpY<1.17){endGame();break}
      recycle(g,obstacles,20,31);
    }
    if(toastTimer>0){toastTimer-=dt;if(toastTimer<=0)$('#toast').classList.remove('show')}
  }else{
    time+=dt*.45;avatar.position.y=Math.sin(time*2.2)*.045;
    leftArm.rotation.z=Math.sin(time*1.8)*.07;rightArm.rotation.z=-Math.sin(time*1.8)*.07;
  }
  camera.lookAt(player.position.x*.12,.3,-11);
}
let last=performance.now();
function frame(now){const dt=Math.min(.04,(now-last)/1000);last=now;update(dt);renderer.render(scene,camera);requestAnimationFrame(frame)}
requestAnimationFrame(frame);
window.addEventListener('resize',()=>{
  camera.aspect=innerWidth/innerHeight;camera.fov=innerHeight>innerWidth?58:51;camera.updateProjectionMatrix();renderer.setSize(innerWidth,innerHeight);renderer.setPixelRatio(Math.min(devicePixelRatio,1.65));
});
