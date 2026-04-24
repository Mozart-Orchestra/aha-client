import * as React from 'react';
import { KanbanBoard } from '@/sync/kanbanTypes';

export type DesktopBridgeEvent =
    | 'happy-desktop:agent-event'
    | 'happy-desktop:collaboration-event'
    | 'happy-desktop:diagnostics-event';

export interface DesktopRoomMember {
    id: string;
    name: string;
    type?: string;
    role?: string;
    transport?: string;
    metadata?: Record<string, unknown>;
    addedAt?: string;
}

export type DesktopRoomMemberInput = Omit<DesktopRoomMember, 'addedAt'>;

export interface DesktopRoom {
    id: string;
    name: string;
    description?: string;
    createdAt?: string;
    updatedAt?: string;
    members?: DesktopRoomMember[];
    metadata?: Record<string, unknown>;
}

export interface DesktopBoardEntry {
    roomId: string;
    board: KanbanBoard;
}

export interface DesktopTask {
    id: string;
    roomId?: string;
    title: string;
    description?: string;
    status: string;
    assigneeId?: string | null;
    createdAt: number;
    updatedAt: number;
    metadata?: Record<string, unknown>;
}

export type DesktopTaskInput = Omit<DesktopTask, 'id' | 'createdAt' | 'updatedAt'> & {
    id?: string;
};

export interface DesktopAgentSession {
    id: string;
    roomId?: string | null;
    title?: string;
    args?: string[];
    startedAt: string;
    status: 'running' | 'stopped' | 'error';
}

export interface DesktopCollaborationSnapshot {
    rooms: DesktopRoom[];
    boards: DesktopBoardEntry[];
    tasks?: DesktopTask[];
    sessions?: DesktopAgentSession[];
}

export interface AhaDesktopBridge {
    getEnvironment(): Promise<{
        isDev: boolean;
        serverUrl: string;
        webAppUrl: string;
        cliPath: string;
        supportsLocalSockets: boolean;
        taskStatuses: string[];
    }>;
    getCollaborationState(): Promise<DesktopCollaborationSnapshot & {
        tasks: DesktopTask[];
        sessions: DesktopAgentSession[];
    }>;
    createRoom(room: Partial<DesktopRoom> & { name: string }): Promise<DesktopRoom>;
    addRoomMember(roomId: string, member: DesktopRoomMemberInput): Promise<DesktopRoomMember>;
    createTask(task: DesktopTaskInput & { roomId: string }): Promise<DesktopTask>;
    updateTask(taskId: string, updates: Partial<DesktopTask>): Promise<DesktopTask>;
    removeTask(taskId: string): Promise<boolean>;
    startAgentSession(payload: {
        roomId?: string;
        title?: string;
        args?: string[];
        env?: Record<string, string>;
        cwd?: string;
        cliPath?: string;
    }): Promise<string>;
    stopAgentSession(sessionId: string): Promise<boolean>;
    sendAgentInput(sessionId: string, chunk: string): Promise<void>;
    on(eventName: DesktopBridgeEvent, callback: (payload: any) => void): () => void;
}

declare global {
    interface Window {
        ahaDesktopBridge?: AhaDesktopBridge;
        happyDesktopBridge?: AhaDesktopBridge;
    }
}

export function getDesktopBridge(): AhaDesktopBridge | null {
    if (typeof window === 'undefined') {
        return null;
    }
    return window.ahaDesktopBridge ?? window.happyDesktopBridge ?? null;
}

export function useDesktopBridge() {
    const [bridge] = React.useState<AhaDesktopBridge | null>(() => getDesktopBridge());
    const [collaborationState, setCollaborationState] = React.useState<DesktopCollaborationSnapshot | null>(null);

    React.useEffect(() => {
        if (!bridge) {
            return;
        }

        let unsubscribe: (() => void) | undefined;

        bridge.getCollaborationState()
            .then((state) => setCollaborationState(state))
            .catch(() => { /* noop */ });

        unsubscribe = bridge.on('happy-desktop:collaboration-event', (event: { snapshot?: DesktopCollaborationSnapshot }) => {
            if (event?.snapshot) {
                setCollaborationState(event.snapshot);
            }
        });

        return () => {
            unsubscribe?.();
        };
    }, [bridge]);

    return { bridge, collaborationState };
}
