/**
 * 삡-플랜: 자연어 기반 일정 관리 웹앱
 * Main Application JavaScript
 */

const API_BASE = '/api';

// ===== Auth Manager =====
class AuthManager {
    constructor() {
        this.token = localStorage.getItem('bbip-token');
        this.user = JSON.parse(localStorage.getItem('bbip-user') || 'null');
    }

    isLoggedIn() {
        return !!this.token;
    }

    getHeaders() {
        return {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${this.token}`
        };
    }

    save(token, user) {
        this.token = token;
        this.user = user;
        localStorage.setItem('bbip-token', token);
        localStorage.setItem('bbip-user', JSON.stringify(user));
    }

    clear() {
        this.token = null;
        this.user = null;
        localStorage.removeItem('bbip-token');
        localStorage.removeItem('bbip-user');
    }

    async login(email, password) {
        const res = await fetch(`${API_BASE}/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password })
        });
        const data = await res.json();
        if (!data.success) throw new Error(data.error);
        this.save(data.data.token, data.data.user);
        return data.data.user;
    }

    async register(name, email, password, emoji) {
        const res = await fetch(`${API_BASE}/auth/register`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name, email, password, emoji })
        });
        const data = await res.json();
        if (!data.success) throw new Error(data.error);
        this.save(data.data.token, data.data.user);
        return data.data.user;
    }

    async verify() {
        if (!this.token) return false;
        try {
            const res = await fetch(`${API_BASE}/auth/me`, {
                headers: this.getHeaders()
            });
            const data = await res.json();
            if (data.success) {
                this.user = data.data;
                localStorage.setItem('bbip-user', JSON.stringify(data.data));
                return true;
            }
            this.clear();
            return false;
        } catch {
            return false;
        }
    }
}

// ===== Plan App =====
class PlanApp {
    constructor() {
        this.auth = new AuthManager();
        this.plans = [];
        this.recognition = null;

        this.authScreen = document.getElementById('authScreen');
        this.appLayout = document.getElementById('appLayout');

        this.init();
    }

    async init() {
        this.setupAuthListeners();

        if (this.auth.isLoggedIn()) {
            const valid = await this.auth.verify();
            if (valid) {
                this.showApp();
                return;
            }
        }
        this.showAuth();
    }

    // ===== Auth UI =====
    setupAuthListeners() {
        // Toggle forms
        document.getElementById('showRegister').addEventListener('click', () => {
            document.getElementById('loginForm').classList.add('hidden');
            document.getElementById('registerForm').classList.remove('hidden');
            this.clearErrors();
        });

        document.getElementById('showLogin').addEventListener('click', () => {
            document.getElementById('registerForm').classList.add('hidden');
            document.getElementById('loginForm').classList.remove('hidden');
            this.clearErrors();
        });

        // Login
        document.getElementById('loginForm').addEventListener('submit', async (e) => {
            e.preventDefault();
            const btn = e.target.querySelector('.auth-submit-btn');
            const email = document.getElementById('loginEmail').value;
            const password = document.getElementById('loginPassword').value;

            btn.disabled = true;
            btn.textContent = '로그인 중...';

            try {
                await this.auth.login(email, password);
                this.showApp();
            } catch (err) {
                this.showError('loginError', err.message);
            } finally {
                btn.disabled = false;
                btn.textContent = '로그인';
            }
        });

        // Register
        document.getElementById('registerForm').addEventListener('submit', async (e) => {
            e.preventDefault();
            const btn = e.target.querySelector('.auth-submit-btn');
            const name = document.getElementById('registerName').value;
            const email = document.getElementById('registerEmail').value;
            const password = document.getElementById('registerPassword').value;
            const emoji = document.getElementById('registerEmoji').value || '🐔';

            btn.disabled = true;
            btn.textContent = '가입 중...';

            try {
                await this.auth.register(name, email, password, emoji);
                this.showApp();
            } catch (err) {
                this.showError('registerError', err.message);
            } finally {
                btn.disabled = false;
                btn.textContent = '회원가입';
            }
        });
    }

    showError(id, message) {
        const el = document.getElementById(id);
        el.textContent = message;
        el.classList.add('show');
    }

    clearErrors() {
        document.querySelectorAll('.auth-error').forEach(el => {
            el.classList.remove('show');
            el.textContent = '';
        });
    }

    showAuth() {
        this.authScreen.classList.remove('hidden');
        this.appLayout.classList.add('hidden');
    }

