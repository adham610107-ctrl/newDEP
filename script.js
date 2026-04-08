// ==========================================
// GOOGLE SHEETS & PWA CONFIGURATION
// ==========================================
const GOOGLE_SCRIPT_URL = "https://script.google.com/macros/s/AKfycbzC4-Axk2bQsnHJYxMhzn0fblk48j2fWAheHhCxJF5as8fH-NKlIgV0-C7uO6mQfHAM/exec";

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('sw.js').catch(err => console.log('SW xatolik'));
  });
}

function getOrCreateDeviceId() {
    let deviceId = localStorage.getItem('adham_pro_device_id');
    if (!deviceId) {
        deviceId = 'dev_' + Math.random().toString(36).substr(2, 9) + '_' + Date.now();
        localStorage.setItem('adham_pro_device_id', deviceId);
    }
    return deviceId;
}

// PWA INSTALL LOGIC
let deferredPrompt;
window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault(); deferredPrompt = e;
    const installAppBtn = document.getElementById('install-app-btn');
    if (installAppBtn) installAppBtn.classList.remove('hidden');
});

document.addEventListener('DOMContentLoaded', () => {
    const installAppBtn = document.getElementById('install-app-btn');
    if (installAppBtn) {
        installAppBtn.addEventListener('click', async () => {
            if (deferredPrompt) {
                deferredPrompt.prompt();
                const { outcome } = await deferredPrompt.userChoice;
                if (outcome === 'accepted') installAppBtn.classList.add('hidden');
                deferredPrompt = null;
            }
        });
    }
});

// ==========================================
// SECURITY: ANTI-CHEAT, ADMIN KICK & ADMIN MODE
// ==========================================
function copyCard() {
    const cardText = document.getElementById("card-num") ? document.getElementById("card-num").innerText : "9860350141282409";
    navigator.clipboard.writeText(cardText).then(() => {
        alert("💳 Karta raqami nusxalandi: " + cardText + "\nEndi ilovangizga o'tib to'lovni amalga oshirishingiz mumkin. Qo'llab-quvvatlaganingiz uchun rahmat!");
    }).catch(err => console.error(err));
}

document.addEventListener('contextmenu', e => e.preventDefault());
document.addEventListener('keydown', function(e) {
    if(e.keyCode === 123 || (e.ctrlKey && e.shiftKey && (e.keyCode === 73 || e.keyCode === 74)) || (e.ctrlKey && e.keyCode === 85)) { 
        e.preventDefault(); return false; 
    }
    if(e.ctrlKey && e.keyCode === 67) { 
        e.preventDefault(); alert("⚠️ Ko'chirish (nusxalash) qat'iyan taqiqlangan!"); return false; 
    }
});

let cheatWarnings = 0;
document.addEventListener("visibilitychange", () => {
    const testScreen = document.getElementById("test-screen");
    if (testScreen && !testScreen.classList.contains("hidden") && document.hidden) {
        cheatWarnings++;
        if (cheatWarnings >= 3) {
            alert("❌ DIQQAT! 3 marta oynadan chiqdingiz. Intellektual sessiya avtomatik yakunlandi!");
            finishExam(); 
        } else {
            alert(`⚠️ OGOHLANTIRISH (${cheatWarnings}/3)!\n\nBoshqa oynaga o'tish (Ko'chirish) qat'iyan taqiqlanadi!`);
        }
    }
});

async function checkAdminBlock() {
    const savedName = localStorage.getItem('pro_exam_name');
    if (!savedName) return; 
    try {
        const response = await fetch(GOOGLE_SCRIPT_URL, { method: 'POST', body: JSON.stringify({ action: "check_block", login: savedName }) });
        const result = await response.json();
        if (result.blocked) {
            alert("❌ DIQQAT: Tizim ma'muriyati (Admin) tomonidan bloklangansiz!");
            localStorage.removeItem('pro_exam_auth'); localStorage.removeItem('pro_exam_name');
            location.reload(); 
        }
    } catch (e) {}
}

