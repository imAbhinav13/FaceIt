from fastapi import APIRouter
from lib.supabase import supabase

router = APIRouter()

@router.get("/db_test")
def db_test():
    response = supabase.table("events").select("*").execute()

    return {
        "success": True,
        "table": "events",
        "count": len(response.data)
    }