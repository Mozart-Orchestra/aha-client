import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  Pressable,
  Switch,
  StyleSheet,
} from 'react-native';
import { StyleSheet as UnistylesStyleSheet, useUnistyles } from 'react-native-unistyles';
import { MaterialIcons } from '@expo/vector-icons';
import { WebShell } from '../WebShell';

interface Settings {
  account: {
    displayName: string;
    email: string;
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

export function W5Settings() {
  const { theme } = useUnistyles();
  const [settings, setSettings] = useState<Settings | null>(null);
  const [activeSection, setActiveSection] = useState<'account' | 'notifications' | 'security'>('account');

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      const response = await fetch('/api/settings');
      const data = await response.json();
      if (data.success) {
        setSettings(data.data);
      }
    } catch (error) {
      console.error('Failed to fetch settings:', error);
    }
  };

  const updateSetting = async (path: string, value: any) => {
    try {
      const response = await fetch('/api/settings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ [path]: value }),
      });
      const data = await response.json();
      if (data.success) {
        setSettings(data.data);
      }
    } catch (error) {
      console.error('Failed to update setting:', error);
    }
  };

  const SectionItem = ({ id, icon, label }: { id: string; icon: string; label: string }) => (
    <Pressable
      style={[styles.sectionItem, activeSection === id && styles.sectionItemActive]}
      onPress={() => setActiveSection(id as any)}
    >
      <MaterialIcons
        name={icon as any}
        size={20}
        color={activeSection === id ? theme.colors.primary : theme.colors.textSecondary}
      />
      <Text style={[styles.sectionLabel, activeSection === id && styles.sectionLabelActive]}>
        {label}
      </Text>
      <MaterialIcons
        name="chevron-right"
        size={20}
        color={theme.colors.textTertiary}
      />
    </Pressable>
  );

  const LeftPanel = (
    <View style={styles.leftPanel}>
      <Text style={styles.panelTitle}>Settings</Text>
      <View style={styles.sectionList}>
        <SectionItem id="account" icon="person" label="Account" />
        <SectionItem id="notifications" icon="notifications" label="Notifications" />
        <SectionItem id="security" icon="security" label="Security" />
      </View>
      <View style={styles.divider} />
      <Pressable style={styles.signOutButton}>
        <MaterialIcons name="logout" size={20} color="#EF4444" />
        <Text style={styles.signOutText}>Sign Out</Text>
      </Pressable>
    </View>
  );

  return (
    <WebShell
      title="Settings"
      showSidebar={true}
      showRightPanel={true}
      rightPanelContent={LeftPanel}
      activeNavItem="settings"
    >
      <ScrollView style={styles.container}>
        {activeSection === 'account' && (
          <View style={styles.content}>
            <View style={styles.card}>
              <Text style={styles.cardTitle}>Profile Information</Text>
              <View style={styles.profileHeader}>
                <View style={styles.avatar}>
                  <Text style={styles.avatarText}>
                    {settings?.account.displayName?.charAt(0).toUpperCase() || 'A'}
                  </Text>
                </View>
                <View style={styles.profileInfo}>
                  <Text style={styles.profileName}>
                    {settings?.account.displayName || 'Alex Chen'}
                  </Text>
                  <Text style={styles.profileEmail}>
                    {settings?.account.email || 'alex@example.com'}
                  </Text>
                </View>
              </View>
              <Pressable style={styles.changeAvatarButton}>
                <Text style={styles.changeAvatarText}>Change Avatar</Text>
              </Pressable>
            </View>

            <View style={styles.card}>
              <Text style={styles.cardTitle}>Display Name</Text>
              <View style={styles.inputField}>
                <Text style={styles.inputValue}>
                  {settings?.account.displayName || 'Alex Chen'}
                </Text>
                <MaterialIcons name="edit" size={18} color={theme.colors.textSecondary} />
              </View>
            </View>

            <View style={styles.card}>
              <Text style={styles.cardTitle}>Email Address</Text>
              <View style={styles.inputField}>
                <Text style={styles.inputValue}>
                  {settings?.account.email || 'alex@example.com'}
                </Text>
                <MaterialIcons name="edit" size={18} color={theme.colors.textSecondary} />
              </View>
            </View>
          </View>
        )}

        {activeSection === 'notifications' && (
          <View style={styles.content}>
            <View style={styles.card}>
              <Text style={styles.cardTitle}>Notification Preferences</Text>

              <View style={styles.toggleRow}>
                <View style={styles.toggleInfo}>
                  <MaterialIcons name="email" size={20} color={theme.colors.text} />
                  <View style={styles.toggleText}>
                    <Text style={styles.toggleLabel}>Email Notifications</Text>
                    <Text style={styles.toggleDescription}>Receive updates via email</Text>
                  </View>
                </View>
                <Switch
                  value={settings?.notifications.emailEnabled}
                  onValueChange={(value) => updateSetting('notifications.emailEnabled', value)}
                  trackColor={{ false: theme.colors.background, true: theme.colors.primary }}
                />
              </View>

              <View style={styles.toggleRow}>
                <View style={styles.toggleInfo}>
                  <MaterialIcons name="phone-android" size={20} color={theme.colors.text} />
                  <View style={styles.toggleText}>
                    <Text style={styles.toggleLabel}>Push Notifications</Text>
                    <Text style={styles.toggleDescription}>Receive push notifications on your devices</Text>
                  </View>
                </View>
                <Switch
                  value={settings?.notifications.pushEnabled}
                  onValueChange={(value) => updateSetting('notifications.pushEnabled', value)}
                  trackColor={{ false: theme.colors.background, true: theme.colors.primary }}
                />
              </View>

              <View style={styles.toggleRow}>
                <View style={styles.toggleInfo}>
                  <MaterialIcons name="smart-toy" size={20} color={theme.colors.text} />
                  <View style={styles.toggleText}>
                    <Text style={styles.toggleLabel}>Agent Alerts</Text>
                    <Text style={styles.toggleDescription}>Get notified when agents need attention</Text>
                  </View>
                </View>
                <Switch
                  value={settings?.notifications.agentAlerts}
                  onValueChange={(value) => updateSetting('notifications.agentAlerts', value)}
                  trackColor={{ false: theme.colors.background, true: theme.colors.primary }}
                />
              </View>
            </View>
          </View>
        )}

        {activeSection === 'security' && (
          <View style={styles.content}>
            <View style={styles.card}>
              <Text style={styles.cardTitle}>Security Settings</Text>

              <View style={styles.toggleRow}>
                <View style={styles.toggleInfo}>
                  <MaterialIcons name="two-factor-authentication" size={20} color={theme.colors.text} />
                  <View style={styles.toggleText}>
                    <Text style={styles.toggleLabel}>Two-Factor Authentication</Text>
                    <Text style={styles.toggleDescription}>Add an extra layer of security</Text>
                  </View>
                </View>
                <Switch
                  value={settings?.security.twoFactorEnabled}
                  onValueChange={(value) => updateSetting('security.twoFactorEnabled', value)}
                  trackColor={{ false: theme.colors.background, true: theme.colors.primary }}
                />
              </View>

              <View style={styles.toggleRow}>
                <View style={styles.toggleInfo}>
                  <MaterialIcons name="devices" size={20} color={theme.colors.text} />
                  <View style={styles.toggleText}>
                    <Text style={styles.toggleLabel}>Device Authentication</Text>
                    <Text style={styles.toggleDescription}>Require 6-digit code for new devices</Text>
                  </View>
                </View>
                <Switch
                  value={settings?.security.deviceAuthEnabled}
                  onValueChange={(value) => updateSetting('security.deviceAuthEnabled', value)}
                  trackColor={{ false: theme.colors.background, true: theme.colors.primary }}
                />
              </View>
            </View>

            <View style={[styles.card, styles.dangerZone]}>
              <Text style={[styles.cardTitle, styles.dangerTitle]}>Danger Zone</Text>
              <Pressable style={styles.dangerButton}>
                <Text style={styles.dangerButtonText}>Delete Account</Text>
              </Pressable>
            </View>
          </View>
        )}
      </ScrollView>
    </WebShell>
  );
}

