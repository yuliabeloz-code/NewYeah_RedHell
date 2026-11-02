import hashlib
import hmac
import json
import os
import sqlite3
import time
from pathlib import Path
from urllib.parse import parse_qsl

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel


# =========================================
# НАСТРОЙКИ
#
# Значения задаются в настройках Render.
# Токен не нужно вставлять в этот файл.
# =========================================

BOT_TOKEN = os.environ.get("BOT_TOKEN", "")
FRONTEND_ORIGIN = os.environ.get("FRONTEND_ORIGIN", "")
DATABASE_PATH = os.environ.get("DATABASE_PATH", "users.db")

if not BOT_TOKEN:
    raise RuntimeError("Не задана переменная BOT_TOKEN.")

if not FRONTEND_ORIGIN:
    raise RuntimeError("Не задана переменная FRONTEND_ORIGIN.")


app = FastAPI()

# Разрешаем запросы только с указанного адреса сайта.
app.add_middleware(
    CORSMiddleware,
    allow_origins=[FRONTEND_ORIGIN],
    allow_methods=["GET", "POST"],
    allow_headers=["Content-Type"],
)


# =========================================
# БАЗА ДАННЫХ
# =========================================

def initialize_database():
    database_file = Path(DATABASE_PATH)

    # Если путь содержит папку, создаём её при необходимости.
    database_file.parent.mkdir(parents=True, exist_ok=True)

    with sqlite3.connect(DATABASE_PATH) as connection:
        connection.execute(
            """
            CREATE TABLE IF NOT EXISTS users (
                telegram_id INTEGER PRIMARY KEY,
                first_name TEXT NOT NULL,
                username TEXT,
                first_visit TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
                last_visit TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
            )
            """
        )


@app.on_event("startup")
def on_startup():
    initialize_database()


# =========================================
# ПРОВЕРКА ДАННЫХ TELEGRAM
# =========================================

def verify_telegram_data(init_data: str) -> dict:
    """
    Проверяет подпись initData и возвращает пользователя.
    """

    try:
        pairs = parse_qsl(
            init_data,
            keep_blank_values=True,
            strict_parsing=True,
            max_num_fields=100,
        )
    except ValueError:
        raise HTTPException(status_code=401, detail="Invalid init data")

    # Повторяющиеся поля не принимаем.
    keys = [key for key, _ in pairs]

    if len(keys) != len(set(keys)):
        raise HTTPException(status_code=401, detail="Duplicate fields")

    data = dict(pairs)
    received_hash = data.pop("hash", "")

    if not received_hash:
        raise HTTPException(status_code=401, detail="Missing hash")

    # Telegram требует отсортировать поля по имени.
    data_check_string = "\n".join(
        f"{key}={value}"
        for key, value in sorted(data.items())
    )

    secret_key = hmac.new(
        b"WebAppData",
        BOT_TOKEN.encode("utf-8"),
        hashlib.sha256,
    ).digest()

    calculated_hash = hmac.new(
        secret_key,
        data_check_string.encode("utf-8"),
        hashlib.sha256,
    ).hexdigest()

    if not hmac.compare_digest(calculated_hash, received_hash):
        raise HTTPException(status_code=401, detail="Invalid signature")

    # Не принимаем слишком старые данные.
    try:
        auth_date = int(data["auth_date"])
    except (KeyError, ValueError):
        raise HTTPException(status_code=401, detail="Invalid auth date")

    now = int(time.time())

    if auth_date > now + 60 or now - auth_date > 86400:
        raise HTTPException(status_code=401, detail="Expired init data")

    try:
        user = json.loads(data["user"])
    except (KeyError, json.JSONDecodeError):
        raise HTTPException(status_code=401, detail="Invalid user")

    if (
        not isinstance(user, dict)
        or type(user.get("id")) is not int
        or not isinstance(user.get("first_name"), str)
    ):
        raise HTTPException(status_code=401, detail="Invalid user")

    return user


# =========================================
# СОХРАНЕНИЕ ПОЛЬЗОВАТЕЛЯ
# =========================================

class UserRequest(BaseModel):
    init_data: str


@app.post("/api/me")
def save_user(request: UserRequest):
    user = verify_telegram_data(request.init_data)

    telegram_id = user["id"]
    first_name = user["first_name"]
    username = user.get("username")

    if username is not None and not isinstance(username, str):
        username = None

    with sqlite3.connect(DATABASE_PATH) as connection:
        connection.execute(
            """
            INSERT INTO users (telegram_id, first_name, username)
            VALUES (?, ?, ?)
            ON CONFLICT(telegram_id) DO UPDATE SET
                first_name = excluded.first_name,
                username = excluded.username,
                last_visit = CURRENT_TIMESTAMP
            """,
            (telegram_id, first_name, username),
        )

    return {
        "user": {
            "id": telegram_id,
            "name": first_name,
            "username": username,
        }
    }


# =========================================
# ПРОВЕРКА РАБОТЫ СЕРВЕРА
# =========================================

@app.get("/health")
def health():
    return {"status": "ok"}
