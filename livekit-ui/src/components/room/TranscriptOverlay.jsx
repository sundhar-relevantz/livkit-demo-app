import { useEffect, useMemo, useState } from "react";
import { useLocalParticipant, useParticipants, useTextStream, useTranscriptions } from "@livekit/components-react";
import { appConfig } from "../../config";
import {
  clearPersistedList,
  getTranscriptStorageKey,
  readPersistedList,
  writePersistedList,
} from "./roomPanelStorage";

const TRANSCRIPT_TOPIC = "lk.transcription";
const TRANSCRIPT_HISTORY_LIMIT = 500;

/**
 * Renders the shared transcript view and live subtitle overlay for the current room.
 */
export function TranscriptOverlay({ roomName, participantIdentity, variant = "overlay" }) {
  const { localParticipant } = useLocalParticipant();
  const participants = useParticipants();
  const transcriptions = useTranscriptions();
  const [targetLanguage, setTargetLanguage] = useState("en");
  const [translatedEntries, setTranslatedEntries] = useState({});
  const [isTranslating, setIsTranslating] = useState(false);
  const [translationError, setTranslationError] = useState("");
  const [captureError, setCaptureError] = useState("");
  const [localTranscriptEntries, setLocalTranscriptEntries] = useState([]);
  const [speechStatus, setSpeechStatus] = useState(() => {
    if (typeof window === "undefined") {
      return "unsupported";
    }

    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    return SpeechRecognition ? "idle" : "unsupported";
  });
  const { textStreams } = useTextStream(TRANSCRIPT_TOPIC);
  const transcriptStorageKey = useMemo(
    () => getTranscriptStorageKey(roomName, participantIdentity),
    [roomName, participantIdentity]
  );
  const [persistedTranscriptHistory] = useState(() => readPersistedList(transcriptStorageKey));

  const transcriptApiUrl = useMemo(() => `${appConfig.backendHttpUrl}/livekit/translate`, []);

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

      return {
        id: item?.id ?? item?.sid ?? stableId,
        text: String(rawText).trim(),
        speaker: String(speaker),
        timestamp: timestampValue,
        source: "shared-text-stream",
        fromIdentity: speakerIdentity,
      };
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

      return {
        id: item?.id ?? item?.sid ?? `hook-${speakerIdentity}-${timestampValue}-${rawText}`,
        text: String(rawText).trim(),
        speaker: String(speaker),
        timestamp: timestampValue,
        source: "use-transcriptions",
        fromIdentity: speakerIdentity,
      };
    });

    const combinedItems = [...streamItems, ...hookItems, ...localTranscriptEntries].filter((entry) => entry.text);
    const dedupedMap = new Map();

    for (const entry of combinedItems) {
      const dedupeKey = `${entry.source}:${entry.fromIdentity}:${entry.timestamp}:${entry.text}`;
      if (!dedupedMap.has(dedupeKey)) {
        dedupedMap.set(dedupeKey, entry);
      }
    }

    return Array.from(dedupedMap.values()).sort(
      (firstEntry, secondEntry) => firstEntry.timestamp - secondEntry.timestamp
    );
  }, [localTranscriptEntries, participantLabelByIdentity, textStreams, transcriptions]);

  const transcriptHistory = useMemo(() => {
    const transcriptMap = new Map(persistedTranscriptHistory.map((entry) => [entry.id, entry]));
    for (const transcriptEntry of transcriptItems) {
      transcriptMap.set(transcriptEntry.id, transcriptEntry);
    }

    return Array.from(transcriptMap.values())
      .sort((firstEntry, secondEntry) => firstEntry.timestamp - secondEntry.timestamp)
      .slice(-TRANSCRIPT_HISTORY_LIMIT);
  }, [persistedTranscriptHistory, transcriptItems]);

  const subtitleEntries = useMemo(() => transcriptHistory.slice(-2), [transcriptHistory]);
  const isOverlay = variant === "overlay";

  useEffect(() => {
    if (!transcriptHistory.length) {
      clearPersistedList(transcriptStorageKey);
      return;
    }

    writePersistedList(transcriptStorageKey, transcriptHistory);
  }, [transcriptHistory, transcriptStorageKey]);

  const displayedTranscriptText = useMemo(() => {
    return transcriptHistory
      .map((entry) => {
        const lineText = targetLanguage === "en" ? entry.text : translatedEntries[entry.id] || entry.text;
        const timeLabel = new Date(entry.timestamp).toLocaleTimeString();

        return `[${timeLabel}] ${entry.speaker}: ${lineText}`;
      })
      .join("\n");
  }, [targetLanguage, transcriptHistory, translatedEntries]);

  useEffect(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;

    if (!SpeechRecognition) {
      return undefined;
    }

    let isMounted = true;
    let restartTimer = null;
    const recognition = new SpeechRecognition();
    recognition.lang = "en-US";
    recognition.continuous = true;
    recognition.interimResults = true;

    recognition.onstart = () => setSpeechStatus("listening");
    recognition.onerror = (event) => {
      setSpeechStatus("error");
      setCaptureError(event?.error ? `Speech capture error: ${event.error}` : "Speech capture failed.");
    };
    recognition.onend = () => {
      if (!isMounted) {
        setSpeechStatus("stopped");
        return;
      }

      setSpeechStatus("restarting");
      restartTimer = window.setTimeout(() => {
        try {
          recognition.start();
        } catch {
          setSpeechStatus("error");
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
          {
            id: `local-${localParticipant.identity}-${capturedAt}-${index}`,
            text: transcriptText,
            speaker: localParticipant.name || localParticipant.identity || "You",
            timestamp: capturedAt,
            source: "local-caption",
            fromIdentity: localParticipant.identity,
          },
        ].slice(-TRANSCRIPT_HISTORY_LIMIT));

        try {
          await localParticipant.sendText(transcriptText, { topic: TRANSCRIPT_TOPIC });
          setCaptureError("");
        } catch (error) {
          setSpeechStatus("error");
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
  }, [localParticipant]);

  useEffect(() => {
    const translateEntries = async () => {
      if (!transcriptHistory.length) {
        setTranslatedEntries({});
        return;
      }

      if (targetLanguage === "en") {
        setTranslatedEntries({});
        setTranslationError("");
        return;
      }

      setIsTranslating(true);
      setTranslationError("");

      try {
        const translations = await Promise.all(
          transcriptHistory.map(async (entry) => {
            if (!entry.text) {
              return [entry.id, ""];
            }

            const response = await fetch(transcriptApiUrl, {
              method: "POST",
              headers: {
                accept: "application/json",
                "Content-Type": "application/json",
              },
              body: JSON.stringify({
                text: entry.text,
                target_language: targetLanguage,
              }),
            });

            if (!response.ok) {
              const errorBody = await response.text();
              throw new Error(errorBody || `Translation failed (${response.status})`);
            }

            const data = await response.json();
            return [entry.id, data.translated_text || entry.text];
          })
        );

        setTranslatedEntries(Object.fromEntries(translations));
      } catch (error) {
        setTranslationError(error instanceof Error ? error.message : "Translation failed.");
      } finally {
        setIsTranslating(false);
      }
    };

    translateEntries();
  }, [targetLanguage, transcriptApiUrl, transcriptHistory]);

  if (isOverlay) {
    return (
      <section className="transcript-overlay-shell" aria-label="Live subtitles">
        <div className="transcript-overlay-card">
          <div className="transcript-overlay-lines">
            {subtitleEntries.length ? (
              subtitleEntries.map((entry) => (
                <article className="transcript-overlay-line" key={entry.id}>
                  <strong>{entry.speaker}</strong>
                  <p>{targetLanguage === "en" ? entry.text : translatedEntries[entry.id] || entry.text}</p>
                </article>
              ))
            ) : (
              <p className="transcript-empty transcript-overlay-empty">Transcript will appear here as live subtitles.</p>
            )}
          </div>
        </div>
      </section>
    );
  }

  return null;
}