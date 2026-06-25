from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field

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