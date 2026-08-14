// =============================================================
// MindSpout Quiz Client-Side State Engine
// =============================================================

// Paths mapping on load
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
    const tags = document.querySelectorAll('.topic-tag');
    const topicInput = document.getElementById('quiz-topic');
    if (topicInput) {
        tags.forEach(tag => {
            tag.addEventListener('click', () => {
                topicInput.value = tag.getAttribute('data-topic');
                topicInput.focus();
                // Play animation pulse on tag click
                tag.style.transform = 'scale(0.95)';
                setTimeout(() => tag.style.transform = '', 150);
            });
        });
    }

    const form = document.getElementById('quiz-generation-form');
    if (form) {
        form.addEventListener('submit', async (e) => {
            e.preventDefault();
            const topic = topicInput.value.trim();
            const questionCountRadio = document.querySelector('input[name="num_questions"]:checked');
            const numQuestions = questionCountRadio ? parseInt(questionCountRadio.value) : 5;

            // Show Custom Loader Overlay
            const overlay = document.getElementById('loading-overlay');
            if (overlay) overlay.classList.remove('hidden');

            try {
                const response = await fetch('/generate_quiz', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({ topic, num_questions: numQuestions })
                });

                if (!response.ok) {
                    const errData = await response.json();
                    throw new Error(errData.error || 'Server returned error status');
                }

                const quizData = await response.json();
                
                // Save JSON object in Session storage for access
                sessionStorage.setItem('current_quiz', JSON.stringify(quizData));
                
                // Navigate to quiz route
                window.location.href = '/quiz';
            } catch (err) {
                console.error(err);
                alert(`Quiz Generation Failed: ${err.message}`);
                if (overlay) overlay.classList.add('hidden');
            }
        });
    }
}

// -------------------------------------------------------------
// 2. Interactive Quiz Engine State
// -------------------------------------------------------------
let currentQuiz = null;
let currentQuestionIndex = 0;
let userAnswers = [];
let timerInterval = null;
let secondsElapsed = 0;

function initQuiz() {
    const rawData = sessionStorage.getItem('current_quiz');
    if (!rawData) {
        window.location.href = '/';
        return;
    }
    
    currentQuiz = JSON.parse(rawData);
    if (!currentQuiz || !currentQuiz.questions || currentQuiz.questions.length === 0) {
        window.location.href = '/';
        return;
    }

    // Dynamic Title Header update
    const headerTitle = document.getElementById('quiz-header-title');
    if (headerTitle && currentQuiz.title) {
        headerTitle.innerHTML = `Mind<span>Spout</span> <span style="font-size: 0.95rem; font-weight: 500; font-family: var(--font-primary); padding: 0.25rem 0.75rem; background: rgba(255,255,255,0.06); border-radius: 20px; margin-left: 0.75rem; border: 1px solid rgba(255,255,255,0.03); color: var(--color-secondary);">${currentQuiz.title}</span>`;
    }

    // Initialize answer arrays
    userAnswers = new Array(currentQuiz.questions.length).fill(null);
    currentQuestionIndex = 0;
    
    startTimer();
    renderQuestion();

    // Event Bindings
    const nextBtn = document.getElementById('next-btn');
    const prevBtn = document.getElementById('prev-btn');

    nextBtn.addEventListener('click', () => {
        if (userAnswers[currentQuestionIndex] === null) return;

        if (currentQuestionIndex < currentQuiz.questions.length - 1) {
            transitionQuestion(() => {
                currentQuestionIndex++;
                renderQuestion();
            });
        } else {
            submitQuiz();
        }
    });

    prevBtn.addEventListener('click', () => {
        if (currentQuestionIndex > 0) {
            transitionQuestion(() => {
                currentQuestionIndex--;
                renderQuestion();
            });
        }
    });
}

function startTimer() {
    secondsElapsed = 0;
    const timerVal = document.getElementById('timer-val');
    timerInterval = setInterval(() => {
        secondsElapsed++;
        const mins = Math.floor(secondsElapsed / 60).toString().padStart(2, '0');
        const secs = (secondsElapsed % 60).toString().padStart(2, '0');
        if (timerVal) timerVal.textContent = `${mins}:${secs}`;
    }, 1000);
}

