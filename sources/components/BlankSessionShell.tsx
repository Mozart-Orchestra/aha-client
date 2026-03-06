import React from 'react';
import { Pressable, Text, TextInput, View } from 'react-native';
import { useRouter } from 'expo-router';
import { StyleSheet } from 'react-native-unistyles';
import { Ionicons, Octicons } from '@expo/vector-icons';
import { t } from '@/text';
import { useAllMachines, useSetting } from '@/sync/storage';
import { Modal } from '@/modal';
import { storeTempData } from '@/utils/tempDataStore';
import { formatPathRelativeToHome } from '@/utils/sessionUtils';
import { buildBlankSessionDraft, getBlankSessionLaunchContext } from '@/components/blankSessionShell.utils';

export const BlankSessionShell = React.memo(({ teamName, roleName }: { teamName?: string; roleName?: string }) => {
    const router = useRouter();
    const machines = useAllMachines();
    const recentMachinePaths = useSetting('recentMachinePaths');
    const lastUsedAgent = useSetting('lastUsedAgent');
    const [draftPrompt, setDraftPrompt] = React.useState('');
    const [showInfo, setShowInfo] = React.useState(true);

    const launchContext = React.useMemo(() => getBlankSessionLaunchContext({
        machines,
        recentMachinePaths,
        lastUsedAgent,
    }), [lastUsedAgent, machines, recentMachinePaths]);

    const openNewSession = React.useCallback((startWithPrompt: boolean) => {
        const sessionData = buildBlankSessionDraft(startWithPrompt ? draftPrompt : '', roleName, {
            machineId: launchContext.machineId,
            path: launchContext.path,
            agentType: launchContext.agentType,
            sessionType: launchContext.sessionType,
        });
        const dataId = storeTempData(sessionData);
        router.push({
            pathname: '/new',
            params: { dataId }
        });
    }, [draftPrompt, launchContext.agentType, launchContext.machineId, launchContext.path, launchContext.sessionType, roleName, router]);

    const handleImagePress = React.useCallback(() => {
        Modal.alert(t('blankSession.image'), t('blankSession.imageRequiresLiveSession'));
    }, []);

    const handleAbortPress = React.useCallback(() => {
        Modal.alert(t('blankSession.abort'), t('blankSession.abortRequiresLiveSession'));
    }, []);

    const canSendPrompt = draftPrompt.trim().length > 0;
    const agentLabel = launchContext.agentType === 'codex' ? t('agentInput.agent.codex') : t('agentInput.agent.claude');
    const machineLabel = launchContext.machineName || t('agentInput.noMachinesAvailable');
    const pathLabel = launchContext.path
        ? formatPathRelativeToHome(launchContext.path, launchContext.machineHomeDir)
        : t('status.unknown');
    const connectionLabel = launchContext.machineId
        ? (launchContext.machineOnline ? t('status.online') : t('status.offline'))
        : t('agentInput.noMachinesAvailable');

    return (
        <View style={styles.screen} testID="blank-session-shell">
            <View style={styles.header}>
                <Text style={styles.headerTitle}>{t('newSession.title')}</Text>
            </View>

            <View style={styles.body}>
                <View style={styles.sidebar}>
                    {roleName || teamName ? (
                        <View style={styles.memberCard}>
                            {roleName ? <Text style={styles.memberName}>{roleName}</Text> : null}
                            {teamName ? <Text style={styles.memberMeta}>{teamName}</Text> : null}
                        </View>
                    ) : null}

                    <Text style={styles.sidebarLabel}>{t('sessionInfo.quickActions')}</Text>

                    <Pressable
                        style={[styles.sidebarAction, styles.sidebarActionPrimary]}
                        onPress={() => openNewSession(false)}
                        testID="blank-session-start"
                    >
                        <Ionicons name="add-circle-outline" size={16} color="#FFFFFF" />
                        <Text style={styles.sidebarActionPrimaryText}>{t('newSession.title')}</Text>
                    </Pressable>

                    <Pressable
                        style={styles.sidebarAction}
                        onPress={() => router.push('/session/recent')}
                        testID="blank-session-history"
                    >
                        <Ionicons name="time-outline" size={16} color="#1A1918" />
                        <Text style={styles.sidebarActionText}>{t('sessionHistory.title')}</Text>
                    </Pressable>

                    <Pressable
                        style={styles.sidebarAction}
                        onPress={() => router.push('/settings')}
                        testID="blank-session-settings"
                    >
                        <Ionicons name="settings-outline" size={16} color="#1A1918" />
                        <Text style={styles.sidebarActionText}>{t('common.settings')}</Text>
                    </Pressable>

                    <Pressable
                        style={styles.sidebarAction}
                        onPress={() => setShowInfo(prev => !prev)}
                        testID="blank-session-info"
                    >
                        <Ionicons name="information-circle-outline" size={16} color="#1A1918" />
                        <Text style={styles.sidebarActionText}>{t('blankSession.info')}</Text>
                    </Pressable>
                </View>

                <View style={styles.content}>
                    <View style={styles.heroCard}>
                        <Ionicons name="chatbubble-ellipses-outline" size={28} color="#3D8A5A" />
                        <Text style={styles.heroTitle}>{t('newSession.title')}</Text>
                        <Text style={styles.heroSubtitle}>{t('blankSession.launchPreview')}</Text>
                    </View>

                    {showInfo ? (
                        <View style={styles.infoCard} testID="blank-session-info-panel">
                            <Text style={styles.infoTitle}>{t('blankSession.info')}</Text>
                            <Text style={styles.infoDescription}>{t('blankSession.infoDescription')}</Text>
                            <View style={styles.infoGrid}>
                                {roleName ? (
                                    <View style={styles.infoRow}>
                                        <Text style={styles.infoLabel}>{t('blankSession.agentRole')}</Text>
                                        <Text style={styles.infoValue}>{roleName}</Text>
                                    </View>
                                ) : null}
                                <View style={styles.infoRow}>
                                    <Text style={styles.infoLabel}>{t('sessionInfo.connectionStatus')}</Text>
                                    <Text style={styles.infoValue}>{connectionLabel}</Text>
                                </View>
                                <View style={styles.infoRow}>
                                    <Text style={styles.infoLabel}>{t('sessionInfo.viewMachine')}</Text>
                                    <Text style={styles.infoValue}>{machineLabel}</Text>
                                </View>
                                <View style={styles.infoRow}>
                                    <Text style={styles.infoLabel}>{t('sessionInfo.path')}</Text>
                                    <Text style={styles.infoValue}>{pathLabel}</Text>
                                </View>
                                <View style={styles.infoRow}>
                                    <Text style={styles.infoLabel}>{t('sessionInfo.aiProvider')}</Text>
                                    <Text style={styles.infoValue}>{agentLabel}</Text>
                                </View>
                                <View style={styles.infoRow}>
                                    <Text style={styles.infoLabel}>{t('newSession.sessionType.title')}</Text>
                                    <Text style={styles.infoValue}>{launchContext.sessionType === 'worktree' ? t('newSession.sessionType.worktree') : t('newSession.sessionType.simple')}</Text>
                                </View>
                            </View>
                        </View>
                    ) : null}

                    <View style={styles.composer}>
                        <TextInput
                            value={draftPrompt}
                            onChangeText={setDraftPrompt}
                            placeholder={t('session.inputPlaceholder')}
                            placeholderTextColor="#9C9B99"
                            style={styles.input}
                            multiline
                            onSubmitEditing={() => {
                                if (canSendPrompt) {
                                    openNewSession(true);
                                }
                            }}
                            testID="blank-session-input"
                        />

                        <View style={styles.composerFooter}>
                            <View style={styles.composerActions}>
                                <Pressable
                                    style={styles.inlineAction}
                                    onPress={handleImagePress}
                                    testID="blank-session-image"
                                >
                                    <Ionicons name="image-outline" size={16} color="#1A1918" />
                                    <Text style={styles.inlineActionText}>{t('blankSession.image')}</Text>
                                </Pressable>

                                <Pressable
                                    style={styles.inlineAction}
                                    onPress={handleAbortPress}
                                    testID="blank-session-abort"
                                >
                                    <Octicons name="stop" size={15} color="#1A1918" />
                                    <Text style={styles.inlineActionText}>{t('blankSession.abort')}</Text>
                                </Pressable>
                            </View>

                            <Pressable
                                style={[
                                    styles.sendButton,
                                    !canSendPrompt && styles.sendButtonDisabled,
                                ]}
                                disabled={!canSendPrompt}
                                onPress={() => openNewSession(true)}
                                testID="blank-session-send"
                            >
                                <Ionicons name="arrow-up" size={18} color="#FFFFFF" />
                            </Pressable>
                        </View>
                    </View>
                </View>
            </View>
        </View>
    );
});

