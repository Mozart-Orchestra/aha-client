import * as React from 'react';
import { View, Text, Pressable, Switch, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Image } from 'expo-image';
import { useUnistyles } from 'react-native-unistyles';
import { router } from 'expo-router';

interface Settings {
  account: {
    displayName: string;
    email: string;
    avatar: string;
  };
  notifications: {
    emailEnabled: boolean;
    pushEnabled: boolean;
    agentAlerts: boolean;
  };
  security: {
    twoFactorEnabled: boolean;
    deviceAuthEnabled: boolean;
  };
}

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
      </View>
      <View style={{ flex: 1 }} />
      <View style={{ height: 1, backgroundColor: theme.colors.groupped.border }} />
      <View style={{ padding: 16, paddingHorizontal: 12 }}>
        <Pressable onPress={() => router.push('/web/settings')} style={{ flexDirection: 'row', alignItems: 'center', padding: 8, borderRadius: 8, backgroundColor: theme.colors.groupped.accent + '20' }}>
          <Text style={{ fontSize: 14, fontWeight: '500', color: theme.colors.groupped.accent, fontFamily: 'Outfit' }}>Settings</Text>
        </Pressable>
      </View>
    </View>
  );
}

function SettingsRow({ label, value, type, onToggle }: { label: string; value: boolean | string; type: 'toggle' | 'display'; onToggle?: (value: boolean) => void }) {
  const { theme } = useUnistyles();
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 12 }}>
      <Text style={{ fontSize: 14, color: theme.colors.groupped.text, fontFamily: 'Outfit' }}>{label}</Text>
      {type === 'toggle' && typeof value === 'boolean' ? (
        <Switch value={value} onValueChange={onToggle} />
      ) : (
        <Text style={{ fontSize: 14, color: theme.colors.groupped.caption, fontFamily: 'Outfit' }}>{value}</Text>
      )}
    </View>
  );
}

