from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.routes.livekit_routes import router as livekit_router

app = FastAPI(
    title="LiveKit Python Backend",
    version="1.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Change this in production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(livekit_router)


@app.get("/")
def health_check():
    return {
        "status": "ok",
        "service": "LiveKit Python Backend",
    }