const styles = UnistylesStyleSheet.create((theme) => ({
  container: {
    flex: 1,
  },
  content: {
    padding: 20,
    gap: 16,
  },
  card: {
    backgroundColor: theme.colors.surface,
    borderRadius: 12,
    padding: 20,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.text,
    marginBottom: 16,
  },
  leftPanel: {
    flex: 1,
    padding: 16,
  },
  panelTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: theme.colors.text,
    marginBottom: 16,
  },
  sectionList: {
    gap: 4,
  },
  sectionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 12,
    borderRadius: 8,
  },
  sectionItemActive: {
    backgroundColor: theme.colors.primaryLight,
  },
  sectionLabel: {
    flex: 1,
    fontSize: 14,
    color: theme.colors.text,
  },
  sectionLabelActive: {
    color: theme.colors.primary,
    fontWeight: '500',
  },
  divider: {
    height: 1,
    backgroundColor: theme.colors.border,
    marginVertical: 16,
  },
  signOutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 12,
  },
  signOutText: {
    fontSize: 14,
    color: '#EF4444',
    fontWeight: '500',
  },
  profileHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    marginBottom: 16,
  },
  avatar: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: theme.colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    fontSize: 24,
    fontWeight: '600',
    color: '#fff',
  },
  profileInfo: {
    flex: 1,
  },
  profileName: {
    fontSize: 18,
    fontWeight: '600',
    color: theme.colors.text,
  },
  profileEmail: {
    fontSize: 14,
    color: theme.colors.textSecondary,
  },
  changeAvatarButton: {
    padding: 10,
    backgroundColor: theme.colors.background,
    borderRadius: 8,
    alignItems: 'center',
  },
  changeAvatarText: {
    fontSize: 14,
    color: theme.colors.primary,
    fontWeight: '500',
  },
  inputField: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 12,
    backgroundColor: theme.colors.background,
    borderRadius: 8,
  },
  inputValue: {
    fontSize: 14,
    color: theme.colors.text,
  },
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  toggleInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  toggleText: {
    flex: 1,
  },
  toggleLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: theme.colors.text,
  },
  toggleDescription: {
    fontSize: 12,
    color: theme.colors.textSecondary,
  },
  dangerZone: {
    borderColor: '#EF4444',
  },
  dangerTitle: {
    color: '#EF4444',
  },
  dangerButton: {
    padding: 12,
    borderWidth: 1,
    borderColor: '#EF4444',
    borderRadius: 8,
    alignItems: 'center',
  },
  dangerButtonText: {
    color: '#EF4444',
    fontSize: 14,
    fontWeight: '500',
  },
}));
