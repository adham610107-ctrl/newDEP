// Global o'zgaruvchilar va holat
const AppState = {
    subjects: [
        { name: "Musiqa nazariyasi", file: "musiqa_nazariyasi.json" },
        { name: "Cholg'u ijrochiligi", file: "cholgu_ijrochiligi.json" },
        { name: "Vokal ijrochiligi", file: "vokal_ijrochiligi.json" },
        { name: "Metodika repertuar", file: "metodika_repertuar.json" }
    ],
    currentQuestions: [],
    currentQuestionIndex: 0,
    score: 0,
    wrongAnswersCount: 0,
    remainingQuestionsCount: 0,
    selectedSubject: null,
    streak: 0,
    combo: 0,
    lastCorrect: true,
    bossMode: false,
    audioContext: null,
    wrongAnswers: [], // Xato javob berilgan savollarni saqlash uchun
    timer: null,
    timeSpent: 0,
    themeSwitchChecked: false // Tema qo'lda o'zgartirilganligini kuzatish
};

// HTML elementlarini JS orqali yaratish va ularga murojaat
const UIElements = {
    root: document.getElementById('root'),
    header: null,
    main: null,
    footer: null,
    subjectSelection: null,
    quizContainer: null,
    endScreen: null,
    questionText: null,
    optionsContainer: null,
    progressBarFill: null,
    progressPercent: null,
    statCorrect: null,
    statWrong: null,
    statRemaining: null,
    statScore: null,
    streakValue: null,
    comboValue: null,
    comboVisual: null,
    themeSwitch: null,
    bossWarning: null
};

// Ilova ishga tushishi
function initApp() {
    createUIStructure();
    checkDeviceTheme();
    loadLastResults();
    AppState.streak = parseInt(localStorage.getItem('streak')) || 0;
    updateStreakUI();
    
    UIElements.themeSwitch.addEventListener('change', toggleTheme);
    window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', event => {
        if (!AppState.themeSwitchChecked) { // Agar foydalanuvchi qo'lda o'zgartirmagan bo'lsa
             setTheme(event.matches ? 'dark' : 'light');
        }
    });

    // Anti-cheat choralari
    document.addEventListener('copy', (e) => { e.preventDefault(); showNotification('⚠️ Ko\'chirish bloklandi!'); });
    document.addEventListener('contextmenu', (e) => e.preventDefault());
    window.addEventListener('keydown', (e) => {
        if (e.ctrlKey && (e.key === 'c' || e.key === 'u')) { e.preventDefault(); showNotification('⚠️ Cheat bloklandi!'); }
        if (e.key === 'F12') { e.preventDefault(); showNotification('⚠️ DevTools bloklandi!'); }
    });

    try {
        AppState.audioContext = new (window.AudioContext || window.webkitAudioContext)();
    } catch (e) {
        console.warn("Web Audio API not supported.");
    }
    
    renderSubjectSelection();
}

