import * as React from 'react';
import { Platform, Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Modal } from '@/modal';
import { TeamWorkspaceShell } from '@/components/web/TeamWorkspaceShell';
import { uiPenColors, uiPenFontFamily, uiPenRadius } from '@/components/web/uiPenTokens';
import { buildBoardColumns, summarizeTeamArtifacts } from '@/components/web/teamOverview';
import {
    buildBoardRootWithTasks,
    getNextBoardStatus,
    parseBoardTasksFromBody,
    type BoardTask
} from '@/components/web/teamBoard';
import { useArtifact, useArtifacts } from '@/sync/storage';
import { sync } from '@/sync/sync';

export default function WebBoardScreen() {
    const params = useLocalSearchParams<{ teamId?: string | string[] }>();
    const artifacts = useArtifacts();
    const teams = React.useMemo(() => summarizeTeamArtifacts(artifacts), [artifacts]);

    const paramTeamId = Array.isArray(params.teamId) ? params.teamId[0] : params.teamId;
    const selectedTeamId = paramTeamId || teams[0]?.id;
    const selectedTeam = React.useMemo(
        () => teams.find((team) => team.id === selectedTeamId) || null,
        [teams, selectedTeamId]
    );

    const selectedArtifact = useArtifact(selectedTeam?.id || '');
    const [newTaskTitle, setNewTaskTitle] = React.useState('');
    const [newTaskAssignee, setNewTaskAssignee] = React.useState('');
    const [isSaving, setIsSaving] = React.useState(false);

    React.useEffect(() => {
        void sync.fetchArtifactsList().catch(() => undefined);
    }, []);

    React.useEffect(() => {
        if (!selectedTeam?.id) {
            return;
        }
        if (!selectedArtifact?.body) {
            void sync.fetchArtifactWithBody(selectedTeam.id).catch(() => undefined);
        }
    }, [selectedArtifact?.body, selectedTeam?.id]);

    const parsedBoard = React.useMemo(() => parseBoardTasksFromBody(selectedArtifact?.body), [selectedArtifact?.body]);
    const boardColumns = React.useMemo(() => buildBoardColumns(parsedBoard.tasks), [parsedBoard.tasks]);

    const persistTasks = React.useCallback(async (nextTasks: BoardTask[]) => {
        if (!selectedArtifact || !selectedTeam) {
            return;
        }

        const nextRoot = buildBoardRootWithTasks(parsedBoard.root, nextTasks, selectedTeam.title);

        await sync.updateArtifact(
            selectedArtifact.id,
            selectedArtifact.title,
            JSON.stringify(nextRoot, null, 2),
            selectedArtifact.sessions,
            selectedArtifact.draft,
            selectedArtifact.type
        );

        await sync.fetchArtifactWithBody(selectedArtifact.id);
    }, [parsedBoard.root, selectedArtifact, selectedTeam]);

    const createTask = React.useCallback(async () => {
        if (!selectedTeam || !selectedArtifact) {
            return;
        }

        const title = newTaskTitle.trim();
        if (!title) {
            Modal.alert('Missing title', 'Enter a task title first.');
            return;
        }

        const assignee = newTaskAssignee.trim().replace(/^@/, '');
        const now = Date.now();
        const newTask: BoardTask = {
            id: `task_${now}_${Math.random().toString(36).slice(2, 8)}`,
            title,
            status: 'todo',
            assigneeId: assignee || null,
            createdAt: now,
            updatedAt: now,
        };

        setIsSaving(true);
        try {
            await persistTasks([...parsedBoard.tasks, newTask]);
            setNewTaskTitle('');
            setNewTaskAssignee('');
        } finally {
            setIsSaving(false);
        }
    }, [newTaskAssignee, newTaskTitle, parsedBoard.tasks, persistTasks, selectedArtifact, selectedTeam]);

    const moveTask = React.useCallback(async (task: BoardTask) => {
        setIsSaving(true);
        try {
            const nextTasks = parsedBoard.tasks.map((item) =>
                item.id === task.id
                    ? {
                          ...item,
                          status: getNextBoardStatus(item.status),
                          updatedAt: Date.now(),
                      }
                    : item
            );
            await persistTasks(nextTasks);
        } finally {
            setIsSaving(false);
        }
    }, [parsedBoard.tasks, persistTasks]);

    const renameTask = React.useCallback(async (task: BoardTask) => {
        const nextTitle = await Modal.prompt('Edit Task', 'Update task title', {
            placeholder: task.title,
            defaultValue: task.title,
            cancelText: 'Cancel',
            confirmText: 'Save',
        });

        if (!nextTitle?.trim()) {
            return;
        }

        setIsSaving(true);
        try {
            const nextTasks = parsedBoard.tasks.map((item) =>
                item.id === task.id
                    ? {
                          ...item,
                          title: nextTitle.trim(),
                          updatedAt: Date.now(),
                      }
                    : item
            );
            await persistTasks(nextTasks);
        } finally {
            setIsSaving(false);
        }
    }, [parsedBoard.tasks, persistTasks]);

    const removeTask = React.useCallback(async (task: BoardTask) => {
        const confirmed = await Modal.confirm('Delete Task', `Delete "${task.title}"? This cannot be undone.`);
        if (!confirmed) {
            return;
        }

        setIsSaving(true);
        try {
            await persistTasks(parsedBoard.tasks.filter((item) => item.id !== task.id));
        } finally {
            setIsSaving(false);
        }
    }, [parsedBoard.tasks, persistTasks]);

    const rightPanel = selectedTeam ? (
        <View style={{ flex: 1, padding: 12 }}>
            <Text
                style={{
                    color: uiPenColors.textPrimary,
                    fontSize: 14,
                    fontWeight: '700',
                    fontFamily: uiPenFontFamily,
                }}
            >
                Board Notes
            </Text>
            <Text
                style={{
                    marginTop: 6,
                    color: uiPenColors.textSecondary,
                    fontSize: 12,
                    lineHeight: 18,
                    fontFamily: uiPenFontFamily,
                }}
            >
                Task CRUD entry supports create/edit/move/delete directly on this board. Use `@role` in assignee for manual routing hints.
            </Text>

            <View
                style={{
                    marginTop: 12,
                    borderRadius: uiPenRadius.lg,
                    borderWidth: 1,
                    borderColor: uiPenColors.borderSubtle,
                    backgroundColor: uiPenColors.bgElevated,
                    padding: 10,
                }}
            >
                {boardColumns.map((column) => (
                    <View
                        key={column.id}
                        style={{
                            flexDirection: 'row',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            paddingVertical: 4,
                        }}
                    >
                        <Text style={{ color: uiPenColors.textSecondary, fontSize: 12, fontFamily: uiPenFontFamily }}>
                            {column.title}
                        </Text>
                        <Text style={{ color: uiPenColors.textPrimary, fontSize: 12, fontWeight: '700', fontFamily: uiPenFontFamily }}>
                            {column.tasks.length}
                        </Text>
                    </View>
                ))}
            </View>
        </View>
    ) : null;

    if (Platform.OS !== 'web') {
        return (
            <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
                <Text>Web board is only available on web.</Text>
            </View>
        );
    }

    if (!selectedTeam) {
        return (
            <TeamWorkspaceShell activeTab="board" title="Team Board" teams={teams} selectedTeamId={selectedTeamId}>
                <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: 20 }}>
                    <Text style={{ color: uiPenColors.textPrimary, fontSize: 18, fontWeight: '700', fontFamily: uiPenFontFamily }}>
                        No team board available
                    </Text>
                    <Text
                        style={{
                            marginTop: 8,
                            color: uiPenColors.textSecondary,
                            fontSize: 14,
                            fontFamily: uiPenFontFamily,
                            textAlign: 'center',
                            maxWidth: 520,
                        }}
                    >
                        Create a team first, then this view will show Todo / In Progress / Review / Done columns.
                    </Text>
                </View>
            </TeamWorkspaceShell>
        );
    }

    return (
        <TeamWorkspaceShell
            activeTab="board"
            title={`${selectedTeam.title} · Board`}
            teams={teams}
            selectedTeamId={selectedTeam.id}
            rightPanel={rightPanel}
            headerActions={
                <Pressable
                    onPress={() => {
                        router.push(`/web/team-info?teamId=${encodeURIComponent(selectedTeam.id)}`);
                    }}
                    style={{
                        borderRadius: 10,
                        borderWidth: 1,
                        borderColor: uiPenColors.borderSubtle,
                        backgroundColor: uiPenColors.bgCard,
                        paddingHorizontal: 12,
                        paddingVertical: 7,
                    }}
                >
                    <Text style={{ color: uiPenColors.textPrimary, fontSize: 12, fontWeight: '700', fontFamily: uiPenFontFamily }}>
                        Open Info
                    </Text>
                </Pressable>
            }
        >
            <View style={{ flex: 1, backgroundColor: uiPenColors.bgPage }}>
                <View style={{ padding: 14, gap: 8 }}>
                    <TextInput
                        value={newTaskTitle}
                        onChangeText={setNewTaskTitle}
                        placeholder="New task title..."
                        placeholderTextColor={uiPenColors.textTertiary}
                        style={{
                            minHeight: 42,
                            borderRadius: uiPenRadius.md,
                            borderWidth: 1,
                            borderColor: uiPenColors.borderSubtle,
                            backgroundColor: uiPenColors.bgCard,
                            paddingHorizontal: 12,
                            color: uiPenColors.textPrimary,
                            fontFamily: uiPenFontFamily,
                        }}
                    />
                    <View style={{ flexDirection: 'row', gap: 8 }}>
                        <TextInput
                            value={newTaskAssignee}
                            onChangeText={setNewTaskAssignee}
                            placeholder="Assignee role (optional, @builder)"
                            placeholderTextColor={uiPenColors.textTertiary}
                            style={{
                                flex: 1,
                                minHeight: 42,
                                borderRadius: uiPenRadius.md,
                                borderWidth: 1,
                                borderColor: uiPenColors.borderSubtle,
                                backgroundColor: uiPenColors.bgCard,
                                paddingHorizontal: 12,
                                color: uiPenColors.textPrimary,
                                fontFamily: uiPenFontFamily,
                            }}
                        />
                        <Pressable
                            onPress={() => {
                                void createTask();
                            }}
                            disabled={isSaving}
                            style={{
                                minHeight: 42,
                                borderRadius: uiPenRadius.md,
                                backgroundColor: uiPenColors.accentGreen,
                                alignItems: 'center',
                                justifyContent: 'center',
                                paddingHorizontal: 14,
                            }}
                        >
                            <Text style={{ color: uiPenColors.textInverse, fontSize: 12, fontWeight: '700', fontFamily: uiPenFontFamily }}>
                                {isSaving ? 'Saving...' : 'Create Task'}
                            </Text>
                        </Pressable>
                    </View>
                </View>

                <ScrollView horizontal style={{ flex: 1 }} contentContainerStyle={{ paddingHorizontal: 14, paddingBottom: 14 }}>
                    {boardColumns.map((column) => (
                        <View key={column.id} style={{ width: 280, marginRight: 10 }}>
                            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                                <Text
                                    style={{
                                        color: uiPenColors.textPrimary,
                                        fontSize: 14,
                                        fontWeight: '700',
                                        fontFamily: uiPenFontFamily,
                                    }}
                                >
                                    {column.title}
                                </Text>
                                <Text style={{ color: uiPenColors.textSecondary, fontSize: 12, fontFamily: uiPenFontFamily }}>
                                    {column.tasks.length}
                                </Text>
                            </View>

                            <View
                                style={{
                                    minHeight: 380,
                                    borderRadius: uiPenRadius.lg,
                                    borderWidth: 1,
                                    borderColor: uiPenColors.borderSubtle,
                                    backgroundColor: uiPenColors.bgCard,
                                    padding: 10,
                                }}
                            >
                                {column.tasks.map((task) => (
                                    <View
                                        key={task.id}
                                        style={{
                                            borderRadius: uiPenRadius.md,
                                            borderWidth: 1,
                                            borderColor: uiPenColors.borderSubtle,
                                            backgroundColor: uiPenColors.bgElevated,
                                            paddingHorizontal: 10,
                                            paddingVertical: 9,
                                            marginBottom: 8,
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
                                            {task.title}
                                        </Text>
                                        {task.assigneeId ? (
                                            <Text
                                                style={{
                                                    marginTop: 2,
                                                    color: uiPenColors.textSecondary,
                                                    fontSize: 11,
                                                    fontFamily: uiPenFontFamily,
                                                }}
                                            >
                                                @{task.assigneeId}
                                            </Text>
                                        ) : null}
                                        <View style={{ flexDirection: 'row', gap: 6, marginTop: 8 }}>
                                            <Pressable
                                                onPress={() => {
                                                    void moveTask(task);
                                                }}
                                                style={{
                                                    flexDirection: 'row',
                                                    alignItems: 'center',
                                                    borderRadius: 8,
                                                    borderWidth: 1,
                                                    borderColor: uiPenColors.borderSubtle,
                                                    paddingHorizontal: 8,
                                                    paddingVertical: 6,
                                                    backgroundColor: uiPenColors.bgCard,
                                                }}
                                            >
                                                <Ionicons name="arrow-forward" size={12} color={uiPenColors.textSecondary} />
                                                <Text style={{ marginLeft: 4, color: uiPenColors.textSecondary, fontSize: 11, fontFamily: uiPenFontFamily }}>
                                                    Move
                                                </Text>
                                            </Pressable>
                                            <Pressable
                                                onPress={() => {
                                                    void renameTask(task);
                                                }}
                                                style={{
                                                    flexDirection: 'row',
                                                    alignItems: 'center',
                                                    borderRadius: 8,
                                                    borderWidth: 1,
                                                    borderColor: uiPenColors.borderSubtle,
                                                    paddingHorizontal: 8,
                                                    paddingVertical: 6,
                                                    backgroundColor: uiPenColors.bgCard,
                                                }}
                                            >
                                                <Ionicons name="create-outline" size={12} color={uiPenColors.textSecondary} />
                                                <Text style={{ marginLeft: 4, color: uiPenColors.textSecondary, fontSize: 11, fontFamily: uiPenFontFamily }}>
                                                    Edit
                                                </Text>
                                            </Pressable>
                                            <Pressable
                                                onPress={() => {
                                                    void removeTask(task);
                                                }}
                                                style={{
                                                    flexDirection: 'row',
                                                    alignItems: 'center',
                                                    borderRadius: 8,
                                                    borderWidth: 1,
                                                    borderColor: uiPenColors.borderSubtle,
                                                    paddingHorizontal: 8,
                                                    paddingVertical: 6,
                                                    backgroundColor: uiPenColors.bgCard,
                                                }}
                                            >
                                                <Ionicons name="trash-outline" size={12} color={uiPenColors.accentRed} />
                                                <Text style={{ marginLeft: 4, color: uiPenColors.accentRed, fontSize: 11, fontFamily: uiPenFontFamily }}>
                                                    Delete
                                                </Text>
                                            </Pressable>
                                        </View>
                                    </View>
                                ))}
                            </View>
                        </View>
                    ))}
                </ScrollView>
            </View>
        </TeamWorkspaceShell>
    );
}
