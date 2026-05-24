import uuid
from concurrent.futures import ThreadPoolExecutor
from typing import Literal

from datetime import datetime, timedelta, timezone
from fastapi import APIRouter, BackgroundTasks, HTTPException, Request
from pydantic import BaseModel
from slowapi import Limiter
from slowapi.util import get_remote_address

from lib.config import settings
from lib.face import (
    generate_embeddings_from_base64_frames,
    average_embeddings,
)
from lib.supabase import supabase
from lib.utils import normalize_room_code, is_valid_room_code


router = APIRouter()

limiter = Limiter(key_func=get_remote_address)

guest_sessions: dict[str, dict] = {}

executor = ThreadPoolExecutor(max_workers=1)


class GuestMatchRequest(BaseModel):
    frames: list[str]


GuestSessionStatus = Literal["pending", "processing", "done", "failed"]


def vector_to_pgvector(values: list[float]) -> str:
    return "[" + ",".join(str(value) for value in values) + "]"


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
        raise RuntimeError(f"Failed to create signed URL for {storage_path}")

    return signed_url


def run_pgvector_match(event_id: str, embedding: str) -> list[dict]:
    response = (
        supabase
        .rpc(
            "match_photo_faces_for_event",
            {
                "p_event_id": event_id,
                "p_embedding": embedding,
            },
        )
        .execute()
    )

    return response.data or []


def bucket_match(similarity: float) -> str | None:
    if similarity >= settings.confirmed_threshold:
        return "confirmed"

    if similarity >= settings.review_threshold:
        return "review"

    return None


def deduplicate_best_match_per_photo(rows: list[dict]) -> list[dict]:
    best_by_photo: dict[str, dict] = {}

    for row in rows:
        photo_id = row["photo_id"]
        similarity = float(row["similarity"])

        current_best = best_by_photo.get(photo_id)

        if current_best is None:
            best_by_photo[photo_id] = row
            continue

        if similarity > float(current_best["similarity"]):
            best_by_photo[photo_id] = row

    return list(best_by_photo.values())


def get_photos_by_ids(photo_ids: list[str]) -> dict[str, dict]:
    if not photo_ids:
        return {}

    response = (
        supabase
        .table("event_photos")
        .select("id, storage_path")
        .in_("id", photo_ids)
        .execute()
    )

    return {
        photo["id"]: photo
        for photo in response.data or []
    }


def build_guest_gallery_results(best_matches: list[dict]) -> list[dict]:
    confirmed_matches = []

    for match in best_matches:
        similarity = float(match["similarity"])
        status = bucket_match(similarity)

        if status != "confirmed":
            continue

        confirmed_matches.append({
            "photo_id": match["photo_id"],
            "face_id": match.get("face_id"),
            "confidence": similarity,
            "status": status,
        })

    photo_ids = [
        match["photo_id"]
        for match in confirmed_matches
    ]

    photos_by_id = get_photos_by_ids(photo_ids)

    gallery_photos = []

    for match in confirmed_matches:
        photo = photos_by_id.get(match["photo_id"])

        if not photo:
            continue

        signed_url = create_signed_url(photo["storage_path"])

        gallery_photos.append({
            "photo_id": match["photo_id"],
            "face_id": match.get("face_id"),
            "confidence": match["confidence"],
            "status": match["status"],
            "signed_url": signed_url,
            "storage_path": photo["storage_path"],
        })

    return gallery_photos


def run_guest_match_job(
    session_id: str,
    room: dict,
    frames: list[str],
):
    try:
        guest_sessions[session_id]["status"] = "processing"

        embeddings = generate_embeddings_from_base64_frames(frames)
        averaged_embedding = average_embeddings(embeddings)
        embedding_as_vector = vector_to_pgvector(averaged_embedding)

        raw_matches = run_pgvector_match(
            event_id=room["id"],
            embedding=embedding_as_vector,
        )

        best_matches = deduplicate_best_match_per_photo(raw_matches)

        photos = build_guest_gallery_results(best_matches)

        if not photos:
            message = (
                "No photos found for this selfie. Try better lighting, face "
                "the camera clearly, or ask the uploader to review uncertain matches."
            )
        else:
            message = None

        guest_sessions[session_id].update({
            "status": "done",
            "photos": photos,
            "message": message,
            "error": None,
        })

    except Exception as e:
        guest_sessions[session_id].update({
            "status": "failed",
            "photos": [],
            "message": None,
            "error": str(e),
        })


