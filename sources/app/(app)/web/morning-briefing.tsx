/**
 * W8 - Web Morning Briefing
 * Daily summary with blockers, pending reviews, and session continuation
 *
 * Spec: WEB-SCREENS-W6-W10-SPEC.md (W8)
 * Mobile Equivalent: S19 (teams/morning-briefing.tsx)
 * PRD Rank: R11 (Morning Briefing)
 */

import * as React from 'react';
import { View, Text, Pressable, ScrollView, ActivityIndicator } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useUnistyles } from 'react-native-unistyles';
import { router, useLocalSearchParams, type Href } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useBriefing, type BriefingBlocker, type BriefingTask } from '@/hooks/useBriefing';

const ACCENT_GREEN = '#3D8A5A';
const ACCENT_RED = '#D08068';
const ACCENT_BLUE = '#3D6A8A';

interface SidebarMenuItem {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  route: Href;
}

function Sidebar() {
  const menuItems: SidebarMenuItem[] = [
    { icon: 'home', label: 'Home', route: '/web/home' },
    { icon: 'chatbubbles', label: 'Chat', route: '/web/team-chat' },
    { icon: 'grid', label: 'Board', route: '/web/board' },
    { icon: 'desktop', label: 'Devices', route: '/web/devices' },
    { icon: 'people', label: 'Teams', route: '/web/team-info' },
    { icon: 'settings', label: 'Settings', route: '/web/settings' },
  ];

  return (
    <View
      style={{
        width: 260,
        height: '100%',
        backgroundColor: '#FFFFFF',
        borderRightWidth: 1,
        borderRightColor: '#E8E7E4',
        paddingVertical: 24,
      }}
    >
      <View style={{ paddingHorizontal: 24, marginBottom: 32 }}>
        <Text style={{ fontSize: 24, fontWeight: '700', color: ACCENT_GREEN, fontFamily: 'Outfit' }}>
          Happy
        </Text>
      </View>

      {menuItems.map((item) => (
        <Pressable
          key={item.label}
          onPress={() => router.push(item.route)}
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            paddingHorizontal: 24,
            paddingVertical: 12,
            marginHorizontal: 12,
            borderRadius: 8,
          }}
        >
          <Ionicons name={item.icon} size={20} color="#6B7280" />
          <Text
            style={{
              marginLeft: 12,
              fontSize: 14,
              fontWeight: '400',
              color: '#374151',
              fontFamily: 'Outfit',
            }}
          >
            {item.label}
          </Text>
        </Pressable>
      ))}

      <View style={{ flex: 1 }} />

      <View style={{ padding: 24 }}>
        <Pressable
          onPress={() => router.push('/web/login')}
          style={{ flexDirection: 'row', alignItems: 'center' }}
        >
          <Ionicons name="log-out-outline" size={20} color="#6B7280" />
          <Text style={{ marginLeft: 12, fontSize: 14, color: '#6B7280', fontFamily: 'Outfit' }}>
            Sign Out
          </Text>
        </Pressable>
      </View>
    </View>
  );
}

function getConfidenceColors(confidence: number): { bg: string; text: string } {
  if (confidence >= 0.9) return { bg: '#E8F5EE', text: ACCENT_GREEN };
  if (confidence >= 0.7) return { bg: '#E8F0F8', text: ACCENT_BLUE };
  return { bg: '#FDF0ED', text: ACCENT_RED };
}

interface TaskRowItemProps {
  title: string;
  meta?: string;
  iconName: keyof typeof Ionicons.glyphMap;
  iconBg: string;
  iconColor: string;
  confidence?: number;
  isLast?: boolean;
  onPress?: () => void;
}

