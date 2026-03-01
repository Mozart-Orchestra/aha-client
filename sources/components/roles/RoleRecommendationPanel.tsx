/**
 * V5-AI-001: 智能角色推荐面板
 *
 * 功能：
 * 1. 输入项目需求（技术栈、团队规模、项目类型）
 * 2. 显示推荐角色列表（匹配度、推荐理由）
 * 3. 支持一键应用推荐
 */

import * as React from 'react';
import { View, Text, TextInput, TouchableOpacity, ActivityIndicator, ScrollView } from 'react-native';
import { StyleSheet } from 'react-native-unistyles';
import { getRoleRecommendations, RoleRecommendation, ProjectRequirement } from '@/sync/apiV5';
import type { AuthCredentials } from '@/auth/tokenStorage';

interface RoleRecommendationPanelProps {
  credentials: AuthCredentials;
  onApplyRecommendation?: (recommendation: RoleRecommendation) => void;
}

export function RoleRecommendationPanel({ credentials, onApplyRecommendation }: RoleRecommendationPanelProps) {
  const [techStack, setTechStack] = React.useState('');
  const [teamSize, setTeamSize] = React.useState('');
  const [projectType, setProjectType] = React.useState<string>('webapp');
  const [description, setDescription] = React.useState('');
  const [recommendations, setRecommendations] = React.useState<RoleRecommendation[]>([]);
  const [isLoading, setIsLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const handleGetRecommendations = async () => {
    if (!techStack.trim()) {
      setError('Please enter tech stack');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const requirement: ProjectRequirement = {
        techStack: techStack.split(',').map(s => s.trim()).filter(Boolean),
        teamSize: parseInt(teamSize) || 5,
        projectType: projectType as any,
        description: description || undefined,
      };

      const result = await getRoleRecommendations(credentials, requirement);

      if (result.recommendations.length > 0) {
        setRecommendations(result.recommendations);
      } else {
        setError('No recommendations available');
      }
    } catch (err) {
      setError(`Failed to get recommendations: ${err instanceof Error ? err.message : 'Unknown error'}`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleApply = (recommendation: RoleRecommendation) => {
    onApplyRecommendation?.(recommendation);
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Project Requirements</Text>

      {/* Tech Stack Input */}
      <View style={styles.inputGroup}>
        <Text style={styles.label}>Tech Stack *</Text>
        <TextInput
          style={styles.input}
          placeholder="Enter tech stack (comma separated)"
          value={techStack}
          onChangeText={setTechStack}
          placeholderTextColor="#666"
        />
      </View>

      {/* Team Size Input */}
      <View style={styles.inputGroup}>
        <Text style={styles.label}>Team Size</Text>
        <TextInput
          style={styles.input}
          placeholder="Team size"
          value={teamSize}
          onChangeText={setTeamSize}
          keyboardType="numeric"
          placeholderTextColor="#666"
        />
      </View>

      {/* Project Type Selector */}
      <View style={styles.inputGroup}>
        <Text style={styles.label}>Project Type</Text>
        <View style={styles.typeSelector}>
          {['webapp', 'api', 'mobile', 'fullstack'].map(type => (
            <TouchableOpacity
              key={type}
              style={[styles.typeButton, projectType === type && styles.typeButtonActive]}
              onPress={() => setProjectType(type)}
            >
              <Text style={[styles.typeButtonText, projectType === type && styles.typeButtonTextActive]}>
                {type}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* Description (Optional) */}
      <View style={styles.inputGroup}>
        <Text style={styles.label}>Description (Optional)</Text>
        <TextInput
          style={[styles.input, styles.textArea]}
          placeholder="Brief project description"
          value={description}
          onChangeText={setDescription}
          multiline
          numberOfLines={3}
          placeholderTextColor="#666"
        />
      </View>

      {/* Submit Button */}
      <TouchableOpacity
        style={[styles.button, isLoading && styles.buttonDisabled]}
        onPress={handleGetRecommendations}
        disabled={isLoading}
      >
        {isLoading ? (
          <ActivityIndicator testID="loading-indicator" color="#fff" />
        ) : (
          <Text style={styles.buttonText}>Get Recommendations</Text>
        )}
      </TouchableOpacity>

      {/* Error Message */}
      {error && (
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      )}

      {/* Recommendations List */}
      {recommendations.length > 0 && (
        <ScrollView style={styles.recommendationsList}>
          <Text style={styles.sectionTitle}>Recommended Roles ({recommendations.length})</Text>
          {recommendations.map((rec) => (
            <View key={rec.role.id} style={styles.recommendationCard}>
              <View style={styles.cardHeader}>
                <Text style={styles.roleName}>{rec.role.name}</Text>
                <Text style={styles.matchScore}>{rec.matchScore}% Match</Text>
              </View>

              <Text style={styles.roleSummary}>{rec.role.category}</Text>

              {/* Matched Skills */}
              <View style={styles.skillSection}>
                <Text style={styles.skillLabel}>Matched: {rec.skillMatch.matched.join(', ')}</Text>
              </View>

              {/* Reasons */}
              <View style={styles.reasonsSection}>
                {rec.reasons.map((reason, i) => (
                  <Text key={i} style={styles.reason}>• {reason}</Text>
                ))}
              </View>

              {/* Apply Button */}
              {onApplyRecommendation && (
                <TouchableOpacity
                  style={styles.applyButton}
                  onPress={() => handleApply(rec)}
                >
                  <Text style={styles.applyButtonText}>Apply</Text>
                </TouchableOpacity>
              )}
            </View>
          ))}
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create((theme: any) => {
  const textPrimary = theme?.colors?.text?.primary ?? theme?.colors?.text ?? '#111111';
  const textSecondary = theme?.colors?.text?.secondary ?? theme?.colors?.textSecondary ?? '#666666';
  const textTertiary = theme?.colors?.text?.tertiary ?? textSecondary;
  const groupedBackground = theme?.colors?.groupped?.background ?? theme?.colors?.surface ?? '#FFFFFF';
  const groupedCell = theme?.colors?.groupped?.cell ?? theme?.colors?.surfaceHigh ?? theme?.colors?.surface ?? '#F5F5F5';
  const borderPrimary = theme?.colors?.border?.primary ?? theme?.colors?.divider ?? '#E0E0E0';
  const accentPrimary = theme?.colors?.accent?.primary ?? theme?.colors?.button?.primary?.background ?? '#007AFF';

  return {
    container: {
      padding: 16,
      backgroundColor: groupedBackground,
    },
    title: {
      fontSize: 20,
      fontWeight: '700',
      color: textPrimary,
      marginBottom: 16,
    },
    inputGroup: {
      marginBottom: 16,
    },
    label: {
      fontSize: 14,
      fontWeight: '600',
      color: textSecondary,
      marginBottom: 8,
    },
    input: {
      backgroundColor: groupedCell,
      borderRadius: 12,
      padding: 12,
      fontSize: 16,
      color: textPrimary,
      borderWidth: 1,
      borderColor: borderPrimary,
    },
    textArea: {
      minHeight: 80,
      textAlignVertical: 'top',
    },
    typeSelector: {
      flexDirection: 'row',
      gap: 8,
    },
    typeButton: {
      flex: 1,
      paddingVertical: 10,
      paddingHorizontal: 12,
      borderRadius: 10,
      backgroundColor: groupedCell,
      borderWidth: 1,
      borderColor: borderPrimary,
      alignItems: 'center',
    },
    typeButtonActive: {
      backgroundColor: accentPrimary,
      borderColor: accentPrimary,
    },
    typeButtonText: {
      fontSize: 14,
      color: textSecondary,
    },
    typeButtonTextActive: {
      color: '#fff',
      fontWeight: '600',
    },
    button: {
      backgroundColor: accentPrimary,
      borderRadius: 12,
      paddingVertical: 14,
      alignItems: 'center',
      marginTop: 8,
    },
    buttonDisabled: {
      opacity: 0.6,
    },
    buttonText: {
      fontSize: 16,
      fontWeight: '600',
      color: '#fff',
    },
    errorContainer: {
      backgroundColor: '#fee',
      borderRadius: 10,
      padding: 12,
      marginTop: 12,
    },
    errorText: {
      color: '#c00',
      fontSize: 14,
    },
    recommendationsList: {
      marginTop: 24,
    },
    sectionTitle: {
      fontSize: 18,
      fontWeight: '700',
      color: textPrimary,
      marginBottom: 12,
    },
    recommendationCard: {
      backgroundColor: groupedCell,
      borderRadius: 14,
      padding: 16,
      marginBottom: 12,
      borderWidth: 1,
      borderColor: borderPrimary,
    },
    cardHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 8,
    },
    roleName: {
      fontSize: 18,
      fontWeight: '700',
      color: textPrimary,
      flex: 1,
    },
    matchScore: {
      fontSize: 16,
      fontWeight: '600',
      color: accentPrimary,
    },
    roleSummary: {
      fontSize: 14,
      color: textTertiary,
      marginBottom: 12,
    },
    skillSection: {
      marginBottom: 12,
    },
    skillLabel: {
      fontSize: 14,
      color: textSecondary,
    },
    reasonsSection: {
      marginBottom: 12,
    },
    reason: {
      fontSize: 14,
      color: textSecondary,
      lineHeight: 20,
      marginBottom: 4,
    },
    applyButton: {
      backgroundColor: accentPrimary,
      borderRadius: 10,
      paddingVertical: 10,
      alignItems: 'center',
      marginTop: 8,
    },
    applyButtonText: {
      fontSize: 15,
      fontWeight: '600',
      color: '#fff',
    },
  };
});
