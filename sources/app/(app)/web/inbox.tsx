/**
 * W9 - Permission Inbox
 * Risk-level coded permission requests with approval workflow
 */

import * as React from 'react';
import { View, Text, Pressable, ScrollView } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useUnistyles } from 'react-native-unistyles';
import { router, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

const ACCENT_GREEN = '#22C55E';
const ACCENT_RED = '#EF4444';
const ACCENT_ORANGE = '#F97316';
const ACCENT_BLUE = '#3B82F6';

type RiskLevel = 'low' | 'medium' | 'high' | 'critical';
type PermissionStatus = 'pending' | 'approved' | 'denied';

interface PermissionRequest {
  id: string;
  type: string;
  title: string;
  description: string;
  agentName: string;
  riskLevel: RiskLevel;
  status: PermissionStatus;
  createdAt: string;
  expiresAt: string;
}

const riskConfig: Record<RiskLevel, { color: string; bg: string; label: string }> = {
  low: { color: ACCENT_GREEN, bg: `${ACCENT_GREEN}15`, label: 'LOW' },
  medium: { color: ACCENT_BLUE, bg: `${ACCENT_BLUE}15`, label: 'MED' },
  high: { color: ACCENT_ORANGE, bg: `${ACCENT_ORANGE}15`, label: 'HIGH' },
  critical: { color: ACCENT_RED, bg: `${ACCENT_RED}15`, label: 'CRIT' },
};

function Sidebar() {
  const { theme } = useUnistyles();

  return (
    <View style={{
      width: 260,
      height: '100%',
      backgroundColor: theme.colors.groupped?.background || '#F9FAFB',
      borderRightWidth: 1,
      borderRightColor: theme.colors.groupped?.border || '#E5E7EB',
      paddingVertical: 24,
    }}>
      <View style={{ paddingHorizontal: 24, marginBottom: 32 }}>
        <Text style={{ fontSize: 24, fontWeight: '700', color: ACCENT_GREEN, fontFamily: 'Outfit' }}>
          Happy
        </Text>
      </View>
    </View>
  );
}

function PermissionCard({
  permission,
  mode,
}: {
  permission: PermissionRequest;
  mode: 'full' | 'observer';
}) {
  const config = riskConfig[permission.riskLevel];
  const [expanded, setExpanded] = React.useState(false);

  const getTimeRemaining = () => {
    const expires = new Date(permission.expiresAt).getTime();
    const now = Date.now();
    const diff = expires - now;
    const minutes = Math.floor(diff / 60000);
    if (minutes < 60) return `${minutes}m`;
    const hours = Math.floor(minutes / 60);
    return `${hours}h`;
  };

  return (
    <Pressable
      onPress={() => setExpanded(!expanded)}
      style={{
        backgroundColor: '#FFFFFF',
        borderRadius: 12,
        padding: 20,
        marginBottom: 12,
        borderWidth: 1,
        borderColor: config.color + '30',
      }}
    >
      {/* Header */}
      <View style={{ flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between' }}>
        <View style={{ flex: 1 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
            <View
              style={{
                paddingHorizontal: 8,
                paddingVertical: 4,
                borderRadius: 4,
                backgroundColor: config.bg,
              }}
            >
              <Text style={{ fontSize: 12, fontWeight: '700', color: config.color, fontFamily: 'Outfit' }}>
                {config.label}
              </Text>
            </View>
            <Text style={{ marginLeft: 12, fontSize: 12, color: '#6B7280', fontFamily: 'Outfit' }}>
              Expires in {getTimeRemaining()}
            </Text>
          </View>
          <Text style={{ fontSize: 16, fontWeight: '600', color: '#111827', fontFamily: 'Outfit' }}>
            {permission.title}
          </Text>
          <Text style={{ fontSize: 14, color: '#6B7280', fontFamily: 'Outfit', marginTop: 4 }}>
            {permission.agentName}
          </Text>
        </View>
        <Ionicons
          name={expanded ? 'chevron-up' : 'chevron-down'}
          size={20}
          color="#9CA3AF"
        />
      </View>

      {/* Expanded Details */}
      {expanded && (
        <View style={{ marginTop: 16, paddingTop: 16, borderTopWidth: 1, borderTopColor: '#E5E7EB' }}>
          <Text style={{ fontSize: 14, color: '#374151', fontFamily: 'Outfit', marginBottom: 16 }}>
            {permission.description}
          </Text>

          <View style={{ flexDirection: 'row', gap: 12 }}>
            {mode === 'full' ? (
              <>
                <Pressable
                  style={{
                    flex: 1,
                    backgroundColor: ACCENT_GREEN,
                    paddingVertical: 12,
                    borderRadius: 8,
                    alignItems: 'center',
                  }}
                >
                  <Text style={{ fontSize: 14, fontWeight: '600', color: '#FFFFFF', fontFamily: 'Outfit' }}>
                    Allow Once
                  </Text>
                </Pressable>
                <Pressable
                  style={{
                    flex: 1,
                    backgroundColor: '#F3F4F6',
                    paddingVertical: 12,
                    borderRadius: 8,
                    alignItems: 'center',
                  }}
                >
                  <Text style={{ fontSize: 14, fontWeight: '600', color: '#374151', fontFamily: 'Outfit' }}>
                    Allow Session
                  </Text>
                </Pressable>
              </>
            ) : (
              <Pressable
                style={{
                  flex: 1,
                  backgroundColor: '#DBEAFE',
                  paddingVertical: 12,
                  borderRadius: 8,
                  alignItems: 'center',
                }}
              >
                <Text style={{ fontSize: 14, fontWeight: '600', color: ACCENT_BLUE, fontFamily: 'Outfit' }}>
                  Notify Master
                </Text>
              </Pressable>
            )}
            <Pressable
              style={{
                flex: 1,
                backgroundColor: '#FEE2E2',
                paddingVertical: 12,
                borderRadius: 8,
                alignItems: 'center',
              }}
            >
              <Text style={{ fontSize: 14, fontWeight: '600', color: ACCENT_RED, fontFamily: 'Outfit' }}>
                Deny
              </Text>
            </Pressable>
          </View>
        </View>
      )}
    </Pressable>
  );
}

export default function PermissionInboxScreen() {
  const { theme } = useUnistyles();
  const insets = useSafeAreaInsets();
  const [filter, setFilter] = React.useState<RiskLevel | 'all'>('all');
  const { role } = useLocalSearchParams<{ role?: string }>();
  const mode: 'full' | 'observer' = role === 'observer' || role === 'reviewer' ? 'observer' : 'full';

  const permissions: PermissionRequest[] = [
    {
      id: '1',
      type: 'file_write',
      title: 'Write to tests/ directory',
      description: 'The Test Writer agent wants to create and modify test files in the tests/ directory. This is a low-risk operation in a test environment.',
      agentName: 'Test Writer',
      riskLevel: 'low',
      status: 'pending',
      createdAt: new Date(Date.now() - 1000 * 60 * 30).toISOString(),
      expiresAt: new Date(Date.now() + 1000 * 60 * 30).toISOString(),
    },
    {
      id: '2',
      type: 'env_access',
      title: 'Access .env.staging file',
      description: 'The Deploy agent needs to read staging environment variables to configure the deployment.',
      agentName: 'Deploy Agent',
      riskLevel: 'medium',
      status: 'pending',
      createdAt: new Date(Date.now() - 1000 * 60 * 15).toISOString(),
      expiresAt: new Date(Date.now() + 1000 * 60 * 45).toISOString(),
    },
    {
      id: '3',
      type: 'git_push',
      title: 'Push to main branch',
      description: 'The Code Reviewer wants to push approved changes directly to the main branch.',
      agentName: 'Code Reviewer',
      riskLevel: 'high',
      status: 'pending',
      createdAt: new Date(Date.now() - 1000 * 60 * 5).toISOString(),
      expiresAt: new Date(Date.now() + 1000 * 60 * 55).toISOString(),
    },
    {
      id: '4',
      type: 'db_migrate',
      title: 'Execute database migration',
      description: 'The Schema Agent wants to run a destructive database migration that will drop and recreate tables.',
      agentName: 'Schema Agent',
      riskLevel: 'critical',
      status: 'pending',
      createdAt: new Date(Date.now() - 1000 * 60 * 2).toISOString(),
      expiresAt: new Date(Date.now() + 1000 * 60 * 58).toISOString(),
    },
  ];

  const filteredPermissions = filter === 'all'
    ? permissions
    : permissions.filter(p => p.riskLevel === filter);

  const counts = {
    all: permissions.length,
    low: permissions.filter(p => p.riskLevel === 'low').length,
    medium: permissions.filter(p => p.riskLevel === 'medium').length,
    high: permissions.filter(p => p.riskLevel === 'high').length,
    critical: permissions.filter(p => p.riskLevel === 'critical').length,
  };

  return (
    <View style={{ flex: 1, backgroundColor: theme.colors.background || '#F9FAFB', flexDirection: 'row' }}>
      <Sidebar />

      <View style={{ flex: 1 }}>
        {/* Header */}
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
            Permission Inbox
          </Text>

          <Pressable
            onPress={() => router.push('/web/settings')}
            style={{
              width: 36,
              height: 36,
              borderRadius: 8,
              backgroundColor: '#F3F4F6',
              justifyContent: 'center',
              alignItems: 'center',
            }}
          >
            <Ionicons name="settings-outline" size={20} color="#6B7280" />
          </Pressable>
        </View>

        {/* Risk Filter */}
        <View
          style={{
            backgroundColor: '#FFFFFF',
            borderBottomWidth: 1,
            borderBottomColor: '#E5E7EB',
            paddingHorizontal: 24,
            paddingVertical: 16,
          }}
        >
          {mode === 'observer' && (
            <View style={{ marginBottom: 12 }}>
              <Text style={{ fontSize: 13, color: '#6B7280', fontFamily: 'Outfit' }}>
                Observer mode: you can Deny or Notify Master. Allow actions are hidden.
              </Text>
            </View>
          )}
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <View style={{ flexDirection: 'row', gap: 8 }}>
              {([
                { key: 'all', label: 'All', count: counts.all },
                { key: 'low', label: 'Low Risk', count: counts.low },
                { key: 'medium', label: 'Medium', count: counts.medium },
                { key: 'high', label: 'High Risk', count: counts.high },
                { key: 'critical', label: 'Critical', count: counts.critical },
              ] as const).map(({ key, label, count }) => (
                <Pressable
                  key={key}
                  onPress={() => setFilter(key)}
                  style={{
                    paddingHorizontal: 16,
                    paddingVertical: 8,
                    borderRadius: 20,
                    backgroundColor: filter === key ? ACCENT_GREEN : '#F3F4F6',
                    flexDirection: 'row',
                    alignItems: 'center',
                  }}
                >
                  <Text
                    style={{
                      fontSize: 14,
                      fontWeight: filter === key ? '600' : '400',
                      color: filter === key ? '#FFFFFF' : '#374151',
                      fontFamily: 'Outfit',
                    }}
                  >
                    {label}
                  </Text>
                  {count > 0 && (
                    <View
                      style={{
                        marginLeft: 6,
                        backgroundColor: filter === key ? 'rgba(255,255,255,0.3)' : '#E5E7EB',
                        borderRadius: 10,
                        paddingHorizontal: 6,
                        paddingVertical: 2,
                      }}
                    >
                      <Text
                        style={{
                          fontSize: 12,
                          fontWeight: '600',
                          color: filter === key ? '#FFFFFF' : '#374151',
                          fontFamily: 'Outfit',
                        }}
                      >
                        {count}
                      </Text>
                    </View>
                  )}
                </Pressable>
              ))}
            </View>
          </ScrollView>
        </View>

        {/* Content */}
        <ScrollView style={{ flex: 1, padding: 24 }}>
          {filteredPermissions.length === 0 ? (
            <View style={{ alignItems: 'center', paddingVertical: 60 }}>
              <Ionicons name="checkmark-circle" size={48} color={ACCENT_GREEN} />
              <Text style={{ marginTop: 16, fontSize: 16, color: '#6B7280', fontFamily: 'Outfit' }}>
                All caught up! No pending permissions.
              </Text>
            </View>
          ) : (
            filteredPermissions.map((permission) => (
              <PermissionCard key={permission.id} permission={permission} mode={mode} />
            ))
          )}
        </ScrollView>

        {/* Batch Actions */}
        {filteredPermissions.length > 0 && mode === 'full' && (
          <View
            style={{
              backgroundColor: '#FFFFFF',
              borderTopWidth: 1,
              borderTopColor: '#E5E7EB',
              padding: 16,
              paddingBottom: 16 + insets.bottom,
            }}
          >
            <View style={{ flexDirection: 'row', gap: 12 }}>
              <Pressable
                style={{
                  flex: 1,
                  backgroundColor: ACCENT_GREEN,
                  paddingVertical: 12,
                  borderRadius: 8,
                  alignItems: 'center',
                }}
              >
                <Text style={{ fontSize: 14, fontWeight: '600', color: '#FFFFFF', fontFamily: 'Outfit' }}>
                  Approve All Low Risk
                </Text>
              </Pressable>
              <Pressable
                style={{
                  flex: 1,
                  backgroundColor: '#F3F4F6',
                  paddingVertical: 12,
                  borderRadius: 8,
                  alignItems: 'center',
                }}
              >
                <Text style={{ fontSize: 14, fontWeight: '600', color: '#374151', fontFamily: 'Outfit' }}>
                  Review All
                </Text>
              </Pressable>
            </View>
          </View>
        )}
      </View>
    </View>
  );
}
