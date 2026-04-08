const GOOGLE_SCRIPT_URL = \"https://script.google.com/macros/s/AKfycbzC4-Axk2bQsnHJYxMhzn0fblk48j2fWAheHhCxJF5as8fH-NKlIgV0-C7uO6mQfHAM/exec\";

if ('serviceWorker' in navigator) { navigator.serviceWorker.register('sw.js').catch(e => console.log(e)); }

function getOrCreateDeviceId() {
    let id = localStorage.getItem('adham_pro_dev');
    if (!id) { id = 'dev_' + Date.now(); localStorage.setItem('adham_pro_dev', id); }
    return id;
}

let deferredPrompt;
window.addEventListener('beforeinstallprompt', (e) => { e.preventDefault(); deferredPrompt = e; document.getElementById('install-app-btn')?.classList.remove('hidden'); });
document.getElementById('install-app-btn')?.addEventListener('click', async () => { if(deferredPrompt){ deferredPrompt.prompt(); await deferredPrompt.userChoice; deferredPrompt = null; }});

function copyCard() { navigator.clipboard.writeText(\"9860350141282409\").then(() => alert(\"💳 Karta nusxalandi!\")); }
document.addEventListener('contextmenu', e => e.preventDefault());
document.addEventListener('keydown', e => { if(e.ctrlKey && e.keyCode===67) { e.preventDefault(); alert(\"Ko'chirish taqiqlangan!\"); }});

let cheatWarnings = 0;
document.addEventListener(\"visibilitychange\", () => {
    if (document.getElementById(\"test-screen\") && !document.getElementById(\"test-screen\").classList.contains(\"hidden\") && document.hidden) {
        if (++cheatWarnings >= 3) { alert(\"❌ 3 marta chiqdingiz. Sessiya yopildi!\"); finishExam(); } 
        else { alert(`⚠️ OGOHLANTIRISH (${cheatWarnings}/3)! Oynadan chiqmang.`); }
    }
});

async function authenticateUser() {
    const login = document.getElementById('auth-login').value.trim(), pass = document.getElementById('auth-password').value.trim(), key = document.getElementById('auth-keygen').value.trim(), err = document.getElementById('auth-error');
    if(!login || !pass) { err.innerText = \"Ma'lumotlarni kiriting!\"; err.classList.remove('hidden'); return; }
    try {
        const res = await fetch(GOOGLE_SCRIPT_URL, { method: 'POST', body: JSON.stringify({ login, password: pass, keygen: key, deviceId: getOrCreateDeviceId() }) });
        const data = await res.json();
        if (data.success) { localStorage.setItem('pro_auth', 'true'); localStorage.setItem('pro_name', data.name||login); document.getElementById('student-name').value = data.name||login; switchScreen('auth-screen', 'welcome-screen'); } 
        else { err.innerText = data.message; err.classList.remove('hidden'); }
    } catch (e) { err.innerText = \"Tarmoq xatosi\"; err.classList.remove('hidden'); }
}

const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
function playSound(type) {
    if(audioCtx.state === 'suspended') audioCtx.resume();
    const osc = audioCtx.createOscillator(), gain = audioCtx.createGain(); osc.connect(gain); gain.connect(audioCtx.destination);
    if(type === 'correct') { osc.type = 'sine'; osc.frequency.setValueAtTime(600, audioCtx.currentTime); osc.frequency.exponentialRampToValueAtTime(1200, audioCtx.currentTime + 0.1); gain.gain.setValueAtTime(0.3, audioCtx.currentTime); gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.1); osc.start(); osc.stop(audioCtx.currentTime + 0.1); if(navigator.vibrate) navigator.vibrate(50); } 
    else { osc.type = 'sawtooth'; osc.frequency.setValueAtTime(300, audioCtx.currentTime); osc.frequency.exponentialRampToValueAtTime(100, audioCtx.currentTime + 0.2); gain.gain.setValueAtTime(0.3, audioCtx.currentTime); gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.2); osc.start(); osc.stop(audioCtx.currentTime + 0.2); if(navigator.vibrate) navigator.vibrate([150, 100, 150]); }
}

function updateGreeting() {
    const hour = new Date().getHours();
    let text = \"Xayrli tun\";
    if(hour >= 5 && hour < 12) text = \"Xayrli tong\";
    else if(hour >= 12 && hour < 18) text = \"Xayrli kun\";
    else if(hour >= 18 && hour < 22) text = \"Xayrli kech\";
    const el = document.getElementById('greeting-text');
    if(el) el.innerText = text;
}

// COMFORT EYE LOGIC
function toggleTheme() { 
    const slider = document.getElementById('theme-slider');
    if(slider.checked) { document.body.classList.replace('light-mode', 'dark-mode'); localStorage.setItem('theme', 'dark'); } 
    else { document.body.classList.replace('dark-mode', 'light-mode'); localStorage.setItem('theme', 'light'); }
}
function toggleComfortEye() {
    document.body.classList.toggle('comfort-eye');
    const isEyeActive = document.body.classList.contains('comfort-eye');
    const eyeBtn = document.getElementById('comfortEyeToggle');
    if(eyeBtn) {
        if(isEyeActive) { eyeBtn.classList.add('eye-active'); document.getElementById('eye-closed-icon').classList.remove('active-eye'); document.getElementById('eye-open-icon').classList.add('active-eye'); } 
        else { eyeBtn.classList.remove('eye-active'); document.getElementById('eye-open-icon').classList.remove('active-eye'); document.getElementById('eye-closed-icon').classList.add('active-eye'); }
    }
    localStorage.setItem('comfort_eye', isEyeActive);
}

let bank = [], currentTest = [], userAnswers = [], currentIndex = 0, currentUser = null, timerInterval;
let stats = JSON.parse(localStorage.getItem('adham_pro_stats')) || { learned: [], errors: [] };
let diffTime = 900, isExamMode = false, menuReturns = 0, isAdminAdham = false;

window.onload = async () => {
    updateGreeting();
    if (localStorage.getItem('theme') === 'dark') { document.body.classList.replace('light-mode', 'dark-mode'); document.getElementById('theme-slider').checked = true; }
    if (localStorage.getItem('comfort_eye') === 'true') { toggleComfortEye(); }
    
    const files = ['musiqa_nazariyasi.json', 'cholgu_ijrochiligi.json', 'vokal_ijrochiligi.json', 'metodika_repertuar.json']; let id = 1;
    for (const f of files) {
        try { const res = await fetch(f); const data = await res.json(); data.forEach(q => { bank.push({ id: id++, subject: f.replace('.json', ''), q: q.q, originalOpts: [...new Set(q.options)], answerText: q.options[q.answer] }); }); } catch(e) {}
    }
    document.getElementById('max-learned-total').innerText = `/ ${bank.length}`;
    if (localStorage.getItem('pro_auth') === 'true') { document.getElementById('student-name').value = localStorage.getItem('pro_name'); switchScreen('auth-screen', 'welcome-screen'); }
    updateDashboard();
};

function switchScreen(out, inn) { document.querySelectorAll('.modal-overlay').forEach(m => m.style.display='none'); document.querySelectorAll('.screen').forEach(s => { s.classList.remove('active'); s.classList.add('hidden'); }); document.getElementById(inn).classList.remove('hidden'); document.getElementById(inn).classList.add('active'); }
function handleLogin() {
    const name = document.getElementById('student-name').value.trim(); if(name.length<2) return alert(\"Ismni kiriting!\");
    isAdminAdham = (name.toLowerCase()==='adham' || name.toLowerCase()==='admin'); if(isAdminAdham) alert(\"Assalomu alaykum, Creator!\");
    currentUser = name; document.getElementById('display-name').innerText = name; switchScreen('welcome-screen', 'dashboard-screen');
}
function goHome() { clearInterval(timerInterval); document.getElementById('restart-mini-btn').classList.add('hidden'); switchScreen('test-screen', 'dashboard-screen'); updateDashboard(); if(++menuReturns % 3 === 0) { setTimeout(() => document.getElementById('modal-donate').style.display='flex', 500); } }
function confirmExit() { if(confirm(\"Chiqish?\")) goHome(); } function logout() { if(confirm(\"Tark etish?\")) { localStorage.clear(); location.reload(); } }

function updateDashboard() {
    stats.learned = [...new Set(stats.learned)]; stats.errors = [...new Set(stats.errors)].filter(id => !stats.learned.includes(id)); localStorage.setItem('adham_pro_stats', JSON.stringify(stats));
    document.getElementById('learned-count').innerText = stats.learned.length; document.getElementById('error-count').innerText = stats.errors.length; document.getElementById('error-work-btn').disabled = stats.errors.length===0;
    const tc = document.getElementById('trade-history'); if(!tc) return;
    let g = (stats.learned.length/(bank.length||1))*50, r = (stats.errors.length/(bank.length||1))*50; if(g<2&&stats.learned.length>0) g=2; if(r<2&&stats.errors.length>0) r=2;
    tc.innerHTML = Array.from({length:20}).map((_,i) => { let p=(i+1)/20, ns=Math.random()*6-3, cg=i===19?g:Math.max(1,g*p+ns), cr=i===19?r:Math.max(1,r*p-ns); return `<div style=\"flex:1; display:flex; flex-direction:column; align-items:center; height:100%;\"><div style=\"height:50%; width:100%; display:flex; align-items:flex-end; justify-content:center;\"><div style=\"width:60%; background:var(--success); height:${cg}%; border-radius:2px 2px 0 0;\"></div></div><div style=\"height:50%; width:100%; display:flex; justify-content:center;\"><div style=\"width:60%; background:var(--error); height:${cr}%; border-radius:0 0 2px 2px;\"></div></div></div>`;}).join('');
}

let pendingQs=[], pendingTitle=\"\";
function openLevels(sub, title) { pendingTitle=title; document.getElementById('level-grid-box').innerHTML = Array.from({length:10}).map((_,i) => { let s=i*20, e=s+20; let sq=bank.filter(q=>q.subject===sub).slice(s,e); if(!sq.length) return ''; return `<button class=\"neo-btn-small\" onclick=\"prepareTest('lvl', ${s}, ${e}, '${sub}')\">${i+1}-Bosqich</button>`; }).join(''); document.getElementById('modal-level').style.display='flex'; }
function openChapters() { document.getElementById('chapters-grid-box').innerHTML = Array.from({length:Math.ceil(bank.length/20)}).map((_,i) => `<button class=\"neo-btn-small\" onclick=\"prepareTest('chp', ${i*20}, ${i*20+20}, 'all')\">Bob ${i*20+1}-${i*20+20}</button>`).join(''); document.getElementById('modal-chapters').style.display='flex'; }
function prepareTest(type, start=0, end=20, sub='all') { document.querySelectorAll('.modal-overlay').forEach(m=>m.style.display='none'); if(type==='errors'&&!stats.errors.length) return alert(\"Xato yo'q\"); pendingQs = (type==='mix_800') ? [...bank].sort(()=>Math.random()-0.5).slice(0,20) : (type==='errors') ? bank.filter(q=>stats.errors.includes(q.id)).slice(0,20) : bank.filter(q=>sub==='all'||q.subject===sub).slice(start,end); document.getElementById('setup-screen').style.display='flex'; }
function applySetup() { document.getElementById('setup-screen').style.display='none'; isExamMode=false; currentTest=[...pendingQs].sort(()=>Math.random()-0.5); startSession(); }
function startExamMode() { document.querySelectorAll('.modal-overlay').forEach(m=>m.style.display='none'); isExamMode=true; currentTest=['musiqa_nazariyasi','cholgu_ijrochiligi','vokal_ijrochiligi','metodika_repertuar'].flatMap(s=>bank.filter(q=>q.subject===s).sort(()=>Math.random()-0.5).slice(0,15)).sort(()=>Math.random()-0.5); diffTime=3600; startSession(); }

function startSession() {
    switchScreen('dashboard-screen', 'test-screen'); document.getElementById('restart-mini-btn').classList.add('hidden');
    currentTest = currentTest.map(q => { let opts=[...q.originalOpts].sort(()=>Math.random()-0.5); return {...q, options:opts, answer:opts.indexOf(q.answerText)}; });
    userAnswers=new Array(currentTest.length).fill(null); currentIndex=0; totalErrorsInTest=0; clearInterval(timerInterval); startTimer(); renderQuestions();
}
function startTimer() { let t=diffTime; timerInterval=setInterval(()=>{ t--; document.getElementById('exam-timer').innerText=Math.floor(t/60)+':'+(t%60<10?'0':'')+(t%60); if(t<=0){clearInterval(timerInterval); finishExam(true);} },1000); }

function renderQuestions() {
    document.getElementById('indicator-map').innerHTML = currentTest.map((_,i)=>`<div class=\"dot\" id=\"dot-${i}\" onclick=\"currentIndex=${i}; renderQuestions();\">${i+1}</div>`).join('');
    document.getElementById('all-questions-area').innerHTML = currentTest.map((q,i)=>`<div class=\"q-block neo-card ${i===currentIndex?'active-q':'hidden'}\"><h3>${i+1}. ${q.q}</h3><div style=\"margin-top:20px;\">${q.options.map((o,oi)=>`<button class=\"neo-btn\" id=\"btn-${i}-${oi}\" onclick=\"checkAns(${i},${oi},event)\" ${userAnswers[i]?'disabled':''}>${o}</button>`).join('')}</div></div>`).join('');
    if(userAnswers[currentIndex]) document.getElementById(`btn-${currentIndex}-${userAnswers[currentIndex].selected}`).classList.add(userAnswers[currentIndex].isCorrect?'magic-correct':'magic-wrong');
    document.getElementById(`dot-${currentIndex}`).classList.add('active-dot'); document.getElementById('progress-fill').style.width = (userAnswers.filter(x=>x).length/currentTest.length)*100+'%';
}

function checkAns(qi, oi, e) {
    if(userAnswers[qi]) return; const isC = currentTest[qi].answer === oi; userAnswers[qi] = {selected:oi, isCorrect:isC};
    if(isC) { stats.learned.push(currentTest[qi].id); playSound('correct'); createParticles(e); } 
    else { stats.errors.push(currentTest[qi].id); playSound('wrong'); if(++totalErrorsInTest===1) document.getElementById('restart-mini-btn').classList.remove('hidden'); }
    localStorage.setItem('adham_pro_stats', JSON.stringify(stats)); renderQuestions();
    if(userAnswers.every(x=>x)) { document.getElementById('finish-btn').classList.remove('hidden'); } else { setTimeout(()=> { currentIndex = userAnswers.findIndex(x=>!x); renderQuestions(); }, 600); }
}

function finishExam(force=false) {
    clearInterval(timerInterval); document.getElementById('restart-mini-btn').classList.add('hidden');
    let cor = userAnswers.filter(a=>a?.isCorrect).length, pct = Math.round((cor/currentTest.length)*100);
    if(!isExamMode && pct<100 && !force) { alert(\"100% yechmaguningizcha aralashtirib beriladi.\"); applySetup(); return; }
    document.getElementById('result-percent').innerText = pct+'%'; document.getElementById('cert-btn').style.display = pct>=90?'block':'none';
    if(pct>=90) confetti({particleCount:200, spread:90, origin:{y:0.6}});
    document.getElementById('modal-result').style.display='flex';
}
function showCertificate() {
    document.getElementById('cert-student-name').innerText = currentUser || \"Noma'lum Talaba\"; document.getElementById('cert-mode-name').innerText = isExamMode ? \"IMTIHON\" : \"Mashg'ulot\"; document.getElementById('cert-score').innerText = document.getElementById('result-percent').innerText; document.getElementById('cert-global-stats').innerText = `${stats.learned.length}/${bank.length}`; document.getElementById('cert-date').innerText = new Date().toLocaleDateString();
    document.querySelectorAll('.modal-overlay').forEach(m=>m.style.display='none'); document.getElementById('modal-cert').style.display='flex';
}
