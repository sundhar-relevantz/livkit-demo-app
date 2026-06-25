from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

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
    room_name: str
    participant_identity: str
    participant_name: str | None = None


class RoomRequest(BaseModel):
    room_name: str


@router.post("/token")
def create_token(payload: TokenRequest):
    try:
        token = generate_livekit_token(
            room_name=payload.room_name,
            participant_identity=payload.participant_identity,
            participant_name=payload.participant_name,
        )

        return {
            "token": token,
            "room_name": payload.room_name,
            "participant_identity": payload.participant_identity,
        }

    except Exception as error:
        raise HTTPException(
            status_code=500,
            detail=str(error),
        )


@router.post("/rooms")
async def create_room(payload: RoomRequest):
    try:
        room = await create_livekit_room(payload.room_name)

        return {
            "message": "Room created successfully",
            "room": room,
        }

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
        response = await delete_livekit_room(room_name)

        return {
            "message": "Room deleted successfully",
            "response": response,
        }

    except Exception as error:
        raise HTTPException(
            status_code=500,
            detail=str(error),
        )