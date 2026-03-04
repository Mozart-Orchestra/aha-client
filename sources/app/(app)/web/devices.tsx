import * as React from 'react';
import { View, Text, ScrollView, Pressable, Platform, ActivityIndicator } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useUnistyles } from 'react-native-unistyles';
import { router, useLocalSearchParams } from 'expo-router';
import { useAllMachines, useArtifacts, useIsDataReady, useSocketStatus } from '@/sync/storage';
import { sync } from '@/sync/sync';
import { isMachineOnline } from '@/utils/machineUtils';
import {
  summarizeTeamArtifacts,
  buildBoardColumns,
  type TeamOverview,
  type TeamBoardColumn,
} from '@/components/web/teamOverview';

const ACCENT_GREEN = '#22C55E';

interface DeviceViewModel {
  id: string;
  name: string;
  type: 'laptop' | 'mobile' | 'tablet' | 'server';
  status: 'online' | 'offline';
  lastSeen: number;
  platformLabel: string;
}

function mapPlatformToDeviceType(platform?: string): DeviceViewModel['type'] {
  const normalized = (platform || '').toLowerCase();
  if (normalized.includes('ios') || normalized.includes('android')) return 'mobile';
  if (normalized.includes('ipad') || normalized.includes('tablet')) return 'tablet';
  if (normalized.includes('linux') || normalized.includes('darwin') || normalized.includes('windows') || normalized.includes('mac')) return 'laptop';
  return 'server';
}

function Sidebar() {
  const { theme } = useUnistyles();

  return (
    <View style={{
      width: 260,
      height: '100%',
      backgroundColor: theme.colors.groupped.background,
      borderRightWidth: 1,
      borderRightColor: theme.colors.groupped.border,
    }}>
      <View style={{ padding: 20, paddingBottom: 16 }}>
        <Text style={{
          fontSize: 20,
          fontWeight: '700',
          color: theme.colors.groupped.text,
          fontFamily: 'Outfit',
        }}>
          Happy
        </Text>
      </View>

      <View style={{ height: 1, backgroundColor: theme.colors.groupped.border }} />

      <View style={{ padding: 16, paddingHorizontal: 12 }}>
        <Pressable
          onPress={() => router.push('/web/home')}
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            padding: 8,
            borderRadius: 8,
          }}
        >
          <Text style={{ fontSize: 14, color: theme.colors.groupped.caption, fontFamily: 'Outfit' }}>
            Home
          </Text>
        </Pressable>
        <Pressable
          onPress={() => router.push('/web/devices')}
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            padding: 8,
            borderRadius: 8,
            backgroundColor: theme.colors.groupped.accent + '20',
            marginTop: 4,
          }}
        >
          <Text style={{
            fontSize: 14,
            fontWeight: '500',
            color: theme.colors.groupped.accent,
            fontFamily: 'Outfit',
          }}>
            Board
          </Text>
        </Pressable>
        <Pressable
          onPress={() => router.push('/web/team-chat')}
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            padding: 8,
            borderRadius: 8,
            marginTop: 4,
          }}
        >
          <Text style={{ fontSize: 14, color: theme.colors.groupped.caption, fontFamily: 'Outfit' }}>
            Chat
          </Text>
        </Pressable>
      </View>

      <View style={{ flex: 1 }} />

      <View style={{ height: 1, backgroundColor: theme.colors.groupped.border }} />

      <View style={{ padding: 16, paddingHorizontal: 12 }}>
        <Pressable onPress={() => router.push('/web/settings')}>
          <Text style={{ fontSize: 14, color: theme.colors.groupped.caption, fontFamily: 'Outfit' }}>
            Settings
          </Text>
        </Pressable>
      </View>
    </View>
  );
}