// UI strukturasini yaratish (HTML fayldan JSga o'tkazildi, oldingi dizayn asosida)
function createUIStructure() {
    // Header
    UIElements.header = document.createElement('header');
    UIElements.header.innerHTML = `
        <div class="logo-box">
            <img src="logo.png" alt="CSPI Logo" class="logo-img">
            <h1>PRO EXAM</h1>
        </div>
        <div class="header-controls">
            <span class="uni-name">CHDPU</span>
            <label class="theme-switch">
                <input type="checkbox" id="theme-checkbox">
                <span class="slider round"></span>
            </label>
        </div>
        <div class="streak-container" title="Kunlik seriya">
            🔥 <span id="streak-value">0</span> kun
        </div>
    `;
    UIElements.themeSwitch = UIElements.header.querySelector('#theme-checkbox');
    UIElements.streakValue = UIElements.header.querySelector('#streak-value');
    
    // Main
    UIElements.main = document.createElement('main');
    
    // Subject Selection
    UIElements.subjectSelection = document.createElement('section');
    UIElements.subjectSelection.id = 'subject-selection';
    UIElements.subjectSelection.innerHTML = `
        <h2>Fanlarni tanlang</h2>
        <div class="subject-buttons-container"></div>
        <div class="last-results" id="last-results"></div>
    `;
    
    // Quiz Container
    UIElements.quizContainer = document.createElement('section');
    UIElements.quizContainer.id = 'quiz-container';
    UIElements.quizContainer.classList.add('hidden');
    UIElements.quizContainer.innerHTML = `
        <div class="progress-container">
            <div class="progress-bar-fill" id="progress-bar-fill"></div>
            <div class="progress-percent" id="progress-percent">0%</div>
        </div>
        
        <div class="stats-grid">
            <div class="stat-box correct" title="To'g'ri">✅ <span id="stat-correct">0</span></div>
            <div class="stat-box wrong" title="Noto'g'ri">❌ <span id="stat-wrong">0</span></div>
            <div class="stat-box remaining" title="Qolgan">❓ <span id="stat-remaining">0</span></div>
            <div class="stat-box score" title="Ball">🏆 <span id="stat-score">0</span></div>
        </div>

        <div class="question-box">
            <p id="question-text">Savol yuklanmoqda...</p>
        </div>
        
        <div class="options-container" id="options-container"></div>
        
        <div class="combo-container" title="Combo">
            ⭐ <span id="combo-value">0</span>x
        </div>
        <div class="boss-warning hidden">
            ⚠️ DIQQAT! BOSS BOSQICHI! Oxirgi 5 ta savol!
        </div>
    `;
    UIElements.questionText = UIElements.quizContainer.querySelector('#question-text');
    UIElements.optionsContainer = UIElements.quizContainer.querySelector('#options-container');
    UIElements.progressBarFill = UIElements.quizContainer.querySelector('#progress-bar-fill');
    UIElements.progressPercent = UIElements.quizContainer.querySelector('#progress-percent');
    UIElements.statCorrect = UIElements.quizContainer.querySelector('#stat-correct');
    UIElements.statWrong = UIElements.quizContainer.querySelector('#stat-wrong');
    UIElements.statRemaining = UIElements.quizContainer.querySelector('#stat-remaining');
    UIElements.statScore = UIElements.quizContainer.querySelector('#stat-score');
    UIElements.comboValue = UIElements.quizContainer.querySelector('#combo-value');
    UIElements.bossWarning = UIElements.quizContainer.querySelector('.boss-warning');
    
    // End Screen
    UIElements.endScreen = document.createElement('section');
    UIElements.endScreen.id = 'end-screen';
    UIElements.endScreen.classList.add('hidden');
    UIElements.endScreen.innerHTML = `
        <div class="end-card glass">
            <h2>Test Yakunlandi!</h2>
            <p id="end-message"></p>
            <div class="end-stats">
                <p>Jami ball: <span id="end-score"></span></p>
                <p>To'g'ri javoblar: <span id="end-correct"></span></p>
                <p>Noto'g'ri javoblar: <span id="end-wrong"></span></p>
                <p>Sarflangan vaqt: <span id="end-time"></span></p>
            </div>
            <div class="error-analysis hidden" id="error-analysis">
                <h3>Xatolar tahlili:</h3>
                <ul id="error-list"></ul>
            </div>
            <button id="restart-btn" class="main-btn">Bosh sahifaga qaytish</button>
        </div>
    `;
    UIElements.endScreen.querySelector('#restart-btn').addEventListener('click', backToSubjectSelection);

    // Footer
    UIElements.footer = document.createElement('footer');
    UIElements.footer.innerHTML = `
        <div class="developer-info">
            <img src="imzo.png" alt="Adhams signature" class="signature-img">
            <span>By Adham's Development</span>
        </div>
        <div class="social-links">
            <a href="#" class="social-icon"><img src="insta.png" alt="Instagram"></a>
            <a href="#" class="social-icon"><img src="tg.png" alt="Telegram"></a>
        </div>
    `;

    // Combo Visual effect element
    UIElements.comboVisual = document.createElement('div');
    UIElements.comboVisual.classList.add('combo-visual');

    // Root-ga barcha elementlarni qo'shish
    UIElements.main.appendChild(UIElements.subjectSelection);
    UIElements.main.appendChild(UIElements.quizContainer);
    UIElements.main.appendChild(UIElements.endScreen);
    
    UIElements.root.appendChild(UIElements.header);
    UIElements.root.appendChild(UIElements.main);
    UIElements.root.appendChild(UIElements.footer);
    UIElements.root.appendChild(UIElements.comboVisual);
}

// Mavzu tanlash ekranini ko'rsatish
function renderSubjectSelection() {
    const container = UIElements.subjectSelection.querySelector('.subject-buttons-container');
    container.innerHTML = '';
    
    AppState.subjects.forEach(subject => {
        const button = document.createElement('button');
        button.className = 'subject-btn glass-btn';
        button.textContent = subject.name;
        button.addEventListener('click', () => startQuiz(subject));
        container.appendChild(button);
    });
}

