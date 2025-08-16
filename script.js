const API_BASE_URL = "http://localhost:8000"; // APIベースURL
let PARTIES = [];   // { party_id, name, color, ruling_party } の配列
let votes = {};     // { "党名": 投票数 }
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
function getPartyId(partyName) {
  const party = PARTIES.find(p => p.name === partyName);
  return party ? party.party_id : 99;
}

// ---------------------------//
// 投票数関連
// ---------------------------//

async function loadVotesFromDB() {
  const data = await apiGet("/votes");
  votes = data || {};
  // すべての党を初期化
  PARTIES.forEach(p => { if (votes[p.name] === undefined) votes[p.name] = 0; });
}

// ---------------------------//
// グラフ関連
// ---------------------------//

function createChart() {
  const ctx = document.getElementById("voteChart").getContext("2d");
  
  chart = new Chart(ctx, {
    type: "doughnut",
    data: {
      labels: PARTIES.map(p => p.name),
      datasets: [{
        data: PARTIES.map(p => votes[p.name]),
        backgroundColor: PARTIES.map(p => p.color),
        borderColor: "#fff",
        borderWidth: 2,
        hoverOffset: 15
      }]
    },
    options: { 
      responsive: true, 
      plugins: { 
        legend: { 
          position: "bottom",
          labels: { font: { size: 14 } }
        },
        tooltip: {
          callbacks: {
            label: function(context) {
              const label = context.label || "";
              const value = context.parsed;
              const total = context.chart._metasets[0].total;
              const percentage = ((value / total) * 100).toFixed(1);
              return `${label}: ${value}票 (${percentage}%)`;
            }
          }
        }
      },
      cutout: "60%"
    }
  });
}

function refresh() {
  chart.data.labels = PARTIES.map(p => p.name);
  chart.data.datasets[0].data = PARTIES.map(p => votes[p.name]);
  chart.update();
  const total = Object.values(votes).reduce((a,b)=>a+b,0);
  document.getElementById("totalVotes").textContent = `総投票数: ${total}票`;
}

// ---------------------------//
// ボタン生成
// ---------------------------//

function createButtons() {
  const btnWrap = document.getElementById("partyButtons");
  btnWrap.innerHTML = "";
  PARTIES.forEach(p => {
    const btn = document.createElement("button");
    btn.textContent = p.name;
    btn.style.backgroundColor = p.color; // ボタンにも色を反映
    btn.onclick = () => vote(p.name);
    btnWrap.appendChild(btn);
  });
}

// ---------------------------//
// 投票処理
// ---------------------------//

async function vote(partyName) {
  try {
    const user_id = sessionStorage.getItem("user_id");
    if (!user_id) {
      window.location.href = "login.html";
      return;
    }

    const party_id = getPartyId(partyName);
    const result = await apiPost("/vote", { user_id, party_id });
    if (!result) throw new Error("投票の保存に失敗");

    await loadVotesFromDB();
    refresh();

    document.getElementById("message").textContent = `${partyName} に投票しました！`;
  } catch (error) {
    console.error(error);
    alert("投票の保存に失敗しました");
  }
}

// ---------------------------//
// 新規登録
// ---------------------------//

document.addEventListener("DOMContentLoaded", () => {
  const form = document.getElementById("registerForm");
  if (!form) return;

  form.addEventListener("submit", async (e) => {
    e.preventDefault();

    const phone = document.getElementById("register_phone").value.trim();
    const user_id = document.getElementById("register_user_id").value.trim();
    const password = document.getElementById("register_password").value;
    const confirm_password = document.getElementById("register_confirm_password").value;

    if (password !== confirm_password) {
      alert("パスワードと確認用パスワードが一致しません");
      return;
    }

    const phoneRegex = /^\d{11}$/;
    if (!phoneRegex.test(phone)) {
      alert("電話番号は数字11桁で入力してください");
      return;
    }

    const payload = { phone, user_id, password };
    try {
      const response = await apiPost("/register", payload);
      if (response.success) {
        sessionStorage.setItem("user_id", user_id);
        window.location.href = "index.html";
      } else {
        alert("登録に失敗しました: " + (response.message || "不明なエラー"));
      }
    } catch (err) {
      console.error(err);
      alert("サーバーに接続できませんでした");
    }
  });
});

// ---------------------------//
// ログイン認証
// ---------------------------//

document.addEventListener("DOMContentLoaded", () => {
  const loginForm = document.querySelector("form");
  if (!loginForm) return;

  loginForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    const inputUserId = document.getElementById("user_id").value;
    const inputPassword = document.getElementById("password").value;

    try {
      const data = await apiPost("/login", { user_id: inputUserId, password: inputPassword });
      if (data.success) {
        sessionStorage.setItem("user_id", data.user_id);
        window.location.href = "index.html";
      } else {
        alert("ユーザーIDまたはパスワードが違います");
      }
    } catch (err) {
      console.error(err);
      alert("サーバーに接続できませんでした");
    }
  });
});

// ---------------------------//
// ログイン済みかチェック
// ---------------------------//

document.addEventListener("DOMContentLoaded", () => {
  const user_id = sessionStorage.getItem("user_id");
  const userDiv = document.getElementById("user_id");

  if (user_id) {
    userDiv.innerHTML = `
      <span>${user_id}</span> / 
      <a href="#" id="logout">ログアウト</a>
    `;
    document.getElementById("logout").addEventListener("click", e => {
      e.preventDefault();
      sessionStorage.removeItem("user_id");
      window.location.href = "index.html";
    });
  } else {
    userDiv.innerHTML = `<a href="login.html">ログイン</a> / <a href="signup.html">新規登録</a>`;
  }
});

// ---------------------------//
// 初期化
// ---------------------------//

async function init() {
  const overlay = document.getElementById("loading-overlay");
  overlay.style.display = "flex";

  try {
    const data = await apiGet("/party");
    if (!data) { alert("パーティデータ取得失敗"); return; }

    PARTIES = data;  // ← オブジェクト配列のまま保持
    await loadVotesFromDB();
    createButtons();
    createChart();
    refresh();
  } finally {
    overlay.style.display = "none";
  }
}

init();