const styles = StyleSheet.create(() => ({
    screen: {
        flex: 1,
        backgroundColor: '#F5F4F1',
    },
    header: {
        height: 56,
        borderBottomWidth: 1,
        borderBottomColor: '#E5E4E1',
        justifyContent: 'center',
        paddingHorizontal: 16,
        backgroundColor: '#FFFFFF',
    },
    headerTitle: {
        color: '#1A1918',
        fontSize: 16,
        fontWeight: '700',
        fontFamily: 'Outfit',
    },
    body: {
        flex: 1,
        flexDirection: 'row',
    },
    sidebar: {
        width: 260,
        borderRightWidth: 1,
        borderRightColor: '#E5E4E1',
        backgroundColor: '#FFFFFF',
        padding: 14,
        gap: 10,
    },
    sidebarLabel: {
        color: '#6D6C6A',
        fontSize: 12,
        fontWeight: '600',
        fontFamily: 'Outfit',
    },
    memberCard: {
        borderRadius: 10,
        backgroundColor: '#F8F7F4',
        padding: 10,
        gap: 4,
    },
    memberName: {
        color: '#1A1918',
        fontFamily: 'Outfit',
        fontSize: 14,
        fontWeight: '600',
    },
    memberMeta: {
        color: '#6D6C6A',
        fontFamily: 'Outfit',
        fontSize: 12,
    },
    sidebarAction: {
        minHeight: 40,
        borderRadius: 10,
        borderWidth: 1,
        borderColor: '#E5E4E1',
        alignItems: 'center',
        justifyContent: 'center',
        flexDirection: 'row',
        gap: 8,
        paddingHorizontal: 12,
        backgroundColor: '#FFFFFF',
    },
    sidebarActionPrimary: {
        backgroundColor: '#3D8A5A',
        borderColor: '#3D8A5A',
    },
    sidebarActionText: {
        color: '#1A1918',
        fontSize: 13,
        fontWeight: '600',
        fontFamily: 'Outfit',
    },
    sidebarActionPrimaryText: {
        color: '#FFFFFF',
        fontSize: 13,
        fontWeight: '600',
        fontFamily: 'Outfit',
    },
    content: {
        flex: 1,
        padding: 20,
        gap: 14,
    },
    heroCard: {
        borderRadius: 14,
        borderWidth: 1,
        borderColor: '#E5E4E1',
        backgroundColor: '#FFFFFF',
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: 24,
        paddingVertical: 24,
    },
    heroTitle: {
        color: '#4C4B49',
        fontSize: 16,
        fontWeight: '600',
        fontFamily: 'Outfit',
        marginTop: 12,
        textAlign: 'center',
    },
    heroSubtitle: {
        color: '#6D6C6A',
        fontSize: 13,
        fontWeight: '500',
        fontFamily: 'Outfit',
        marginTop: 8,
        textAlign: 'center',
    },
    infoCard: {
        borderRadius: 14,
        borderWidth: 1,
        borderColor: '#E5E4E1',
        backgroundColor: '#FFFFFF',
        padding: 16,
        gap: 10,
    },
    infoTitle: {
        color: '#1A1918',
        fontSize: 14,
        fontWeight: '700',
        fontFamily: 'Outfit',
    },
    infoDescription: {
        color: '#6D6C6A',
        fontSize: 12,
        lineHeight: 18,
        fontFamily: 'Outfit',
    },
    infoGrid: {
        gap: 8,
    },
    infoRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        gap: 12,
    },
    infoLabel: {
        flex: 1,
        color: '#6D6C6A',
        fontSize: 12,
        fontWeight: '600',
        fontFamily: 'Outfit',
    },
    infoValue: {
        flex: 1,
        color: '#1A1918',
        fontSize: 12,
        textAlign: 'right',
        fontFamily: 'Outfit',
    },
    composer: {
        minHeight: 160,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: '#E5E4E1',
        backgroundColor: '#FFFFFF',
        paddingHorizontal: 12,
        paddingVertical: 10,
        gap: 12,
    },
    input: {
        flex: 1,
        color: '#1A1918',
        fontFamily: 'Outfit',
        fontSize: 14,
        maxHeight: 120,
        minHeight: 84,
        textAlignVertical: 'top',
    },
    composerFooter: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 12,
    },
    composerActions: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        flexWrap: 'wrap',
        flex: 1,
    },
    inlineAction: {
        minHeight: 34,
        borderRadius: 10,
        borderWidth: 1,
        borderColor: '#E5E4E1',
        alignItems: 'center',
        justifyContent: 'center',
        flexDirection: 'row',
        gap: 6,
        paddingHorizontal: 10,
        backgroundColor: '#FFFFFF',
    },
    inlineActionText: {
        color: '#1A1918',
        fontSize: 12,
        fontWeight: '600',
        fontFamily: 'Outfit',
    },
    sendButton: {
        width: 38,
        height: 38,
        borderRadius: 10,
        backgroundColor: '#3D8A5A',
        alignItems: 'center',
        justifyContent: 'center',
    },
    sendButtonDisabled: {
        backgroundColor: '#B9D6C2',
    },
}));
