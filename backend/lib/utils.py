import re
import secrets


ROOM_CODE_LENGTH = 6
ROOM_CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"


def generate_room_code() -> str:
    """
    Generate a 6-character uppercase room code.

    Excludes ambiguous characters:
    - 0
    - O
    - I
    - 1
    """
    return "".join(
        secrets.choice(ROOM_CODE_ALPHABET)
        for _ in range(ROOM_CODE_LENGTH)
    )


def normalize_room_code(room_code: str) -> str:
    """
    Normalize user-provided room code.
    """
    return room_code.strip().upper()


def is_valid_room_code(room_code: str) -> bool:
    """
    Validate room code format.

    Rules:
    - Exactly 6 characters
    - Uppercase
    - Only non-ambiguous characters
    """
    pattern = f"^[{ROOM_CODE_ALPHABET}]{{{ROOM_CODE_LENGTH}}}$"
    return bool(re.match(pattern, room_code))