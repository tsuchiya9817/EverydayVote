from fastapi import FastAPI  # type: ignore
from fastapi.middleware.cors import CORSMiddleware # type: ignore

app = FastAPI()

# CORS許可（GitHub PagesやローカルHTMLからアクセスできるようにする）
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # 必要に応じて特定ドメインに絞る
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/message")
def get_message():
    return {"message": "こんにちは！これはAPIからのレスポンスです。"}
