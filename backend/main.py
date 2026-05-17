from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from routes.health import router as health_router
from lib.config import settings
from routes.db_test import router as db_test_router
from routes.auth_test import router as auth_test_router
from routes.enroll import router as enroll_router
from routes.rooms import router as rooms_router
from routes.photos import router as photos_router

app = FastAPI(  title="FaceIt Backend", version="0.1")

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://127.0.0.1:3000",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(health_router)
app.include_router(db_test_router)
app.include_router(auth_test_router)
app.include_router(enroll_router)
app.include_router(rooms_router)
app.include_router(photos_router)

@app.get("/")
def root():
    return {
            "message": "FaceIt backend running",
            "superbase_configured": bool(settings.supabase_url),
            "secret_key_configured": bool(settings.supabase_secret_key)
            }
    