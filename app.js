/* АгроУМ — Лаборатория семечка.
 * Автономный учебный симулятор. Без зависимостей и сервера.
 * Все научные показатели — упрощённые модельные индексы, не агрономические нормативы.
 */
'use strict';

const $ = (q) => document.querySelector(q);
const $$ = (q) => [...document.querySelectorAll(q)];
const clamp = (n, low, high) => Math.min(high, Math.max(low, n));
const r = (n, digits = 1) => Number(n).toFixed(digits).replace('.', ',');
const SPECIES = {
  basil: { name: 'Базилик', latin: 'Ocimum basilicum', intro: 'Маленькие тёмные семена при увлажнении покрываются слизью. Семядоли выходят над субстратом.', seed: 'мелкое тёмное, со слизистой оболочкой', germ: .27, emergence: 1.55, optimum: [22, 28], limits: [9, 39], grow: .66, root: .62, mature: 3.05, waterNeed: 1, lightNeed: 10, nutritionNeed: 1, color:'#509f3d' },
  radish: { name: 'Редис', latin: 'Raphanus sativus', intro: 'Быстро прорастает. Формирует семядоли, настоящие листья и утолщённый корень при подходящих условиях.', seed: 'округлое коричневое', germ: .38, emergence: 1.45, optimum: [16, 24], limits: [4, 36], grow: .47, root: .79, mature: 2.75, waterNeed: 1.06, lightNeed: 9, nutritionNeed: 1.0, color:'#84b936' },
  pea: { name: 'Горох', latin: 'Pisum sativum', intro: 'Крупное семя, запас питательных веществ внутри. Семядоли остаются под землёй, а побег выпускает усики.', seed: 'крупное округлое', germ: .25, emergence: 1.6, optimum: [16, 24], limits: [4, 35], grow: 1.14, root: .88, mature: 2.92, waterNeed: 1.17, lightNeed: 10, nutritionNeed: .8, color:'#47944e' },
  sunflower: { name: 'Подсолнечник', latin: 'Helianthus annuus', intro: 'Крупные семядоли поднимаются над землёй, позднее появляются шершавые настоящие листья. За 30 дней цветок ещё не обязателен.', seed: 'крупная семянка с оболочкой', germ: .29, emergence: 1.55, optimum: [20, 28], limits: [7, 39], grow: .88, root: .88, mature: 2.95, waterNeed: 1.32, lightNeed: 12, nutritionNeed: 1.13, color:'#79a63c' }
};
const BASE = () => ({water:9,temp:24,light:12,nutrient:50});
function defaults(){return {version:2,species:'basil',day:0,view:'plant',chart:'height',drain:'normal',plan:Array.from({length:31},BASE)}}
let app=defaults();
let model=[],control=[];
let playTimer=null,toastTimer=null;

function simulate(plan, species, drainage){
  const c=SPECIES[species];
  let v={moisture:56,health:100,damage:0,dev:0,height:0,root:0,streakDry:0,streakWet:0,streakDark:0,pale:0,nutStress:0,oxygen:100,dead:false,age:0,leaves:0,bulb:0};
  const result=[{...v,note:'Посев: семя содержит зародыш и запас питательных веществ.'}];
  const dCoefficient={normal:.23,poor:.065,fast:.42}[drainage];
  for(let day=1;day<=30;day++){
    const p=plan[day],prev=v;
    const loss=4.4+Math.max(0,p.temp-10)*.24+p.light*.25+(prev.height>6?1.1:0)*c.waterNeed;
    const gross=prev.moisture+p.water*1.4;
    const moisture=clamp(gross-loss-Math.max(0,gross-58)*dCoefficient,0,100);
    const oxygen=clamp(100-Math.max(0,moisture-77)*3.45-(drainage==='poor'&&moisture>73?12:0),3,100);
    const dry=moisture<29,wet=moisture>86, dark=p.light<5;
    const streakDry=dry?prev.streakDry+1:0;
    const streakWet=wet?prev.streakWet+1:0;
    const streakDark=dark?prev.streakDark+1:0;
    const wf=moisture<40?clamp((moisture-10)/30,0,1):clamp(1-Math.max(0,moisture-77)*.035,0,1);
    const tf=p.temp<c.optimum[0]?clamp((p.temp-c.limits[0])/(c.optimum[0]-c.limits[0]),0,1):p.temp<=c.optimum[1]?1:clamp((c.limits[1]-p.temp)/(c.limits[1]-c.optimum[1]),0,1);
    const nutrition = p.nutrient<20?clamp(.44+p.nutrient*.028, .44,1):p.nutrient<=75?1:clamp(1-(p.nutrient-75)*.024,.34,1);
    let health=prev.health,damage=prev.damage,pale=prev.pale,nutStress=prev.nutStress;
    if(!prev.dead){
      if(dry&&prev.dev>1.25){health-=1.6+(29-moisture)*.20+Math.max(0,streakDry-2)*.95;if(streakDry>5)damage+=.95;}
      if(wet&&prev.dev>1.25&&streakWet>=3){health-=2.25+Math.max(0,streakWet-3)*1.42;damage+=1.9+Math.max(0,streakWet-3)*1.9;}
      if(p.temp>=c.optimum[1]+7)health-=(p.temp-c.optimum[1]-6)*1.05;
      if(p.temp<=c.limits[0]+2)health-=1.7;
      if(streakDark>3&&prev.dev>2.0){health-=.75;pale+=7.5;}
      if(prev.dev>2.2&&p.nutrient<15){health-=.65;nutStress+=2.3;}
      if(prev.dev>2.0&&p.nutrient>85){health-=(p.nutrient-84)*.22;damage+=(p.nutrient-84)*.23;nutStress+=3;}
      if(!dry&&!wet&&p.light>=7&&p.temp>=c.optimum[0]-4&&p.temp<=c.optimum[1]+3&&p.nutrient>=25&&p.nutrient<=75){health+=2.9*(1-damage/145);damage-=.44;pale-=3;nutStress-=2.6;}
    }
    health=clamp(health,0,100);damage=clamp(damage,0,100);pale=clamp(pale,0,100);nutStress=clamp(nutStress,0,100);
    const dead=prev.dead||health<=2;
    // Seed emergence depends mainly on hydration, oxygen and temperature.
    const seedProgress=clamp(wf*tf*(.3+.7*oxygen/100),0,1);
    const lightFactor=prev.dev<1.55?1:clamp(.25+p.light/Math.max(1,c.lightNeed)*.75,.25,1.5);
    const growthFactor=dead?0:seedProgress*lightFactor*nutrition*(.25+.75*health/100)*(1-damage*.006);
    const dev=prev.dev+(prev.dev<1.55?seedProgress:growthFactor)*c.germ;
    let height=prev.height,root=prev.root,bulb=prev.bulb;
    if(dev>c.emergence&&!dead){height+=growthFactor*c.grow*(dark?1.2:1);root+=growthFactor*c.root;}
    // Radish swollen storage root — approximate qualitative depiction, not a yield prediction.
    if(species==='radish'&&dev>4.2&&!dead&&health>40)bulb+=growthFactor*.048;
    height=clamp(height,0,44);root=clamp(root,0,35);bulb=clamp(bulb,0,1);
    let leaves=dev<2.2?0:clamp(Math.floor((dev-2.2)/(species==='pea'?.86:species==='radish'?.85:1.10))+1,0,species==='pea'?6:5);
    if(health<28&&leaves>1)leaves--;
    const age=dev>c.emergence?prev.age+1:prev.age;
    v={moisture,oxygen,health,damage,dev,height,root,streakDry,streakWet,streakDark,pale,nutStress,dead,age,leaves,bulb};
    result.push({...v,note:diaryNote(v,p,c,day)});
  }
  return result;
}

