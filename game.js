(() => {
const SUITS=[['♠','noir'],['♥','red'],['♦','red'],['♣','noir']];
const VALUES=[['A',1],['2',2],['3',3],['4',4],['5',5],['6',6],['7',7],['8',8],['9',9],['10',10],['J',10],['Q',10],['K',10]];
const KEY='localia-save-v1';
let state;

function deck(){return SUITS.flatMap(([s,color])=>VALUES.map(([label,value])=>({id:crypto.randomUUID(),suit:s,color,label,value})));}
function shuffle(a){for(let i=a.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[a[i],a[j]]=[a[j],a[i]];}return a;}
function fresh(){const d=shuffle(deck());const players=[{id:'you',name:'Vous',hand:[],score:0},{id:'bot',name:'Localia Bot',hand:[],score:0}];for(const p of players)for(let i=0;i<5;i++)p.hand.push(d.pop());return{deck:d,discard:[],players,active:0,round:1,hasDrawn:false,ended:false,message:'Votre tour : jouez une carte ou piochez.'};}
function save(){localStorage.setItem(KEY,JSON.stringify(state));}
function load(){try{const x=JSON.parse(localStorage.getItem(KEY));return x&&x.players&&x.deck?x:null}catch{return null}}
function el(id){return document.getElementById(id)}
function renderCard(c,hidden=false){if(hidden)return '<div class="card back" aria-label="Carte cachée"></div>';return '<button class="card '+c.color+'" data-card="'+c.id+'"><span class="value">'+c.label+c.suit+'</span><span class="name">Valeur '+c.value+'</span></button>'}
function render(){const you=state.players[0],bot=state.players[1];el('turn').textContent=state.players[state.active].name;el('round').textContent=state.round;el('deck-count').textContent=state.deck.length;el('discard-count').textContent=state.discard.length;el('message').textContent=state.message;el('players').innerHTML=state.players.map((p,i)=>'<div class="player '+(i===state.active?'active':'')+'"><span><strong>'+p.name+'</strong><br><small>'+p.hand.length+' cartes</small></span><strong>'+p.score+' pts</strong></div>').join('');el('hand').innerHTML=you.hand.map(c=>renderCard(c)).join('');el('opponent').innerHTML=bot.hand.map(()=>renderCard(null,true)).join('');el('discard').innerHTML=state.discard.length?renderCard(state.discard.at(-1)):'';el('draw').disabled=state.active!==0||state.hasDrawn||state.ended;el('end').disabled=state.active!==0||state.ended;document.querySelectorAll('[data-card]').forEach(b=>b.onclick=()=>play(b.dataset.card));}
function play(id){if(state.active!==0||state.ended)return;const i=state.players[0].hand.findIndex(c=>c.id===id);if(i<0)return;state.discard.push(state.players[0].hand.splice(i,1)[0]);state.message='Carte jouée. Terminez votre tour.';state.hasDrawn=true;save();render();}
function draw(){if(state.active!==0||state.hasDrawn||state.ended)return;if(!state.deck.length)return finishRound();state.players[0].hand.push(state.deck.pop());state.hasDrawn=true;state.message='Carte piochée. Terminez votre tour.';save();render();}
function endTurn(){if(state.active!==0||state.ended)return;state.active=1;state.message='Le bot joue…';render();setTimeout(botTurn,450);}
function botTurn(){const p=state.players[1];if(!p.hand.length)return finishRound();const c=p.hand.reduce((a,b)=>b.value>a.value?b:a);p.hand.splice(p.hand.indexOf(c),1);state.discard.push(c);if(state.deck.length)p.hand.push(state.deck.pop());state.active=0;state.hasDrawn=false;state.round++;state.message='Votre tour : jouez une carte ou piochez.';save();render();}
function finishRound(){const winner=state.players[state.players[0].hand.length<=state.players[1].hand.length?0:1];winner.score++;state.message=winner.name+' remporte la manche. Cliquez sur Nouvelle partie pour recommencer.';state.ended=true;save();render();}
el('draw').onclick=draw;el('end').onclick=endTurn;el('reset').onclick=()=>{state=fresh();save();render()};state=load()||fresh();render();
})();