    async showApp() {
        this.authScreen.classList.add('hidden');
        this.appLayout.classList.remove('hidden');

        // Cache elements
        this.elements = {
            headerDate: document.getElementById('headerDate'),
            headerDay: document.getElementById('headerDay'),
            greetEmoji: document.getElementById('greetEmoji'),
            greetName: document.getElementById('greetName'),
            planSummary: document.getElementById('planSummary'),
            progressRing: document.getElementById('progressRing'),
            progressPercent: document.getElementById('progressPercent'),
            completedCount: document.getElementById('completedCount'),
            remainingCount: document.getElementById('remainingCount'),
            scheduleEmpty: document.getElementById('scheduleEmpty'),
            scheduleList: document.getElementById('scheduleList'),
            planModal: document.getElementById('planModal'),
            planTextDisplay: document.getElementById('planTextDisplay'),
            voiceOverlay: document.getElementById('voiceOverlay'),
            sidebar: document.querySelector('.sidebar'),
            mobileMenuBtn: document.getElementById('mobileMenuBtn'),
            mobileOverlay: document.getElementById('mobileOverlay'),
            userName: document.getElementById('userName'),
            userEmoji: document.getElementById('userEmoji'),
        };

        // Set user info
        const user = this.auth.user;
        if (user) {
            this.elements.userName.textContent = user.name;
            this.elements.userEmoji.textContent = user.emoji || '🐔';
            this.elements.greetName.textContent = user.name;
            this.elements.greetEmoji.textContent = user.emoji || '🐔';
        }

        this.updateDateTime();
        this.setupAppListeners();
        this.setupSpeechRecognition();
        this.addProgressGradient();
        await this.loadPlans();

        setInterval(() => this.updateDateTime(), 60000);
    }

    addProgressGradient() {
        const svg = document.querySelector('.progress-ring');
        if (!svg || svg.querySelector('defs')) return;

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
        const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
        const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

        this.elements.headerDate.textContent = `${months[now.getMonth()]} ${now.getDate().toString().padStart(2, '0')}.`;
        this.elements.headerDay.textContent = days[now.getDay()];

        const hour = now.getHours();
        let greeting = hour < 12 ? '좋은 아침입니다' : hour < 18 ? '좋은 오후입니다' : '좋은 저녁입니다';
        const greetHello = document.querySelector('.greeting-hello');
        if (greetHello && this.auth.user) {
            greetHello.innerHTML = `${greeting}, <span class="emoji">${this.escapeHtml(this.auth.user.emoji || '🐔')}</span> <strong>${this.escapeHtml(this.auth.user.name)}</strong> 님`;
        }
    }

