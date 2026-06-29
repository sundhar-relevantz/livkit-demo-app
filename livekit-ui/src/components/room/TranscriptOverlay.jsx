import { useEffect, useMemo, useState } from "react";
import { useLocalParticipant, useParticipants, useTextStream, useTranscriptions } from "@livekit/components-react";

const TRANSCRIPT_TOPIC = "lk.transcription";
const TRANSCRIPT_HISTORY_LIMIT = 500;

const toTranscriptEntry = ({
  id,
  text,
  speaker,
  timestamp,
  fromIdentity,
}) => ({
  id,
  text: String(text || "").trim(),
  speaker: String(speaker || "Speaker"),
  timestamp: Number(timestamp),
  fromIdentity: String(fromIdentity || "Speaker"),
});

/**
 * Renders realtime subtitle lines from LiveKit text/transcription streams.
 */
export function TranscriptOverlay({ variant = "overlay", transcriptLanguage = "en-US" }) {
  const { localParticipant } = useLocalParticipant();
  const participants = useParticipants();
  const transcriptions = useTranscriptions();
  const [captureError, setCaptureError] = useState("");
  const [localTranscriptEntries, setLocalTranscriptEntries] = useState([]);
  const { textStreams } = useTextStream(TRANSCRIPT_TOPIC);

  const participantLabelByIdentity = useMemo(() => {
    return new Map(
      participants.map((participant) => [participant.identity, participant.name || participant.identity])
    );
  }, [participants]);

  const transcriptItems = useMemo(() => {
    const streamItems = textStreams.map((item, index) => {
      const rawText = item?.text ?? String(item ?? "");
      const speakerIdentity = item?.participantInfo?.identity ?? "Speaker";
      const speaker = participantLabelByIdentity.get(speakerIdentity) || speakerIdentity || "Speaker";
      const timestampValue = Number(item?.streamInfo?.timestamp ?? index);
      const streamId = item?.streamInfo?.id ?? "stream";
      const stableId = `${streamId}:${speakerIdentity}:${timestampValue}:${rawText}`;

      return toTranscriptEntry({
        id: item?.id ?? item?.sid ?? stableId,
        text: rawText,
        speaker,
        timestamp: timestampValue,
        fromIdentity: speakerIdentity,
      });
    });

    const hookItems = transcriptions.map((item, index) => {
      const rawText =
        item?.text ?? item?.transcript ?? item?.message ?? item?.content ?? String(item ?? "");
      const speakerIdentity =
        item?.participantInfo?.identity ??
        item?.participantIdentity ??
        item?.participant?.identity ??
        item?.identity ??
        "Speaker";
      const speaker = participantLabelByIdentity.get(speakerIdentity) || speakerIdentity || "Speaker";
      const timestampValue = Number(item?.streamInfo?.timestamp ?? item?.timestamp ?? item?.time ?? index);

      return toTranscriptEntry({
        id: item?.id ?? item?.sid ?? `hook-${speakerIdentity}-${timestampValue}-${rawText}`,
        text: rawText,
        speaker,
        timestamp: timestampValue,
        fromIdentity: speakerIdentity,
      });
    });

    const combinedItems = [...streamItems, ...hookItems, ...localTranscriptEntries].filter((entry) => entry.text);
    const dedupedMap = new Map();

    for (const entry of combinedItems) {
      // A single transcription can surface through multiple hooks; dedupe by content identity.
      const dedupeKey = `${entry.fromIdentity}:${entry.timestamp}:${entry.text}`;
      if (!dedupedMap.has(dedupeKey)) {
        dedupedMap.set(dedupeKey, entry);
      }
    }

    return Array.from(dedupedMap.values()).sort(
      (firstEntry, secondEntry) => firstEntry.timestamp - secondEntry.timestamp
    );
  }, [localTranscriptEntries, participantLabelByIdentity, textStreams, transcriptions]);

  const transcriptHistory = useMemo(() => {
    return transcriptItems
      .sort((firstEntry, secondEntry) => firstEntry.timestamp - secondEntry.timestamp)
      .slice(-TRANSCRIPT_HISTORY_LIMIT);
  }, [transcriptItems]);

  const subtitleEntries = useMemo(() => transcriptHistory.slice(-2), [transcriptHistory]);
  const isOverlay = variant === "overlay";

  useEffect(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;

    if (!SpeechRecognition) {
      return undefined;
    }

    let isMounted = true;
    let restartTimer = null;
    const recognition = new SpeechRecognition();
    recognition.lang = transcriptLanguage;
    recognition.continuous = true;
    recognition.interimResults = true;

    recognition.onstart = () => {
      setCaptureError("");
    };
    recognition.onerror = (event) => {
      setCaptureError(event?.error ? `Speech capture error: ${event.error}` : "Speech capture failed.");
    };
    recognition.onend = () => {
      if (!isMounted) {
        return;
      }

      restartTimer = window.setTimeout(() => {
        try {
          recognition.start();
        } catch {
          setCaptureError("Speech capture failed to restart.");
        }
      }, 350);
    };
    recognition.onresult = async (event) => {
      for (let index = event.resultIndex; index < event.results.length; index += 1) {
        const result = event.results[index];
        if (!result.isFinal) {
          continue;
        }

        const transcriptText = result[0]?.transcript?.trim();
        if (!transcriptText) {
          continue;
        }

        const capturedAt = Date.now();
        setLocalTranscriptEntries((previousEntries) => [
          ...previousEntries,
          toTranscriptEntry({
            id: `local-${localParticipant.identity}-${capturedAt}-${index}`,
            text: transcriptText,
            speaker: localParticipant.name || localParticipant.identity || "You",
            timestamp: capturedAt,
            fromIdentity: localParticipant.identity,
          }),
        ].slice(-TRANSCRIPT_HISTORY_LIMIT));

        try {
          await localParticipant.sendText(transcriptText, { topic: TRANSCRIPT_TOPIC });
          setCaptureError("");
        } catch (error) {
          setCaptureError(error instanceof Error ? error.message : "Failed to publish transcript to the room.");
          return;
        }
      }
    };

    try {
      recognition.start();
    } catch {
      return undefined;
    }

    return () => {
      isMounted = false;
      recognition.onresult = null;
      recognition.onend = null;
      recognition.onerror = null;
      if (restartTimer) {
        window.clearTimeout(restartTimer);
      }
      try {
        recognition.stop();
      } catch {
        // Ignore stop errors from browser speech recognition.
      }
    };
  }, [localParticipant, transcriptLanguage]);

  if (isOverlay) {
    return (
      <section className="transcript-overlay-shell" aria-label="Live subtitles">
        <div className="transcript-overlay-card">
          <div className="transcript-overlay-header">
            <span className="transcript-overlay-title">Live subtitles</span>
          </div>
          <div className="transcript-overlay-lines">
            {subtitleEntries.length ? (
              subtitleEntries.map((entry) => (
                <article className="transcript-overlay-line" key={entry.id}>
                  <strong>{entry.speaker}</strong>
                  <p>{entry.text}</p>
                </article>
              ))
            ) : (
              <p className="transcript-empty transcript-overlay-empty">Transcript will appear here as live subtitles.</p>
            )}
            {captureError ? <p className="transcript-empty transcript-overlay-empty">{captureError}</p> : null}
          </div>
        </div>
      </section>
    );
  }

  return null;
}