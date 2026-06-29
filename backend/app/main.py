from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.scenarios import SCENARIOS

app = FastAPI(title="ASSIST-AI API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok"}


@app.get("/api/scenarios")
def get_scenarios() -> list[dict[str, str]]:
    return SCENARIOS
