from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel

from lib.auth import get_current_user
from lib.supabase import supabase
from lib.utils import (
    generate_room_code,
    normalize_room_code,
    is_valid_room_code,
)


router = APIRouter()


class CreateRoomRequest(BaseModel):
    name: str
    room_code: str | None = None


def room_code_exists(room_code: str) -> bool:
    response = (
        supabase
        .table("events")
        .select("id")
        .eq("room_code", room_code)
        .limit(1)
        .execute()
    )

    return len(response.data) > 0


def generate_unique_room_code() -> str:
    max_attempts = 10

    for _ in range(max_attempts):
        room_code = generate_room_code()

        if not room_code_exists(room_code):
            return room_code

    raise HTTPException(
        status_code=500,
        detail="Unable to generate a unique room code. Please try again."
    )


@router.post("/rooms")
def create_room(payload: CreateRoomRequest, user=Depends(get_current_user)):
    event_name = payload.name.strip()

    if not event_name:
        raise HTTPException(
            status_code=400,
            detail="Event name is required"
        )

    if payload.room_code:
        room_code = normalize_room_code(payload.room_code)

        if not is_valid_room_code(room_code):
            raise HTTPException(
                status_code=400,
                detail="Room code must be exactly 6 characters and cannot include 0, O, I, or 1"
            )

        if room_code_exists(room_code):
            raise HTTPException(
                status_code=409,
                detail="Room code already exists. Please choose another code."
            )
    else:
        room_code = generate_unique_room_code()

    expires_at = datetime.now(timezone.utc) + timedelta(days=30)

    response = (
        supabase
        .table("events")
        .insert({
            "room_code": room_code,
            "created_by": user.id,
            "name": event_name,
            "status": "created",
            "expires_at": expires_at.isoformat(),
        })
        .execute()
    )

    if not response.data:
        raise HTTPException(
            status_code=500,
            detail="Failed to create room"
        )

    event = response.data[0]

    return {
        "success": True,
        "event": {
            "id": event["id"],
            "room_code": event["room_code"],
            "created_by": event["created_by"],
            "name": event["name"],
            "status": event["status"],
            "expires_at": event["expires_at"],
        }
    }


@router.get("/rooms/{code}")
def get_room(code: str, user=Depends(get_current_user)):
    room_code = normalize_room_code(code)

    if not is_valid_room_code(room_code):
        raise HTTPException(
            status_code=400,
            detail="Invalid room code format"
        )

    response = (
        supabase
        .table("events")
        .select("id, room_code, created_by, name, status, expires_at, created_at")
        .eq("room_code", room_code)
        .limit(1)
        .execute()
    )

    if not response.data:
        raise HTTPException(
            status_code=404,
            detail="Room not found"
        )

    event = response.data[0]

    return {
        "success": True,
        "event": {
            "id": event["id"],
            "room_code": event["room_code"],
            "created_by": event["created_by"],
            "name": event["name"],
            "status": event["status"],
            "expires_at": event["expires_at"],
            "created_at": event["created_at"],
            "is_uploader": event["created_by"] == user.id,
        }
    }