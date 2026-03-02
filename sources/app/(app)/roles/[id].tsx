import * as React from 'react';
import { View, ScrollView, Pressable, ActivityIndicator } from 'react-native';
import { Text } from '@/components/StyledText';
import { Stack, useRouter, useLocalSearchParams } from 'expo-router';
import { StyleSheet, useUnistyles } from 'react-native-unistyles';
import { Ionicons } from '@expo/vector-icons';
import { RoleStats } from '@/components/roles/RoleStats';
import { RoleForm } from '@/components/roles/RoleForm';
import { RatingDiagnostics } from '@/components/RatingDiagnostics';
import { ImprovementSuggestions } from '@/components/ImprovementSuggestions';
import { useAuth } from '@/auth/AuthContext';
import {
    fetchCustomRoles,
    fetchRoleReviews,
    updateCustomRole,
    CustomRole,
    RoleReview,
} from '@/sync/apiRoles';
import { Modal } from '@/modal';
import { generateDiagnosticInsights, DiagnosticInsight } from '@/utils/ratingDiagnostics';
import {
    getImprovementSuggestions,
    ImprovementSuggestion as V5ImprovementSuggestion,
    RatingData,
} from '@/sync/apiV5';

export default function RoleDetailScreen() {
    const { id } = useLocalSearchParams<{ id: string }>();
    const router = useRouter();
    const { credentials } = useAuth();
    const { theme } = useUnistyles();

    const [role, setRole] = React.useState<CustomRole | null>(null);
    const [reviews, setReviews] = React.useState<RoleReview[]>([]);
    const [diagnosticInsights, setDiagnosticInsights] = React.useState<DiagnosticInsight[]>([]);
    const [improvementSuggestions, setImprovementSuggestions] = React.useState<V5ImprovementSuggestion[]>([]);
    const [isLoadingSuggestions, setIsLoadingSuggestions] = React.useState(false);
    const [isLoading, setIsLoading] = React.useState(true);
    const [isEditing, setIsEditing] = React.useState(false);
    const [isSaving, setIsSaving] = React.useState(false);

    const loadRole = React.useCallback(async () => {
        if (!credentials || !id) return;

        setIsLoading(true);
        try {
            // Fetch custom roles to find the one we want
            const roles = await fetchCustomRoles(credentials);
            const foundRole = roles.find((r) => r.id === id);

            if (foundRole) {
                setRole(foundRole);
                // Fetch reviews for this role
                const reviewList = await fetchRoleReviews(credentials, id, 10);
                setReviews(reviewList);

                // Generate diagnostic insights
                if (reviewList.length > 0) {
                    const insights = generateDiagnosticInsights(
                        reviewList.map((review) => ({
                            timestamp: new Date(review.createdAt).getTime(),
                            rating: review.rating,
                            source: review.source as 'user' | 'master' | 'system',
                            codeScore: review.codeScore,
                            qualityScore: review.qualityScore,
                        })),
                        foundRole.stats?.averageRating || 4.0,
                        30
                    );
                    setDiagnosticInsights(insights);

                    // V5-AI-002: Fetch AI-powered improvement suggestions
                    setIsLoadingSuggestions(true);
                    try {
                        // Construct RatingData from reviews
                        const ratingData: RatingData = {
                            overall: foundRole.stats?.averageRating || 0,
                            dimensions: {
                                codeQuality: foundRole.stats?.cumulativeCode || 0,
                                collaboration: 0, // Would need separate tracking
                                efficiency: 0, // Would need separate tracking
                                innovation: 0, // Would need separate tracking
                                problemSolving: 0, // Would need separate tracking
                            },
                            trends: {
                                direction: insights.some(i => i.title.includes('Improving')) ? 'improving' :
                                          insights.some(i => i.title.includes('Declining')) ? 'declining' : 'stable',
                                changeRate: 0, // Would calculate from historical data
                            },
                            historicalData: reviewList.map(review => ({
                                date: new Date(review.createdAt).toISOString(),
                                score: review.rating,
                                taskId: review.id,
                            })),
                        };

                        const response = await getImprovementSuggestions(credentials, {
                            profile: {
                                roleId: id,
                                title: foundRole.title,
                                skills: foundRole.assignedSkills || [],
                            },
                            ratingData,
                            options: {
                                maxSuggestions: 5,
                            },
                        });

                        setImprovementSuggestions(response.suggestions);
                    } catch (error) {
                        console.error('Failed to fetch improvement suggestions:', error);
                        // Non-blocking error, continue without suggestions
                    } finally {
                        setIsLoadingSuggestions(false);
                    }
                }
            } else {
                Modal.alert('Error', 'Role not found', [
                    { text: 'OK', onPress: () => router.back() },
                ]);
            }
        } catch (error) {
            console.error('Failed to load role:', error);
            Modal.alert('Error', 'Failed to load role details');
        } finally {
            setIsLoading(false);
        }
    }, [credentials, id, router]);

    React.useEffect(() => {
        loadRole();
    }, [loadRole]);

    const handleUpdate = async (formData: any) => {
        if (!credentials || !id) return;

        setIsSaving(true);
        try {
            await updateCustomRole(credentials, id, formData);
            await loadRole();
            setIsEditing(false);
            Modal.alert('Success', 'Role updated successfully');
        } catch (error) {
            console.error('Failed to update role:', error);
            const message = error instanceof Error ? error.message : 'Failed to update role';
            Modal.alert('Error', message);
        } finally {
            setIsSaving(false);
        }
    };

    const renderDetailView = () => {
        if (!role) return null;

        return (
            <>
                {/* Stats Section */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Performance Stats</Text>
                    <RoleStats stats={role.stats} />
                </View>

                {/* Role Definition */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Role Definition</Text>

                    {role.responsibilities && role.responsibilities.length > 0 && (
                        <View style={styles.definitionBlock}>
                            <Text style={styles.definitionLabel}>Responsibilities</Text>
                            {role.responsibilities.map((item, index) => (
                                <View key={index} style={styles.definitionItem}>
                                    <Text style={styles.bullet}>•</Text>
                                    <Text style={styles.definitionText}>{item}</Text>
                                </View>
                            ))}
                        </View>
                    )}

                    {role.abilityBoundaries && role.abilityBoundaries.length > 0 && (
                        <View style={styles.definitionBlock}>
                            <Text style={styles.definitionLabel}>Ability Boundaries</Text>
                            {role.abilityBoundaries.map((item, index) => (
                                <View key={index} style={styles.definitionItem}>
                                    <Text style={styles.bullet}>•</Text>
                                    <Text style={styles.definitionText}>{item}</Text>
                                </View>
                            ))}
                        </View>
                    )}

                    {role.protocol && role.protocol.length > 0 && (
                        <View style={styles.definitionBlock}>
                            <Text style={styles.definitionLabel}>Protocol</Text>
                            {role.protocol.map((item, index) => (
                                <View key={index} style={styles.definitionItem}>
                                    <Text style={styles.bullet}>•</Text>
                                    <Text style={styles.definitionText}>{item}</Text>
                                </View>
                            ))}
                        </View>
                    )}
                </View>

                {/* Configuration */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Configuration</Text>
                    <View style={styles.configGrid}>
                        <View style={styles.configItem}>
                            <Text style={styles.configLabel}>Model</Text>
                            <Text style={styles.configValue}>
                                {role.modelConfig?.model || 'Default'}
                            </Text>
                        </View>
                        <View style={styles.configItem}>
                            <Text style={styles.configLabel}>Temperature</Text>
                            <Text style={styles.configValue}>
                                {role.modelConfig?.temperature ?? 0.7}
                            </Text>
                        </View>
                        <View style={styles.configItem}>
                            <Text style={styles.configLabel}>Max Tokens</Text>
                            <Text style={styles.configValue}>
                                {role.modelConfig?.maxTokens || 8192}
                            </Text>
                        </View>
                        <View style={styles.configItem}>
                            <Text style={styles.configLabel}>Permission Mode</Text>
                            <Text style={styles.configValue}>
                                {role.policy?.permissionMode || 'default'}
                            </Text>
                        </View>
                    </View>
                </View>

                {/* Skills */}
                {role.assignedSkills && role.assignedSkills.length > 0 && (
                    <View style={styles.section}>
                        <Text style={styles.sectionTitle}>Skills</Text>
                        <View style={styles.skillsContainer}>
                            {role.assignedSkills.map((skill, index) => (
                                <View key={index} style={styles.skillBadge}>
                                    <Text style={styles.skillText}>{skill}</Text>
                                </View>
                            ))}
                        </View>
                    </View>
                )}

                {/* Rating Diagnostics */}
                {reviews.length > 0 && (
                    <View style={styles.section}>
                        <RatingDiagnostics
                            roleId={role.id}
                            roleTitle={role.title}
                            ratingHistory={reviews.map((review) => ({
                                timestamp: new Date(review.createdAt).getTime(),
                                rating: review.rating,
                                source: review.source as 'user' | 'master' | 'system',
                                codeScore: review.codeScore,
                                qualityScore: review.qualityScore,
                            }))}
                            teamAverageRating={role.stats?.averageRating || 4.0}
                            periodDays={30}
                        />
                    </View>
                )}

                {/* Improvement Suggestions */}
                {diagnosticInsights.length > 0 && (
                    <View style={styles.section}>
                        <ImprovementSuggestions
                            roleId={role.id}
                            roleTitle={role.title}
                            diagnosticInsights={diagnosticInsights}
                            averageRating={role.stats?.averageRating || 0}
                            completedTasks={role.stats?.completionCount || 0}
                        />
                    </View>
                )}

                {/* V5 AI-Powered Suggestions */}
                {(isLoadingSuggestions || improvementSuggestions.length > 0) && (
                    <View style={styles.section}>
                        <View style={styles.sectionHeader}>
                            <Ionicons name="bulb" size={20} color={theme.colors.primary} />
                            <Text style={styles.sectionTitle}>AI-Powered Improvement Suggestions</Text>
                        </View>
                        {isLoadingSuggestions ? (
                            <ActivityIndicator size="large" color={theme.colors.primary} />
                        ) : (
                            improvementSuggestions.map((suggestion, index) => (
                                <View key={index} style={styles.suggestionCard}>
                                    <View style={styles.suggestionHeader}>
                                        <Text style={styles.suggestionTitle}>{suggestion.title}</Text>
                                        <View style={[
                                            styles.priorityBadge,
                                            suggestion.priority === 'high' && styles.priorityHigh,
                                            suggestion.priority === 'medium' && styles.priorityMedium,
                                            suggestion.priority === 'low' && styles.priorityLow,
                                        ]}>
                                            <Text style={styles.priorityText}>{suggestion.priority.toUpperCase()}</Text>
                                        </View>
                                    </View>
                                    <Text style={styles.suggestionDescription}>{suggestion.description}</Text>

                                    {/* Action Steps */}
                                    <View style={styles.actionSteps}>
                                        <Text style={styles.actionStepsTitle}>Action Steps:</Text>
                                        {suggestion.actionableSteps.map((step, stepIndex) => (
                                            <View key={stepIndex} style={styles.actionStep}>
                                                <Text style={styles.bullet}>{stepIndex + 1}.</Text>
                                                <Text style={styles.actionStepText}>{step}</Text>
                                            </View>
                                        ))}
                                    </View>

                                    {/* Learning Resources */}
                                    {suggestion.resources.length > 0 && (
                                        <View style={styles.resourcesSection}>
                                            <Text style={styles.resourcesTitle}>Learning Resources:</Text>
                                            {suggestion.resources.map((resource, resourceIndex) => (
                                                <Pressable
                                                    key={resourceIndex}
                                                    style={styles.resourceLink}
                                                    onPress={() => {
                                                        if (resource.url) {
                                                            // Open URL in browser (web) or Linking (mobile)
                                                            if (typeof window !== 'undefined') {
                                                                window.open(resource.url, '_blank');
                                                            }
                                                        }
                                                    }}
                                                >
                                                    <Ionicons
                                                        name={
                                                            resource.type === 'video' ? 'play-circle' :
                                                            resource.type === 'course' ? 'school' :
                                                            resource.type === 'book' ? 'book' :
                                                            resource.type === 'tool' ? 'construct' :
                                                            'document-text'
                                                        }
                                                        size={16}
                                                        color={theme.colors.primary}
                                                    />
                                                    <Text style={styles.resourceLinkText}>{resource.title}</Text>
                                                    <Text style={styles.resourceTime}>{resource.estimatedTime}</Text>
                                                </Pressable>
                                            ))}
                                        </View>
                                    )}

                                    {/* Impact & Timeline */}
                                    <View style={styles.impactRow}>
                                        <View style={styles.impactItem}>
                                            <Text style={styles.impactLabel}>Expected Impact:</Text>
                                            <Text style={styles.impactValue}>{suggestion.expectedImpact}</Text>
                                        </View>
                                        <View style={styles.impactItem}>
                                            <Text style={styles.impactLabel}>Timeline:</Text>
                                            <Text style={styles.impactValue}>{suggestion.timeline}</Text>
                                        </View>
                                    </View>
                                </View>
                            ))
                        )}
                    </View>
                )}

                {/* Recent Reviews */}
                {reviews.length > 0 && (
                    <View style={styles.section}>
                        <Text style={styles.sectionTitle}>Recent Reviews</Text>
                        {reviews.slice(0, 5).map((review) => (
                            <View key={review.id} style={styles.reviewItem}>
                                <View style={styles.reviewHeader}>
                                    <View style={styles.reviewRating}>
                                        {[...Array(5)].map((_, i) => (
                                            <Ionicons
                                                key={i}
                                                name={i < review.rating ? 'star' : 'star-outline'}
                                                size={12}
                                                color="#FFD700"
                                            />
                                        ))}
                                    </View>
                                    <Text style={styles.reviewSource}>
                                        {review.source}
                                    </Text>
                                    <Text style={styles.reviewDate}>
                                        {new Date(review.createdAt).toLocaleDateString()}
                                    </Text>
                                </View>
                                {review.comment && (
                                    <Text style={styles.reviewComment}>
                                        {review.comment}
                                    </Text>
                                )}
                                {(review.codeScore || review.qualityScore) && (
                                    <View style={styles.reviewScores}>
                                        {review.codeScore && (
                                            <Text style={styles.reviewScore}>
                                                Code: {review.codeScore}
                                            </Text>
                                        )}
                                        {review.qualityScore && (
                                            <Text style={styles.reviewScore}>
                                                Quality: {review.qualityScore}
                                            </Text>
                                        )}
                                    </View>
                                )}
                            </View>
                        ))}
                    </View>
                )}
            </>
        );
    };

    if (isLoading) {
        return (
            <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" />
            </View>
        );
    }

    if (!role) {
        return (
            <View style={styles.errorContainer}>
                <Text style={styles.errorText}>Role not found</Text>
            </View>
        );
    }

    return (
        <View style={styles.container}>
            <Stack.Screen
                options={{
                    title: isEditing ? 'Edit Role' : role.title,
                    headerBackTitle: 'Back',
                    headerRight: () =>
                        !isEditing && (
                            <Pressable
                                style={styles.headerButton}
                                onPress={() => setIsEditing(true)}
                            >
                                <Ionicons
                                    name="create-outline"
                                    size={24}
                                    color={theme.colors.header.tint}
                                />
                            </Pressable>
                        ),
                }}
            />

            {isEditing ? (
                <RoleForm
                    initialData={role}
                    onSubmit={handleUpdate}
                    onCancel={() => setIsEditing(false)}
                    isLoading={isSaving}
                    submitLabel="Save Changes"
                />
            ) : (
                <ScrollView
                    style={styles.content}
                    contentContainerStyle={styles.contentInner}
                >
                    {/* Role Header */}
                    <View style={styles.header}>
                        <Text style={styles.headerIcon}>{role.icon || '🤖'}</Text>
                        <View style={styles.headerInfo}>
                            <Text style={styles.headerTitle}>{role.title}</Text>
                            <View style={styles.visibilityBadge}>
                                <Text style={styles.visibilityText}>
                                    {role.visibility === 'public'
                                        ? '🌍 Public'
                                        : '🔒 Private'}
                                </Text>
                            </View>
                        </View>
                    </View>

                    {role.summary && (
                        <Text style={styles.summary}>{role.summary}</Text>
                    )}

                    {renderDetailView()}
                </ScrollView>
            )}
        </View>
    );
}

const styles = StyleSheet.create((theme) => ({
    container: {
        flex: 1,
        backgroundColor: theme.colors.groupped.background,
    },
    headerButton: {
        paddingHorizontal: 16,
        paddingVertical: 8,
    },
    loadingContainer: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
    },
    errorContainer: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
    },
    errorText: {
        fontSize: 16,
        color: theme.colors.textSecondary,
    },
    content: {
        flex: 1,
    },
    contentInner: {
        padding: 16,
        paddingBottom: 40,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 16,
    },
    headerIcon: {
        fontSize: 48,
        marginRight: 16,
    },
    headerInfo: {
        flex: 1,
    },
    headerTitle: {
        fontSize: 24,
        fontWeight: 'bold',
        color: theme.colors.text,
    },
    visibilityBadge: {
        marginTop: 4,
    },
    visibilityText: {
        fontSize: 13,
        color: theme.colors.textSecondary,
    },
    summary: {
        fontSize: 15,
        color: theme.colors.textSecondary,
        marginBottom: 24,
        lineHeight: 22,
    },
    section: {
        marginBottom: 24,
    },
    sectionTitle: {
        fontSize: 17,
        fontWeight: '600',
        color: theme.colors.text,
        marginBottom: 12,
    },
    definitionBlock: {
        backgroundColor: theme.colors.surface,
        borderRadius: 12,
        padding: 16,
        marginBottom: 12,
    },
    definitionLabel: {
        fontSize: 13,
        fontWeight: '600',
        color: theme.colors.textSecondary,
        marginBottom: 8,
        textTransform: 'uppercase',
    },
    definitionItem: {
        flexDirection: 'row',
        marginBottom: 6,
    },
    bullet: {
        fontSize: 14,
        color: theme.colors.button.primary.background,
        marginRight: 8,
        fontWeight: 'bold',
    },
    definitionText: {
        fontSize: 14,
        color: theme.colors.text,
        flex: 1,
        lineHeight: 20,
    },
    configGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 12,
        backgroundColor: theme.colors.surface,
        borderRadius: 12,
        padding: 16,
    },
    configItem: {
        width: '45%',
    },
    configLabel: {
        fontSize: 12,
        color: theme.colors.textSecondary,
        marginBottom: 4,
    },
    configValue: {
        fontSize: 15,
        fontWeight: '600',
        color: theme.colors.text,
    },
    skillsContainer: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 8,
    },
    skillBadge: {
        backgroundColor: theme.colors.surface,
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 16,
    },
    skillText: {
        fontSize: 13,
        color: theme.colors.text,
    },
    reviewItem: {
        backgroundColor: theme.colors.surface,
        borderRadius: 12,
        padding: 12,
        marginBottom: 8,
    },
    reviewHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        marginBottom: 4,
    },
    reviewRating: {
        flexDirection: 'row',
        gap: 2,
    },
    reviewSource: {
        fontSize: 12,
        fontWeight: '600',
        color: theme.colors.text,
        textTransform: 'capitalize',
    },
    reviewDate: {
        fontSize: 11,
        color: theme.colors.textSecondary,
    },
    reviewComment: {
        fontSize: 13,
        color: theme.colors.text,
        marginTop: 4,
        lineHeight: 18,
    },
    reviewScores: {
        flexDirection: 'row',
        gap: 12,
        marginTop: 6,
    },
    reviewScore: {
        fontSize: 11,
        color: theme.colors.textSecondary,
    },
    // V5 AI-Powered Suggestions Styles
    sectionHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        marginBottom: 12,
    },
    suggestionCard: {
        backgroundColor: theme.colors.surface,
        borderRadius: 12,
        padding: 16,
        marginBottom: 16,
        borderWidth: 1,
        borderColor: theme.colors.border,
    },
    suggestionHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 8,
    },
    suggestionTitle: {
        fontSize: 16,
        fontWeight: '600',
        color: theme.colors.text,
        flex: 1,
    },
    priorityBadge: {
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 6,
    },
    priorityHigh: {
        backgroundColor: '#fee2e2',
    },
    priorityMedium: {
        backgroundColor: '#fef3c7',
    },
    priorityLow: {
        backgroundColor: '#dbeafe',
    },
    priorityText: {
        fontSize: 10,
        fontWeight: '600',
        color: theme.colors.text,
    },
    suggestionDescription: {
        fontSize: 14,
        color: theme.colors.textSecondary,
        lineHeight: 20,
        marginBottom: 12,
    },
    actionSteps: {
        marginBottom: 12,
    },
    actionStepsTitle: {
        fontSize: 13,
        fontWeight: '600',
        color: theme.colors.text,
        marginBottom: 8,
    },
    actionStep: {
        flexDirection: 'row',
        marginBottom: 6,
    },
    actionStepText: {
        fontSize: 14,
        color: theme.colors.text,
        flex: 1,
        lineHeight: 20,
    },
    resourcesSection: {
        marginTop: 12,
        marginBottom: 12,
    },
    resourcesTitle: {
        fontSize: 13,
        fontWeight: '600',
        color: theme.colors.text,
        marginBottom: 8,
    },
    resourceLink: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 8,
        paddingHorizontal: 12,
        backgroundColor: theme.colors.background,
        borderRadius: 8,
        marginBottom: 6,
        gap: 8,
    },
    resourceLinkText: {
        fontSize: 14,
        color: theme.colors.primary,
        flex: 1,
    },
    resourceTime: {
        fontSize: 12,
        color: theme.colors.textSecondary,
    },
    impactRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginTop: 12,
        paddingTop: 12,
        borderTopWidth: 1,
        borderTopColor: theme.colors.border,
    },
    impactItem: {
        flex: 1,
    },
    impactLabel: {
        fontSize: 11,
        color: theme.colors.textSecondary,
        marginBottom: 2,
    },
    impactValue: {
        fontSize: 13,
        fontWeight: '500',
        color: theme.colors.text,
    },
}));
