javascript:(async function(){

// =====================================
// STOP IF ALREADY RUNNING
// =====================================

if(window.__GRAMMAR_AI_RUNNING__){
  window.__GRAMMAR_AI_RUNNING__ = false;
  document.getElementById('__grammar_ai_panel')?.remove();
  return;
}

window.__GRAMMAR_AI_RUNNING__ = false;

// =====================================
// API KEY
// =====================================

let OPENAI_API_KEY = localStorage.getItem('grammar_ai_key');

if(!OPENAI_API_KEY){
  OPENAI_API_KEY = prompt("Entre ta clé OpenAI");
  if(OPENAI_API_KEY){
    localStorage.setItem('grammar_ai_key', OPENAI_API_KEY);
  }
}

if(!OPENAI_API_KEY){
  alert("Clé API manquante");
  return;
}

// =====================================
// UI PANEL
// =====================================

const panel = document.createElement("div");
panel.id = "__grammar_ai_panel";
panel.style.cssText = `
position:fixed;
top:15px;
right:15px;
width:260px;
background:#0f172a;
color:white;
z-index:999999999;
padding:12px;
border-radius:12px;
font-family:Arial;
border:2px solid #8b5cf6;
`;

panel.innerHTML = `
<div style="font-weight:bold;margin-bottom:8px;">GRAMMAR AI</div>

<button id="on" style="width:100%;padding:8px;margin-bottom:5px;background:#22c55e;border:none;color:white;border-radius:6px;cursor:pointer">
ON
</button>

<button id="off" style="width:100%;padding:8px;background:#ef4444;border:none;color:white;border-radius:6px;cursor:pointer">
OFF
</button>

<div id="status" style="margin-top:8px;font-size:12px;">OFF</div>
<div id="text" style="margin-top:6px;font-size:11px;color:#cbd5e1;"></div>
`;

document.body.appendChild(panel);

const statusEl = document.getElementById("status");
const textEl = document.getElementById("text");

function setStatus(t){
  statusEl.innerText = t;
}

// =====================================
// UTIL
// =====================================

const sleep = ms => new Promise(r => setTimeout(r, ms));

// =====================================
// DETECT TEXT
// =====================================

function detectText(){
  const els = document.querySelectorAll("p,span,div");

  for(const el of els){
    const t = el.innerText?.trim();

    if(
      t &&
      t.length > 20 &&
      t.length < 300 &&
      /[a-zA-ZÀ-ÿ]/.test(t)
    ){
      return t;
    }
  }
  return null;
}

// =====================================
// CLICK WORD / BUTTON
// =====================================

function clickWord(word){
  const els = document.querySelectorAll("span,div,p");
  for(const el of els){
    if(el.innerText?.trim() === word){
      el.click();
      return true;
    }
  }
  return false;
}

function clickButton(text){
  const els = document.querySelectorAll("button");
  for(const el of els){
    if(el.innerText.toLowerCase().includes(text.toLowerCase())){
      el.click();
      return true;
    }
  }
  return false;
}

// =====================================
// OPENAI
// =====================================

async function askAI(prompt){

  try{

    const res = await fetch("https://api.openai.com/v1/chat/completions",{
      method:"POST",
      headers:{
        "Content-Type":"application/json",
        "Authorization":"Bearer " + OPENAI_API_KEY
      },
      body:JSON.stringify({
        model:"gpt-4o-mini",
        temperature:0,
        messages:[
          {
            role:"system",
            content:`Réponds UNIQUEMENT en JSON:
{"wrong_word":"mot"} ou {"wrong_word":"NO_FAULT"}`
          },
          {
            role:"user",
            content:prompt
          }
        ]
      })
    });

    const data = await res.json();
    return data.choices?.[0]?.message?.content;

  }catch(e){
    return null;
  }
}

// =====================================
// LOOP
// =====================================

let running = false;

async function loop(){

  while(running){

    const sentence = detectText();

    if(sentence){

      textEl.innerText = sentence;
      setStatus("Analyse...");

      const ai = await askAI(sentence);

      if(ai){

        try{

          const result = JSON.parse(ai);
          const bad = result.wrong_word;

          if(bad === "NO_FAULT"){
            clickButton("pas de faute");
            setStatus("OK");
          }else{
            const ok = clickWord(bad);
            if(ok){
              clickButton("valider");
              setStatus("Corrigé");
            }else{
              setStatus("Mot introuvable");
            }
          }

        }catch{
          setStatus("Erreur IA");
        }
      }
    }

    await sleep(7000);
  }

  setStatus("OFF");
}

// =====================================
// BUTTONS ON / OFF
// =====================================

document.getElementById("on").onclick = () => {
  if(running) return;
  running = true;
  window.__GRAMMAR_AI_RUNNING__ = true;
  setStatus("ON");
  loop();
};

document.getElementById("off").onclick = () => {
  running = false;
  window.__GRAMMAR_AI_RUNNING__ = false;
  setStatus("OFF");
};

})();
