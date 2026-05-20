import base64
import tempfile
from pathlib import Path

import numpy as np
from deepface import DeepFace
from PIL import Image


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


def generate_face_embeddings_from_photo_path(image_path: str) -> list[dict]:
    """
    Generates embeddings for all detected faces in an event photo.
    Returns one item per detected face.

    Bounding boxes are stored both as raw pixels and percentages so the frontend
    can draw boxes correctly on responsive images.
    """
    image = Image.open(image_path)
    image_width, image_height = image.size

    result = DeepFace.represent(
        img_path=image_path,
        model_name=MODEL_NAME,
        detector_backend=DETECTOR_BACKEND,
        enforce_detection=False,
    )

    faces: list[dict] = []

    for item in result:
        embedding = item.get("embedding")
        facial_area = item.get("facial_area", {})

        if embedding and len(embedding) == 512:
            x = facial_area.get("x") or 0
            y = facial_area.get("y") or 0
            w = facial_area.get("w") or 0
            h = facial_area.get("h") or 0

            faces.append({
                "embedding": embedding,
                "bounding_box": {
                    "x": x,
                    "y": y,
                    "w": w,
                    "h": h,
                    "image_width": image_width,
                    "image_height": image_height,
                    "x_pct": (x / image_width) * 100 if image_width else 0,
                    "y_pct": (y / image_height) * 100 if image_height else 0,
                    "w_pct": (w / image_width) * 100 if image_width else 0,
                    "h_pct": (h / image_height) * 100 if image_height else 0,
                },
            })

    return faces