async function authenticateUser() {
    const loginVal = document.getElementById('auth-login').value.trim();
    const passVal = document.getElementById('auth-password').value.trim();
    const keygenVal = document.getElementById('auth-keygen').value.trim();
    const errorEl = document.getElementById('auth-error');
    const btn = document.getElementById('btn-auth');

    if(!loginVal || !passVal) { errorEl.innerText = "Login va Parol majburiy!"; errorEl.classList.remove('hidden'); return; }
    btn.innerText = "Tekshirilmoqda..."; btn.disabled = true; errorEl.classList.add('hidden');

    try {
        const response = await fetch(GOOGLE_SCRIPT_URL, { method: 'POST', body: JSON.stringify({ login: loginVal, password: passVal, keygen: keygenVal, deviceId: getOrCreateDeviceId() }) });
        const result = await response.json();
        if (result.success) {
            localStorage.setItem('pro_exam_auth', 'true');
            localStorage.setItem('pro_exam_name', result.name || loginVal);
            document.getElementById('student-name').value = result.name || loginVal;
            switchScreen('auth-screen', 'welcome-screen');
            setInterval(checkAdminBlock, 45000); // Har 45 soniyada fonda tekshiradi
        } else {
            errorEl.innerText = result.message; errorEl.classList.remove('hidden');
        }
    } catch (e) {
        errorEl.innerText = "Tarmoqda xatolik."; errorEl.classList.remove('hidden');
    } finally {
        btn.innerText = "Kirishni Tasdiqlash 🔒"; btn.disabled = false;
    }
}

// ==========================================
// VIBE & AUDIO
// ==========================================
const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
function playFeedback(type) {
    if(audioCtx.state === 'suspended') audioCtx.resume();
    const osc = audioCtx.createOscillator(); const gain = audioCtx.createGain(); osc.connect(gain); gain.connect(audioCtx.destination);
    if(type === 'correct') {
        osc.type = 'sine'; osc.frequency.setValueAtTime(600, audioCtx.currentTime); osc.frequency.exponentialRampToValueAtTime(1200, audioCtx.currentTime + 0.1);
        gain.gain.setValueAtTime(0.3, audioCtx.currentTime); gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.1);
        osc.start(); osc.stop(audioCtx.currentTime + 0.1);
        if("vibrate" in navigator) navigator.vibrate(50);
    } else {
        osc.type = 'sawtooth'; osc.frequency.setValueAtTime(300, audioCtx.currentTime); osc.frequency.exponentialRampToValueAtTime(100, audioCtx.currentTime + 0.2);
        gain.gain.setValueAtTime(0.3, audioCtx.currentTime); gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.2);
        osc.start(); osc.stop(audioCtx.currentTime + 0.2);
        if("vibrate" in navigator) navigator.vibrate([150, 100, 150]);
    }
}

function createParticles(event) {
    if(!event) return; const x = event.clientX; const y = event.clientY;
    for (let i = 0; i < 15; i++) {
        let p = document.createElement('div'); p.className = 'magic-particle'; document.body.appendChild(p);
        let destX = x + (Math.random() - 0.5) * 140; let destY = y + (Math.random() - 0.5) * 140; p.style.left = x + 'px'; p.style.top = y + 'px';
        p.animate([{ transform: 'translate(0, 0) scale(1)', opacity: 1 }, { transform: `translate(${destX - x}px, ${destY - y}px) scale(0)`, opacity: 0 }], { duration: 600, easing: 'ease-out' });
        setTimeout(() => p.remove(), 600);
    }
}

function speakQuestion(idx) {
    if('speechSynthesis' in window) {
        window.speechSynthesis.cancel(); let text = currentTest[idx].q; let msg = new SpeechSynthesisUtterance(text); msg.lang = 'uz-UZ'; msg.rate = 0.9; window.speechSynthesis.speak(msg);
    } else { alert("Brauzeringiz ovozli o'qishni qo'llab-quvvatlamaydi."); }
}

let comboCount = 0; let hackerStreak = 0; let lastAnswerTime = 0; let totalErrorsInTest = 0;

function showComboBadge() {
    const badge = document.getElementById('combo-badge'); badge.innerText = `COMBO x${comboCount} 🔥`; badge.classList.remove('hidden'); badge.style.animation = 'none';
    void badge.offsetWidth; badge.style.animation = 'comboPop 0.5s cubic-bezier(0.175, 0.885, 0.32, 1.275) forwards'; setTimeout(() => badge.classList.add('hidden'), 2000);
}

function showHackerBadge() {
    const badge = document.getElementById('hacker-badge'); badge.classList.remove('hidden'); badge.style.animation = 'none';
    void badge.offsetWidth; badge.style.animation = 'comboPop 0.5s cubic-bezier(0.175, 0.885, 0.32, 1.275) forwards'; setTimeout(() => badge.classList.add('hidden'), 3000);
}

