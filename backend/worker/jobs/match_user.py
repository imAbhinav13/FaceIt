from lib.config import settings
from lib.supabase import supabase


def vector_to_pgvector(values) -> str:
    """
    Converts a vector/list/string into pgvector text format.
    """
    if isinstance(values, str):
        return values

    return "[" + ",".join(str(value) for value in values) + "]"


def get_user_embedding(user_id: str) -> str:
    response = (
        supabase
        .table("face_embeddings")
        .select("embedding")
        .eq("user_id", user_id)
        .limit(1)
        .execute()
    )

    if not response.data:
        raise ValueError(f"No face embedding found for user_id={user_id}")

    embedding = response.data[0]["embedding"]

    if not embedding:
        raise ValueError(f"Empty face embedding found for user_id={user_id}")

    return vector_to_pgvector(embedding)


def get_event_photo_ids(event_id: str) -> list[str]:
    response = (
        supabase
        .table("event_photos")
        .select("id")
        .eq("event_id", event_id)
        .execute()
    )

    return [row["id"] for row in response.data or []]


def delete_existing_matches_for_user_event(user_id: str, event_id: str):
    """
    MVP cleanup rule:
    Before inserting fresh matches, delete old matches for same user + event.
    This avoids duplicate/stale matches during repeated testing.
    """
    photo_ids = get_event_photo_ids(event_id)

    if not photo_ids:
        return

    (
        supabase
        .table("photo_matches")
        .delete()
        .eq("user_id", user_id)
        .in_("photo_id", photo_ids)
        .execute()
    )


def run_pgvector_match(event_id: str, user_embedding: str) -> list[dict]:
    response = (
        supabase
        .rpc(
            "match_photo_faces_for_event",
            {
                "p_event_id": event_id,
                "p_embedding": user_embedding,
            }
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
    """
    A group photo can have multiple detected faces.
    Keep only the highest similarity per photo.
    """
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


def insert_photo_matches(user_id: str, best_matches: list[dict]) -> int:
    rows_to_insert = []

    for match in best_matches:
        similarity = float(match["similarity"])
        status = bucket_match(similarity)

        if status is None:
            continue

        rows_to_insert.append({
            "photo_id": match["photo_id"],
            "user_id": user_id,
            "confidence": similarity,
            "status": status,
        })

    if not rows_to_insert:
        return 0

    response = (
        supabase
        .table("photo_matches")
        .insert(rows_to_insert)
        .execute()
    )

    return len(response.data or [])


def process_match_user_job(payload: dict):
    event_id = payload["event_id"]
    user_id = payload["user_id"]

    print(
        f"match_user started | "
        f"event_id={event_id} | user_id={user_id}"
    )

    user_embedding = get_user_embedding(user_id)

    raw_matches = run_pgvector_match(
        event_id=event_id,
        user_embedding=user_embedding,
    )

    print(f"pgvector returned {len(raw_matches)} face-level result(s).")

    best_matches = deduplicate_best_match_per_photo(raw_matches)

    print(f"Deduplicated to {len(best_matches)} photo-level result(s).")

    delete_existing_matches_for_user_event(
        user_id=user_id,
        event_id=event_id,
    )

    matches_created = insert_photo_matches(
        user_id=user_id,
        best_matches=best_matches,
    )

    print(
        f"match_user completed | "
        f"user_id={user_id} | matches_created={matches_created}"
    )

    return {
        "event_id": event_id,
        "user_id": user_id,
        "matches_created": matches_created,
    }