/**
 * ReviewPRButton component (R12)
 *
 * A quick-action button that triggers a code review via the
 * POST /v1/teams/:teamId/review/start endpoint.
 *
 * Renders as a labelled button that opens a bottom-sheet modal with:
 *  1. PR URL input (optional)
 *  2. Focus area selection (Security / Performance / Style / All)
 *  3. Start Review CTA
 *  4. In-progress indicator once the review is queued
 *  5. Findings summary once the review completes
 */

import * as React from 'react';
import {
    View,
    Modal,
    Pressable,
    TextInput,
    ActivityIndicator,
    ScrollView,
    KeyboardAvoidingView,
    Platform,
} from 'react-native';
import { useUnistyles } from 'react-native-unistyles';
import { Ionicons } from '@expo/vector-icons';
import { Text } from '@/components/StyledText';
import { TokenStorage } from '@/auth/tokenStorage';
import { getServerUrl } from '@/sync/serverConfig';
import { reviewStyles as styles, ACCENT_GREEN, ACCENT_RED, ACCENT_ORANGE } from './reviewStyles';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type FocusArea = 'all' | 'security' | 'performance' | 'style';
type ReviewStatus = 'idle' | 'queued' | 'in-progress' | 'completed' | 'failed';

interface Finding {
    id: string;
    severity: 'critical' | 'high' | 'medium' | 'low' | 'info';
    type: string;
    file: string;
    line?: number;
    message: string;
    suggestion?: string;
    confidence: number;
}

interface ReviewResult {
    reviewJobId: string;
    status: ReviewStatus;
    progress?: number;
    summary: {
        verdict: 'approve' | 'request-changes' | 'comment';
        confidence: number;
        changes: { additions: number; deletions: number; files: number };
    } | null;
    findings: Finding[];
    suggestedChanges: Array<{
        findingId: string;
        file: string;
        line?: number;
        replacement: string;
        description: string;
    }>;
    chatMessage: { role: 'system'; content: string } | null;
    metrics?: {
        tasksCompleted: number;
        messagesExchanged: number;
        blockersResolved: number;
    };
    reportSummary?: string;
    error?: string;
}

interface ReviewPRButtonProps {
    teamId: string;
    label?: string;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const FOCUS_OPTIONS: Array<{
    key: FocusArea;
    label: string;
    icon: keyof typeof Ionicons.glyphMap;
}> = [
    { key: 'all', label: 'All', icon: 'apps-outline' },
    { key: 'security', label: 'Security', icon: 'shield-checkmark-outline' },
    { key: 'performance', label: 'Performance', icon: 'speedometer-outline' },
    { key: 'style', label: 'Style', icon: 'color-palette-outline' },
];

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function severityBorderColor(severity: Finding['severity']): string {
    switch (severity) {
        case 'critical': return ACCENT_RED;
        case 'high': return ACCENT_ORANGE;
        case 'medium': return '#A0A060';
        case 'low': return '#6A8A6A';
        default: return '#888888';
    }
}

function confidenceColor(confidence: number): string {
    if (confidence >= 0.9) return ACCENT_GREEN;
    if (confidence >= 0.7) return '#3D6A8A';
    return ACCENT_ORANGE;
}

function normalizeReviewResult(raw: any, reviewJobId: string): ReviewResult {
    const normalizedStatus: ReviewStatus = raw?.status === 'failed'
        ? 'failed'
        : raw?.status === 'completed'
            ? 'completed'
            : raw?.status === 'queued'
                ? 'queued'
                : raw?.status === 'in-progress' || raw?.status === 'processing' || raw?.status === 'pending'
                    ? 'in-progress'
                    : 'failed';

    const recommendations: string[] = Array.isArray(raw?.result?.recommendations)
        ? raw.result.recommendations
        : [];

    const fallbackFindings: Finding[] = recommendations.map((message, index) => ({
        id: `${reviewJobId}-rec-${index}`,
        severity: 'info',
        type: 'recommendation',
        file: 'team',
        message,
        confidence: 0.65,
    }));

    const summary = raw?.summary && typeof raw.summary === 'object'
        ? raw.summary
        : null;
    const findings = Array.isArray(raw?.findings) ? raw.findings : fallbackFindings;
    const suggestedChanges = Array.isArray(raw?.suggestedChanges) ? raw.suggestedChanges : [];
    const chatMessage = raw?.chatMessage && typeof raw.chatMessage === 'object' ? raw.chatMessage : null;
    const metrics = raw?.result?.metrics && typeof raw.result.metrics === 'object' ? raw.result.metrics : undefined;
    const reportSummary = typeof raw?.result?.summary === 'string' ? raw.result.summary : undefined;

    return {
        reviewJobId: raw?.reviewJobId ?? raw?.jobId ?? reviewJobId,
        status: normalizedStatus,
        progress: typeof raw?.progress === 'number' ? raw.progress : undefined,
        summary,
        findings,
        suggestedChanges,
        chatMessage,
        metrics,
        reportSummary,
        error: typeof raw?.error === 'string' ? raw.error : undefined,
    };
}

// ---------------------------------------------------------------------------
// Hook: review polling logic
// ---------------------------------------------------------------------------

function useReviewPolling(teamId: string) {
    const pollingRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);

