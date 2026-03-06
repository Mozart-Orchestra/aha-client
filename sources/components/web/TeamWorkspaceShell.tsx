import * as React from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import type { TeamOverview } from './teamOverview';
import { uiPenColors, uiPenFontFamily, uiPenRadius } from './uiPenTokens';
import {
    TEAM_WORKSPACE_ACTION_HREFS,
    TEAM_WORKSPACE_TAB_META,
    type TeamWorkspaceTab,
    withTeamWorkspaceQuery,
} from './teamWorkspace';
import { getTeamCreationRoute } from '@/features/teams/wizard/routes';

interface TeamWorkspaceShellProps {
    activeTab: TeamWorkspaceTab;
    title: string;
    teams: TeamOverview[];
    selectedTeamId?: string;
    headerActions?: React.ReactNode;
    rightPanel?: React.ReactNode;
    children: React.ReactNode;
}

export function TeamWorkspaceShell({
    activeTab,
    title,
    teams,
    selectedTeamId,
    headerActions,
    rightPanel,
    children,
}: TeamWorkspaceShellProps) {
    const router = useRouter();
    const insets = useSafeAreaInsets();

    return (
        <View
            style={{
                flex: 1,
                flexDirection: 'row',
                backgroundColor: uiPenColors.bgPage,
                paddingTop: insets.top,
                paddingBottom: insets.bottom,
            }}
        >
            <View
                style={{
                    width: 270,
                    borderRightWidth: 1,
                    borderRightColor: uiPenColors.borderSubtle,
                    backgroundColor: uiPenColors.bgCard,
                    paddingHorizontal: 14,
                    paddingTop: 14,
                    paddingBottom: 12,
                }}
            >
                <View style={{ paddingHorizontal: 4, paddingBottom: 12 }}>
                    <Text
                        style={{
                            color: uiPenColors.accentGreen,
                            fontSize: 24,
                            fontWeight: '700',
                            fontFamily: uiPenFontFamily,
                        }}
                    >
                        aha
                    </Text>
                </View>

                <View
                    style={{
                        borderTopWidth: 1,
                        borderTopColor: uiPenColors.borderSubtle,
                        paddingTop: 12,
                    }}
                >
                    <Text
                        style={{
                            color: uiPenColors.textTertiary,
                            fontSize: 11,
                            letterSpacing: 0.8,
                            fontWeight: '600',
                            fontFamily: uiPenFontFamily,
                        }}
                    >
                        TEAMS
                    </Text>

                    <ScrollView style={{ maxHeight: 220, marginTop: 8 }}>
                        {teams.length === 0 ? (
                            <Text
                                style={{
                                    color: uiPenColors.textSecondary,
                                    fontSize: 12,
                                    fontFamily: uiPenFontFamily,
                                    lineHeight: 18,
                                    paddingVertical: 6,
                                }}
                            >
                                No teams yet.
                            </Text>
                        ) : (
                            teams.map((team) => {
                                const selected = team.id === selectedTeamId;
                                return (
                                    <Pressable
                                        key={team.id}
                                        style={{
                                            marginBottom: 6,
                                            borderRadius: uiPenRadius.md,
                                            backgroundColor: selected ? 'rgba(61,138,90,0.12)' : uiPenColors.bgCard,
                                            paddingHorizontal: 10,
                                            paddingVertical: 9,
                                            borderLeftWidth: selected ? 3 : 0,
                                            borderLeftColor: uiPenColors.accentGreen,
                                        }}
                                        onPress={() => {
                                            router.replace(withTeamWorkspaceQuery(TEAM_WORKSPACE_TAB_META[activeTab].href, team.id) as any);
                                        }}
                                    >
                                        <Text
                                            numberOfLines={1}
                                            style={{
                                                color: selected ? uiPenColors.accentGreen : uiPenColors.textPrimary,
                                                fontSize: 13,
                                                fontWeight: selected ? '600' : '500',
                                                fontFamily: uiPenFontFamily,
                                            }}
                                        >
                                            {team.title}
                                        </Text>
                                        <Text
                                            style={{
                                                marginTop: 2,
                                                color: uiPenColors.textSecondary,
                                                fontSize: 11,
                                                fontFamily: uiPenFontFamily,
                                            }}
                                        >
                                            {team.memberCount} members · {team.activeTaskCount} active
                                        </Text>
                                    </Pressable>
                                );
                            })
                        )}
                    </ScrollView>

                    <Pressable
                        style={{
                            marginTop: 8,
                            minHeight: 36,
                            borderRadius: uiPenRadius.md,
                            borderWidth: 1,
                            borderColor: uiPenColors.borderSubtle,
                            alignItems: 'center',
                            justifyContent: 'center',
                            backgroundColor: uiPenColors.bgCard,
                        }}
                        onPress={() => {
                            router.push(getTeamCreationRoute('entry'));
                        }}
                    >
                        <Text
                            style={{
                                color: uiPenColors.textPrimary,
                                fontSize: 13,
                                fontWeight: '600',
                                fontFamily: uiPenFontFamily,
                            }}
                        >
                            + New Team
                        </Text>
                    </Pressable>

                    <Pressable
                        style={{
                            marginTop: 6,
                            minHeight: 36,
                            borderRadius: uiPenRadius.md,
                            borderWidth: 1,
                            borderColor: uiPenColors.borderSubtle,
                            alignItems: 'center',
                            justifyContent: 'center',
                            backgroundColor: uiPenColors.bgCard,
                        }}
                        onPress={() => {
                            router.push(TEAM_WORKSPACE_ACTION_HREFS.manageTeams);
                        }}
                    >
                        <Text
                            style={{
                                color: uiPenColors.textSecondary,
                                fontSize: 12,
                                fontWeight: '600',
                                fontFamily: uiPenFontFamily,
                            }}
                        >
                            Manage Teams (CRUD)
                        </Text>
                    </Pressable>
                </View>

                <View
                    style={{
                        borderTopWidth: 1,
                        borderTopColor: uiPenColors.borderSubtle,
                        marginTop: 14,
                        paddingTop: 12,
                    }}
                >
                    <Text
                        style={{
                            color: uiPenColors.textTertiary,
                            fontSize: 11,
                            letterSpacing: 0.8,
                            fontWeight: '600',
                            fontFamily: uiPenFontFamily,
                        }}
                    >
                        QUICK NAV
                    </Text>
                    {(Object.keys(TEAM_WORKSPACE_TAB_META) as TeamWorkspaceTab[]).map((tab) => {
                        const tabConfig = TEAM_WORKSPACE_TAB_META[tab];
                        const active = tab === activeTab;
                        return (
                            <Pressable
                                key={tab}
                                onPress={() => {
                                    router.replace(withTeamWorkspaceQuery(tabConfig.href, selectedTeamId) as any);
                                }}
                                style={{
                                    marginTop: 6,
                                    borderRadius: uiPenRadius.md,
                                    paddingHorizontal: 10,
                                    paddingVertical: 9,
                                    backgroundColor: active ? 'rgba(61,138,90,0.12)' : uiPenColors.bgCard,
                                    flexDirection: 'row',
                                    alignItems: 'center',
                                    gap: 8,
                                }}
                            >
                                <Ionicons
                                    name={tabConfig.icon}
                                    size={16}
                                    color={active ? uiPenColors.accentGreen : uiPenColors.textSecondary}
                                />
                                <Text
                                    style={{
                                        color: active ? uiPenColors.accentGreen : uiPenColors.textSecondary,
                                        fontSize: 13,
                                        fontWeight: active ? '600' : '500',
                                        fontFamily: uiPenFontFamily,
                                    }}
                                >
                                    {tabConfig.label}
                                </Text>
                            </Pressable>
                        );
                    })}
                </View>

                <View style={{ flex: 1 }} />

                <View
                    style={{
                        borderTopWidth: 1,
                        borderTopColor: uiPenColors.borderSubtle,
                        paddingTop: 10,
                    }}
                >
                    <Pressable
                        style={{
                            minHeight: 36,
                            borderRadius: uiPenRadius.md,
                            borderWidth: 1,
                            borderColor: uiPenColors.borderSubtle,
                            alignItems: 'center',
                            justifyContent: 'center',
                            backgroundColor: 'rgba(61,138,90,0.1)',
                        }}
                        onPress={() => {
                            router.push(TEAM_WORKSPACE_ACTION_HREFS.newEmptySession);
                        }}
                    >
                        <Text
                            style={{
                                color: uiPenColors.accentGreen,
                                fontSize: 12,
                                fontWeight: '700',
                                fontFamily: uiPenFontFamily,
                            }}
                        >
                            New Empty Session
                        </Text>
                    </Pressable>
                    <Pressable
                        style={{
                            marginTop: 6,
                            minHeight: 36,
                            borderRadius: uiPenRadius.md,
                            borderWidth: 1,
                            borderColor: uiPenColors.borderSubtle,
                            alignItems: 'center',
                            justifyContent: 'center',
                        }}
                        onPress={() => {
                            router.push(TEAM_WORKSPACE_ACTION_HREFS.onboarding);
                        }}
                    >
                        <Text
                            style={{
                                color: uiPenColors.textSecondary,
                                fontSize: 12,
                                fontFamily: uiPenFontFamily,
                            }}
                        >
                            Onboarding & Access
                        </Text>
                    </Pressable>
                </View>
            </View>

            <View style={{ flex: 1 }}>
                <View
                    style={{
                        minHeight: 60,
                        borderBottomWidth: 1,
                        borderBottomColor: uiPenColors.borderSubtle,
                        backgroundColor: uiPenColors.bgCard,
                        paddingHorizontal: 16,
                        flexDirection: 'row',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                    }}
                >
                    <Text
                        style={{
                            color: uiPenColors.textPrimary,
                            fontSize: 16,
                            fontWeight: '700',
                            fontFamily: uiPenFontFamily,
                        }}
                    >
                        {title}
                    </Text>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>{headerActions}</View>
                </View>

                <View style={{ flex: 1, flexDirection: 'row' }}>
                    <View style={{ flex: 1 }}>{children}</View>
                    {rightPanel ? (
                        <View
                            style={{
                                width: 300,
                                borderLeftWidth: 1,
                                borderLeftColor: uiPenColors.borderSubtle,
                                backgroundColor: uiPenColors.bgCard,
                            }}
                        >
                            {rightPanel}
                        </View>
                    ) : null}
                </View>
            </View>
        </View>
    );
}
