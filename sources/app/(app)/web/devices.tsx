import * as React from 'react';
import { ActivityIndicator, Platform, Pressable, ScrollView, Text, View } from 'react-native';
import { router, type Href, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { sync } from '@/sync/sync';
import { useAllMachines, useAllSessions, useIsDataReady, useSocketStatus } from '@/sync/storage';
import type { Machine, Session } from '@/sync/storageTypes';
import { isMachineOnline } from '@/utils/machineUtils';
import { uiPenColors, uiPenFontFamily, uiPenRadius } from '@/components/web/uiPenTokens';

const ACCENT_GREEN = '#3D8A5A';

interface SidebarMenuItem {
    icon: keyof typeof Ionicons.glyphMap;
    label: string;
    route: Href;
    active?: boolean;
}

function formatRelativeTime(timestamp?: number | null): string {
    if (!timestamp) {
        return 'Waiting for first heartbeat';
    }

    const diffMs = Date.now() - timestamp;
    if (diffMs < 60_000) {
        return 'just now';
    }

    const diffMinutes = Math.floor(diffMs / 60_000);
    if (diffMinutes < 60) {
        return `${diffMinutes}m ago`;
    }

    const diffHours = Math.floor(diffMinutes / 60);
    if (diffHours < 24) {
        return `${diffHours}h ago`;
    }

    return `${Math.floor(diffHours / 24)}d ago`;
}

function formatPlatform(platform?: string | null): string {
    switch (platform) {
        case 'darwin':
            return 'macOS';
        case 'win32':
            return 'Windows';
        case 'linux':
            return 'Linux';
        default:
            return platform || 'Unknown platform';
    }
}

function getMachineName(machine: Machine): string {
    return machine.metadata?.displayName || machine.metadata?.host || machine.id;
}

function countOnlineSessions(machineId: string, sessions: Session[]): number {
    return sessions.filter((session) => session.metadata?.machineId === machineId && session.presence === 'online').length;
}

function Sidebar() {
    const menuItems: SidebarMenuItem[] = [
        { icon: 'home', label: 'Home', route: '/web/home' },
        { icon: 'chatbubbles', label: 'Chat', route: '/web/team-chat' },
        { icon: 'grid', label: 'Board', route: '/web/board' },
        { icon: 'desktop', label: 'Devices', route: '/web/devices', active: true },
        { icon: 'people', label: 'Teams', route: '/web/team-info' },
        { icon: 'settings', label: 'Settings', route: '/web/settings' },
    ];

    return (
        <View
            style={{
                width: 260,
                height: '100%',
                backgroundColor: '#FFFFFF',
                borderRightWidth: 1,
                borderRightColor: '#E8E7E4',
                paddingVertical: 24,
            }}
        >
            <View style={{ paddingHorizontal: 24, marginBottom: 32 }}>
                <Text style={{ fontSize: 24, fontWeight: '700', color: ACCENT_GREEN, fontFamily: 'Outfit' }}>
                    Happy
                </Text>
            </View>

            {menuItems.map((item) => (
                <Pressable
                    key={item.label}
                    onPress={() => router.push(item.route)}
                    style={{
                        flexDirection: 'row',
                        alignItems: 'center',
                        paddingHorizontal: 24,
                        paddingVertical: 12,
                        marginHorizontal: 12,
                        borderRadius: 8,
                        backgroundColor: item.active ? `${ACCENT_GREEN}15` : 'transparent',
                    }}
                >
                    <Ionicons name={item.icon} size={20} color={item.active ? ACCENT_GREEN : '#6B7280'} />
                    <Text
                        style={{
                            marginLeft: 12,
                            fontSize: 14,
                            fontWeight: item.active ? '600' : '400',
                            color: item.active ? ACCENT_GREEN : '#374151',
                            fontFamily: 'Outfit',
                        }}
                    >
                        {item.label}
                    </Text>
                </Pressable>
            ))}
        </View>
    );
}

function SummaryCard({
    label,
    value,
    tone,
}: {
    label: string;
    value: string;
    tone: string;
}) {
    return (
        <View
            style={{
                minWidth: 180,
                flex: 1,
                borderRadius: uiPenRadius.xl,
                borderWidth: 1,
                borderColor: uiPenColors.borderSubtle,
                backgroundColor: '#FFFFFF',
                padding: 18,
                gap: 8,
            }}
        >
            <Text style={{ color: uiPenColors.textSecondary, fontSize: 12, fontFamily: uiPenFontFamily }}>
                {label}
            </Text>
            <Text style={{ color: tone, fontSize: 28, fontWeight: '700', fontFamily: uiPenFontFamily }}>
                {value}
            </Text>
        </View>
    );
}

function MachineCard({ machine, activeSessionCount }: { machine: Machine; activeSessionCount: number }) {
    const online = isMachineOnline(machine);
    const daemonStatus = machine.daemonState?.status || (online ? 'running' : 'idle');
    const daemonPid = machine.daemonState?.pid ?? machine.daemonState?.daemonPid ?? null;
    const daemonPort = machine.daemonState?.httpPort ?? machine.daemonState?.daemonHttpPort ?? null;

    return (
        <Pressable
            onPress={() =>
                router.push({
                    pathname: '/machine/[id]',
                    params: { id: machine.id },
                })
            }
            style={{
                borderRadius: uiPenRadius.xl,
                borderWidth: 1,
                borderColor: uiPenColors.borderSubtle,
                backgroundColor: '#FFFFFF',
                padding: 18,
                gap: 14,
            }}
        >
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1 }}>
                    <View
                        style={{
                            width: 48,
                            height: 48,
                            borderRadius: 14,
                            backgroundColor: online ? 'rgba(61,138,90,0.12)' : '#F3F4F6',
                            alignItems: 'center',
                            justifyContent: 'center',
                        }}
                    >
                        <Ionicons name="desktop" size={24} color={online ? ACCENT_GREEN : '#9CA3AF'} />
                    </View>
                    <View style={{ flex: 1, gap: 4 }}>
                        <Text style={{ color: uiPenColors.textPrimary, fontSize: 17, fontWeight: '700', fontFamily: uiPenFontFamily }}>
                            {getMachineName(machine)}
                        </Text>
                        <Text style={{ color: uiPenColors.textSecondary, fontSize: 13, fontFamily: uiPenFontFamily }}>
                            {formatPlatform(machine.metadata?.platform)} · aha {machine.metadata?.ahaCliVersion || 'unknown'}
                        </Text>
                    </View>
                </View>

                <View
                    style={{
                        borderRadius: 999,
                        paddingHorizontal: 10,
                        paddingVertical: 6,
                        backgroundColor: online ? 'rgba(61,138,90,0.12)' : '#F3F4F6',
                    }}
                >
                    <Text
                        style={{
                            color: online ? ACCENT_GREEN : '#6B7280',
                            fontSize: 12,
                            fontWeight: '700',
                            fontFamily: uiPenFontFamily,
                        }}
                    >
                        {online ? 'ONLINE' : 'OFFLINE'}
                    </Text>
                </View>
            </View>

            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
                <View style={{ borderRadius: 999, backgroundColor: uiPenColors.bgPage, paddingHorizontal: 10, paddingVertical: 6 }}>
                    <Text style={{ color: uiPenColors.textSecondary, fontSize: 12, fontFamily: uiPenFontFamily }}>
                        {activeSessionCount} active session{activeSessionCount === 1 ? '' : 's'}
                    </Text>
                </View>
                <View style={{ borderRadius: 999, backgroundColor: uiPenColors.bgPage, paddingHorizontal: 10, paddingVertical: 6 }}>
                    <Text style={{ color: uiPenColors.textSecondary, fontSize: 12, fontFamily: uiPenFontFamily }}>
                        daemon {daemonStatus}
                    </Text>
                </View>
                {daemonPid ? (
                    <View style={{ borderRadius: 999, backgroundColor: uiPenColors.bgPage, paddingHorizontal: 10, paddingVertical: 6 }}>
                        <Text style={{ color: uiPenColors.textSecondary, fontSize: 12, fontFamily: uiPenFontFamily }}>
                            pid {daemonPid}
                        </Text>
                    </View>
                ) : null}
                {daemonPort ? (
                    <View style={{ borderRadius: 999, backgroundColor: uiPenColors.bgPage, paddingHorizontal: 10, paddingVertical: 6 }}>
                        <Text style={{ color: uiPenColors.textSecondary, fontSize: 12, fontFamily: uiPenFontFamily }}>
                            port {daemonPort}
                        </Text>
                    </View>
                ) : null}
            </View>

            <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
                <Text style={{ color: uiPenColors.textSecondary, fontSize: 13, fontFamily: uiPenFontFamily }}>
                    Last heartbeat {formatRelativeTime(machine.activeAt)}
                </Text>
                <Text style={{ color: uiPenColors.accentGreen, fontSize: 13, fontWeight: '600', fontFamily: uiPenFontFamily }}>
                    Open Machine →
                </Text>
            </View>
        </Pressable>
    );
}

