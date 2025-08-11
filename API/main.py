from fastapi import FastAPI # type: ignore
from fastapi.middleware.cors import CORSMiddleware # type: ignore
import mysql.connector  # type: ignore # MySQL接続用

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

@app.get("/message")
def get_message():
    return {"message": "こんにちは！これはAPIからのレスポンスです。"}

@app.get("/users")
def get_users():
    conn = mysql.connector.connect(**db_config)
    cursor = conn.cursor(dictionary=True)
    cursor.execute("SELECT user_name FROM Users WHERE id = 1")
    users = cursor.fetchall()
    cursor.close()
    conn.close()
    return {"users": users}
