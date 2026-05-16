import base64
import tempfile
from pathlib import Path

import numpy as np
from deepface import DeepFace


MODEL_NAME = "Facenet512"
DETECTOR_BACKEND = "mtcnn"

#2
def save_base64_image_to_temp_file(frame: str) -> str:
    """
    Converts a data:image/jpeg;base64,... frame into a temporary JPG file.
    Returns the temp file path.
    """
    if not frame.startswith("data:image/jpeg;base64,"):
        raise ValueError("Invalid image format. Expected JPEG base64 data URL.")

    base64_data = frame.split(",", 1)[1]
    image_bytes = base64.b64decode(base64_data)

    temp_file = tempfile.NamedTemporaryFile(
        delete=False,
        suffix=".jpg"
    )

    temp_file.write(image_bytes)
    temp_file.close()

    return temp_file.name

#3
def generate_embedding_from_image_path(image_path: str) -> list[float]:
    """
    Generates one 512-dimensional FaceNet512 embedding from an image path.
    """
    result = DeepFace.represent(
        img_path=image_path,
        model_name=MODEL_NAME,
        detector_backend=DETECTOR_BACKEND,
        enforce_detection=True,
    )

    if not result:
        raise ValueError("No face detected in image.")

    embedding = result[0]["embedding"]

    if len(embedding) != 512:
        raise ValueError(f"Expected 512-dimensional embedding, got {len(embedding)}.")

    return embedding

#4
def generate_embeddings_from_base64_frames(frames: list[str]) -> list[list[float]]:
    """
    Converts 3 base64 frames into temp files and generates one embedding per frame.
    """
    embeddings: list[list[float]] = []
    temp_paths: list[str] = []

    try:
        for frame in frames:
            image_path = save_base64_image_to_temp_file(frame)
            temp_paths.append(image_path)

            embedding = generate_embedding_from_image_path(image_path)
            embeddings.append(embedding)

        return embeddings

    finally:
        for path in temp_paths:
            try:
                Path(path).unlink(missing_ok=True)
            except Exception:
                pass

#5
def average_embeddings(embeddings: list[list[float]]) -> list[float]:
    """
    Averages multiple embeddings into one 512-dimensional user embedding.
    """
    if not embeddings:
        raise ValueError("No embeddings provided.")

    array = np.array(embeddings, dtype=np.float32)

    if array.shape[1] != 512:
        raise ValueError(f"Expected embeddings of size 512, got {array.shape[1]}.")

    averaged = np.mean(array, axis=0)

    return averaged.tolist()