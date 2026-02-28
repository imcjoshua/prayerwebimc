// Firebase Configuration (사용자 설정 필요)
const firebaseConfig = {
    apiKey: "AIzaSyDgW90Th4xwTkTrcbjgLhwbXcHz_7bKEdM",
  authDomain: "prayerwebimc.firebaseapp.com",
  projectId: "prayerwebimc",
  storageBucket: "prayerwebimc.firebasestorage.app",
  messagingSenderId: "510995765037",
  appId: "1:510995765037:web:15b1b7c62126e87f65a5a4",
  measurementId: "G-11Z35RDV5N"
};

// Initialize Firebase
firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();
const db = firebase.firestore();
const googleProvider = new firebase.auth.GoogleAuthProvider();

// 데이터 관리 클래스 (Firestore 기반)
class PrayerStore {
    constructor() {
        this.collection = 'prayers';
    }

    async getAll(userId) {
        if (!userId) return [];
        const snapshot = await db.collection(this.collection)
            .where('userId', '==', userId)
            .orderBy('createdAt', 'desc')
            .get();
        return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    }

    async save(prayer, userId) {
        if (!userId) return null;
        const newPrayer = {
            userId: userId,
            createdAt: new Date().toISOString(),
            answered: false,
            answerContent: '',
            answerDate: '',
            ...prayer
        };
        const docRef = await db.collection(this.collection).add(newPrayer);
        return { id: docRef.id, ...newPrayer };
    }

    async update(id, updatedFields) {
        await db.collection(this.collection).doc(id).update(updatedFields);
    }

    async delete(id) {
        await db.collection(this.collection).doc(id).delete();
    }
}

const store = new PrayerStore();
let currentUser = null;