// Testni boshlash
async function startQuiz(subject) {
    AppState.selectedSubject = subject;
    AppState.quizContainer.classList.remove('hidden');
    AppState.subjectSelection.classList.add('hidden');
    AppState.endScreen.classList.add('hidden');
    
    UIElements.questionText.textContent = `Yuklanmoqda... (${subject.name})`;
    UIElements.optionsContainer.innerHTML = '';

    try {
        const data = await fetchJSONData(subject.file);
        if (!data || data.length === 0) {
            throw new Error("Savollar topilmadi.");
        }
        AppState.currentQuestions = shuffleArray(data);
        AppState.currentQuestionIndex = 0;
        AppState.score = 0;
        AppState.wrongAnswersCount = 0;
        AppState.combo = 0;
        AppState.bossMode = false;
        AppState.wrongAnswers = [];
        AppState.remainingQuestionsCount = AppState.currentQuestions.length;
        AppState.timeSpent = 0;
        
        startTimer();
        updateUIElements();
        showQuestion();
        
        // Streak-ni yangilash
        const lastDate = localStorage.getItem('lastQuizDate');
        const today = new Date().toISOString().split('T')[0];
        if (lastDate !== today) {
            AppState.streak++;
            localStorage.setItem('streak', AppState.streak);
            localStorage.setItem('lastQuizDate', today);
            updateStreakUI();
        }

    } catch (error) {
        showNotification(`Xato: ${error.message}`);
        backToSubjectSelection();
    }
}

// JSON ma'lumotlarini yuklash
async function fetchJSONData(fileName) {
    try {
        const response = await fetch(fileName);
        if (!response.ok) {
            throw new Error(`Faylni yuklab bo'lmadi: ${fileName}`);
        }
        return await response.json();
    } catch (error) {
        throw error;
    }
}

// Savolni ko'rsatish
function showQuestion() {
    if (AppState.currentQuestionIndex >= AppState.currentQuestions.length) {
        endQuiz();
        return;
    }

    const question = AppState.currentQuestions[AppState.currentQuestionIndex];
    UIElements.questionText.textContent = `${AppState.currentQuestionIndex + 1}. ${question.question}`;
    UIElements.optionsContainer.innerHTML = '';

    // "Boss" bosqichini tekshirish (oxirgi 5 ta savol)
    if (AppState.remainingQuestionsCount <= 5 && AppState.remainingQuestionsCount > 0) {
        if (!AppState.bossMode) {
            AppState.bossMode = true;
            UIElements.bossWarning.classList.remove('hidden');
            document.body.classList.add('boss-mode');
            playSound(440, 0.5); // "Boss" tovushi
            setTimeout(() => playSound(660, 0.3), 300);
            showNotification('🔥 BOSS BOSQICHI BOSHLANDI!', 'warning');
        }
    } else if (AppState.bossMode) {
         AppState.bossMode = false;
         UIElements.bossWarning.classList.add('hidden');
         document.body.classList.remove('boss-mode');
    }

    const options = shuffleArray([...question.options, question.answer]);
    options.forEach(option => {
        const button = document.createElement('button');
        button.className = 'option-btn glass-btn';
        button.textContent = option;
        button.addEventListener('click', () => checkAnswer(option));
        UIElements.optionsContainer.appendChild(button);
    });
    
    updateProgress();
}

// Javobni tekshirish
function checkAnswer(selectedOption) {
    const question = AppState.currentQuestions[AppState.currentQuestionIndex];
    const optionButtons = UIElements.optionsContainer.querySelectorAll('.option-btn');
    
    let isCorrect = (selectedOption === question.answer);
    
    // Tugmalarni nofaol qilish
    optionButtons.forEach(btn => btn.disabled = true);

    // Vizual aloqa va tovush
    if (isCorrect) {
        AppState.score += 10 + (AppState.combo * 2); // Combo balli
        AppState.lastCorrect = true;
        AppState.combo++;
        playSound(880, 0.1, 'sine'); // To'g'ri tovush
        showNotification('To\'g\'ri!', 'success');
        showComboVisual();
        
        // To'g'ri javobni yashil rangga bo'yash
        optionButtons.forEach(btn => {
            if (btn.textContent === selectedOption) btn.classList.add('correct');
        });

    } else {
        AppState.score = Math.max(0, AppState.score - 5);
        AppState.wrongAnswersCount++;
        AppState.lastCorrect = false;
        AppState.combo = 0;
        AppState.wrongAnswers.push({ ...question, selected: selectedOption }); // Xato javobni saqlash
        playSound(220, 0.2, 'square'); // Noto'g'ri tovush
        showNotification('Noto\'g\'ri!', 'error');
        
        // Noto'g'ri va to'g'ri javoblarni ko'rsatish
        optionButtons.forEach(btn => {
            if (btn.textContent === selectedOption) btn.classList.add('wrong');
            if (btn.textContent === question.answer) btn.classList.add('correct'); // To'g'ri javobni ko'rsatish
        });
    }

    updateUIElements();
    AppState.currentQuestionIndex++;
    AppState.remainingQuestionsCount--;

    // Keyingi savolga o'tish
    setTimeout(showQuestion, isCorrect ? 500 : 1500); // Noto'g'ri javobda ko'proq kutish
}