function renderQuestion() {
    const q = currentQuiz.questions[currentQuestionIndex];
    const total = currentQuiz.questions.length;

    // Counter update
    document.getElementById('question-counter').textContent = `Question ${currentQuestionIndex + 1} of ${total}`;
    
    // Progress Bar width percentage
    const pct = ((currentQuestionIndex) / total) * 100;
    document.getElementById('progress-bar').style.width = `${pct}%`;

    // Question
    const qText = document.getElementById('question-text');
    qText.textContent = q.question;

    // Options mapping structure
    const optionsContainer = document.getElementById('options-container');
    optionsContainer.innerHTML = '';

    q.options.forEach((opt, idx) => {
        const btn = document.createElement('button');
        btn.className = 'option-btn';
        if (userAnswers[currentQuestionIndex] === opt) {
            btn.classList.add('selected');
        }

        const letters = ['A', 'B', 'C', 'D', 'E', 'F'];
        const badge = document.createElement('span');
        badge.className = 'option-badge';
        badge.textContent = letters[idx] || (idx + 1);

        const text = document.createElement('span');
        text.className = 'option-text';
        text.textContent = opt;

        btn.appendChild(badge);
        btn.appendChild(text);

        btn.addEventListener('click', () => {
            // Uncheck other options
            document.querySelectorAll('.option-btn').forEach(b => b.classList.remove('selected'));
            
            // Check active option
            btn.classList.add('selected');
            userAnswers[currentQuestionIndex] = opt;
            
            // Unlock standard controls
            document.getElementById('next-btn').removeAttribute('disabled');
            
            // Micro Interaction Bounce
            playClickFeedback(btn);
        });

        optionsContainer.appendChild(btn);
    });

    // Control rendering
    const prevBtn = document.getElementById('prev-btn');
    if (currentQuestionIndex === 0) {
        prevBtn.classList.add('hidden');
    } else {
        prevBtn.classList.remove('hidden');
    }

    const nextBtn = document.getElementById('next-btn');
    if (currentQuestionIndex === total - 1) {
        nextBtn.innerHTML = `Submit Quiz <i class="fa-solid fa-circle-check"></i>`;
    } else {
        nextBtn.innerHTML = `Next Question <i class="fa-solid fa-arrow-right"></i>`;
    }

    // Toggle Disabled state depending on choice presence
    if (userAnswers[currentQuestionIndex] === null) {
        nextBtn.setAttribute('disabled', 'true');
    } else {
        nextBtn.removeAttribute('disabled');
    }
}

function playClickFeedback(btn) {
    btn.style.transform = 'scale(0.97) translateX(4px)';
    setTimeout(() => {
        btn.style.transform = 'translateX(4px)';
    }, 150);
}

function transitionQuestion(updateCallback) {
    const block = document.getElementById('question-block');
    if (block) {
        block.classList.add('fade-out');
        setTimeout(() => {
            updateCallback();
            block.classList.remove('fade-out');
            block.classList.add('fade-in');
            setTimeout(() => {
                block.classList.remove('fade-in');
            }, 300);
        }, 200);
    } else {
        updateCallback();
    }
}

function submitQuiz() {
    clearInterval(timerInterval);
    
    // Compute stats
    let correctCount = 0;
    const finalBreakdown = currentQuiz.questions.map((q, idx) => {
        const userChoice = userAnswers[idx];
        const isCorrect = (userChoice === q.answer);
        if (isCorrect) correctCount++;
        
        return {
            id: q.id,
            question: q.question,
            options: q.options,
            userAnswer: userChoice,
            correctAnswer: q.answer,
            isCorrect: isCorrect,
            explanation: q.explanation
        };
    });

    const total = currentQuiz.questions.length;
    const pctScore = Math.round((correctCount / total) * 100);

    const scorecard = {
        title: currentQuiz.title || 'Custom Quiz Topic',
        score: correctCount,
        totalQuestions: total,
        percentage: pctScore,
        timeTaken: secondsElapsed,
        breakdown: finalBreakdown
    };

    // Stashing results structure
    sessionStorage.setItem('quiz_results', JSON.stringify(scorecard));
    
    const cardEl = document.getElementById('quiz-card-box');
    if (cardEl) {
        cardEl.classList.add('fade-out');
        setTimeout(() => {
            window.location.href = '/results';
        }, 300);
    } else {
        window.location.href = '/results';
    }
}

