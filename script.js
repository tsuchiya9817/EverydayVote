const API_BASE_URL = "http://localhost:8000"; // APIベースURL
let PARTIES = [];
let votes = {};
let chart;

// ---------------------------
// 共通関数
// ---------------------------

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
    const user_id = document.getElementById("user_name").textContent || "guest";
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
// ユーザ名取得
// ---------------------------

async function fetchUsername() {
  const data = await apiGet("/users");
  if (data?.users?.length > 0) {
    document.getElementById("user_name").textContent = data.users[0].user_name;
  } else {
    document.getElementById("user_name").textContent = "ログイン";
  }
}

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
fetchUsername();
