from fastapi import FastAPI

from routes.health import router as health_router
from lib.config import settings
from routes.db_test import router as db_test_router

app = FastAPI(  title="FaceIt Backend", version="0.1")

app.include_router(health_router)
app.include_router(db_test_router)

@app.get("/")
def root():
    return {
            "message": "FaceIt backend running",
            "superbase_configured": bool(settings.supabase_url),
            "secret_key_configured": bool(settings.supabase_secret_key)
            }
    