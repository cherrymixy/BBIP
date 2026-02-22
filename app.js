/**
 * 삡-플랜: 자연어 기반 일정 관리 웹앱
 * Main Application JavaScript
 */

const API_BASE = 'http://localhost:3000/api';

class PlanApp {
    constructor() {
        this.elements = {
            // Header
            headerDate: document.getElementById('headerDate'),
            headerDay: document.getElementById('headerDay'),

            // Greeting
            greetEmoji: document.getElementById('greetEmoji'),
            greetName: document.getElementById('greetName'),
            planSummary: document.getElementById('planSummary'),

            // Progress
            progressRing: document.getElementById('progressRing'),
            progressPercent: document.getElementById('progressPercent'),
            completedCount: document.getElementById('completedCount'),
            remainingCount: document.getElementById('remainingCount'),

            // Schedule
            scheduleEmpty: document.getElementById('scheduleEmpty'),
            scheduleList: document.getElementById('scheduleList'),

            // Modal
            planModal: document.getElementById('planModal'),
            planTextDisplay: document.getElementById('planTextDisplay'),

            // Voice
            voiceOverlay: document.getElementById('voiceOverlay'),

            // Sidebar
            sidebar: document.querySelector('.sidebar'),
            mobileMenuBtn: document.getElementById('mobileMenuBtn'),
            mobileOverlay: document.getElementById('mobileOverlay'),

            // User
            userName: document.getElementById('userName'),
            userEmoji: document.getElementById('userEmoji'),
        };

        this.plans = [];
        this.recognition = null;

        this.init();
    }

    async init() {
        this.updateDateTime();
        this.setupEventListeners();
        this.setupSpeechRecognition();
        this.addProgressGradient();

        // Load data from API
        await this.loadUserInfo();
        await this.loadPlans();

        // Update time every minute
        setInterval(() => this.updateDateTime(), 60000);
    }

    addProgressGradient() {
        const svg = document.querySelector('.progress-ring');
        if (!svg) return;

        const defs = document.createElementNS('http://www.w3.org/2000/svg', 'defs');
        const gradient = document.createElementNS('http://www.w3.org/2000/svg', 'linearGradient');
        gradient.setAttribute('id', 'progressGradient');
        gradient.setAttribute('x1', '0%');
        gradient.setAttribute('y1', '0%');
        gradient.setAttribute('x2', '100%');
        gradient.setAttribute('y2', '0%');

        const stop1 = document.createElementNS('http://www.w3.org/2000/svg', 'stop');
        stop1.setAttribute('offset', '0%');
        stop1.setAttribute('stop-color', '#ff6b5b');

        const stop2 = document.createElementNS('http://www.w3.org/2000/svg', 'stop');
        stop2.setAttribute('offset', '100%');
        stop2.setAttribute('stop-color', '#ffaa6b');

        gradient.appendChild(stop1);
        gradient.appendChild(stop2);
        defs.appendChild(gradient);
        svg.insertBefore(defs, svg.firstChild);

        this.elements.progressRing.style.stroke = 'url(#progressGradient)';
    }

    updateDateTime() {
        const now = new Date();
        const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
            'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
        const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday',
            'Thursday', 'Friday', 'Saturday'];

        const month = months[now.getMonth()];
        const date = now.getDate().toString().padStart(2, '0');
        const day = days[now.getDay()];

        this.elements.headerDate.textContent = `${month} ${date}.`;
        this.elements.headerDay.textContent = day;

        // Update greeting based on time
        const hour = now.getHours();
        let timeGreeting = '좋은 하루입니다';
        if (hour < 12) timeGreeting = '좋은 아침입니다';
        else if (hour < 18) timeGreeting = '좋은 오후입니다';
        else timeGreeting = '좋은 저녁입니다';