function TaskRowItem({
  title,
  meta,
  iconName,
  iconBg,
  iconColor,
  confidence,
  isLast,
  onPress,
}: TaskRowItemProps) {
  const confidenceColors = confidence !== undefined ? getConfidenceColors(confidence) : null;

  return (
    <Pressable
      onPress={onPress}
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 12,
        borderBottomWidth: isLast ? 0 : 1,
        borderBottomColor: '#F5F4F1',
      }}
    >
      <View
        style={{
          width: 32,
          height: 32,
          borderRadius: 8,
          backgroundColor: iconBg,
          alignItems: 'center',
          justifyContent: 'center',
          marginRight: 12,
        }}
      >
        <Ionicons name={iconName} size={16} color={iconColor} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={{ fontSize: 14, fontWeight: '500', color: '#1A1918', fontFamily: 'Outfit' }} numberOfLines={1}>
          {title}
        </Text>
        {meta ? (
          <Text style={{ fontSize: 12, color: '#6D6C6A', fontFamily: 'Outfit' }} numberOfLines={1}>
            {meta}
          </Text>
        ) : null}
      </View>
      {confidence !== undefined && confidenceColors ? (
        <View
          style={{
            paddingHorizontal: 8,
            paddingVertical: 4,
            borderRadius: 8,
            backgroundColor: confidenceColors.bg,
          }}
        >
          <Text
            style={{
              fontSize: 11,
              fontWeight: '600',
              color: confidenceColors.text,
              fontFamily: 'Outfit',
            }}
          >
            {Math.round(confidence * 100)}%
          </Text>
        </View>
      ) : null}
    </Pressable>
  );
}

interface BlockerRowProps {
  blocker: BriefingBlocker;
  isLast?: boolean;
}

function BlockerRow({ blocker, isLast }: BlockerRowProps) {
  return (
    <Pressable
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 12,
        borderBottomWidth: isLast ? 0 : 1,
        borderBottomColor: '#F5F4F1',
      }}
    >
      <View
        style={{
          width: 32,
          height: 32,
          borderRadius: 8,
          backgroundColor: '#FBE4DC',
          alignItems: 'center',
          justifyContent: 'center',
          marginRight: 12,
        }}
      >
        <Ionicons name="warning-outline" size={16} color={ACCENT_RED} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={{ fontSize: 14, fontWeight: '500', color: '#1A1918', fontFamily: 'Outfit' }} numberOfLines={1}>
          {blocker.taskTitle}
        </Text>
        <Text style={{ fontSize: 12, color: '#6D6C6A', fontFamily: 'Outfit' }} numberOfLines={1}>
          {blocker.description}
        </Text>
      </View>
    </Pressable>
  );
}

