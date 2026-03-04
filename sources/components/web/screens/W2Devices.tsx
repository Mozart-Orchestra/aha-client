import React, { useState, useEffect } from 'react';
import { View, Text, Pressable, ScrollView, StyleSheet } from 'react-native';
import { StyleSheet as UnistylesStyleSheet, useUnistyles } from 'react-native-unistyles';
import { MaterialIcons } from '@expo/vector-icons';
import { WebShell } from '../WebShell';

interface Device {
  id: string;
  name: string;
  type: 'laptop' | 'mobile' | 'tablet' | 'server';
  status: 'online' | 'offline';
  lastSeen: string;
}

export function W2Devices() {
  const { theme } = useUnistyles();
  const [devices, setDevices] = useState<Device[]>([]);

  useEffect(() => {
    fetchDevices();
  }, []);

  const fetchDevices = async () => {
    try {
      const response = await fetch('/api/devices');
      const data = await response.json();
      if (data.success) {
        setDevices(data.data);
      }
    } catch (error) {
      console.error('Failed to fetch devices:', error);
    }
  };

  const getDeviceIcon = (type: string) => {
    switch (type) {
      case 'laptop':
        return 'computer';
      case 'mobile':
        return 'smartphone';
      case 'tablet':
        return 'tablet';
      default:
        return 'devices';
    }
  };

  const formatLastSeen = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMinutes = Math.floor((now.getTime() - date.getTime()) / 60000);

    if (diffMinutes < 1) return 'Just now';
    if (diffMinutes < 60) return `${diffMinutes}m ago`;
    const diffHours = Math.floor(diffMinutes / 60);
    if (diffHours < 24) return `${diffHours}h ago`;
    return `${Math.floor(diffHours / 24)}d ago`;
  };

  return (
    <WebShell
      title="Connected Devices"
      showRightPanel={false}
      activeNavItem="board"
      rightContent={
        <Pressable style={styles.addButton}>
          <MaterialIcons name="add" size={20} color="#fff" />
          <Text style={styles.addButtonText}>Add Device</Text>
        </Pressable>
      }
    >
      <ScrollView style={styles.container}>
        <Text style={styles.sectionTitle}>
          Active Devices ({devices.filter((d) => d.status === 'online').length})
        </Text>

        <View style={styles.deviceList}>
          {devices.map((device) => (
            <View key={device.id} style={styles.deviceCard}>
              <View style={styles.deviceHeader}>
                <View
                  style={[
                    styles.deviceIconContainer,
                    device.status === 'online'
                      ? styles.deviceIconOnline
                      : styles.deviceIconOffline,
                  ]}
                >
                  <MaterialIcons
                    name={getDeviceIcon(device.type) as any}
                    size={24}
                    color={device.status === 'online' ? theme.colors.primary : theme.colors.textTertiary}
                  />
                </View>
                <View style={styles.deviceInfo}>
                  <Text style={styles.deviceName}>{device.name}</Text>
                  <Text style={styles.deviceType}>
                    {device.type.charAt(0).toUpperCase() + device.type.slice(1)}
                  </Text>
                </View>
                <View style={styles.deviceStatus}>
                  <View
                    style={[
                      styles.statusDot,
                      device.status === 'online'
                        ? styles.statusOnline
                        : styles.statusOffline,
                    ]}
                  />
                  <Text style={styles.statusText}>
                    {device.status === 'online' ? 'Online' : 'Offline'}
                  </Text>
                </View>
              </View>

              <View style={styles.deviceFooter}>
                <MaterialIcons
                  name="access-time"
                  size={14}
                  color={theme.colors.textTertiary}
                />
                <Text style={styles.lastSeenText}>
                  Last seen: {formatLastSeen(device.lastSeen)}
                </Text>
              </View>
            </View>
          ))}
        </View>

        <View style={styles.securityNote}>
          <MaterialIcons name="security" size={20} color={theme.colors.primary} />
          <Text style={styles.securityText}>
            Device authentication is enabled. Each device must be authorized using a
            6-digit code before accessing your teams.
          </Text>
        </View>
      </ScrollView>
    </WebShell>
  );
}

const styles = UnistylesStyleSheet.create((theme) => ({
  container: {
    flex: 1,
    padding: 20,
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: theme.colors.primary,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  addButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '500',
    color: theme.colors.textSecondary,
    marginBottom: 16,
    letterSpacing: 0.5,
  },
  deviceList: {
    gap: 12,
  },
  deviceCard: {
    backgroundColor: theme.colors.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: theme.colors.border,
    padding: 16,
  },
  deviceHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  deviceIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  deviceIconOnline: {
    backgroundColor: theme.colors.primaryLight,
  },
  deviceIconOffline: {
    backgroundColor: theme.colors.background,
  },
  deviceInfo: {
    flex: 1,
  },
  deviceName: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.text,
  },
  deviceType: {
    fontSize: 13,
    color: theme.colors.textSecondary,
  },
  deviceStatus: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  statusOnline: {
    backgroundColor: '#10B981',
  },
  statusOffline: {
    backgroundColor: '#9CA3AF',
  },
  statusText: {
    fontSize: 13,
    color: theme.colors.textSecondary,
  },
  deviceFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
  },
  lastSeenText: {
    fontSize: 12,
    color: theme.colors.textTertiary,
  },
  securityNote: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    backgroundColor: theme.colors.primaryLight,
    padding: 16,
    borderRadius: 12,
    marginTop: 24,
  },
  securityText: {
    flex: 1,
    fontSize: 13,
    color: theme.colors.text,
    lineHeight: 18,
  },
}));
