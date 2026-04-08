// Global Configuration
let currentUser = "";
let isAdmin = false;
let currentTopic = "";
let totalTestsPlayed = 0;
let questionsData = [];
let currentQuestionIndex = 0;
let correctAnswers = 0;
let mistakeMade = false;

// Time and Speed tracking (Easter Egg)
let lastAnswerTime = 0;
let fastStreak = 0;

// Rentgen Database Simulation (Overall Progress)
let rentgenData = {
    musiqa_nazariyasi: { total: 0, correct: 0 },
    cholgu_ijrochiligi: { total: 0, correct: 0 },
    vokal_ijrochiligi: { total: 0, correct: 0 },
    metodika_repertuar: { total: 0, correct: 0 }
};

// DOM Elements
const elements = {
    timeGreeting: document.getElementById('timeGreeting'),
    userNameDisplay: document.getElementById('userNameDisplay'),
    themeToggle: document.getElementById('themeToggle'),
    comfortToggle: document.getElementById('comfortToggle'),
    studentNameInput: document.getElementById('studentNameInput'),
    startPlatformBtn: document.getElementById('startPlatformBtn'),
    authSection: document.getElementById('authSection'),
    dashboardSection: document.getElementById('dashboardSection'),
    quizSection: document.getElementById('quizSection'),
    resultSection: document.getElementById('resultSection'),
    optionsContainer: document.getElementById('optionsContainer'),
    questionText: document.getElementById('questionText'),
    progressText: document.getElementById('progressText'),
    restartQuickBtn: document.getElementById('restartQuickBtn'),
    donateModal: document.getElementById('donateModal'),
    closeDonateBtn: document.getElementById('closeDonateBtn'),
    certificateModal: document.getElementById('certificateModal'),
    closeCertBtn: document.getElementById('closeCertBtn'),
    downloadCertBtn: document.getElementById('downloadCertBtn'),
    hackerBadge: document.getElementById('hackerBadge')
};

// --- Magic Bonus 1: Time Greeting ---
function updateGreeting() {
    const hour = new Date().getHours();
    let greeting = 'Xayrli kech';
    if (hour >= 5 && hour < 12) greeting = 'Xayrli tong';
    else if (hour >= 12 && hour < 18) greeting = 'Xayrli kun';
    elements.timeGreeting.innerText = greeting;
}
updateGreeting();

// --- Theme & Comfort Eye Logic ---
elements.themeToggle.addEventListener('click', () => {
    document.body.classList.toggle('theme-light');
    document.body.classList.toggle('theme-dark');
    elements.themeToggle.innerText = document.body.classList.contains('theme-light') ? '🌙' : '☀️';
});

let isComfortEye = false;
elements.comfortToggle.addEventListener('click', () => {
    isComfortEye = !isComfortEye;
    document.body.classList.toggle('comfort-eye-active', isComfortEye);
    // Closed eye emoji when inactive, open when active
    elements.comfortToggle.innerText = isComfortEye ? '👁️‍🗨️' : '👁️'; 
});

// --- Auth & Admin Check ---
elements.startPlatformBtn.addEventListener('click', () => {
    const name = elements.studentNameInput.value.trim();
    if (name === "") {
        alert("Iltimos, ismingizni kiriting!");
        return;
    }
    
    currentUser = name;
    elements.userNameDisplay.innerText = currentUser;
    
    // Easter Egg: Admin Mode
    if (name.toLowerCase() === "adham") {
        isAdmin = true;
        alert("Assalomu alaykum, Admin (Creator)!");
    } else {
        isAdmin = false;
    }

    switchSection(elements.dashboardSection);
});

// --- Navigation ---
function switchSection(targetSection) {
    [elements.authSection, elements.dashboardSection, elements.quizSection, elements.resultSection].forEach(sec => {
        sec.classList.remove('active-section');
        sec.classList.add('hidden-section');
    });
    targetSection.classList.remove('hidden-section');
    targetSection.classList.add('active-section');
}

// --- Topic Selection ---
document.querySelectorAll('.topic-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
        currentTopic = e.target.getAttribute('data-topic');
        document.getElementById('currentTopicTitle').innerText = e.target.innerText;
        startQuizMode();
    });
});

// --- Quiz Logic ---
function startQuizMode() {
    // Generate mock questions to simulate DB load
    questionsData = generateMockQuestions(); 
    currentQuestionIndex = 0;
    correctAnswers = 0;
    mistakeMade = false;
    elements.restartQuickBtn.classList.add('hidden');
    lastAnswerTime = Date.now();
    fastStreak = 0;
    
    switchSection(elements.quizSection);
    renderQuestion();
}

function renderQuestion() {
    if (currentQuestionIndex >= questionsData.length) {
        finishQuiz();
        return;
    }

    const q = questionsData[currentQuestionIndex];
    elements.questionText.innerText = q.question;
    elements.progressText.innerText = `${currentQuestionIndex + 1}/${questionsData.length}`;
    elements.optionsContainer.innerHTML = '';

    q.options.forEach((opt, idx) => {
        const btn = document.createElement('button');
        btn.className = 'option-btn';
        btn.innerText = opt;
        
        // Admin Cheat: Highlight correct answer
        if (isAdmin && idx === q.correctIndex) {
            btn.classList.add('correct-admin');
        }

        btn.addEventListener('click', () => handleAnswer(idx === q.correctIndex));
        elements.optionsContainer.appendChild(btn);
    });
}