export default function WebMorningBriefingScreen() {
  const { theme } = useUnistyles();
  const insets = useSafeAreaInsets();
  const { teamId } = useLocalSearchParams<{ teamId?: string }>();

  const { briefing, isLoading, error, refresh } = useBriefing(teamId ?? '');

  const handleSkip = React.useCallback(() => {
    // Navigate to team chat or home
    if (teamId) {
      router.replace(`/web/team-chat?teamId=${encodeURIComponent(teamId)}`);
    } else {
      router.replace('/web/home');
    }
  }, [teamId]);

  const handleResumeSession = React.useCallback(() => {
    const sessionId = briefing?.contextResume?.lastActiveSession?.sessionId;
    if (sessionId) {
      router.push(`/session/${sessionId}`);
    }
  }, [briefing]);

  if (isLoading && !briefing) {
    return (
      <View style={{ flex: 1, backgroundColor: '#F5F4F1', flexDirection: 'row' }}>
        <Sidebar />
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <ActivityIndicator size="large" color={ACCENT_GREEN} />
          <Text style={{ marginTop: 16, fontSize: 14, color: '#6D6C6A', fontFamily: 'Outfit' }}>
            Preparing your briefing...
          </Text>
        </View>
      </View>
    );
  }

  if (error) {
    return (
      <View style={{ flex: 1, backgroundColor: '#F5F4F1', flexDirection: 'row' }}>
        <Sidebar />
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24 }}>
          <Ionicons name="cloud-offline-outline" size={48} color="#6D6C6A" />
          <Text style={{ marginTop: 16, fontSize: 16, color: '#1A1918', fontFamily: 'Outfit', textAlign: 'center' }}>
            {error}
          </Text>
          <Pressable
            onPress={refresh}
            style={{
              marginTop: 24,
              backgroundColor: ACCENT_GREEN,
              paddingHorizontal: 24,
              paddingVertical: 12,
              borderRadius: 10,
            }}
          >
            <Text style={{ fontSize: 14, fontWeight: '600', color: '#FFFFFF', fontFamily: 'Outfit' }}>
              Retry
            </Text>
          </Pressable>
        </View>
      </View>
    );
  }

  const greetingMessage = briefing?.greeting?.message ?? 'Good morning';
  const greetingDate =
    briefing?.greeting?.date ??
    new Date().toLocaleDateString('en-US', {
      weekday: 'long',
      month: 'long',
      day: 'numeric',
    });

  return (
    <View style={{ flex: 1, backgroundColor: '#F5F4F1', flexDirection: 'row' }}>
      <Sidebar />

      <View style={{ flex: 1 }}>
        {/* Header */}
        <View
          style={{
            height: 64,
            backgroundColor: '#FFFFFF',
            borderBottomWidth: 1,
            borderBottomColor: '#E8E7E4',
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            paddingHorizontal: 24,
          }}
        >
          <Text style={{ fontSize: 20, fontWeight: '600', color: '#1A1918', fontFamily: 'Outfit' }}>
            Morning Briefing
          </Text>
          <Pressable onPress={handleSkip}>
            <Text style={{ fontSize: 15, color: '#6D6C6A', fontFamily: 'Outfit' }}>Skip →</Text>
          </Pressable>
        </View>

        {/* Content */}
        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={{
            padding: 32,
            paddingBottom: 40 + insets.bottom,
          }}
        >
          <View style={{ maxWidth: 760, width: '100%', alignSelf: 'center' }}>
            {/* Greeting Header */}
            <View style={{ marginBottom: 24 }}>
              <Text style={{ fontSize: 30, fontWeight: '700', color: '#1A1918', fontFamily: 'Outfit' }}>
                {greetingMessage}
              </Text>
              <Text style={{ fontSize: 15, color: '#6D6C6A', fontFamily: 'Outfit', marginTop: 4 }}>
                {greetingDate}
              </Text>
            </View>

            {/* Blockers Card */}
            {(briefing?.blockers?.length ?? 0) > 0 && (
              <View
                style={{
                  backgroundColor: '#FDF0ED',
                  borderRadius: 12,
                  padding: 20,
                  marginBottom: 16,
                  borderLeftWidth: 4,
                  borderLeftColor: ACCENT_RED,
                }}
              >
                <Text
                  style={{
                    fontSize: 14,
                    fontWeight: '600',
                    color: ACCENT_RED,
                    letterSpacing: 0.5,
                    textTransform: 'uppercase',
                    marginBottom: 12,
                    fontFamily: 'Outfit',
                  }}
                >
                  Blockers ({briefing!.blockers.length})
                </Text>
                {briefing!.blockers.map((blocker, index) => (
                  <BlockerRow
                    key={blocker.id}
                    blocker={blocker}
                    isLast={index === briefing!.blockers.length - 1}
                  />
                ))}
                <Pressable style={{ marginTop: 12 }}>
                  <Text style={{ fontSize: 14, fontWeight: '500', color: ACCENT_RED, fontFamily: 'Outfit' }}>
                    Review Blockers →
                  </Text>
                </Pressable>
              </View>
            )}

            {/* Pending Review Card */}
            {(briefing?.pendingReviews?.length ?? 0) > 0 && (
              <View
                style={{
                  backgroundColor: '#F0F7F3',
                  borderRadius: 12,
                  padding: 20,
                  marginBottom: 16,
                  borderLeftWidth: 4,
                  borderLeftColor: ACCENT_GREEN,
                }}
              >
                <Text
                  style={{
                    fontSize: 14,
                    fontWeight: '600',
                    color: ACCENT_GREEN,
                    letterSpacing: 0.5,
                    textTransform: 'uppercase',
                    marginBottom: 12,
                    fontFamily: 'Outfit',
                  }}
                >
                  Pending Review ({briefing!.pendingReviews.length})
                </Text>
                {briefing!.pendingReviews.map((task, index) => (
                  <TaskRowItem
                    key={task.id}
                    title={task.title}
                    meta={task.agentName ?? task.assigneeId ?? undefined}
                    iconName="git-pull-request-outline"
                    iconBg="#E8F5EE"
                    iconColor={ACCENT_GREEN}
                    confidence={task.confidence}
                    isLast={index === briefing!.pendingReviews.length - 1}
                  />
                ))}
              </View>
            )}

            {/* Overnight Summary Card */}
            <View
              style={{
                backgroundColor: '#FFFFFF',
                borderRadius: 12,
                padding: 20,
                marginBottom: 16,
                borderWidth: 1,
                borderColor: '#E8E7E4',
              }}
            >
              <Text
                style={{
                  fontSize: 14,
                  fontWeight: '600',
                  color: '#6D6C6A',
                  letterSpacing: 0.5,
                  textTransform: 'uppercase',
                  marginBottom: 12,
                  fontFamily: 'Outfit',
                }}
              >
                Overnight Summary
              </Text>
              {briefing?.summary && (
                <Text style={{ fontSize: 14, color: '#6D6C6A', fontFamily: 'Outfit', lineHeight: 22, marginBottom: 16 }}>
                  {briefing.summary}
                </Text>
              )}
              <View style={{ flexDirection: 'row', gap: 32 }}>
                <View style={{ alignItems: 'center' }}>
                  <Text style={{ fontSize: 26, fontWeight: '700', color: ACCENT_GREEN, fontFamily: 'Outfit' }}>
                    {briefing?.keyMetrics?.tasksCompleted ?? 0}
                  </Text>
                  <Text style={{ fontSize: 13, color: '#6D6C6A', fontFamily: 'Outfit' }}>done</Text>
                </View>
                <View style={{ alignItems: 'center' }}>
                  <Text style={{ fontSize: 26, fontWeight: '700', color: ACCENT_GREEN, fontFamily: 'Outfit' }}>
                    {briefing?.keyMetrics?.tokensUsed
                      ? `${Math.round(briefing.keyMetrics.tokensUsed / 1000)}k`
                      : '0'}
                  </Text>
                  <Text style={{ fontSize: 13, color: '#6D6C6A', fontFamily: 'Outfit' }}>tokens</Text>
                </View>
                <View style={{ alignItems: 'center' }}>
                  <Text style={{ fontSize: 26, fontWeight: '700', color: ACCENT_GREEN, fontFamily: 'Outfit' }}>
                    {briefing?.keyMetrics?.estimatedCost !== undefined
                      ? `$${briefing.keyMetrics.estimatedCost.toFixed(2)}`
                      : '$0.00'}
                  </Text>
                  <Text style={{ fontSize: 13, color: '#6D6C6A', fontFamily: 'Outfit' }}>cost</Text>
                </View>
              </View>
            </View>

            {/* Continue Where You Left Off Card */}
            <View
              style={{
                backgroundColor: '#FFFFFF',
                borderRadius: 12,
                padding: 20,
                marginBottom: 16,
                borderWidth: 1.5,
                borderColor: ACCENT_GREEN,
              }}
            >
              <Text
                style={{
                  fontSize: 14,
                  fontWeight: '600',
                  color: ACCENT_GREEN,
                  letterSpacing: 0.5,
                  textTransform: 'uppercase',
                  marginBottom: 8,
                  fontFamily: 'Outfit',
                }}
              >
                Continue Where You Left Off
              </Text>
              {briefing?.contextResume?.lastActiveSession ? (
                <>
                  {briefing.contextResume.lastActiveSession.taskTitle && (
                    <Text
                      style={{ fontSize: 16, fontWeight: '600', color: '#1A1918', fontFamily: 'Outfit', marginBottom: 4 }}
                      numberOfLines={2}
                    >
                      {briefing.contextResume.lastActiveSession.taskTitle}
                    </Text>
                  )}
                  <Text style={{ fontSize: 13, color: '#6D6C6A', fontFamily: 'Outfit', marginBottom: 16 }}>
                    {briefing.contextResume.continuationHint}
                  </Text>
                  <Pressable
                    onPress={handleResumeSession}
                    style={{
                      backgroundColor: ACCENT_GREEN,
                      borderRadius: 10,
                      paddingVertical: 14,
                      alignItems: 'center',
                    }}
                  >
                    <Text style={{ fontSize: 15, fontWeight: '600', color: '#FFFFFF', fontFamily: 'Outfit' }}>
                      Resume Session →
                    </Text>
                  </Pressable>
                </>
              ) : (
                <Text style={{ fontSize: 13, color: '#6D6C6A', fontFamily: 'Outfit' }}>
                  No active session found. Start a new task from the board.
                </Text>
              )}
            </View>

            {/* In Progress Card */}
            {(briefing?.inProgressTasks?.length ?? 0) > 0 && (
              <View
                style={{
                  backgroundColor: '#FFFFFF',
                  borderRadius: 12,
                  padding: 20,
                  marginBottom: 16,
                  borderWidth: 1,
                  borderColor: '#E8E7E4',
                }}
              >
                <Text
                  style={{
                    fontSize: 14,
                    fontWeight: '600',
                    color: '#6D6C6A',
                    letterSpacing: 0.5,
                    textTransform: 'uppercase',
                    marginBottom: 12,
                    fontFamily: 'Outfit',
                  }}
                >
                  In Progress ({briefing!.inProgressTasks.length})
                </Text>
                {briefing!.inProgressTasks.map((task, index) => (
                  <TaskRowItem
                    key={task.id}
                    title={task.title}
                    meta={task.agentName ?? task.assigneeId ?? undefined}
                    iconName="ellipsis-horizontal-circle-outline"
                    iconBg="#E8F0F8"
                    iconColor={ACCENT_BLUE}
                    isLast={index === briefing!.inProgressTasks.length - 1}
                  />
                ))}
              </View>
            )}

            {/* Next Actions Card */}
            {(briefing?.nextActions?.length ?? 0) > 0 && (
              <View
                style={{
                  backgroundColor: '#FAFAF8',
                  borderRadius: 12,
                  padding: 20,
                  borderWidth: 1,
                  borderColor: '#E8E7E4',
                }}
              >
                <Text
                  style={{
                    fontSize: 14,
                    fontWeight: '600',
                    color: '#6D6C6A',
                    letterSpacing: 0.5,
                    textTransform: 'uppercase',
                    marginBottom: 12,
                    fontFamily: 'Outfit',
                  }}
                >
                  Suggested Next Actions
                </Text>
                {briefing!.nextActions.map((action, index) => (
                  <View
                    key={index}
                    style={{
                      flexDirection: 'row',
                      alignItems: 'flex-start',
                      paddingVertical: 8,
                    }}
                  >
                    <View
                      style={{
                        width: 24,
                        height: 24,
                        borderRadius: 12,
                        backgroundColor: '#E8E7E4',
                        alignItems: 'center',
                        justifyContent: 'center',
                        marginRight: 12,
                        marginTop: 1,
                      }}
                    >
                      <Text style={{ fontSize: 12, fontWeight: '700', color: '#6D6C6A', fontFamily: 'Outfit' }}>
                        {index + 1}
                      </Text>
                    </View>
                    <Text style={{ flex: 1, fontSize: 15, color: '#1A1918', fontFamily: 'Outfit', lineHeight: 22 }}>
                      {action}
                    </Text>
                  </View>
                ))}
              </View>
            )}
          </View>
        </ScrollView>
      </View>
    </View>
  );
}