// Testni tugatish
function endQuiz() {
    clearInterval(AppState.timer);
    AppState.quizContainer.classList.add('hidden');
    AppState.endScreen.classList.remove('hidden');
    document.body.classList.remove('boss-mode');
    UIElements.bossWarning.classList.add('hidden');
    AppState.bossMode = false;
    
    // Natijalarni hisoblash
    const totalQuestions = AppState.currentQuestions.length;
    const correctCount = totalQuestions - AppState.wrongAnswersCount;
    const timeFormatted = formatTime(AppState.timeSpent);
    
    UIElements.endScreen.querySelector('#end-score').textContent = AppState.score;
    UIElements.endScreen.querySelector('#end-correct').textContent = correctCount;
    UIElements.endScreen.querySelector('#end-wrong').textContent = AppState.wrongAnswersCount;
    UIElements.endScreen.querySelector('#end-time').textContent = timeFormatted;
    
    // Yakuniy xabar
    let message = '';
    if (AppState.score > totalQuestions * 8) message = 'Ajoyib natija! SIZ PRO MASTERSIZ! 🏆';
    else if (AppState.score > totalQuestions * 5) message = 'Yaxshi natija, davom eting! 💪';
    else message = 'Ko\'proq shug\'ullaning, hammasi yaxshi bo\'ladi! ✨';
    
    UIElements.endScreen.querySelector('#end-message').textContent = message;
    
    // Xatolar tahlili
    const errorAnalysis = UIElements.endScreen.querySelector('#error-analysis');
    const errorList = UIElements.endScreen.querySelector('#error-list');
    errorList.innerHTML = '';
    
    if (AppState.wrongAnswers.length > 0) {
        errorAnalysis.classList.remove('hidden');
        AppState.wrongAnswers.forEach(err => {
            const li = document.createElement('li');
            li.innerHTML = `
                <p class="error-q">Savol: ${err.question}</p>
                <p class="error-a correct">To'g'ri javob: ${err.answer}</p>
                <p class="error-a wrong">Sizning javobingiz: ${err.selected}</p>
            `;
            errorList.appendChild(li);
        });
    } else {
        errorAnalysis.classList.add('hidden');
    }
    
    // Natijani saqlash
    saveQuizResult();
}

// Natijani localStorage-ga saqlash
function saveQuizResult() {
    const results = JSON.parse(localStorage.getItem('proExamResults')) || [];
    const newResult = {
        subject: AppState.selectedSubject.name,
        score: AppState.score,
        correct: AppState.currentQuestions.length - AppState.wrongAnswersCount,
        wrong: AppState.wrongAnswersCount,
        date: new Date().toLocaleDateString()
    };
    results.unshift(newResult); // Yangi natijani boshiga qo'shish
    localStorage.setItem('proExamResults', JSON.stringify(results.slice(0, 5))); // Faqat oxirgi 5 ta natijani saqlash
    loadLastResults(); // Bosh sahifani yangilash
}

// Oxirgi natijalarni yuklash
function loadLastResults() {
    const resultsContainer = UIElements.subjectSelection.querySelector('#last-results');
    resultsContainer.innerHTML = '';
    
    const results = JSON.parse(localStorage.getItem('proExamResults')) || [];
    
    if (results.length > 0) {
        resultsContainer.innerHTML = '<h3>Oxirgi natijalar:</h3>';
        const list = document.createElement('ul');
        results.forEach(res => {
            const li = document.createElement('li');
            li.textContent = `${res.date}: ${res.subject} - ${res.score} ball (${res.correct}✅ / ${res.wrong}❌)`;
            list.appendChild(li);
        });
        resultsContainer.appendChild(list);
    }
}

// Bosh sahifaga qaytish
function backToSubjectSelection() {
    AppState.quizContainer.classList.add('hidden');
    AppState.endScreen.classList.add('hidden');
    AppState.subjectSelection.classList.remove('hidden');
    
    // Test holatini tozalash (agar kerak bo'lsa)
    clearInterval(AppState.timer);
    AppState.timeSpent = 0;
    document.body.classList.remove('boss-mode');
}

