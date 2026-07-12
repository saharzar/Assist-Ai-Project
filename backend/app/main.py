from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.core.config import get_settings
from app.routes import admin, auth, guests, stt, tts, users
from app.scenarios import SCENARIOS

settings = get_settings()
app = FastAPI(title="ASSIST-AI API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        settings.frontend_origin,
    ],
    allow_origin_regex=r"^http://(localhost|127\.0\.0\.1):\d+$",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
    expose_headers=[
        "X-TTS-Limit-Characters",
        "X-TTS-Remaining-Characters",
        "X-TTS-Reset-Date",
        "X-TTS-Used-Characters",
        "X-TTS-Language",
        "X-TTS-Cache",
        "X-STT-Limit-Seconds",
        "X-STT-Remaining-Seconds",
        "X-STT-Used-Seconds",
    ],
)

app.include_router(auth.router)
app.include_router(guests.router)
app.include_router(users.router)
app.include_router(admin.router)
app.include_router(tts.router)
app.include_router(stt.router)


@app.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok"}


@app.get("/api/scenarios")
def get_scenarios() -> list[dict[str, str]]:
    return SCENARIOS
