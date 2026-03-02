import React from 'react';
import {
  View,
  ScrollView,
  Pressable,
  StyleSheet,
  Alert,
} from 'react-native';
import { Text } from '@/components/StyledText';
import { Ionicons } from '@expo/vector-icons';

export interface Integration {
  id: string;
  name: string;
  description: string;
  icon: string;
  category: 'communication' | 'version-control' | 'ci-cd' | 'monitoring' | 'productivity';
  isConnected: boolean;
  configuredAt?: number;
  lastSync?: number;
  config?: Record<string, unknown>;
}

export interface RoleIntegrationsProps {
  /** Role ID */
  roleId: string;
  /** Role title */
  roleTitle: string;
  /** Available integrations */
  integrations: Integration[];
  /** Callback when integration is connected */
  onConnect?: (integrationId: string, config: Record<string, unknown>) => void;
  /** Callback when integration is disconnected */
  onDisconnect?: (integrationId: string) => void;
  /** Callback when integration is synced */
  onSync?: (integrationId: string) => void;
  /** Callback to view integration logs */
  onViewLogs?: (integrationId: string) => void;
}

/**
 * RoleIntegrations Component
 *
 * V5-INTEGRATION-001: External Tool Integration
 *
 * Manage integrations with external tools for enhanced role functionality.
 *
 * Usage:
 * ```tsx
 * <RoleIntegrations
 *   roleId="role-123"
 *   roleTitle="Frontend Architect"
 *   integrations={integrations}
 *   onConnect={handleConnect}
 * />
 * ```
 */
