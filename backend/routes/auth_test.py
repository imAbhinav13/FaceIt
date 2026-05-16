from fastapi import APIRouter, Depends
from lib.auth import get_current_user

router = APIRouter()


@router.get("/auth-test")
def auth_test(user=Depends(get_current_user)):
    return {
        "authenticated": True,
        "user_id": user.id,
        "email": user.email
    }