import mimetypes
import uuid
from pathlib import Path

from fastapi import APIRouter, Depends, File, HTTPException, UploadFile

from lib.auth import get_current_user
from lib.config import settings
from lib.supabase import supabase
from lib.utils import normalize_room_code, is_valid_room_code


router = APIRouter()

ALLOWED_CONTENT_TYPES = {
    "image/jpeg": ".jpg",
    "image/png": ".png",
    "image/webp": ".webp",
}


def get_room_by_code(room_code: str):
    response = (
        supabase
        .table("events")
        .select("id, room_code, created_by, name, status")
        .eq("room_code", room_code)
        .limit(1)
        .execute()
    )

    if not response.data:
        raise HTTPException(status_code=404, detail="Room not found")

    return response.data[0]


@router.post("/rooms/{code}/photos")
async def upload_room_photos(
    code: str,
    files: list[UploadFile] = File(...),
    user=Depends(get_current_user),
):
    room_code = normalize_room_code(code)

    if not is_valid_room_code(room_code):
        raise HTTPException(status_code=400, detail="Invalid room code format")

    room = get_room_by_code(room_code)

    if room["created_by"] != user.id:
        raise HTTPException(
            status_code=403,
            detail="Only the room creator can upload photos"
        )

    if not files:
        raise HTTPException(status_code=400, detail="No files uploaded")

    uploaded_photos = []

    for file in files:
        content_type = file.content_type

        if content_type not in ALLOWED_CONTENT_TYPES:
            raise HTTPException(
                status_code=400,
                detail=f"Unsupported file type: {content_type}"
            )

        file_bytes = await file.read()

        if not file_bytes:
            raise HTTPException(
                status_code=400,
                detail=f"Empty file uploaded: {file.filename}"
            )

        photo_id = str(uuid.uuid4())
        extension = ALLOWED_CONTENT_TYPES[content_type]

        storage_path = f"events/{room['id']}/{photo_id}{extension}"

        try:
            supabase.storage.from_(
                settings.supabase_event_photos_bucket
            ).upload(
                path=storage_path,
                file=file_bytes,
                file_options={
                    "content-type": content_type,
                    "upsert": "false",
                },
            )

            photo_response = (
                supabase
                .table("event_photos")
                .insert({
                    "id": photo_id,
                    "event_id": room["id"],
                    "storage_path": storage_path,
                    "processing_status": "pending",
                })
                .execute()
            )

            if not photo_response.data:
                raise Exception("Failed to insert event photo row")

            job_response = (
                supabase
                .table("job_queue")
                .insert({
                    "job_type": "process_photo",
                    "payload": {
                        "event_id": room["id"],
                        "photo_id": photo_id,
                        "storage_path": storage_path,
                    },
                    "status": "pending",
                })
                .execute()
            )

            if not job_response.data:
                raise Exception("Failed to insert process_photo job")

            uploaded_photos.append({
                "photo_id": photo_id,
                "filename": file.filename,
                "storage_path": storage_path,
                "processing_status": "pending",
            })

        except Exception as e:
            raise HTTPException(
                status_code=500,
                detail=f"Failed to upload {file.filename}: {str(e)}"
            )

    (
        supabase
        .table("events")
        .update({
            "status": "processing"
        })
        .eq("id", room["id"])
        .execute()
    )

    return {
        "success": True,
        "room_code": room_code,
        "event_id": room["id"],
        "uploaded_count": len(uploaded_photos),
        "photos": uploaded_photos,
    }

@router.get("/rooms/{code}/status")
def get_room_photo_status(code: str, user=Depends(get_current_user)):
    room_code = normalize_room_code(code)

    if not is_valid_room_code(room_code):
        raise HTTPException(status_code=400, detail="Invalid room code format")

    room = get_room_by_code(room_code)

    if room["created_by"] != user.id:
        raise HTTPException(
            status_code=403,
            detail="Only the room creator can view upload status"
        )

    photos_response = (
        supabase
        .table("event_photos")
        .select("id, processing_status")
        .eq("event_id", room["id"])
        .execute()
    )

    photos = photos_response.data or []

    total = len(photos)
    done = len([p for p in photos if p["processing_status"] == "done"])
    failed = len([p for p in photos if p["processing_status"] == "failed"])
    processing = len([p for p in photos if p["processing_status"] == "processing"])
    pending = len([p for p in photos if p["processing_status"] == "pending"])

    return {
        "success": True,
        "room_code": room_code,
        "event_id": room["id"],
        "room_status": room["status"],
        "total": total,
        "done": done,
        "failed": failed,
        "processing": processing,
        "pending": pending,
    }