        const greetHello = document.querySelector('.greeting-hello');
        if (greetHello) {
            const emoji = this.elements.greetEmoji.textContent;
            const name = this.elements.greetName.textContent;
            greetHello.innerHTML = `${timeGreeting}, <span class="emoji">${this.escapeHtml(emoji)}</span> <strong>${this.escapeHtml(name)}</strong> 님`;
        }
    }

    setupEventListeners() {
        // Open plan modal
        document.getElementById('openPlanInput').addEventListener('click', () => this.openModal());
        const emptyAddBtn = document.getElementById('emptyAddBtn');
        if (emptyAddBtn) emptyAddBtn.addEventListener('click', () => this.openModal());

        // Close plan modal
        document.getElementById('closePlanModal').addEventListener('click', () => this.closeModal());
        this.elements.planModal.addEventListener('click', (e) => {
            if (e.target === this.elements.planModal) this.closeModal();
        });

        // Complete plan
        document.getElementById('completePlanBtn').addEventListener('click', () => this.completePlan());

        // Voice input
        document.getElementById('voiceInputBtn').addEventListener('click', () => this.startVoiceInput());
        document.getElementById('voiceStopBtn').addEventListener('click', () => this.stopVoiceInput());

        // Text input button
        document.getElementById('textInputBtn').addEventListener('click', () => {
            document.querySelectorAll('.method-btn').forEach(b => b.classList.remove('active'));
            document.getElementById('textInputBtn').classList.add('active');
            this.elements.planTextDisplay.focus();
        });

        // Mobile menu
        this.elements.mobileMenuBtn.addEventListener('click', () => this.toggleSidebar());
        this.elements.mobileOverlay.addEventListener('click', () => this.closeSidebar());

        // Sidebar nav
        document.querySelectorAll('.sidebar-nav .nav-item').forEach(btn => {
            btn.addEventListener('click', () => {
                document.querySelectorAll('.sidebar-nav .nav-item').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                this.closeSidebar();
            });
        });

        // Keyboard shortcut
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                this.closeModal();
                this.closeSidebar();
            }
        });
    }

    // ===== Sidebar =====
    toggleSidebar() {
        this.elements.sidebar.classList.toggle('open');
        this.elements.mobileOverlay.classList.toggle('active');
        if (this.elements.mobileOverlay.classList.contains('active')) {
            this.elements.mobileOverlay.style.display = 'block';
        }
    }

    closeSidebar() {
        this.elements.sidebar.classList.remove('open');
        this.elements.mobileOverlay.classList.remove('active');
        setTimeout(() => {
            if (!this.elements.mobileOverlay.classList.contains('active')) {
                this.elements.mobileOverlay.style.display = '';
            }
        }, 300);
    }

    // ===== Modal =====
    openModal() {
        this.elements.planModal.classList.add('active');
        document.body.style.overflow = 'hidden';
        setTimeout(() => this.elements.planTextDisplay.focus(), 300);
    }

    closeModal() {
        this.elements.planModal.classList.remove('active');
        document.body.style.overflow = '';
    }

    // ===== API =====
    async loadUserInfo() {
        try {
            const res = await fetch(`${API_BASE}/user`);
            const data = await res.json();
            if (data.success && data.data) {
                this.elements.userName.textContent = data.data.name;
                this.elements.userEmoji.textContent = data.data.emoji || '🐔';
                this.elements.greetName.textContent = data.data.name;
                this.elements.greetEmoji.textContent = data.data.emoji || '🐔';
            }
        } catch (err) {
            console.log('User API not available, using defaults');
        }
    }

    async loadPlans() {
        const today = new Date().toISOString().split('T')[0];
        try {
            const res = await fetch(`${API_BASE}/plans?date=${today}`);
            const data = await res.json();
            if (data.success) {
                this.plans = data.data;
            }
        } catch (err) {
            console.log('Plans API not available, using local data');
            this.plans = this.loadLocalPlans();
        }

        // Fall back to sample tasks if empty
        if (this.plans.length === 0) {
            this.plans = this.getSampleTasks();
        }

        this.renderSchedule();
        this.updateProgress();
    }

    async completePlan() {
        const planText = this.elements.planTextDisplay.textContent.trim();

        if (!planText) {
            this.elements.planTextDisplay.focus();
            return;
        }

        const tasks = this.parsePlanText(planText);

        try {
            const res = await fetch(`${API_BASE}/plans/bulk`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ plans: tasks })
            });
            const data = await res.json();
            if (data.success) {
                this.plans = [...this.plans, ...data.data];
            }
        } catch (err) {
            console.log('API not available, saving locally');
            const localTasks = tasks.map((t, i) => ({ id: Date.now() + i, ...t, completed: false }));
            this.plans = [...this.plans, ...localTasks];
            this.saveLocalPlans();
        }

        this.elements.planTextDisplay.textContent = '';
        this.closeModal();
        this.renderSchedule();
        this.updateProgress();
        this.updateGreetingSummary();
    }

    async toggleTaskCompletion(id) {
        const task = this.plans.find(p => (p.id || '').toString() === id.toString());
        if (!task) return;

        task.completed = !task.completed;

        try {
            await fetch(`${API_BASE}/plans/${id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ completed: task.completed })
            });
        } catch (err) {
            console.log('API not available, saving locally');
            this.saveLocalPlans();
        }

        this.renderSchedule();
        this.updateProgress();
    }

    // ===== Rendering =====
    renderSchedule() {
        if (this.plans.length === 0) {
            this.elements.scheduleEmpty.style.display = 'flex';
            this.elements.scheduleList.style.display = 'none';
            return;
        }

        this.elements.scheduleEmpty.style.display = 'none';
        this.elements.scheduleList.style.display = 'grid';

        const sorted = [...this.plans].sort((a, b) => (a.time || '').localeCompare(b.time || ''));

        this.elements.scheduleList.innerHTML = sorted.map(task => `
            <div class="schedule-item${task.completed ? ' completed' : ''}" data-id="${task.id}">
                <div class="item-content">
                    <div class="schedule-item-time">${this.escapeHtml(task.time || '')}</div>
                    <div class="schedule-item-title">${this.escapeHtml(task.title)}</div>
                </div>
                <button class="check-btn${task.completed ? ' checked' : ''}">
                    <span class="check-icon">
                        <svg viewBox="0 0 24 24"><polyline points="20 6 9 17 4 12"></polyline></svg>
                    </span>
                </button>
            </div>
        `).join('');

        this.elements.scheduleList.querySelectorAll('.check-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const item = btn.closest('.schedule-item');
                const id = item.dataset.id;
                this.toggleTaskCompletion(id);
            });
        });
    }

    updateProgress() {
        const total = this.plans.length;
        const completed = this.plans.filter(p => p.completed).length;
        const remaining = total - completed;
        const percent = total > 0 ? Math.round((completed / total) * 100) : 0;

        // Animate progress ring
        const circumference = 2 * Math.PI * 52; // r=52
        const offset = circumference - (percent / 100) * circumference;
        this.elements.progressRing.style.strokeDashoffset = offset;

        // Animate number
        this.animateNumber(this.elements.progressPercent, percent);
        this.elements.completedCount.textContent = completed;
        this.elements.remainingCount.textContent = remaining;
    }

    animateNumber(element, target) {
        const current = parseInt(element.textContent) || 0;
        const diff = target - current;
        const duration = 600;
        const start = performance.now();

        const animate = (now) => {
            const elapsed = now - start;
            const progress = Math.min(elapsed / duration, 1);
            const eased = 1 - Math.pow(1 - progress, 3); // ease-out cubic
            element.textContent = Math.round(current + diff * eased);
            if (progress < 1) requestAnimationFrame(animate);
        };

        requestAnimationFrame(animate);
    }

    updateGreetingSummary() {
        const incomplete = this.plans.filter(p => !p.completed);
        if (incomplete.length === 0) {
            this.elements.planSummary.innerHTML = '오늘의 모든 계획을 완료했습니다! 🎉';
            return;
        }

        const summaryParts = incomplete.slice(0, 3).map(t => {
            const icon = t.time && t.time.includes(':') ? '📅' : '🎬';
            const timeStr = t.time ? `${t.time}에 ` : '';
            return `<span class="tag tag-task">${icon} ${timeStr}${this.escapeHtml(t.title)}</span>`;
        });

        this.elements.planSummary.innerHTML =
            `오늘은 ${summaryParts.join(', ')} 등 총 ${incomplete.length}개의 할 일이 남아있습니다.`;
    }

    // ===== Parsing =====
    parsePlanText(text) {
        const tasks = [];
        const now = new Date();
        const today = now.toISOString().split('T')[0];
        const timePattern = /(\d{1,2})시/g;
        const lines = text.split(/[,.\n]/);

        lines.forEach((line, index) => {
            const trimmed = line.trim();
            if (!trimmed) return;

            const timeMatch = trimmed.match(timePattern);
            let time = null;

            if (timeMatch) {
                const hour = parseInt(timeMatch[0]);
                time = `${hour.toString().padStart(2, '0')}:00`;
            } else {
                const baseHour = now.getHours() + 1 + index;
                time = `${(baseHour % 24).toString().padStart(2, '0')}:00`;
            }

            tasks.push({
                title: trimmed.replace(timePattern, '').trim() || trimmed,
                time: time,
                date: today
            });
        });

        return tasks;
    }

    // ===== Speech Recognition =====
    setupSpeechRecognition() {
        if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
            const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
            this.recognition = new SpeechRecognition();
            this.recognition.continuous = true;
            this.recognition.interimResults = true;
            this.recognition.lang = 'ko-KR';

            this.recognition.onresult = (event) => {
                let transcript = '';
                for (let i = 0; i < event.results.length; i++) {
                    transcript += event.results[i][0].transcript;
                }
                this.elements.planTextDisplay.textContent = transcript;
            };

            this.recognition.onerror = () => this.hideVoiceOverlay();
            this.recognition.onend = () => this.hideVoiceOverlay();
        }
    }

    startVoiceInput() {
        if (this.recognition) {
            document.querySelectorAll('.method-btn').forEach(b => b.classList.remove('active'));
            document.getElementById('voiceInputBtn').classList.add('active');
            this.elements.planTextDisplay.textContent = '';
            this.showVoiceOverlay();
            this.recognition.start();
        } else {
            alert('음성 인식이 지원되지 않는 브라우저입니다.');
        }
    }

    stopVoiceInput() {
        if (this.recognition) this.recognition.stop();
        this.hideVoiceOverlay();
        document.querySelectorAll('.method-btn').forEach(b => b.classList.remove('active'));
        document.getElementById('textInputBtn').classList.add('active');
    }

    showVoiceOverlay() {
        this.elements.voiceOverlay.classList.add('active');
    }

    hideVoiceOverlay() {
        this.elements.voiceOverlay.classList.remove('active');
    }

    // ===== Local Storage Fallback =====
    getSampleTasks() {
        return [
            { id: 1, title: '모바일 디자인 팀 프로젝트 회의', time: '15:00', completed: false },
            { id: 2, title: '영상 씬 4 제작 과제', time: '회의 + 휴식 이후', completed: false },
            { id: 3, title: '정보 디자인 과제 풀이 고민', time: '저녁 식사 이후', completed: false }
        ];
    }

    saveLocalPlans() {
        localStorage.setItem('bbip-plans', JSON.stringify(this.plans));
    }

    loadLocalPlans() {
        const stored = localStorage.getItem('bbip-plans');
        return stored ? JSON.parse(stored) : [];
    }

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
}

// Initialize app when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    window.planApp = new PlanApp();
});
