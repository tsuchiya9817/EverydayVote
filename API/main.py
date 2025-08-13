from fastapi import FastAPI # type: ignore
from fastapi.middleware.cors import CORSMiddleware # type: ignore
import mysql.connector  # type: ignore # MySQL接続用

# // ＊＊＊＊＊＊＊＊＊＊＊＊＊＊＊＊＊＊＊＊＊＊＊＊＊＊＊＊＊＊＊＊＊＊＊＊＊＊＊＊＊＊＊＊＊＊＊＊＊＊＊＊＊＊＊＊＊＊＊＊＊＊＊＊＊＊＊＊＊＊＊＊＊＊＊＊＊＊＊＊＊＊＊＊＊＊＊＊＊＊＊＊＊＊＊＊＊＊＊＊//#
# // API起動コマンド                                                                                                                                                                        //#
# // ＊＊＊＊＊＊＊＊＊＊＊＊＊＊＊＊＊＊＊＊＊＊＊＊＊＊＊＊＊＊＊＊＊＊＊＊＊＊＊＊＊＊＊＊＊＊＊＊＊＊＊＊＊＊＊＊＊＊＊＊＊＊＊＊＊＊＊＊＊＊＊＊＊＊＊＊＊＊＊＊＊＊＊＊＊＊＊＊＊＊＊＊＊＊＊＊＊＊＊＊//#

# cd git\EverydayVotes\API
# uvicorn main:app --reload


app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# MySQL接続情報
db_config = {
    "host": "127.0.0.1",
    "user": "root",
    "password": "CcXxZz12",
    "database": "EverydayVote",
}

# ---------------------------
# 共通関数
# ---------------------------

def get_db_connection():
    """DB接続を返す"""
    return mysql.connector.connect(**db_config)

def fetch_all(query, params=None):
    """SELECT結果を辞書形式で取得"""
    conn = get_db_connection()
    cursor = conn.cursor(dictionary=True)
    cursor.execute(query, params or ())
    result = cursor.fetchall()
    cursor.close()
    conn.close()
    return result

def execute(query, params=None):
    """INSERT/UPDATE/DELETEを実行"""
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute(query, params or ())
    conn.commit()
    cursor.close()
    conn.close()

# ---------------------------
# API
# ---------------------------

@app.get("/users")
def get_users():
    users = fetch_all("SELECT user_name FROM Users")
    return {"users": users}

@app.get("/party")
def get_parties():
    parties = fetch_all("SELECT id, name FROM parties")
    return parties

@app.get("/votes")
def get_votes():
    result = fetch_all("""
        SELECT p.name, COUNT(v.user_id) AS count
        FROM parties p
        LEFT JOIN votes v ON p.id = v.party_id
        GROUP BY p.id, p.name
        ORDER BY p.id
    """)
    # {"自由民主党": 10, "公明党": 5, ...} の形に変換
    votes_dict = {row['name']: row['count'] for row in result}
    return votes_dict

@app.post("/vote")
async def vote_party(vote: dict):
    user_id = vote.get("user_id")
    party_id = vote.get("party_id")
    if not user_id or not party_id:
        return {"error": "user_id と party_id が必要です"}

    # 既存投票を削除（1ユーザ1投票）
    execute("DELETE FROM votes WHERE user_id = %s", (user_id,))
    # 新しい投票を挿入
    execute("INSERT INTO votes (user_id, party_id) VALUES (%s, %s)", (user_id, party_id))

    return {"message": "投票を保存しました"}



