import React from 'react';
import { sync } from '@/sync/sync';
import { buildDerivedLifecyclePersistPlan } from '@/utils/teamLifecycle';
import type { DecryptedArtifact } from '@/sync/artifactTypes';
import type { KanbanBoard } from '@/sync/kanbanTypes';
import type { TeamMessage } from '@/sync/teamMessageTypes';
import type { Session } from '@/sync/storageTypes';

/**
 * Applies derived lifecycle timestamps to team member records and persists
 * them to the artifact via a debounced 250ms timer.
 *
 * Scout warning: lifecyclePersistTimerRef and this effect must move together —
 * separating them causes timer leaks and broken cleanup.
 */
export function useTeamLifecyclePersist(
    artifact: DecryptedArtifact | null,
    board: KanbanBoard | null,
    teamMessages: TeamMessage[],
    allSessions: Session[],
): void {
    const lifecyclePersistTimerRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);
    const lastScheduledBodyRef = React.useRef<string | null>(null);
    // Use ref so allSessions reads the latest value without re-triggering the
    // effect — matching the original dep array: [artifact?.id, board, teamMessages].
    const allSessionsRef = React.useRef(allSessions);
    allSessionsRef.current = allSessions;

    React.useEffect(() => {
        if (!artifact?.body || !board?.team?.members?.length) {
            return;
        }

        const processStartedBySessionId = new Map<string, number>();
        for (const session of allSessionsRef.current) {
            const processStartedAt = session.metadata?.processStartedAt;
            if (typeof processStartedAt === 'number') {
                processStartedBySessionId.set(session.id, processStartedAt);
            }
        }

        const persistPlan = buildDerivedLifecyclePersistPlan({
            board,
            currentBody: artifact.body,
            messages: teamMessages,
            processStartedBySessionId,
            lastScheduledBody: lastScheduledBodyRef.current,
        });

        if (!persistPlan.shouldPersist || !persistPlan.nextBody) {
            return;
        }

        if (lifecyclePersistTimerRef.current) {
            clearTimeout(lifecyclePersistTimerRef.current);
        }

        lastScheduledBodyRef.current = persistPlan.nextBody;
        lifecyclePersistTimerRef.current = setTimeout(() => {
            lifecyclePersistTimerRef.current = null;
            sync.updateArtifact(
                artifact.id,
                artifact.title,
                persistPlan.nextBody,
                artifact.sessions,
                artifact.draft,
                artifact.type,
            ).catch((error) => {
                console.error('Failed to persist derived team lifecycle timestamps:', error);
            }).finally(() => {
                lifecyclePersistTimerRef.current = null;
                lastScheduledBodyRef.current = null;
            });
        }, 250);

        return () => {
            if (lifecyclePersistTimerRef.current) {
                clearTimeout(lifecyclePersistTimerRef.current);
                lifecyclePersistTimerRef.current = null;
                lastScheduledBodyRef.current = null;
            }
        };
    // allSessions intentionally omitted — read via ref to preserve original dep array behaviour
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [artifact?.id, board, teamMessages]);
}
