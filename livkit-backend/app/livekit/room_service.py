from livekit import api

from app.core.config import settings


async def create_livekit_room(room_name: str):
    """
    Create a LiveKit room.
    """

    lkapi = api.LiveKitAPI(settings.LIVEKIT_URL)

    try:
        room = await lkapi.room.create_room(
            api.CreateRoomRequest(
                name=room_name,
                max_participants = 5,
            )
        )
        return room
    finally:
        await lkapi.aclose()


async def list_livekit_rooms():
    """
    List all LiveKit rooms.
    """

    lkapi = api.LiveKitAPI(settings.LIVEKIT_URL)

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

    lkapi = api.LiveKitAPI(settings.LIVEKIT_URL)

    try:
        response = await lkapi.room.delete_room(
            api.DeleteRoomRequest(
                room=room_name,
            )
        )
        return response
    finally:
        await lkapi.aclose()