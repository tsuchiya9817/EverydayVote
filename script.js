
const PARTIES = [
  "自由民主党","公明党","立憲民主党","国民民主党",
  "日本維新の会","参政党","日本共産党","れいわ新選組",
  "日本保守党","チームみらい","その他"
];
const STORAGE_KEY = "votesByParty_v1";

// ストレージ読み込み
function loadVotes() {
  const data = localStorage.getItem(STORAGE_KEY);
  if (data) return JSON.parse(data);
  const obj = {};
  PARTIES.forEach(p => obj[p] = 0);
  return obj;
}
function saveVotes(v) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(v));
}

let votes = loadVotes();

// グラフ作成
const ctx = document.getElementById("voteChart").getContext("2d");
const chart = new Chart(ctx, {
  type: "pie",
  data: {
    labels: PARTIES,
    datasets: [{
      data: PARTIES.map(p => votes[p]),
    }]
  },
  options: {
    responsive: true,
    plugins: {
      legend: { position: "bottom" }
    }
  }
});

// グラフと票数更新
function refresh() {
  chart.data.datasets[0].data = PARTIES.map(p => votes[p]);
  chart.update();
  const total = Object.values(votes).reduce((a,b)=>a+b,0);
  document.getElementById("totalVotes").textContent = `総投票数: ${total}票`;
}

// 投票処理
function vote(party) {
  votes[party]++;
  saveVotes(votes);
  refresh();
  document.getElementById("message").textContent = `${party} に投票しました！`;
}

// ボタン生成
const btnWrap = document.getElementById("partyButtons");
PARTIES.forEach(p => {
  const btn = document.createElement("button");
  btn.textContent = p;
  btn.onclick = () => vote(p);
  btnWrap.appendChild(btn);
});

// APIからメッセージを取得して表示
async function fetchMessage() {
  try {
    const response = await fetch("http://localhost:8000/message");
    if (!response.ok) {
      throw new Error(`HTTPエラー: ${response.status}`);
    }
    const data = await response.json();
    document.getElementById("message").textContent = `APIからのメッセージ: ${data.message}`;
  } catch (error) {
    document.getElementById("message").textContent = `取得失敗: ${error.message}`;
  }
}

// ＊＊＊＊＊＊＊＊＊＊＊＊＊＊＊＊＊＊＊＊＊＊＊＊＊＊＊＊＊＊＊＊＊＊＊＊＊＊＊＊＊＊＊＊＊＊＊＊＊＊＊＊＊＊＊＊＊＊＊＊＊＊＊＊＊＊＊＊＊＊＊＊＊＊＊＊＊＊＊＊＊＊＊＊＊＊＊＊＊＊＊＊＊＊＊＊＊＊＊＊//
// ロード処理　                                                                                                                                                                           // 
// ＊＊＊＊＊＊＊＊＊＊＊＊＊＊＊＊＊＊＊＊＊＊＊＊＊＊＊＊＊＊＊＊＊＊＊＊＊＊＊＊＊＊＊＊＊＊＊＊＊＊＊＊＊＊＊＊＊＊＊＊＊＊＊＊＊＊＊＊＊＊＊＊＊＊＊＊＊＊＊＊＊＊＊＊＊＊＊＊＊＊＊＊＊＊＊＊＊＊＊＊//

// 初期描画
refresh();

// ページ読み込み時に取得
fetchMessage();




