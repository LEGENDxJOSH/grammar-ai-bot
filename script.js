javascript:(async function(){

// =====================================
// CLEAN OLD
// =====================================

if(window.__GRAMMAR_AI_RUNNING__){

  clearInterval(window.__GRAMMAR_AI_INTERVAL__);

  document.getElementById('__grammar_ai_panel')?.remove();

  window.__GRAMMAR_AI_RUNNING__ = false;

  return;
}

window.__GRAMMAR_AI_RUNNING__ = true;

// =====================================
// PANEL
// =====================================

const panel = document.createElement('div');

panel.id = '__grammar_ai_panel';

panel.style.cssText = `
position:fixed;
top:15px;
right:15px;
width:340px;
background:#0f172a;
color:white;
z-index:999999999;
border:2px solid #8b5cf6;
border-radius:14px;
font-family:Arial,sans-serif;
box-shadow:0 10px 40px rgba(0,0,0,.6);
overflow:hidden;
`;

panel.innerHTML = `
<div style="padding:12px 14px;border-bottom:1px solid #1e293b;display:flex;justify-content:space-between;align-items:center;">
<div style="font-weight:bold;color:#c4b5fd">GRAMMAR AI V3</div>
<button id="__grammar_ai_close" style="background:none;border:none;color:#fff;font-size:18px;cursor:pointer">×</button>
</div>

<div style="padding:14px;">
<div id="__grammar_ai_status" style="font-size:12px;color:#86efac;margin-bottom:10px">Prêt</div>
<div id="__grammar_ai_question" style="font-size:12px;color:#cbd5e1;line-height:1.5;margin-bottom:12px;max-height:120px;overflow:auto"></div>

<div style="display:flex;gap:8px;">
<button id="__grammar_ai_start" style="flex:1;padding:10px;border:none;border-radius:8px;background:#7c3aed;color:white;cursor:pointer">DEMARRER</button>
<button id="__grammar_ai_stop" style="flex:1;padding:10px;border:none;border-radius:8px;background:#334155;color:#cbd5e1;cursor:pointer">STOP</button>
</div>
</div>
`;

document.body.appendChild(panel);

const statusEl = document.getElementById('__grammar_ai_status');
const questionEl = document.getElementById('__grammar_ai_question');

function status(txt,color='#86efac'){
  statusEl.textContent = txt;
  statusEl.style.color = color;
}

function sleep(ms){
  return new Promise(r=>setTimeout(r,ms));
}

// =====================================
// API KEY
// =====================================

function getApiKey(){

  let k = localStorage.getItem('grammar_ai_key');

  if(!k){

    k = prompt('Entre ta clé OpenAI');

    if(k){
      localStorage.setItem('grammar_ai_key',k);
    }
  }

  return k;
}

const API_KEY = getApiKey();

if(!API_KEY){

  status('Clé API manquante','#f87171');

  return;
}

// =====================================
// MEMORY
// =====================================

let memory = JSON.parse(
  localStorage.getItem('grammar_ai_memory') || '{}'
);

function saveMemory(){

  localStorage.setItem(
    'grammar_ai_memory',
    JSON.stringify(memory)
  );
}

// =====================================
// NORMALIZE
// =====================================

function normalize(t){

  return (t || '')
  .normalize('NFD')
  .replace(/[\u0300-\u036f]/g,'')
  .replace(/[.,!?;:()«»"']/g,'')
  .replace(/\s+/g,' ')
  .trim()
  .toLowerCase();
}

// =====================================
// DETECT QUESTION
// =====================================

function detectQuestion(){

  const selectors = [
    '.question',
    '.sentence',
    '.phrase',
    '[class*=question]',
    '[class*=sentence]',
    '[class*=phrase]',
    'div[tabindex="0"]',
    'p',
    'span',
    'div'
  ];

  for(const sel of selectors){

    const els = document.querySelectorAll(sel);

    for(const el of els){

      if(el.closest('#__grammar_ai_panel')) continue;

      const txt = el.innerText?.trim();

      if(
        txt &&
        txt.length > 15 &&
        txt.length < 300 &&
        /[a-zA-ZÀ-ÿ]/.test(txt)
      ){
        return txt;
      }
    }
  }

  return null;
}

// =====================================
// BUTTONS
// =====================================

function getButton(text){

  const els = document.querySelectorAll('button,div,span');

  for(const el of els){

    const t = normalize(el.innerText);

    if(t.includes(normalize(text))){
      return el;
    }
  }

  return null;
}

function realisticClick(el){

  if(!el) return false;

  const rect = el.getBoundingClientRect();

  const x = rect.left + rect.width/2;
  const y = rect.top + rect.height/2;

  [
    'pointerdown',
    'mousedown',
    'pointerup',
    'mouseup',
    'click'
  ]
  .forEach(type=>{

    el.dispatchEvent(
      new MouseEvent(type,{
        bubbles:true,
        cancelable:true,
        clientX:x,
        clientY:y
      })
    );
  });

  if(el.click){
    el.click();
  }

  return true;
}

function clickButton(text){

  const btn = getButton(text);

  if(btn){
    return realisticClick(btn);
  }

  return false;
}

// =====================================
// OPENAI
// =====================================

let apiBusy = false;

async function askAI(prompt){

  if(apiBusy) return null;

  apiBusy = true;

  try{

    status('Analyse IA...','#fbbf24');

    const response = await fetch(
      'https://api.openai.com/v1/chat/completions',
      {
        method:'POST',
        headers:{
          'Content-Type':'application/json',
          'Authorization':'Bearer '+API_KEY
        },
        body:JSON.stringify({
          model:'gpt-4o-mini',
          temperature:0,
          max_tokens:30,
          messages:[
            {
              role:'system',
              content:
`Tu es un expert absolu en grammaire française.

Tu réponds UNIQUEMENT en JSON.

Format:
{
  "wrong_word":"mot"
}

ou

{
  "wrong_word":"NO_FAULT"
}`
            },
            {
              role:'user',
              content:prompt
            }
          ]
        })
      }
    );

    if(response.status===401){
      status('Clé API invalide','#f87171');
      apiBusy=false;
      return null;
    }

    if(response.status===429){
      status('Limite API atteinte','#f87171');
      apiBusy=false;
      await sleep(15000);
      return null;
    }

    if(!response.ok){
      throw new Error('HTTP '+response.status);
    }

    const data = await response.json();

    apiBusy = false;

    return data.choices?.[0]?.message?.content || null;

  }catch(e){

    apiBusy=false;

    status('Erreur '+e.message,'#f87171');

    return null;
  }
}

// =====================================
// WORD CLICK
// =====================================

function clickWord(word){

  word = normalize(word);

  const els = document.querySelectorAll(
    'div[tabindex="0"],span,p,div'
  );

  for(const el of els){

    if(el.closest('#__grammar_ai_panel')) continue;

    const txt = normalize(el.innerText);

    if(txt === word){

      realisticClick(el);

      return true;
    }
  }

  return false;
}

// =====================================
// VALIDATION IA
// =====================================

async function validateAnswer(sentence,badWord){

  const check = await askAI(`
Phrase:
${sentence}

Mot supposé fautif:
${badWord}

Réponds UNIQUEMENT:
VALID
ou
INVALID
`);

  if(!check) return false;

  return check.includes('VALID');
}

// =====================================
// MAIN LOOP
// =====================================

let running=false;
let busy=false;
let lastSentence='';

async function processPage(){

  if(document.hidden) return;

  const sentence = detectQuestion();

  if(!sentence) return;

  if(sentence===lastSentence) return;

  lastSentence = sentence;

  questionEl.textContent = sentence;

  const normalizedSentence = normalize(sentence);

  // =========================
  // MEMORY
  // =========================

  for(const key in memory){

    if(normalizedSentence.includes(key)){

      const cached = memory[key];

      if(cached === 'NO_FAULT'){

        clickButton('pas de faute');

        status('Mémoire utilisée');

        return;
      }

      const ok = clickWord(cached);

      if(ok){

        status('Réponse mémoire');

        await sleep(1500);

        clickButton('valider');

        return;
      }
    }
  }

  // =========================
  // IA
  // =========================

  const ai = await askAI(`
Phrase:
${sentence}
`);

  if(!ai) return;

  let result;

  try{

    result = JSON.parse(ai);

    if(
      !result ||
      typeof result.wrong_word !== 'string'
    ){
      return;
    }

  }catch{

    status('Erreur JSON','#f87171');

    return;
  }

  const badWord = result.wrong_word;

  // =========================
  // VALIDATION
  // =========================

  const valid = await validateAnswer(
    sentence,
    badWord
  );

  if(!valid){

    status('Validation IA échouée','#f87171');

    return;
  }

  // =========================
  // SAVE MEMORY
  // =========================

  memory[
    normalizedSentence.slice(0,120)
  ] = normalize(badWord);

  saveMemory();

  // =========================
  // ACTION
  // =========================

  await sleep(800);

  if(badWord === 'NO_FAULT'){

    clickButton('pas de faute');

    status('Aucune faute');

    return;
  }

  const success = clickWord(badWord);

  if(success){

    status('Mot cliqué');

    await sleep(1500);

    clickButton('valider');

  }else{

    status('Mot introuvable','#f87171');
  }
}

async function loop(){

  while(running){

    try{

      await processPage();

    }catch(e){

      console.log(e);
    }

    await sleep(12000);
  }
}

// =====================================
// BUTTONS EVENTS
// =====================================

document.getElementById('__grammar_ai_start').onclick=()=>{

  if(running) return;

  running=true;

  status('Bot actif');

  loop();
};

document.getElementById('__grammar_ai_stop').onclick=()=>{

  running=false;

  status('Bot arrêté','#cbd5e1');
};

document.getElementById('__grammar_ai_close').onclick=()=>{

  running=false;

  panel.remove();

  window.__GRAMMAR_AI_RUNNING__=false;
};

status('Prêt');

})();