function formatLastSeen(timestamp: number): string {
  const diff = Date.now() - timestamp;
  if (!Number.isFinite(diff) || diff < 0) return 'Just now';
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return 'Just now';
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

function DeviceIcon({ type }: { type: DeviceViewModel['type'] }) {
  const icon = type === 'mobile' ? '📱' : type === 'tablet' ? '📲' : type === 'server' ? '🖥️' : '💻';
  return <Text style={{ fontSize: 22 }}>{icon}</Text>;
}

function DeviceCard({ device }: { device: DeviceViewModel }) {
  const { theme } = useUnistyles();

  return (
    <View
      style={{
        backgroundColor: theme.colors.groupped.surface,
        borderRadius: 12,
        padding: 16,
        marginBottom: 12,
        borderWidth: 1,
        borderColor: theme.colors.groupped.border,
      }}
    >
      <View style={{ flexDirection: 'row', alignItems: 'center' }}>
        <DeviceIcon type={device.type} />
        <View style={{ marginLeft: 12, flex: 1 }}>
          <Text style={{
            fontSize: 14,
            fontWeight: '600',
            color: theme.colors.groupped.text,
            fontFamily: 'Outfit',
          }}>
            {device.name}
          </Text>
          <Text style={{ fontSize: 12, color: theme.colors.groupped.caption, fontFamily: 'Outfit', marginTop: 2 }}>
            {device.platformLabel}
          </Text>
          <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 4 }}>
            <View style={{
              width: 8,
              height: 8,
              borderRadius: 4,
              backgroundColor: device.status === 'online' ? '#4CAF50' : '#9E9E9E',
              marginRight: 6,
            }} />
            <Text style={{
              fontSize: 12,
              color: theme.colors.groupped.caption,
              fontFamily: 'Outfit',
            }}>
              {device.status === 'online' ? 'Online' : `Last seen ${formatLastSeen(device.lastSeen)}`}
            </Text>
          </View>
        </View>
      </View>
    </View>
  );
}

