// 폼 제출 시 간단한 확인 메시지 (Formspree가 페이지를 이동시키지 않는 경우 대비)
const prayerForm = document.getElementById('prayer-form');

if (prayerForm) {
    prayerForm.addEventListener('submit', () => {
        console.log('기도 제목이 전송되었습니다.');
        // 실제 전송 처리는 HTML의 action(Formspree)에서 수행됩니다.
    });
}