    React.useEffect(() => {
        return () => {
            if (pollingRef.current !== null) clearTimeout(pollingRef.current);
        };
    }, []);

    const poll = React.useCallback(
        async (
            reviewJobId: string,
            attempt: number,
            onDone: (result: ReviewResult) => void
        ) => {
            try {
                const credentials = await TokenStorage.getCredentials();
                if (!credentials) return;

                const serverUrl = getServerUrl();
                const url = `${serverUrl}/v1/teams/${encodeURIComponent(teamId)}/review/${encodeURIComponent(reviewJobId)}`;
                const response = await fetch(url, {
                    headers: { Authorization: `Bearer ${credentials.token}` },
                });

                if (!response.ok) {
                    scheduleNextPoll(reviewJobId, attempt, onDone);
                    return;
                }

                const data = await response.json() as any;
                const normalized = normalizeReviewResult(data, reviewJobId);
                if (normalized.status === 'completed' || normalized.status === 'failed') {
                    onDone(normalized);
                    return;
                }

                scheduleNextPoll(reviewJobId, attempt, onDone);
            } catch {
                scheduleNextPoll(reviewJobId, attempt, onDone);
            }
        },
        [teamId]
    );

    const scheduleNextPoll = React.useCallback(
        (
            reviewJobId: string,
            attempt: number,
            onDone: (result: ReviewResult) => void
        ) => {
            const delay = Math.min(1500 * Math.pow(1.4, attempt), 10_000);
            pollingRef.current = setTimeout(() => poll(reviewJobId, attempt + 1, onDone), delay);
        },
        [poll]
    );

