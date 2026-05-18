from fastapi import APIRouter, Depends, HTTPException

from lib.auth import get_current_user
from lib.config import settings
from lib.supabase import supabase
from lib.utils import normalize_room_code, is_valid_room_code


router = APIRouter()


def get_room_by_code(room_code: str):
    response = (
        supabase
        .table("events")
        .select("id, room_code, name, status, expires_at, created_at")
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


def get_event_photo_ids(event_id: str) -> list[str]:
    response = (
        supabase
        .table("event_photos")
        .select("id")
        .eq("event_id", event_id)
        .execute()
    )

    return [row["id"] for row in response.data or []]


def create_signed_url(storage_path: str) -> str:
    response = (
        supabase
        .storage
        .from_(settings.supabase_event_photos_bucket)
        .create_signed_url(
            storage_path,
            settings.signed_url_ttl_seconds,
        )
    )

    signed_url = response.get("signedURL") or response.get("signed_url")

    if not signed_url:
        raise HTTPException(
            status_code=500,
            detail=f"Failed to create signed URL for {storage_path}"
        )

    return signed_url


@router.get("/rooms/{code}/my-photos")
def get_my_photos(code: str, user=Depends(get_current_user)):
    room_code = normalize_room_code(code)

    if not is_valid_room_code(room_code):
        raise HTTPException(
            status_code=400,
            detail="Invalid room code format"
        )

    room = get_room_by_code(room_code)

    if room["status"] != "ready":
        return {
            "success": True,
            "room": {
                "id": room["id"],
                "room_code": room["room_code"],
                "name": room["name"],
                "status": room["status"],
            },
            "photos": [],
            "message": f"Room is currently {room['status']}. Photos are not ready yet."
        }

    photo_ids = get_event_photo_ids(room["id"])

    if not photo_ids:
        return {
            "success": True,
            "room": {
                "id": room["id"],
                "room_code": room["room_code"],
                "name": room["name"],
                "status": room["status"],
            },
            "photos": [],
            "message": "No photos found in this room."
        }

    matches_response = (
        supabase
        .table("photo_matches")
        .select("id, photo_id, confidence, status, matched_at")
        .eq("user_id", user.id)
        .eq("status", "confirmed")
        .in_("photo_id", photo_ids)
        .order("confidence", desc=True)
        .execute()
    )

    matches = matches_response.data or []

    if not matches:
        return {
            "success": True,
            "room": {
                "id": room["id"],
                "room_code": room["room_code"],
                "name": room["name"],
                "status": room["status"],
            },
            "photos": [],
            "message": "No confirmed photo matches found yet."
        }

    matched_photo_ids = [match["photo_id"] for match in matches]

    photos_response = (
        supabase
        .table("event_photos")
        .select("id, storage_path, processing_status, uploaded_at")
        .in_("id", matched_photo_ids)
        .execute()
    )

    photos_by_id = {
        photo["id"]: photo
        for photo in photos_response.data or []
    }

    gallery_photos = []

    for match in matches:
        photo = photos_by_id.get(match["photo_id"])

        if not photo:
            continue

        signed_url = create_signed_url(photo["storage_path"])

        gallery_photos.append({
            "match_id": match["id"],
            "photo_id": match["photo_id"],
            "confidence": match["confidence"],
            "status": match["status"],
            "matched_at": match["matched_at"],
            "storage_path": photo["storage_path"],
            "signed_url": signed_url,
        })

    return {
        "success": True,
        "room": {
            "id": room["id"],
            "room_code": room["room_code"],
            "name": room["name"],
            "status": room["status"],
        },
        "signed_url_ttl_seconds": settings.signed_url_ttl_seconds,
        "photos": gallery_photos,
        "message": None,
    }