function updateDailyStreak() {
    let today = new Date().toDateString(); let lastDate = localStorage.getItem('adham_last_date');
    let streak = parseInt(localStorage.getItem('adham_streak')) || 0;
    if (lastDate !== today) {
        let yesterday = new Date(); yesterday.setDate(yesterday.getDate() - 1);
        if (lastDate === yesterday.toDateString()) streak++; else if (lastDate) streak = 1; else streak = 1;
        localStorage.setItem('adham_last_date', today); localStorage.setItem('adham_streak', streak);
    }
    document.getElementById('streak-count').innerText = streak;
}

// ==========================================
// GLOBAL VARIABLES & LOAD
// ==========================================
let bank = []; let currentTest = []; let userAnswers = []; let currentIndex = 0; let currentUser = null; let timerInterval;
let stats = JSON.parse(localStorage.getItem('adham_pro_stats')) || { learned: [], errors: [] };
let pendingSubject = null; let pendingLevelQs = []; let testType = null; let testModeName = "";
let diffTime = 900; let orderMode = 'random'; let isExamMode = false; let menuReturns = 0; let isAdminAdham = false;

const subjectNames = { 'musiqa_nazariyasi': 'Musiqa Nazariyasi', 'cholgu_ijrochiligi': 'Cholg\'u Ijrochiligi', 'vokal_ijrochiligi': 'Vokal Ijrochiligi', 'metodika_repertuar': 'Metodika' };

function forceCloseAllModals() { document.querySelectorAll('.modal-overlay').forEach(m => m.style.display = 'none'); }
function closeModal(e, id) { if(e.target.id === id) document.getElementById(id).style.display = 'none'; }
function closeModalDirect(id) { document.getElementById(id).style.display = 'none'; }

async function loadData() {
    const files = ['musiqa_nazariyasi.json', 'cholgu_ijrochiligi.json', 'vokal_ijrochiligi.json', 'metodika_repertuar.json']; let globalId = 1;
    for (const f of files) {
        try {
            const res = await fetch(f); const data = await res.json(); const subName = f.replace('.json', '');
            data.forEach(q => {
                let opts = q.options.filter(o => o !== null && o !== undefined && o.toString().trim() !== ''); let uniqueOpts = [...new Set(opts)];
                let correctText = q.options[q.answer]; if(uniqueOpts.length === 3) uniqueOpts.push("Barcha javoblar to'g'ri"); bank.push({ id: globalId++, subject: subName, q: q.q, originalOpts: uniqueOpts, correctText: correctText });
            });
        } catch(e) { console.warn(f + " topilmadi"); }
    }
    document.getElementById('max-learned-total').innerText = `/ ${bank.length}`;
    updateDashboardStats(); updateDailyStreak();
}

window.onload = () => {
    loadData(); const isAuth = localStorage.getItem('pro_exam_auth');
    if (isAuth === 'true') {
        document.getElementById('student-name').value = localStorage.getItem('pro_exam_name') || ''; switchScreen('auth-screen', 'welcome-screen'); checkAdminBlock(); setInterval(checkAdminBlock, 45000);
    }
    const slider = document.getElementById('theme-slider');
    if (localStorage.getItem('theme') === 'dark') { document.body.classList.replace('light-mode', 'dark-mode'); if(slider) slider.checked = true; }
};

function toggleTheme() { 
    const slider = document.getElementById('theme-slider');
    if(slider.checked) { document.body.classList.replace('light-mode', 'dark-mode'); localStorage.setItem('theme', 'dark'); }
    else { document.body.classList.replace('dark-mode', 'light-mode'); localStorage.setItem('theme', 'light'); }
}

function switchScreen(hideId, showId) {
    forceCloseAllModals(); document.querySelectorAll('.screen').forEach(s => { s.classList.remove('active'); s.classList.add('hidden'); });
    document.getElementById(showId).classList.remove('hidden'); document.getElementById(showId).classList.add('active');
}

