import React from 'react';
import {
  View,
  ScrollView,
  Pressable,
  StyleSheet,
  Share,
  Alert,
} from 'react-native';
import { Text } from '@/components/StyledText';
import { Ionicons } from '@expo/vector-icons';

export interface SharedRole {
  id: string;
  originalRoleId: string;
  title: string;
  summary: string;
  icon?: string;
  category?: string;
  sharedBy: {
    userId: string;
    userName: string;
    teamName: string;
  };
  sharedAt: number;
  importCount: number;
  permissions: 'public' | 'team' | 'private';
  tags: string[];
}

export interface RoleSharingProps {
  /** Role ID to share */
  roleId: string;
  /** Role title */
  roleTitle: string;
  /** Current share status */
  shareStatus?: SharedRole;
  /** Callback when role is shared */
  onShare?: (roleId: string, permissions: SharedRole['permissions']) => void;
  /** Callback when share is revoked */
  onRevoke?: (shareId: string) => void;
  /** Callback when permissions are updated */
  onUpdatePermissions?: (
    shareId: string,
    permissions: SharedRole['permissions']
  ) => void;
  /** Callback to import a shared role */
  onImport?: (shareCode: string) => void;
  /** Recently imported shared roles */
  recentImports?: SharedRole[];
}

/**
 * RoleSharing Component
 *
 * V5-COLLABORATION-001: Cross-Team Role Sharing
 *
 * Enables sharing custom roles across teams with permission management
 * and import tracking.
 *
 * Usage:
 * ```tsx
 * <RoleSharing
 *   roleId="role-123"
 *   roleTitle="Frontend Architect"
 *   onShare={handleShare}
 *   recentImports={importedRoles}
 * />
 * ```
 */