// UI 관리자
const UI = {
    main: document.getElementById('main-content'),
    modal: document.getElementById('modal-overlay'),

    init() {
        auth.onAuthStateChanged(user => {
            if (user) {
                currentUser = user;
                document.getElementById('btn-login').classList.add('hidden');
                document.getElementById('user-profile').classList.remove('hidden');
                document.getElementById('user-photo').src = user.photoURL;
                this.renderHome();
            } else {
                currentUser = null;
                document.getElementById('btn-login').classList.remove('hidden');
                document.getElementById('user-profile').classList.add('hidden');
                this.renderHome();
            }
        });

        document.getElementById('btn-login').onclick = () => auth.signInWithPopup(googleProvider);
        document.getElementById('btn-logout').onclick = () => auth.signOut();
        document.getElementById('close-modal').onclick = () => this.closeModal();
        document.getElementById('go-home').onclick = () => this.renderHome();
        document.getElementById('btn-view-list-nav').onclick = () => this.renderList();
        window.onclick = (e) => { if (e.target === UI.modal) UI.closeModal(); };
    },

    renderHome() {
        const template = document.getElementById('home-view');
        this.main.innerHTML = '';
        this.main.appendChild(template.content.cloneNode(true));

        document.getElementById('btn-urgent').onclick = () => {
            if (!currentUser) return alert('로그인이 필요한 기능입니다.');
            this.openFormModal('urgent');
        };
        document.getElementById('btn-annual').onclick = () => {
            if (!currentUser) return alert('로그인이 필요한 기능입니다.');
            this.openFormModal('annual');
        };
    },

    openFormModal(type) {
        const isUrgent = type === 'urgent';
        const title = isUrgent ? '간절한 기도 등록' : '연간 기도 등록';
        
        const formHtml = `
            <form id="prayer-form">
                ${!isUrgent ? `
                    <div class="input-group">
                        <label>목표 연도</label>
                        <input type="number" name="year" value="${new Date().getFullYear()}" required>
                    </div>
                ` : ''}
                <div class="input-group">
                    <label>기도 내용</label>
                    <textarea name="title" rows="3" placeholder="기도하고 싶은 내용을 적어주세요" required></textarea>
                </div>
                ${isUrgent ? `
                    <div class="input-group">
                        <label>목표 날짜</label>
                        <input type="date" name="deadline" required>
                    </div>
                ` : ''}
                <div class="input-group">
                    <label>기도 주기</label>
                    <input type="text" name="cycle" placeholder="예: 매일 저녁 9시, 월/수/금 등" required>
                </div>
                <div class="input-group">
                    <label>공개 여부</label>
                    <select name="isPublic">
                        <option value="private">비공개 (개인용)</option>
                        <option value="public">공개 (나눔용)</option>
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
                <button type="submit" class="submit-btn">저장하기</button>
            </form>
        `;

        this.showModal(title, formHtml);

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

            await store.save(prayerData, currentUser.uid);

            if (isUrgent) {
                try {
                    fetch('https://formspree.io/f/xeeldvel', {
                        method: 'POST',
                        body: JSON.stringify(prayerData),
                        headers: { 'Accept': 'application/json', 'Content-Type': 'application/json' }
                    });
                } catch (err) { console.error("전송 오류", err); }
            }

            this.closeModal();
            this.renderList();
        };
    },

    async renderList() {
        if (!currentUser) return alert('로그인 후 이용 가능합니다.');
        
        const prayers = await store.getAll(currentUser.uid);
        this.main.innerHTML = `
            <div class="list-container">
                <header class="console-header" style="text-align:left; margin-bottom: 2rem;">
                    <h1>나의 기도 목록</h1>
                    <p>${currentUser.displayName}님의 소중한 기도 제목들입니다.</p>
                </header>
                <div class="prayer-list">
                    ${prayers.length === 0 ? '<p style="padding: 2rem; border: 1px dashed var(--border); text-align:center;">저장된 기도 내용이 없습니다.</p>' : ''}
                    ${prayers.map(p => this.createPrayerItemTemplate(p)).join('')}
                </div>
            </div>
        `;

        this.main.querySelectorAll('.btn-edit').forEach(btn => {
            btn.onclick = () => this.openEditModal(btn.dataset.id);
        });
        this.main.querySelectorAll('.btn-answer').forEach(btn => {
            btn.onclick = () => this.openAnswerModal(btn.dataset.id);
        });
    },

    createPrayerItemTemplate(p) {
        let dDayText = '';
        if (p.type === 'urgent' && p.deadline) {
            const diff = new Date(p.deadline) - new Date();
            const days = Math.ceil(diff / (1000 * 60 * 60 * 24));
            dDayText = `<span class="badge">남은 기간: ${days >= 0 ? days + '일' : '+' + Math.abs(days) + '일 경과'}</span>`;
        } else if (p.type === 'annual') {
            const endOfYear = new Date(p.year || new Date().getFullYear(), 11, 31);
            const diff = endOfYear - new Date();
            const days = Math.ceil(diff / (1000 * 60 * 60 * 24));
            dDayText = `<span class="badge">올해 남은 날: ${days}일</span>`;
        }

        return `
            <div class="prayer-item">
                <div class="p-info">
                    <div class="p-header">
                        ${dDayText}
                        <span class="badge">${p.type === 'urgent' ? '집중' : p.year + ' 연간'}</span>
                        ${p.answered ? '<span class="badge" style="background: #dcfce7; color: #166534;">응답 완료</span>' : ''}
                    </div>
                    <h3 class="p-title">${p.title}</h3>
                    <p class="p-cycle">주기: ${p.cycle} | 공개: ${p.isPublic === 'public' ? '공개' : '비공개'}</p>
                    ${p.answerContent ? `<div style="margin-top: 0.5rem; font-size: 0.85rem; color: #166534; background: #f0fdf4; padding: 0.5rem; border-radius: 4px;">✨ 응답: ${p.answerContent}</div>` : ''}
                </div>
                <div class="p-actions">
                    <button class="action-btn btn-edit" data-id="${p.id}">수정</button>
                    <button class="action-btn btn-answer" data-id="${p.id}">${p.answered ? '응답 수정' : '응답 기록'}</button>
                </div>
            </div>
        `;
    },

    async openEditModal(id) {
        const prayers = await store.getAll(currentUser.uid);
        const p = prayers.find(item => item.id === id);
        this.showModal('기도 내용 수정', `
            <form id="edit-form">
                <div class="input-group">
                    <label>기도 내용</label>
                    <textarea name="title" rows="4" required>${p.title}</textarea>
                </div>
                <div class="input-group">
                    <label>기도 주기</label>
                    <input type="text" name="cycle" value="${p.cycle}" required>
                </div>
                <button type="submit" class="submit-btn">수정 완료</button>
                <button type="button" id="btn-delete" style="margin-top: 0.5rem; background: #fee2e2; color: #991b1b; border: 1px solid #f87171;" class="submit-btn">기도 제목 삭제</button>
            </form>
        `);

        document.getElementById('edit-form').onsubmit = async (e) => {
            e.preventDefault();
            await store.update(id, { title: e.target.title.value, cycle: e.target.cycle.value });
            this.closeModal();
            this.renderList();
        };

        document.getElementById('btn-delete').onclick = async () => {
            if (confirm('정말 삭제하시겠습니까?')) {
                await store.delete(id);
                this.closeModal();
                this.renderList();
            }
        };
    },

    async openAnswerModal(id) {
        const prayers = await store.getAll(currentUser.uid);
        const p = prayers.find(item => item.id === id);
        this.showModal('기도 응답 기록', `
            <form id="answer-form">
                <div class="input-group">
                    <label>응답 내용</label>
                    <textarea name="answerContent" rows="4" placeholder="하나님이 어떻게 응답하셨나요?" required>${p.answerContent || ''}</textarea>
                </div>
                <div class="input-group">
                    <label>응답 날짜</label>
                    <input type="date" name="answerDate" value="${p.answerDate || new Date().toISOString().split('T')[0]}" required>
                </div>
                <button type="submit" class="submit-btn">응답 저장하기</button>
            </form>
        `);

        document.getElementById('answer-form').onsubmit = async (e) => {
            e.preventDefault();
            await store.update(id, { 
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

// 앱 시작
UI.init();
