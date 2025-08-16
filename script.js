const API_BASE_URL = "http://localhost:8000"; // APIベースURL
let PARTIES = [];
let votes = {};
let chart;

// ---------------------------//
// 共通関数
// ---------------------------//

// API GET
async function apiGet(endpoint) {
  try {
    const res = await fetch(`${API_BASE_URL}${endpoint}`);
    if (!res.ok) throw new Error(`HTTPエラー: ${res.status}`);
    return await res.json();
  } catch (error) {
    console.error(`GET ${endpoint} 失敗`, error);
    return null;
  }
}

// API POST
async function apiPost(endpoint, body) {
  try {
    const res = await fetch(`${API_BASE_URL}${endpoint}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body)
    });
    if (!res.ok) throw new Error(`HTTPエラー: ${res.status}`);
    return await res.json();
  } catch (error) {
    console.error(`POST ${endpoint} 失敗`, error);
    return null;
  }
}

// party_id を取得（「その他」は99固定）
function getPartyId(party) {
  return party === "その他" ? 99 : PARTIES.indexOf(party) + 1;
}

// ---------------------------
// 投票数関連
// ---------------------------

// 投票数をDBから取得
async function loadVotesFromDB() {
  const data = await apiGet("/votes");
  votes = data || {};
  PARTIES.forEach(p => { if (votes[p] === undefined) votes[p] = 0; });
}

// ---------------------------
// グラフ関連
// ---------------------------

function createChart() {
  const ctx = document.getElementById("voteChart").getContext("2d");
  chart = new Chart(ctx, {
    type: "pie",
    data: {
      labels: PARTIES,
      datasets: [{ data: PARTIES.map(p => votes[p]) }]
    },
    options: { responsive: true, plugins: { legend: { position: "bottom" } } }
  });
}

function refresh() {
  chart.data.labels = PARTIES;
  chart.data.datasets[0].data = PARTIES.map(p => votes[p]);
  chart.update();
  const total = Object.values(votes).reduce((a,b)=>a+b,0);
  document.getElementById("totalVotes").textContent = `総投票数: ${total}票`;
}

// ---------------------------
// ボタン関連
// ---------------------------

function createButtons() {
  const btnWrap = document.getElementById("partyButtons");
  btnWrap.innerHTML = "";
  PARTIES.forEach(p => {
    const btn = document.createElement("button");
    btn.textContent = p;
    btn.onclick = () => vote(p);
    btnWrap.appendChild(btn);
  });
}

// ---------------------------
// 投票処理
// ---------------------------

async function vote(party) {
  try {
    const user_id = sessionStorage.getItem("user_id");

    if (user_id == null) {
      // ログインページにリダイレクト
      window.location.href = "login.html";
      return; // ここで処理を中断
    }

    const party_id = getPartyId(party);

    const result = await apiPost("/vote", { user_id, party_id });
    if (!result) throw new Error("投票の保存に失敗");

    await loadVotesFromDB();
    refresh();

    document.getElementById("message").textContent = `${party} に投票しました！`;
  } catch (error) {
    console.error(error);
    alert("投票の保存に失敗しました");
  }
}

// ---------------------------
// 新規登録
// ---------------------------

document.addEventListener("DOMContentLoaded", () => {
  const form = document.getElementById("registerForm");
  if (!form) return; // 登録フォームが存在しなければ処理しない

  form.addEventListener("submit", async (e) => {
    e.preventDefault();

    const phone = document.getElementById("register_phone").value.trim();
    const user_id = document.getElementById("register_user_id").value.trim();
    const password = document.getElementById("register_password").value;
    const confirm_password = document.getElementById("register_confirm_password").value;

    // パスワード確認
    if (password !== confirm_password) {
      alert("パスワードと確認用パスワードが一致しません");
      return;
    }

    // 電話番号バリデーション：数字11桁
    const phoneRegex = /^\d{11}$/;
    if (!phoneRegex.test(phone)) {
      alert("電話番号は数字11桁で入力してください");
      return;
    }

    const payload = { phone, user_id, password };
    console.log("送信するデータ:", payload);

    try {
      const response = await fetch(`${API_BASE_URL}/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!response.ok) throw new Error(`HTTPエラー: ${response.status}`);

      const data = await response.json();
      console.log("APIレスポンス:", data);

      if (data.success) {
        alert("登録が完了しました。ログイン画面に移動します。");
        window.location.href = "login.html";
      } else {
        alert("登録に失敗しました: " + (data.message || "不明なエラー"));
      }
    } catch (error) {
      console.error("登録リクエスト失敗:", error);
      alert("サーバーに接続できませんでした");
    }
  });
});


// ---------------------------
// ログイン認証
// ---------------------------

document.addEventListener("DOMContentLoaded", () => {
  // ログインフォームが存在する場合のみ処理
  const loginForm = document.querySelector("form");
  if (!loginForm) return; // フォームがなければ処理しない

  loginForm.addEventListener("submit", async (e) => {
    e.preventDefault(); // フォーム送信を止める

    const inputUserId = document.getElementById("user_id").value;
    const inputPassword = document.getElementById("password").value;

    console.log("送信する値:", { user_id: inputUserId, password: inputPassword });

    try {
      const response = await fetch(`${API_BASE_URL}/login`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          user_id: inputUserId,
          password: inputPassword,
        }),
      });

      console.log("HTTPステータス:", response.status);

      if (!response.ok) {
        throw new Error(`HTTPエラー: ${response.status}`);
      }

      const data = await response.json();
      console.log("APIからのレスポンス:", data);

      if (data.success) {
        console.log("ログイン成功, セッションに保存");
        sessionStorage.setItem("user_id", data.user_id);

        window.location.href = "index.html";
      } else {
        console.warn("ログイン失敗: ユーザーIDまたはパスワードが違います");
        alert("ユーザーIDまたはパスワードが違います");
      }
    } catch (error) {
      console.error("ログインリクエスト失敗:", error);
      alert("サーバーに接続できませんでした");
    }
  });
});



// ---------------------------
// ログイン認証後処理
// ---------------------------

document.addEventListener("DOMContentLoaded", () => {
    const user_id = sessionStorage.getItem("user_id");
    const userDiv = document.getElementById("user_id");

    if (user_id) {
      // ログイン済みならユーザーIDとログアウトリンクを表示
      userDiv.innerHTML = `
        <span>${user_id}</span> / 
        <a href="#" id="logout">ログアウト</a>
      `;

      // ログアウト処理
      document.getElementById("logout").addEventListener("click", (e) => {
        e.preventDefault();
        sessionStorage.removeItem("user_id"); // 保存データを消す
        window.location.href = "index.html";  // ログイン画面へ戻す
      });
    } else {
      // 未ログインならログインリンクのまま
      userDiv.innerHTML = `<a href="login.html">ログイン</a> / <a href="signup.html">新規登録</a>`;
    }
  });

// ---------------------------
// 初期化
// ---------------------------

async function init() {
  const data = await apiGet("/party");
  if (!data) { alert("パーティデータ取得失敗"); return; }

  PARTIES = data.map(item => item.name);
  await loadVotesFromDB();
  createButtons();
  createChart();
  refresh();
}

init();