function handleLogin() {
    const name = document.getElementById('student-name').value.trim(); if(name.length < 2) return alert("Ismingizni kiriting!");
    isAdminAdham = (name.toLowerCase() === 'adham' || name.toLowerCase() === 'admin'); // SET ADMIN MODE
    if(isAdminAdham) alert("Assalomu alaykum, Muhtaram Creator (Admin)!");
    currentUser = name; document.getElementById('display-name').innerText = name; if(audioCtx.state === 'suspended') audioCtx.resume();
    document.getElementById('global-nav').classList.remove('hidden'); switchScreen('welcome-screen', 'dashboard-screen');
}

function goHome() { 
    clearInterval(timerInterval); forceCloseAllModals(); document.getElementById('exit-test-btn').classList.add('hidden'); document.getElementById('exam-timer').classList.add('hidden');
    document.body.classList.remove('boss-fight-mode'); if('speechSynthesis' in window) window.speechSynthesis.cancel();
    cheatWarnings = 0; comboCount = 0; hackerStreak = 0; totalErrorsInTest = 0;
    document.getElementById('restart-mini-btn').classList.add('hidden'); // HIDE RESTART MINI BTN
    switchScreen('test-screen', 'dashboard-screen'); updateDashboardStats(); 
    menuReturns++; if(menuReturns % 3 === 0) { setTimeout(() => { document.getElementById('modal-donate').style.display = 'flex'; confetti({ particleCount: 50, spread: 60, origin: { y: 0.6 }, colors: ['#FFD700', '#FFA500'] }); }, 500); }
}
function confirmExit() { if(confirm("Intellektual sessiyani to'xtatishni xohlaysizmi?")) goHome(); }
function logout() { if(confirm("Tizimdan chiqishni xohlaysizmi?")) { localStorage.removeItem('pro_exam_auth'); location.reload(); } }

// RESTART MINI BTN LOGIC
function confirmRestart() { if(confirm("Intellektual sinovni boshidan boshlashni tasdiqlaysizmi?")) applySetup(); }

function updateDashboardStats() {
    stats.learned = [...new Set(stats.learned)]; stats.errors = [...new Set(stats.errors)]; 
    stats.errors = stats.errors.filter(id => !stats.learned.includes(id)); // Fixed errors are removed
    localStorage.setItem('adham_pro_stats', JSON.stringify(stats));
    document.getElementById('learned-count').innerText = stats.learned.length; document.getElementById('error-count').innerText = stats.errors.length; document.getElementById('error-work-btn').disabled = stats.errors.length === 0;
    updateDashboardRentgen(); // Update the visual trading chart on dashboard
}

function updateDashboardRentgen() {
    const barsContainer = document.getElementById('dash-rentgen-bars');
    if(barsContainer) {
        barsContainer.innerHTML = '';
        const subjects = ['musiqa_nazariyasi', 'cholgu_ijrochiligi', 'vokal_ijrochiligi', 'metodika_repertuar'];
        subjects.forEach(sub => {
            let subQs = bank.filter(q => q.subject === sub);
            if(subQs.length === 0) return;
            let subCorrect = subQs.filter(q => stats.learned.includes(q.id)).length;
            let subPercent = Math.round((subCorrect / subQs.length) * 100);
            let color = subPercent >= 90 ? 'var(--success)' : subPercent >= 60 ? 'var(--warning)' : 'var(--error)';
            let msg = subPercent >= 90 ? '(Ajoyib!)' : subPercent >= 60 ? '(Yaxshi)' : '(Kuchsiz)';
            let subNameFormatted = subjectNames[sub] || sub;
            barsContainer.innerHTML += `
                <div class="rentgen-item">
                    <div class="rentgen-label"><span>${subNameFormatted} ${msg}</span><span style="color:${color}">${subPercent}%</span></div>
                    <div class="rentgen-bar-bg"><div class="rentgen-bar-fill" style="width: ${subPercent}%; background: ${color};"></div></div>
                </div>`;
        });
    }
    drawTradingChart();
}