function handleAnswer(isCorrect) {
    const now = Date.now();
    const timeTaken = (now - lastAnswerTime) / 1000;
    lastAnswerTime = now;

    // Easter Egg: Hacker Badge (1 sec per answer, 10 streak)
    if (timeTaken <= 1) {
        fastStreak++;
        if (fastStreak === 10) showHackerBadge();
    } else {
        fastStreak = 0;
    }

    // Rentgen Data Collection
    rentgenData[currentTopic].total++;

    if (isCorrect) {
        correctAnswers++;
        rentgenData[currentTopic].correct++;
    } else {
        mistakeMade = true;
        elements.restartQuickBtn.classList.remove('hidden');
    }

    currentQuestionIndex++;
    renderQuestion();
}

elements.restartQuickBtn.addEventListener('click', () => {
    if(confirm("Testni boshidan boshlashga ruxsat so'raysizmi?")) {
        startQuizMode();
    }
});

// --- Results & Rentgen ---
function finishQuiz() {
    totalTestsPlayed++;
    const percentage = Math.round((correctAnswers / questionsData.length) * 100);
    document.getElementById('mainScore').innerText = `${percentage}%`;
    
    buildRentgenChart();

    // Check for Certificate (>= 90%)
    if (percentage >= 90) {
        document.getElementById('certTriggerBtn').classList.remove('hidden');
        populateCertificateData(percentage);
    } else {
        document.getElementById('certTriggerBtn').classList.add('hidden');
    }

    switchSection(elements.resultSection);

    // Donate Modal Check
    if (totalTestsPlayed % 3 === 0) {
        elements.donateModal.classList.remove('hidden');
    }
}

function buildRentgenChart() {
    const container = document.getElementById('rentgenStats');
    container.innerHTML = '';
    
    for (const [key, data] of Object.entries(rentgenData)) {
        if (data.total === 0) continue;
        const percent = Math.round((data.correct / data.total) * 100);
        
        let feedback = "O'rtacha";
        if (percent >= 90) feedback = "Ajoyib!";
        else if (percent <= 50) feedback = "Shu fandan ko'proq o'qishingiz kerak";

        const titleText = key.replace('_', ' ').toUpperCase();
        
        container.innerHTML += `
            <div class="rentgen-item">
                <div class="rentgen-title">
                    <span>${titleText}</span>
                    <span>${percent}% (${feedback})</span>
                </div>
                <div class="trading-bar-bg">
                    <div class="trading-bar-fill" style="width: ${percent}%;"></div>
                </div>
            </div>
        `;
    }
}

// --- Premium Certificate Logic ---
function populateCertificateData(score) {
    document.getElementById('certStudentName').innerText = currentUser;
    document.getElementById('certMode').innerText = document.getElementById('currentTopicTitle').innerText;
    document.getElementById('certScore').innerText = `${score}%`;
    
    const today = new Date();
    document.getElementById('certDate').innerText = `${today.getDate()}.${today.getMonth()+1}.${today.getFullYear()}`;
    
    // Total calculation simulation based on 785
    const totalAchieved = Math.floor(Math.random() * 200) + 104; 
    document.getElementById('certTotal').innerText = `${totalAchieved}/785`;
}

document.getElementById('certTriggerBtn').addEventListener('click', () => {
    elements.certificateModal.classList.remove('hidden');
});

elements.closeCertBtn.addEventListener('click', () => {
    elements.certificateModal.classList.add('hidden');
});

elements.downloadCertBtn.addEventListener('click', () => {
    alert("Yuklab olish jarayoni boshlandi... (Canvas/HTML2Canvas ulanadi)");
});

// --- Donate Modal ---
elements.closeDonateBtn.addEventListener('click', () => {
    elements.donateModal.classList.add('hidden');
});

// --- System Utilities & Easter Eggs ---
function showHackerBadge() {
    elements.hackerBadge.classList.remove('hidden');
    setTimeout(() => {
        elements.hackerBadge.classList.add('hidden');
    }, 3000);
}

document.getElementById('homeBtn').addEventListener('click', () => {
    switchSection(elements.dashboardSection);
});

// Mock Data Generator
function generateMockQuestions() {
    let arr = [];
    for(let i=0; i<10; i++) { // Demo uchun 10 ta savol
        arr.push({
            question: `Test savoli №${i+1}: Bu yerda ma'lumot joylashadi?`,
            options: ["A variant", "B variant", "C variant", "D variant"],
            correctIndex: Math.floor(Math.random() * 4)
        });
    }
    return arr;
}

// v7.5 Admin Block (Anti-Cheat Skeleton)
document.addEventListener('contextmenu', event => event.preventDefault());
