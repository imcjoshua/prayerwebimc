// 데이터 관리 클래스
class PrayerStore {
    constructor() {
        this.key = 'prayer_requests';
    }

    getAll() {
        const data = localStorage.getItem(this.key);
        return data ? JSON.parse(data) : [];
    }

    save(prayer) {
        const prayers = this.getAll();
        const newPrayer = {
            id: Date.now(),
            createdAt: new Date().toISOString(),
            answered: false,
            answerContent: '',
            answerDate: '',
            ...prayer
        };
        prayers.push(newPrayer);
        localStorage.setItem(this.key, JSON.stringify(prayers));
        return newPrayer;
    }

    update(id, updatedFields) {
        let prayers = this.getAll();
        prayers = prayers.map(p => p.id === id ? { ...p, ...updatedFields } : p);
        localStorage.setItem(this.key, JSON.stringify(prayers));
    }

    delete(id) {
        let prayers = this.getAll();
        prayers = prayers.filter(p => p.id !== id);
        localStorage.setItem(this.key, JSON.stringify(prayers));
    }
}

const store = new PrayerStore();

// UI 관리자
const UI = {
    main: document.getElementById('main-content'),
    modal: document.getElementById('modal-overlay'),

    renderHome() {
        const template = document.getElementById('home-view');
        this.main.innerHTML = '';
        this.main.appendChild(template.content.cloneNode(true));

        document.getElementById('btn-urgent').onclick = () => this.openFormModal('urgent');
        document.getElementById('btn-annual').onclick = () => this.openFormModal('annual');
    },

    openFormModal(type) {
        const isUrgent = type === 'urgent';
        const title = isUrgent ? 'NEW_URGENT_PRAYER' : 'NEW_ANNUAL_PRAYER';
        
        const formHtml = `
            <form id="prayer-form">
                ${!isUrgent ? `
                    <div class="input-group">
                        <label>TARGET_YEAR</label>
                        <input type="number" name="year" value="${new Date().getFullYear()}" required>
                    </div>
                ` : ''}
                
                <div class="input-group">
                    <label>PRAYER_CONTENT</label>
                    <textarea name="title" rows="3" placeholder="기도 내용을 입력하십시오" required></textarea>
                </div>

                ${isUrgent ? `
                    <div class="input-group">
                        <label>DEADLINE_DATE</label>
                        <input type="date" name="deadline" required>
                    </div>
                ` : ''}

                <div class="input-group">
                    <label>FREQUENCY_INFO</label>
                    <input type="text" name="cycle" placeholder="예: DAILY_2100, MON_WED_FRI" required>
                </div>

                <div class="input-group">
                    <label>VISIBILITY_SCOPE</label>
                    <select name="isPublic">
                        <option value="private">PRIVATE</option>
                        <option value="public">PUBLIC</option>
                    </select>
                </div>

                ${(!isUrgent) ? `
                    <div class="input-group" id="past-status-group" style="display:none;">
                        <label>CURRENT_STATUS</label>
                        <select name="status">
                            <option value="praying">STILL_PRAYING</option>
                            <option value="answered">ANSWERED</option>
                            <option value="letgo">LET_GO</option>
                        </select>
                    </div>
                ` : ''}

                <button type="submit" class="submit-btn">EXECUTE.SAVE()</button>
            </form>
        `;

        this.showModal(title, formHtml);

        // 과거 연도 입력 시 상태 필드 보여주기 로직
        if (!isUrgent) {
            const yearInput = document.querySelector('input[name="year"]');
            const statusGroup = document.getElementById('past-status-group');
            yearInput.oninput = (e) => {
                statusGroup.style.display = e.target.value < new Date().getFullYear() ? 'block' : 'none';
            };
        }

        document.getElementById('prayer-form').onsubmit = async (e) => {
            e.preventDefault();
            const formData = new FormData(e.target);
            const prayerData = Object.fromEntries(formData.entries());
            prayerData.type = type;

            store.save(prayerData);

            if (isUrgent) {
                try {
                    fetch('https://formspree.io/f/xeeldvel', {
                        method: 'POST',
                        body: JSON.stringify(prayerData),
                        headers: { 'Accept': 'application/json', 'Content-Type': 'application/json' }
                    });
                } catch (err) { console.error("Formspree error", err); }
            }

            this.closeModal();
            this.renderList();
        };
    },

    renderList() {
        const prayers = store.getAll();
        this.main.innerHTML = `
            <div class="list-container">
                <header class="console-header" style="text-align:left; margin-bottom: 2rem;">
                    <h1>QUERY_RESULT: PRAYER_LOGS</h1>
                    <p>시스템에 저장된 모든 기도 로그를 나열합니다.</p>
                </header>
                <div class="prayer-list">
                    ${prayers.length === 0 ? '<p style="padding: 2rem; border: 1px dashed var(--border); text-align:center;">EMPTY_RESULT: 데이터가 없습니다.</p>' : ''}
                    ${prayers.map(p => this.createPrayerItemTemplate(p)).join('')}
                </div>
            </div>
        `;

        this.main.querySelectorAll('.btn-edit').forEach(btn => {
            btn.onclick = () => this.openEditModal(Number(btn.dataset.id));
        });
        this.main.querySelectorAll('.btn-answer').forEach(btn => {
            btn.onclick = () => this.openAnswerModal(Number(btn.dataset.id));
        });
    },

    createPrayerItemTemplate(p) {
        let dDayText = '';
        if (p.type === 'urgent' && p.deadline) {
            const diff = new Date(p.deadline) - new Date();
            const days = Math.ceil(diff / (1000 * 60 * 60 * 24));
            dDayText = `<span class="badge">D${days >= 0 ? '-' : '+'}${Math.abs(days)}</span>`;
        } else if (p.type === 'annual') {
            const endOfYear = new Date(p.year || new Date().getFullYear(), 11, 31);
            const diff = endOfYear - new Date();
            const days = Math.ceil(diff / (1000 * 60 * 60 * 24));
            dDayText = `<span class="badge">REMAINING: ${days}d</span>`;
        }

        return `
            <div class="prayer-item">
                <div class="p-info">
                    <div class="p-header">
                        ${dDayText}
                        <span class="badge">${p.type.toUpperCase()} ${p.year || ''}</span>
                        ${p.answered ? '<span class="badge" style="background: #dcfce7; color: #166534;">ANSWERED</span>' : ''}
                    </div>
                    <h3 class="p-title">${p.title}</h3>
                    <p class="p-cycle">CYCLE: ${p.cycle} | SCOPE: ${p.isPublic.toUpperCase()}</p>
                </div>
                <div class="p-actions">
                    <button class="action-btn btn-edit" data-id="${p.id}">EDIT</button>
                    <button class="action-btn btn-answer" data-id="${p.id}">${p.answered ? 'LOG_UPDATE' : 'RECORD_ANSWER'}</button>
                </div>
            </div>
        `;
    },

    openEditModal(id) {
        const p = store.getAll().find(item => item.id === id);
        this.showModal('EDIT_ENTRY', `
            <form id="edit-form">
                <div class="input-group">
                    <label>CONTENT</label>
                    <textarea name="title" rows="4" required>${p.title}</textarea>
                </div>
                <div class="input-group">
                    <label>CYCLE</label>
                    <input type="text" name="cycle" value="${p.cycle}" required>
                </div>
                <button type="submit" class="submit-btn">UPDATE.COMMIT()</button>
                <button type="button" id="btn-delete" style="margin-top: 0.5rem; background: #fee2e2; color: #991b1b; border: 1px solid #f87171;" class="submit-btn">DELETE.REMOVE()</button>
            </form>
        `);

        document.getElementById('edit-form').onsubmit = (e) => {
            e.preventDefault();
            store.update(id, { title: e.target.title.value, cycle: e.target.cycle.value });
            this.closeModal();
            this.renderList();
        };

        document.getElementById('btn-delete').onclick = () => {
            if (confirm('삭제하시겠습니까?')) {
                store.delete(id);
                this.closeModal();
                this.renderList();
            }
        };
    },

    openAnswerModal(id) {
        const p = store.getAll().find(item => item.id === id);
        this.showModal('RECORD_ANSWER', `
            <form id="answer-form">
                <div class="input-group">
                    <label>ANSWER_DETAILS</label>
                    <textarea name="answerContent" rows="4" placeholder="응답 내용을 기록하십시오" required>${p.answerContent || ''}</textarea>
                </div>
                <div class="input-group">
                    <label>DATE_STAMP</label>
                    <input type="date" name="answerDate" value="${p.answerDate || new Date().toISOString().split('T')[0]}" required>
                </div>
                <button type="submit" class="submit-btn">ANSWER.SAVE()</button>
            </form>
        `);

        document.getElementById('answer-form').onsubmit = (e) => {
            e.preventDefault();
            store.update(id, { 
                answered: true, 
                answerContent: e.target.answerContent.value, 
                answerDate: e.target.answerDate.value 
            });
            this.closeModal();
            this.renderList();
        };
    },

    showModal(title, content) {
        document.getElementById('modal-title').innerText = title;
        document.getElementById('modal-body').innerHTML = content;
        this.modal.classList.remove('hidden');
    },

    closeModal() {
        this.modal.classList.add('hidden');
    }
};

// 초기화
document.getElementById('close-modal').onclick = () => UI.closeModal();
document.getElementById('go-home').onclick = () => UI.renderHome();
document.getElementById('btn-view-list-nav').onclick = () => UI.renderList();
window.onclick = (e) => { if (e.target === UI.modal) UI.closeModal(); };

UI.renderHome();
