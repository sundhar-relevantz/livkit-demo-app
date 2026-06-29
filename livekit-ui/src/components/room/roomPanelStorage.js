const safeSegment = (value) => encodeURIComponent(String(value || "unknown"));

/**
 * Builds the sessionStorage key for persisted chat messages in a room.
 */
export const getChatStorageKey = (roomName, participantIdentity) =>
  `livkit:chat:${safeSegment(roomName)}:${safeSegment(participantIdentity)}`;

/**
 * Builds the sessionStorage key for persisted transcript entries in a room.
 */
export const getTranscriptStorageKey = (roomName, participantIdentity) =>
  `livkit:transcript:${safeSegment(roomName)}:${safeSegment(participantIdentity)}`;

/**
 * Reads a JSON list from sessionStorage and falls back to an empty array on failure.
 */
export const readPersistedList = (storageKey) => {
  if (typeof window === "undefined" || !storageKey) {
    return [];
  }

  try {
    const rawValue = window.sessionStorage.getItem(storageKey);
    if (!rawValue) {
      return [];
    }

    const parsed = JSON.parse(rawValue);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
};

/**
 * Serializes a list into sessionStorage for the current browser tab.
 */
export const writePersistedList = (storageKey, listValue) => {
  if (typeof window === "undefined" || !storageKey) {
    return;
  }

  try {
    window.sessionStorage.setItem(storageKey, JSON.stringify(listValue));
  } catch {
    // Ignore session storage write failures.
  }
};

/**
 * Removes a persisted list from sessionStorage when the room state is cleared.
 */
export const clearPersistedList = (storageKey) => {
  if (typeof window === "undefined" || !storageKey) {
    return;
  }

  try {
    window.sessionStorage.removeItem(storageKey);
  } catch {
    // Ignore session storage clear failures.
  }
};