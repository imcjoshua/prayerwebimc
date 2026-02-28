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
        try {
            const snapshot = await db.collection(this.collection)
                .where('userId', '==', userId)
                .get();
            return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }))
                .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
        } catch (error) {
            console.error("데이터 불러오기 실패:", error);
            return [];
        }
    }

    async save(prayer, userId) {
        if (!userId) return null;
        try {
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
        } catch (error) {
            console.error("데이터 저장 실패:", error);
            throw error;
        }
    }

    async update(id, updatedFields) {
        try {
            await db.collection(this.collection).doc(id).update(updatedFields);
        } catch (error) {
            console.error("데이터 수정 실패:", error);
            throw error;
        }
    }

    async delete(id) {
        try {
            await db.collection(this.collection).doc(id).delete();
        } catch (error) {
            console.error("데이터 삭제 실패:", error);
            throw error;
        }
    }
}

const store = new PrayerStore();
let currentUser = null;

// UI 관리자
const UI = {
    main: document.getElementById('main-content'),
    modal: document.getElementById('modal-overlay'),

    init() {
        // 리다이렉트 결과 처리 (모바일용)
        auth.getRedirectResult()
            .then((result) => {
                if (result.user) console.log("Redirect login success");
            })
            .catch((error) => {
                console.error("Redirect login error:", error);
            });

        // 인증 상태 변경 감지
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

        // 네비게이션 이벤트
        document.getElementById('btn-login').onclick = () => {
            // 모바일 기기 체크 (단순 체크)
            const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
            
            if (isMobile) {
                // 모바일은 리다이렉트 방식 사용 (403 에러 및 팝업 차단 방지)
                auth.signInWithRedirect(googleProvider);
            } else {
                // 데스크톱은 팝업 방식 사용
                auth.signInWithPopup(googleProvider)
                    .catch((error) => {
                        console.error("Login error:", error);
                        alert("로그인 중 오류가 발생했습니다: " + error.message);
                    });
            }
        };

        document.getElementById('btn-logout').onclick = () => auth.signOut();
        document.getElementById('close-modal').onclick = () => this.closeModal();
        document.getElementById('go-home').onclick = () => this.renderHome();
        window.onclick = (e) => { if (e.target === UI.modal) UI.closeModal(); };
    },

    async renderHome() {
        const template = document.getElementById('home-view');
        if (!template) return;
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

        if (currentUser) {
            const listSection = document.getElementById('home-list-section');
            const listContainer = document.getElementById('home-prayer-list');
            
            if (listSection && listContainer) {
                listSection.classList.remove('hidden');
                listContainer.innerHTML = '<div style="padding: 2rem; text-align: center; color: var(--text-muted);">기도 목록을 불러오는 중...</div>';

                const prayers = await store.getAll(currentUser.uid);
                
                if (prayers.length === 0) {
                    listContainer.innerHTML = '<p style="padding: 2rem; border: 1px dashed var(--border); text-align:center; color: var(--text-muted); border-radius: 12px;">아직 등록된 기도 제목이 없습니다.</p>';
                } else {
                    listContainer.innerHTML = prayers.map(p => this.createPrayerItemTemplate(p)).join('');
                    
                    listContainer.querySelectorAll('.btn-edit').forEach(btn => {
                        btn.onclick = () => this.openEditModal(btn.dataset.id);
                    });
                    listContainer.querySelectorAll('.btn-answer').forEach(btn => {
                        btn.onclick = () => this.openAnswerModal(btn.dataset.id);
                    });
                }
            }
        }
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
                        <option value="private">비공개 기도</option>
                        <option value="public">공개 기도</option>
                    </select>
                </div>
                <button type="submit" class="submit-btn">저장하기</button>
            </form>
        `;

        this.showModal(title, formHtml);

        document.getElementById('prayer-form').onsubmit = async (e) => {
            e.preventDefault();
            const formData = new FormData(e.target);
            const prayerData = Object.fromEntries(formData.entries());
            prayerData.type = type;

            try {
                await store.save(prayerData, currentUser.uid);
                this.closeModal();
                this.renderHome();
            } catch (err) {
                alert("저장 중 오류가 발생했습니다.");
            }
        };
    },

    createPrayerItemTemplate(p) {
        let typeBadge = '';
        if (p.type === 'urgent') {
            const diff = new Date(p.deadline) - new Date();
            const days = Math.ceil(diff / (1000 * 60 * 60 * 24));
            typeBadge = `<span class="badge urgent">URGENT D-${days >= 0 ? days : '+' + Math.abs(days)}</span>`;
        } else {
            typeBadge = `<span class="badge annual">YEARLY ${p.year}</span>`;
        }

        const statusBadge = p.answered ? `<span class="badge success">ANSWERED</span>` : '';

        return `
            <div class="prayer-item">
                <div class="p-header">
                    ${typeBadge}
                    ${statusBadge}
                    <span style="font-family: var(--mono); font-size: 0.65rem; color: var(--text-muted); margin-top: 0.2rem;">
                        ${new Date(p.createdAt).toISOString().split('T')[0]}
                    </span>
                </div>
                
                <div class="p-content">
                    <h3 class="p-title">${p.title}</h3>
                    <div class="p-cycle">
                        <span>● CYCLE: ${p.cycle}</span>
                        <span style="margin-left: 0.5rem;">● ACCESS: ${p.isPublic === 'public' ? 'PUBLIC' : 'PRIVATE'}</span>
                    </div>
                    ${p.answerContent ? `
                        <div class="p-answer-box">
                            <span style="font-weight: 800; font-family: var(--mono); font-size: 0.65rem; display: block; margin-bottom: 0.2rem;">>>> RESPONSE RECEIVED</span>
                            ${p.answerContent}
                        </div>
                    ` : ''}
                </div>

                <div class="p-actions">
                    <button class="action-btn edit btn-edit" data-id="${p.id}">EDIT</button>
                    <button class="action-btn answer btn-answer" data-id="${p.id}">${p.answered ? 'RE-LOG' : 'RESOLVE'}</button>
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
                <button type="button" id="btn-delete" style="margin-top: 0.8rem; background: #fee2e2; color: #991b1b; border: none; width: 100%; padding: 0.8rem; border-radius: 10px; cursor: pointer; font-weight: 600;">기도 제목 삭제</button>
            </form>
        `);

        document.getElementById('edit-form').onsubmit = async (e) => {
            e.preventDefault();
            await store.update(id, { title: e.target.title.value, cycle: e.target.cycle.value });
            this.closeModal();
            this.renderHome();
        };

        document.getElementById('btn-delete').onclick = async () => {
            if (confirm('정말 삭제하시겠습니까?')) {
                await store.delete(id);
                this.closeModal();
                this.renderHome();
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
            this.renderHome();
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
