from livekit import api
from google.protobuf.json_format import MessageToDict
from google.protobuf.message import Message

from app.core.config import settings


def _create_livekit_api_client() -> api.LiveKitAPI:
    return api.LiveKitAPI(
        url=settings.LIVEKIT_URL,
        api_key=settings.LIVEKIT_API_KEY,
        api_secret=settings.LIVEKIT_API_SECRET,
    )


def _protobuf_to_dict(value):
    if isinstance(value, Message):
        return MessageToDict(
            value,
            preserving_proto_field_name=True,
        )

    if isinstance(value, list):
        return [_protobuf_to_dict(item) for item in value]

    if isinstance(value, dict):
        return {key: _protobuf_to_dict(item) for key, item in value.items()}

    return value


async def start_room_composite_recording(
    room_name: str,
    filepath: str | None = None,
    layout: str = "grid",
) -> dict:
    lkapi = _create_livekit_api_client()

    try:
        recording_filepath = filepath or "/recordings/{room_name}-{time}.mp4"

        request = api.RoomCompositeEgressRequest(
            room_name=room_name,
            layout=layout,
            file=api.EncodedFileOutput(
                file_type=api.EncodedFileType.MP4,
                filepath=recording_filepath,
            ),
        )

        response = await lkapi.egress.start_room_composite_egress(request)
        return _protobuf_to_dict(response)
    finally:
        await lkapi.aclose()


async def stop_egress(egress_id: str) -> dict:
    lkapi = _create_livekit_api_client()

    try:
        response = await lkapi.egress.stop_egress(
            api.StopEgressRequest(egress_id=egress_id)
        )
        return _protobuf_to_dict(response)
    finally:
        await lkapi.aclose()


async def list_egress(room_name: str | None = None, active: bool | None = None) -> dict:
    lkapi = _create_livekit_api_client()

    try:
        request = api.ListEgressRequest()
        if room_name:
            request.room_name = room_name
        if active is not None:
            request.active = active

        response = await lkapi.egress.list_egress(request)
        return _protobuf_to_dict(response)
    finally:
        await lkapi.aclose()
