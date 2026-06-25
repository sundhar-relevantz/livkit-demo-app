from livekit import api


def generate_livekit_token(
    room_name: str,
    participant_identity: str,
    participant_name: str | None = None,
) -> str:
    """
    Generate a LiveKit access token for a participant.
    """

    token = (
        api.AccessToken()
        .with_identity(participant_identity)
        .with_name(participant_name or participant_identity)
        .with_grants(
            api.VideoGrants(
                room_join=True,
                room=room_name,
                can_publish=True,
                can_subscribe=True,
                can_publish_data=True,
            )
        )
        .to_jwt()
    )

    return token
