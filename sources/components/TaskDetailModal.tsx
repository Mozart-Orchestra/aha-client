import React, { useState } from 'react';
import {
    View,
    Text,
    Pressable,
    ScrollView,
    TextInput,
    Modal,
    ActivityIndicator,
    Platform,
    KeyboardAvoidingView
} from 'react-native';
import { StyleSheet, useUnistyles } from 'react-native-unistyles';
import { Ionicons } from '@expo/vector-icons';
import { KanbanTask, KanbanColumn } from '@/sync/kanbanTypes';

interface TaskDetailModalProps {
    visible: boolean;
    task: KanbanTask | null;
    columns: KanbanColumn[];
    onClose: () => void;
    onSave?: (taskId: string, updates: Partial<KanbanTask>) => Promise<void>;
    onDiscuss?: (task: KanbanTask) => void;
    allSessions?: any[];
}

interface Subtask {
    id: string;
    title: string;
    done: boolean;
}

export const TaskDetailModal: React.FC<TaskDetailModalProps> = ({
    visible,
    task,
    columns,
    onClose,
    onSave,
    onDiscuss,
    allSessions
}) => {
    const { theme } = useUnistyles();
    const [isEditing, setIsEditing] = useState(false);
    const [editedTask, setEditedTask] = useState<Partial<KanbanTask>>({});
    const [subtasks, setSubtasks] = useState<Subtask[]>([]);
    const [isSaving, setIsSaving] = useState(false);
    const [saveError, setSaveError] = useState<string | null>(null);

    // 当 task 改变时,重置状态
    React.useEffect(() => {
        if (task) {
            setSaveError(null);
            setEditedTask({
                title: task.title,
                description: task.description || '',
                status: task.status,
                assigneeId: task.assigneeId,
                priority: task.priority || 'medium',
                dueDate: task.dueDate,
                tags: task.tags || []
            });
            // TODO: 从 subtaskIds 加载子任务
            setSubtasks([]);
        }
    }, [task]);

    React.useEffect(() => {
        if (!visible) {
            setSaveError(null);
        }
    }, [visible]);

    if (!task) return null;

    const handleSave = async () => {
        if (!onSave || !task) return;

        setIsSaving(true);
        setSaveError(null);
        try {
            await onSave(task.id, editedTask);
            setIsEditing(false);
            setSaveError(null);
        } catch (error) {
            console.error('Failed to save task:', error);
            setSaveError(error instanceof Error ? error.message : 'Failed to save task');
        } finally {
            setIsSaving(false);
        }
    };

    const handleCancel = () => {
        setIsEditing(false);
        setSaveError(null);
        // 重置为原始值
        setEditedTask({
            title: task.title,
            description: task.description || '',
            status: task.status,
            assigneeId: task.assigneeId,
            priority: task.priority || 'medium',
            dueDate: task.dueDate,
            tags: task.tags || []
        });
    };

    const getAssigneeName = (assigneeId?: string | null) => {
        if (!assigneeId) return 'Unassigned';
        const session = allSessions?.find(s => s.id === assigneeId);
        return session?.displayName || session?.name || assigneeId;
    };

    const getPriorityColor = (priority?: string) => {
        switch (priority) {
            case 'urgent': return theme.colors.textDestructive;
            case 'high': return theme.colors.warning;
            case 'medium': return theme.colors.textLink;
            case 'low': return theme.colors.success;
            default: return theme.colors.textSecondary;
        }
    };

    const formatDate = (timestamp?: number) => {
        if (!timestamp) return 'No due date';
        return new Date(timestamp).toLocaleDateString();
    };

    const subtasksDone = subtasks.filter(s => s.done).length;
    const subtasksProgress = subtasks.length > 0
        ? `${subtasksDone}/${subtasks.length}`
        : null;

    // Handler for status selection
    const handleStatusPress = () => {
        if (!isEditing || !columns) return;
        // TODO: Show status picker modal
        console.log('Status picker not implemented');
    };

    // Handler for priority selection
    const handlePriorityPress = () => {
        if (!isEditing) return;
        // TODO: Show priority picker modal
        console.log('Priority picker not implemented');
    };

    // Handler for subtask toggle
    const handleSubtaskToggle = (subtaskId: string) => {
        setSubtasks(prev => prev.map(st =>
            st.id === subtaskId ? { ...st, done: !st.done } : st
        ));
    };

    // Handler for adding subtask
    const handleAddSubtask = () => {
        // TODO: Show add subtask modal
        console.log('Add subtask not implemented');
    };

    // Reset edit mode when task changes
    React.useEffect(() => {
        setIsEditing(false);
    }, [task?.id]);

    return (
        <Modal
            visible={visible}
            animationType="slide"
            transparent={true}
            onRequestClose={onClose}
        >
            <KeyboardAvoidingView
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                style={{ flex: 1 }}
            >
                <View style={stylesheet.overlay}>
                    <View style={stylesheet.container}>
                        {/* Header */}
                        <View style={stylesheet.header}>
                            <Text style={stylesheet.headerTitle}>
                                {isEditing ? 'Edit Task' : 'Task Details'}
                            </Text>
                            <Pressable onPress={onClose} style={stylesheet.closeButton}>
                                <Ionicons name="close" size={24} color={theme.colors.text} />
                            </Pressable>
                        </View>

                        {saveError && (
                            <View style={stylesheet.errorBanner}>
                                <Text style={stylesheet.errorText}>{saveError}</Text>
                            </View>
                        )}

                        <ScrollView style={stylesheet.content} showsVerticalScrollIndicator={false}>
                            {/* Title */}
                            {isEditing ? (
                                <TextInput
                                    style={stylesheet.titleInput}
                                    value={editedTask.title}
                                    onChangeText={(text) => setEditedTask({ ...editedTask, title: text })}
                                    placeholder="Task title"
                                />
                            ) : (
                                <Text style={stylesheet.title}>{task.title}</Text>
                            )}

                            {/* Status & Assignee */}
                            <View style={stylesheet.metaRow}>
                                <View style={stylesheet.metaItem}>
                                    <Text style={stylesheet.metaLabel}>Status</Text>
                                    {isEditing ? (
                                        <Pressable style={stylesheet.selectButton} onPress={handleStatusPress}>
                                            <Text style={stylesheet.selectText}>
                                                {columns.find(c => c.id === editedTask.status)?.title || editedTask.status}
                                            </Text>
                                            <Ionicons name="chevron-down" size={16} color={theme.colors.textSecondary} />
                                        </Pressable>
                                    ) : (
                                        <Text style={stylesheet.metaValue}>
                                            {columns.find(c => c.id === task.status)?.title || task.status}
                                        </Text>
                                    )}
                                </View>

                                <View style={stylesheet.metaItem}>
                                    <Text style={stylesheet.metaLabel}>Assignee</Text>
                                    <Text style={stylesheet.metaValue}>
                                        {getAssigneeName(task.assigneeId)}
                                    </Text>
                                </View>
                            </View>

                            {/* Priority */}
                            <View style={stylesheet.metaRow}>
                                <View style={stylesheet.metaItem}>
                                    <Text style={stylesheet.metaLabel}>Priority</Text>
                                    {isEditing ? (
                                        <Pressable style={stylesheet.selectButton} onPress={handlePriorityPress}>
                                            <Text style={[
                                                stylesheet.metaValue,
                                                { color: getPriorityColor(editedTask.priority) }
                                            ]}>
                                                {editedTask.priority?.toUpperCase()}
                                            </Text>
                                            <Ionicons name="chevron-down" size={16} color={theme.colors.textSecondary} />
                                        </Pressable>
                                    ) : (
                                        <Text style={[
                                            stylesheet.metaValue,
                                            { color: getPriorityColor(task.priority) }
                                        ]}>
                                            {task.priority?.toUpperCase() || 'MEDIUM'}
                                        </Text>
                                    )}
                                </View>

                                <View style={stylesheet.metaItem}>
                                    <Text style={stylesheet.metaLabel}>Due Date</Text>
                                    <Text style={stylesheet.metaValue}>
                                        {formatDate(task.dueDate)}
                                    </Text>
                                </View>
                            </View>

                            {/* Description */}
                            <View style={stylesheet.section}>
                                <Text style={stylesheet.sectionTitle}>Description</Text>
                                {isEditing ? (
                                    <TextInput
                                        style={stylesheet.descriptionInput}
                                        value={editedTask.description}
                                        onChangeText={(text) => setEditedTask({ ...editedTask, description: text })}
                                        placeholder="Add a description..."
                                        multiline
                                        numberOfLines={4}
                                    />
                                ) : (
                                    <Text style={stylesheet.description}>
                                        {task.description || 'No description'}
                                    </Text>
                                )}
                            </View>

                            {/* Subtasks */}
                            {subtasks.length > 0 && (
                                <View style={stylesheet.section}>
                                    <View style={stylesheet.sectionHeader}>
                                        <Text style={stylesheet.sectionTitle}>Subtasks</Text>
                                        {subtasksProgress && (
                                            <Text style={stylesheet.progress}>{subtasksProgress} done</Text>
                                        )}
                                    </View>
                                    {subtasks.map((subtask) => (
                                        <Pressable
                                            key={subtask.id}
                                            style={stylesheet.subtaskRow}
                                            onPress={() => handleSubtaskToggle(subtask.id)}
                                        >
                                            <Ionicons
                                                name={subtask.done ? "checkbox" : "square-outline"}
                                                size={20}
                                                color={subtask.done ? theme.colors.success : theme.colors.textSecondary}
                                            />
                                            <Text style={[
                                                stylesheet.subtaskTitle,
                                                subtask.done && stylesheet.subtaskDone
                                            ]}>
                                                {subtask.title}
                                            </Text>
                                        </Pressable>
                                    ))}
                                    <Pressable style={stylesheet.addSubtaskButton} onPress={handleAddSubtask}>
                                        <Ionicons name="add" size={16} color={theme.colors.textSecondary} />
                                        <Text style={stylesheet.addSubtaskText}>Add subtask</Text>
                                    </Pressable>
                                </View>
                            )}

                            {/* Tags */}
                            {task.tags && task.tags.length > 0 && (
                                <View style={stylesheet.section}>
                                    <Text style={stylesheet.sectionTitle}>Tags</Text>
                                    <View style={stylesheet.tagsContainer}>
                                        {task.tags.map((tag, index) => (
                                            <View key={index} style={stylesheet.tag}>
                                                <Text style={stylesheet.tagText}>{tag}</Text>
                                            </View>
                                        ))}
                                    </View>
                                </View>
                            )}

                            {/* Activity Feed */}
                            <View style={stylesheet.section}>
                                <Text style={stylesheet.sectionTitle}>Activity</Text>
                                <Text style={stylesheet.noActivity}>No recent activity</Text>
                                {/* TODO: 显示活动历史 */}
                            </View>
                        </ScrollView>

                        {/* Footer Actions */}
                        <View style={stylesheet.footer}>
                            {!isEditing ? (
                                <>
                                    <Pressable
                                        style={[stylesheet.footerButton, stylesheet.discussButton]}
                                        onPress={() => onDiscuss?.(task)}
                                    >
                                        <Ionicons name="chatbubbles" size={18} color="#FFF" />
                                        <Text style={stylesheet.footerButtonText}>Discuss</Text>
                                    </Pressable>
                                    <Pressable
                                        style={[stylesheet.footerButton, stylesheet.editButton]}
                                        onPress={() => setIsEditing(true)}
                                    >
                                        <Ionicons name="create" size={18} color="#FFF" />
                                        <Text style={stylesheet.footerButtonText}>Edit</Text>
                                    </Pressable>
                                </>
                            ) : (
                                <>
                                    <Pressable
                                        style={[stylesheet.footerButton, stylesheet.cancelButton]}
                                        onPress={handleCancel}
                                        disabled={isSaving}
                                    >
                                        <Text style={[stylesheet.footerButtonText, stylesheet.cancelButtonText]}>Cancel</Text>
                                    </Pressable>
                                    <Pressable
                                        style={[stylesheet.footerButton, stylesheet.saveButton]}
                                        onPress={handleSave}
                                        disabled={isSaving}
                                    >
                                        {isSaving ? (
                                            <ActivityIndicator size="small" color="#FFF" />
                                        ) : (
                                            <>
                                                <Ionicons name="checkmark" size={18} color="#FFF" />
                                                <Text style={stylesheet.footerButtonText}>Save</Text>
                                            </>
                                        )}
                                    </Pressable>
                                </>
                            )}
                        </View>
                    </View>
                </View>
            </KeyboardAvoidingView>
        </Modal>
    );
};

