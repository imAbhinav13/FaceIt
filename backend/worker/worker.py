import time

from lib.supabase import supabase
from worker.jobs.process_photo import process_photo_job
from datetime import datetime, timedelta, timezone

POLL_SECONDS = 5


def now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def get_next_pending_job():
    response = (
        supabase
        .table("job_queue")
        .select("*")
        .eq("status", "pending")
        .eq("job_type", "process_photo")
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

    done = len([
        photo for photo in photos
        if photo["processing_status"] == "done"
    ])

    failed = len([
        photo for photo in photos
        if photo["processing_status"] == "failed"
    ])

    pending = len([
        photo for photo in photos
        if photo["processing_status"] == "pending"
    ])

    processing = len([
        photo for photo in photos
        if photo["processing_status"] == "processing"
    ])

    unfinished = pending + processing

    if done == total:
        new_status = "ready"
    elif done > 0 and unfinished == 0:
        # Some photos failed, but at least one photo processed successfully.
        # The room can move forward with the successfully processed photos.
        new_status = "ready"
    elif done == 0 and failed == total:
        # Every photo failed. Do not show this room as ready.
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

#fn to reset job if it crashes and changes status to pending from processing
#This prevents jobs from being permanently stranded in processing after a worker crash.
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


def run_worker():
    print("FaceIt worker started.")
    print(f"Polling every {POLL_SECONDS} seconds...")
    
    reset_stuck_jobs()

    while True:
        job = get_next_pending_job()

        if not job:
            time.sleep(POLL_SECONDS)
            continue

        job_id = job["id"]
        payload = job["payload"]

        print(f"Processing job: {job_id}")

        try:
            mark_job_done(job_id)
            result = process_photo_job(payload)
            update_room_status_after_photo_processed(result["event_id"])

            print(
                f"Job done: {job_id} | "
                f"photo_id={result['photo_id']} | "
                f"faces_detected={result['faces_detected']}"
                
                )

        except Exception as e:
            error_message = str(e)
            mark_job_failed(job_id, error_message)

            event_id = job.get("payload", {}).get("event_id")
            if event_id:
                update_room_status_after_photo_processed(event_id)
                
            print(f"Job failed: {job_id}")
            print(error_message)


if __name__ == "__main__":
    run_worker()