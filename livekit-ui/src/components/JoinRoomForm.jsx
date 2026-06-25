import { useState } from "react";

function JoinRoomForm({ onJoin, isSubmitting }) {
  const [roomName, setRoomName] = useState("hello");
  const [participantIdentity, setParticipantIdentity] = useState("user");
  const [participantName, setParticipantName] = useState("sundhar");

  const handleSubmit = (event) => {
    event.preventDefault();

    onJoin({
      room_name: roomName.trim(),
      participant_identity: participantIdentity.trim(),
      participant_name: participantName.trim(),
    });
  };

  return (
    <form className="join-form" onSubmit={handleSubmit}>
      <h1>Join LiveKit Room</h1>

      <label htmlFor="room-name">Room name</label>
      <input
        id="room-name"
        type="text"
        value={roomName}
        onChange={(event) => setRoomName(event.target.value)}
        required
      />

      <label htmlFor="participant-identity">Participant identity</label>
      <input
        id="participant-identity"
        type="text"
        value={participantIdentity}
        onChange={(event) => setParticipantIdentity(event.target.value)}
        required
      />

      <label htmlFor="participant-name">Participant name</label>
      <input
        id="participant-name"
        type="text"
        value={participantName}
        onChange={(event) => setParticipantName(event.target.value)}
        required
      />

      <button type="submit" disabled={isSubmitting}>
        {isSubmitting ? "Joining..." : "Join Room"}
      </button>
    </form>
  );
}

export default JoinRoomForm;