export function RoleIntegrations({
  roleId,
  roleTitle,
  integrations,
  onConnect,
  onDisconnect,
  onSync,
  onViewLogs,
}: RoleIntegrationsProps) {
  const getCategoryLabel = (category: Integration['category']) => {
    switch (category) {
      case 'communication':
        return 'Communication';
      case 'version-control':
        return 'Version Control';
      case 'ci-cd':
        return 'CI/CD';
      case 'monitoring':
        return 'Monitoring';
      case 'productivity':
        return 'Productivity';
    }
  };

  const handleConnect = (integration: Integration) => {
    if (!onConnect) return;

    // In real implementation, this would open a configuration modal
    Alert.alert(
      `Connect ${integration.name}`,
      `This will connect ${integration.name} to "${roleTitle}". Continue?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Connect',
          onPress: () => {
            // Simulated config - in real app would come from a form
            onConnect(integration.id, {
              enabled: true,
              syncInterval: 300000, // 5 minutes
            });
          },
        },
      ]
    );
  };

  const handleDisconnect = (integration: Integration) => {
    if (!onDisconnect) return;

    Alert.alert(
      `Disconnect ${integration.name}`,
      'Are you sure you want to disconnect this integration?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Disconnect',
          style: 'destructive',
          onPress: () => onDisconnect(integration.id),
        },
      ]
    );
  };

  const connectedCount = integrations.filter((i) => i.isConnected).length;

  return (
    <ScrollView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Ionicons name="link" size={24} color="#9C27B0" />
        <View style={styles.headerText}>
          <Text style={styles.title}>Integrations</Text>
          <Text style={styles.subtitle}>
            {connectedCount} of {integrations.length} connected
          </Text>
        </View>
      </View>

      {/* Connected Integrations */}
      {connectedCount > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Connected</Text>
          {integrations
            .filter((i) => i.isConnected)
            .map((integration) => (
              <View key={integration.id} style={styles.integrationCard}>
                <View style={styles.integrationHeader}>
                  <View style={styles.integrationInfo}>
                    <Ionicons
                      name={integration.icon as any}
                      size={24}
                      color="#4CAF50"
                    />
                    <View style={styles.integrationText}>
                      <Text style={styles.integrationName}>
                        {integration.name}
                      </Text>
                      <Text style={styles.integrationCategory}>
                        {getCategoryLabel(integration.category)}
                      </Text>
                    </View>
                  </View>
                  <View style={styles.statusBadge}>
                    <Ionicons name="checkmark-circle" size={16} color="#4CAF50" />
                    <Text style={styles.statusText}>Connected</Text>
                  </View>
                </View>

                <Text style={styles.integrationDesc}>
                  {integration.description}
                </Text>

                {integration.lastSync && (
                  <View style={styles.syncInfo}>
                    <Ionicons name="sync" size={14} color="#666" />
                    <Text style={styles.syncText}>
                      Last synced:{' '}
                      {new Date(integration.lastSync).toLocaleString()}
                    </Text>
                  </View>
                )}

                <View style={styles.integrationActions}>
                  {onSync && (
                    <Pressable
                      style={styles.actionButton}
                      onPress={() => onSync(integration.id)}
                    >
                      <Ionicons name="refresh" size={16} color="#2196F3" />
                      <Text style={styles.actionText}>Sync Now</Text>
                    </Pressable>
                  )}

                  {onViewLogs && (
                    <Pressable
                      style={styles.actionButton}
                      onPress={() => onViewLogs(integration.id)}
                    >
                      <Ionicons name="document-text" size={16} color="#666" />
                      <Text style={[styles.actionText, { color: '#666' }]}>
                        Logs
                      </Text>
                    </Pressable>
                  )}

                  {onDisconnect && (
                    <Pressable
                      style={styles.actionButton}
                      onPress={() => handleDisconnect(integration)}
                    >
                      <Ionicons name="unlink" size={16} color="#F44336" />
                      <Text style={[styles.actionText, { color: '#F44336' }]}>
                        Disconnect
                      </Text>
                    </Pressable>
                  )}
                </View>
              </View>
            ))}
        </View>
      )}

      {/* Available Integrations */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>
          {connectedCount > 0 ? 'Available' : 'All Integrations'}
        </Text>
        {integrations
          .filter((i) => !i.isConnected)
          .map((integration) => (
            <View key={integration.id} style={styles.integrationCard}>
              <View style={styles.integrationHeader}>
                <View style={styles.integrationInfo}>
                  <Ionicons
                    name={integration.icon as any}
                    size={24}
                    color="#666"
                  />
                  <View style={styles.integrationText}>
                    <Text style={styles.integrationName}>
                      {integration.name}
                    </Text>
                    <Text style={styles.integrationCategory}>
                      {getCategoryLabel(integration.category)}
                    </Text>
                  </View>
                </View>
              </View>

              <Text style={styles.integrationDesc}>
                {integration.description}
              </Text>

              {onConnect && (
                <Pressable
                  style={styles.connectButton}
                  onPress={() => handleConnect(integration)}
                >
                  <Ionicons name="add-circle" size={16} color="#FFF" />
                  <Text style={styles.connectText}>Connect</Text>
                </Pressable>
              )}
            </View>
          ))}
      </View>

      {/* Integration Benefits */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Why Integrate?</Text>
        <View style={styles.benefitsList}>
          <View style={styles.benefitItem}>
            <Ionicons name="notifications" size={20} color="#2196F3" />
            <Text style={styles.benefitText}>
              Get notifications when this role completes tasks
            </Text>
          </View>
          <View style={styles.benefitItem}>
            <Ionicons name="git-branch" size={20} color="#4CAF50" />
            <Text style={styles.benefitText}>
              Track code changes and commits automatically
            </Text>
          </View>
          <View style={styles.benefitItem}>
            <Ionicons name="analytics" size={20} color="#FF9800" />
            <Text style={styles.benefitText}>
              Monitor performance and quality metrics
            </Text>
          </View>
          <View style={styles.benefitItem}>
            <Ionicons name="rocket" size={20} color="#9C27B0" />
            <Text style={styles.benefitText}>
              Trigger deployments and CI/CD pipelines
            </Text>
          </View>
        </View>
      </View>
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
  integrationCard: {
    backgroundColor: '#F8F8F8',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  integrationHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  integrationInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  integrationText: {
    marginLeft: 12,
    flex: 1,
  },
  integrationName: {
    fontSize: 15,
    fontWeight: '600',
    color: '#333',
  },
  integrationCategory: {
    fontSize: 12,
    color: '#666',
    marginTop: 2,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E8F5E9',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#4CAF50',
    marginLeft: 4,
  },
  integrationDesc: {
    fontSize: 13,
    color: '#666',
    lineHeight: 18,
    marginBottom: 12,
  },
  syncInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  syncText: {
    fontSize: 12,
    color: '#666',
    marginLeft: 6,
  },
  integrationActions: {
    flexDirection: 'row',
    gap: 8,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: '#FFF',
    borderRadius: 8,
    flex: 1,
    justifyContent: 'center',
  },
  actionText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#2196F3',
    marginLeft: 6,
  },
  connectButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#2196F3',
    paddingVertical: 10,
    borderRadius: 8,
  },
  connectText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFF',
    marginLeft: 6,
  },
  benefitsList: {
    gap: 12,
  },
  benefitItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  benefitText: {
    fontSize: 14,
    color: '#666',
    marginLeft: 12,
    flex: 1,
  },
});
