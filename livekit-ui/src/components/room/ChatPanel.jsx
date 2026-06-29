import { useEffect, useMemo, useRef, useState } from "react";
import { useChat, useLocalParticipant } from "@livekit/components-react";
import {
  clearPersistedList,
  getChatStorageKey,
  readPersistedList,
  writePersistedList,
} from "./roomPanelStorage";

const CHAT_HISTORY_LIMIT = 250;

/**
 * Renders the persistent room chat panel with local unread tracking and mention highlighting.
 */
export function ChatPanel({ roomName, participantIdentity }) {
  const { localParticipant } = useLocalParticipant();
  const { chatMessages, send, isSending } = useChat();
  const [draftMessage, setDraftMessage] = useState("");
  const [sendError, setSendError] = useState("");
  const [lastReadMessageIndex, setLastReadMessageIndex] = useState(-1);
  const scrollContainerRef = useRef(null);
  const draftInputRef = useRef(null);

  const chatStorageKey = useMemo(
    () => getChatStorageKey(roomName, participantIdentity),
    [roomName, participantIdentity]
  );

  const [persistedMessages] = useState(() => readPersistedList(chatStorageKey));

  const mergedMessages = useMemo(() => {
    const normalizedIncomingMessages = chatMessages.map((message, index) => ({
      id: message.id || `${message.timestamp}-${message.message}`,
      message: message.message || "",
      timestamp: Number(message.timestamp ?? index),
      fromIdentity: message.from?.identity || "unknown",
      fromName: message.from?.name || message.from?.identity || "Participant",
    }));

    const messageMap = new Map(persistedMessages.map((entry) => [entry.id, entry]));
    for (const messageEntry of normalizedIncomingMessages) {
      messageMap.set(messageEntry.id, messageEntry);
    }

    return Array.from(messageMap.values())
      .sort((firstMessage, secondMessage) => firstMessage.timestamp - secondMessage.timestamp)
      .slice(-CHAT_HISTORY_LIMIT);
  }, [chatMessages, persistedMessages]);

  const mentionTerms = useMemo(() => {
    const terms = [localParticipant.identity, localParticipant.name, participantIdentity, "you"]
      .map((value) => String(value || "").trim().toLowerCase())
      .filter(Boolean);

    return Array.from(new Set(terms));
  }, [localParticipant.identity, localParticipant.name, participantIdentity]);

  const messagesWithMentionState = useMemo(() => {
    return mergedMessages.map((messageEntry) => {
      const lowerMessage = String(messageEntry.message || "").toLowerCase();
      const isMentioned = mentionTerms.some((term) => {
        if (!term || term.length < 2) {
          return false;
        }

        const escapedTerm = term.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
        const mentionPattern = new RegExp(`(^|\\s|[@#])${escapedTerm}(\\b|\\s|$)`, "i");
        return mentionPattern.test(lowerMessage);
      });

      return {
        ...messageEntry,
        isMentioned,
      };
    });
  }, [mentionTerms, mergedMessages]);

  useEffect(() => {
    if (!mergedMessages.length) {
      clearPersistedList(chatStorageKey);
      return;
    }

    writePersistedList(chatStorageKey, mergedMessages);
  }, [chatStorageKey, mergedMessages]);

  const unreadCount = useMemo(() => {
    if (!messagesWithMentionState.length) {
      return 0;
    }

    let count = 0;
    for (let index = lastReadMessageIndex + 1; index < messagesWithMentionState.length; index += 1) {
      const messageEntry = messagesWithMentionState[index];
      if (messageEntry.fromIdentity !== localParticipant.identity) {
        count += 1;
      }
    }
    return count;
  }, [lastReadMessageIndex, localParticipant.identity, messagesWithMentionState]);

  useEffect(() => {
    const containerElement = scrollContainerRef.current;
    if (!containerElement) {
      return;
    }

    containerElement.scrollTop = containerElement.scrollHeight;
    setLastReadMessageIndex(messagesWithMentionState.length - 1);
  }, [messagesWithMentionState.length]);

  const handleSubmit = async (event) => {
    event.preventDefault();

    const trimmedDraft = draftMessage.trim();
    if (!trimmedDraft) {
      return;
    }

    setSendError("");
    try {
      await send(trimmedDraft);
      setDraftMessage("");
      setLastReadMessageIndex(messagesWithMentionState.length);
    } catch (error) {
      setSendError(error instanceof Error ? error.message : "Unable to send message.");
    }
  };

  const resizeDraftInput = () => {
    const inputElement = draftInputRef.current;
    if (!inputElement) {
      return;
    }

    inputElement.style.height = "auto";
    inputElement.style.height = `${Math.min(inputElement.scrollHeight, 180)}px`;
  };

  const handleDraftChange = (event) => {
    setDraftMessage(event.target.value);
    resizeDraftInput();
  };

  const handleDraftKeyDown = (event) => {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      if (!isSending && draftMessage.trim()) {
        event.currentTarget.form?.requestSubmit();
      }
    }
  };

  useEffect(() => {
    resizeDraftInput();
  }, [draftMessage]);

  return (
    <section className="conference-side-panel chat-panel">
      <div className="chat-panel-header">
        <div className="chat-panel-title-row">
          <h2>Chat</h2>
          {unreadCount > 0 ? <span className="chat-unread-badge">{unreadCount}</span> : null}
        </div>
        <p>Messages are kept in this tab until you leave the room.</p>
      </div>

      <div className="chat-panel-list" ref={scrollContainerRef}>
        {messagesWithMentionState.length ? (
          messagesWithMentionState.map((messageEntry) => {
            const isOwnMessage = messageEntry.fromIdentity === localParticipant.identity;
            return (
              <article
                className={`chat-panel-entry ${isOwnMessage ? "is-own" : "is-remote"} ${
                  messageEntry.isMentioned && !isOwnMessage ? "is-mention" : ""
                }`}
                key={messageEntry.id}
              >
                <div className="chat-panel-entry-meta">
                  <strong>{isOwnMessage ? "You" : messageEntry.fromName}</strong>
                  <span>{new Date(messageEntry.timestamp).toLocaleTimeString()}</span>
                </div>
                <p>{messageEntry.message}</p>
                {messageEntry.isMentioned && !isOwnMessage ? (
                  <span className="chat-mention-chip">Mention</span>
                ) : null}
              </article>
            );
          })
        ) : (
          <p className="chat-panel-empty">No messages yet. Start the conversation.</p>
        )}
      </div>

      <form className="chat-panel-form" onSubmit={handleSubmit}>
        <label htmlFor="chat-draft-input">Message</label>
        <div className="chat-panel-compose-row">
          <textarea
            ref={draftInputRef}
            id="chat-draft-input"
            value={draftMessage}
            onChange={handleDraftChange}
            onKeyDown={handleDraftKeyDown}
            placeholder="Type a message"
            rows={2}
          />
          <button type="submit" className="secondary-btn" disabled={isSending || !draftMessage.trim()}>
            {isSending ? "Sending..." : "Send"}
          </button>
        </div>
        {sendError ? <span className="chat-panel-error">{sendError}</span> : null}
      </form>
    </section>
  );
}