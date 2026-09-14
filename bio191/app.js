
const THEME_KEY = "study-site:theme";
const MASTER_KEY = "study-site:bio191:mastered";
const PREF_KEY = "study-site:bio191:prefs";

let manifest = null;
let cards = [];
let testQuestions = [];

const state = {
  mode: "flashcards",
  exam: "Exam 1",
  chapter: "all",
  category: "all",
  search: "",
  shuffle: false,
  onlyUnmastered: false,
  mastered: new Set(),
  cardDeck: [],
  cardIndex: 0,
  flipped: false,
  testDeck: [],
  testIndex: 0,
  testCorrect: 0,
  testAnswered: 0,
  activeOptions: [],
  activeAnswerIndex: -1
};

function $(id){ return document.getElementById(id); }
function shuffleCopy(arr){
  const a=[...arr];
  for(let i=a.length-1;i>0;i--){ const j=Math.floor(Math.random()*(i+1)); [a[i],a[j]]=[a[j],a[i]]; }
  return a;
}
function applyTheme(theme){
  document.documentElement.dataset.theme=theme;
  $("themeLabel").textContent=theme==="dark"?"Light":"Dark";
  localStorage.setItem(THEME_KEY,theme);
}
function initTheme(){
  const saved=localStorage.getItem(THEME_KEY);
  const preferred=window.matchMedia("(prefers-color-scheme: dark)").matches?"dark":"light";
  applyTheme(saved||preferred);
}
function savePrefs(){
  localStorage.setItem(PREF_KEY,JSON.stringify({
    exam:state.exam,chapter:state.chapter,category:state.category,shuffle:state.shuffle,onlyUnmastered:state.onlyUnmastered
  }));
}
function loadPrefs(){
  try{
    const p=JSON.parse(localStorage.getItem(PREF_KEY)||"{}");
    Object.assign(state,p);
  }catch(_){}
  try{
    state.mastered=new Set(JSON.parse(localStorage.getItem(MASTER_KEY)||"[]"));
  }catch(_){ state.mastered=new Set(); }
}
function saveMastered(){
  localStorage.setItem(MASTER_KEY,JSON.stringify([...state.mastered]));
}
function badgeHtml(cardOrQuestion){
  const type=cardOrQuestion.category || "Question";
  const section=cardOrQuestion.section && !String(cardOrQuestion.section).toLowerCase().includes("study guide")
    ? `<span class="badge">${cardOrQuestion.section}</span>` : "";
  return `<span class="badge">Ch ${cardOrQuestion.chapter}</span><span class="badge">${type}</span><span class="badge">${cardOrQuestion.exam}</span>${section}`;
}

function populateFilters(){
  const exam=$("examFilter");
  exam.innerHTML=manifest.exams.map(e=>`<option value="${e.label}">${e.label}</option>`).join("");
  exam.value=state.exam;

  const currentExam=manifest.exams.find(e=>e.label===state.exam)||manifest.exams[0];
  const chapter=$("chapterFilter");
  chapter.innerHTML=`<option value="all">All chapters (${currentExam.label})</option>`+
    currentExam.chapters.map(ch=>`<option value="${ch}">Chapter ${ch} (${currentExam.label})</option>`).join("");
  if(!currentExam.chapters.includes(state.chapter)) state.chapter="all";
  chapter.value=state.chapter;

  const category=$("categoryFilter");
  category.innerHTML=`<option value="all">All card types</option>`+
    manifest.categories.map(c=>`<option value="${c}">${c}</option>`).join("");
  category.value=state.category;
}