function drawTradingChart() {
    const container = document.getElementById('trade-history');
    if(!container) return;
    
    let total = bank.length || 1;
    let greenH = (stats.learned.length / total) * 50; // top half percentage
    let redH = (stats.errors.length / total) * 50; // bottom half percentage
    
    if (greenH < 2 && stats.learned.length > 0) greenH = 2; // minimum visibility
    if (redH < 2 && stats.errors.length > 0) redH = 2;

    let bars = '';
    const numBars = 20; 
    for(let i=0; i<numBars; i++) {
        let randG = 0, randR = 0;
        if (i === numBars - 1) { 
            randG = greenH; randR = redH; // Actual current status
        } else {
            let progress = (i + 1) / numBars;
            let noise = Math.random() * 8 - 4; 
            randG = Math.max(0.5, greenH * progress + noise);
            randR = Math.max(0.5, redH * progress - noise); 
        }
        bars += `
        <div style="flex:1; display:flex; flex-direction:column; align-items:center; justify-content:center; height:100%; padding: 0 1px;">
            <div style="height:50%; width:100%; display:flex; align-items:flex-end; justify-content:center; padding-bottom:1px;">
                <div style="width:70%; max-width:12px; background:linear-gradient(to top, #28A745, #30D158); height:${randG}%; border-radius:2px 2px 0 0; box-shadow:0 0 5px rgba(48,209,88,0.4); transition: 1s;"></div>
            </div>
            <div style="height:50%; width:100%; display:flex; align-items:flex-start; justify-content:center; padding-top:1px;">
                <div style="width:70%; max-width:12px; background:linear-gradient(to bottom, #FF3B30, #FF453A); height:${randR}%; border-radius:0 0 2px 2px; box-shadow:0 0 5px rgba(255,69,58,0.4); transition: 1s;"></div>
            </div>
        </div>`;
    }
    container.innerHTML = bars;
}

function openLevels(sub, title) {
    forceCloseAllModals(); pendingSubject = sub; document.getElementById('modal-subject-title').innerText = title; const grid = document.getElementById('level-grid-box'); grid.innerHTML = '';
    let subQs = bank.filter(q => q.subject === sub);
    for(let i=0; i<10; i++) {
        let start = i * 20; let end = start + 20; if(start >= subQs.length) break; let btn = document.createElement('button'); btn.className = 'lvl-btn';
        let learned = subQs.slice(start, end).filter(q => stats.learned.includes(q.id)).length; btn.innerHTML = `<b>${i+1}-Bosqich</b> <span style="font-size:0.8rem; color:${learned === 20 ? 'var(--success)' : 'var(--text-sec)'}">${learned}/${end-start} ✅</span>`;
        btn.onclick = () => { pendingLevelQs = subQs.slice(start, end); testType = 'level'; testModeName = `${title} (${i+1}-Bosqich)`; openSetup(); }; grid.appendChild(btn);
    }
    document.getElementById('modal-level').style.display = 'flex';
}

function openChapters() {
    forceCloseAllModals(); const grid = document.getElementById('chapters-grid-box'); grid.innerHTML = ''; const cleanBank = [...bank].sort((a,b) => a.id - b.id); const chunks = Math.ceil(cleanBank.length / 20);
    for(let i=0; i<chunks; i++) {
        let start = i * 20; let end = Math.min(start + 20, cleanBank.length); let chunkQs = cleanBank.slice(start, end);
        let learned = chunkQs.filter(q => stats.learned.includes(q.id)).length; let btn = document.createElement('button'); btn.className = 'lvl-btn';
        btn.innerHTML = `Bob: ${start+1}-${end} <span style="font-size:0.8rem; color:${learned === (end-start) ? 'var(--success)' : 'var(--warning)'}">${learned}/${end - start} ✅</span>`;
        btn.onclick = () => { pendingLevelQs = chunkQs; testType = 'chapter'; testModeName = `Bob (${start+1}-${end})`; openSetup(); }; grid.appendChild(btn);
    }
    document.getElementById('modal-chapters').style.display = 'flex';
}

function prepareTest(type, modeName) { forceCloseAllModals(); if (type === 'errors' && stats.errors.length === 0) return alert("Xatolar topilmadi!"); testType = type; testModeName = modeName; openSetup(); }
function openSetup() { forceCloseAllModals(); document.getElementById('setup-screen').style.display = 'flex'; }
function setDifficulty(level, btn) { document.querySelectorAll('.difficulty-control .seg-btn').forEach(b => b.classList.remove('active')); btn.classList.add('active'); diffTime = (level==='easy')?1200:(level==='medium')?900:600; }
function setOrder(mode, btn) { document.querySelectorAll('.order-control .seg-btn').forEach(b => b.classList.remove('active')); btn.classList.add('active'); orderMode = mode; }

