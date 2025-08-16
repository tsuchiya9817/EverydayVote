from sqlite3 import Cursor
from fastapi import FastAPI, Request # type: ignore
from fastapi.middleware.cors import CORSMiddleware # type: ignore
import mysql.connector  # type: ignore # MySQL接続用
from fastapi.responses import JSONResponse # type: ignore

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

@app.get("/party")
def get_parties():
    parties = fetch_all("""
        SELECT * 
        FROM parties
        ORDER BY ruling_party DESC, party_id ASC
    """)
    return parties

@app.get("/votes")
def get_votes():
    result = fetch_all("""
        SELECT p.name, COUNT(v.user_id) AS count
        FROM parties p
        LEFT JOIN votes v ON p.party_id = v.party_id
        GROUP BY p.party_id, p.name
        ORDER BY p.party_id
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

@app.post("/login")
async def login(req: Request):
    data = await req.json()
    user_id = data.get("user_id")
    password = data.get("password")

    print("Login try:", user_id, password)  # 送信された値をログ出力

    query = "SELECT * FROM users WHERE user_id = %s AND password = %s"
    result = fetch_all(query, (user_id, password))

    print("DB result:", result)  # DBから返ってきた結果をログ出力

    if result:  # 1件以上あればログイン成功
        print("Login success!")
        return {"success": True, "user_id": user_id}
    else:
        print("Login failed")
        return {"success": False}
    
@app.post("/register")
async def register(req: Request):
    data = await req.json()
    user_id = data.get("user_id")
    password = data.get("password")
    phone = data.get("phone")

    print("Register try:", phone, user_id, password)

    # 同じユーザーIDまたは電話番号が存在するかチェック
    query_check = "SELECT * FROM users WHERE user_id = %s OR tel = %s"
    existing = fetch_all(query_check, (user_id, phone))
    print("DB result (check):", existing)

    if existing:
        for row in existing:
            if row["user_id"] == user_id:
                return {"success": False, "message": "このユーザーIDは既に使われています"}
            if row["tel"] == phone:
                return {"success": False, "message": "この電話番号は既に使われています"}

    # 新規ユーザーを挿入
    query_insert = "INSERT INTO users (user_id, password, tel) VALUES (%s, %s, %s)"
    try:
        execute(query_insert, (user_id, password, phone))
        print("Register success!")
        return {"success": True}
    except Exception as e:
        print("Register failed:", e)
        return {"success": False, "message": "データベースエラー"}





