
const THEME_KEY = "study-site:theme";

function applyTheme(theme){
  document.documentElement.dataset.theme = theme;
  document.getElementById("themeLabel").textContent = theme === "dark" ? "Light" : "Dark";
  localStorage.setItem(THEME_KEY, theme);
}
function initTheme(){
  const saved = localStorage.getItem(THEME_KEY);
  const preferred = window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
  applyTheme(saved || preferred);
}
document.getElementById("themeToggle").addEventListener("click",()=>{
  applyTheme(document.documentElement.dataset.theme === "dark" ? "light" : "dark");
});
initTheme();

async function loadCourses(){
  const grid = document.getElementById("courseGrid");
  try{
    const res = await fetch("data/courses.json", {cache:"no-store"});
    if(!res.ok) throw new Error("Could not load course list.");
    const courses = await res.json();
    grid.innerHTML = courses.filter(c=>c.status==="active").map(c=>`
      <a class="course-card" href="${c.path}">
        <div class="eyebrow">${c.exams.join(" · ")}</div>
        <h2>${c.name}</h2>
        <p>Chapters ${c.chapters.join(", ")}</p>
        <div class="meta">
          <span class="chip">${c.flashcards} flashcards</span>
          <span class="chip">${c.testQuestions} test questions</span>
        </div>
      </a>
    `).join("");
  }catch(err){
    grid.innerHTML = `<div class="empty">Course data could not be loaded.</div>`;
  }
}
loadCourses();
