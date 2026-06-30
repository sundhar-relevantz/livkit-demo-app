import sys
import unittest
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from app.livekit import agent_service


class AgentServiceTests(unittest.TestCase):
    def test_build_dispatch_request_uses_agent_name_and_room(self):
        request = agent_service.build_dispatch_request(
            agent_name="demo-agent",
            room_name="room-1",
            participant_identity="user-agent",
            participant_name="Voice Agent",
        )

        self.assertEqual(request.agent_name, "demo-agent")
        self.assertEqual(request.room, "room-1")
        self.assertEqual(request.attributes["participant_identity"], "user-agent")
        self.assertEqual(request.attributes["participant_name"], "Voice Agent")

    def test_build_agent_environment_includes_agent_identity(self):
        env = agent_service.build_agent_environment(
            room_name="room-1",
            participant_identity="user-agent",
            participant_name="Voice Agent",
        )

        self.assertEqual(env["AGENT_NAME"], "demo-voice-agent")
        self.assertEqual(env["AGENT_IDENTITY"], "user-agent")
        self.assertEqual(env["AGENT_ROOM_NAME"], "room-1")


if __name__ == "__main__":
    unittest.main()
