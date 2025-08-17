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

  // 総投票数を計算
  const totalVotes = PARTIES.reduce((sum, p) => sum + votes[p.name], 0);

  // 中央にテキストを描画するカスタムプラグイン
  const centerTextPlugin = {
    id: "centerText",
    afterDraw(chart) {
      const { width, height, ctx } = chart;
      ctx.save();

      ctx.font = "bold 20px sans-serif";
      ctx.fillStyle = "#000";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(`総投票数`, width / 2, height / 2 - 15);
      ctx.fillText(`${totalVotes}票`, width / 2, height / 2 + 15);

      ctx.restore();
    }
  };

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
        legend: { display: false },
        tooltip: { enabled: false },
        datalabels: {
          formatter: function(value, context) {
            const label = context.chart.data.labels[context.dataIndex];
            const total = context.chart._metasets[0].total;
            const percentage = ((value / total) * 100).toFixed(1);

            const party = PARTIES.find(p => p.name === label);
            const seatsLower = party ? party.seats_lower : 0;
            const seatsUpper = party ? party.seats_upper : 0;

            return `${label}\n${value}票 (${percentage}%)\n衆${seatsLower} / 参${seatsUpper}`;
          },
          color: "#000",
          font: { size: 14, weight: "bold" },
          align: "center"
        }
      },
      cutout: "30%",
      // 👇 クリックイベント
      onClick(evt, activeEls) {
        if (activeEls.length > 0) {
          const index = activeEls[0].index;           // クリックされたセグメントのインデックス
          const partyName = PARTIES[index].name;      // 党名を取得
          vote(partyName);                            // 投票処理を呼ぶ
        }
      }
    },
    plugins: [ChartDataLabels, centerTextPlugin]
  });
}


function refresh() {
  chart.data.labels = PARTIES.map(p => p.name);
  chart.data.datasets[0].data = PARTIES.map(p => votes[p.name]);
  chart.update();
  const total = Object.values(votes).reduce((a,b)=>a+b,0);
  // document.getElementById("totalVotes").textContent = `総投票数: ${total}票`;
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
      <a href="#" id="profileLink">${user_id}</a> / <a href="#" id="logoutLink">ログアウト</a>`;

    // プロフィールページに遷移
    document.getElementById("profileLink").addEventListener("click", e => {
      e.preventDefault();
      window.location.href = "prof.html";
    });

    // ログアウト処理
    document.getElementById("logoutLink").addEventListener("click", e => {
      e.preventDefault();
      sessionStorage.removeItem("user_id");
      window.location.href = "index.html";
    });
  } else {
    userDiv.innerHTML = `<a href="login.html">ログイン</a> / <a href="signup.html">新規登録</a>`;
  }
});

// ---------------------------//
// 都道府県マスタから追加
// ---------------------------//
let districtsData = []; // districts 全件を保持しておく

async function loadPrefectures() {
  try {
    const response = await fetch("http://localhost:8000/prefectures");
    if (!response.ok) throw new Error("データ取得失敗");

    const prefectures = await response.json();
    const select = document.getElementById("prefecture");

    prefectures.forEach(pref => {
      const option = document.createElement("option");
      option.value = pref.prefecture_id;   // DBのIDをvalueにする
      option.textContent = pref.prefecture_name; // 名前を表示
      select.appendChild(option);
    });
  } catch (err) {
    console.error("都道府県の取得に失敗:", err);
  }
}

// ---------------------------//
// 小選挙区マスタから追加
// ---------------------------//
async function loadDistricts() {
  try {
    const response = await fetch("http://localhost:8000/districts");
    if (!response.ok) throw new Error("データ取得失敗");

    districtsData = await response.json(); // 全件を保持
    updateDistrictOptions(); // 初期状態（全部表示 or 空にする）
  } catch (err) {
    console.error("小選挙区の取得に失敗:", err);
  }
}

// ---------------------------//
// 小選挙区の選択肢を更新
// ---------------------------//
function updateDistrictOptions(prefectureId = "") {
  const select = document.getElementById("district");
  select.innerHTML = '<option value="">選択してください</option>';

  // prefectureId が指定されている場合だけ絞り込む
  const filtered = prefectureId
    ? districtsData.filter(d => d.prefecture_id == prefectureId)
    : districtsData;

  filtered.forEach(d => {
    const option = document.createElement("option");
    option.value = d.district_id;
    option.textContent = d.district_name;
    select.appendChild(option);
  });
}

// ---------------------------//
// イベントリスナー設定
// ---------------------------//
document.addEventListener("DOMContentLoaded", () => {
  const prefectureSelect = document.getElementById("prefecture");
  const districtSelect = document.getElementById("district");

  if (prefectureSelect) {
    loadPrefectures();
  }

  if (districtSelect) {
    loadDistricts();
  }

  if (prefectureSelect && districtSelect) {
    prefectureSelect.addEventListener("change", (e) => {
      const prefectureId = e.target.value;
      updateDistrictOptions(prefectureId);
    });
  }
});

// ---------------------------//
// プロフィール表示処理
// ---------------------------//

document.addEventListener("DOMContentLoaded", async () => {
  const user_id = sessionStorage.getItem("user_id");
  const profileDiv = document.getElementById("profileDisplay");

  if (!user_id) {
    if (profileDiv) profileDiv.textContent = "ログインしてください";
    return;
  }

  try {
    const res = await fetch(`http://localhost:8000/get_profile?user_id=${user_id}`);
    const result = await res.json();

    if (!result.success) {
      if (profileDiv) profileDiv.textContent = "プロフィールを取得できませんでした";
      console.error(result.error);
      return;
    }

    const data = result.data;

    // 生年月日を YYYY-MM-DD 形式に変換
    let birthFormatted = "";
    if (data.birth_date) {
      const birth = data.birth_date;
      if (birth.length === 8) {
        birthFormatted = `${birth.substr(0,4)}/${birth.substr(4,2)}/${birth.substr(6,2)}`;
      } else {
        birthFormatted = birth;
      }
    }

    if (profileDiv) {
      profileDiv.innerHTML = `
        <p><strong>ユーザーID:</strong> ${data.user_id}</p>
        <p><strong>電話番号:</strong> ${data.tel}</p>
        <p><strong>生年月日:</strong> ${birthFormatted}</p>
        <p><strong>性別:</strong> ${data.gender == 1 ? "男" : data.gender == 2 ? "女" : ""}</p>
        <p><strong>都道府県:</strong> ${data.prefecture_name || ""}</p>
        <p><strong>小選挙区:</strong> ${data.district_name || ""}</p>
        <a href="prof_update.html">プロフィール更新</a>
      `;
    }
  } catch (err) {
    console.error(err);
    if (profileDiv) profileDiv.textContent = "プロフィール取得中にエラーが発生しました";
  }
});