function cardMatches(c){
  if(c.exam!==state.exam) return false;
  if(state.chapter!=="all" && c.chapter!==state.chapter) return false;
  if(state.category!=="all" && c.category!==state.category) return false;
  if(state.onlyUnmastered && state.mastered.has(c.id)) return false;
  if(state.search.trim()){
    const hay=(c.front+" "+c.back.replace(/<[^>]*>/g," ")).toLowerCase();
    if(!hay.includes(state.search.trim().toLowerCase())) return false;
  }
  return true;
}
function rebuildCardDeck(reset=true){
  let deck=cards.filter(cardMatches);
  if(state.shuffle) deck=shuffleCopy(deck);
  state.cardDeck=deck;
  if(reset) state.cardIndex=0;
  if(state.cardIndex>=deck.length) state.cardIndex=Math.max(0,deck.length-1);
  state.flipped=false;
  renderFlashcard();
}
function renderFlashcard(){
  const c=state.cardDeck[state.cardIndex];
  const stage=$("flashStage"), empty=$("cardEmpty"), card=$("flashcard");
  if(!c){
    stage.classList.add("hidden"); empty.classList.remove("hidden");
    $("cardPosition").textContent="0 / 0"; $("cardProgress").style.width="0%";
    $("masteredSummary").textContent="0 mastered";
    return;
  }
  stage.classList.remove("hidden"); empty.classList.add("hidden");
  card.classList.toggle("flipped",state.flipped);
  $("frontBadges").innerHTML=badgeHtml(c);
  $("backBadges").innerHTML=badgeHtml(c);
  $("frontText").textContent=c.front;
  $("backContent").innerHTML=c.back;
  $("sourceLine").textContent=c.source?`Source: ${c.source}`:"";
  $("cardPosition").textContent=`${state.cardIndex+1} / ${state.cardDeck.length}`;
  $("cardProgress").style.width=`${100*(state.cardIndex+1)/state.cardDeck.length}%`;
  const masteredCount=state.cardDeck.filter(x=>state.mastered.has(x.id)).length;
  $("masteredSummary").textContent=`${masteredCount} mastered`;
  const isMastered=state.mastered.has(c.id);
  $("masterBtn").textContent=isMastered?"✓ Mastered":"Mark mastered";
  $("masterBtn").classList.toggle("mastered",isMastered);
}
function flipCard(){
  if(!state.cardDeck.length) return;
  state.flipped=!state.flipped; renderFlashcard();
}
function nextCard(){
  if(!state.cardDeck.length) return;
  state.cardIndex=(state.cardIndex+1)%state.cardDeck.length; state.flipped=false; renderFlashcard();
}
function prevCard(){
  if(!state.cardDeck.length) return;
  state.cardIndex=(state.cardIndex-1+state.cardDeck.length)%state.cardDeck.length; state.flipped=false; renderFlashcard();
}
function toggleMastered(){
  const c=state.cardDeck[state.cardIndex]; if(!c) return;
  if(state.mastered.has(c.id)) state.mastered.delete(c.id); else state.mastered.add(c.id);
  saveMastered();
  if(state.onlyUnmastered) rebuildCardDeck(false); else renderFlashcard();
}

