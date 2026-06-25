from livekit import api

from app.core.config import settings


def _create_livekit_api_client() -> api.LiveKitAPI:
    return api.LiveKitAPI(
        url=settings.LIVEKIT_URL,
        api_key=settings.LIVEKIT_API_KEY,
        api_secret=settings.LIVEKIT_API_SECRET,
    )


async def create_livekit_room(room_name: str):
    """
    Create a LiveKit room.
    """

    lkapi = _create_livekit_api_client()

    try:
        room = await lkapi.room.create_room(
            api.CreateRoomRequest(
                name=room_name,
                max_participants=5,
            )
        )
        return room
    finally:
        await lkapi.aclose()


async def list_livekit_rooms():
    """
    List all LiveKit rooms.
    """

    lkapi = _create_livekit_api_client()

    try:
        rooms = await lkapi.room.list_rooms(
            api.ListRoomsRequest()
        )
        return rooms
    finally:
        await lkapi.aclose()


async def delete_livekit_room(room_name: str):
    """
    Delete a LiveKit room.
    """

    lkapi = _create_livekit_api_client()

    try:
        response = await lkapi.room.delete_room(
            api.DeleteRoomRequest(
                room=room_name,
            )
        )
        return response
    finally:
        await lkapi.aclose()