const stylesheet = StyleSheet.create((theme) => ({
    overlay: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        justifyContent: 'center',
        alignItems: 'center',
        padding: 16,
    },
    container: {
        backgroundColor: theme.colors.surface,
        borderRadius: 16,
        width: '100%',
        maxWidth: 600,
        maxHeight: '90%',
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: 16,
        borderBottomWidth: 1,
        borderBottomColor: theme.colors.divider,
    },
    headerTitle: {
        fontSize: 18,
        fontWeight: '600',
        color: theme.colors.text,
    },
    closeButton: {
        padding: 4,
    },
    content: {
        padding: 16,
        maxHeight: '70%',
    },
    title: {
        fontSize: 20,
        fontWeight: 'bold',
        color: theme.colors.text,
        marginBottom: 16,
    },
    titleInput: {
        fontSize: 20,
        fontWeight: 'bold',
        color: theme.colors.text,
        marginBottom: 16,
        borderBottomWidth: 1,
        borderBottomColor: theme.colors.divider,
        paddingVertical: 8,
    },
    metaRow: {
        flexDirection: 'row',
        marginBottom: 16,
        gap: 16,
    },
    metaItem: {
        flex: 1,
    },
    metaLabel: {
        fontSize: 12,
        color: theme.colors.textSecondary,
        marginBottom: 4,
    },
    metaValue: {
        fontSize: 14,
        color: theme.colors.text,
        fontWeight: '500',
    },
    selectButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        backgroundColor: theme.colors.groupped.background,
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderRadius: 8,
    },
    selectText: {
        fontSize: 14,
        color: theme.colors.text,
    },
    section: {
        marginBottom: 24,
    },
    sectionHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 12,
    },
    sectionTitle: {
        fontSize: 16,
        fontWeight: '600',
        color: theme.colors.text,
        marginBottom: 8,
    },
    progress: {
        fontSize: 12,
        color: theme.colors.textSecondary,
    },
    description: {
        fontSize: 14,
        color: theme.colors.text,
        lineHeight: 20,
    },
    descriptionInput: {
        fontSize: 14,
        color: theme.colors.text,
        lineHeight: 20,
        backgroundColor: theme.colors.groupped.background,
        borderRadius: 8,
        padding: 12,
        textAlignVertical: 'top',
    },
    noActivity: {
        fontSize: 14,
        color: theme.colors.textSecondary,
        fontStyle: 'italic',
    },
    subtaskRow: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 8,
        gap: 12,
    },
    subtaskTitle: {
        fontSize: 14,
        color: theme.colors.text,
        flex: 1,
    },
    subtaskDone: {
        textDecorationLine: 'line-through',
        color: theme.colors.textSecondary,
    },
    addSubtaskButton: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        marginTop: 8,
        paddingVertical: 8,
    },
    addSubtaskText: {
        fontSize: 14,
        color: theme.colors.textSecondary,
    },
    tagsContainer: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 8,
    },
    tag: {
        backgroundColor: theme.colors.groupped.background,
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 12,
    },
    tagText: {
        fontSize: 12,
        color: theme.colors.text,
    },
    footer: {
        flexDirection: 'row',
        padding: 16,
        borderTopWidth: 1,
        borderTopColor: theme.colors.divider,
        gap: 12,
    },
    footerButton: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        paddingVertical: 12,
        borderRadius: 8,
    },
    footerButtonText: {
        fontSize: 14,
        fontWeight: '600',
        color: '#FFF',
    },
    cancelButtonText: {
        color: theme.colors.text,
    },
    discussButton: {
        backgroundColor: theme.colors.textLink,
    },
    editButton: {
        backgroundColor: theme.colors.button.primary.background,
    },
    cancelButton: {
        backgroundColor: theme.colors.groupped.background,
    },
    saveButton: {
        backgroundColor: theme.colors.success,
    },
    errorBanner: {
        marginHorizontal: 16,
        marginTop: 12,
        padding: 12,
        borderRadius: 8,
        borderWidth: 1,
        borderColor: theme.colors.textDestructive,
        backgroundColor: theme.colors.surfaceHighest,
    },
    errorText: {
        fontSize: 12,
        color: theme.colors.textDestructive,
    },
}));
