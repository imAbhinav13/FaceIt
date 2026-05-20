from fastapi import APIRouter, Depends, HTTPException

from lib.auth import get_current_user
from lib.config import settings
from lib.supabase import supabase
from lib.utils import normalize_room_code, is_valid_room_code

from pydantic import BaseModel
from typing import Literal

router = APIRouter()

REVIEW_LIMIT = 50
class UpdateMatchStatusRequest(BaseModel):
    status: Literal["confirmed", "rejected"]


def get_room_by_code(room_code: str):
    response = (
        supabase
        .table("events")
        .select("id, room_code, name, status, created_by")
        .eq("room_code", room_code)
        .limit(1)
        .execute()
    )

    if not response.data:
        raise HTTPException(status_code=404, detail="Room not found")

    return response.data[0]


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


@router.get("/rooms/{code}/review")
def get_review_queue(code: str, user=Depends(get_current_user)):
    room_code = normalize_room_code(code)

    if not is_valid_room_code(room_code):
        raise HTTPException(status_code=400, detail="Invalid room code format")

    room = get_room_by_code(room_code)

    if room["created_by"] != user.id:
        raise HTTPException(
            status_code=403,
            detail="Only the room uploader can view the review queue"
        )

    photos_response = (
        supabase
        .table("event_photos")
        .select("id, storage_path")
        .eq("event_id", room["id"])
        .execute()
    )

    photos = photos_response.data or []
    photo_ids = [photo["id"] for photo in photos]

    if not photo_ids:
        return {
            "success": True,
            "room": {
                "id": room["id"],
                "room_code": room["room_code"],
                "name": room["name"],
                "status": room["status"],
            },
            "matches": [],
            "count": 0,
            "limit": REVIEW_LIMIT,
            "has_more": False,
            "message": "No photos found in this room.",
        }

    photos_by_id = {
        photo["id"]: photo
        for photo in photos
    }

    matches_response = (
        supabase
        .table("photo_matches")
        .select(
            "id, photo_id, photo_face_id, user_id, confidence, status, matched_at"
        )
        .eq("status", "review")
        .in_("photo_id", photo_ids)
        .order("confidence", desc=True)
        .limit(REVIEW_LIMIT + 1)
        .execute()
    )

    raw_matches = matches_response.data or []
    has_more = len(raw_matches) > REVIEW_LIMIT
    matches = raw_matches[:REVIEW_LIMIT]

    face_ids = [
        match["photo_face_id"]
        for match in matches
        if match.get("photo_face_id")
    ]

    faces_by_id = {}

    if face_ids:
        faces_response = (
            supabase
            .table("photo_faces")
            .select("id, bounding_box")
            .in_("id", face_ids)
            .execute()
        )

        faces_by_id = {
            face["id"]: face
            for face in faces_response.data or []
        }

    review_items = []

    for match in matches:
        photo = photos_by_id.get(match["photo_id"])

        if not photo:
            continue

        face = faces_by_id.get(match.get("photo_face_id"))

        review_items.append({
            "match_id": match["id"],
            "photo_id": match["photo_id"],
            "photo_face_id": match.get("photo_face_id"),
            "user_id": match["user_id"],
            "confidence": match["confidence"],
            "status": match["status"],
            "matched_at": match["matched_at"],
            "bounding_box": face.get("bounding_box") if face else None,
            "storage_path": photo["storage_path"],
            "signed_url": create_signed_url(photo["storage_path"]),
        })

    return {
        "success": True,
        "room": {
            "id": room["id"],
            "room_code": room["room_code"],
            "name": room["name"],
            "status": room["status"],
        },
        "matches": review_items,
        "count": len(review_items),
        "limit": REVIEW_LIMIT,
        "has_more": has_more,
        "message": None if review_items else "No photos need review.",
    }

@router.patch("/matches/{match_id}")
def update_match_status(
    match_id: str,
    body: UpdateMatchStatusRequest,
    user=Depends(get_current_user),
):
    # Step 1: Find the photo match
    match_response = (
        supabase
        .table("photo_matches")
        .select(
            "id, photo_id, user_id, confidence, status, photo_face_id"
        )
        .eq("id", match_id)
        .limit(1)
        .execute()
    )

    if not match_response.data:
        raise HTTPException(
            status_code=404,
            detail="Photo match not found"
        )

    match = match_response.data[0]

    # Step 2: Find photo → event relationship
    photo_response = (
        supabase
        .table("event_photos")
        .select("id, event_id")
        .eq("id", match["photo_id"])
        .limit(1)
        .execute()
    )

    if not photo_response.data:
        raise HTTPException(
            status_code=404,
            detail="Event photo not found"
        )

    photo = photo_response.data[0]

    # Step 3: Verify uploader ownership
    event_response = (
        supabase
        .table("events")
        .select("id, room_code, name, created_by")
        .eq("id", photo["event_id"])
        .limit(1)
        .execute()
    )

    if not event_response.data:
        raise HTTPException(
            status_code=404,
            detail="Event not found"
        )

    event = event_response.data[0]

    if event["created_by"] != user.id:
        raise HTTPException(
            status_code=403,
            detail="Only the room uploader can approve or reject matches"
        )

    # Step 4: Update status
    update_response = (
        supabase
        .table("photo_matches")
        .update({
            "status": body.status
        })
        .eq("id", match_id)
        .execute()
    )

    updated_match = (
        update_response.data[0]
        if update_response.data
        else None
    )

    return {
        "success": True,
        "room": {
            "id": event["id"],
            "room_code": event["room_code"],
            "name": event["name"],
        },
        "match": updated_match,
        "message": f"Match updated to {body.status}",
    }