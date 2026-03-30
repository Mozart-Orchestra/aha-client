import * as React from 'react';
import { ScrollView, View, Pressable, Linking, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { StyleSheet, mq } from 'react-native-unistyles';
import { Text } from '@/components/ui/StyledText';

// Landing page — marketing content (non-i18n by design, fixed marketing copy)

const FEATURES = [
    {
        icon: 'grid-outline' as const,
        color: '#007AFF',
        title: 'Kanban 看板',
        desc: '可视化任务管理，拖拽式状态流转，一目了然掌握团队进度',
    },
    {
        icon: 'chatbubbles-outline' as const,
        color: '#34C759',
        title: '实时团队聊天',
        desc: 'Agent 与人类无缝协作，消息、任务、决策一站式沟通',
    },
    {
        icon: 'hardware-chip-outline' as const,
        color: '#FF9500',
        title: 'Agent 智能调度',
        desc: '多 Agent 并行执行，角色专业分工，自动任务分配',
    },
    {
        icon: 'lock-closed-outline' as const,
        color: '#AF52DE',
        title: '端到端加密',
        desc: 'tweetnacl 加密保护所有通信，你的数据只属于你',
    },
    {
        icon: 'flash-outline' as const,
        color: '#FF3B30',
        title: '实时状态同步',
        desc: 'WebSocket 毫秒级同步，Token 用量、Git 状态透明可见',
    },
    {
        icon: 'phone-portrait-outline' as const,
        color: '#5856D6',
        title: '全平台覆盖',
        desc: 'iOS · Android · Web 三端一致体验，随时随地指挥 AI 团队',
    },
] as const;

const WORKFLOW_STEPS = [
    { number: '01', title: '定义目标', desc: '在看板创建任务，描述需求和验收标准' },
    { number: '02', title: '分配角色', desc: '从 Genome 市场选择专业 Agent，一键组建团队' },
    { number: '03', title: '并行执行', desc: 'Agent 自动认领任务，并行工作，实时上报进度' },
    { number: '04', title: '审查交付', desc: '看板总览成果，团队聊天复盘，一键部署上线' },
] as const;

const STATS = [
    { value: '10×', label: '团队效率提升' },
    { value: '∞', label: '可扩展 Agent 角色' },
    { value: '<1ms', label: '实时状态延迟' },
] as const;

function FeatureCard({ feature }: { feature: typeof FEATURES[number] }) {
    return (
        <View style={styles.featureCard}>
            <View style={[styles.featureIconWrap, { backgroundColor: feature.color + '14' }]}>
                <Ionicons name={feature.icon} size={22} color={feature.color} />
            </View>
            <Text style={styles.featureTitle}>{feature.title}</Text>
            <Text style={styles.featureDesc}>{feature.desc}</Text>
        </View>
    );
}

function WorkflowStep({ step, isLast }: { step: typeof WORKFLOW_STEPS[number]; isLast: boolean }) {
    return (
        <View style={styles.workflowStep}>
            <View style={styles.workflowNumberWrap}>
                <Text style={styles.workflowNumber}>{step.number}</Text>
                {!isLast ? <View style={styles.workflowLine} /> : null}
            </View>
            <View style={styles.workflowContent}>
                <Text style={styles.workflowTitle}>{step.title}</Text>
                <Text style={styles.workflowDesc}>{step.desc}</Text>
            </View>
        </View>
    );
}

export default React.memo(function LandingPage() {
    const router = useRouter();

    const handleGetStarted = React.useCallback(() => {
        router.push('/agents/new' as never);
    }, [router]);

    const handleLearnMore = React.useCallback(() => {
        router.push('/teams' as never);
    }, [router]);

    const handleGithub = React.useCallback(() => {
        Linking.openURL('https://github.com/Shiyao-Huang/aha');
    }, []);

    return (
        <ScrollView style={styles.scroll} contentContainerStyle={styles.content}>
            {/* Hero */}
            <LinearGradient
                colors={['#0D1117', '#161B22', '#0D1117']}
                style={styles.hero}
            >
                <View style={styles.heroBadge}>
                    <View style={styles.heroBadgeDot} />
                    <Text style={styles.heroBadgeText}>Powered by Claude Code · Aha</Text>
                </View>
                <Text style={styles.heroTitle}>让 AI 团队{'\n'}高效协同{Platform.OS === 'web' ? '' : '\n'}触手可及</Text>
                <Text style={styles.heroSubtitle}>
                    多 Agent 并行工作 · 实时看板管理 · 端到端加密{'\n'}
                    像管理真实团队一样，驾驭你的 AI 协作网络
                </Text>
                <View style={styles.heroActions}>
                    <Pressable style={styles.heroCTAPrimary} onPress={handleGetStarted}>
                        <Ionicons name="add-circle-outline" size={16} color="#FFFFFF" />
                        <Text style={styles.heroCTAPrimaryText}>创建第一个 Agent</Text>
                    </Pressable>
                    <Pressable style={styles.heroCTASecondary} onPress={handleLearnMore}>
                        <Text style={styles.heroCTASecondaryText}>浏览团队看板</Text>
                        <Ionicons name="arrow-forward" size={14} color="#8B9199" />
                    </Pressable>
                </View>
                <View style={styles.heroInstall}>
                    <Text style={styles.heroInstallLabel}>快速开始</Text>
                    <View style={styles.heroInstallBox}>
                        <Ionicons name="terminal-outline" size={13} color="#58A6FF" />
                        <Text style={styles.heroInstallCode}>npx aha-cli@latest init</Text>
                    </View>
                </View>
            </LinearGradient>

            {/* Stats */}
            <View style={styles.statsSection}>
                {STATS.map((stat) => (
                    <View key={stat.label} style={styles.statItem}>
                        <Text style={styles.statValue}>{stat.value}</Text>
                        <Text style={styles.statLabel}>{stat.label}</Text>
                    </View>
                ))}
            </View>

            {/* Features */}
            <View style={styles.section}>
                <Text style={styles.sectionEyebrow}>核心功能</Text>
                <Text style={styles.sectionTitle}>为 AI 团队而生的协作平台</Text>
                <Text style={styles.sectionSubtitle}>
                    从任务分配到代码交付，一套工具覆盖 AI 团队协作全流程
                </Text>
                <View style={styles.featuresGrid}>
                    {FEATURES.map((feature) => (
                        <FeatureCard key={feature.title} feature={feature} />
                    ))}
                </View>
            </View>

            {/* Workflow */}
            <View style={styles.workflowSection}>
                <Text style={styles.sectionEyebrow}>工作流程</Text>
                <Text style={styles.sectionTitle}>四步启动 AI 协作团队</Text>
                <View style={styles.workflowList}>
                    {WORKFLOW_STEPS.map((step, index) => (
                        <WorkflowStep
                            key={step.number}
                            step={step}
                            isLast={index === WORKFLOW_STEPS.length - 1}
                        />
                    ))}
                </View>
            </View>

            {/* Bottom CTA */}
            <LinearGradient
                colors={['#007AFF', '#5856D6', '#AF52DE']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.ctaSection}
            >
                <Text style={styles.ctaTitle}>立即开启 AI 团队协作</Text>
                <Text style={styles.ctaSubtitle}>
                    免费使用 · 无需信用卡 · 5 分钟上手
                </Text>
                <View style={styles.ctaActions}>
                    <Pressable style={styles.ctaButton} onPress={handleGetStarted}>
                        <Text style={styles.ctaButtonText}>开始使用</Text>
                    </Pressable>
                    <Pressable style={styles.ctaButtonOutline} onPress={handleGithub}>
                        <Ionicons name="logo-github" size={16} color="#FFFFFF" />
                        <Text style={styles.ctaButtonOutlineText}>GitHub</Text>
                    </Pressable>
                </View>
            </LinearGradient>

            {/* Footer */}
            <View style={styles.footer}>
                <Text style={styles.footerText}>© 2025 happyhere · Built with Claude Code & Aha</Text>
                <View style={styles.footerLinks}>
                    <Pressable onPress={handleGithub}>
                        <Text style={styles.footerLink}>GitHub</Text>
                    </Pressable>
                    <Text style={styles.footerDot}>·</Text>
                    <Pressable onPress={() => Linking.openURL('https://github.com/Shiyao-Huang/aha/issues/new/choose')}>
                        <Text style={styles.footerLink}>Feedback</Text>
                    </Pressable>
                    <Text style={styles.footerDot}>·</Text>
                    <Pressable onPress={() => router.push('/changelog' as never)}>
                        <Text style={styles.footerLink}>Changelog</Text>
                    </Pressable>
                </View>
            </View>
        </ScrollView>
    );
});

const styles = StyleSheet.create((theme) => ({
    scroll: {
        flex: 1,
        backgroundColor: '#0D1117',
    },
    content: {
        flexGrow: 1,
    },

    // Hero
    hero: {
        paddingHorizontal: {
            [mq.only.width(0, 900)]: 24,
            [mq.only.width(900)]: 80,
        },
        paddingTop: 80,
        paddingBottom: 60,
        alignItems: 'center',
    },
    heroBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        backgroundColor: '#161B22',
        borderWidth: 1,
        borderColor: '#30363D',
        borderRadius: 999,
        paddingHorizontal: 14,
        paddingVertical: 6,
        marginBottom: 32,
    },
    heroBadgeDot: {
        width: 6,
        height: 6,
        borderRadius: 3,
        backgroundColor: '#34C759',
    },
    heroBadgeText: {
        fontSize: 12,
        color: '#8B9199',
        fontWeight: '500',
    },
    heroTitle: {
        fontSize: {
            [mq.only.width(0, 900)]: 36,
            [mq.only.width(900)]: 56,
        },
        fontWeight: '700',
        color: '#F0F6FC',
        textAlign: 'center',
        lineHeight: {
            [mq.only.width(0, 900)]: 44,
            [mq.only.width(900)]: 68,
        },
        letterSpacing: -0.5,
        marginBottom: 20,
    },
    heroSubtitle: {
        fontSize: 16,
        color: '#8B9199',
        textAlign: 'center',
        lineHeight: 26,
        marginBottom: 36,
        maxWidth: 520,
    },
    heroActions: {
        flexDirection: 'row',
        gap: 12,
        flexWrap: 'wrap',
        justifyContent: 'center',
        marginBottom: 40,
    },
    heroCTAPrimary: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        backgroundColor: '#007AFF',
        paddingHorizontal: 24,
        paddingVertical: 14,
        borderRadius: 12,
    },
    heroCTAPrimaryText: {
        fontSize: 15,
        fontWeight: '600',
        color: '#FFFFFF',
    },
    heroCTASecondary: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        backgroundColor: '#161B22',
        borderWidth: 1,
        borderColor: '#30363D',
        paddingHorizontal: 24,
        paddingVertical: 14,
        borderRadius: 12,
    },
    heroCTASecondaryText: {
        fontSize: 15,
        fontWeight: '500',
        color: '#8B9199',
    },
    heroInstall: {
        alignItems: 'center',
        gap: 10,
    },
    heroInstallLabel: {
        fontSize: 11,
        color: '#484F58',
        fontWeight: '500',
        letterSpacing: 0.5,
        textTransform: 'uppercase' as const,
    },
    heroInstallBox: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        backgroundColor: '#161B22',
        borderWidth: 1,
        borderColor: '#30363D',
        borderRadius: 8,
        paddingHorizontal: 16,
        paddingVertical: 10,
    },
    heroInstallCode: {
        fontSize: 13,
        color: '#F0F6FC',
        fontFamily: Platform.select({ ios: 'Courier', android: 'monospace', default: 'monospace' }),
    },

    // Stats
    statsSection: {
        flexDirection: 'row',
        backgroundColor: '#161B22',
        borderTopWidth: 1,
        borderBottomWidth: 1,
        borderColor: '#21262D',
        paddingVertical: 32,
        justifyContent: 'space-around',
        flexWrap: 'wrap',
        gap: 24,
        paddingHorizontal: 24,
    },
    statItem: {
        alignItems: 'center',
        gap: 4,
        minWidth: 100,
    },
    statValue: {
        fontSize: {
            [mq.only.width(0, 900)]: 32,
            [mq.only.width(900)]: 40,
        },
        fontWeight: '700',
        color: '#007AFF',
    },
    statLabel: {
        fontSize: 13,
        color: '#8B9199',
        textAlign: 'center',
    },

    // Section shared
    section: {
        paddingHorizontal: {
            [mq.only.width(0, 900)]: 24,
            [mq.only.width(900)]: 80,
        },
        paddingVertical: 64,
        backgroundColor: '#0D1117',
        alignItems: 'center',
    },
    sectionEyebrow: {
        fontSize: 12,
        fontWeight: '600',
        color: '#007AFF',
        letterSpacing: 1,
        textTransform: 'uppercase' as const,
        marginBottom: 12,
    },
    sectionTitle: {
        fontSize: {
            [mq.only.width(0, 900)]: 26,
            [mq.only.width(900)]: 36,
        },
        fontWeight: '700',
        color: '#F0F6FC',
        textAlign: 'center',
        marginBottom: 12,
    },
    sectionSubtitle: {
        fontSize: 15,
        color: '#8B9199',
        textAlign: 'center',
        lineHeight: 24,
        maxWidth: 520,
        marginBottom: 40,
    },

    // Features grid
    featuresGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 16,
        justifyContent: 'center',
        width: '100%',
        maxWidth: 960,
    },
    featureCard: {
        width: {
            [mq.only.width(0, 600)]: '100%',
            [mq.only.width(600, 900)]: '46%',
            [mq.only.width(900)]: '30%',
        },
        minWidth: 220,
        backgroundColor: '#161B22',
        borderWidth: 1,
        borderColor: '#21262D',
        borderRadius: 16,
        padding: 20,
        gap: 10,
    },
    featureIconWrap: {
        width: 44,
        height: 44,
        borderRadius: 12,
        alignItems: 'center',
        justifyContent: 'center',
    },
    featureTitle: {
        fontSize: 15,
        fontWeight: '600',
        color: '#F0F6FC',
    },
    featureDesc: {
        fontSize: 13,
        color: '#8B9199',
        lineHeight: 20,
    },

    // Workflow
    workflowSection: {
        paddingHorizontal: {
            [mq.only.width(0, 900)]: 24,
            [mq.only.width(900)]: 80,
        },
        paddingVertical: 64,
        backgroundColor: '#161B22',
        alignItems: 'center',
    },
    workflowList: {
        width: '100%',
        maxWidth: 560,
        gap: 0,
    },
    workflowStep: {
        flexDirection: 'row',
        gap: 20,
    },
    workflowNumberWrap: {
        alignItems: 'center',
        width: 44,
    },
    workflowNumber: {
        width: 44,
        height: 44,
        borderRadius: 22,
        backgroundColor: '#007AFF14',
        borderWidth: 1,
        borderColor: '#007AFF40',
        textAlign: 'center',
        textAlignVertical: 'center',
        lineHeight: 42,
        fontSize: 13,
        fontWeight: '700',
        color: '#007AFF',
        overflow: 'hidden',
    },
    workflowLine: {
        width: 2,
        flex: 1,
        backgroundColor: '#21262D',
        marginVertical: 6,
        minHeight: 24,
    },
    workflowContent: {
        flex: 1,
        paddingBottom: 32,
        gap: 6,
    },
    workflowTitle: {
        fontSize: 16,
        fontWeight: '600',
        color: '#F0F6FC',
    },
    workflowDesc: {
        fontSize: 14,
        color: '#8B9199',
        lineHeight: 22,
    },

    // Bottom CTA
    ctaSection: {
        paddingHorizontal: 24,
        paddingVertical: 64,
        alignItems: 'center',
        gap: 16,
    },
    ctaTitle: {
        fontSize: {
            [mq.only.width(0, 900)]: 28,
            [mq.only.width(900)]: 40,
        },
        fontWeight: '700',
        color: '#FFFFFF',
        textAlign: 'center',
    },
    ctaSubtitle: {
        fontSize: 15,
        color: 'rgba(255,255,255,0.75)',
        textAlign: 'center',
        marginBottom: 8,
    },
    ctaActions: {
        flexDirection: 'row',
        gap: 12,
        flexWrap: 'wrap',
        justifyContent: 'center',
    },
    ctaButton: {
        backgroundColor: '#FFFFFF',
        paddingHorizontal: 28,
        paddingVertical: 14,
        borderRadius: 12,
    },
    ctaButtonText: {
        fontSize: 15,
        fontWeight: '700',
        color: '#007AFF',
    },
    ctaButtonOutline: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        borderWidth: 1.5,
        borderColor: 'rgba(255,255,255,0.5)',
        paddingHorizontal: 24,
        paddingVertical: 14,
        borderRadius: 12,
    },
    ctaButtonOutlineText: {
        fontSize: 15,
        fontWeight: '600',
        color: '#FFFFFF',
    },

    // Footer
    footer: {
        backgroundColor: '#0D1117',
        borderTopWidth: 1,
        borderColor: '#21262D',
        paddingVertical: 32,
        paddingHorizontal: 24,
        alignItems: 'center',
        gap: 12,
    },
    footerText: {
        fontSize: 13,
        color: '#484F58',
        textAlign: 'center',
    },
    footerLinks: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    footerLink: {
        fontSize: 13,
        color: '#8B9199',
    },
    footerDot: {
        fontSize: 13,
        color: '#484F58',
    },
}));