    setupAppListeners() {
        // Plan modal
        document.getElementById('openPlanInput').addEventListener('click', () => this.openModal());
        const emptyAddBtn = document.getElementById('emptyAddBtn');
        if (emptyAddBtn) emptyAddBtn.addEventListener('click', () => this.openModal());
        document.getElementById('closePlanModal').addEventListener('click', () => this.closeModal());
        this.elements.planModal.addEventListener('click', (e) => {
            if (e.target === this.elements.planModal) this.closeModal();
        });

        // Complete plan
        document.getElementById('completePlanBtn').addEventListener('click', () => this.completePlan());

        // Voice
        document.getElementById('voiceInputBtn').addEventListener('click', () => this.startVoiceInput());
        document.getElementById('voiceStopBtn').addEventListener('click', () => this.stopVoiceInput());
        document.getElementById('textInputBtn').addEventListener('click', () => {
            document.querySelectorAll('.method-btn').forEach(b => b.classList.remove('active'));
            document.getElementById('textInputBtn').classList.add('active');
            this.elements.planTextDisplay.focus();
        });

        // Mobile menu
        this.elements.mobileMenuBtn.addEventListener('click', () => {
            this.elements.sidebar.classList.toggle('open');
            this.elements.mobileOverlay.classList.toggle('active');
            if (this.elements.mobileOverlay.classList.contains('active')) {
                this.elements.mobileOverlay.style.display = 'block';
            }
        });
        this.elements.mobileOverlay.addEventListener('click', () => {
            this.elements.sidebar.classList.remove('open');
            this.elements.mobileOverlay.classList.remove('active');
        });

        // Sidebar nav
        document.querySelectorAll('.sidebar-nav .nav-item').forEach(btn => {
            btn.addEventListener('click', () => {
                document.querySelectorAll('.sidebar-nav .nav-item').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
            });
        });

        // Logout
        document.getElementById('logoutBtn').addEventListener('click', () => {
            this.auth.clear();
            this.showAuth();
        });

        // Escape key
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') this.closeModal();
        });
    }

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
    async loadPlans() {
        const today = new Date().toISOString().split('T')[0];
        try {
            const res = await fetch(`${API_BASE}/plans?date=${today}`, {
                headers: this.auth.getHeaders()
            });
            const data = await res.json();
            if (data.success) this.plans = data.data;
        } catch (err) {
            console.log('Plans API error:', err);
            this.plans = [];
        }

        this.renderSchedule();
        this.updateProgress();
        this.updateGreetingSummary();
    }

    async completePlan() {
        const planText = this.elements.planTextDisplay.textContent.trim();
        if (!planText) { this.elements.planTextDisplay.focus(); return; }

        const tasks = this.parsePlanText(planText);

        try {
            const res = await fetch(`${API_BASE}/plans/bulk`, {
                method: 'POST',
                headers: this.auth.getHeaders(),
                body: JSON.stringify({ plans: tasks })
            });
            const data = await res.json();
            if (data.success) this.plans = [...this.plans, ...data.data];
        } catch (err) {
            console.log('Bulk create error:', err);
        }

        this.elements.planTextDisplay.textContent = '';
        this.closeModal();
        this.renderSchedule();
        this.updateProgress();
        this.updateGreetingSummary();
    }

    async toggleTaskCompletion(id) {
        const task = this.plans.find(p => String(p.id) === String(id));
        if (!task) return;

        task.completed = !task.completed;

        try {
            await fetch(`${API_BASE}/plans/${id}`, {
                method: 'PUT',
                headers: this.auth.getHeaders(),
                body: JSON.stringify({ completed: task.completed })
            });
        } catch (err) {
            console.log('Toggle error:', err);
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
                const id = btn.closest('.schedule-item').dataset.id;
                this.toggleTaskCompletion(id);
            });
        });
    }

    updateProgress() {
        const total = this.plans.length;
        const completed = this.plans.filter(p => p.completed).length;
        const percent = total > 0 ? Math.round((completed / total) * 100) : 0;

        const circumference = 2 * Math.PI * 52;
        const offset = circumference - (percent / 100) * circumference;
        this.elements.progressRing.style.strokeDashoffset = offset;

        this.animateNumber(this.elements.progressPercent, percent);
        this.elements.completedCount.textContent = completed;
        this.elements.remainingCount.textContent = total - completed;
    }

    animateNumber(element, target) {
        const current = parseInt(element.textContent) || 0;
        const diff = target - current;
        const duration = 600;
        const start = performance.now();
        const animate = (now) => {
            const progress = Math.min((now - start) / duration, 1);
            element.textContent = Math.round(current + diff * (1 - Math.pow(1 - progress, 3)));
            if (progress < 1) requestAnimationFrame(animate);
        };
        requestAnimationFrame(animate);
    }

    updateGreetingSummary() {
        if (this.plans.length === 0) {
            this.elements.planSummary.innerHTML = '아직 오늘의 계획이 없습니다.<br>상단의 <strong>계획 입력하기</strong> 버튼을 눌러 하루를 시작해보세요! ✨';
            return;
        }
        const incomplete = this.plans.filter(p => !p.completed);
        if (incomplete.length === 0) {
            this.elements.planSummary.innerHTML = '오늘의 모든 계획을 완료했습니다! 🎉 수고하셨어요!';
            return;
        }
        const parts = incomplete.slice(0, 3).map(t => {
            const icon = t.time && t.time.includes(':') ? '📅' : '🎬';
            return `<span class="tag tag-task">${icon} ${this.escapeHtml(t.title)}</span>`;
        });
        this.elements.planSummary.innerHTML = `오늘은 ${parts.join(', ')} 등 총 ${incomplete.length}개의 할 일이 남아있습니다.`;
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
                time = `${((now.getHours() + 1 + index) % 24).toString().padStart(2, '0')}:00`;
            }
            tasks.push({
                title: trimmed.replace(timePattern, '').trim() || trimmed,
                time, date: today
            });
        });
        return tasks;
    }

    // ===== Speech =====
    setupSpeechRecognition() {
        if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
            const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
            this.recognition = new SR();
            this.recognition.continuous = true;
            this.recognition.interimResults = true;
            this.recognition.lang = 'ko-KR';
            this.recognition.onresult = (event) => {
                let transcript = '';
                for (let i = 0; i < event.results.length; i++) transcript += event.results[i][0].transcript;
                this.elements.planTextDisplay.textContent = transcript;
            };
            this.recognition.onerror = () => this.elements.voiceOverlay.classList.remove('active');
            this.recognition.onend = () => this.elements.voiceOverlay.classList.remove('active');
        }
    }

    startVoiceInput() {
        if (this.recognition) {
            document.querySelectorAll('.method-btn').forEach(b => b.classList.remove('active'));
            document.getElementById('voiceInputBtn').classList.add('active');
            this.elements.planTextDisplay.textContent = '';
            this.elements.voiceOverlay.classList.add('active');
            this.recognition.start();
        } else {
            alert('음성 인식이 지원되지 않는 브라우저입니다.');
        }
    }

    stopVoiceInput() {
        if (this.recognition) this.recognition.stop();
        this.elements.voiceOverlay.classList.remove('active');
        document.querySelectorAll('.method-btn').forEach(b => b.classList.remove('active'));
        document.getElementById('textInputBtn').classList.add('active');
    }

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
}

document.addEventListener('DOMContentLoaded', () => {
    window.planApp = new PlanApp();
});
