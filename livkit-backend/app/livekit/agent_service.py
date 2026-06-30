import os
import subprocess
import sys
from pathlib import Path

from app.core.config import settings


def dispatch_voice_agent(
    room_name: str,
    participant_identity: str,
    participant_name: str | None = None,
) -> dict[str, str]:
    """Start the voice agent as a detached LiveKit participant process."""

    if not room_name.strip() or not participant_identity.strip():
        raise ValueError("room_name and participant_identity are required")

    agent_script = Path(__file__).resolve().parents[3] / "livkit-agent" / "agent.py"
    if not agent_script.exists():
        raise FileNotFoundError(f"Agent entrypoint not found: {agent_script}")

    agent_dir = agent_script.parent
    env = os.environ.copy()
    env.update(
        {
            "LIVEKIT_URL": settings.LIVEKIT_URL,
            "LIVEKIT_API_KEY": settings.LIVEKIT_API_KEY,
            "LIVEKIT_API_SECRET": settings.LIVEKIT_API_SECRET,
            "AGENT_ROOM_NAME": room_name,
            "AGENT_PARTICIPANT_IDENTITY": participant_identity,
            "AGENT_PARTICIPANT_NAME": participant_name or participant_identity,
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

    subprocess.Popen(
        [sys.executable, str(agent_script)],
        cwd=str(agent_dir),
        env=env,
        stdout=subprocess.DEVNULL,
        stderr=subprocess.DEVNULL,
        start_new_session=True,
    )

    return {
        "room_name": room_name,
        "participant_identity": participant_identity,
        "participant_name": participant_name or participant_identity,
    }