function testMatches(q){
  if(q.exam!==state.exam) return false;
  if(state.chapter!=="all" && q.chapter!==state.chapter) return false;
  return true;
}
function restartTest(){
  let deck=testQuestions.filter(testMatches);
  if(state.shuffle) deck=shuffleCopy(deck);
  state.testDeck=deck;
  state.testIndex=0; state.testCorrect=0; state.testAnswered=0;
  renderTestQuestion();
}
function chooseTier(pool){
  return pool[Math.floor(Math.random()*pool.length)];
}
function makeOptions(q){
  const d1=chooseTier(q.distractors.close);
  const d2=chooseTier(q.distractors.medium);
  const d3=chooseTier(q.distractors.clear);
  return shuffleCopy([
    {text:q.correct,correct:true,why:q.correctWhy,tier:"correct"},
    {text:d1.text,correct:false,why:d1.whyWrong,tier:"close"},
    {text:d2.text,correct:false,why:d2.whyWrong,tier:"medium"},
    {text:d3.text,correct:false,why:d3.whyWrong,tier:"clear"}
  ]);
}
function renderTestQuestion(){
  const q=state.testDeck[state.testIndex];
  const card=$("testCard"), empty=$("testEmpty");
  $("testScore").textContent=`Score ${state.testCorrect} / ${state.testAnswered}`;
  if(!q){
    card.classList.add("hidden"); empty.classList.remove("hidden");
    $("testPosition").textContent="Question 0 / 0";
    return;
  }
  card.classList.remove("hidden"); empty.classList.add("hidden");
  state.activeOptions=makeOptions(q); state.activeAnswerIndex=-1;
  $("testBadges").innerHTML=badgeHtml({...q,category:"Question"});
  $("testPrompt").textContent=q.prompt;
  $("testPosition").textContent=`Question ${state.testIndex+1} / ${state.testDeck.length}`;
  $("feedback").className="feedback hidden";
  $("feedback").innerHTML="";
  $("nextTestBtn").disabled=true;
  $("optionList").innerHTML=state.activeOptions.map((o,i)=>`
    <button class="option" type="button" data-index="${i}">
      <span class="option-key">${String.fromCharCode(65+i)}</span>
      <span>${escapeHtml(o.text)}</span>
    </button>
  `).join("");
  [...document.querySelectorAll(".option")].forEach(btn=>btn.addEventListener("click",()=>answerTest(Number(btn.dataset.index))));
}
function escapeHtml(s){
  return String(s).replace(/[&<>"']/g,m=>({"&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#039;"}[m]));
}
function answerTest(index){
  if(state.activeAnswerIndex!==-1) return;
  state.activeAnswerIndex=index; state.testAnswered++;
  const q=state.testDeck[state.testIndex];
  const selected=state.activeOptions[index];
  if(selected.correct) state.testCorrect++;
  const optionEls=[...document.querySelectorAll(".option")];
  optionEls.forEach((el,i)=>{
    el.disabled=true;
    if(state.activeOptions[i].correct) el.classList.add("correct");
  });
  if(!selected.correct) optionEls[index].classList.add("wrong");
  const fb=$("feedback");
  fb.classList.remove("hidden");
  if(selected.correct){
    fb.classList.add("good");
    fb.innerHTML=`<b>Correct.</b><div style="margin-top:8px">${escapeHtml(q.correct)}</div>`;
  }else{
    fb.classList.add("bad");
    fb.innerHTML=`
      <b>Incorrect.</b>
      <div style="margin-top:8px"><b>Why this choice misses:</b> ${escapeHtml(selected.why)}</div>
      <div class="correct-box"><b>Correct answer</b><br>${escapeHtml(q.correct)}</div>
    `;
  }
  $("testScore").textContent=`Score ${state.testCorrect} / ${state.testAnswered}`;
  $("nextTestBtn").disabled=false;
}
function nextTest(){
  if(state.activeAnswerIndex===-1) return;
  state.testIndex++;
  if(state.testIndex>=state.testDeck.length){
    state.testIndex=0;
    if(state.shuffle) state.testDeck=shuffleCopy(state.testDeck);
  }
  renderTestQuestion();
}
function setMode(mode){
  state.mode=mode;
  document.querySelectorAll(".mode-button").forEach(b=>b.classList.toggle("active",b.dataset.mode===mode));
  $("flashcardMode").classList.toggle("hidden",mode!=="flashcards");
  $("testMode").classList.toggle("hidden",mode!=="test");
  document.querySelectorAll(".flash-only").forEach(x=>x.classList.toggle("hidden",mode!=="flashcards"));
  document.querySelectorAll(".test-only").forEach(x=>x.classList.toggle("hidden",mode!=="test"));
  if(mode==="test") restartTest(); else rebuildCardDeck(false);
}
function syncToggleButtons(){
  $("shuffleBtn").classList.toggle("active",state.shuffle);
  $("shuffleBtn").setAttribute("aria-pressed",String(state.shuffle));
  $("unmasteredBtn").classList.toggle("active",state.onlyUnmastered);
  $("unmasteredBtn").setAttribute("aria-pressed",String(state.onlyUnmastered));
}

async function init(){
  initTheme(); loadPrefs();
  try{
    const [m,c,t]=await Promise.all([
      fetch("data/manifest.json",{cache:"no-store"}).then(r=>r.json()),
      fetch("data/flashcards.json",{cache:"no-store"}).then(r=>r.json()),
      fetch("data/test-questions.json",{cache:"no-store"}).then(r=>r.json())
    ]);
    manifest=m; cards=c; testQuestions=t;
  }catch(err){
    document.querySelector(".app-shell").innerHTML=`<div class="empty-state">Study data could not be loaded. On a deployed site this should load automatically.</div>`;
    return;
  }
  if(!manifest.exams.some(e=>e.label===state.exam)) state.exam=manifest.exams[0].label;
  populateFilters(); syncToggleButtons(); rebuildCardDeck(); restartTest();

  $("themeToggle").addEventListener("click",()=>applyTheme(document.documentElement.dataset.theme==="dark"?"light":"dark"));
  document.querySelectorAll(".mode-button").forEach(b=>b.addEventListener("click",()=>setMode(b.dataset.mode)));

  $("examFilter").addEventListener("change",e=>{
    state.exam=e.target.value; state.chapter="all"; populateFilters(); savePrefs();
    rebuildCardDeck(); restartTest();
  });
  $("chapterFilter").addEventListener("change",e=>{
    state.chapter=e.target.value; savePrefs(); rebuildCardDeck(); restartTest();
  });
  $("categoryFilter").addEventListener("change",e=>{state.category=e.target.value;savePrefs();rebuildCardDeck();});
  $("searchBox").addEventListener("input",e=>{state.search=e.target.value;rebuildCardDeck();});

  $("shuffleBtn").addEventListener("click",()=>{
    state.shuffle=!state.shuffle; syncToggleButtons(); savePrefs();
    if(state.mode==="test") restartTest(); else rebuildCardDeck();
  });
  $("unmasteredBtn").addEventListener("click",()=>{
    state.onlyUnmastered=!state.onlyUnmastered; syncToggleButtons(); savePrefs(); rebuildCardDeck();
  });

  $("flashcard").addEventListener("click",flipCard);
  $("nextBtn").addEventListener("click",nextCard);
  $("prevBtn").addEventListener("click",prevCard);
  $("masterBtn").addEventListener("click",toggleMastered);

  $("restartTestBtn").addEventListener("click",restartTest);
  $("nextTestBtn").addEventListener("click",nextTest);

  $("resetBtn").addEventListener("click",()=>$("resetModal").classList.remove("hidden"));
  $("cancelReset").addEventListener("click",()=>$("resetModal").classList.add("hidden"));
  $("confirmReset").addEventListener("click",()=>{
    state.mastered.clear(); saveMastered(); $("resetModal").classList.add("hidden"); rebuildCardDeck(false);
  });
  $("resetModal").addEventListener("click",e=>{if(e.target===$("resetModal")) $("resetModal").classList.add("hidden");});

  window.addEventListener("keydown",e=>{
    const tag=document.activeElement?.tagName;
    if(["INPUT","SELECT","TEXTAREA"].includes(tag)) return;
    if(state.mode==="flashcards"){
      if(e.key===" "){e.preventDefault();flipCard();}
      else if(e.key==="ArrowRight")nextCard();
      else if(e.key==="ArrowLeft")prevCard();
      else if(e.key.toLowerCase()==="m")toggleMastered();
      else if(e.key.toLowerCase()==="s"){
        state.shuffle=!state.shuffle;syncToggleButtons();savePrefs();rebuildCardDeck();
      }
    }else{
      const keys={"a":0,"1":0,"b":1,"2":1,"c":2,"3":2,"d":3,"4":3};
      const k=e.key.toLowerCase();
      if(k in keys) answerTest(keys[k]);
      else if(e.key==="Enter" && !$("nextTestBtn").disabled) nextTest();
    }
  });
}
init();
