from fastapi import APIRouter, Depends, HTTPException

from lib.auth import get_current_user
from lib.supabase import supabase
from lib.utils import normalize_room_code, is_valid_room_code


router = APIRouter()


def get_room_by_code(room_code: str):
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

    return response.data[0]


def get_user_face_embedding(user_id: str):
    response = (
        supabase
        .table("face_embeddings")
        .select("id, user_id, created_at")
        .eq("user_id", user_id)
        .limit(1)
        .execute()
    )

    if not response.data:
        return None

    return response.data[0]


def get_existing_active_match_job(event_id: str, user_id: str):
    response = (
        supabase
        .table("job_queue")
        .select("id, status")
        .eq("job_type", "match_user")
        .eq("payload->>event_id", event_id)
        .eq("payload->>user_id", user_id)
        .in_("status", ["pending", "processing"])
        .limit(1)
        .execute()
    )

    if not response.data:
        return None

    return response.data[0]


def create_match_user_job(event_id: str, room_code: str, user_id: str):
    response = (
        supabase
        .table("job_queue")
        .insert({
            "job_type": "match_user",
            "payload": {
                "event_id": event_id,
                "room_code": room_code,
                "user_id": user_id,
            },
            "status": "pending",
        })
        .execute()
    )

    if not response.data:
        raise HTTPException(
            status_code=500,
            detail="Failed to create match job"
        )

    return response.data[0]


@router.post("/rooms/{code}/join")
def join_room(code: str, user=Depends(get_current_user)):
    room_code = normalize_room_code(code)

    if not is_valid_room_code(room_code):
        raise HTTPException(
            status_code=400,
            detail="Invalid room code format"
        )

    room = get_room_by_code(room_code)

    user_embedding = get_user_face_embedding(user.id)

    if not user_embedding:
        raise HTTPException(
            status_code=400,
            detail="Face enrollment required before joining a room"
        )

    can_match = room["status"] == "ready"

    if not can_match:
        return {
            "success": True,
            "status": "validated",
            "can_match": False,
            "reason": f"Room is currently {room['status']}",
            "room": {
                "id": room["id"],
                "room_code": room["room_code"],
                "name": room["name"],
                "status": room["status"],
                "expires_at": room["expires_at"],
                "created_at": room["created_at"],
            },
            "user": {
                "id": user.id,
                "email": user.email,
                "has_face_embedding": True,
            },
            "job": None,
        }

    existing_job = get_existing_active_match_job(
        event_id=room["id"],
        user_id=user.id,
    )

    if existing_job:
        return {
            "success": True,
            "status": "matching",
            "can_match": True,
            "reason": None,
            "room": {
                "id": room["id"],
                "room_code": room["room_code"],
                "name": room["name"],
                "status": room["status"],
                "expires_at": room["expires_at"],
                "created_at": room["created_at"],
            },
            "user": {
                "id": user.id,
                "email": user.email,
                "has_face_embedding": True,
            },
            "job": {
                "id": existing_job["id"],
                "status": existing_job["status"],
                "deduplicated": True,
            },
        }

    job = create_match_user_job(
        event_id=room["id"],
        room_code=room["room_code"],
        user_id=user.id,
    )

    return {
        "success": True,
        "status": "matching",
        "can_match": True,
        "reason": None,
        "room": {
            "id": room["id"],
            "room_code": room["room_code"],
            "name": room["name"],
            "status": room["status"],
            "expires_at": room["expires_at"],
            "created_at": room["created_at"],
        },
        "user": {
            "id": user.id,
            "email": user.email,
            "has_face_embedding": True,
        },
        "job": {
            "id": job["id"],
            "status": job["status"],
            "deduplicated": False,
        },
    }

@router.get("/rooms/{code}/match-status")
def get_match_status(code: str, user=Depends(get_current_user)):
    room_code = normalize_room_code(code)

    if not is_valid_room_code(room_code):
        raise HTTPException(
            status_code=400,
            detail="Invalid room code format"
        )

    room = get_room_by_code(room_code)

    # Find latest match_user job for this user + event
    job_response = (
        supabase
        .table("job_queue")
        .select("id, status, error, created_at, started_at, completed_at")
        .eq("job_type", "match_user")
        .eq("payload->>event_id", room["id"])
        .eq("payload->>user_id", user.id)
        .order("created_at", desc=True)
        .limit(1)
        .execute()
    )

    if job_response.data:
        latest_job = job_response.data[0]
        match_job_status = latest_job["status"]
        job = {
            "id": latest_job["id"],
            "status": latest_job["status"],
            "error": latest_job.get("error"),
            "created_at": latest_job.get("created_at"),
            "started_at": latest_job.get("started_at"),
            "completed_at": latest_job.get("completed_at"),
        }
    else:
        match_job_status = "not_started"
        job = None

    # Get event photo IDs so we only count matches for this room
    photos_response = (
        supabase
        .table("event_photos")
        .select("id")
        .eq("event_id", room["id"])
        .execute()
    )

    photo_ids = [photo["id"] for photo in photos_response.data or []]

    matched_count = 0
    review_count = 0

    if photo_ids:
        confirmed_response = (
            supabase
            .table("photo_matches")
            .select("id")
            .eq("user_id", user.id)
            .eq("status", "confirmed")
            .in_("photo_id", photo_ids)
            .execute()
        )

        review_response = (
            supabase
            .table("photo_matches")
            .select("id")
            .eq("user_id", user.id)
            .eq("status", "review")
            .in_("photo_id", photo_ids)
            .execute()
        )

        matched_count = len(confirmed_response.data or [])
        review_count = len(review_response.data or [])

    return {
        "success": True,
        "room": {
            "id": room["id"],
            "room_code": room["room_code"],
            "name": room["name"],
            "status": room["status"],
        },
        "match_job_status": match_job_status,
        "job": job,
        "matched_count": matched_count,
        "review_count": review_count,
    }