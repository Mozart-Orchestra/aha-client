import * as React from 'react';
import { View, TextInput, Pressable } from 'react-native';
import { Text } from '@/components/StyledText';
import { StyleSheet } from 'react-native-unistyles';
import { Ionicons } from '@expo/vector-icons';

interface ArrayInputProps {
    value: string[];
    onChange: (value: string[]) => void;
    placeholder?: string;
    label?: string;
    maxItems?: number;
}

export function ArrayInput({ value, onChange, placeholder, label, maxItems = 20 }: ArrayInputProps) {
    const [inputText, setInputText] = React.useState('');

    const addItem = () => {
        const trimmed = inputText.trim();
        if (trimmed && !value.includes(trimmed) && value.length < maxItems) {
            onChange([...value, trimmed]);
            setInputText('');
        }
    };

    const removeItem = (index: number) => {
        onChange(value.filter((_, i) => i !== index));
    };

    const handleKeyPress = (e: any) => {
        if (e.nativeEvent.key === 'Enter') {
            addItem();
        }
    };

    return (
        <View style={styles.container}>
            {label && <Text style={styles.label}>{label}</Text>}

            <View style={styles.inputRow}>
                <TextInput
                    style={styles.input}
                    value={inputText}
                    onChangeText={setInputText}
                    placeholder={placeholder}
                    placeholderTextColor="#666"
                    onSubmitEditing={addItem}
                    blurOnSubmit={false}
                />
                <Pressable
                    style={[styles.addButton, !inputText.trim() && styles.addButtonDisabled]}
                    onPress={addItem}
                    disabled={!inputText.trim()}
                >
                    <Ionicons name="add" size={20} color="#FFF" />
                </Pressable>
            </View>

            <View style={styles.itemsContainer}>
                {value.map((item, index) => (
                    <View key={index} style={styles.itemChip}>
                        <Text style={styles.itemText} numberOfLines={2}>
                            {item}
                        </Text>
                        <Pressable
                            style={styles.removeButton}
                            onPress={() => removeItem(index)}
                        >
                            <Ionicons name="close" size={16} color="#999" />
                        </Pressable>
                    </View>
                ))}
            </View>

            {value.length === 0 && (
                <Text style={styles.emptyText}>No items added yet</Text>
            )}
        </View>
    );
}

const styles = StyleSheet.create((theme) => ({
    container: {
        marginBottom: 16,
    },
    label: {
        fontSize: 13,
        fontWeight: '600',
        color: theme.colors.textSecondary,
        marginBottom: 8,
        textTransform: 'uppercase',
        letterSpacing: 0.5,
    },
    inputRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    input: {
        flex: 1,
        backgroundColor: theme.colors.surface,
        borderRadius: 8,
        paddingHorizontal: 12,
        paddingVertical: 10,
        fontSize: 15,
        color: theme.colors.text,
        borderWidth: 1,
        borderColor: theme.colors.divider,
    },
    addButton: {
        width: 40,
        height: 40,
        backgroundColor: theme.colors.button.primary.background,
        borderRadius: 8,
        alignItems: 'center',
        justifyContent: 'center',
    },
    addButtonDisabled: {
        opacity: 0.5,
    },
    itemsContainer: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 8,
        marginTop: 12,
    },
    itemChip: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: theme.colors.groupped?.background || '#1a1a2e',
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 16,
        maxWidth: '100%',
    },
    itemText: {
        fontSize: 14,
        color: theme.colors.text,
        flex: 1,
        flexShrink: 1,
    },
    removeButton: {
        marginLeft: 8,
        padding: 2,
    },
    emptyText: {
        fontSize: 13,
        color: theme.colors.textSecondary,
        fontStyle: 'italic',
        marginTop: 8,
    },
}));
