import * as React from 'react';
import { View, Text, Pressable, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useUnistyles } from 'react-native-unistyles';
import { router } from 'expo-router';

interface Permission {
  id: string;
  type: string;
  title: string;
  description: string;
  riskLevel: 'critical' | 'warning' | 'info';
  status: 'pending' | 'approved' | 'denied';
  expiresAt: string;
}

const mockPermissions: Permission[] = [
  {
    id: 'perm-1',
    type: 'agent_request',
    title: 'Agent wants to modify test files',
    description: 'The agent needs write access to tests/ directory',
    riskLevel: 'info',
    status: 'pending',
    expiresAt: new Date(Date.now() + 1000 * 60 * 30).toISOString(),
  },
  {
    id: 'perm-2',
    type: 'file_access',
    title: 'Agent wants to view .env files',
    description: 'The agent needs access to environment configuration',
    riskLevel: 'critical',
    status: 'pending',
    expiresAt: new Date(Date.now() + 1000 * 60 * 45).toISOString(),
  },
];

function Sidebar() {
  const { theme } = useUnistyles();
  return (
    <View style={{ width: 260, height: '100%', backgroundColor: theme.colors.groupped.background, borderRightWidth: 1, borderRightColor: theme.colors.groupped.border }}>
      <View style={{ padding: 20, paddingBottom: 16 }}>
        <Text style={{ fontSize: 20, fontWeight: '700', color: theme.colors.groupped.text, fontFamily: 'Outfit' }}>Happy</Text>
      </View>
      <View style={{ height: 1, backgroundColor: theme.colors.groupped.border }} />
      <View style={{ padding: 16, paddingHorizontal: 12 }}>
        <Pressable onPress={() => router.push('/web/team-chat')} style={{ flexDirection: 'row', alignItems: 'center', padding: 8, borderRadius: 8 }}>
          <Text style={{ fontSize: 14, color: theme.colors.groupped.caption, fontFamily: 'Outfit' }}>Chat</Text>
        </Pressable>
        <Pressable onPress={() => router.push('/web/permission-drawer')} style={{ flexDirection: 'row', alignItems: 'center', padding: 8, borderRadius: 8, backgroundColor: theme.colors.groupped.accent + '20', marginTop: 4 }}>
          <Text style={{ fontSize: 14, fontWeight: '500', color: theme.colors.groupped.accent, fontFamily: 'Outfit' }}>Permissions</Text>
        </Pressable>
      </View>
      <View style={{ flex: 1 }} />
      <View style={{ height: 1, backgroundColor: theme.colors.groupped.border }} />
      <View style={{ padding: 16, paddingHorizontal: 12 }}>
        <Pressable onPress={() => router.push('/web/settings')}>
          <Text style={{ fontSize: 14, color: theme.colors.groupped.caption, fontFamily: 'Outfit' }}>Settings</Text>
        </Pressable>
      </View>
    </View>
  );
}

