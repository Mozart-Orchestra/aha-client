import React, { useEffect, useState } from 'react';
import {
    View,
    Text,
    TextInput,
    Pressable,
    Modal,
    KeyboardAvoidingView,
    Platform,
    ActivityIndicator,
    ScrollView,
} from 'react-native';
import { StyleSheet, useUnistyles } from 'react-native-unistyles';
import { Ionicons } from '@expo/vector-icons';
import type { KanbanColumn, KanbanTask } from '@/sync/kanbanTypes';

interface NewTaskModalProps {
    visible: boolean;
    columns: KanbanColumn[];
    initialStatus: string;
    contained?: boolean;
    onClose: () => void;
    onCreate: (task: Pick<KanbanTask, 'title' | 'description' | 'status' | 'priority'>) => Promise<void>;
}

const PRIORITIES: NonNullable<KanbanTask['priority']>[] = ['low', 'medium', 'high', 'urgent'];

export function NewTaskModal({
    visible,
    columns,
    initialStatus,
    contained = false,
    onClose,
    onCreate,
}: NewTaskModalProps) {
    const { theme } = useUnistyles();
    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');
    const [status, setStatus] = useState(initialStatus);
    const [priority, setPriority] = useState<NonNullable<KanbanTask['priority']>>('medium');
    const [isSaving, setIsSaving] = useState(false);

    useEffect(() => {
        if (!visible) return;
        setTitle('');
        setDescription('');
        setStatus(initialStatus);
        setPriority('medium');
        setIsSaving(false);
    }, [initialStatus, visible]);

    const handleCreate = async () => {
        if (!title.trim()) {
            return;
        }

        setIsSaving(true);
        try {
            await onCreate({
                title: title.trim(),
                description: description.trim() || undefined,
                status,
                priority,
            });
            onClose();
        } finally {
            setIsSaving(false);
        }
    };

    const overlayStyle = contained ? styles.overlayContained : styles.overlay;

    const body = (
        <View style={overlayStyle}>
            <View style={styles.container}>
                <View style={styles.header}>
                    <Text style={styles.headerTitle}>New Task</Text>
                    <Pressable onPress={onClose} style={styles.closeButton}>
                        <Ionicons name="close" size={22} color={theme.colors.text} />
                    </Pressable>
                </View>

                <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
                    <View style={styles.section}>
                        <Text style={styles.label}>Title</Text>
                        <TextInput
                            style={styles.titleInput}
                            value={title}
                            onChangeText={setTitle}
                            placeholder="What needs to be done?"
                            placeholderTextColor={theme.colors.input.placeholder}
                        />
                    </View>

                    <View style={styles.section}>
                        <Text style={styles.label}>Description</Text>
                        <TextInput
                            style={styles.descriptionInput}
                            value={description}
                            onChangeText={setDescription}
                            placeholder="Add details, acceptance criteria, notes, or context..."
                            placeholderTextColor={theme.colors.input.placeholder}
                            multiline
                            numberOfLines={6}
                            textAlignVertical="top"
                        />
                    </View>

                    <View style={styles.metaRow}>
                        <View style={styles.metaItem}>
                            <Text style={styles.label}>Status</Text>
                            <View style={styles.chipWrap}>
                                {columns.map((column) => {
                                    const selected = status === column.id;
                                    return (
                                        <Pressable
                                            key={column.id}
                                            onPress={() => setStatus(column.id)}
                                            style={[styles.chip, selected && styles.chipSelected]}
                                        >
                                            <Text style={[styles.chipText, selected && styles.chipTextSelected]}>
                                                {column.title}
                                            </Text>
                                        </Pressable>
                                    );
                                })}
                            </View>
                        </View>
                    </View>

                    <View style={styles.metaRow}>
                        <View style={styles.metaItem}>
                            <Text style={styles.label}>Priority</Text>
                            <View style={styles.chipWrap}>
                                {PRIORITIES.map((value) => {
                                    const selected = priority === value;
                                    return (
                                        <Pressable
                                            key={value}
                                            onPress={() => setPriority(value)}
                                            style={[styles.chip, selected && styles.chipSelected]}
                                        >
                                            <Text style={[styles.chipText, selected && styles.chipTextSelected]}>
                                                {value}
                                            </Text>
                                        </Pressable>
                                    );
                                })}
                            </View>
                        </View>
                    </View>
                </ScrollView>

                <View style={styles.footer}>
                    <Pressable
                        style={[styles.footerButton, styles.cancelButton]}
                        onPress={onClose}
                        disabled={isSaving}
                    >
                        <Text style={[styles.footerButtonText, styles.cancelButtonText]}>Cancel</Text>
                    </Pressable>
                    <Pressable
                        style={[styles.footerButton, styles.saveButton, !title.trim() && styles.saveButtonDisabled]}
                        onPress={handleCreate}
                        disabled={isSaving || !title.trim()}
                    >
                        {isSaving ? (
                            <ActivityIndicator size="small" color="#FFF" />
                        ) : (
                            <>
                                <Ionicons name="add" size={18} color="#FFF" />
                                <Text style={styles.footerButtonText}>Create</Text>
                            </>
                        )}
                    </Pressable>
                </View>
            </View>
        </View>
    );

    if (contained) {
        if (!visible) return null;
        return body;
    }

    return (
        <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
            <KeyboardAvoidingView
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                style={{ flex: 1 }}
            >
                {body}
            </KeyboardAvoidingView>
        </Modal>
    );
}

const styles = StyleSheet.create((theme) => ({
    overlay: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        justifyContent: 'center',
        alignItems: 'center',
        padding: 16,
    },
    overlayContained: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.4)',
        justifyContent: 'center',
        alignItems: 'center',
        padding: 24,
        zIndex: 110,
    },
    container: {
        backgroundColor: theme.colors.surface,
        borderRadius: 16,
        width: '100%',
        maxWidth: 620,
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
    section: {
        marginBottom: 18,
    },
    label: {
        fontSize: 12,
        color: theme.colors.textSecondary,
        marginBottom: 8,
        textTransform: 'uppercase',
        fontWeight: '600',
        letterSpacing: 0.4,
    },
    titleInput: {
        fontSize: 16,
        color: theme.colors.text,
        backgroundColor: theme.colors.groupped.background,
        borderRadius: 10,
        paddingHorizontal: 12,
        paddingVertical: 12,
    },
    descriptionInput: {
        fontSize: 14,
        color: theme.colors.text,
        backgroundColor: theme.colors.groupped.background,
        borderRadius: 10,
        paddingHorizontal: 12,
        paddingVertical: 12,
        minHeight: 140,
    },
    metaRow: {
        marginBottom: 18,
    },
    metaItem: {
        flex: 1,
    },
    chipWrap: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 8,
    },
    chip: {
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderRadius: 999,
        backgroundColor: theme.colors.groupped.background,
        borderWidth: 1,
        borderColor: theme.colors.divider,
    },
    chipSelected: {
        backgroundColor: theme.colors.button.primary.background,
        borderColor: theme.colors.button.primary.background,
    },
    chipText: {
        fontSize: 13,
        color: theme.colors.text,
        fontWeight: '500',
    },
    chipTextSelected: {
        color: '#FFFFFF',
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
        borderRadius: 10,
    },
    footerButtonText: {
        fontSize: 14,
        fontWeight: '600',
        color: '#FFF',
    },
    cancelButton: {
        backgroundColor: theme.colors.groupped.background,
    },
    cancelButtonText: {
        color: theme.colors.text,
    },
    saveButton: {
        backgroundColor: theme.colors.button.primary.background,
    },
    saveButtonDisabled: {
        opacity: 0.5,
    },
}));
