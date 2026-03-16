import { tracking } from './tracking';

// Re-export tracking for direct access
export { tracking } from './tracking';

/**
 * Initialize tracking with an anonymous user ID.
 * Should be called once during auth initialization.
 */
export function initializeTracking(anonymousUserId: string) {
    tracking?.identify(anonymousUserId, { name: anonymousUserId });
}

/**
 * Auth events
 */
export function trackAccountCreated() {
    tracking?.capture('account_created');
}

export function trackAccountRestored() {
    tracking?.capture('account_restored');
}

export function trackLogout() {
    tracking?.reset();
}

/**
 * Core user interactions
 */
export function trackConnectAttempt() {
    tracking?.capture('connect_attempt');
}

export function trackConnectSuccess(method: 'qr' | 'url') {
    tracking?.capture('connect_success', { method });
}

export function trackConnectFailed(method: 'qr' | 'url', reason?: string) {
    tracking?.capture('connect_failed', { method, reason });
}

export function trackMessageSent() {
    tracking?.capture('message_sent');
}

export function trackVoiceRecording(action: 'start' | 'stop') {
    tracking?.capture('voice_recording', { action });
}

export function trackPermissionResponse(allowed: boolean) {
    tracking?.capture('permission_response', { allowed });
}

/**
 * Paywall events
 */
export function trackPaywallButtonClicked() {
    tracking?.capture('paywall_button_clicked');
}

export function trackPaywallPresented() {
    tracking?.capture('paywall_presented');
}

export function trackPaywallPurchased() {
    tracking?.capture('paywall_purchased');
}

export function trackPaywallCancelled() {
    tracking?.capture('paywall_cancelled');
}

export function trackPaywallRestored() {
    tracking?.capture('paywall_restored');
}

export function trackPaywallError(error: string) {
    tracking?.capture('paywall_error', { error });
}

/**
 * Review request events
 */
export function trackReviewPromptShown() {
    tracking?.capture('review_prompt_shown');
}

export function trackReviewPromptResponse(likesApp: boolean) {
    tracking?.capture('review_prompt_response', { likes_app: likesApp });
}

export function trackReviewStoreShown() {
    tracking?.capture('review_store_shown');
}

export function trackReviewRetryScheduled(daysUntilRetry: number) {
    tracking?.capture('review_retry_scheduled', { days_until_retry: daysUntilRetry });
}

/**
 * Team events
 */
export function trackTeamCreated(mode: string, agentCount: number) {
    tracking?.capture('team_created', { mode, agent_count: agentCount });
}

export function trackTeamViewed(teamId: string) {
    tracking?.capture('team_viewed', { team_id: teamId });
}

export function trackTaskCreated(teamId: string) {
    tracking?.capture('task_created', { team_id: teamId });
}

export function trackTaskApproval(taskId: string, approved: boolean) {
    tracking?.capture('task_approval', { task_id: taskId, approved });
}

export function trackTeamChatSent(teamId: string) {
    tracking?.capture('team_chat_sent', { team_id: teamId });
}

/**
 * Agent events
 */
export function trackAgentsPageViewed() {
    tracking?.capture('agents_page_viewed');
}

export function trackAgentDeployed(agentId: string) {
    tracking?.capture('agent_deployed', { agent_id: agentId });
}

/**
 * Session events
 */
export function trackSessionCreated() {
    tracking?.capture('session_created');
}

export function trackSessionTokenUsage(inputTokens: number, outputTokens: number, costUsd: number) {
    tracking?.capture('session_token_usage', {
        input_tokens: inputTokens,
        output_tokens: outputTokens,
        cost_usd: costUsd,
    });
}

export function trackTaskFeedback(taskId: string, score: 1 | -1) {
    tracking?.capture('task_feedback', { task_id: taskId, score });
}

/**
 * Task lifecycle events
 */
export function trackTaskCompleted(taskId: string, teamId: string) {
    tracking?.capture('task_completed', { task_id: taskId, team_id: teamId });
}

export function trackTaskMoved(taskId: string, teamId: string, fromStatus: string, toStatus: string) {
    tracking?.capture('task_status_changed', {
        task_id: taskId,
        team_id: teamId,
        from_status: fromStatus,
        to_status: toStatus,
    });
}

/**
 * Session activation — fires when the first message is sent to a session.
 * Distinct from session_created: a session may be created without a message
 * (e.g. via CLI auto-launch); this event marks the moment the user actually engages.
 */
export function trackSessionActivated(sessionId: string) {
    tracking?.capture('session_activated', { session_id: sessionId });
}

/**
 * Concurrency conflict — fires when two agents attempt to modify the same resource simultaneously.
 */
export function trackConflictDetected(taskId: string, teamId: string, conflictType: 'file_edit' | 'task_status' | 'artifact_write' | string) {
    tracking?.capture('conflict_detected', {
        task_id: taskId,
        team_id: teamId,
        conflict_type: conflictType,
    });
}

/**
 * Agent scope violation — fires when an agent attempts an action outside its assigned scope.
 */
export function trackAgentScopeViolation(agentId: string, teamId: string, violationType: 'file_access' | 'task_ownership' | 'role_escalation' | string) {
    tracking?.capture('agent_scope_violation', {
        agent_id: agentId,
        team_id: teamId,
        violation_type: violationType,
    });
}