function PermissionCard({ permission, onApprove, onDeny }: { permission: Permission; onApprove: () => void; onDeny: () => void }) {
  const { theme } = useUnistyles();
  const riskColors = {
    critical: '#D08068',
    warning: '#FFC107',
    info: '#4CAF50',
  };

  const formatTime = (dateStr: string) => {
    const diff = new Date(dateStr).getTime() - Date.now();
    const mins = Math.floor(diff / (1000 * 60));
    return mins > 0 ? `${mins}m left` : 'Expired';
  };

  return (
    <View style={{ backgroundColor: theme.colors.groupped.surface, borderRadius: 12, marginBottom: 12, overflow: 'hidden', borderWidth: 1, borderColor: theme.colors.groupped.border }}>
      <View style={{ height: 8, backgroundColor: riskColors[permission.riskLevel] }} />
      <View style={{ padding: 16 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
          <Text style={{ fontSize: 14, fontWeight: '600', color: theme.colors.groupped.text, fontFamily: 'Outfit', flex: 1 }} numberOfLines={1}>{permission.title}</Text>
          <View style={{ backgroundColor: riskColors[permission.riskLevel] + '20', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 4, marginLeft: 8 }}>
            <Text style={{ fontSize: 11, color: riskColors[permission.riskLevel], fontWeight: '600', textTransform: 'uppercase' }}>{permission.riskLevel}</Text>
          </View>
        </View>
        <Text style={{ fontSize: 13, color: theme.colors.groupped.caption, fontFamily: 'Outfit', marginBottom: 12 }}>{permission.description}</Text>
        <Text style={{ fontSize: 12, color: theme.colors.groupped.caption, marginBottom: 12 }}>{formatTime(permission.expiresAt)}</Text>
        <View style={{ flexDirection: 'row', gap: 12 }}>
          <Pressable onPress={onApprove} style={{ flex: 1, paddingVertical: 10, backgroundColor: '#4CAF50', borderRadius: 8, alignItems: 'center' }}>
            <Text style={{ color: '#fff', fontWeight: '600', fontFamily: 'Outfit' }}>Allow Once</Text>
          </Pressable>
          <Pressable onPress={onDeny} style={{ flex: 1, paddingVertical: 10, backgroundColor: theme.colors.groupped.surface, borderRadius: 8, alignItems: 'center', borderWidth: 1, borderColor: theme.colors.groupped.border }}>
            <Text style={{ color: theme.colors.groupped.text, fontWeight: '600', fontFamily: 'Outfit' }}>Deny</Text>
          </Pressable>
        </View>
      </View>
    </View>
  );
}

function PermissionDrawer() {
  const { theme } = useUnistyles();
  const [permissions, setPermissions] = React.useState(mockPermissions);

  const handleApprove = (id: string) => {
    setPermissions(prev => prev.map(p => p.id === id ? { ...p, status: 'approved' } : p));
  };

  const handleDeny = (id: string) => {
    setPermissions(prev => prev.map(p => p.id === id ? { ...p, status: 'denied' } : p));
  };

  const pendingCount = permissions.filter(p => p.status === 'pending').length;

  return (
    <View style={{ width: 560, height: '100%', backgroundColor: theme.colors.groupped.background, borderLeftWidth: 1, borderLeftColor: theme.colors.groupped.border }}>
      <View style={{ height: 56, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, borderBottomWidth: 1, borderBottomColor: theme.colors.groupped.border }}>
        <Text style={{ fontSize: 16, fontWeight: '600', color: theme.colors.groupped.text, fontFamily: 'Outfit' }}>Permission Inbox</Text>
        {pendingCount > 0 && (
          <View style={{ backgroundColor: theme.colors.groupped.accent, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 12 }}>
            <Text style={{ color: '#fff', fontSize: 12, fontWeight: '600' }}>{pendingCount}</Text>
          </View>
        )}
      </View>
      <View style={{ flex: 1, padding: 20 }}>
        {permissions.filter(p => p.status === 'pending').map(permission => (
          <PermissionCard
            key={permission.id}
            permission={permission}
            onApprove={() => handleApprove(permission.id)}
            onDeny={() => handleDeny(permission.id)}
          />
        ))}
        {pendingCount === 0 && (
          <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
            <Text style={{ fontSize: 14, color: theme.colors.groupped.caption, fontFamily: 'Outfit' }}>No pending permissions</Text>
          </View>
        )}
      </View>
    </View>
  );
}

export default function PermissionDrawerScreen() {
  const insets = useSafeAreaInsets();
  if (Platform.OS !== 'web') return <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}><Text>Permission Drawer is only available on web</Text></View>;
  return (
    <View style={{ flex: 1, flexDirection: 'row', paddingTop: insets.top, paddingBottom: insets.bottom }}>
      <Sidebar />
      <View style={{ flex: 1, backgroundColor: '#1A191820', justifyContent: 'center', alignItems: 'center' }}>
        <Text style={{ color: '#888', fontSize: 14 }}>Team Chat (dimmed)</Text>
      </View>
      <PermissionDrawer />
    </View>
  );
}
