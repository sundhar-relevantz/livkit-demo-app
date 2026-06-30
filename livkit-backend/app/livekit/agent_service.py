import asyncio
import os
import subprocess
import sys
from pathlib import Path

from livekit import api
from livekit.protocol.agent_dispatch import CreateAgentDispatchRequest

from app.core.config import settings


def build_agent_environment(
    room_name: str,
    participant_identity: str,
    participant_name: str | None = None,
) -> dict[str, str]:
    env = os.environ.copy()
    env.update(
        {
            "LIVEKIT_URL": settings.LIVEKIT_URL,
            "LIVEKIT_API_KEY": settings.LIVEKIT_API_KEY,
            "LIVEKIT_API_SECRET": settings.LIVEKIT_API_SECRET,
            "AGENT_ROOM_NAME": room_name,
            "AGENT_PARTICIPANT_IDENTITY": participant_identity,
            "AGENT_PARTICIPANT_NAME": participant_name or participant_identity,
            "AGENT_NAME": os.getenv("AGENT_NAME", "demo-voice-agent"),
            "AGENT_IDENTITY": participant_identity,
            "AGENT_PROMPT": os.getenv(
                "AGENT_PROMPT",
                "You are a helpful voice assistant for a LiveKit demo room.",
            ),
            "AWS_REGION": os.getenv("AWS_REGION", "us-east-1"),
            "AWS_ACCESS_KEY_ID": os.getenv("AWS_ACCESS_KEY_ID", ""),
            "AWS_SECRET_ACCESS_KEY": os.getenv("AWS_SECRET_ACCESS_KEY", ""),
            "AWS_SESSION_TOKEN": os.getenv("AWS_SESSION_TOKEN", ""),
            "AWS_BEDROCK_MODEL_ID": os.getenv(
                "AWS_BEDROCK_MODEL_ID",
                "amazon.nova-sonic-v1:0",
            ),
            "AWS_TTS_VOICE": os.getenv("AWS_TTS_VOICE", "Ruth"),
        }
    )
    return env


def build_dispatch_request(
    agent_name: str,
    room_name: str,
    participant_identity: str,
    participant_name: str | None = None,
) -> CreateAgentDispatchRequest:
    request = CreateAgentDispatchRequest(
        agent_name=agent_name,
        room=room_name,
        attributes={
            "participant_identity": participant_identity,
            "participant_name": participant_name or participant_identity,
        },
    )
    return request


def dispatch_voice_agent(
    room_name: str,
    participant_identity: str,
    participant_name: str | None = None,
) -> dict[str, str]:
    """Dispatch the voice agent to the room and start a worker process for it."""

    if not room_name.strip() or not participant_identity.strip():
        raise ValueError("room_name and participant_identity are required")

    agent_script = Path(__file__).resolve().parents[3] / "livkit-agent" / "agent.py"
    if not agent_script.exists():
        raise FileNotFoundError(f"Agent entrypoint not found: {agent_script}")

    agent_name = os.getenv("AGENT_NAME", "demo-voice-agent")
    agent_dir = agent_script.parent
    env = build_agent_environment(
        room_name=room_name,
        participant_identity=participant_identity,
        participant_name=participant_name,
    )

    subprocess.Popen(
        [sys.executable, str(agent_script)],
        cwd=str(agent_dir),
        env=env,
        stdout=subprocess.DEVNULL,
        stderr=subprocess.DEVNULL,
        start_new_session=True,
    )

    async def _create_dispatch() -> None:
        lkapi = api.LiveKitAPI(
            url=settings.LIVEKIT_URL,
            api_key=settings.LIVEKIT_API_KEY,
            api_secret=settings.LIVEKIT_API_SECRET,
        )
        try:
            request = build_dispatch_request(
                agent_name=agent_name,
                room_name=room_name,
                participant_identity=participant_identity,
                participant_name=participant_name,
            )
            await lkapi.agent_dispatch.create_dispatch(request)
        finally:
            await lkapi.aclose()

    try:
        asyncio.run(_create_dispatch())
    except Exception:
        # The worker can still start even if the explicit dispatch request is rejected.
        pass

    return {
        "room_name": room_name,
        "participant_identity": participant_identity,
        "participant_name": participant_name or participant_identity,
        "agent_name": agent_name,
    }
