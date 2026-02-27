/**
 * BBIP: 자연어 기반 일정 관리 웹앱
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
        this._listenersAttached = false;
        this._dateInterval = null;
        this.isEditMode = false;
        this._editingTaskId = null;

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
            editModeBtn: document.getElementById('editModeBtn'),
            timeChangeModal: document.getElementById('timeChangeModal'),
            timeChangeInput: document.getElementById('timeChangeInput'),
            timeChangeTaskName: document.getElementById('timeChangeTaskName'),
            confirmTimeChange: document.getElementById('confirmTimeChange'),
            closeTimeModal: document.getElementById('closeTimeModal'),
            renameModal: document.getElementById('renameModal'),
            renameInput: document.getElementById('renameInput'),
            renameCurrentTime: document.getElementById('renameCurrentTime'),
            confirmRename: document.getElementById('confirmRename'),
            closeRenameModal: document.getElementById('closeRenameModal'),
            deleteModal: document.getElementById('deleteModal'),
            deleteTaskName: document.getElementById('deleteTaskName'),
            confirmDelete: document.getElementById('confirmDelete'),
            cancelDelete: document.getElementById('cancelDelete'),
            closeDeleteModal: document.getElementById('closeDeleteModal'),
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
        if (!this._listenersAttached) {
            this.setupAppListeners();
            this.setupSpeechRecognition();
            this._listenersAttached = true;
        }
        this.addProgressGradient();
        await this.loadPlans();

        if (this._dateInterval) clearInterval(this._dateInterval);
        this._dateInterval = setInterval(() => this.updateDateTime(), 60000);
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
            greetHello.innerHTML = `${greeting}, <span class="emoji">${this.escapeHtml(this.auth.user.emoji || '🐔')}</span> <strong>${this.escapeHtml(this.auth.user.name)}</strong> 님,`;
        }
    }

    setupAppListeners() {
        // Plan modal
        document.getElementById('openPlanInput').addEventListener('click', () => this.openModal());
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

        // Sidebar nav → page switching
        document.querySelectorAll('.sidebar-nav .nav-item').forEach(btn => {
            btn.addEventListener('click', () => {
                const page = btn.dataset.page;
                document.querySelectorAll('.sidebar-nav .nav-item').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                this.switchPage(page);
                // Close mobile menu
                this.elements.sidebar.classList.remove('open');
                this.elements.mobileOverlay.classList.remove('active');
            });
        });

        // Logout
        document.getElementById('logoutBtn').addEventListener('click', () => {
            this.auth.clear();
            this.showAuth();
        });

        // Escape key
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                this.closeModal();
                this.closeTimeChangeModal();
                this.closeRenameModal();
                this.closeDeleteModal();
            }
        });

        // Edit mode toggle
        this.elements.editModeBtn.addEventListener('click', () => this.toggleEditMode());

        // Time change modal
        this.elements.closeTimeModal.addEventListener('click', () => this.closeTimeChangeModal());
        this.elements.timeChangeModal.addEventListener('click', (e) => {
            if (e.target === this.elements.timeChangeModal) this.closeTimeChangeModal();
        });
        this.elements.confirmTimeChange.addEventListener('click', () => {
            if (this._editingTaskId && this.elements.timeChangeInput.value) {
                const task = this.plans.find(p => String(p.id) === String(this._editingTaskId));
                if (task) {
                    task.time = this.elements.timeChangeInput.value;
                    this.authFetch(`${API_BASE}/plans/${this._editingTaskId}`, {
                        method: 'PUT',
                        body: JSON.stringify({ time: task.time })
                    }).catch(err => console.log('Time update error:', err));
                }
            }
            this.closeTimeChangeModal();
            this.renderSchedule();
            this.updateGreetingSummary();
        });

        // Rename modal
        this.elements.closeRenameModal.addEventListener('click', () => this.closeRenameModal());
        this.elements.renameModal.addEventListener('click', (e) => {
            if (e.target === this.elements.renameModal) this.closeRenameModal();
        });
        this.elements.confirmRename.addEventListener('click', () => {
            if (this._renamingTaskId && this.elements.renameInput.value.trim()) {
                const task = this.plans.find(p => String(p.id) === String(this._renamingTaskId));
                if (task) {
                    task.title = this.elements.renameInput.value.trim();
                    this.authFetch(`${API_BASE}/plans/${this._renamingTaskId}`, {
                        method: 'PUT',
                        body: JSON.stringify({ title: task.title })
                    }).catch(err => console.log('Rename error:', err));
                }
            }
            this.closeRenameModal();
            this.renderSchedule();
            this.updateGreetingSummary();
        });
        this.elements.renameInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') this.elements.confirmRename.click();
        });

        // Delete modal
        this.elements.closeDeleteModal.addEventListener('click', () => this.closeDeleteModal());
        this.elements.cancelDelete.addEventListener('click', () => this.closeDeleteModal());
        this.elements.deleteModal.addEventListener('click', (e) => {
            if (e.target === this.elements.deleteModal) this.closeDeleteModal();
        });
        this.elements.confirmDelete.addEventListener('click', () => {
            if (this._deletingTaskId) this.deleteTask(this._deletingTaskId);
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

    // ===== API helpers =====
    async authFetch(url, options = {}) {
        try {
            const res = await fetch(url, { ...options, headers: this.auth.getHeaders() });
            if (res.status === 401) {
                this.auth.clear();
                this.showAuth();
                return null;
            }
            return res;
        } catch (err) {
            console.log('Network error:', err);
            return null;
        }
    }

    async loadPlans() {
        const today = new Date().toISOString().split('T')[0];
        try {
            const res = await this.authFetch(`${API_BASE}/plans?date=${today}`);
            if (res) {
                const data = await res.json();
                if (data.success && Array.isArray(data.data)) {
                    this.plans = data.data;
                }
            }
        } catch (err) {
            console.log('Plans API error:', err);
        }

        // 항상 렌더링 실행
        this.renderSchedule();
        this.updateProgress();
        this.updateGreetingSummary();
    }

    async completePlan() {
        const planText = this.elements.planTextDisplay.textContent.trim();
        if (!planText) { this.elements.planTextDisplay.focus(); return; }

        const btn = document.getElementById('completePlanBtn');
        btn.disabled = true;
        btn.innerHTML = '<span class="btn-sparkle">✦</span> 분석 중...';

        // Step 1: 로컬 파서로 즉시 파싱
        let tasks = this.parsePlanText(planText);

        // Step 2: AI 파싱 시도 (더 좋은 결과가 있으면 교체)
        try {
            const parseRes = await this.authFetch(`${API_BASE}/plans/parse`, {
                method: 'POST',
                body: JSON.stringify({ text: planText })
            });
            if (parseRes) {
                const parseData = await parseRes.json();
                if (parseData.success && parseData.data.length > 0) {
                    tasks = parseData.data;
                }
            }
        } catch (err) {
            console.log('AI parse failed, using local parser:', err);
        }

        if (!tasks || tasks.length === 0) {
            // 파싱 실패 시 그냥 전체 텍스트를 하나의 일정으로
            tasks = [{ title: planText, time: '', date: new Date().toISOString().split('T')[0] }];
        }

        btn.innerHTML = '<span class="btn-sparkle">✦</span> 저장 중...';

        // Step 3: 서버에 저장 시도
        try {
            const res = await this.authFetch(`${API_BASE}/plans/bulk`, {
                method: 'POST',
                body: JSON.stringify({ plans: tasks })
            });
            if (res) {
                const data = await res.json();
                if (data.success) {
                    this.plans = [...this.plans, ...data.data];
                } else {
                    // 서버 에러여도 로컬에 추가
                    this.addTasksLocally(tasks);
                }
            } else {
                // 인증 실패여도 로컬에 추가하여 UI에 표시
                this.addTasksLocally(tasks);
            }
        } catch (err) {
            console.log('Bulk create error:', err);
            // API 실패해도 로컬에 추가
            this.addTasksLocally(tasks);
        }

        btn.disabled = false;
        btn.innerHTML = '<span class="btn-sparkle">✦</span> 계획 입력 완료';

        this.elements.planTextDisplay.textContent = '';
        this.closeModal();
        this.renderSchedule();
        this.updateProgress();
        this.updateGreetingSummary();
    }

    addTasksLocally(tasks) {
        const today = new Date().toISOString().split('T')[0];
        const localTasks = tasks.map((t, i) => ({
            id: `local_${Date.now()}_${i}`,
            title: t.title,
            time: t.time || '',
            date: t.date || today,
            completed: false,
        }));
        this.plans = [...this.plans, ...localTasks];
    }

    async toggleTaskCompletion(id) {
        const task = this.plans.find(p => String(p.id) === String(id));
        if (!task) return;

        task.completed = !task.completed;

        try {
            await this.authFetch(`${API_BASE}/plans/${id}`, {
                method: 'PUT',
                body: JSON.stringify({ completed: task.completed })
            });
        } catch (err) {
            console.log('Toggle error:', err);
        }

        this.renderSchedule();
        this.updateProgress();
    }

    // ===== Edit Mode =====
    toggleEditMode() {
        this.isEditMode = !this.isEditMode;
        this.renderSchedule();
    }

    openTimeChangeModal(taskId) {
        const task = this.plans.find(p => String(p.id) === String(taskId));
        if (!task) return;
        this._editingTaskId = taskId;
        this.elements.timeChangeTaskName.textContent = task.title;
        this.elements.timeChangeInput.value = task.time || '';
        this.elements.timeChangeModal.classList.add('active');
        document.body.style.overflow = 'hidden';
        setTimeout(() => this.elements.timeChangeInput.focus(), 300);
    }

    closeTimeChangeModal() {
        this.elements.timeChangeModal.classList.remove('active');
        document.body.style.overflow = '';
        this._editingTaskId = null;
    }

    // ===== Rename =====
    openRenameModal(taskId) {
        const task = this.plans.find(p => String(p.id) === String(taskId));
        if (!task) return;
        this._renamingTaskId = taskId;
        this.elements.renameCurrentTime.textContent = task.time || '';
        this.elements.renameInput.value = task.title;
        this.elements.renameModal.classList.add('active');
        document.body.style.overflow = 'hidden';
        setTimeout(() => { this.elements.renameInput.focus(); this.elements.renameInput.select(); }, 300);
    }

    closeRenameModal() {
        this.elements.renameModal.classList.remove('active');
        document.body.style.overflow = '';
        this._renamingTaskId = null;
    }

    // ===== Delete =====
    openDeleteModal(taskId) {
        const task = this.plans.find(p => String(p.id) === String(taskId));
        if (!task) return;
        this._deletingTaskId = taskId;
        this.elements.deleteTaskName.textContent = task.title;
        this.elements.deleteModal.classList.add('active');
        document.body.style.overflow = 'hidden';
    }

    closeDeleteModal() {
        this.elements.deleteModal.classList.remove('active');
        document.body.style.overflow = '';
        this._deletingTaskId = null;
        // Reset any swiped items
        this.elements.scheduleList.querySelectorAll('.schedule-item').forEach(el => {
            el.style.transform = '';
            el.style.transition = 'transform 0.3s ease';
        });
    }

    async deleteTask(taskId) {
        try {
            await this.authFetch(`${API_BASE}/plans/${taskId}`, { method: 'DELETE' });
        } catch (err) {
            console.log('Delete error:', err);
        }
        this.plans = this.plans.filter(p => String(p.id) !== String(taskId));
        this.closeDeleteModal();
        this.renderSchedule();
        this.updateProgress();
        this.updateGreetingSummary();
    }

    // ===== Swipe to delete =====
    initSwipeToDelete() {
        const items = this.elements.scheduleList.querySelectorAll('.schedule-item');
        items.forEach(item => {
            let startX = 0, currentX = 0, swiping = false;

            const getX = (e) => (e.touches ? e.touches[0].clientX : e.clientX);

            const onStart = (e) => {
                // Don't hijack clicks on buttons
                if (e.target.closest('.time-edit-icon') || e.target.closest('button')) return;
                startX = getX(e);
                currentX = 0;
                swiping = true;
                item.style.transition = 'none';
            };

            const onMove = (e) => {
                if (!swiping) return;
                currentX = getX(e) - startX;
                // Only allow right swipe
                if (currentX < 0) currentX = 0;
                if (currentX > 0) {
                    e.preventDefault();
                    item.style.transform = `translateX(${currentX}px)`;
                    // Gradually show red tint
                    const ratio = Math.min(currentX / 120, 1);
                    item.style.background = `rgba(${180 + 75 * ratio}, ${50 - 20 * ratio}, ${50 - 20 * ratio}, ${0.05 + 0.15 * ratio})`;
                }
            };

            const onEnd = () => {
                if (!swiping) return;
                swiping = false;
                if (currentX > 120) {
                    // Threshold reached → open delete modal
                    item.style.transition = 'transform 0.3s ease, background 0.3s ease';
                    item.style.transform = `translateX(${item.offsetWidth}px)`;
                    setTimeout(() => {
                        this.openDeleteModal(item.dataset.id);
                    }, 200);
                } else {
                    // Snap back
                    item.style.transition = 'transform 0.3s ease, background 0.3s ease';
                    item.style.transform = 'translateX(0)';
                    item.style.background = '';
                }
            };

            item.addEventListener('touchstart', onStart, { passive: true });
            item.addEventListener('touchmove', onMove, { passive: false });
            item.addEventListener('touchend', onEnd);
            item.addEventListener('mousedown', onStart);
            item.addEventListener('mousemove', onMove);
            item.addEventListener('mouseup', onEnd);
            item.addEventListener('mouseleave', onEnd);
        });
    }

    // ===== Rendering =====
    renderSchedule() {
        if (this.plans.length === 0) {
            this.elements.scheduleEmpty.style.display = 'flex';
            this.elements.scheduleList.style.display = 'none';
            this.elements.editModeBtn.style.display = 'none';
            return;
        }

        this.elements.scheduleEmpty.style.display = 'none';
        this.elements.scheduleList.style.display = 'grid';
        this.elements.editModeBtn.style.display = 'inline-flex';

        // Update edit button text
        this.elements.editModeBtn.querySelector('span').textContent = this.isEditMode ? '완료' : '수정';

        const sorted = [...this.plans].sort((a, b) => (a.time || '').localeCompare(b.time || ''));

        if (this.isEditMode) {
            // Edit mode: tap title → rename, tap time → change time, swipe right → delete
            this.elements.scheduleList.innerHTML = sorted.map(task => `
                <div class="schedule-item edit-item" data-id="${task.id}">
                    <div class="item-content">
                        <button class="time-tag-btn" data-id="${task.id}">${this.escapeHtml(task.time || '시간 설정')}</button>
                        <div class="edit-title-btn" data-id="${task.id}">${this.escapeHtml(task.title)}</div>
                    </div>
                    <div class="swipe-hint">← 밀어서 삭제</div>
                </div>
            `).join('');

            // Swipe to delete
            this.initSwipeToDelete();

            // Tap time tag → time change modal
            this.elements.scheduleList.querySelectorAll('.time-tag-btn').forEach(btn => {
                btn.addEventListener('click', (e) => {
                    e.stopPropagation();
                    this.openTimeChangeModal(btn.dataset.id);
                });
            });

            // Tap title → rename modal
            this.elements.scheduleList.querySelectorAll('.edit-title-btn').forEach(btn => {
                btn.addEventListener('click', (e) => {
                    e.stopPropagation();
                    this.openRenameModal(btn.dataset.id);
                });
            });
        } else {
            // Normal mode
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
            this.elements.planSummary.innerHTML = '📋 오늘의 <strong>계획</strong>을 입력해 보세요.';
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

    // ===== Smart Korean NLP Parser =====
    parsePlanText(text) {
        const now = new Date();
        const today = now.toISOString().split('T')[0];

        // 한글 숫자 → 아라비아 숫자
        const korNumMap = {
            '한': 1, '두': 2, '세': 3, '네': 4, '다섯': 5,
            '여섯': 6, '일곱': 7, '여덟': 8, '아홉': 9, '열': 10,
            '열한': 11, '열두': 12,
            '하나': 1, '둘': 2, '셋': 3, '넷': 4,
        };

        // 시간 표현 파싱 (여러 패턴)
        function parseTime(clause) {
            let hour = null, minute = 0, isPM = false, isAM = false;

            // 오전/오후 감지
            if (/오후|저녁|밤/.test(clause)) isPM = true;
            if (/오전|아침|새벽/.test(clause)) isAM = true;

            // 패턴 1: 한글 숫자 시 (열두시, 세시 반 등)
            const korPattern = /(한|두|세|네|다섯|여섯|일곱|여덟|아홉|열한|열두|열|하나|둘|셋|넷)\s*시/;
            const korMatch = clause.match(korPattern);
            if (korMatch) {
                hour = korNumMap[korMatch[1]];
            }

            // 패턴 2: 아라비아 숫자 시 (9시, 12시 등)
            if (hour === null) {
                const numPattern = /(\d{1,2})\s*시/;
                const numMatch = clause.match(numPattern);
                if (numMatch) hour = parseInt(numMatch[1]);
            }

            // 패턴 3: HH:MM or H:MM 형식
            if (hour === null) {
                const colonMatch = clause.match(/(\d{1,2}):(\d{2})/);
                if (colonMatch) {
                    hour = parseInt(colonMatch[1]);
                    minute = parseInt(colonMatch[2]);
                }
            }

            if (hour === null) return null;

            // 분 파싱
            const minPattern = /(\d{1,2})\s*분/;
            const minMatch = clause.match(minPattern);
            if (minMatch) minute = parseInt(minMatch[1]);

            // "반" = 30분
            if (/시\s*반/.test(clause) || new RegExp(korPattern.source + '\\s*반').test(clause)) {
                minute = 30;
            }

            // 오전/오후 보정
            if (isPM && hour < 12) hour += 12;
            if (isAM && hour === 12) hour = 0;

            // 시간 모호할 때 (1~6) → 오후로 추정 (명시적 오전 제외)
            if (!isAM && !isPM && hour >= 1 && hour <= 6) hour += 12;

            return `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;
        }

        // 제목 추출: 시간 표현 + 불필요한 어미/접속사 제거
        function extractTitle(clause) {
            let title = clause;

            // 시간 관련 표현 제거
            title = title.replace(/오전|오후|아침|저녁|밤|새벽/g, '');
            title = title.replace(/(한|두|세|네|다섯|여섯|일곱|여덟|아홉|열한|열두|열|하나|둘|셋|넷)\s*시\s*(반)?/g, '');
            title = title.replace(/\d{1,2}\s*시\s*(반)?/g, '');
            title = title.replace(/\d{1,2}\s*분/g, '');
            title = title.replace(/\d{1,2}:\d{2}/g, '');

            // 조사/어미 정리
            title = title.replace(/^(나는|저는|나|저)\s*/g, '');
            title = title.replace(/^(오늘|내일|모레)\s*/g, '');
            title = title.replace(/(에|까지|부터|에서|으로|로|을|를|이|가|은|는|도|만)\s*$/g, '');
            title = title.replace(/(있어|있고|해야\s*해|해야\s*하고|해야\s*하는|해야\s*돼|해야\s*되는|해야\s*될|있습니다|거야|할\s*거야)$/g, '');
            title = title.replace(/(제출해야\s*하는)\s*/g, '');
            title = title.replace(/(까지\s*(제출|완료|마감)해야\s*(하는|할|되는))\s*/g, '');

            // "~까지 제출해야 하는 PPT" → "PPT 제출"
            const deadlineMatch = clause.match(/까지\s*(제출|완료|마감)해야\s*(하는|할|되는)\s+(.+?)(?:\s*(?:있|해야|$))/);
            if (deadlineMatch) {
                return `${deadlineMatch[3].trim()} ${deadlineMatch[1]}`;
            }

            // "~까지 ... 제출/완료" 패턴
            const untilMatch = clause.match(/까지\s+(.+?)(?:\s+(?:제출|완료|마감))/);
            if (untilMatch) {
                const item = untilMatch[1].replace(/\d{1,2}\s*시\s*(반)?/g, '').replace(/\d{1,2}\s*분/g, '').trim();
                if (item) return `${item} 제출`;
            }

            // 일반 정리
            title = title.replace(/\s{2,}/g, ' ').trim();

            // 앞뒤 조사 한 번 더 정리
            title = title.replace(/^(에|의|와|과|에서)\s+/g, '');
            title = title.replace(/\s+(에|을|를|이|가)$/g, '');

            return title.trim();
        }

        // 절(clause) 분리: 접속사, 쉼표, 줄바꿈 기준
        const clauses = text
            .split(/[,.\n]|(?:있고|하고|그리고|또|또한|이랑|랑|(?:해야\s*하고)|(?:해야\s*되고))/g)
            .map(c => c.trim())
            .filter(c => c.length > 0);

        // "까지 ... 있어" 패턴 특별 처리 → 하나의 절에 시간+내용이 두 개 묶일 수 있음
        // "9시 30분에 회의" + "열두시까지 제출해야 하는 PPT"
        const tasks = [];
        const processed = [];

        for (const clause of clauses) {
            // 하나의 절 안에 시간 표현이 2개 이상이면 re-split
            const timeOccurrences = [];
            const timeRe = /(?:(?:한|두|세|네|다섯|여섯|일곱|여덟|아홉|열한|열두|열)\s*시|\d{1,2}\s*시|\d{1,2}:\d{2})/g;
            let m;
            while ((m = timeRe.exec(clause)) !== null) {
                timeOccurrences.push(m.index);
            }

            if (timeOccurrences.length >= 2) {
                // 두 번째 시간 표현 앞에서 split
                const split1 = clause.substring(0, timeOccurrences[1]).trim();
                const split2 = clause.substring(timeOccurrences[1]).trim();
                if (split1) processed.push(split1);
                if (split2) processed.push(split2);
            } else {
                processed.push(clause);
            }
        }

        for (const clause of processed) {
            const time = parseTime(clause);
            let title = extractTitle(clause);

            if (!title || title.length < 1) continue;

            // 첫 글자 대문자화 (영문일 경우)
            if (/^[a-z]/.test(title)) {
                title = title.charAt(0).toUpperCase() + title.slice(1);
            }

            tasks.push({
                title,
                time: time || `${String((now.getHours() + 1 + tasks.length) % 24).padStart(2, '0')}:00`,
                date: today
            });
        }

        // 시간으로 정렬
        tasks.sort((a, b) => (a.time || '').localeCompare(b.time || ''));

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

    // ===== Page Switching =====
    switchPage(page) {
        document.querySelectorAll('.page-content').forEach(p => p.classList.remove('active'));
        const target = document.getElementById(`page${page.charAt(0).toUpperCase() + page.slice(1)}`);
        if (target) target.classList.add('active');

        // Hide header (date + add plan btn) on stats page
        const header = document.querySelector('.main-header');
        if (header) header.style.display = page === 'stats' ? 'none' : '';

        if (page === 'calendar' && !this._calendarInitialized) {
            this.initCalendar();
            this._calendarInitialized = true;
        }
        if (page === 'calendar') {
            this.renderCalendar();
        }
        if (page === 'stats') {
            this.loadStats();
        }
    }

    // ===== Calendar =====
    initCalendar() {
        this._calViewDate = new Date();
        this._calSelectedDate = new Date().toISOString().split('T')[0];
        this._calPlansCache = {};

        document.getElementById('calPrev').addEventListener('click', () => {
            this._calViewDate.setMonth(this._calViewDate.getMonth() - 1);
            this.renderCalendar();
        });
        document.getElementById('calNext').addEventListener('click', () => {
            this._calViewDate.setMonth(this._calViewDate.getMonth() + 1);
            this.renderCalendar();
        });
        document.getElementById('calToday').addEventListener('click', () => {
            this._calViewDate = new Date();
            this._calSelectedDate = new Date().toISOString().split('T')[0];
            this.renderCalendar();
        });
    }

    async renderCalendar() {
        const year = this._calViewDate.getFullYear();
        const month = this._calViewDate.getMonth();

        // Month title
        document.getElementById('calMonthTitle').textContent = `${year}년 ${month + 1}월`;

        // Fetch plans for this month
        await this.fetchMonthPlans(year, month);

        const grid = document.getElementById('calendarGrid');
        const firstDay = new Date(year, month, 1).getDay();
        const daysInMonth = new Date(year, month + 1, 0).getDate();
        const daysInPrev = new Date(year, month, 0).getDate();
        const today = new Date().toISOString().split('T')[0];

        let html = '';

        // Previous month filler days
        for (let i = firstDay - 1; i >= 0; i--) {
            const day = daysInPrev - i;
            html += `<div class="cal-day other-month"><span class="day-number">${day}</span><div class="cal-day-dots"></div></div>`;
        }

        // Current month days
        for (let d = 1; d <= daysInMonth; d++) {
            const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
            const dayOfWeek = new Date(year, month, d).getDay();
            const classes = ['cal-day'];

            if (dateStr === today) classes.push('today');
            if (dateStr === this._calSelectedDate) classes.push('selected');
            if (dayOfWeek === 0) classes.push('sunday');
            if (dayOfWeek === 6) classes.push('saturday');

            // Plan dots
            const dayPlans = this._calPlansCache[dateStr] || [];
            let dots = '';
            if (dayPlans.length > 0) {
                const shown = dayPlans.slice(0, 3);
                dots = shown.map(p => `<span class="cal-dot${p.completed ? ' completed' : ''}"></span>`).join('');
            }

            html += `<div class="${classes.join(' ')}" data-date="${dateStr}">
                <span class="day-number">${d}</span>
                <div class="cal-day-dots">${dots}</div>
            </div>`;
        }

        // Next month filler
        const totalCells = firstDay + daysInMonth;
        const remaining = (7 - (totalCells % 7)) % 7;
        for (let i = 1; i <= remaining; i++) {
            html += `<div class="cal-day other-month"><span class="day-number">${i}</span><div class="cal-day-dots"></div></div>`;
        }

        grid.innerHTML = html;

        // Click handlers for days
        grid.querySelectorAll('.cal-day:not(.other-month)').forEach(el => {
            el.addEventListener('click', () => {
                this._calSelectedDate = el.dataset.date;
                grid.querySelectorAll('.cal-day').forEach(d => d.classList.remove('selected'));
                el.classList.add('selected');
                this.renderCalendarTasks();
            });
        });

        this.renderCalendarTasks();
    }

    async fetchMonthPlans(year, month) {
        // Fetch all plans for the given month
        const startDate = `${year}-${String(month + 1).padStart(2, '0')}-01`;
        const endDay = new Date(year, month + 1, 0).getDate();
        const endDate = `${year}-${String(month + 1).padStart(2, '0')}-${String(endDay).padStart(2, '0')}`;

        try {
            const res = await this.authFetch(`${API_BASE}/plans?start=${startDate}&end=${endDate}`);
            if (!res) return;
            const data = await res.json();
            if (data.success) {
                // Group by date
                const grouped = {};
                data.data.forEach(p => {
                    if (!grouped[p.date]) grouped[p.date] = [];
                    grouped[p.date].push({ ...p, completed: Boolean(p.completed) });
                });
                this._calPlansCache = grouped;
            }
        } catch (err) {
            console.log('Calendar fetch error:', err);
        }
    }

    renderCalendarTasks() {
        const dateStr = this._calSelectedDate;
        const plans = this._calPlansCache[dateStr] || [];

        // Format date for display
        const [y, m, d] = dateStr.split('-');
        const dateObj = new Date(parseInt(y), parseInt(m) - 1, parseInt(d));
        const weekdays = ['일', '월', '화', '수', '목', '금', '토'];
        document.getElementById('calSelectedDate').textContent =
            `${parseInt(m)}월 ${parseInt(d)}일 (${weekdays[dateObj.getDay()]})`;
        document.getElementById('calTaskCount').textContent = `${plans.length}개`;

        const emptyEl = document.getElementById('calTasksEmpty');
        const listEl = document.getElementById('calTasksList');

        if (plans.length === 0) {
            emptyEl.style.display = 'flex';
            listEl.style.display = 'none';
            return;
        }

        emptyEl.style.display = 'none';
        listEl.style.display = 'flex';

        const sorted = [...plans].sort((a, b) => (a.time || '').localeCompare(b.time || ''));
        listEl.innerHTML = sorted.map(task => `
            <div class="cal-task-item${task.completed ? ' completed' : ''}" data-id="${task.id}">
                <span class="cal-task-time">${this.escapeHtml(task.time || '')}</span>
                <span class="cal-task-title">${this.escapeHtml(task.title)}</span>
                <button class="cal-task-check${task.completed ? ' checked' : ''}" data-id="${task.id}"></button>
            </div>
        `).join('');

        listEl.querySelectorAll('.cal-task-check').forEach(btn => {
            btn.addEventListener('click', async () => {
                const id = btn.dataset.id;
                await this.toggleTaskCompletion(id);
                // Update cache
                const cachedPlan = (this._calPlansCache[dateStr] || []).find(p => String(p.id) === String(id));
                if (cachedPlan) cachedPlan.completed = !cachedPlan.completed;
                this.renderCalendarTasks();
                // Re-render dots
                this.renderCalendar();
            });
        });
    }
    // ===== Stats =====
    initStats() {
        this._statsYear = new Date().getFullYear();

        document.getElementById('statYearPrev').addEventListener('click', () => {
            this._statsYear--;
            this.loadStats();
        });
        document.getElementById('statYearNext').addEventListener('click', () => {
            this._statsYear++;
            this.loadStats();
        });
    }

    async loadStats() {
        if (!this._statsInitialized) {
            this.initStats();
            this._statsInitialized = true;
        }

        const year = this._statsYear;
        document.getElementById('statYearTitle').textContent = `${year}\ub144`;
        document.getElementById('statTotalYear').textContent = `${year} \uc804\uccb4 \uacc4\ud68d`;
        document.getElementById('statCompletedYear').textContent = `${year} \uc644\ub8cc`;

        // Fetch full year
        const startDate = `${year}-01-01`;
        const endDate = `${year}-12-31`;

        let allPlans = [];
        try {
            const res = await this.authFetch(`${API_BASE}/plans?start=${startDate}&end=${endDate}`);
            if (!res) return;
            const data = await res.json();
            if (data.success) allPlans = data.data.map(p => ({ ...p, completed: Boolean(p.completed) }));
        } catch (err) {
            console.log('Stats fetch error:', err);
        }

        // Group by month
        const monthly = Array.from({ length: 12 }, () => ({ total: 0, completed: 0 }));
        allPlans.forEach(p => {
            const m = parseInt(p.date.split('-')[1]) - 1;
            if (m >= 0 && m < 12) {
                monthly[m].total++;
                if (p.completed) monthly[m].completed++;
            }
        });

        // Summary cards
        const total = allPlans.length;
        const completed = allPlans.filter(p => p.completed).length;
        const rate = total > 0 ? Math.round((completed / total) * 100) : 0;

        document.getElementById('statTotalPlans').textContent = total;
        document.getElementById('statCompleted').textContent = completed;

        // Weekly insight (last 7 days)
        const now = new Date();
        const weekAgo = new Date(now);
        weekAgo.setDate(weekAgo.getDate() - 6);
        const weekStart = weekAgo.toISOString().split('T')[0];
        const weekEnd = now.toISOString().split('T')[0];
        const weekPlans = allPlans.filter(p => p.date >= weekStart && p.date <= weekEnd);
        const weekTotal = weekPlans.length;
        const weekCompleted = weekPlans.filter(p => p.completed).length;
        const weekRate = weekTotal > 0 ? Math.round((weekCompleted / weekTotal) * 100) : 0;

        document.getElementById('statAvgRate').textContent = `${weekRate}%`;
        document.getElementById('statInsightBarLabel').textContent = `${weekCompleted}\uac1c \uc644\ub8cc`;

        // Animate bar
        requestAnimationFrame(() => {
            document.getElementById('statInsightBarFill').style.width = `${Math.max(weekRate, 2)}%`;
        });

        // Streak
        const streak = this.calcStreak(allPlans, new Date());
        document.getElementById('statStreak').textContent = `${streak}\uc77c`;

        // Monthly bar chart
        this.renderMonthlyChart(monthly, year);
    }

    calcStreak(plans, now) {
        const grouped = {};
        plans.forEach(p => {
            if (!grouped[p.date]) grouped[p.date] = { total: 0, completed: 0 };
            grouped[p.date].total++;
            if (p.completed) grouped[p.date].completed++;
        });

        let streak = 0;
        const d = new Date(now);
        for (let i = 0; i < 60; i++) {
            const dateStr = d.toISOString().split('T')[0];
            const g = grouped[dateStr];
            if (g && g.total > 0 && g.completed === g.total) {
                streak++;
            } else if (g && g.total > 0) {
                break;
            }
            d.setDate(d.getDate() - 1);
        }
        return streak;
    }

    renderMonthlyChart(monthly, year) {
        const chart = document.getElementById('statsMonthlyChart');
        const yAxis = document.getElementById('statsYAxis');
        const labels = document.getElementById('statsMonthLabels');
        const currentMonth = new Date().getFullYear() === year ? new Date().getMonth() : -1;

        // Find max for y-axis
        const maxVal = Math.max(...monthly.map(m => m.completed), 1);
        const yMax = Math.ceil(maxVal / 2) * 2 || 2;

        // Y-axis labels
        const steps = 5;
        yAxis.innerHTML = '';
        for (let i = 0; i <= steps; i++) {
            const val = Math.round((yMax / steps) * i);
            yAxis.innerHTML += `<span class="stats-y-label">${val}</span>`;
        }

        // Bars
        chart.innerHTML = monthly.map((m, i) => {
            const h = yMax > 0 ? (m.completed / yMax) * 100 : 0;
            const isCurrent = i === currentMonth;
            const hasData = m.total > 0;
            return `<div class="stats-m-bar-wrap">
                <div class="stats-m-bar${isCurrent ? ' current' : ''}${hasData ? ' has-data' : ''}" style="height: 0%" data-h="${h}"></div>
            </div>`;
        }).join('');

        // Month labels
        const monthNames = ['1\uc6d4', '2\uc6d4', '3\uc6d4', '4\uc6d4', '5\uc6d4', '6\uc6d4', '7\uc6d4', '8\uc6d4', '9\uc6d4', '10\uc6d4', '11\uc6d4', '12\uc6d4'];
        labels.innerHTML = monthNames.map((name, i) =>
            `<span class="stats-month-lbl${i === currentMonth ? ' current' : ''}">${name}</span>`
        ).join('');

        // Animate bars
        requestAnimationFrame(() => {
            chart.querySelectorAll('.stats-m-bar').forEach(bar => {
                const h = bar.dataset.h;
                bar.style.height = `${Math.max(parseFloat(h), 2)}%`;
            });
        });
    }
}

document.addEventListener('DOMContentLoaded', () => {
    window.planApp = new PlanApp();
});
