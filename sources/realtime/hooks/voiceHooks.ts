/**
 * Deprecated compatibility surface for the old voice assistant integration.
 *
 * We intentionally keep a tiny no-op adapter here so future voice work can
 * reattach behind one interface, without wiring session/message hooks directly
 * into sync again.
 */

interface SessionMetadata {
    summary?: { text?: string };
    path?: string;
    machineId?: string;
    [key: string]: any;
}

export const voiceHooks = {
    onSessionOnline(_sessionId: string, _metadata?: SessionMetadata) {
        // Voice integration disabled.
    },

    onSessionOffline(_sessionId: string, _metadata?: SessionMetadata) {
        // Voice integration disabled.
    },

    onSessionFocus(_sessionId: string, _metadata?: SessionMetadata) {
        // Voice integration disabled.
    },

    onPermissionRequested(_sessionId: string, _requestId: string, _toolName: string, _toolArgs: any) {
        // Voice integration disabled.
    },

    onMessages(_sessionId: string, _messages: unknown[]) {
        // Voice integration disabled.
    },

    onVoiceStarted(_sessionId: string): string {
        // Keep return shape for future callers.
        return '';
    },

    onReady(_sessionId: string) {
        // Voice integration disabled.
    },

    onVoiceStopped() {
        // Voice integration disabled.
    }
};
