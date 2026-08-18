// =============================================================
// MindSpout Quiz Client-Side State Engine
// =============================================================

document.addEventListener('DOMContentLoaded', () => {
    const path = window.location.pathname;
    if (path === '/quiz' || path.endsWith('/quiz')) {
        initQuiz();
    } else if (path === '/results' || path.endsWith('/results')) {
        initResults();
    } else {
        initLanding();
    }
});

// -------------------------------------------------------------
// 1. Landing Screen Logic
// -------------------------------------------------------------
function initLanding() {
    const topicInput = document.getElementById('quiz-topic');
    const tags = document.querySelectorAll('.topic-tag');

    tags.forEach(tag => {
        tag.addEventListener('click', () => {
            topicInput.value = tag.getAttribute('data-topic');
            topicInput.focus();
            tag.style.transform = 'scale(0.95)';
            setTimeout(() => tag.style.transform = '', 150);
        });
    });

    const form = document.getElementById('quiz-generation-form');
    if (form) {
        form.addEventListener('submit', async (e) => {
            e.preventDefault();
            const topic = topicInput.value.trim();
            const numQRadio = document.querySelector('input[name="num_questions"]:checked');
            const numQuestions = numQRadio ? parseInt(numQRadio.value) : 5;

            if (!topic) return;

            const overlay = document.getElementById('loading-overlay');
            if (overlay) overlay.classList.remove('hidden');

            try {
                const response = await fetch('/generate_quiz', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ topic, num_questions: numQuestions })
                });

                if (!response.ok) {
                    const errData = await response.json();
                    throw new Error(errData.error || 'Server returned an error');
                }

                const quizData = await response.json();
                sessionStorage.setItem('current_quiz', JSON.stringify(quizData));
                window.location.href = '/quiz';

            } catch (err) {
                console.error(err);
                alert(`Quiz Generation Failed:\n${err.message}`);
                if (overlay) overlay.classList.add('hidden');
            }
        });
    }
}

// -------------------------------------------------------------
// 2. Interactive Quiz Engine
// -------------------------------------------------------------
let currentQuiz = null;
let currentIndex = 0;
let userAnswers = [];
let timerInterval = null;
let secondsElapsed = 0;

function initQuiz() {
    const rawData = sessionStorage.getItem('current_quiz');
    if (!rawData) { window.location.href = '/'; return; }

    currentQuiz = JSON.parse(rawData);
    if (!currentQuiz?.questions?.length) { window.location.href = '/'; return; }

    userAnswers = new Array(currentQuiz.questions.length).fill(null);
    currentIndex = 0;

    // Set header title to quiz topic
    const headerTitle = document.getElementById('quiz-header-title');
    if (headerTitle && currentQuiz.title) headerTitle.textContent = currentQuiz.title;

    startTimer();
    renderQuestion();

    // Clue / Hint button
    document.getElementById('hint-btn').addEventListener('click', () => {
        const q = currentQuiz.questions[currentIndex];
        const clue = q.clue || "Think carefully about the topic before choosing.";
        document.getElementById('clue-text').textContent = clue;
        document.getElementById('clue-overlay').classList.remove('hidden');
    });

    document.getElementById('next-btn').addEventListener('click', () => {
        if (userAnswers[currentIndex] === null) return;
        if (currentIndex < currentQuiz.questions.length - 1) {
            transitionQuestion(() => { currentIndex++; renderQuestion(); });
        } else {
            submitQuiz();
        }
    });

    document.getElementById('prev-btn').addEventListener('click', () => {
        if (currentIndex > 0) {
            transitionQuestion(() => { currentIndex--; renderQuestion(); });
        }
    });
}

function startTimer() {
    secondsElapsed = 0;
    const el = document.getElementById('timer-val');
    timerInterval = setInterval(() => {
        secondsElapsed++;
        const m = Math.floor(secondsElapsed / 60).toString().padStart(2, '0');
        const s = (secondsElapsed % 60).toString().padStart(2, '0');
        if (el) el.textContent = `${m}:${s}`;
    }, 1000);
}

