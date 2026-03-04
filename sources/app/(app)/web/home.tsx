/**
 * W7 - Web Home Dashboard
 * Team list + Stats overview + entropy-reduction empty/error states
 */

import * as React from 'react';
import { View, Text, Pressable, ScrollView, ActivityIndicator } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useArtifacts, useIsDataReady, useSocketStatus } from '@/sync/storage';
import { sync } from '@/sync/sync';
import {
  summarizeTeamArtifacts,
  aggregateTeamStats,
  type TeamOverview,
} from '@/components/web/teamOverview';

const ACCENT_GREEN = '#22C55E';

interface QuickStat {
  label: string;
  value: string;
  icon: keyof typeof Ionicons.glyphMap;
  color: string;
}

function Sidebar() {
  const menuItems = [
    { icon: 'home', label: 'Home', active: true },
    { icon: 'chatbubbles', label: 'Chat', route: '/web/team-chat' },
    { icon: 'grid', label: 'Board', route: '/web/devices' },
    { icon: 'people', label: 'Teams', route: '/web/team-info' },
    { icon: 'settings', label: 'Settings', route: '/web/settings' },
  ];

  return (
    <View style={{
      width: 240,
      height: '100%',
      backgroundColor: '#FFFFFF',
      borderRightWidth: 1,
      borderRightColor: '#E5E7EB',
      paddingVertical: 24,
    }}>
      <View style={{ paddingHorizontal: 24, marginBottom: 32 }}>
        <Text style={{ fontSize: 24, fontWeight: '700', color: ACCENT_GREEN, fontFamily: 'Outfit' }}>
          Happy
        </Text>
      </View>

      {menuItems.map((item) => (
        <Pressable
          key={item.label}
          onPress={() => item.route && router.push(item.route)}
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            paddingHorizontal: 24,
            paddingVertical: 12,
            marginHorizontal: 12,
            borderRadius: 8,
            backgroundColor: item.active ? `${ACCENT_GREEN}15` : 'transparent',
          }}
        >
          <Ionicons
            name={item.icon}
            size={20}
            color={item.active ? ACCENT_GREEN : '#6B7280'}
          />
          <Text
            style={{
              marginLeft: 12,
              fontSize: 14,
              fontWeight: item.active ? '600' : '400',
              color: item.active ? ACCENT_GREEN : '#374151',
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

function QuickStats({ stats }: { stats: QuickStat[] }) {
  return (
    <View style={{ flexDirection: 'row', gap: 16, marginBottom: 32 }}>
      {stats.map((stat) => (
        <View
          key={stat.label}
          style={{
            flex: 1,
            backgroundColor: '#FFFFFF',
            borderRadius: 12,
            padding: 20,
            borderWidth: 1,
            borderColor: '#E5E7EB',
          }}
        >
          <View
            style={{
              width: 40,
              height: 40,
              borderRadius: 10,
              backgroundColor: `${stat.color}15`,
              justifyContent: 'center',
              alignItems: 'center',
              marginBottom: 12,
            }}
          >
            <Ionicons name={stat.icon} size={20} color={stat.color} />
          </View>
          <Text style={{ fontSize: 24, fontWeight: '700', color: '#111827', fontFamily: 'Outfit' }}>
            {stat.value}
          </Text>
          <Text style={{ fontSize: 14, color: '#6B7280', fontFamily: 'Outfit' }}>
            {stat.label}
          </Text>
        </View>
      ))}
    </View>
  );
}

function TeamCard({ team }: { team: TeamOverview }) {
  return (
    <Pressable
      onPress={() => router.push(`/web/devices?teamId=${encodeURIComponent(team.id)}`)}
      style={{
        backgroundColor: '#FFFFFF',
        borderRadius: 12,
        padding: 20,
        borderWidth: 1,
        borderColor: '#E5E7EB',
        marginBottom: 12,
      }}
    >
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
          <View
            style={{
              width: 48,
              height: 48,
              borderRadius: 12,
              backgroundColor: `${ACCENT_GREEN}15`,
              justifyContent: 'center',
              alignItems: 'center',
            }}
          >
            <Ionicons name="people" size={24} color={ACCENT_GREEN} />
          </View>
          <View style={{ marginLeft: 16, flex: 1 }}>
            <Text style={{ fontSize: 16, fontWeight: '600', color: '#111827', fontFamily: 'Outfit' }}>
              {team.title}
            </Text>
            <Text style={{ fontSize: 14, color: '#6B7280', fontFamily: 'Outfit', marginTop: 4 }}>
              {team.memberCount} members • {team.activeTaskCount} active tasks
            </Text>
            <Text style={{ fontSize: 12, color: '#9CA3AF', fontFamily: 'Outfit', marginTop: 2 }}>
              Updated {team.updatedAtLabel}
            </Text>
          </View>
        </View>
        <Ionicons name="chevron-forward" size={20} color="#9CA3AF" />
      </View>
    </Pressable>
  );
}

function StateCard({
  icon,
  title,
  description,
  actionLabel,
  onAction,
  secondaryActionLabel,
  onSecondaryAction,
  isLoading,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  description: string;
  actionLabel: string;
  onAction: () => void;
  secondaryActionLabel?: string;
  onSecondaryAction?: () => void;
  isLoading?: boolean;
}) {
  return (
    <View
      style={{
        backgroundColor: '#FFFFFF',
        borderRadius: 16,
        borderWidth: 1,
        borderColor: '#E5E7EB',
        padding: 28,
        alignItems: 'center',
      }}
    >
      <View
        style={{
          width: 56,
          height: 56,
          borderRadius: 14,
          backgroundColor: `${ACCENT_GREEN}15`,
          alignItems: 'center',
          justifyContent: 'center',
          marginBottom: 12,
        }}
      >
        <Ionicons name={icon} size={28} color={ACCENT_GREEN} />
      </View>
      <Text style={{ fontSize: 20, fontWeight: '700', color: '#111827', fontFamily: 'Outfit' }}>{title}</Text>
      <Text
        style={{
          marginTop: 8,
          fontSize: 14,
          color: '#6B7280',
          fontFamily: 'Outfit',
          lineHeight: 22,
          textAlign: 'center',
          maxWidth: 560,
        }}
      >
        {description}
      </Text>

      <View style={{ flexDirection: 'row', gap: 12, marginTop: 18 }}>
        <Pressable
          onPress={onAction}
          style={{
            backgroundColor: ACCENT_GREEN,
            borderRadius: 10,
            paddingHorizontal: 16,
            paddingVertical: 10,
            minWidth: 140,
            alignItems: 'center',
            opacity: isLoading ? 0.8 : 1,
          }}
          disabled={isLoading}
        >
          {isLoading ? (
            <ActivityIndicator color="#FFFFFF" size="small" />
          ) : (
            <Text style={{ fontSize: 14, fontWeight: '600', color: '#FFFFFF', fontFamily: 'Outfit' }}>{actionLabel}</Text>
          )}
        </Pressable>

        {secondaryActionLabel && onSecondaryAction && (
          <Pressable
            onPress={onSecondaryAction}
            style={{
              borderWidth: 1,
              borderColor: '#D1D5DB',
              borderRadius: 10,
              paddingHorizontal: 16,
              paddingVertical: 10,
              minWidth: 140,
              alignItems: 'center',
            }}
          >
            <Text style={{ fontSize: 14, fontWeight: '600', color: '#374151', fontFamily: 'Outfit' }}>{secondaryActionLabel}</Text>
          </Pressable>
        )}
      </View>
    </View>
  );
}

export default function WebHomeScreen() {
  const artifacts = useArtifacts();
  const isDataReady = useIsDataReady();
  const socketStatus = useSocketStatus();

  const [isRefreshing, setIsRefreshing] = React.useState(false);
  const [loadError, setLoadError] = React.useState<string | null>(null);
  const hydratedTeamIdsRef = React.useRef<Set<string>>(new Set());

  const teams = React.useMemo(() => summarizeTeamArtifacts(artifacts), [artifacts]);
  const aggregate = React.useMemo(() => aggregateTeamStats(teams), [teams]);

  const refreshArtifacts = React.useCallback(async () => {
    setIsRefreshing(true);
    setLoadError(null);

    try {
      await sync.fetchArtifactsList();
    } catch (error) {
      setLoadError(error instanceof Error ? error.message : 'Failed to load teams');
    } finally {
      setIsRefreshing(false);
    }
  }, []);

  React.useEffect(() => {
    refreshArtifacts().catch(() => undefined);
  }, [refreshArtifacts]);

  React.useEffect(() => {
    const teamIdsMissingBody = teams
      .filter((team) => !team.hasBody && !hydratedTeamIdsRef.current.has(team.id))
      .slice(0, 3)
      .map((team) => team.id);

    if (teamIdsMissingBody.length === 0) {
      return;
    }

    teamIdsMissingBody.forEach((teamId) => hydratedTeamIdsRef.current.add(teamId));

    Promise.allSettled(teamIdsMissingBody.map((teamId) => sync.fetchArtifactWithBody(teamId))).then((results) => {
      const successCount = results.filter((result) => result.status === 'fulfilled' && result.value).length;
      if (successCount === 0 && teams.length > 0) {
        setLoadError('Failed to hydrate team details from server.');
      }
    });
  }, [teams]);

  const completionRate = aggregate.taskCount > 0
    ? `${Math.round((aggregate.doneTaskCount / aggregate.taskCount) * 100)}%`
    : '--';

  const stats: QuickStat[] = [
    { label: 'Active Teams', value: aggregate.teamCount.toString(), icon: 'people', color: ACCENT_GREEN },
    { label: 'Members', value: aggregate.memberCount.toString(), icon: 'person', color: '#3B82F6' },
    { label: 'Active Tasks', value: aggregate.activeTaskCount.toString(), icon: 'checkbox', color: '#8B5CF6' },
    { label: 'Completion', value: completionRate, icon: 'checkmark-done', color: '#F97316' },
  ];

  const hasCredentialIssue = !sync.getCredentials();
  const hasNetworkIssue = Boolean(loadError) || socketStatus.status === 'error';

  return (
    <View style={{ flex: 1, backgroundColor: '#F9FAFB', flexDirection: 'row' }}>
      <Sidebar />

      <View style={{ flex: 1 }}>
        <View
          style={{
            height: 64,
            backgroundColor: '#FFFFFF',
            borderBottomWidth: 1,
            borderBottomColor: '#E5E7EB',
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            paddingHorizontal: 24,
          }}
        >
          <Text style={{ fontSize: 20, fontWeight: '600', color: '#111827', fontFamily: 'Outfit' }}>
            Dashboard
          </Text>
          <Pressable
            onPress={() => router.push('/teams/new-wizard')}
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              backgroundColor: ACCENT_GREEN,
              paddingHorizontal: 16,
              paddingVertical: 8,
              borderRadius: 8,
            }}
          >
            <Ionicons name="add" size={20} color="#FFFFFF" />
            <Text style={{ marginLeft: 8, fontSize: 14, fontWeight: '600', color: '#FFFFFF', fontFamily: 'Outfit' }}>
              New Team
            </Text>
          </Pressable>
        </View>

        <ScrollView style={{ flex: 1, padding: 24 }}>
          <QuickStats stats={stats} />

          {hasCredentialIssue && (
            <View style={{ marginBottom: 20 }}>
              <StateCard
                icon="key"
                title="Reconnect your account"
                description="We couldn't find a valid session token. Sign in with device code to restore sync with aha-cli and happy-server."
                actionLabel="Open Device Code"
                onAction={() => router.push('/restore/device-code')}
              />
            </View>
          )}

          {!hasCredentialIssue && hasNetworkIssue && (
            <View style={{ marginBottom: 20 }}>
              <StateCard
                icon="cloud-offline"
                title="Sync is unavailable"
                description={loadError || 'Cannot reach happy-server right now. Retry after checking your network and server status.'}
                actionLabel="Retry Sync"
                onAction={refreshArtifacts}
                isLoading={isRefreshing}
              />
            </View>
          )}

          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <Text style={{ fontSize: 18, fontWeight: '600', color: '#111827', fontFamily: 'Outfit' }}>
              Your Teams
            </Text>
            <Pressable onPress={refreshArtifacts}>
              <Text style={{ fontSize: 14, color: ACCENT_GREEN, fontFamily: 'Outfit' }}>
                Refresh
              </Text>
            </Pressable>
          </View>

          {!isDataReady && teams.length === 0 && (
            <View
              style={{
                backgroundColor: '#FFFFFF',
                borderWidth: 1,
                borderColor: '#E5E7EB',
                borderRadius: 12,
                padding: 24,
                flexDirection: 'row',
                alignItems: 'center',
              }}
            >
              <ActivityIndicator color={ACCENT_GREEN} />
              <Text style={{ marginLeft: 10, color: '#6B7280', fontFamily: 'Outfit' }}>Loading your teams…</Text>
            </View>
          )}

          {isDataReady && teams.length === 0 && (
            <StateCard
              icon="sparkles"
              title="Start your first legion"
              description="No team yet. Create one in one click, then run aha-cli on your machine to bring agents online."
              actionLabel="Create Team"
              onAction={() => router.push('/teams/new-wizard')}
              secondaryActionLabel="Open Device Code"
              onSecondaryAction={() => router.push('/restore/device-code')}
              isLoading={isRefreshing}
            />
          )}

          {teams.map((team) => (
            <TeamCard key={team.id} team={team} />
          ))}

          <View style={{ marginTop: 24 }}>
            <Text style={{ fontSize: 18, fontWeight: '600', color: '#111827', fontFamily: 'Outfit', marginBottom: 16 }}>
              One-Click Actions
            </Text>
            <View style={{ flexDirection: 'row', gap: 12 }}>
              {[
                { icon: 'add-circle', label: 'Create Team', color: '#3B82F6', onPress: () => router.push('/teams/new-wizard') },
                { icon: 'key', label: 'Pair Device', color: '#8B5CF6', onPress: () => router.push('/restore/device-code') },
                { icon: 'grid', label: 'Open Board', color: '#22C55E', onPress: () => router.push('/web/devices') },
                { icon: 'stats-chart', label: 'Team Stats', color: '#F97316', onPress: () => router.push('/web/teams/stats') },
              ].map((action) => (
                <Pressable
                  key={action.label}
                  onPress={action.onPress}
                  style={{
                    flex: 1,
                    backgroundColor: '#FFFFFF',
                    borderRadius: 12,
                    padding: 16,
                    alignItems: 'center',
                    borderWidth: 1,
                    borderColor: '#E5E7EB',
                  }}
                >
                  <Ionicons name={action.icon as keyof typeof Ionicons.glyphMap} size={24} color={action.color} />
                  <Text style={{ marginTop: 8, fontSize: 12, color: '#374151', fontFamily: 'Outfit' }}>
                    {action.label}
                  </Text>
                </Pressable>
              ))}
            </View>
          </View>
        </ScrollView>
      </View>
    </View>
  );
}
