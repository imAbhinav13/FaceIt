import time
from datetime import datetime, timedelta, timezone

from lib.supabase import supabase
from worker.jobs.process_photo import process_photo_job
from worker.jobs.match_user import process_match_user_job
from worker.jobs.expire_rooms import run_expiry_check
from routes.guest import cleanup_expired_guest_sessions

POLL_SECONDS = 5
EXPIRY_CHECK_SECONDS = 60
LAST_EXPIRY_CHECK = 0


def now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def get_next_pending_job():
    response = (
        supabase
        .table("job_queue")
        .select("*")
        .eq("status", "pending")
        .in_("job_type", ["process_photo", "match_user"])
        .order("created_at")
        .limit(1)
        .execute()
    )

    if not response.data:
        return None

    return response.data[0]


def mark_job_processing(job_id: str):
    supabase.table("job_queue").update({
        "status": "processing",
        "started_at": now_iso(),
        "error": None,
    }).eq("id", job_id).execute()


def mark_job_done(job_id: str):
    supabase.table("job_queue").update({
        "status": "done",
        "completed_at": now_iso(),
        "error": None,
    }).eq("id", job_id).execute()


def mark_job_failed(job_id: str, error: str):
    supabase.table("job_queue").update({
        "status": "failed",
        "completed_at": now_iso(),
        "error": error,
    }).eq("id", job_id).execute()


def reset_stuck_jobs():
    cutoff = datetime.now(timezone.utc) - timedelta(minutes=10)

    response = (
        supabase
        .table("job_queue")
        .update({
            "status": "pending",
            "started_at": None,
            "completed_at": None,
            "error": "Reset stale processing job on worker startup",
        })
        .eq("status", "processing")
        .lt("started_at", cutoff.isoformat())
        .execute()
    )

    reset_count = len(response.data or [])

    if reset_count > 0:
        print(f"Reset {reset_count} stuck processing job(s) back to pending.")
    else:
        print("No stuck processing jobs found.")


def update_room_status_after_photo_processed(event_id: str):
    response = (
        supabase
        .table("event_photos")
        .select("id, processing_status")
        .eq("event_id", event_id)
        .execute()
    )

    photos = response.data or []

    if not photos:
        return

    total = len(photos)
    done = len([p for p in photos if p["processing_status"] == "done"])
    failed = len([p for p in photos if p["processing_status"] == "failed"])
    pending = len([p for p in photos if p["processing_status"] == "pending"])
    processing = len([p for p in photos if p["processing_status"] == "processing"])

    unfinished = pending + processing

    if done == total:
        new_status = "ready"
    elif done > 0 and unfinished == 0:
        new_status = "ready"
    elif done == 0 and failed == total:
        new_status = "failed"
    else:
        new_status = "processing"

    supabase.table("events").update({
        "status": new_status
    }).eq("id", event_id).execute()

    print(
        f"Room status checked: event_id={event_id} | "
        f"total={total}, done={done}, failed={failed}, "
        f"pending={pending}, processing={processing}, status={new_status}"
    )


def process_job_by_type(job: dict):
    job_type = job["job_type"]
    payload = job["payload"]

    if job_type == "process_photo":
        return process_photo_job(payload)

    if job_type == "match_user":
        return process_match_user_job(payload)

    raise ValueError(f"Unsupported job type: {job_type}")


def run_worker():
    print("FaceIt worker started.")
    print(f"Polling every {POLL_SECONDS} seconds...")

    reset_stuck_jobs()

    global LAST_EXPIRY_CHECK
    while True:

        current_time = time.time()

        if current_time - LAST_EXPIRY_CHECK >= EXPIRY_CHECK_SECONDS:
            run_expiry_check()
            cleanup_expired_guest_sessions()
            LAST_EXPIRY_CHECK = current_time

        job = get_next_pending_job()

        if not job:
            time.sleep(POLL_SECONDS)
            continue

        job_id = job["id"]
        job_type = job["job_type"]

        print(f"Processing job: {job_id} | type={job_type}")

        try:
            mark_job_processing(job_id)

            result = process_job_by_type(job)

            mark_job_done(job_id)

            if job_type == "process_photo":
                update_room_status_after_photo_processed(result["event_id"])

                print(
                    f"Job done: {job_id} | "
                    f"type=process_photo | "
                    f"photo_id={result['photo_id']} | "
                    f"faces_detected={result['faces_detected']}"
                )

            elif job_type == "match_user":
                print(
                    f"Job done: {job_id} | "
                    f"type=match_user | "
                    f"user_id={result['user_id']} | "
                    f"matches_created={result['matches_created']}"
                )

        except Exception as e:
            error_message = str(e)
            mark_job_failed(job_id, error_message)

            if job_type == "process_photo":
                event_id = job.get("payload", {}).get("event_id")
                if event_id:
                    update_room_status_after_photo_processed(event_id)

            print(f"Job failed: {job_id}")
            print(error_message)


if __name__ == "__main__":
    run_worker()