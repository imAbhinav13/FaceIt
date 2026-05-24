from datetime import datetime, timezone

from lib.config import settings
from lib.supabase import supabase


def now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def get_expired_candidate_rooms():
    response = (
        supabase
        .table("events")
        .select("id, room_code, name, status, expires_at")
        .neq("status", "expired")
        .lt("expires_at", now_iso())
        .execute()
    )

    return response.data or []


def get_event_photos(event_id: str):
    response = (
        supabase
        .table("event_photos")
        .select("id, storage_path, processing_status")
        .eq("event_id", event_id)
        .execute()
    )

    return response.data or []


def has_active_photo_processing(photos: list[dict]) -> bool:
    return any(
        photo["processing_status"] in ["pending", "processing"]
        for photo in photos
    )


def delete_storage_files(storage_paths: list[str]) -> tuple[int, list[str]]:
    if not storage_paths:
        return 0, []

    try:
        supabase.storage.from_(
            settings.supabase_event_photos_bucket
        ).remove(storage_paths)

        return len(storage_paths), []

    except Exception as e:
        return 0, [str(e)]


def delete_event_photo_rows(event_id: str):
    (
        supabase
        .table("event_photos")
        .delete()
        .eq("event_id", event_id)
        .execute()
    )


def mark_room_expired(event_id: str):
    (
        supabase
        .table("events")
        .update({
            "status": "expired"
        })
        .eq("id", event_id)
        .execute()
    )


def expire_room(room: dict) -> dict:
    event_id = room["id"]
    room_code = room["room_code"]

    photos = get_event_photos(event_id)

    if has_active_photo_processing(photos):
        print(
            f"Expiry skipped: room={room_code} event_id={event_id} "
            f"because photos are still pending/processing"
        )

        return {
            "event_id": event_id,
            "room_code": room_code,
            "expired": False,
            "reason": "active_processing",
        }

    storage_paths = [
        photo["storage_path"]
        for photo in photos
        if photo.get("storage_path")
    ]

    print(
        f"Expiry dry-run: room={room_code} event_id={event_id} "
        f"files_to_delete={len(storage_paths)} "
        f"photo_rows_to_delete={len(photos)}"
    )

    deleted_count, errors = delete_storage_files(storage_paths)

    if errors:
        print(
            f"Expiry storage delete failed: room={room_code} "
            f"event_id={event_id} errors={errors}"
        )

        return {
            "event_id": event_id,
            "room_code": room_code,
            "expired": False,
            "reason": "storage_delete_failed",
            "errors": errors,
        }

    print(
        f"Expiry storage deleted: room={room_code} "
        f"event_id={event_id} deleted_files={deleted_count}"
    )

    delete_event_photo_rows(event_id)

    print(
        f"Expiry DB rows deleted: room={room_code} "
        f"event_id={event_id} event_photos={len(photos)}"
    )

    mark_room_expired(event_id)

    print(
        f"Expiry complete: room={room_code} event_id={event_id} status=expired"
    )

    return {
        "event_id": event_id,
        "room_code": room_code,
        "expired": True,
        "deleted_files": deleted_count,
        "deleted_photo_rows": len(photos),
    }


def run_expiry_check():
    rooms = get_expired_candidate_rooms()

    if not rooms:
        print("Expiry check: no expired rooms found.")
        return {
            "checked": 0,
            "expired": 0,
        }

    expired_count = 0

    print(f"Expiry check: found {len(rooms)} candidate room(s).")

    for room in rooms:
        result = expire_room(room)

        if result.get("expired"):
            expired_count += 1

    return {
        "checked": len(rooms),
        "expired": expired_count,
    }