function SettingsPanel() {
  const { theme } = useUnistyles();
  const [settings, setSettings] = React.useState<Settings>({
    account: { displayName: 'Alex Chen', email: 'alex@example.com', avatar: 'https://i.pravatar.cc/150?u=user-1' },
    notifications: { emailEnabled: true, pushEnabled: true, agentAlerts: true },
    security: { twoFactorEnabled: false, deviceAuthEnabled: true },
  });

  return (
    <View style={{ width: 440, height: '100%', backgroundColor: theme.colors.groupped.background, borderLeftWidth: 1, borderLeftColor: theme.colors.groupped.border }}>
      <View style={{ height: 56, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, borderBottomWidth: 1, borderBottomColor: theme.colors.groupped.border }}>
        <Text style={{ fontSize: 16, fontWeight: '600', color: theme.colors.groupped.text, fontFamily: 'Outfit' }}>Settings</Text>
        <Pressable onPress={() => router.back()}>
          <Text style={{ fontSize: 14, color: theme.colors.groupped.accent, fontFamily: 'Outfit' }}>Done</Text>
        </Pressable>
      </View>
      <View style={{ flex: 1, padding: 20 }}>
        {/* Account Section */}
        <View style={{ marginBottom: 24 }}>
          <Text style={{ fontSize: 12, fontWeight: '600', color: theme.colors.groupped.caption, fontFamily: 'Outfit', marginBottom: 12, textTransform: 'uppercase' }}>Account</Text>
          <View style={{ backgroundColor: theme.colors.groupped.surface, borderRadius: 12, padding: 16, borderWidth: 1, borderColor: theme.colors.groupped.border }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 16 }}>
              <Image source={{ uri: settings.account.avatar }} style={{ width: 48, height: 48, borderRadius: 24 }} />
              <View style={{ marginLeft: 12, flex: 1 }}>
                <Text style={{ fontSize: 14, fontWeight: '600', color: theme.colors.groupped.text, fontFamily: 'Outfit' }}>{settings.account.displayName}</Text>
                <Text style={{ fontSize: 12, color: theme.colors.groupped.caption, fontFamily: 'Outfit' }}>{settings.account.email}</Text>
              </View>
            </View>
            <Pressable style={{ paddingVertical: 10, backgroundColor: theme.colors.groupped.background, borderRadius: 8, alignItems: 'center' }}>
              <Text style={{ color: theme.colors.groupped.accent, fontWeight: '600', fontFamily: 'Outfit' }}>Edit Profile</Text>
            </Pressable>
          </View>
        </View>

        {/* Notifications Section */}
        <View style={{ marginBottom: 24 }}>
          <Text style={{ fontSize: 12, fontWeight: '600', color: theme.colors.groupped.caption, fontFamily: 'Outfit', marginBottom: 12, textTransform: 'uppercase' }}>Notifications</Text>
          <View style={{ backgroundColor: theme.colors.groupped.surface, borderRadius: 12, paddingHorizontal: 16, borderWidth: 1, borderColor: theme.colors.groupped.border }}>
            <SettingsRow
              label="Email Notifications"
              value={settings.notifications.emailEnabled}
              type="toggle"
              onToggle={(v) => setSettings({ ...settings, notifications: { ...settings.notifications, emailEnabled: v } })}
            />
            <View style={{ height: 1, backgroundColor: theme.colors.groupped.border }} />
            <SettingsRow
              label="Push Notifications"
              value={settings.notifications.pushEnabled}
              type="toggle"
              onToggle={(v) => setSettings({ ...settings, notifications: { ...settings.notifications, pushEnabled: v } })}
            />
            <View style={{ height: 1, backgroundColor: theme.colors.groupped.border }} />
            <SettingsRow
              label="Agent Alerts"
              value={settings.notifications.agentAlerts}
              type="toggle"
              onToggle={(v) => setSettings({ ...settings, notifications: { ...settings.notifications, agentAlerts: v } })}
            />
          </View>
        </View>

        {/* Security Section */}
        <View style={{ marginBottom: 24 }}>
          <Text style={{ fontSize: 12, fontWeight: '600', color: theme.colors.groupped.caption, fontFamily: 'Outfit', marginBottom: 12, textTransform: 'uppercase' }}>Security</Text>
          <View style={{ backgroundColor: theme.colors.groupped.surface, borderRadius: 12, paddingHorizontal: 16, borderWidth: 1, borderColor: theme.colors.groupped.border }}>
            <SettingsRow
              label="Two-Factor Auth"
              value={settings.security.twoFactorEnabled}
              type="toggle"
              onToggle={(v) => setSettings({ ...settings, security: { ...settings.security, twoFactorEnabled: v } })}
            />
            <View style={{ height: 1, backgroundColor: theme.colors.groupped.border }} />
            <SettingsRow
              label="Device Auth"
              value={settings.security.deviceAuthEnabled}
              type="toggle"
              onToggle={(v) => setSettings({ ...settings, security: { ...settings.security, deviceAuthEnabled: v } })}
            />
          </View>
        </View>

        {/* Sign Out */}
        <Pressable style={{ paddingVertical: 12, backgroundColor: '#D08068', borderRadius: 8, alignItems: 'center', marginTop: 16 }}>
          <Text style={{ color: '#fff', fontWeight: '600', fontFamily: 'Outfit' }}>Sign Out</Text>
        </Pressable>
      </View>
    </View>
  );
}

export default function SettingsScreen() {
  const insets = useSafeAreaInsets();
  if (Platform.OS !== 'web') return <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}><Text>Settings is only available on web</Text></View>;
  return (
    <View style={{ flex: 1, flexDirection: 'row', paddingTop: insets.top, paddingBottom: insets.bottom }}>
      <Sidebar />
      <View style={{ flex: 1, backgroundColor: '#1A191810', justifyContent: 'center', alignItems: 'center' }}>
        <Text style={{ color: '#888', fontSize: 14 }}>Previous screen (dimmed)</Text>
      </View>
      <SettingsPanel />
    </View>
  );
}