export default function WebDevicesScreen() {
    const params = useLocalSearchParams<{ teamId?: string | string[] }>();
    const isDataReady = useIsDataReady();
    const socketStatus = useSocketStatus();
    const machines = useAllMachines();
    const sessions = useAllSessions();
    const [isRefreshing, setIsRefreshing] = React.useState(false);
    const teamId = Array.isArray(params.teamId) ? params.teamId[0] : params.teamId;

    React.useEffect(() => {
        setIsRefreshing(true);
        Promise.allSettled([sync.refreshMachines(), sync.refreshSessions()]).finally(() => {
            setIsRefreshing(false);
        });
    }, []);

    const machineCards = React.useMemo(() => {
        return [...machines]
            .map((machine) => ({
                machine,
                activeSessionCount: countOnlineSessions(machine.id, sessions),
                online: isMachineOnline(machine),
            }))
            .sort((left, right) => {
                if (left.online !== right.online) {
                    return left.online ? -1 : 1;
                }
                return right.machine.activeAt - left.machine.activeAt;
            });
    }, [machines, sessions]);

    const onlineMachines = machineCards.filter((item) => item.online).length;
    const activeSessions = machineCards.reduce((sum, item) => sum + item.activeSessionCount, 0);

    const handleRefresh = React.useCallback(() => {
        setIsRefreshing(true);
        Promise.allSettled([sync.refreshMachines(), sync.refreshSessions()]).finally(() => {
            setIsRefreshing(false);
        });
    }, []);

    const openBoard = React.useCallback(() => {
        if (teamId) {
            router.push(`/web/board?teamId=${encodeURIComponent(teamId)}` as Href);
            return;
        }
        router.push('/web/board');
    }, [teamId]);

    if (Platform.OS !== 'web') {
        return (
            <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
                <Text>Devices view is only available on web.</Text>
            </View>
        );
    }

    return (
        <View style={{ flex: 1, backgroundColor: '#F9FAFB', flexDirection: 'row' }}>
            <Sidebar />

            <View style={{ flex: 1 }}>
                <ScrollView contentContainerStyle={{ padding: 24, gap: 18 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap' }}>
                        <View style={{ gap: 8 }}>
                            <Text style={{ color: uiPenColors.textPrimary, fontSize: 32, fontWeight: '700', fontFamily: uiPenFontFamily }}>
                                Connected Devices
                            </Text>
                            <Text style={{ color: uiPenColors.textSecondary, fontSize: 14, lineHeight: 22, fontFamily: uiPenFontFamily, maxWidth: 760 }}>
                                Confirm host machines are online, inspect daemon heartbeat, and guide secondary devices through restore/sign-in plus device code pairing.
                            </Text>
                        </View>

                        <View style={{ flexDirection: 'row', gap: 10, flexWrap: 'wrap' }}>
                            <Pressable
                                onPress={handleRefresh}
                                style={{
                                    minHeight: 44,
                                    borderRadius: 12,
                                    borderWidth: 1,
                                    borderColor: uiPenColors.borderSubtle,
                                    backgroundColor: '#FFFFFF',
                                    paddingHorizontal: 14,
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    flexDirection: 'row',
                                    gap: 8,
                                }}
                            >
                                {isRefreshing ? <ActivityIndicator color={ACCENT_GREEN} /> : <Ionicons name="refresh" size={16} color={uiPenColors.textPrimary} />}
                                <Text style={{ color: uiPenColors.textPrimary, fontSize: 14, fontWeight: '600', fontFamily: uiPenFontFamily }}>
                                    Refresh
                                </Text>
                            </Pressable>

                            <Pressable
                                onPress={() => router.push('/restore/device-code')}
                                style={{
                                    minHeight: 44,
                                    borderRadius: 12,
                                    borderWidth: 1,
                                    borderColor: uiPenColors.borderSubtle,
                                    backgroundColor: '#FFFFFF',
                                    paddingHorizontal: 14,
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                }}
                            >
                                <Text style={{ color: uiPenColors.textPrimary, fontSize: 14, fontWeight: '600', fontFamily: uiPenFontFamily }}>
                                    Pair Device
                                </Text>
                            </Pressable>

                            <Pressable
                                onPress={openBoard}
                                style={{
                                    minHeight: 44,
                                    borderRadius: 12,
                                    backgroundColor: ACCENT_GREEN,
                                    paddingHorizontal: 16,
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                }}
                            >
                                <Text style={{ color: '#FFFFFF', fontSize: 14, fontWeight: '700', fontFamily: uiPenFontFamily }}>
                                    Open Board
                                </Text>
                            </Pressable>
                        </View>
                    </View>

                    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 14 }}>
                        <SummaryCard label="Machines" value={String(machineCards.length)} tone={uiPenColors.textPrimary} />
                        <SummaryCard label="Online Now" value={String(onlineMachines)} tone={ACCENT_GREEN} />
                        <SummaryCard label="Active Sessions" value={String(activeSessions)} tone={'#2563EB'} />
                        <SummaryCard label="Socket" value={socketStatus.status} tone={socketStatus.status === 'connected' ? ACCENT_GREEN : '#D97706'} />
                    </View>

                    <View
                        style={{
                            borderRadius: uiPenRadius.xl,
                            borderWidth: 1,
                            borderColor: uiPenColors.borderSubtle,
                            backgroundColor: '#FFFFFF',
                            padding: 18,
                            gap: 10,
                        }}
                    >
                        <Text style={{ color: uiPenColors.textPrimary, fontSize: 18, fontWeight: '700', fontFamily: uiPenFontFamily }}>
                            Pairing Flow Check
                        </Text>
                        <Text style={{ color: uiPenColors.textSecondary, fontSize: 14, lineHeight: 22, fontFamily: uiPenFontFamily }}>
                            1. On host, run `aha` and complete quick verify from the generated link. 2. On another device, restore access or sign in. 3. Enter the 6-digit device code from the host terminal. 4. Once daemon heartbeats arrive, the host stays visible here even without an active `--yolo` session.
                        </Text>
                        <Text style={{ color: uiPenColors.textSecondary, fontSize: 13, fontFamily: uiPenFontFamily }}>
                            Last socket connect: {formatRelativeTime(socketStatus.lastConnectedAt)}
                        </Text>
                    </View>

                    {!isDataReady && machineCards.length === 0 ? (
                        <View
                            style={{
                                borderRadius: uiPenRadius.xl,
                                borderWidth: 1,
                                borderColor: uiPenColors.borderSubtle,
                                backgroundColor: '#FFFFFF',
                                padding: 32,
                                alignItems: 'center',
                                justifyContent: 'center',
                                gap: 14,
                            }}
                        >
                            <ActivityIndicator color={ACCENT_GREEN} />
                            <Text style={{ color: uiPenColors.textSecondary, fontSize: 14, fontFamily: uiPenFontFamily }}>
                                Loading machine presence…
                            </Text>
                        </View>
                    ) : machineCards.length === 0 ? (
                        <View
                            style={{
                                borderRadius: uiPenRadius.xl,
                                borderWidth: 1,
                                borderColor: uiPenColors.borderSubtle,
                                backgroundColor: '#FFFFFF',
                                padding: 28,
                                gap: 12,
                            }}
                        >
                            <Text style={{ color: uiPenColors.textPrimary, fontSize: 22, fontWeight: '700', fontFamily: uiPenFontFamily }}>
                                No machines connected yet
                            </Text>
                            <Text style={{ color: uiPenColors.textSecondary, fontSize: 14, lineHeight: 22, fontFamily: uiPenFontFamily, maxWidth: 720 }}>
                                From a user perspective this is the first-run blocker: open `aha` on the host machine, finish quick verify, and wait for the daemon heartbeat. After that, this page should immediately show the host as online.
                            </Text>
                            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginTop: 4 }}>
                                <Pressable
                                    onPress={() => router.push('/web/login')}
                                    style={{
                                        minHeight: 44,
                                        borderRadius: 12,
                                        backgroundColor: ACCENT_GREEN,
                                        paddingHorizontal: 16,
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                    }}
                                >
                                    <Text style={{ color: '#FFFFFF', fontSize: 14, fontWeight: '700', fontFamily: uiPenFontFamily }}>
                                        Host Quick Verify
                                    </Text>
                                </Pressable>
                                <Pressable
                                    onPress={() => router.push('/restore/device-code')}
                                    style={{
                                        minHeight: 44,
                                        borderRadius: 12,
                                        borderWidth: 1,
                                        borderColor: uiPenColors.borderSubtle,
                                        backgroundColor: '#FFFFFF',
                                        paddingHorizontal: 16,
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                    }}
                                >
                                    <Text style={{ color: uiPenColors.textPrimary, fontSize: 14, fontWeight: '600', fontFamily: uiPenFontFamily }}>
                                        Enter Device Code
                                    </Text>
                                </Pressable>
                            </View>
                        </View>
                    ) : (
                        <View style={{ gap: 12 }}>
                            {machineCards.map(({ machine, activeSessionCount }) => (
                                <MachineCard key={machine.id} machine={machine} activeSessionCount={activeSessionCount} />
                            ))}
                        </View>
                    )}
                </ScrollView>
            </View>
        </View>
    );
}