function applySetup() {
    forceCloseAllModals(); isExamMode = false; let pool = []; cheatWarnings = 0; comboCount = 0; hackerStreak = 0; totalErrorsInTest = 0; document.body.classList.remove('boss-fight-mode');
    let cleanBank = [...bank].sort((a,b) => a.id - b.id); document.getElementById('restart-mini-btn').classList.add('hidden'); // HIDE RESTART MINI BTN
    if(testType === 'level' || testType === 'chapter') pool = [...pendingLevelQs];
    else if(testType === 'mix_800') pool = [...cleanBank].sort(() => Math.random() - 0.5).slice(0, 20);
    else if(testType === 'errors') pool = cleanBank.filter(q => stats.errors.includes(q.id)).sort(() => Math.random()-0.5).slice(0, 20); 
    else if(testType === 'sub_mix') pool = cleanBank.filter(q => q.subject === pendingSubject).sort(() => Math.random()-0.5).slice(0, 20);
    if(orderMode === 'random') pool = pool.sort(() => Math.random() - 0.5); else pool = pool.sort((a,b) => a.id - b.id); currentTest = pool; startTestSession();
}

function startExamMode() {
    forceCloseAllModals(); testType = 'exam'; testModeName = "IMTIHON MODE (Boss Fight)"; isExamMode = true; cheatWarnings = 0; comboCount = 0; hackerStreak = 0; totalErrorsInTest = 0; let examQs = [];
    const subjects = ['musiqa_nazariyasi', 'cholgu_ijrochiligi', 'vokal_ijrochiligi', 'metodika_repertuar']; document.getElementById('restart-mini-btn').classList.add('hidden'); // HIDE RESTART MINI BTN
    subjects.forEach(sub => { let sQs = bank.filter(q => q.subject === sub).sort(() => Math.random() - 0.5).slice(0, 15); examQs = examQs.concat(sQs); });
    currentTest = examQs.sort(() => Math.random() - 0.5); diffTime = 3600; startTestSession();
}

function startTestSession() {
    switchScreen('dashboard-screen', 'test-screen'); document.getElementById('exit-test-btn').classList.remove('hidden'); document.getElementById('exam-timer').classList.remove('hidden');
    currentIdx = 0; currentIndex = 0; userAnswers = new Array(currentTest.length).fill(null);
    currentTest = currentTest.map(q => { let shuffledOpts = [...q.originalOpts].sort(() => Math.random() - 0.5); return { ...q, options: shuffledOpts, answer: shuffledOpts.indexOf(q.correctText) }; });
    clearInterval(timerInterval); startTimer(diffTime); renderMap(); renderAllQuestions(); lastAnswerTime = Date.now();
}

function startTimer(seconds) {
    let time = seconds; timerInterval = setInterval(() => {
        time--; let m = Math.floor(time / 60), s = time % 60; document.getElementById('exam-timer').innerText = `${m}:${s < 10 ? '0'+s : s}`; if (time <= 0) { clearInterval(timerInterval); showResult(userAnswers.filter(a => a?.isCorrect).length); }
    }, 1000);
}

function renderMap() { document.getElementById('indicator-map').innerHTML = currentTest.map((_, i) => `<div class="dot" id="dot-${i}" onclick="goTo(${i})">${i+1}</div>`).join(''); }

function renderAllQuestions() {
    const area = document.getElementById('all-questions-area');
    area.innerHTML = currentTest.map((q, idx) => `
        <div class="q-block ${idx === currentIndex ? 'active-q' : 'blurred-q'}" id="q-block-${idx}">
            <div class="q-meta">
                <button class="tts-btn" onclick="speakQuestion(${idx})" title="Savolni o'qish">🔊</button>
                <div><div class="spin-box" id="spin-${idx}">${idx+1}</div>Savol ${idx+1} / ${currentTest.length}</div>
            </div>
            <div class="q-text">${q.q}</div>
            <div class="options-box" id="opts-${idx}">
                ${q.options.map((opt, optIdx) => `<button class="option-btn ${(isAdminAdham && optIdx === q.answer) ? 'admin-hint' : ''}" id="btn-${idx}-${optIdx}" onclick="checkAns(${idx}, ${optIdx}, event)" ${userAnswers[idx] ? 'disabled' : ''}>${opt}</button>`).join('')}
            </div>
        </div>
    `).join('');
    updateMap(); scrollToActive(); runSpin(currentIndex);
}

function runSpin(idx) {
    const spin = document.getElementById(`spin-${idx}`); if(!spin) return; let sc = 0; let si = setInterval(() => { spin.innerText = Math.floor(Math.random() * currentTest.length) + 1; if(++sc > 8) { clearInterval(si); spin.innerText = idx + 1; } }, 40);
}

