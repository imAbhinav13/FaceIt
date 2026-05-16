from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel

from lib.auth import get_current_user
from lib.face import (
    generate_embeddings_from_base64_frames,
    average_embeddings,
)
from lib.supabase import supabase

router = APIRouter()


class EnrollRequest(BaseModel):
    frames: list[str]


@router.post("/enroll")
def enroll(payload: EnrollRequest, user=Depends(get_current_user)):
    if len(payload.frames) != 3:
        raise HTTPException(
            status_code=400,
            detail="Exactly 3 frames are required"
        )

    try:
        embeddings = generate_embeddings_from_base64_frames(payload.frames)
        averaged_embedding = average_embeddings(embeddings)

        embedding_as_vector = "[" + ",".join(
            str(value) for value in averaged_embedding
        ) + "]"

        #
        response = supabase.table("face_embeddings").upsert(
            {
                "user_id": user.id,
                "embedding": embedding_as_vector,
            },
            on_conflict="user_id" #upsert into face_embeddings
        ).execute()

        return {
            "success": True,
            "message": "Embeddings generated successfully",
            "user_id": user.id,
            "email": user.email,
            "embeddings_generated": len(embeddings),
            "embedding_dimensions": len(averaged_embedding),
            "db_rows_affected": len(response.data)
        }

    except Exception as e:
        raise HTTPException(
            status_code=400,
            detail=str(e)
        )