@router.post("/rooms/{code}/guest/validate")
def validate_guest_room(code: str):
    room_code = normalize_room_code(code)

    if not is_valid_room_code(room_code):
        raise HTTPException(
            status_code=400,
            detail="Invalid room code format"
        )

    room = get_room_by_code(room_code)

    can_join_as_guest = room["status"] == "ready"

    return {
        "success": True,
        "can_join_as_guest": can_join_as_guest,
        "reason": None if can_join_as_guest else f"Room is currently {room['status']}",
        "room": {
            "id": room["id"],
            "room_code": room["room_code"],
            "name": room["name"],
            "status": room["status"],
            "expires_at": room["expires_at"],
            "created_at": room["created_at"],
        },
    }


@router.post("/rooms/{code}/guest-match")
@limiter.limit("3/hour")
def start_guest_match(
    request: Request,
    code: str,
    payload: GuestMatchRequest,
    background_tasks: BackgroundTasks,
):
    room_code = normalize_room_code(code)

    if not is_valid_room_code(room_code):
        raise HTTPException(
            status_code=400,
            detail="Invalid room code format"
        )

    if len(payload.frames) != 3:
        raise HTTPException(
            status_code=400,
            detail="Exactly 3 selfie frames are required"
        )

    room = get_room_by_code(room_code)

    if room["status"] != "ready":
        return {
            "success": True,
            "can_match": False,
            "reason": f"Room is currently {room['status']}",
            "room": {
                "id": room["id"],
                "room_code": room["room_code"],
                "name": room["name"],
                "status": room["status"],
            },
            "guest_session_id": None,
        }

    session_id = str(uuid.uuid4())

    guest_sessions[session_id] = {
        "status": "pending",
        "created_at": datetime.now(timezone.utc),
        "room": {
            "id": room["id"],
            "room_code": room["room_code"],
            "name": room["name"],
            "status": room["status"],
        },
        "photos": [],
        "message": None,
        "error": None,
    }

    background_tasks.add_task(
        run_guest_match_job,
        session_id,
        room,
        payload.frames,
    )

    return {
        "success": True,
        "can_match": True,
        "guest_session_id": session_id,
        "status": "pending",
        "room": {
            "id": room["id"],
            "room_code": room["room_code"],
            "name": room["name"],
            "status": room["status"],
        },
    }


@router.get("/rooms/{code}/guest-status/{session_id}")
def get_guest_status(code: str, session_id: str):
    room_code = normalize_room_code(code)

    if not is_valid_room_code(room_code):
        raise HTTPException(
            status_code=400,
            detail="Invalid room code format"
        )

    session = guest_sessions.get(session_id)

    if not session:
        raise HTTPException(
            status_code=404,
            detail="Guest session not found or expired"
        )

    if session["room"]["room_code"] != room_code:
        raise HTTPException(
            status_code=400,
            detail="Guest session does not belong to this room"
        )

    return {
        "success": True,
        "guest_session_id": session_id,
        "status": session["status"],
        "room": session["room"],
        "photos": session["photos"],
        "message": session["message"],
        "error": session["error"],
        "signed_url_ttl_seconds": settings.signed_url_ttl_seconds,
    }


def cleanup_expired_guest_sessions(max_age_hours: int = 2) -> int:
    cutoff = datetime.now(timezone.utc) - timedelta(hours=max_age_hours)

    expired_session_ids = []

    for session_id, session in guest_sessions.items():
        created_at = session.get("created_at")

        if created_at and created_at < cutoff:
            expired_session_ids.append(session_id)

    for session_id in expired_session_ids:
        guest_sessions.pop(session_id, None)

    if expired_session_ids:
        print(
            f"Guest session cleanup: removed {len(expired_session_ids)} expired session(s)."
        )

    return len(expired_session_ids)