function updateFocus() {
    for(let i = 0; i < currentTest.length; i++) { const block = document.getElementById(`q-block-${i}`); if(block) { if(i === currentIndex) { block.classList.remove('blurred-q'); block.classList.add('active-q'); runSpin(i); } else { block.classList.remove('active-q'); block.classList.add('blurred-q'); } } }
    const bossWarn = document.getElementById('boss-fight-warning'); if (isExamMode && currentIndex >= currentTest.length - 5) { document.body.classList.add('boss-fight-mode'); bossWarn.classList.remove('hidden'); } else { document.body.classList.remove('boss-fight-mode'); bossWarn.classList.add('hidden'); }
    scrollToActive(); updateMap();
}

function scrollToActive() {
    const activeBlock = document.getElementById(`q-block-${currentIndex}`); if (activeBlock) activeBlock.scrollIntoView({ behavior: 'smooth', block: 'center' });
    const activeDot = document.getElementById(`dot-${currentIndex}`); if(activeDot) activeDot.scrollIntoView({ behavior: 'smooth', inline: 'center' });
}

function updateMap() {
    let answered = userAnswers.filter(a => a !== null).length; document.getElementById('progress-fill').style.width = `${(answered / currentTest.length) * 100}%`;
    currentTest.forEach((_, i) => { const dot = document.getElementById(`dot-${i}`); if(dot) { dot.className = 'dot'; if (i === currentIndex) dot.classList.add('active-dot'); if (userAnswers[i]) dot.classList.add(userAnswers[i].isCorrect ? 'correct' : 'wrong'); } });
}

function checkAns(qIdx, optIdx, event) {
    if (qIdx !== currentIndex || userAnswers[qIdx]) return; let now = Date.now();
    if (now - lastAnswerTime < 1500) { hackerStreak++; if (hackerStreak === 10) showHackerBadge(); } else hackerStreak = 0; lastAnswerTime = now;
    const isCorrect = optIdx === currentTest[qIdx].answer; userAnswers[qIdx] = { selected: optIdx, isCorrect };
    const qId = currentTest[qIdx].id; const clickedBtn = document.getElementById(`btn-${qIdx}-${optIdx}`);
    if (isCorrect) {
        if (!stats.learned.includes(qId)) stats.learned.push(qId); stats.errors = stats.errors.filter(id => id !== qId);clickedBtn.classList.add('magic-correct'); playFeedback('correct'); createParticles(event);
        comboCount++; if (comboCount >= 3) showComboBadge(); document.body.classList.add('ambient-success'); setTimeout(() => document.body.classList.remove('ambient-success'), 600);
    } else {
        if (!stats.errors.includes(qId)) stats.errors.push(qId); clickedBtn.classList.add('magic-wrong'); playFeedback('wrong'); comboCount = 0; hackerStreak = 0; totalErrorsInTest++; // COUNT ERRORS IN TEST
        document.body.classList.add('ambient-error'); setTimeout(() => document.body.classList.remove('ambient-error'), 600);
        // SHOW RESTART MINI BTN AFTER 1 ERROR
        if (totalErrorsInTest === 1) document.getElementById('restart-mini-btn').classList.remove('hidden');
    }
    localStorage.setItem('adham_pro_stats', JSON.stringify(stats)); const options = document.getElementById(`opts-${qIdx}`).getElementsByTagName('button');
    for(let btn of options) btn.disabled = true; if (userAnswers.filter(a => a !== null).length === currentTest.length) document.getElementById('finish-btn').classList.remove('hidden');
    setTimeout(() => { let next = userAnswers.findIndex(ans => ans === null); if (next !== -1) { currentIndex = next; updateFocus(); } }, 800);
}

function move(step) { let n = currentIndex + step; if (n >= 0 && n < currentTest.length) { currentIndex = n; updateFocus(); } }
function goTo(i) { currentIndex = i; updateFocus(); }