function renderQuestion() {
    const q = currentQuiz.questions[currentIndex];
    const total = currentQuiz.questions.length;

    // "01 Question" style label
    const label = document.getElementById('question-label');
    if (label) label.textContent = String(currentIndex + 1).padStart(2, '0') + ' Question';

    // "1 of 5" counter
    const counter = document.getElementById('question-counter');
    if (counter) counter.textContent = `${currentIndex + 1} of ${total}`;

    // Progress bar — percentage completed so far (not including current)
    const pct = (currentIndex / total) * 100;
    document.getElementById('progress-bar').style.width = `${pct}%`;

    // Remaining badge on lightbulb
    const badge = document.getElementById('remaining-badge');
    if (badge) badge.textContent = total - currentIndex;

    // Question text
    document.getElementById('question-text').textContent = q.question;

    // Options — 2×2 grid
    const letters = ['A', 'B', 'C', 'D', 'E', 'F'];
    const container = document.getElementById('options-container');
    container.innerHTML = '';

    q.options.forEach((opt, idx) => {
        const btn = document.createElement('button');
        btn.className = 'option-btn';
        if (userAnswers[currentIndex] === opt) btn.classList.add('selected');

        btn.innerHTML = `<span class="option-letter">${letters[idx] || idx + 1}.</span><span class="option-text">${opt}</span>`;

        btn.addEventListener('click', () => {
            document.querySelectorAll('.option-btn').forEach(b => b.classList.remove('selected'));
            btn.classList.add('selected');
            userAnswers[currentIndex] = opt;
            document.getElementById('next-btn').removeAttribute('disabled');
            // Micro bounce
            btn.style.transform = 'scale(0.96)';
            setTimeout(() => { btn.style.transform = ''; }, 130);
        });

        container.appendChild(btn);
    });

    // Prev button visibility
    const prevBtn = document.getElementById('prev-btn');
    currentIndex === 0 ? prevBtn.classList.add('hidden') : prevBtn.classList.remove('hidden');

    // Next button label
    const nextBtn = document.getElementById('next-btn');
    nextBtn.innerHTML = currentIndex === total - 1
        ? `Submit <i class="fa-solid fa-circle-check"></i>`
        : `Next <i class="fa-solid fa-chevron-right"></i>`;

    // Lock next if no answer chosen yet
    userAnswers[currentIndex] === null
        ? nextBtn.setAttribute('disabled', 'true')
        : nextBtn.removeAttribute('disabled');
}

function transitionQuestion(cb) {
    const block = document.getElementById('question-block');
    if (!block) { cb(); return; }
    block.classList.add('fade-out');
    setTimeout(() => {
        cb();
        block.classList.remove('fade-out');
        block.classList.add('fade-in');
        setTimeout(() => block.classList.remove('fade-in'), 250);
    }, 180);
}

function submitQuiz() {
    clearInterval(timerInterval);

    let correct = 0;
    const breakdown = currentQuiz.questions.map((q, i) => {
        const isCorrect = userAnswers[i] === q.answer;
        if (isCorrect) correct++;
        return {
            id: q.id,
            question: q.question,
            options: q.options,
            userAnswer: userAnswers[i],
            correctAnswer: q.answer,
            isCorrect,
            explanation: q.explanation
        };
    });

    const total = currentQuiz.questions.length;
    const pct = Math.round((correct / total) * 100);

    sessionStorage.setItem('quiz_results', JSON.stringify({
        title: currentQuiz.title || 'Quiz',
        score: correct,
        totalQuestions: total,
        percentage: pct,
        timeTaken: secondsElapsed,
        breakdown
    }));

    window.location.href = '/results';
}