    return { poll, pollingRef };
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export const ReviewPRButton = React.memo(function ReviewPRButton({
    teamId,
    label = 'Review PR',
}: ReviewPRButtonProps) {
    const { theme } = useUnistyles();

    const [isOpen, setIsOpen] = React.useState(false);
    const [prUrl, setPrUrl] = React.useState('');
    const [focusArea, setFocusArea] = React.useState<FocusArea>('all');
    const [status, setStatus] = React.useState<ReviewStatus>('idle');
    const [result, setResult] = React.useState<ReviewResult | null>(null);
    const [errorMessage, setErrorMessage] = React.useState<string | null>(null);

    const { poll } = useReviewPolling(teamId);

    const resetState = React.useCallback(() => {
        setStatus('idle');
        setResult(null);
        setErrorMessage(null);
        setPrUrl('');
        setFocusArea('all');
    }, []);

    const handleClose = React.useCallback(() => {
        setIsOpen(false);
    }, []);

    const handleStartReview = React.useCallback(async () => {
        if (status !== 'idle') return;
        setStatus('queued');
        setErrorMessage(null);

        try {
            const credentials = await TokenStorage.getCredentials();
            if (!credentials) {
                setErrorMessage('Not authenticated');
                setStatus('failed');
                return;
            }

            const serverUrl = getServerUrl();
            const url = `${serverUrl}/v1/teams/${encodeURIComponent(teamId)}/review/start`;
            const body: Record<string, unknown> = { focus: [focusArea] };
            if (prUrl.trim()) {
                body.prUrl = prUrl.trim();
            } else {
                body.branch = 'HEAD';
            }

            const response = await fetch(url, {
                method: 'POST',
                headers: {
                    Authorization: `Bearer ${credentials.token}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(body),
            });

            if (!response.ok) {
                const data = await response.json().catch(() => ({})) as { error?: string };
                setErrorMessage(data.error ?? 'Failed to start review');
                setStatus('failed');
                return;
            }

            const job = await response.json() as { reviewJobId?: string; jobId?: string };
            const reviewJobId = job.reviewJobId ?? job.jobId;
            if (!reviewJobId) {
                setErrorMessage('Review job id missing in server response');
                setStatus('failed');
                return;
            }
            setStatus('in-progress');

            setTimeout(() => {
                poll(reviewJobId, 1, (reviewResult) => {
                    setResult(reviewResult);
                    setStatus(reviewResult.status as ReviewStatus);
                    if (reviewResult.status === 'failed') {
                        setErrorMessage(reviewResult.error ?? 'Review failed');
                    }
                });
            }, 1500);
        } catch (err) {
            setErrorMessage(err instanceof Error ? err.message : 'Unknown error');
            setStatus('failed');
        }
    }, [status, prUrl, focusArea, teamId, poll]);

    return (
        <>
            <Pressable
                style={styles.trigger}
                onPress={() => { resetState(); setIsOpen(true); }}
            >
                <Ionicons name="git-pull-request-outline" size={16} color={theme.colors.text} />
                <Text style={styles.triggerText}>{label}</Text>
            </Pressable>

            <Modal visible={isOpen} animationType="slide" transparent onRequestClose={handleClose}>
                <KeyboardAvoidingView
                    behavior={Platform.OS === 'ios' ? 'padding' : undefined}
                    style={styles.overlay}
                >
                    <Pressable style={{ flex: 1 }} onPress={handleClose} />
                    <View style={styles.sheet}>
                        <View style={styles.sheetHandle} />
                        <ScrollView contentContainerStyle={styles.sheetScroll} keyboardShouldPersistTaps="handled">
                            <View style={styles.sheetHeader}>
                                <Text style={styles.sheetTitle}>Review PR</Text>
                                <Pressable style={styles.closeButton} onPress={handleClose}>
                                    <Ionicons name="close" size={22} color={theme.colors.textSecondary} />
                                </Pressable>
                            </View>

                            {status === 'idle' ? (
                                <>
                                    <Text style={styles.label}>PR URL (optional)</Text>
                                    <TextInput
                                        style={styles.input}
                                        value={prUrl}
                                        onChangeText={setPrUrl}
                                        placeholder="Paste GitHub / GitLab PR URL"
                                        placeholderTextColor={theme.colors.textSecondary}
                                        autoCapitalize="none"
                                        autoCorrect={false}
                                        keyboardType="url"
                                    />
                                    <Text style={styles.label}>Review Focus</Text>
                                    <View style={styles.focusRow}>
                                        {FOCUS_OPTIONS.map(opt => (
                                            <Pressable
                                                key={opt.key}
                                                style={[styles.focusPill, focusArea === opt.key ? styles.focusPillActive : undefined]}
                                                onPress={() => setFocusArea(opt.key)}
                                            >
                                                <Ionicons
                                                    name={opt.icon}
                                                    size={14}
                                                    color={focusArea === opt.key ? ACCENT_GREEN : theme.colors.textSecondary}
                                                />
                                                <Text style={[styles.focusPillText, focusArea === opt.key ? styles.focusPillTextActive : undefined]}>
                                                    {opt.label}
                                                </Text>
                                            </Pressable>
                                        ))}
                                    </View>
                                    <Pressable style={styles.startButton} onPress={handleStartReview}>
                                        <Text style={styles.startButtonText}>Start Review</Text>
                                    </Pressable>
                                </>
                            ) : null}

                            {(status === 'queued' || status === 'in-progress') ? (
                                <View style={styles.progressSection}>
                                    <ActivityIndicator size="large" color={ACCENT_GREEN} />
                                    <Text style={styles.progressText}>
                                        {status === 'queued' ? 'Queuing review…' : 'Analyzing code — about 30 s'}
                                    </Text>
                                </View>
                            ) : null}

                            {status === 'failed' ? (
                                <>
                                    <Text style={{ color: ACCENT_RED, fontSize: 14, textAlign: 'center', marginVertical: 20 }}>
                                        {errorMessage ?? 'Review failed. Please try again.'}
                                    </Text>
                                    <Pressable style={styles.startButton} onPress={resetState}>
                                        <Text style={styles.startButtonText}>Try Again</Text>
                                    </Pressable>
                                </>
                            ) : null}

                            {status === 'completed' && result ? (
                                <>
                                    {result.summary ? (
                                        <View style={styles.metricsRow}>
                                            <View style={styles.metric}>
                                                <Text style={styles.metricValue}>+{result.summary.changes.additions}</Text>
                                                <Text style={styles.metricLabel}>additions</Text>
                                            </View>
                                            <View style={styles.metric}>
                                                <Text style={styles.metricValue}>-{result.summary.changes.deletions}</Text>
                                                <Text style={styles.metricLabel}>deletions</Text>
                                            </View>
                                            <View style={styles.metric}>
                                                <Text style={styles.metricValue}>{result.summary.changes.files}</Text>
                                                <Text style={styles.metricLabel}>files</Text>
                                            </View>
                                            <View style={styles.metric}>
                                                <Text style={[styles.metricValue, { color: confidenceColor(result.summary.confidence) }]}>
                                                    {Math.round(result.summary.confidence * 100)}%
                                                </Text>
                                                <Text style={styles.metricLabel}>confidence</Text>
                                            </View>
                                        </View>
                                    ) : result.metrics ? (
                                        <View style={styles.metricsRow}>
                                            <View style={styles.metric}>
                                                <Text style={styles.metricValue}>{result.metrics.tasksCompleted}</Text>
                                                <Text style={styles.metricLabel}>tasks done</Text>
                                            </View>
                                            <View style={styles.metric}>
                                                <Text style={styles.metricValue}>{result.metrics.messagesExchanged}</Text>
                                                <Text style={styles.metricLabel}>messages</Text>
                                            </View>
                                            <View style={styles.metric}>
                                                <Text style={styles.metricValue}>{result.metrics.blockersResolved}</Text>
                                                <Text style={styles.metricLabel}>blockers</Text>
                                            </View>
                                        </View>
                                    ) : null}

                                    {result.reportSummary ? (
                                        <Text style={styles.findingMessage}>{result.reportSummary}</Text>
                                    ) : null}

                                    <View style={styles.findingsHeader}>
                                        <Text style={{ fontSize: 15, fontWeight: '700', color: theme.colors.text }}>
                                            {result.findings.length > 0 ? 'Findings' : 'Review Summary'}
                                        </Text>
                                        <View
                                            style={[
                                                styles.verdictBadge,
                                                {
                                                    backgroundColor: result.summary
                                                        ? (result.summary.verdict === 'approve' ? '#E8F5EE' : '#FDF0ED')
                                                        : '#E8F0F8',
                                                },
                                            ]}
                                        >
                                            <Text
                                                style={[
                                                    styles.verdictText,
                                                    {
                                                        color: result.summary
                                                            ? (result.summary.verdict === 'approve' ? ACCENT_GREEN : ACCENT_RED)
                                                            : '#3D6A8A',
                                                    },
                                                ]}
                                            >
                                                {result.summary
                                                    ? (result.summary.verdict === 'approve' ? 'APPROVE' : 'REQUEST CHANGES')
                                                    : 'COMPLETED'}
                                            </Text>
                                        </View>
                                    </View>

                                    {result.findings.length === 0 ? (
                                        <Text style={styles.noFindingsText}>No blocking issues found.</Text>
                                    ) : (
                                        result.findings.slice(0, 5).map(finding => (
                                            <View key={finding.id} style={[styles.findingCard, { borderLeftColor: severityBorderColor(finding.severity) }]}>
                                                <Text style={styles.findingTitle}>{finding.severity.toUpperCase()} · {finding.type}</Text>
                                                <Text style={styles.findingLocation}>{finding.file}{finding.line ? `:${finding.line}` : ''}</Text>
                                                <Text style={styles.findingMessage}>{finding.message}</Text>
                                                {finding.suggestion ? (
                                                    <Text style={styles.findingSuggestion}>Suggestion: {finding.suggestion}</Text>
                                                ) : null}
                                                <Text style={[styles.findingConfidence, { color: confidenceColor(finding.confidence) }]}>
                                                    Confidence: {Math.round(finding.confidence * 100)}%
                                                </Text>
                                            </View>
                                        ))
                                    )}

                                    <Pressable style={[styles.startButton, { marginTop: 8 }]} onPress={resetState}>
                                        <Text style={styles.startButtonText}>New Review</Text>
                                    </Pressable>
                                </>
                            ) : null}
                        </ScrollView>
                    </View>
                </KeyboardAvoidingView>
            </Modal>
        </>
    );
});