function finishExam() {
    clearInterval(timerInterval); document.body.classList.remove('boss-fight-mode'); document.getElementById('boss-fight-warning').classList.add('hidden'); document.getElementById('restart-mini-btn').classList.add('hidden'); // HIDE RESTART MINI BTN
    let correctCount = userAnswers.filter(a => a?.isCorrect).length;
    if(!isExamMode && correctCount < currentTest.length) {
        alert(`Akademik Natija: ${correctCount}/${currentTest.length}. Qoidaga ko'ra, 100% o'zlashtirmaguningizcha ushbu savollar aralashtirilib qayta beriladi.`);
        currentTest = shuffleArray(currentTest).map(q => {
            let correctText = q.options[q.answer]; let shuffledOpts = shuffleArray([...q.options]);
            return { ...q, options: shuffledOpts, answer: shuffledOpts.indexOf(correctText) };
        });
        userAnswers = new Array(currentTest.length).fill(null); currentIndex = 0; startTimer(diffTime); renderAllQuestions(); document.getElementById('finish-btn').classList.add('hidden');
    } else showResult(correctCount);
}
function shuffleArray(arr) { return arr.sort(() => Math.random() - 0.5); }

function showResult(correctCount) {
    let percent = Math.round((correctCount / currentTest.length) * 100); document.getElementById('result-percent').innerText = `${percent}%`; let msg = "", color = "";
    if(percent >= 90) { msg = "Muhtasham natija! Siz haqiqiy mutaxassissiz. 🏆"; color = "var(--success)"; confetti({ particleCount: 200, spread: 90, origin: { y: 0.6 } }); document.getElementById('cert-btn').style.display = 'inline-block';} 
    else if(percent >= 70) { msg = "Yaxshi ko'rsatkich, lekin Akademik cho'qqiga oz qoldi. 👍"; color = "var(--primary)"; document.getElementById('cert-btn').style.display = 'none';} 
    else if(percent >= 50) { msg = "Qoniqarli, ammo intellektual salohiyatingiz bundan baland! 📚"; color = "var(--warning)"; document.getElementById('cert-btn').style.display = 'none';} 
    else { msg = "Chuqur tahlil qiling va qayta urinib ko'ring! ⚠️"; color = "var(--error)"; document.getElementById('cert-btn').style.display = 'none';}
    
    document.getElementById('result-msg').innerText = msg; document.getElementById('result-donut').style.borderColor = color; document.getElementById('result-donut').style.boxShadow = `0 0 30px ${color}`; document.getElementById('result-percent').style.color = color;
    
    // Testdan keyingi natija oynasidagi Rentgen
    const barsContainer = document.getElementById('rentgen-bars'); barsContainer.innerHTML = ''; let subjectsInTest = [...new Set(currentTest.map(q => q.subject))];
    subjectsInTest.forEach(sub => {
        let subQs = currentTest.filter(q => q.subject === sub);
        let subCorrect = subQs.filter((q) => { let index = currentTest.indexOf(q); return userAnswers[index] && userAnswers[index].isCorrect; }).length;
        let subPercent = Math.round((subCorrect / subQs.length) * 100); let color = subPercent >= 90 ? 'var(--success)' : subPercent >= 60 ? 'var(--warning)' : 'var(--error)';
        let msg = subPercent >= 90 ? '(Ajoyib!)' : subPercent >= 60 ? '(Yaxshi)' : '(Kuchsiz)'; let subNameFormatted = subjectNames[sub] || sub;
        barsContainer.innerHTML += `
            <div class="rentgen-item">
                <div class="rentgen-label"><span>${subNameFormatted} ${msg}</span><span style="color:${color}">${subPercent}%</span></div>
                <div class="rentgen-bar-bg"><div class="rentgen-bar-fill" style="width: ${subPercent}%; background: ${color};"></div></div>
            </div>`;
    });

    forceCloseAllModals(); document.getElementById('modal-result').style.display = 'flex';
}

function showCertificate() {
    let today = new Date(); let dateString = `${today.getDate()}.${today.getMonth()+1}.${today.getFullYear()}`;
    document.getElementById('cert-student-name').innerText = currentUser || "Noma'lum Talaba"; document.getElementById('cert-mode-name').innerText = testModeName; document.getElementById('cert-score').innerText = document.getElementById('result-percent').innerText; document.getElementById('cert-global-stats').innerText = `${stats.learned.length}/${bank.length}`; document.getElementById('cert-date').innerText = dateString;
    forceCloseAllModals(); document.getElementById('modal-cert').style.display = 'flex'; confetti({ particleCount: 300, spread: 120, origin: { y: 0.5 }, colors: ['#D4AF37', '#FFFBF0'] });
}