export function RoleSharing({
  roleId,
  roleTitle,
  shareStatus,
  onShare,
  onRevoke,
  onUpdatePermissions,
  onImport,
  recentImports = [],
}: RoleSharingProps) {
  const [selectedPermission, setSelectedPermission] = React.useState<
    SharedRole['permissions']
  >(shareStatus?.permissions || 'team');

  const [showImportModal, setShowImportModal] = React.useState(false);
  const [importCode, setImportCode] = React.useState('');

  const handleShare = React.useCallback(async () => {
    if (!onShare) return;

    onShare(roleId, selectedPermission);

    // Generate share code (in real implementation, this comes from server)
    const shareCode = `aha-role-${roleId.slice(0, 8)}`;

    try {
      await Share.share({
        message: `Check out my custom role "${roleTitle}" on Aha!\n\nImport code: ${shareCode}`,
        title: 'Share Custom Role',
      });
    } catch (error) {
      console.error('Share failed:', error);
    }
  }, [roleId, roleTitle, selectedPermission, onShare]);

  const handleImport = React.useCallback(() => {
    if (!onImport || !importCode.trim()) return;

    // Validate import code format
    if (!importCode.startsWith('aha-role-')) {
      Alert.alert('Invalid Code', 'Please enter a valid role import code.');
      return;
    }

    onImport(importCode);
    setShowImportModal(false);
    setImportCode('');
  }, [importCode, onImport]);

  const getPermissionInfo = (permission: SharedRole['permissions']) => {
    switch (permission) {
      case 'public':
        return {
          icon: 'globe',
          label: 'Public',
          description: 'Anyone with the code can import this role',
          color: '#4CAF50',
        };
      case 'team':
        return {
          icon: 'people',
          label: 'Team Only',
          description: 'Only members of your team can import',
          color: '#2196F3',
        };
      case 'private':
        return {
          icon: 'lock-closed',
          label: 'Private',
          description: 'Only you can access this role',
          color: '#FF9800',
        };
    }
  };

  return (
    <ScrollView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Ionicons name="share-social" size={24} color="#2196F3" />
        <View style={styles.headerText}>
          <Text style={styles.title}>Share Role</Text>
          <Text style={styles.subtitle}>{roleTitle}</Text>
        </View>
      </View>

      {shareStatus ? (
        <>
          {/* Current Share Status */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Currently Shared</Text>
            <View style={styles.shareStatusCard}>
              <View style={styles.shareInfo}>
                <Ionicons
                  name={getPermissionInfo(shareStatus.permissions).icon as any}
                  size={20}
                  color={getPermissionInfo(shareStatus.permissions).color}
                />
                <View style={styles.shareDetails}>
                  <Text style={styles.shareLabel}>
                    {getPermissionInfo(shareStatus.permissions).label}
                  </Text>
                  <Text style={styles.shareMeta}>
                    Shared by {shareStatus.sharedBy.userName} •{' '}
                    {new Date(shareStatus.sharedAt).toLocaleDateString()}
                  </Text>
                </View>
              </View>

              <View style={styles.shareStats}>
                <Ionicons name="download-outline" size={16} color="#666" />
                <Text style={styles.shareStatsText}>
                  {shareStatus.importCount} imports
                </Text>
              </View>

              {/* Permission Update */}
              <View style={styles.permissionSelector}>
                {(['public', 'team', 'private'] as const).map((perm) => {
                  const info = getPermissionInfo(perm);
                  const isSelected = shareStatus.permissions === perm;
                  return (
                    <Pressable
                      key={perm}
                      style={[
                        styles.permissionOption,
                        isSelected && styles.permissionOptionSelected,
                        { borderColor: info.color },
                      ]}
                      onPress={() => {
                        setSelectedPermission(perm);
                        onUpdatePermissions?.(shareStatus.id, perm);
                      }}
                    >
                      <Ionicons
                        name={info.icon as any}
                        size={16}
                        color={isSelected ? info.color : '#999'}
                      />
                      <Text
                        style={[
                          styles.permissionLabel,
                          isSelected && { color: info.color },
                        ]}
                      >
                        {info.label}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>

              {/* Revoke Button */}
              {onRevoke && (
                <Pressable
                  style={styles.revokeButton}
                  onPress={() => {
                    Alert.alert(
                      'Revoke Share',
                      'Are you sure you want to stop sharing this role?',
                      [
                        { text: 'Cancel', style: 'cancel' },
                        {
                          text: 'Revoke',
                          style: 'destructive',
                          onPress: () => onRevoke(shareStatus.id),
                        },
                      ]
                    );
                  }}
                >
                  <Ionicons name="trash-outline" size={16} color="#F44336" />
                  <Text style={styles.revokeText}>Stop Sharing</Text>
                </Pressable>
              )}
            </View>
          </View>
        </>
      ) : (
        <>
          {/* Share Form */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Share This Role</Text>

            <Text style={styles.description}>
              Share your custom role with other teams or make it public for
              everyone to use.
            </Text>

            {/* Permission Selector */}
            <View style={styles.permissionSelector}>
              {(['public', 'team', 'private'] as const).map((perm) => {
                const info = getPermissionInfo(perm);
                const isSelected = selectedPermission === perm;
                return (
                  <Pressable
                    key={perm}
                    style={[
                      styles.permissionOption,
                      isSelected && styles.permissionOptionSelected,
                      { borderColor: info.color },
                    ]}
                    onPress={() => setSelectedPermission(perm)}
                  >
                    <Ionicons
                      name={info.icon as any}
                      size={20}
                      color={isSelected ? info.color : '#999'}
                    />
                    <View style={styles.permissionText}>
                      <Text
                        style={[
                          styles.permissionLabel,
                          isSelected && { color: info.color },
                        ]}
                      >
                        {info.label}
                      </Text>
                      <Text style={styles.permissionDesc}>
                        {info.description}
                      </Text>
                    </View>
                  </Pressable>
                );
              })}
            </View>

            {/* Share Button */}
            <Pressable style={styles.shareButton} onPress={handleShare}>
              <Ionicons name="share" size={18} color="#FFF" />
              <Text style={styles.shareButtonText}>Share Role</Text>
            </Pressable>
          </View>
        </>
      )}

      {/* Import Section */}
      {onImport && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Import Shared Role</Text>

          <Pressable
            style={styles.importButton}
            onPress={() => setShowImportModal(true)}
          >
            <Ionicons name="download" size={18} color="#2196F3" />
            <Text style={styles.importButtonText}>Import from Code</Text>
          </Pressable>

          {/* Recent Imports */}
          {recentImports.length > 0 && (
            <View style={styles.recentImports}>
              <Text style={styles.recentImportsTitle}>Recent Imports</Text>
              {recentImports.map((imp) => (
                <View key={imp.id} style={styles.importItem}>
                  <View style={styles.importInfo}>
                    <Ionicons name="person-circle" size={24} color="#666" />
                    <View style={styles.importDetails}>
                      <Text style={styles.importTitle}>{imp.title}</Text>
                      <Text style={styles.importMeta}>
                        From {imp.sharedBy.teamName} •{' '}
                        {new Date(imp.sharedAt).toLocaleDateString()}
                      </Text>
                    </View>
                  </View>
                  <Ionicons name="checkmark-circle" size={20} color="#4CAF50" />
                </View>
              ))}
            </View>
          )}
        </View>
      )}

      {/* Import Modal (simplified - in real app would be a proper modal) */}
      {showImportModal && (
        <View style={styles.modal}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Import Role</Text>
            <Text style={styles.modalDescription}>
              Enter the share code to import a role from another team.
            </Text>
            {/* Note: In real implementation, use TextInput */}
            <Text style={styles.inputHint}>
              Code format: aha-role-xxxxxxxx
            </Text>
            <View style={styles.modalButtons}>
              <Pressable
                style={styles.cancelButton}
                onPress={() => setShowImportModal(false)}
              >
                <Text style={styles.cancelText}>Cancel</Text>
              </Pressable>
              <Pressable style={styles.confirmButton} onPress={handleImport}>
                <Text style={styles.confirmText}>Import</Text>
              </Pressable>
            </View>
          </View>
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFF',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  headerText: {
    marginLeft: 12,
  },
  title: {
    fontSize: 20,
    fontWeight: '600',
    color: '#333',
  },
  subtitle: {
    fontSize: 14,
    color: '#666',
    marginTop: 2,
  },
  section: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 12,
  },
  description: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
    marginBottom: 16,
  },
  permissionSelector: {
    gap: 12,
    marginBottom: 16,
  },
  permissionOption: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: '#E0E0E0',
    backgroundColor: '#F8F8F8',
  },
  permissionOptionSelected: {
    backgroundColor: '#F0F0F0',
    borderWidth: 2,
  },
  permissionText: {
    marginLeft: 12,
    flex: 1,
  },
  permissionLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
  },
  permissionDesc: {
    fontSize: 12,
    color: '#666',
    marginTop: 2,
  },
  shareButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#2196F3',
    paddingVertical: 14,
    borderRadius: 8,
  },
  shareButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFF',
    marginLeft: 8,
  },
  shareStatusCard: {
    backgroundColor: '#F8F8F8',
    borderRadius: 12,
    padding: 16,
  },
  shareInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  shareDetails: {
    marginLeft: 12,
    flex: 1,
  },
  shareLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
  },
  shareMeta: {
    fontSize: 12,
    color: '#666',
    marginTop: 2,
  },
  shareStats: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  shareStatsText: {
    fontSize: 13,
    color: '#666',
    marginLeft: 6,
  },
  revokeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderTopWidth: 1,
    borderTopColor: '#E0E0E0',
  },
  revokeText: {
    fontSize: 13,
    color: '#F44336',
    marginLeft: 6,
  },
  importButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#E3F2FD',
    paddingVertical: 12,
    borderRadius: 8,
  },
  importButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#2196F3',
    marginLeft: 8,
  },
  recentImports: {
    marginTop: 16,
  },
  recentImportsTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  importItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  importInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  importDetails: {
    marginLeft: 12,
  },
  importTitle: {
    fontSize: 14,
    fontWeight: '500',
    color: '#333',
  },
  importMeta: {
    fontSize: 12,
    color: '#666',
    marginTop: 2,
  },
  modal: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: '#FFF',
    borderRadius: 12,
    padding: 20,
    width: '80%',
    maxWidth: 400,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  modalDescription: {
    fontSize: 14,
    color: '#666',
    marginBottom: 16,
  },
  inputHint: {
    fontSize: 12,
    color: '#999',
    marginBottom: 16,
  },
  modalButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  cancelButton: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 8,
    backgroundColor: '#F0F0F0',
    alignItems: 'center',
  },
  cancelText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
  },
  confirmButton: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 8,
    backgroundColor: '#2196F3',
    alignItems: 'center',
  },
  confirmText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFF',
  },
});