// ---------------------------//
// プロフィール更新処理
// ---------------------------//

document.addEventListener("DOMContentLoaded", () => {
  const profileForm = document.getElementById("profileForm");
  if (profileForm) {
    profileForm.addEventListener("submit", async (e) => {
      e.preventDefault();

      const user_id = sessionStorage.getItem("user_id");
      const birthInput = document.getElementById("birthdate").value;
      const birthDateFormatted = birthInput.replace(/-/g, "");

      const data = {
        user_id: user_id,
        birthdate: birthDateFormatted,
        gender: document.getElementById("gender").value,
        prefecture_id: document.getElementById("prefecture").value,
        district_id: document.getElementById("district").value
      };

      try {
        const res = await fetch("http://localhost:8000/update_profile", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(data)
        });

        if (!res.ok) {
          console.error("HTTPエラー:", res.status, res.statusText);
          const errText = await res.text();
          console.error("レスポンス本文:", errText);
          alert("サーバーエラーが発生しました");
          return;
        }

        const result = await res.json();
        console.log("サーバー応答:", result);

        if (result.success) {
          window.location.href = "prof.html"; // ← 成功したら遷移
        } else {
          console.error("更新失敗の詳細:", result.error);
          alert("更新に失敗しました");
        }

      } catch (err) {
        console.error("通信エラー:", err);
        alert("通信中にエラーが発生しました");
      }
    });
  }
});

// ---------------------------//
// 年代別投票データ取得と表示
// ---------------------------//

// 仮データ
const mockAgeVotes = [
  { age_group: "20代", party: "自民党", votes: 12 },
  { age_group: "20代", party: "立憲民主党", votes: 8 },
  { age_group: "30代", party: "自民党", votes: 15 },
  { age_group: "30代", party: "立憲民主党", votes: 5 },
  { age_group: "40代", party: "自民党", votes: 20 },
  { age_group: "40代", party: "立憲民主党", votes: 10 },
];

// 表示関数
function displayAgeVotes(data) {
  const container = document.getElementById("ageVoteTable");
  if (!container) return;

  container.innerHTML = ""; // 初期化

  if (!data || data.length === 0) {
    container.textContent = "年代別の投票データはありません";
    return;
  }

  const table = document.createElement("table");
  table.style.borderCollapse = "collapse";
  table.style.width = "100%";
  table.innerHTML = `
    <thead>
      <tr>
        <th style="border:1px solid #ccc;padding:5px">年代</th>
        <th style="border:1px solid #ccc;padding:5px">党名</th>
        <th style="border:1px solid #ccc;padding:5px">票数</th>
      </tr>
    </thead>
    <tbody>
      ${data.map(d => `
        <tr>
          <td style="border:1px solid #ccc;padding:5px">${d.age_group}</td>
          <td style="border:1px solid #ccc;padding:5px">${d.party}</td>
          <td style="border:1px solid #ccc;padding:5px">${d.votes}</td>
        </tr>`).join("")}
    </tbody>
  `;
  container.appendChild(table);
}

// 仮データをロードする関数
function loadAgeVotes() {
  displayAgeVotes(mockAgeVotes);
}

// ---------------------------//
// 初期化
// ---------------------------//

async function init() {
  const overlay = document.getElementById("loading-overlay");
  if (overlay) overlay.style.display = "flex";

  try {
    const data = await apiGet("/party");
    if (!data) { 
      alert("パーティデータ取得失敗"); 
      return; 
    }

    PARTIES = data;
    await loadVotesFromDB();
    createChart();
    refresh();
  } finally {
    if (overlay) overlay.style.display = "none";
  }
}


document.addEventListener("DOMContentLoaded", async () => {
  // ここで先にチャートなどを初期化してもOK
  await init();

  // 仮データを表示
  loadAgeVotes();
});
