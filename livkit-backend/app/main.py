from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.core.config import settings
from app.routes.livekit_routes import router as livekit_router

app = FastAPI(
    title="LiveKit Python Backend",
    version="1.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_allowed_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(livekit_router)


@app.on_event("startup")
def validate_settings_on_startup() -> None:
    settings.validate_livekit_settings()


@app.get("/")
def health_check():
    return {
        "status": "ok",
        "service": "LiveKit Python Backend",
    }