// Massivni aralashtirish (Fisher-Yates)
function shuffleArray(array) {
    for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]];
    }
    return array;
}

// UI elementlarini yangilash
function updateUIElements() {
    UIElements.statCorrect.textContent = AppState.currentQuestionIndex + 1 - AppState.wrongAnswersCount;
    UIElements.statWrong.textContent = AppState.wrongAnswersCount;
    UIElements.statRemaining.textContent = AppState.remainingQuestionsCount;
    UIElements.statScore.textContent = AppState.score;
    UIElements.comboValue.textContent = AppState.combo;
    
    // Combo konteynerini ko'rsatish/yashirish
    const comboContainer = UIElements.quizContainer.querySelector('.combo-container');
    if (AppState.combo > 1) {
        comboContainer.classList.add('active');
    } else {
        comboContainer.classList.remove('active');
    }
}

// Progress barni yangilash
function updateProgress() {
    const totalQuestions = AppState.currentQuestions.length;
    const currentQ = AppState.currentQuestionIndex + 1;
    const percent = Math.floor((currentQ / totalQuestions) * 100);
    
    UIElements.progressBarFill.style.width = `${percent}%`;
    UIElements.progressPercent.textContent = `${percent}%`;
    
    // Boss bosqichida rangni o'zgartirish
    if (AppState.bossMode) {
        UIElements.progressBarFill.classList.add('boss-progress');
    } else {
        UIElements.progressBarFill.classList.remove('boss-progress');
    }
}

// Streak-ni yangilash
function updateStreakUI() {
    UIElements.streakValue.textContent = AppState.streak;
}

// Xabarnoma ko'rsatish
function showNotification(message, type = 'default') {
    const notification = document.createElement('div');
    notification.className = `notification glass ${type}`;
    notification.textContent = message;
    document.body.appendChild(notification);
    
    setTimeout(() => {
        notification.classList.add('show');
        playSound(1200, 0.05, 'triangle'); // Xabarnoma tovushi
    }, 50);
    
    setTimeout(() => {
        notification.classList.remove('show');
        setTimeout(() => notification.remove(), 500);
    }, 3000);
}

// Tovush chiqarish
function playSound(frequency = 440, duration = 0.2, type = 'sine') {
    if (!AppState.audioContext) return;
    
    const oscillator = AppState.audioContext.createOscillator();
    const gainNode = AppState.audioContext.createGain();
    
    oscillator.type = type;
    oscillator.frequency.setValueAtTime(frequency, AppState.audioContext.currentTime);
    gainNode.gain.setValueAtTime(duration, AppState.audioContext.currentTime);
    
    oscillator.connect(gainNode);
    gainNode.connect(AppState.audioContext.destination);
    
    oscillator.start();
    oscillator.stop(AppState.audioContext.currentTime + 0.1); // Juda qisqa tovush
}

// Combo vizual effekti
function showComboVisual() {
    if (AppState.combo > 1) {
        UIElements.comboVisual.textContent = `⭐ Combo ${AppState.combo}x ⭐`;
        UIElements.comboVisual.classList.add('show');
        setTimeout(() => UIElements.comboVisual.classList.remove('show'), 800);
    }
}

// Timer
function startTimer() {
    clearInterval(AppState.timer);
    AppState.timer = setInterval(() => {
        AppState.timeSpent++;
    }, 1000);
}

// Vaqtni formatlash (min:sek)
function formatTime(seconds) {
    const min = Math.floor(seconds / 60);
    const sek = seconds % 60;
    return `${min < 10 ? '0' : ''}${min}:${sek < 10 ? '0' : ''}${sek}`;
}

// Tema almashtirish
function toggleTheme() {
    AppState.themeSwitchChecked = true;
    if (document.body.classList.contains('dark-mode')) {
        setTheme('light');
    } else {
        setTheme('dark');
    }
}

// Temani o'rnatish
function setTheme(theme) {
    if (theme === 'dark') {
        document.body.classList.add('dark-mode');
        UIElements.themeSwitch.checked = true;
        localStorage.setItem('theme', 'dark');
    } else {
        document.body.classList.remove('dark-mode');
        UIElements.themeSwitch.checked = false;
        localStorage.setItem('theme', 'light');
    }
}

// Qurilma temasini tekshirish
function checkDeviceTheme() {
    const savedTheme = localStorage.getItem('theme');
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    
    if (savedTheme === 'dark' || (prefersDark && savedTheme !== 'light')) {
        setTheme('dark');
    } else {
        setTheme('light');
    }
}

// Sahifa yuklanganda ishga tushirish
document.addEventListener('DOMContentLoaded', initApp);
