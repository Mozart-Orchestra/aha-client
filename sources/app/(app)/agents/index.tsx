import React from 'react';
import { View, Text } from 'react-native';
import { StyleSheet } from 'react-native-unistyles';
import { SidebarView } from '@/components/layout/SidebarView';
import { t } from '@/text';

export default function AgentsScreen() {
    const mainPanel = (
        <View style={styles.container}>
            <View style={styles.header}>
                <Text style={styles.title}>{t('agents.title')}</Text>
            </View>
            <View style={styles.content}>
                <Text style={styles.placeholder}>{t('agents.placeholder')}</Text>
            </View>
        </View>
    );

    return <SidebarView mainPanel={mainPanel} />;
}

const styles = StyleSheet.create(() => ({
    container: {
        flex: 1,
        backgroundColor: '#F2F6F8',
    },
    header: {
        paddingHorizontal: 24,
        paddingVertical: 20,
        borderBottomWidth: 1,
        borderBottomColor: '#DEE8EE',
    },
    title: {
        fontSize: 20,
        fontWeight: '600',
        color: '#223548',
    },
    content: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        padding: 24,
    },
    placeholder: {
        fontSize: 16,
        color: '#93A4B1',
        textAlign: 'center',
    },
}));