// -------------------------------------------------------------
// 3. Results Dashboard
// -------------------------------------------------------------
function initResults() {
    const raw = sessionStorage.getItem('quiz_results');
    if (!raw) { window.location.href = '/'; return; }

    const results = JSON.parse(raw);

    // Fraction
    document.getElementById('score-fraction').textContent = `${results.score} / ${results.totalQuestions}`;

    // Animated percentage counter
    animatePercentage(results.percentage);

    // Radial gauge draw
    const bar = document.getElementById('score-svg-bar');
    if (bar) {
        const offset = 502 - (502 * results.percentage / 100);
        setTimeout(() => { bar.style.strokeDashoffset = offset; }, 150);
    }

    // Evaluation label
    const titleEl = document.getElementById('evaluation-title');
    const descEl  = document.getElementById('evaluation-desc');
    let title = 'Keep Practicing!';
    let desc  = 'Every round gets better — review the explanations below!';

    if (results.percentage === 100)      { title = 'Flawless! 🎉';       desc = 'Perfect score! You nailed every single question.'; }
    else if (results.percentage >= 80)   { title = 'Excellent! 🌟';      desc = 'Great work! You have a strong grasp of the topic.'; }
    else if (results.percentage >= 50)   { title = 'Good Job! 👍';       desc = 'Solid effort — you got the essentials right.'; }

    titleEl.textContent = title;
    descEl.textContent  = desc + `  Time taken: ${formatTime(results.timeTaken)}.`;

    // Confetti for high scores
    if (results.percentage >= 80 && typeof confetti === 'function') triggerConfetti();

    // Build review list
    const container = document.getElementById('review-container');
    container.innerHTML = '';

    results.breakdown.forEach((item, idx) => {
        const div = document.createElement('div');
        div.className = `review-item ${item.isCorrect ? 'is-correct' : 'is-incorrect'}`;

        let answerHtml = item.isCorrect
            ? `<div class="review-answer-block user-choice-correct">
                   <strong><i class="fa-solid fa-circle-check"></i> Correct:</strong> ${item.userAnswer}
               </div>`
            : `<div class="review-answer-block user-choice-incorrect">
                   <strong><i class="fa-solid fa-circle-xmark"></i> Your answer:</strong> ${item.userAnswer || 'None'}
               </div>
               <div class="review-answer-block correct-choice">
                   <strong><i class="fa-solid fa-circle-check"></i> Correct:</strong> ${item.correctAnswer}
               </div>`;

        div.innerHTML = `
            <div class="review-question-header">
                <span class="review-question-num">Question ${idx + 1}</span>
                <span class="review-status-badge ${item.isCorrect ? 'correct-badge' : 'incorrect-badge'}">
                    ${item.isCorrect ? '<i class="fa-solid fa-check"></i> Correct' : '<i class="fa-solid fa-xmark"></i> Incorrect'}
                </span>
            </div>
            <h3 class="review-question-text">${item.question}</h3>
            <div class="review-answers-grid">${answerHtml}</div>
            <div class="explanation-box">
                <div class="explanation-heading"><i class="fa-solid fa-circle-info"></i> Explanation</div>
                <p>${item.explanation}</p>
            </div>
        `;
        container.appendChild(div);
    });

    document.getElementById('restart-btn')?.addEventListener('click', () => {
        sessionStorage.removeItem('current_quiz');
        sessionStorage.removeItem('quiz_results');
        window.location.href = '/';
    });
}

// -------------------------------------------------------------
// Helpers
// -------------------------------------------------------------
function animatePercentage(target) {
    const el = document.getElementById('score-percentage');
    if (!el) return;
    let cur = 0;
    if (target === 0) { el.textContent = '0%'; return; }
    const step = Math.max(Math.floor(1500 / target), 12);
    const t = setInterval(() => {
        cur++;
        el.textContent = `${cur}%`;
        if (cur >= target) clearInterval(t);
    }, step);
}

function formatTime(s) {
    const m = Math.floor(s / 60).toString().padStart(2, '0');
    const sec = (s % 60).toString().padStart(2, '0');
    return `${m}:${sec}`;
}

function triggerConfetti() {
    const end = Date.now() + 3500;
    (function burst() {
        confetti({ particleCount: 5, angle: 60,  spread: 55, origin: { x: 0, y: 0.8 }, colors: ['#ffd73a', '#ffffff', '#84c4ff'] });
        confetti({ particleCount: 5, angle: 120, spread: 55, origin: { x: 1, y: 0.8 }, colors: ['#ffd73a', '#ffffff', '#84c4ff'] });
        if (Date.now() < end) requestAnimationFrame(burst);
    })();
}

// Global: called by onclick attribute in quiz.html
function closeClue() {
    const overlay = document.getElementById('clue-overlay');
    if (overlay) overlay.classList.add('hidden');
}
