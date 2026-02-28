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
        prayers.push({
            id: Date.now(),
            createdAt: new Date().toISOString(),
            answered: false,
            answerContent: '',
            answerDate: '',
            ...prayer
        });
        localStorage.setItem(this.key, JSON.stringify(prayers));
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

        document.getElementById('btn-urgent').onclick = () => this.renderForm('urgent');
        document.getElementById('btn-annual').onclick = () => this.renderForm('annual');
        document.getElementById('btn-view-list').onclick = () => this.renderList();
    },

    renderForm(type) {
        const isUrgent = type === 'urgent';
        this.main.innerHTML = `
            <div class="form-container">
                <button class="secondary-btn" id="btn-back">← 뒤로가기</button>
                <h1 class="hero-text">${isUrgent ? '간절한 기도제목' : '올해의 기도제목'}</h1>
                <form id="prayer-form">
                    ${!isUrgent ? `
                        <div class="input-group">
                            <label>연도 선택</label>
                            <input type="number" name="year" value="${new Date().getFullYear()}" required>
                        </div>
                    ` : ''}
                    
                    <div class="input-group">
                        <label>기도제목</label>
                        <textarea name="title" rows="3" placeholder="기도하고 싶은 내용을 적어주세요" required></textarea>
                    </div>

                    ${isUrgent ? `
                        <div class="input-group">
                            <label>언제까지 (목표 날짜)</label>
                            <input type="date" name="deadline" required>
                        </div>
                    ` : ''}

                    <div class="input-group">
                        <label>기도주기 (요일/시간/알람)</label>
                        <input type="text" name="cycle" placeholder="예: 매일 저녁 9시, 월/수/금 등" required>
                    </div>

                    <div class="input-group">
                        <label>공개 여부</label>
                        <select name="isPublic">
                            <option value="private">비공개</option>
                            <option value="public">공개</option>
                        </select>
                    </div>

                    ${(!isUrgent) ? `
                        <div class="input-group" id="past-status-group" style="display:none;">
                            <label>현재 상태</label>
                            <select name="status">
                                <option value="praying">아직 기도 중</option>
                                <option value="answered">응답 받음</option>
                                <option value="letgo">내려놓음</option>
                            </select>
                        </div>
                    ` : ''}

                    <button type="submit" class="choice-card" style="width:100%; padding: 1.5rem; margin-top: 2rem; background: var(--primary); color: white;">
                        기도제목 등록하기
                    </button>
                </form>
            </div>
        `;

        document.getElementById('btn-back').onclick = () => this.renderHome();

        // 과거 연도 입력 시 상태 필드 보여주기
        if (!isUrgent) {
            const yearInput = this.main.querySelector('input[name="year"]');
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

            // 1. LocalStorage 저장
            store.save(prayerData);

            // 2. Urgent인 경우 Formspree 전송
            if (isUrgent) {
                try {
                    await fetch('https://formspree.io/f/xeeldvel', {
                        method: 'POST',
                        body: JSON.stringify(prayerData),
                        headers: { 'Accept': 'application/json', 'Content-Type': 'application/json' }
                    });
                } catch (err) { console.error("Formspree error", err); }
            }

            alert('기도제목이 등록되었습니다.');
            this.renderList();
        };
    },

    renderList() {
        const prayers = store.getAll();
        this.main.innerHTML = `
            <div class="list-container">
                <button class="secondary-btn" id="btn-back">← 홈으로</button>
                <h1 class="hero-text">나의 기도 목록</h1>
                <div class="prayer-list">
                    ${prayers.length === 0 ? '<p style="text-align:center; padding: 3rem;">아직 등록된 기도제목이 없습니다.</p>' : ''}
                    ${prayers.map(p => this.createPrayerItemTemplate(p)).join('')}
                </div>
            </div>
        `;

        document.getElementById('btn-back').onclick = () => this.renderHome();

        // 이벤트 바인딩
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
            dDayText = `<span class="badge ${days < 0 ? 'past' : ''}">D${days >= 0 ? '-' : '+'}${Math.abs(days)}</span>`;
        } else if (p.type === 'annual') {
            const endOfYear = new Date(p.year || new Date().getFullYear(), 11, 31);
            const diff = endOfYear - new Date();
            const days = Math.ceil(diff / (1000 * 60 * 60 * 24));
            dDayText = `<span class="badge annual">올해 남은 날: ${days}일</span>`;
        }

        return `
            <div class="prayer-item card">
                <div class="p-info">
                    <div class="p-header">
                        ${dDayText}
                        <span class="type-tag">${p.type === 'urgent' ? '🔥 간절한' : '📅 ' + (p.year || '')}</span>
                        ${p.answered ? '<span class="badge answered">✨ 응답받음</span>' : ''}
                    </div>
                    <h3 class="p-title">${p.title}</h3>
                    <p class="p-cycle">🔄 ${p.cycle} | 🔒 ${p.isPublic === 'public' ? '공개' : '비공개'}</p>
                    ${p.answerContent ? `<div class="p-answer"><strong>응답:</strong> ${p.answerContent} (${p.answerDate})</div>` : ''}
                </div>
                <div class="p-actions">
                    <button class="btn-edit action-icon" data-id="${p.id}" title="수정">✏️</button>
                    <button class="btn-answer action-btn" data-id="${p.id}">${p.answered ? '응답 수정' : '기도 응답'}</button>
                </div>
            </div>
        `;
    },

    openEditModal(id) {
        const p = store.getAll().find(item => item.id === id);
        this.showModal('기도제목 수정', `
            <form id="edit-form">
                <div class="input-group">
                    <label>기도제목</label>
                    <textarea name="title" rows="4" required>${p.title}</textarea>
                </div>
                <div class="input-group">
                    <label>기도주기</label>
                    <input type="text" name="cycle" value="${p.cycle}" required>
                </div>
                <button type="submit" class="submit-btn" style="background: var(--primary); color: white; width: 100%; padding: 1rem; border-radius: 1rem; border: none;">저장하기</button>
                <button type="button" id="btn-delete" style="background: #ffeded; color: #ff4d4d; width: 100%; padding: 1rem; border-radius: 1rem; border: none; margin-top: 1rem; cursor: pointer;">삭제하기</button>
            </form>
        `);

        document.getElementById('edit-form').onsubmit = (e) => {
            e.preventDefault();
            store.update(id, { title: e.target.title.value, cycle: e.target.cycle.value });
            this.closeModal();
            this.renderList();
        };

        document.getElementById('btn-delete').onclick = () => {
            if (confirm('정말 삭제하시겠습니까?')) {
                store.delete(id);
                this.closeModal();
                this.renderList();
            }
        };
    },

    openAnswerModal(id) {
        const p = store.getAll().find(item => item.id === id);
        this.showModal('기도 응답 기록', `
            <p style="margin-bottom: 1.5rem; color: #666;">기적과 감사의 내용을 기록하세요.</p>
            <form id="answer-form">
                <div class="input-group">
                    <label>응답 내용</label>
                    <textarea name="answerContent" rows="4" placeholder="하나님이 어떻게 응답하셨나요?" required>${p.answerContent || ''}</textarea>
                </div>
                <div class="input-group">
                    <label>응답 날짜</label>
                    <input type="date" name="answerDate" value="${p.answerDate || new Date().toISOString().split('T')[0]}" required>
                </div>
                <button type="submit" class="submit-btn" style="background: oklch(70% 0.2 150); color: white; width: 100%; padding: 1rem; border-radius: 1rem; border: none;">응답 저장하기 ✨</button>
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
window.onclick = (e) => { if (e.target === UI.modal) UI.closeModal(); };

UI.renderHome();