// -------------------------------------------------------------
// 3. Results Dashboard
// -------------------------------------------------------------
function initResults() {
    const rawResults = sessionStorage.getItem('quiz_results');
    if (!rawResults) {
        window.location.href = '/';
        return;
    }

    const results = JSON.parse(rawResults);
    
    // Populate counts and run count-up percentages
    document.getElementById('score-fraction').textContent = `${results.score} / ${results.totalQuestions}`;
    animatePercentage(results.percentage);

    // Apply Radial gauge stroke offset draw
    const scoreSvgBar = document.getElementById('score-svg-bar');
    if (scoreSvgBar) {
        const offset = 502 - (502 * (results.percentage / 100));
        setTimeout(() => {
            scoreSvgBar.style.strokeDashoffset = offset;
        }, 150);
    }

    // Set evaluation words
    const titleEl = document.getElementById('evaluation-title');
    const descEl = document.getElementById('evaluation-desc');

    let titleText = "Keep Practicing!";
    let descText = "Every round gets better. Read the breakdowns below to level up.";
    
    if (results.percentage === 100) {
        titleText = "Flawless Performance!";
        descText = "Perfect Score! You demonstrated absolute mastery of this subject.";
    } else if (results.percentage >= 80) {
        titleText = "Excellent Achievement!";
        descText = "Awesome! You have a highly comprehensive understanding of the topic.";
    } else if (results.percentage >= 50) {
        titleText = "Good Job!";
        descText = "Nice effort. You understand the most essential concepts.";
    }

    titleEl.textContent = titleText;
    descEl.textContent = descText + ` Time taken: ${formatTime(results.timeTaken)}.`;

    // High Score confetti trigger (>= 80%)
    if (results.percentage >= 80 && typeof confetti === 'function') {
        triggerConfettiShower();
    }

    // Render Review cards list
    const container = document.getElementById('review-container');
    container.innerHTML = '';

    results.breakdown.forEach((item, index) => {
        const reviewItem = document.createElement('div');
        reviewItem.className = `review-item ${item.isCorrect ? 'is-correct' : 'is-incorrect'}`;
        
        let answerBlocksHtml = '';
        if (item.isCorrect) {
            answerBlocksHtml = `
                <div class="review-answer-block user-choice-correct">
                    <strong><i class="fa-solid fa-circle-check"></i> Selected Correctly:</strong> ${item.userAnswer}
                </div>
            `;
        } else {
            answerBlocksHtml = `
                <div class="review-answer-block user-choice-incorrect">
                    <strong><i class="fa-solid fa-circle-xmark"></i> Your Answer:</strong> ${item.userAnswer || 'No Option Selected'}
                </div>
                <div class="review-answer-block correct-choice">
                    <strong><i class="fa-solid fa-circle-check"></i> Correct Answer:</strong> ${item.correctAnswer}
                </div>
            `;
        }

        reviewItem.innerHTML = `
            <div class="review-question-header">
                <span class="review-question-num">Question ${index + 1}</span>
                <span class="review-status-badge ${item.isCorrect ? 'correct-badge' : 'incorrect-badge'}">
                    ${item.isCorrect ? '<i class="fa-solid fa-check"></i> Correct' : '<i class="fa-solid fa-xmark"></i> Incorrect'}
                </span>
            </div>
            <h3 class="review-question-text">${item.question}</h3>
            <div class="review-answers-grid">
                ${answerBlocksHtml}
            </div>
            <div class="explanation-box">
                <div class="explanation-heading"><i class="fa-solid fa-circle-info"></i> Details & Explanation</div>
                <p>${item.explanation}</p>
            </div>
        `;

        container.appendChild(reviewItem);
    });

    // Populate logo-text Header
    const headerTitle = document.querySelector('.logo-text');
    if (headerTitle && results.title) {
        headerTitle.innerHTML = `Mind<span>Spout</span> <span style="font-size: 0.95rem; font-weight: 500; font-family: var(--font-primary); padding: 0.25rem 0.75rem; background: rgba(255,255,255,0.06); border-radius: 20px; margin-left: 0.75rem; border: 1px solid rgba(255,255,255,0.03); color: var(--color-secondary);">${results.title}</span>`;
    }

    // Reload / Restart button clean states
    const restartBtn = document.getElementById('restart-btn');
    if (restartBtn) {
        restartBtn.addEventListener('click', () => {
            sessionStorage.removeItem('current_quiz');
            sessionStorage.removeItem('quiz_results');
            window.location.href = '/';
        });
    }
}

// -------------------------------------------------------------
// Helper Animations
// -------------------------------------------------------------
function animatePercentage(targetPct) {
    const pctEl = document.getElementById('score-percentage');
    let current = 0;
    if (targetPct === 0) {
        pctEl.textContent = '0%';
        return;
    }
    const duration = 1500;
    const stepTime = Math.max(Math.floor(duration / targetPct), 15);
    const timer = setInterval(() => {
        current++;
        pctEl.textContent = `${current}%`;
        if (current >= targetPct) {
            clearInterval(timer);
        }
    }, stepTime);
}

function formatTime(secs) {
    const m = Math.floor(secs / 60).toString().padStart(2, '0');
    const s = (secs % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
}

function triggerConfettiShower() {
    const duration = 3.5 * 1000;
    const end = Date.now() + duration;

    (function frame() {
        confetti({
            particleCount: 4,
            angle: 60,
            spread: 60,
            origin: { x: 0, y: 0.8 },
            colors: ['#a855f7', '#06b6d4', '#4f46e5']
        });
        confetti({
            particleCount: 4,
            angle: 120,
            spread: 60,
            origin: { x: 1, y: 0.8 },
            colors: ['#a855f7', '#06b6d4', '#4f46e5']
        });

        if (Date.now() < end) {
            requestAnimationFrame(frame);
        }
    }());
}