function diaryNote(s,p,c,day){
  if(s.dead)return 'Сильный или длительный стресс: модель считает растение погибшим.';
  if(s.moisture<29&&s.dev>1.5)return 'Влаги недостаточно, листья теряют тургор; рост тормозится.';
  if(s.streakWet>=3&&s.dev>1.5)return 'Переувлажнение: корни недополучают кислород, развивается стресс.';
  if(p.temp>=c.optimum[1]+7)return 'Температура слишком высока для активного развития.';
  if(p.temp<=c.optimum[0]-7)return 'Холод тормозит процессы прорастания и роста.';
  if(s.streakDark>=4&&s.dev>2)return 'Недостаток освещения: побег бледнеет и ослабевает.';
  if(s.damage>24)return 'Условия могли улучшиться, но повреждение корней сохраняется.';
  if(s.nutStress>20)return 'Нарушен режим питания — растение испытывает стресс.';
  if(s.dev<.35)return 'Семя ожидает достаточного увлажнения и тепла.';
  if(s.dev<1.0)return 'Семя впитывает воду, запускается обмен веществ.';
  if(s.dev<1.55)return 'Семенная оболочка раскрывается, выходит зародышевый корешок.';
  if(s.dev<2.2)return 'Растут корни, молодой побег приближается к поверхности.';
  if(s.dev<3.3)return 'Появляются семядоли и первые молодые листья.';
  return day>22?'Развивается молодое растение: новые листья и корневая система.':'Листья растут и при свете участвуют в фотосинтезе.';
}

function paintSpeciesIcon(key){
  const col={basil:'#6ec145',radish:'#8dc63e',pea:'#66b27a',sunflower:'#64ad50'}[key];
  let shape='';
  if(key==='radish')shape='<ellipse cx="35" cy="44" rx="12" ry="9" fill="#e95c64" stroke="#b44650" stroke-width="2"/><path d="M35 51l0 12" stroke="#eacda6" stroke-width="2"/><path d="M34 38Q12 20 19 14Q34 11 37 37M35 37Q49 11 58 17Q65 31 35 41" fill="#76c960" stroke="#4d8e4e" stroke-width="1.5"/>';
  else if(key==='pea')shape='<path d="M35 57Q28 30 37 12" stroke="#57964d" stroke-width="3" fill="none"/><path d="M31 42Q9 30 18 21Q37 22 35 39M36 25Q56 7 57 23Q54 35 35 30" fill="#7cce6b" stroke="#4d9656" stroke-width="1.5"/><path d="M37 12q-11-12 0-11q11 5 4 11" stroke="#559452" stroke-width="1.5" fill="none"/>';
  else if(key==='sunflower')shape='<path d="M35 56V18" stroke="#57964d" stroke-width="4"/><path d="M35 35Q6 13 13 37Q19 46 35 39M35 27Q57 6 65 23Q63 39 35 34" fill="#83cd56" stroke="#4d9656" stroke-width="1.5"/><ellipse cx="35" cy="13" rx="7" ry="12" fill="#b1d85d"/>';
  else shape='<path d="M35 59V20" stroke="#619e4b" stroke-width="3.5"/><path d="M35 48Q8 35 12 25Q24 14 36 43M36 38Q64 21 59 11Q41 4 35 33M35 24Q24 11 30 4Q42 3 35 24" fill="#83d968" stroke="#478f49" stroke-width="1.5"/>';
  return `<svg viewBox="0 0 70 64" aria-hidden="true"><circle cx="35" cy="31" r="29" fill="#e7f5d4"/><ellipse cx="35" cy="59" rx="24" ry="4" fill="#c7b09b"/>${shape}</svg>`;
}
function leafGeometry(x,y,side,L,drop,style,color,idx){
  // Long petiole, separate smooth blade, median vein and lateral veins.
  // Angular leaf icons would make all four species look identical.
  const sign=side;
  const bx=x+sign*L*.36, by=y-3+drop*9;
  const endX=x+sign*L*1.20, endY=y-9+drop*23;
  const halfWidth=style==='sunflower'?21:style==='radish'?15:style==='pea'?11:13;
  const amp=halfWidth*(.70+L/75);
  const outline=style==='sunflower'
    ?`M${bx} ${by} Q${bx+sign*9} ${by-20} ${bx+sign*L*.46} ${by-amp} Q${endX-sign*7} ${endY-amp*.60} ${endX} ${endY} Q${endX-sign*L*.25} ${endY+amp} ${bx+sign*L*.36} ${by+amp*.8} Q${bx+sign*7} ${by+12} ${bx} ${by}Z`
    :style==='radish'
    ?`M${bx} ${by} Q${bx+sign*L*.2} ${by-amp} ${bx+sign*L*.45} ${by-amp*.7} Q${endX-sign*9} ${endY-amp*1.2} ${endX} ${endY} Q${endX-sign*8} ${endY+amp*.5} ${bx+sign*L*.46} ${by+amp} Q${bx+sign*5} ${by+amp*.65} ${bx} ${by}Z`
    :`M${bx} ${by} Q${bx+sign*L*.26} ${by-amp} ${endX} ${endY} Q${bx+sign*L*.52} ${by+amp} ${bx} ${by}Z`;
  const branch=`<path d="M${x} ${y} Q${bx-sign*2} ${by+4} ${bx} ${by}" fill="none" stroke="#5d9d53" stroke-width="2.4"/>`;
  const midrib=`<path d="M${bx} ${by} Q${bx+sign*L*.38} ${by+drop*5} ${endX} ${endY}" fill="none" stroke="#dce9b0" stroke-width="1.5"/>`;
  const veins=[.52,.76].map(k=>`<path d="M${bx+sign*(endX-bx)*sign*k} ${by+(endY-by)*k} l${sign*3.5} -5 M${bx+sign*(endX-bx)*sign*k} ${by+(endY-by)*k} l${sign*3.5} 5" stroke="#d7e6a5" stroke-width="1" opacity=".75"/>`).join('');
  const spot=idx%3===0?`<circle cx="${bx+(endX-bx)*.67}" cy="${by+(endY-by)*.66+3}" r="1.8" fill="#97a85c" opacity=".33"/>`:'';
  return `${branch}<path d="${outline}" fill="${color}" stroke="#477f45" stroke-width="1.7" stroke-linejoin="round"/>${midrib}${veins}${spot}`;
}
function leafPair(x,y,scale,drop,style,col,i){
  const L=(style==='sunflower'?53:style==='radish'?41:style==='pea'?35:43)*scale;
  return `<g>${leafGeometry(x,y,-1,L,drop,style,col,i)}${leafGeometry(x,y,1,L,drop,style,col,i+1)}</g>`;
}

