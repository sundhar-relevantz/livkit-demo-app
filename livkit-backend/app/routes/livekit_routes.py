from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field
import json
from urllib import error as urllib_error
from urllib import request as urllib_request

from app.core.config import settings
from app.livekit.token_service import generate_livekit_token
from app.livekit.room_service import (
    create_livekit_room,
    list_livekit_rooms,
    delete_livekit_room,
)

router = APIRouter(
    prefix="/livekit",
    tags=["LiveKit"],
)


class TokenRequest(BaseModel):
    room_name: str = Field(min_length=1, max_length=128)
    participant_identity: str = Field(min_length=1, max_length=128)
    participant_name: str | None = Field(default=None, min_length=1, max_length=128)


class RoomRequest(BaseModel):
    room_name: str = Field(min_length=1, max_length=128)


class TranslateRequest(BaseModel):
    text: str = Field(min_length=1, max_length=8000)
    target_language: str = Field(min_length=2, max_length=16)


@router.post("/token")
def create_token(payload: TokenRequest):
    try:
        room_name = payload.room_name.strip()
        participant_identity = payload.participant_identity.strip()
        participant_name = payload.participant_name.strip() if payload.participant_name else None

        if not room_name or not participant_identity:
            raise HTTPException(status_code=400, detail="room_name and participant_identity are required")

        token = generate_livekit_token(
            room_name=room_name,
            participant_identity=participant_identity,
            participant_name=participant_name,
        )

        return {
            "token": token,
            "room_name": room_name,
            "participant_identity": participant_identity,
        }

    except HTTPException:
        raise
    except ValueError as error:
        raise HTTPException(
            status_code=400,
            detail=str(error),
        )

    except Exception as error:
        raise HTTPException(
            status_code=500,
            detail=str(error),
        )


@router.post("/rooms")
async def create_room(payload: RoomRequest):
    try:
        room_name = payload.room_name.strip()
        if not room_name:
            raise HTTPException(status_code=400, detail="room_name is required")

        room = await create_livekit_room(room_name)

        return {
            "message": "Room created successfully",
            "room": room,
        }

    except HTTPException:
        raise
    except ValueError as error:
        raise HTTPException(
            status_code=400,
            detail=str(error),
        )

    except Exception as error:
        raise HTTPException(
            status_code=500,
            detail=str(error),
        )


@router.get("/rooms")
async def get_rooms():
    try:
        rooms = await list_livekit_rooms()

        return {
            "rooms": rooms,
        }

    except Exception as error:
        raise HTTPException(
            status_code=500,
            detail=str(error),
        )


@router.delete("/rooms/{room_name}")
async def remove_room(room_name: str):
    try:
        room_name = room_name.strip()
        if not room_name:
            raise HTTPException(status_code=400, detail="room_name is required")

        response = await delete_livekit_room(room_name)

        return {
            "message": "Room deleted successfully",
            "response": response,
        }

    except HTTPException:
        raise
    except ValueError as error:
        raise HTTPException(
            status_code=400,
            detail=str(error),
        )

    except Exception as error:
        raise HTTPException(
            status_code=500,
            detail=str(error),
        )


@router.post("/translate")
async def translate_text(payload: TranslateRequest):
    try:
        text = payload.text.strip()
        target_language = payload.target_language.strip().lower()

        if not text:
            raise HTTPException(status_code=400, detail="text is required")

        request_body = json.dumps(
            {
                "q": text,
                "source": "auto",
                "target": target_language,
                "format": "text",
            }
        ).encode("utf-8")

        translation_request = urllib_request.Request(
            settings.TRANSLATE_API_URL,
            data=request_body,
            headers={"Content-Type": "application/json"},
            method="POST",
        )

        try:
            with urllib_request.urlopen(translation_request, timeout=10) as response:
                response_data = json.loads(response.read().decode("utf-8"))
                translated_text = response_data.get("translatedText", text)

                return {
                    "translated_text": translated_text,
                    "target_language": target_language,
                    "fallback_used": translated_text == text,
                }
        except (urllib_error.URLError, urllib_error.HTTPError, TimeoutError) as error:
            return {
                "translated_text": text,
                "target_language": target_language,
                "fallback_used": True,
                "translation_error": str(error),
            }

    except HTTPException:
        raise
    except Exception as error:
        raise HTTPException(status_code=500, detail=str(error))