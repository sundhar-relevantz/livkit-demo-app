import { useLocalParticipant, useParticipants, useSpeakingParticipants } from "@livekit/components-react";

/**
 * Shows the current room summary, including participant counts and local device state.
 */
export function RoomInsightsPanel() {
  const participants = useParticipants();
  const speakingParticipants = useSpeakingParticipants();
  const { isMicrophoneEnabled, isCameraEnabled, localParticipant } = useLocalParticipant();

  return (
    <section className="room-insights">
      <h2>Room Insights</h2>

      <div className="insights-grid">
        <div className="insight-item">
          <span className="insight-label">Participants</span>
          <strong>{participants.length}</strong>
        </div>
        <div className="insight-item">
          <span className="insight-label">Speaking now</span>
          <strong>{speakingParticipants.length}</strong>
        </div>
      </div>

      <div className="insights-chip-row">
        <span className="insight-chip">Mic: {isMicrophoneEnabled ? "On" : "Off"}</span>
        <span className="insight-chip">Camera: {isCameraEnabled ? "On" : "Off"}</span>
      </div>

      <div className="participants-list-wrap">
        <p className="insight-label">People in room</p>
        <ul className="participants-list">
          {participants.map((participant) => (
            <li key={participant.sid}>
              <span>{participant.name || participant.identity}</span>
              {participant.identity === localParticipant.identity ? <small>You</small> : null}
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}