function plantArtwork(species, st, view='plant'){
  const c=SPECIES[species];
  const isDry=st.moisture<29, wet=st.moisture>87;
  const droop=st.dead?1:isDry?clamp(.23+st.streakDry*.16,0,1):wet&&st.streakWet>=3?clamp((st.streakWet-2)*.18+st.damage*.004,0,1):clamp((84-st.health)/125,0,.65);
  const col=st.dead?'#a58c61':st.pale>65?'#c9c878':st.health>75?'#84dc30':st.health>46?'#b1c861':st.health>25?'#ccb15e':'#b08f63';
  const stem=st.dead?'#8c7650':st.pale>55?'#adb475':'#5a9e48';
  const rootCol=st.damage>38?'#a98561':st.damage>20?'#d5b68a':'#eee1c6';
  const hp=clamp(st.height*5.6,0,190),rp=clamp(st.root*4.4,0,118);
  const soil=isDry?'#c6a481':wet?'#79796f':'#a18869';
  const x=409,y=246;
  const dots=Array.from({length:79},(_,i)=>`<ellipse cx="${214+(i*61)%390}" cy="${250+(i*41)%152}" rx="${1+(i%4)*.75}" ry="${1+i%3*.55}" fill="${i%3===0?'#d6bd9e':'#534436'}" opacity="${.35+(i%3)*.15}"/>`).join('');
  const sunRays=Array.from({length:9},(_,i)=>`<path d="M0 -28V-34" transform="rotate(${i*40})" stroke="#edbc66" stroke-width="2.5" stroke-linecap="round"/>`).join('');
  let seed='';
  if(species==='pea')seed='<circle r="37" fill="#bbbc7c" stroke="#8e9d71" stroke-width="3"/><path d="M-5 -36Q17 -14 -2 12Q-12 27 6 36" fill="none" stroke="#6c956b" stroke-width="4"/><ellipse cx="6" cy="-2" rx="21" ry="30" fill="#e3dba6" stroke="#a3a476" stroke-width="1.5"/><path d="M-2 -24Q12 -15 -1 4T3 27" stroke="#679457" fill="none" stroke-width="3"/>';
  else if(species==='sunflower')seed='<ellipse rx="25" ry="50" fill="#57524e" stroke="#343533" stroke-width="3"/><path d="M-13 -39Q-5 1 -14 37 M13 -39Q5 1 14 37" fill="none" stroke="#e1dac2" stroke-width="5"/><ellipse rx="13" ry="33" fill="#ead5a8" opacity=".92"/><path d="M-3 -21Q9 -2 -5 22" stroke="#95a46f" stroke-width="3" fill="none"/>';
  else if(species==='radish')seed='<ellipse rx="29" ry="31" fill="#a67c57" stroke="#72573f" stroke-width="3"/><ellipse rx="17" ry="24" fill="#ddc59a"/><path d="M-4 -16Q8 -5 -2 8Q-7 17 3 23" stroke="#9da577" stroke-width="4" fill="none"/>';
  else seed='<ellipse rx="23" ry="44" fill="#39302b" stroke="#785f49" stroke-width="3"/><ellipse rx="14" ry="27" fill="#e3cca1"/><path d="M-7 -22Q-18 -6 -5 18Q3 28 8 18Q0 4 7 -7Q11 -23 -1 -24Z" fill="#eddbad" stroke="#bca579"/><path d="M-2 -13Q5 1 -2 12Q-5 19 1 27" stroke="#9aab7f" stroke-width="3" fill="none"/>';
  const seedMucilage=species==='basil'&&st.dev>.17?'<ellipse rx="31" ry="53" fill="#8cd0be" opacity=".33" stroke="#80b6a6" stroke-width="2"/>':'';
  const magnifier=`<g><rect x="17" y="33" width="179" height="285" rx="27" fill="#fff" stroke="#d8eadb" stroke-width="2"/><text x="106" y="63" text-anchor="middle" font-size="13" font-weight="800" fill="#4d9c37" letter-spacing="1">ПОД МИКРОСКОПОМ</text><circle cx="107" cy="170" r="75" fill="#f0f7e9" stroke="#569dca" stroke-width="6"/><g transform="translate(106 169) rotate(-22)">${seedMucilage}${seed}${st.dev>.95?'<path d="M0 38Q-10 52 -2 67" stroke="#f1dfc4" stroke-width="5" fill="none" stroke-linecap="round"/>':''}</g><text x="106" y="275" font-size="12" fill="#587767" text-anchor="middle">${{basil:'Тёмное семя',radish:'Семя редиса',pea:'Семя гороха',sunflower:'Семянка'}[species]}</text><text x="106" y="297" font-size="10" fill="#8ba195" text-anchor="middle">СХЕМА · УВЕЛИЧЕНО</text></g>`;
  let rootArt='';
  if(rp>0){
    rootArt=`<g fill="none" stroke="${rootCol}" stroke-linecap="round"><path d="M${x} ${y+2} Q${x-8} ${y+rp*.35} ${x+4} ${y+rp*.7} L${x-5} ${y+rp}" stroke-width="${clamp(2+rp*.045,2,7)}"/>`;
    if(species==='radish'&&st.bulb>.1){const size=st.bulb*20;rootArt+=`<path d="M${x} ${y+6} Q${x-size} ${y+22} ${x-4} ${y+33+size} Q${x+size} ${y+31} ${x} ${y+6}Z" fill="#e86978" stroke="#c74d62" stroke-width="2"/>`;}
    if(rp>18)rootArt+=`<path d="M${x-3} ${y+rp*.27} Q${x-29} ${y+rp*.29} ${x-51} ${y+rp*.54} M${x+1} ${y+rp*.43} Q${x+34} ${y+rp*.39} ${x+62} ${y+rp*.7}" stroke-width="3"/>`;
    if(rp>48)rootArt+=`<path d="M${x-15} ${y+rp*.43} l-16 -14 M${x-27} ${y+rp*.54} l-21 12 M${x+22} ${y+rp*.5} l15 -16 M${x+41} ${y+rp*.61} l13 12 M${x-3} ${y+rp*.77} l-19 9 M${x+1} ${y+rp*.73} l16 12" stroke-width="2"/>`;
    if(rp>70)rootArt+=Array.from({length:20},(_,i)=>{const xx=x-36+(i*37)%85,yy=y+31+(i*19)%70;return `<path d="M${xx} ${yy} l${i%2===0?-6:7} ${i%3===0?-6:6}" stroke-width="1.3" opacity=".88"/>`;}).join('');
    rootArt+='</g>';
  }
  let leaves='';
  if(hp>0){
    // Species-specific cotyledon positioning. Pea cotyledons stay inside the seed below soil.
    if(species!=='pea'&&st.dev>1.65){
      leaves+=leafPair(x,y-14,.44,droop*.5,'basil',col,0);
    }
    if(species==='radish'){
      const n=st.leaves;
      for(let i=0;i<n;i++){
        const off=i*11;leaves+=`<path d="M${x} ${y-12-i*4} Q${x+(i%2?1:-1)*(36+off*.75)} ${y-67+i*9} ${x+(i%2?1:-1)*(45+off)} ${y-22+i*3+droop*19}" stroke="${stem}" fill="none" stroke-width="3"/>`;
        leaves+=leafGeometry(x+(i%2?1:-1)*(45+off),y-23+i*3+droop*19,i%2?1:-1,26,0.2,'radish',col,i);
      }
    }else{
      for(let i=0;i<st.leaves;i++){
        const pos=y-22-hp*((i+1)/(st.leaves+1)),size=clamp(.55+st.dev*.025+i*.065,.56,1.12);
        leaves+=leafPair(x,pos,size,droop,species,col,i);
        if(species==='pea'){
          const o=30+5*i;leaves+=`<path d="M${x} ${pos-5} q${i%2?-o:o} -21 ${i%2?-30:30} -25 q${i%2?-17:17} -8 ${i%2?-9:9} -18" stroke="#5c9f51" stroke-width="2" fill="none"/>`;
        }
      }
    }
    if(st.dev>1.8){leaves+=leafPair(x,y-hp, species==='sunflower'?.5:.35,droop*.7,species,col,0)}
    if(species==='sunflower'&&st.leaves>3){leaves+=`<path d="M${x} ${y-hp-6}V${y-hp-17}" stroke="${stem}" stroke-width="4"/>`}
  }
  const rootsLens=view==='roots'?`<g><rect x="225" y="30" width="242" height="151" rx="24" fill="#fff" stroke="#579ac2" stroke-width="3"/><circle cx="305" cy="104" r="61" fill="#e7dbc7" stroke="#c8b99f" stroke-width="2"/><path d="M306 60 Q292 108 307 148" stroke="${rootCol}" stroke-width="8" fill="none" stroke-linecap="round"/><g stroke="${rootCol}" fill="none" stroke-linecap="round" stroke-width="3"><path d="M300 90Q279 72 266 84M305 111Q335 90 348 102M306 122Q285 117 266 132M308 135Q331 128 340 141"/></g>${Array.from({length:10},(_,i)=>`<path d="M${i%2?282:330} ${75+i*7} l${i%2?-8:8} -5" stroke="#ece0c9" stroke-width="1.6"/>`).join('')}<text x="389" y="76" font-size="12" fill="#5c8d66" font-weight="bold">КОРНИ</text><text x="389" y="101" font-size="14" fill="#356c54">${r(st.root)} см</text><text x="389" y="122" font-size="11" fill="#7a8d7c">Доступ O₂</text><text x="389" y="143" font-size="14" font-weight="bold" fill="${st.oxygen<45?'#c77959':'#4b9c37'}">${Math.round(st.oxygen)}%</text></g>`:'';
  const seedLens=view==='seed'?`<g><rect x="215" y="26" width="250" height="150" rx="25" fill="#fff" stroke="#6aa2c7" stroke-width="3"/><g transform="translate(292 98) rotate(-20) scale(1.26)">${seedMucilage}${seed}</g><path d="M311 72L365 54" stroke="#82a293" stroke-width="1.6"/><path d="M298 101L363 96" stroke="#82a293" stroke-width="1.6"/><path d="M288 121L366 138" stroke="#82a293" stroke-width="1.6"/><g font-size="11" fill="#527965"><text x="370" y="54">Оболочка</text><text x="370" y="98">Зародыш</text><text x="370" y="140">Запас веществ</text></g></g>`:'';
  const glass=`<path d="M207 245H622L601 411Q600 422 587 422H243Q231 422 229 411Z" fill="#f7faf3" stroke="#6ba5c7" stroke-width="3"/>`;
  const soilPieces=`<g clip-path="url(#soil-clip)"><rect x="200" y="245" width="430" height="180" fill="url(#soil-grad)"/>${dots}${wet?`<rect x="200" y="245" width="430" height="178" fill="#6db9cd" opacity="${st.moisture>92?.32:.17}"/>`:''}${wet?Array.from({length:11},(_,i)=>`<circle cx="${235+(i*53)%358}" cy="${267+(i*47)%121}" r="${2+i%4}" fill="#d0e9ef" opacity=".75"/>`).join(''):''}${isDry?'<path d="M256 245l14 14-7 17 11 14M562 245l-13 17 8 15-11 12M324 245l-9 14 8 8" stroke="#ead3b2" stroke-width="2.5" fill="none"/>':''}${rootArt}</g>`;
  let stemArt='';
  if(hp>0){
    const top=y-hp;
    stemArt=`<path d="M${x} ${y} Q${x-5-hp*.025} ${y-hp*.53} ${x} ${top}" fill="none" stroke="${stem}" stroke-width="${clamp(2.7+hp*.017,3,6)}" stroke-linecap="round"/>${leaves}`;
  }else if(st.dev>.3){stemArt=`<ellipse cx="${x}" cy="${y+3}" rx="${species==='pea'?13:8}" ry="6" fill="${species==='basil'?'#3a302c':'#ac9267'}" stroke="#775b45" stroke-width="2"/>`}
  if(st.dev<1.85){stemArt+=`<ellipse cx="${x}" cy="${y+2}" rx="${species==='pea'?13:8}" ry="${species==='pea'?9:5}" fill="${species==='basil'?'#3a302c':'#b89b68'}" stroke="#725b44" stroke-width="1.7"/>`}
  let radishBulb='';
  if(species==='radish'&&st.bulb>.05){const size=st.bulb*22;radishBulb=`<path d="M${x} ${y+2} Q${x-size} ${y+9} ${x-size*.65} ${y+21+size} Q${x} ${y+31+size} ${x+size*.65} ${y+21+size} Q${x+size} ${y+9} ${x} ${y+2}Z" fill="#e86570" stroke="#bb4d60" stroke-width="2.5" opacity=".95"/>`;}
  let overlay='';
  if(st.dead){overlay=`<g><path d="M${x+57} ${y-18}q-7 -10 -15 -3t-9 6" fill="none" stroke="#9b8354" stroke-width="2"/><ellipse cx="${x+69}" cy="${y-7}" rx="11" ry="5" fill="#b49d60" transform="rotate(35 ${x+69} ${y-7})"/></g>`;}
  const seedLabels=view==='seed'?'Внутреннее строение':'Настоящий росток';
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 432" role="img" aria-labelledby="scene-svg-title"><title id="scene-svg-title">${c.name}: надземная часть и корни, день ${app.day}. Образовательная схема.</title><defs><linearGradient id="sky-grad" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#e7f6ed"/><stop offset="1" stop-color="#f7fbeb"/></linearGradient><linearGradient id="soil-grad" x1="0" y1="0" x2=".2" y2="1"><stop offset="0" stop-color="${soil}"/><stop offset="1" stop-color="#66513d"/></linearGradient><clipPath id="soil-clip"><path d="M207 245H622L601 411Q600 422 587 422H243Q231 422 229 411Z"/></clipPath></defs><rect width="640" height="432" rx="18" fill="url(#sky-grad)"/><g transform="translate(572 52)"><circle r="32" fill="#f9c76c" opacity=".19"/><circle r="19" fill="#f6c86e"/>${sunRays}</g><path d="M0 390Q53 366 116 386T232 378T438 386T640 373V432H0Z" fill="#8ddb2a" opacity=".13"/>${magnifier}<text x="232" y="44" font-weight="800" font-size="14" fill="#478f57" letter-spacing="1">${view==='roots'?'ИССЛЕДОВАНИЕ КОРНЕЙ':view==='seed'?'СТРОЕНИЕ СЕМЕНИ':'РАСТЕНИЕ В РАЗРЕЗЕ'}</text>${glass}${soilPieces}${radishBulb}<path d="M207 245Q306 239 410 245T622 245" stroke="#806a50" stroke-width="3" fill="none"/>${stemArt}${overlay}${rootsLens}${seedLens}<text x="237" y="231" fill="#61816b" font-size="12">Поверхность субстрата</text><text x="526" y="405" fill="#f6e8cf" font-size="12">Корни</text><rect x="23" y="346" width="166" height="65" rx="21" fill="#579fca"/><text x="106" y="367" font-size="12" text-anchor="middle" font-weight="bold" fill="#fff">ВЛАЖНОСТЬ ПОЧВЫ</text><text x="106" y="397" font-size="24" text-anchor="middle" font-weight="bold" fill="#fff">${Math.round(st.moisture)}%</text><text x="623" y="18" text-anchor="end" fill="#739185" font-size="10">СХЕМА НЕ В МАСШТАБЕ</text></svg>`;
}
function assessment(s,p){
  if(s.dead)return {kind:'critical',head:'Растение погибло',description:'Накопленный стресс стал критическим. В этой модели возвращение воды, света и тепла уже не оживит растение — начни новый эксперимент.'};
  if(s.streakDry>=2&&s.dev>1.55)return {kind:'warning',head:'Засуха: растение теряет влагу',description:'Листья поникают из-за потери тургора, рост замедляется. Длительная засуха может повредить ткани и корни.'};
  if(s.streakWet>=3&&s.dev>1.55)return {kind:'warning',head:'Перелив: корням не хватает воздуха',description:'Почвенные поры заполнены водой. Корни испытывают дефицит кислорода; из-за этого растение может увядать даже в мокрой земле.'};
  if(s.damage>22)return {kind:'warning',head:'Восстановление после стресса',description:'Влажность могла прийти в норму, но повреждённая корневая система восстанавливается медленно. Рост ещё отстаёт от контрольного.'};
  if(s.pale>40)return {kind:'warning',head:'Недостаточно света',description:'Листья бледнеют; при нехватке света побег может чрезмерно вытягиваться, оставаясь слабым.'};
  if(s.nutStress>25)return {kind:'warning',head:'Нарушен режим питания',description:'Дефицит или избыток доступных питательных веществ замедляет рост и способен повреждать корни.'};
  if(p.temp>=SPECIES[app.species].optimum[1]+7)return {kind:'warning',head:'Температурный стресс',description:'Слишком высокая температура снижает темп развития и усиливает расход воды.'};
  if(p.temp<=SPECIES[app.species].optimum[0]-7)return {kind:'warning',head:'Для культуры слишком холодно',description:'Низкая температура замедляет процессы внутри семени и растения.'};
  if(s.dev<.35)return {kind:'normal',head:'Семечко ждёт подходящих условий',description:'В сухом зрелом семени есть зародыш. Вода запускает набухание, ферментативные процессы и дальнейшее прорастание.'};
  if(s.dev<1.0)return {kind:'normal',head:'Набухание и пробуждение',description:'Семя поглощает влагу. У базилика при намокании появляется характерная слизистая оболочка.'};
  if(s.dev<1.55)return {kind:'normal',head:'Первым появляется корешок',description:'Зародышевый корень начинает проникать в субстрат и закреплять молодое растение.'};
  if(s.dev<2.4)return {kind:'normal',head:'Рост начинается!',description:app.species==='pea'?'Зародышевый побег тянется к свету. Семядоли гороха остаются в семени под землёй.':'Побег поднимает семядоли к свету, корневая система продолжает развиваться.'};
  return {kind:'normal',head:'Растение развивается',description:'При достаточном освещении листья фотосинтезируют, корни поглощают воду и растворённые вещества. Сравни рост с контрольным образцом.'};
}
function setDay(d){app.day=clamp(d,0,30);pause();render();persist()}
function chooseSpecies(s){if(!SPECIES[s]||s===app.species)return;pause();app=defaults();app.species=s;render();persist();notify('Новый опыт: '+SPECIES[s].name+'. Данные предыдущего опыта заменены.')}
function changeSetting(key,val){const start=Math.max(1,app.day);for(let i=start;i<=30;i++)app.plan[i][key]=val;render();persist()}
function applyEvent(event){pause();const start=Math.max(1,app.day);const spec={drought:{days:6,key:'water',value:0},flood:{days:6,key:'water',value:43},heat:{days:6,key:'temp',value:38},dark:{days:8,key:'light',value:1},hungry:{days:8,key:'nutrient',value:0},feed:{days:7,key:'nutrient',value:100}}[event];if(!spec)return;
  const ordinary=BASE()[spec.key];
  for(let i=start;i<=30;i++){if(i<start+spec.days)app.plan[i][spec.key]=spec.value;else app.plan[i][spec.key]=ordinary;}
  render();persist();notify(`Сценарий начнётся с дня ${start}. Пролистай время вперёд.`);
}
function rescue(){pause();const start=Math.max(1,app.day),moist=model[app.day]?.moisture??56;
  for(let i=start;i<=30;i++){
    app.plan[i].temp=app.species==='radish'||app.species==='pea'?22:24;
    app.plan[i].light=12;app.plan[i].nutrient=50;
    app.plan[i].water=i===start?(moist<35?22:moist>82?0:9):moist>82&&i<=start+2?0:9;
  }
  render();persist();notify('Начат план спасения. Посмотри, что изменится через несколько дней.');
}
function updateSpecies(){
  $('#species-grid').innerHTML=Object.entries(SPECIES).map(([key,s])=>`<button type="button" class="species-card ${app.species===key?'active':''}" data-species="${key}" aria-pressed="${app.species===key}"><span class="species-illustration">${paintSpeciesIcon(key)}</span><span><strong>${s.name}</strong><small>${s.latin}</small></span></button>`).join('');
  $('#species-note').textContent=SPECIES[app.species].intro;
  $('#plant-title').textContent=SPECIES[app.species].name;
}
function updateControls(){const p=app.plan[Math.max(1,app.day)];
  const fields=[['water',p.water,`${p.water} мл`],['temperature',p.temp,`${p.temp} °C`],['light',p.light,`${p.light} ч`],['nutrient',p.nutrient,`${p.nutrient}%`]];
  for(const [k,v,label] of fields){$('#'+k+'-input').value=String(v);$('#'+k+'-value').textContent=label;}
  $('#drain-input').value=app.drain;
  $('#day-slider').value=String(app.day);
  $('#day-slider').style.backgroundSize=(app.day/30*100)+'% 100%';
  $('#prev-day').disabled=app.day===0;
  $('#next-day').disabled=app.day===30;
  $('#play-button').textContent=playTimer?'Ⅱ Пауза':'▶ По дням';
  $('#day-label').textContent=`${app.day} / 30`;
  $$('#species-grid .species-card').forEach(b=>{b.classList.toggle('active',b.dataset.species===app.species);b.setAttribute('aria-pressed',String(b.dataset.species===app.species))});
  ['plant','roots','seed'].forEach(k=>{const el=$('#tab-'+k);el.classList.toggle('active',app.view===k);el.setAttribute('aria-pressed',String(app.view===k))});
  $$('[data-chart]').forEach(b=>{b.classList.toggle('active',app.chart===b.dataset.chart);b.setAttribute('aria-pressed',String(app.chart===b.dataset.chart))});
}
function updatePlant(){const s=model[app.day],p=app.plan[Math.max(1,app.day)];$('#plant-scene').innerHTML=plantArtwork(app.species,s,app.view);
  $('#stat-height').textContent=r(s.height)+' см';$('#stat-health').textContent=Math.round(s.health)+'%';$('#stat-roots').textContent=r(s.root)+' см';$('#stat-moisture').textContent=Math.round(s.moisture)+'%';
  const diag=assessment(s,p);$('#diagnosis').className='diagnosis '+(diag.kind==='normal'?'':diag.kind);$('#diagnosis').innerHTML=`<div class="title">${diag.head}</div><p>${diag.description}</p>`;
  $('#plant-scene').setAttribute('aria-label',`${SPECIES[app.species].name}, день ${app.day}, высота ${r(s.height)} сантиметров, состояние ${Math.round(s.health)} процентов. ${diag.head}`);
}
function updateTape(){
  $('#event-tape').innerHTML=model.map((s,i)=>{const cls=s.dead?'failed':s.health<55?'stressed':s.moisture<29?'sparse':s.moisture>86?'flooded':'';return `<button class="tape-segment ${cls} ${app.day===i?'current':''}" type="button" data-tapeday="${i}" aria-label="Перейти к дню ${i}, здоровье ${Math.round(s.health)}%" title="День ${i}: влажность ${Math.round(s.moisture)}%, состояние ${Math.round(s.health)}%"></button>`}).join('');
}
function getChartSeries(){const props={height:['Высота растения, см','height'],health:['Условный индекс здоровья, %','health'],moisture:['Индекс влажности субстрата, %','moisture']};const [title,key]=props[app.chart];let max=key==='height'?Math.max(10,Math.ceil(Math.max(...control.map(s=>s.height),...model.map(s=>s.height))/5)*5):100;return {title,key,max};}
function updateChart(){const {title,key,max}=getChartSeries();$('#chart-heading').textContent=title;const w=560,h=230,x0=36,x1=546,y0=13,y1=188;
  const x=d=>x0+d*(x1-x0)/30,y=v=>y1-(clamp(v,0,max)/max)*(y1-y0);
  const values=a=>a.map((s,i)=>`${x(i).toFixed(1)},${y(s[key]).toFixed(1)}`).join(' ');
  const grid=[0,.25,.5,.75,1].map(f=>`<line x1="${x0}" x2="${x1}" y1="${y(max*f)}" y2="${y(max*f)}" stroke="#e1e9e0" stroke-dasharray="3 4"/><text x="30" y="${y(max*f)+4}" fill="#718a7d" font-size="11" text-anchor="end">${Math.round(max*f)}</text>`).join('');
  const ticks=[0,5,10,15,20,25,30].map(i=>`<text x="${x(i)}" y="208" text-anchor="middle" fill="#6a8879" font-size="12">${i}</text>`).join('');
  $('#chart').innerHTML=`<svg viewBox="0 0 560 230" role="img" aria-label="${title}"><rect x="36" y="12" width="510" height="178" fill="#f5faf6" rx="11"/>${grid}<polyline points="${values(control)}" fill="none" stroke="#9caeaf" stroke-width="3" stroke-dasharray="6 6" stroke-linejoin="round"/><polyline points="${values(model)}" fill="none" stroke="#69b838" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"/><line x1="${x(app.day)}" y1="12" x2="${x(app.day)}" y2="192" stroke="#589ac3" stroke-width="2" opacity=".8"/><circle cx="${x(app.day)}" cy="${y(model[app.day][key])}" r="6" fill="#54ab36" stroke="white" stroke-width="3"/>${ticks}<text x="544" y="226" font-size="11" text-anchor="end" fill="#718a7d">Дни</text></svg>`;
  const value=(v)=>key==='height'?r(v)+' см':Math.round(v)+'%';const delta=model[app.day][key]-control[app.day][key];
  $('#comparison').innerHTML=`<div class="comparison-row"><span>Твоё растение · день ${app.day}</span><strong>${value(model[app.day][key])}</strong></div><div class="comparison-row"><span>Контроль · день ${app.day}</span><strong>${value(control[app.day][key])}</strong></div><div class="comparison-row"><span>Разница</span><strong>${delta>0?'+':''}${value(delta)}</strong></div>`;
}
function updateJournal(){const p=app.plan[Math.max(1,app.day)],s=model[app.day];$('#journal-day').innerHTML=`<strong>День ${app.day} · ${s.dead?'Растение погибло':s.dev<1.55?'Прорастание':s.dev<2.25?'Первые всходы':'Рост растения'}</strong><p>${s.note} Высота: ${r(s.height)} см. Влажность: ${Math.round(s.moisture)}%. Температура: ${p.temp} °C. Освещение: ${p.light} ч.</p>`;
  const records=[];for(let d=app.day;d>=0&&records.length<5;d--){if(d===0||d===app.day||d%5===0||model[d].streakDry===2||model[d].streakWet===3||(!model[d-1].dead&&model[d].dead))records.push({d,note:model[d].note})}
  $('#journal-history').innerHTML=records.map(x=>`<div class="journal-entry"><span class="entry-day">День ${x.d}</span><span>${x.note}</span></div>`).join('');
}
function render(){model=simulate(app.plan,app.species,app.drain);const plan=Array.from({length:31},BASE);control=simulate(plan,app.species,'normal');updateSpecies();updateControls();updatePlant();updateTape();updateChart();updateJournal()}
function persist(){try{localStorage.setItem('agroum-seed-lab-v2',JSON.stringify({version:2,species:app.species,day:app.day,view:app.view,chart:app.chart,drain:app.drain,plan:app.plan}))}catch(e){/* private mode or storage denied */}}
function validate(data){
  if(!data||data.version!==2||!SPECIES[data.species]||!['normal','poor','fast'].includes(data.drain)||!Array.isArray(data.plan)||data.plan.length!==31)throw new Error('Неподходящий формат сохранения');
  const p=data.plan.map(v=>{if(!v||!Object.values(v).every(x=>typeof x==='number'&&Number.isFinite(x)))throw new Error('Некорректные параметры');return {water:clamp(v.water,0,45),temp:clamp(v.temp,5,40),light:clamp(v.light,0,18),nutrient:clamp(v.nutrient,0,100)}});
  if(p.some(v=>Object.values(v).some(Number.isNaN)))throw new Error('Отсутствуют параметры');
  return {version:2,species:data.species,day:clamp(Math.round(Number(data.day)||0),0,30),view:['plant','roots','seed'].includes(data.view)?data.view:'plant',chart:['height','health','moisture'].includes(data.chart)?data.chart:'height',drain:data.drain,plan:p};
}
function loadSaved(){try{const raw=localStorage.getItem('agroum-seed-lab-v2');if(raw)app=validate(JSON.parse(raw))}catch(e){app=defaults()}}
function download(name,text,type){const blob=new Blob([text],{type});const url=URL.createObjectURL(blob);const a=document.createElement('a');a.href=url;a.download=name;document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),500)}
function exportCsv(){const lines=['День;Культура;Полив_мл;Температура_C;Свет_часов;Минеральное_питание_индекс;Влажность_индекс;Высота_см;Корни_см;Здоровье_индекс;Повреждение_корней_индекс;Кислород_индекс;Стадия_развития'];for(let i=0;i<=30;i++){const s=model[i],p=app.plan[Math.max(1,i)];lines.push([i,SPECIES[app.species].name,p.water,p.temp,p.light,p.nutrient,r(s.moisture),r(s.height),r(s.root),r(s.health),r(s.damage),r(s.oxygen),s.dead?'Гибель':s.dev<1.5?'Прорастание':s.dev<2.3?'Всходы':'Рост'].join(';'))}download(`АгроУМ_${app.species}_30дней.csv`,'\uFEFF'+lines.join('\r\n'),'text/csv;charset=utf-8');notify('Таблица наблюдений скачана. Открой её в Excel или Google Таблицах.')}
function notify(msg){const el=$('#toast');el.textContent=msg;el.classList.add('show');clearTimeout(toastTimer);toastTimer=setTimeout(()=>el.classList.remove('show'),3800)}
function pause(){if(playTimer){clearInterval(playTimer);playTimer=null;$('#play-button').textContent='▶ По дням'}}
function togglePlay(){if(playTimer){pause();return}if(app.day===30)app.day=0;playTimer=setInterval(()=>{if(app.day>=30){pause();return}app.day++;render();persist();if(app.day>=30)pause()},650);$('#play-button').textContent='Ⅱ Пауза'}
function setup(){loadSaved();render();
  $('#species-grid').addEventListener('click',e=>{const b=e.target.closest('[data-species]');if(b)chooseSpecies(b.dataset.species)});
  ['plant','roots','seed'].forEach(v=>$('#tab-'+v).addEventListener('click',()=>{app.view=v;render();persist()}));
  $$('[data-chart]').forEach(b=>b.addEventListener('click',()=>{app.chart=b.dataset.chart;render();persist()}));
  const controls=[['water-input','water'],['temperature-input','temp'],['light-input','light'],['nutrient-input','nutrient']];
  for(const [id,k] of controls)$('#'+id).addEventListener('input',e=>{pause();changeSetting(k,Number(e.target.value))});
  $('#drain-input').addEventListener('change',e=>{pause();app.drain=e.target.value;render();persist()});
  $('#day-slider').addEventListener('input',e=>setDay(Number(e.target.value)));
  $('#next-day').addEventListener('click',()=>setDay(app.day+1));$('#prev-day').addEventListener('click',()=>setDay(app.day-1));
  $('#play-button').addEventListener('click',togglePlay);
  $('#event-tape').addEventListener('click',e=>{const b=e.target.closest('[data-tapeday]');if(b)setDay(Number(b.dataset.tapeday))});
  $$('[data-event]').forEach(b=>b.addEventListener('click',()=>applyEvent(b.dataset.event)));
  $('#rescue-button').addEventListener('click',rescue);
  $('#start-over').addEventListener('click',()=>{pause();const current=app.species;app=defaults();app.species=current;render();persist();notify('Новый эксперимент начат.')});
  $('#export-scene').addEventListener('click',()=>{const svg=$('#plant-scene svg');if(!svg)return;const cloned=svg.cloneNode(true);cloned.setAttribute('xmlns','http://www.w3.org/2000/svg');download(`АгроУМ_${app.species}_день_${app.day}.svg`,new XMLSerializer().serializeToString(cloned),'image/svg+xml;charset=utf-8');notify('Схема растения сохранена в формате SVG.')});
  $('#export-csv').addEventListener('click',exportCsv);
  $('#export-json').addEventListener('click',()=>{download(`АгроУМ_опыт_${app.species}.json`,JSON.stringify({version:2,species:app.species,day:app.day,view:app.view,chart:app.chart,drain:app.drain,plan:app.plan},null,2),'application/json;charset=utf-8');notify('Файл эксперимента сохранён.')});
  $('#import-json').addEventListener('change',async(e)=>{const file=e.target.files?.[0];if(!file)return;try{const data=JSON.parse(await file.text());const next=validate(data);pause();app=next;render();persist();notify('Эксперимент восстановлен.')}catch(err){notify('Файл не загружен: '+err.message)}finally{e.target.value=''}});
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',setup);else setup();