function TeamSelector({
  teams,
  selectedTeamId,
  onSelect,
}: {
  teams: TeamOverview[];
  selectedTeamId: string | null;
  onSelect: (teamId: string) => void;
}) {
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false}>
      <View style={{ flexDirection: 'row', gap: 8 }}>
        {teams.map((team) => {
          const isActive = team.id === selectedTeamId;
          return (
            <Pressable
              key={team.id}
              onPress={() => onSelect(team.id)}
              style={{
                paddingHorizontal: 14,
                paddingVertical: 8,
                borderRadius: 999,
                backgroundColor: isActive ? `${ACCENT_GREEN}20` : '#FFFFFF',
                borderWidth: 1,
                borderColor: isActive ? ACCENT_GREEN : '#E5E7EB',
              }}
            >
              <Text style={{
                fontSize: 13,
                fontWeight: '600',
                color: isActive ? ACCENT_GREEN : '#374151',
                fontFamily: 'Outfit',
              }}>
                {team.title}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </ScrollView>
  );
}

function KanbanColumn({ column }: { column: TeamBoardColumn }) {
  const { theme } = useUnistyles();
  const colors: Record<string, string> = {
    todo: '#6B7280',
    'in-progress': theme.colors.groupped.accent,
    review: '#F59E0B',
    done: '#10B981',
  };

  return (
    <View style={{ width: 280, marginRight: 16 }}>
      <View style={{
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 12,
      }}>
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <View style={{
            width: 12,
            height: 12,
            borderRadius: 6,
            backgroundColor: colors[column.id],
            marginRight: 8,
          }} />
          <Text style={{
            fontSize: 14,
            fontWeight: '600',
            color: theme.colors.groupped.text,
            fontFamily: 'Outfit',
          }}>
            {column.title}
          </Text>
        </View>
        <Text style={{ fontSize: 12, color: theme.colors.groupped.caption, fontFamily: 'Outfit' }}>
          {column.tasks.length}
        </Text>
      </View>

      <View style={{
        backgroundColor: theme.colors.groupped.surface,
        borderRadius: 12,
        padding: 12,
        minHeight: 320,
      }}>
        {column.tasks.map((task) => (
          <View
            key={task.id}
            style={{
              backgroundColor: theme.colors.groupped.background,
              borderRadius: 8,
              padding: 12,
              marginBottom: 8,
              borderWidth: 1,
              borderColor: theme.colors.groupped.border,
            }}
          >
            <Text style={{ fontSize: 13, color: theme.colors.groupped.text, fontFamily: 'Outfit' }}>
              {task.title}
            </Text>
          </View>
        ))}
      </View>
    </View>
  );
}

function StateCard({
  icon,
  title,
  description,
  actionLabel,
  onAction,
  secondaryLabel,
  onSecondary,
  loading,
}: {
  icon: string;
  title: string;
  description: string;
  actionLabel: string;
  onAction: () => void;
  secondaryLabel?: string;
  onSecondary?: () => void;
  loading?: boolean;
}) {
  return (
    <View
      style={{
        backgroundColor: '#FFFFFF',
        borderRadius: 16,
        borderWidth: 1,
        borderColor: '#E5E7EB',
        padding: 24,
        alignItems: 'center',
      }}
    >
      <Text style={{ fontSize: 32 }}>{icon}</Text>
      <Text style={{ marginTop: 10, fontSize: 18, fontWeight: '700', color: '#111827', fontFamily: 'Outfit' }}>{title}</Text>
      <Text style={{ marginTop: 8, fontSize: 14, lineHeight: 22, color: '#6B7280', textAlign: 'center', fontFamily: 'Outfit' }}>
        {description}
      </Text>
      <View style={{ flexDirection: 'row', gap: 12, marginTop: 16 }}>
        <Pressable
          onPress={onAction}
          style={{
            backgroundColor: ACCENT_GREEN,
            borderRadius: 10,
            paddingHorizontal: 16,
            paddingVertical: 10,
            minWidth: 120,
            alignItems: 'center',
            opacity: loading ? 0.8 : 1,
          }}
        >
          {loading ? (
            <ActivityIndicator color="#FFF" size="small" />
          ) : (
            <Text style={{ fontSize: 14, fontWeight: '600', color: '#FFFFFF', fontFamily: 'Outfit' }}>{actionLabel}</Text>
          )}
        </Pressable>

        {secondaryLabel && onSecondary && (
          <Pressable
            onPress={onSecondary}
            style={{
              borderWidth: 1,
              borderColor: '#D1D5DB',
              borderRadius: 10,
              paddingHorizontal: 16,
              paddingVertical: 10,
              minWidth: 120,
              alignItems: 'center',
            }}
          >
            <Text style={{ fontSize: 14, fontWeight: '600', color: '#374151', fontFamily: 'Outfit' }}>{secondaryLabel}</Text>
          </Pressable>
        )}
      </View>
    </View>
  );
}

function MainContent() {
  const { theme } = useUnistyles();
  const artifacts = useArtifacts();
  const machines = useAllMachines();
  const isDataReady = useIsDataReady();
  const socketStatus = useSocketStatus();
  const { teamId: routeTeamId } = useLocalSearchParams<{ teamId?: string }>();

  const [selectedTeamId, setSelectedTeamId] = React.useState<string | null>(null);
  const [isRefreshing, setIsRefreshing] = React.useState(false);
  const [loadError, setLoadError] = React.useState<string | null>(null);
  const hydratedTeamIdsRef = React.useRef<Set<string>>(new Set());

  const teams = React.useMemo(() => summarizeTeamArtifacts(artifacts), [artifacts]);

  React.useEffect(() => {
    if (typeof routeTeamId === 'string' && routeTeamId.trim().length > 0) {
      setSelectedTeamId(routeTeamId);
      return;
    }
    if (!selectedTeamId && teams.length > 0) {
      setSelectedTeamId(teams[0].id);
    }
  }, [routeTeamId, selectedTeamId, teams]);

  const refreshData = React.useCallback(async () => {
    setIsRefreshing(true);
    setLoadError(null);

    try {
      await Promise.all([sync.fetchArtifactsList(), sync.refreshMachines()]);
    } catch (error) {
      setLoadError(error instanceof Error ? error.message : 'Failed to refresh board data');
    } finally {
      setIsRefreshing(false);
    }
  }, []);

  React.useEffect(() => {
    refreshData().catch(() => undefined);
  }, [refreshData]);

  const selectedTeam = React.useMemo(() => {
    if (!selectedTeamId) return teams[0] || null;
    return teams.find((team) => team.id === selectedTeamId) || null;
  }, [selectedTeamId, teams]);

  React.useEffect(() => {
    if (!selectedTeam) {
      return;
    }
    if (selectedTeam.hasBody || hydratedTeamIdsRef.current.has(selectedTeam.id)) {
      return;
    }

    hydratedTeamIdsRef.current.add(selectedTeam.id);
    sync.fetchArtifactWithBody(selectedTeam.id).then((artifact) => {
      if (!artifact) {
        setLoadError('Failed to load board details for selected team.');
      }
    });
  }, [selectedTeam]);

  const devices = React.useMemo<DeviceViewModel[]>(() => {
    return machines.map((machine) => {
      const host = machine.metadata?.displayName || machine.metadata?.host || machine.id;
      const platform = machine.metadata?.platform || 'unknown';

      return {
        id: machine.id,
        name: host,
        platformLabel: platform,
        type: mapPlatformToDeviceType(platform),
        status: isMachineOnline(machine) ? 'online' : 'offline',
        lastSeen: machine.activeAt || machine.updatedAt || Date.now(),
      };
    });
  }, [machines]);

  const onlineDeviceCount = devices.filter((device) => device.status === 'online').length;
  const boardColumns = React.useMemo(
    () => buildBoardColumns(selectedTeam?.tasks || []),
    [selectedTeam],
  );

  const hasCredentialIssue = !sync.getCredentials();
  const hasNetworkIssue = Boolean(loadError) || socketStatus.status === 'error';

  const noTeams = isDataReady && teams.length === 0;
  const noTasks = selectedTeam && selectedTeam.taskCount === 0;

  return (
    <View style={{ flex: 1 }}>
      <View style={{
        height: 56,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 24,
        backgroundColor: theme.colors.groupped.background,
        borderBottomWidth: 1,
        borderBottomColor: theme.colors.groupped.border,
      }}>
        <Text style={{ fontSize: 16, fontWeight: '600', color: theme.colors.groupped.text, fontFamily: 'Outfit' }}>
          Devices & Board
        </Text>
        <Pressable
          onPress={refreshData}
          style={{
            paddingHorizontal: 16,
            paddingVertical: 8,
            backgroundColor: theme.colors.groupped.accent,
            borderRadius: 8,
            opacity: isRefreshing ? 0.8 : 1,
          }}
          disabled={isRefreshing}
        >
          <Text style={{ color: '#fff', fontWeight: '600', fontFamily: 'Outfit', fontSize: 12 }}>
            {isRefreshing ? 'Refreshing…' : 'Refresh'}
          </Text>
        </Pressable>
      </View>

      <ScrollView style={{ flex: 1, backgroundColor: theme.colors.groupped.page }}>
        {hasCredentialIssue && (
          <View style={{ padding: 24 }}>
            <StateCard
              icon="🔐"
              title="Authentication required"
              description="Open device code login to restore connection with aha-cli and happy-server."
              actionLabel="Open Device Code"
              onAction={() => router.push('/restore/device-code')}
            />
          </View>
        )}

        {!hasCredentialIssue && hasNetworkIssue && (
          <View style={{ paddingHorizontal: 24, paddingTop: 24 }}>
            <StateCard
              icon="🌐"
              title="Cannot sync board"
              description={loadError || 'Network error detected. Please retry after verifying server availability.'}
              actionLabel="Retry"
              onAction={refreshData}
              loading={isRefreshing}
            />
          </View>
        )}

        {noTeams && (
          <View style={{ padding: 24 }}>
            <StateCard
              icon="🧭"
              title="No team yet"
              description="Create your first team to unlock board, chat, and runtime agent collaboration."
              actionLabel="Create Team"
              onAction={() => router.push('/teams/new-wizard')}
              secondaryLabel="Open Home"
              onSecondary={() => router.push('/web/home')}
            />
          </View>
        )}

        {!noTeams && (
          <>
            <View style={{ padding: 24 }}>
              <Text style={{ fontSize: 16, fontWeight: '600', color: theme.colors.groupped.text, fontFamily: 'Outfit', marginBottom: 12 }}>
                Team Board
              </Text>
              <TeamSelector
                teams={teams}
                selectedTeamId={selectedTeam?.id || null}
                onSelect={setSelectedTeamId}
              />
              {selectedTeam?.parseError && (
                <Text style={{ marginTop: 8, fontSize: 12, color: '#F59E0B', fontFamily: 'Outfit' }}>
                  Team data is partially unreadable. Showing available fields only.
                </Text>
              )}
            </View>

            <View style={{
              borderTopWidth: 1,
              borderTopColor: theme.colors.groupped.border,
              paddingHorizontal: 24,
              paddingTop: 24,
            }}>
              <Text style={{
                fontSize: 16,
                fontWeight: '600',
                color: theme.colors.groupped.text,
                fontFamily: 'Outfit',
                marginBottom: 16,
              }}>
                Connected Devices ({onlineDeviceCount} online)
              </Text>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
                {devices.length === 0 ? (
                  <View style={{ width: '100%' }}>
                    <StateCard
                      icon="🛠️"
                      title="No device connected"
                      description="Run aha-cli on your machine to register it and keep your agent runtime online."
                      actionLabel="Open Device Code"
                      onAction={() => router.push('/restore/device-code')}
                    />
                  </View>
                ) : (
                  devices.map((device) => (
                    <View key={device.id} style={{ width: '33.33%', paddingRight: 12 }}>
                      <DeviceCard device={device} />
                    </View>
                  ))
                )}
              </View>
            </View>

            <View style={{
              borderTopWidth: 1,
              borderTopColor: theme.colors.groupped.border,
              padding: 24,
            }}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                <Text style={{
                  fontSize: 16,
                  fontWeight: '600',
                  color: theme.colors.groupped.text,
                  fontFamily: 'Outfit',
                  marginBottom: 16,
                }}>
                  {selectedTeam?.title || 'Selected Team'} Board
                </Text>
                {selectedTeam && (
                  <Pressable onPress={() => router.push(`/teams/${selectedTeam.id}`)}>
                    <Text style={{ fontSize: 13, fontWeight: '600', color: ACCENT_GREEN, fontFamily: 'Outfit' }}>Open Team</Text>
                  </Pressable>
                )}
              </View>

              {!isDataReady && !selectedTeam && (
                <View style={{ paddingVertical: 16, flexDirection: 'row', alignItems: 'center' }}>
                  <ActivityIndicator color={ACCENT_GREEN} />
                  <Text style={{ marginLeft: 10, color: '#6B7280', fontFamily: 'Outfit' }}>Loading board data…</Text>
                </View>
              )}

              {selectedTeam && noTasks && (
                <StateCard
                  icon="📋"
                  title="Board is empty"
                  description="Create your first task to kick off execution. Agents can then auto-pick work and move cards across stages."
                  actionLabel="Create Task"
                  onAction={() => router.push(`/teams/${selectedTeam.id}`)}
                  secondaryLabel="Refresh"
                  onSecondary={refreshData}
                  loading={isRefreshing}
                />
              )}

              {selectedTeam && !noTasks && (
                <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                  {boardColumns.map((column) => (
                    <KanbanColumn key={column.id} column={column} />
                  ))}
                </ScrollView>
              )}
            </View>
          </>
        )}
      </ScrollView>
    </View>
  );
}

export default function DevicesScreen() {
  const insets = useSafeAreaInsets();

  if (Platform.OS !== 'web') {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <Text>Devices is only available on web</Text>
      </View>
    );
  }

  return (
    <View style={{
      flex: 1,
      flexDirection: 'row',
      paddingTop: insets.top,
      paddingBottom: insets.bottom,
    }}>
      <Sidebar />
      <MainContent />
    </View>
  );
}
