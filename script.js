javascript:(async function(){

// =====================================
// OPENAI KEY
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
// STOP IF ALREADY RUNNING
// =====================================

if(window.__GRAMMAR_AI_RUNNING__){
  window.__GRAMMAR_AI_RUNNING__ = false;
  document.getElementById('__grammar_ai_panel')?.remove();
  console.log("🛑 STOP");
  return;
}

window.__GRAMMAR_AI_RUNNING__ = true;

// =====================================
// UI
// =====================================

const panel = document.createElement('div');
panel.id = "__grammar_ai_panel";
panel.style.cssText = `
position:fixed;top:15px;right:15px;width:300px;
background:#0f172a;color:white;z-index:999999;
padding:10px;border-radius:10px;font-family:Arial;
border:2px solid #8b5cf6;
`;

panel.innerHTML = `
<div style="font-weight:bold;margin-bottom:8px;">GRAMMAR AI</div>
<div id="status">Prêt</div>
<button id="start">START</button>
<button id="stop">STOP</button>
<div id="text" style="margin-top:8px;font-size:12px;"></div>
`;

document.body.appendChild(panel);

const status = document.getElementById("status");
const textBox = document.getElementById("text");

function setStatus(t){
  console.log("STATUS:", t);
  status.innerText = t;
}

// =====================================
// SIMPLE SLEEP
// =====================================

const sleep = ms => new Promise(r => setTimeout(r, ms));

// =====================================
// DETECT TEXT (SIMPLIFIÉ MAIS STABLE)
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
// CLICK WORD SIMPLE
// =====================================

function clickWord(word){
  const els = document.querySelectorAll("span,div,p");

  for(const el of els){
    if(el.innerText?.trim() === word){
      el.click();
      console.log("🖱 CLICK WORD:", word);
      return true;
    }
  }
  return false;
}

// =====================================
// CLICK BUTTON
// =====================================

function clickButton(txt){
  const els = document.querySelectorAll("button");

  for(const el of els){
    if(el.innerText.toLowerCase().includes(txt.toLowerCase())){
      el.click();
      console.log("🔘 CLICK BUTTON:", txt);
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

    setStatus("IA...");

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
            content:`Réponds uniquement JSON:
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
    console.log("API ERROR", e);
    return null;
  }
}

// =====================================
// LOOP
// =====================================

let running = false;

async function loop(){

  console.log("🔁 LOOP START");

  while(running){

    const sentence = detectText();

    console.log("📝 SENTENCE:", sentence);

    if(sentence){

      textBox.innerText = sentence;

      const ai = await askAI(sentence);

      console.log("🤖 AI:", ai);

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
              setStatus("corrigé");
            }else{
              setStatus("mot introuvable");
            }
          }

        }catch(e){
          console.log("JSON ERROR");
        }
      }
    }

    await sleep(8000);
  }

  console.log("🛑 LOOP STOP");
}

// =====================================
// EVENTS
// =====================================

document.getElementById("start").onclick = () => {
  if(running) return;
  running = true;
  setStatus("START");
  loop();
};

document.getElementById("stop").onclick = () => {
  running = false;
  setStatus("STOP");
};

console.log("✅ LOADED");

})();
