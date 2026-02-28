const form = document.getElementById("prayer-form");

async function handleSubmit(event) {
  event.preventDefault();
  const status = document.getElementById("status");
  const submitBtn = document.getElementById("submit-btn");
  const data = new FormData(event.target);

  // 로딩 상태 표시
  submitBtn.disabled = true;
  submitBtn.innerText = "보내는 중...";
  status.innerHTML = "";

  fetch(event.target.action, {
    method: form.method,
    body: data,
    headers: {
      'Accept': 'application/json'
    }
  }).then(response => {
    if (response.ok) {
      status.innerHTML = "✅ 기도 제목이 성공적으로 전달되었습니다. 감사합니다.";
      status.className = "status-msg success";
      form.reset();
    } else {
      response.json().then(data => {
        if (Object.hasOwn(data, 'errors')) {
          status.innerHTML = data["errors"].map(error => error["message"]).join(", ");
        } else {
          status.innerHTML = "❌ 오 이런! 전송 중에 문제가 발생했습니다.";
        }
      });
      status.className = "status-msg error";
    }
  }).catch(error => {
    status.innerHTML = "❌ 네트워크 오류가 발생했습니다. 나중에 다시 시도해 주세요.";
    status.className = "status-msg error";
  }).finally(() => {
    submitBtn.disabled = false;
    submitBtn.innerText = "기도 제목 보내기";
  });
}

form.addEventListener("submit", handleSubmit);
