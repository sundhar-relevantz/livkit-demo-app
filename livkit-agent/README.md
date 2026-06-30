# LiveKit Voice Agent

This folder contains a lightweight LiveKit voice agent that can join the same room as the web app and speak to participants.

## Setup

1. Create a Python virtual environment.
2. Install dependencies:
   ```bash
   pip install -r requirements.txt
   ```
3. Fill in the values in `.env`.
4. Run the agent:
   ```bash
   python agent.py
   ```

## Notes

- The frontend button in the room page calls the backend endpoint `/livekit/agents/dispatch`.
- The backend launches the agent process in the background and passes the LiveKit credentials from the backend environment.
- AWS credentials are expected for any Bedrock-backed model usage; the current implementation uses the OpenAI plugin as a working default until a Bedrock plugin is wired in.
