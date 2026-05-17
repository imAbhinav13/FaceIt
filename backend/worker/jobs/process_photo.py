import tempfile
from pathlib import Path
from PIL import Image
from lib.config import settings
from lib.face import generate_face_embeddings_from_photo_path
from lib.supabase import supabase


def vector_to_pgvector(values: list[float]) -> str:
    return "[" + ",".join(str(value) for value in values) + "]"


def resize_image_for_processing(input_path: str, max_size: int = 1200) -> str:
    """
    Resize large event photos before DeepFace processing.
    Keeps aspect ratio.
    """
    image = Image.open(input_path)
    image = image.convert("RGB")

    image.thumbnail((max_size, max_size))

    resized_file = tempfile.NamedTemporaryFile(
        delete=False,
        suffix=".jpg"
    )

    image.save(resized_file.name, format="JPEG", quality=90)
    resized_file.close()

    return resized_file.name


def process_photo_job(payload: dict):
    event_id = payload["event_id"]
    photo_id = payload["photo_id"]
    storage_path = payload["storage_path"]

    temp_file_path = None

    try:
        supabase.table("event_photos").update({
            "processing_status": "processing"
        }).eq("id", photo_id).execute()

        file_bytes = supabase.storage.from_(
            settings.supabase_event_photos_bucket
        ).download(storage_path)

        suffix = Path(storage_path).suffix or ".jpg"

        temp_file = tempfile.NamedTemporaryFile(
            delete=False,
            suffix=suffix
        )
        temp_file.write(file_bytes)
        temp_file.close()

        temp_file_path = temp_file.name

        resized_path = resize_image_for_processing(temp_file_path)
        detected_faces = generate_face_embeddings_from_photo_path(resized_path)

        for face in detected_faces:
            supabase.table("photo_faces").insert({
                "photo_id": photo_id,
                "face_embedding": vector_to_pgvector(face["embedding"]),
                "bounding_box": face["bounding_box"],
            }).execute()

        supabase.table("event_photos").update({
            "processing_status": "done"
        }).eq("id", photo_id).execute()

        return {
            "event_id": event_id,
            "photo_id": photo_id,
            "faces_detected": len(detected_faces),
        }

    except Exception as e:
        supabase.table("event_photos").update({
            "processing_status": "failed"
        }).eq("id", photo_id).execute()

        raise e

    finally:
        for path in [temp_file_path, locals().get("resized_path")]:
            if path:
                try:
                    Path(path).unlink(missing_ok=True)
                except Exception:
                    pass