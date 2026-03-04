import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  Pressable,
  Modal,
  Dimensions,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { StyleSheet as UnistylesStyleSheet, useUnistyles } from 'react-native-unistyles';
import { MaterialIcons } from '@expo/vector-icons';

interface Permission {
  id: string;
  type: string;
  title: string;
  description: string;
  riskLevel: 'low' | 'medium' | 'critical';
  status: 'pending' | 'approved' | 'denied';
  createdAt: string;
  expiresAt: string;
}

interface PermissionDrawerProps {
  isOpen: boolean;
  onClose: () => void;
}

const RISK_COLORS = {
  low: '#10B981',
  medium: '#F59E0B',
  critical: '#EF4444',
};

const RISK_LABELS = {
  low: 'INFO',
  medium: 'WARNING',
  critical: 'CRITICAL',
};

export function PermissionDrawer({ isOpen, onClose }: PermissionDrawerProps) {
  const { theme } = useUnistyles();
  const [permissions, setPermissions] = useState<Permission[]>([]);
  const [selectedPermission, setSelectedPermission] = useState<Permission | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (isOpen) {
      fetchPermissions();
    }
  }, [isOpen]);

  const fetchPermissions = async () => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/permissions');
      const data = await response.json();
      if (data.success) {
        setPermissions(data.data.filter((p: Permission) => p.status === 'pending'));
      }
    } catch (error) {
      console.error('Failed to fetch permissions:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleApprove = async (permissionId: string) => {
    try {
      const response = await fetch(`/api/permissions/${permissionId}/approve`, {
        method: 'POST',
      });
      const data = await response.json();
      if (data.success) {
        setPermissions(permissions.filter((p) => p.id !== permissionId));
        setSelectedPermission(null);
      }
    } catch (error) {
      console.error('Failed to approve permission:', error);
    }
  };

  const handleDeny = async (permissionId: string) => {
    try {
      const response = await fetch(`/api/permissions/${permissionId}/deny`, {
        method: 'POST',
      });
      const data = await response.json();
      if (data.success) {
        setPermissions(permissions.filter((p) => p.id !== permissionId));
        setSelectedPermission(null);
      }
    } catch (error) {
      console.error('Failed to deny permission:', error);
    }
  };

  const getTimeRemaining = (expiresAt: string) => {
    const now = Date.now();
    const expires = new Date(expiresAt).getTime();
    const remaining = Math.max(0, expires - now);
    const minutes = Math.floor(remaining / 60000);
    const seconds = Math.floor((remaining % 60000) / 1000);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  return (
    <Modal visible={isOpen} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <Pressable style={styles.backdrop} onPress={onClose} />
        <View style={styles.drawer}>
          {/* Risk Band */}
          <View style={[styles.riskBand, { backgroundColor: '#D08068' }]} />

          {/* Header */}
          <View style={styles.header}>
            <View style={styles.headerContent}>
              <View style={styles.riskBadge}>
                <MaterialIcons name="warning" size={16} color="#fff" />
                <Text style={styles.riskBadgeText}>Permission Request</Text>
              </View>
              <Text style={styles.headerTitle}>
                {selectedPermission ? selectedPermission.title : 'Pending Permissions'}
              </Text>
            </View>
            <Pressable style={styles.closeButton} onPress={onClose}>
              <MaterialIcons name="close" size={20} color={theme.colors.textSecondary} />
            </Pressable>
          </View>

          {/* Body */}
          <View style={styles.body}>
            {isLoading ? (
              <ActivityIndicator size="large" color={theme.colors.primary} />
            ) : selectedPermission ? (
              <PermissionDetail
                permission={selectedPermission}
                onApprove={() => handleApprove(selectedPermission.id)}
                onDeny={() => handleDeny(selectedPermission.id)}
                onBack={() => setSelectedPermission(null)}
                timeRemaining={getTimeRemaining(selectedPermission.expiresAt)}
              />
            ) : (
              <PermissionList
                permissions={permissions}
                onSelect={setSelectedPermission}
                getTimeRemaining={getTimeRemaining}
              />
            )}
          </View>
        </View>
      </View>
    </Modal>
  );
}

function PermissionList({
  permissions,
  onSelect,
  getTimeRemaining,
}: {
  permissions: Permission[];
  onSelect: (perm: Permission) => void;
  getTimeRemaining: (expires: string) => string;
}) {
  const { theme } = useUnistyles();

  if (permissions.length === 0) {
    return (
      <View style={styles.emptyState}>
        <MaterialIcons name="check-circle" size={48} color={theme.colors.textTertiary} />
        <Text style={styles.emptyStateText}>No pending permissions</Text>
      </View>
    );
  }

  return (
    <View style={styles.list}>
      {permissions.map((permission) => (
        <Pressable
          key={permission.id}
          style={styles.permissionItem}
          onPress={() => onSelect(permission)}
        >
          <View style={styles.permissionHeader}>
            <View
              style={[
                styles.riskIndicator,
                { backgroundColor: RISK_COLORS[permission.riskLevel] },
              ]}
            />
            <Text style={styles.permissionTitle}>{permission.title}</Text>
            <Text style={styles.permissionTime}>
              {getTimeRemaining(permission.expiresAt)}
            </Text>
          </View>
          <Text style={styles.permissionDescription} numberOfLines={2}>
            {permission.description}
          </Text>
        </Pressable>
      ))}
    </View>
  );
}

function PermissionDetail({
  permission,
  onApprove,
  onDeny,
  onBack,
  timeRemaining,
}: {
  permission: Permission;
  onApprove: () => void;
  onDeny: () => void;
  onBack: () => void;
  timeRemaining: string;
}) {
  const { theme } = useUnistyles();

  return (
    <View style={styles.detail}>
      <Pressable style={styles.backButton} onPress={onBack}>
        <MaterialIcons name="arrow-back" size={20} color={theme.colors.textSecondary} />
        <Text style={styles.backButtonText}>Back to list</Text>
      </Pressable>

      <View style={styles.detailContent}>
        <View style={styles.detailHeader}>
          <View
            style={[
              styles.riskIndicatorLarge,
              { backgroundColor: RISK_COLORS[permission.riskLevel] },
            ]}
          >
            <MaterialIcons name="warning" size={24} color="#fff" />
          </View>
          <Text style={styles.riskLabel}>{RISK_LABELS[permission.riskLevel]}</Text>
        </View>

        <Text style={styles.detailTitle}>{permission.title}</Text>
        <Text style={styles.detailDescription}>{permission.description}</Text>

        <View style={styles.countdown}>
          <MaterialIcons name="timer" size={16} color={theme.colors.textSecondary} />
          <Text style={styles.countdownText}>Expires in {timeRemaining}</Text>
        </View>
      </View>

      <View style={styles.actions}>
        <Pressable style={styles.denyButton} onPress={onDeny}>
          <Text style={styles.denyButtonText}>Deny</Text>
        </Pressable>
        <Pressable style={styles.approveButton} onPress={onApprove}>
          <Text style={styles.approveButtonText}>Approve</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = UnistylesStyleSheet.create((theme) => ({
  overlay: {
    flex: 1,
    flexDirection: 'row',
  },
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  drawer: {
    width: 560,
    backgroundColor: theme.colors.surface,
    borderLeftWidth: 1,
    borderLeftColor: theme.colors.border,
    flexDirection: 'column',
  },
  riskBand: {
    height: 8,
    width: '100%',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  headerContent: {
    flex: 1,
    gap: 8,
  },
  riskBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#D08068',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    alignSelf: 'flex-start',
  },
  riskBadgeText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: theme.colors.text,
  },
  closeButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  body: {
    flex: 1,
    padding: 20,
  },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  emptyStateText: {
    fontSize: 16,
    color: theme.colors.textTertiary,
  },
  list: {
    gap: 12,
  },
  permissionItem: {
    backgroundColor: theme.colors.background,
    padding: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  permissionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  riskIndicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  permissionTitle: {
    flex: 1,
    fontSize: 14,
    fontWeight: '500',
    color: theme.colors.text,
  },
  permissionTime: {
    fontSize: 12,
    color: theme.colors.textSecondary,
  },
  permissionDescription: {
    fontSize: 13,
    color: theme.colors.textSecondary,
    lineHeight: 18,
  },
  detail: {
    flex: 1,
    gap: 20,
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  backButtonText: {
    fontSize: 14,
    color: theme.colors.textSecondary,
  },
  detailContent: {
    flex: 1,
    gap: 16,
  },
  detailHeader: {
    alignItems: 'center',
    gap: 12,
  },
  riskIndicatorLarge: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  riskLabel: {
    fontSize: 14,
    fontWeight: '600',
    letterSpacing: 0.5,
  },
  detailTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: theme.colors.text,
    textAlign: 'center',
  },
  detailDescription: {
    fontSize: 14,
    color: theme.colors.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
  },
  countdown: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  countdownText: {
    fontSize: 13,
    color: theme.colors.textSecondary,
  },
  actions: {
    flexDirection: 'row',
    gap: 12,
  },
  denyButton: {
    flex: 1,
    height: 44,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.background,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  denyButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: theme.colors.text,
  },
  approveButton: {
    flex: 1,
    height: 44,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.primary,
  },
  approveButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#fff',
  },
}));