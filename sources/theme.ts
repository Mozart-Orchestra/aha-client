import { Platform } from 'react-native';

export const lightTheme = {
    dark: false,
    colors: {

        //
        // Main colors - Enhanced with modern color palette
        //

        text: '#1a1a1a',
        textDestructive: Platform.select({ ios: '#FF3B30', default: '#FF4444' }),
        textSecondary: Platform.select({ ios: '#8E8E93', default: '#6B7280' }),
        textLink: '#3B82F6',
        warningCritical: '#EF4444',
        warning: '#F59E0B',
        success: '#10B981',
        surface: '#ffffff',
        surfaceRipple: 'rgba(0, 0, 0, 0.06)',
        surfacePressed: '#f8fafc',
        surfaceSelected: Platform.select({ ios: '#E2E8F0', default: '#f1f5f9' }),
        surfacePressedOverlay: Platform.select({ ios: '#E2E8F0', default: 'transparent' }),
        surfaceHigh: '#f8fafc',
        surfaceHighest: '#f1f5f9',
        divider: Platform.select({ ios: '#E2E8F0', default: '#e2e8f0' }),
        shadow: {
            color: Platform.select({ default: 'rgba(0, 0, 0, 0.08)', web: 'rgba(0, 0, 0, 0.08)' }),
            opacity: 0.08,
        },

        //
        // System components - Enhanced with modern styling
        //

        groupped: {
            background: Platform.select({ ios: '#F2F2F7', default: '#f8fafc' }),
            chevron: Platform.select({ ios: '#C7C7CC', default: '#64748B' }),
            sectionTitle: Platform.select({ ios: '#8E8E93', default: '#64748B' }),
        },
        header: {
            background: '#ffffff',
            tint: '#1e293b'
        },
        switch: {
            track: {
                active: Platform.select({ ios: '#34C759', default: '#10B981' }),
                inactive: '#e2e8f0',
            },
            thumb: {
                active: '#FFFFFF',
                inactive: '#94a3b8',
            },
        },
        fab: {
            background: '#3B82F6',
            backgroundPressed: '#2563EB',
            icon: '#FFFFFF',
        },
        radio: {
            active: '#3B82F6',
            inactive: '#cbd5e1',
            dot: '#3B82F6',
        },
        modal: {
            border: 'rgba(0, 0, 0, 0.08)'
        },
        button: {
            primary: {
                background: '#3B82F6',
                backgroundPressed: '#2563EB',
                tint: '#FFFFFF',
                disabled: '#cbd5e1',
            },
            secondary: {
                background: '#f1f5f9',
                tint: '#475569',
            }
        },
        input: {
            background: '#f8fafc',
            text: '#1a1a1a',
            placeholder: '#94a3b8',
            border: '#e2e8f0',
            focusBorder: '#3B82F6',
        },
        box: {
            warning: {
                background: '#fef3c7',
                border: '#f59e0b',
                text: '#92400e',
            },
            error: {
                background: '#fee2e2',
                border: '#ef4444',
                text: '#991b1b',
            },
            info: {
                background: '#dbeafe',
                border: '#3b82f6',
                text: '#1e40af',
            },
            success: {
                background: '#d1fae5',
                border: '#10b981',
                text: '#065f46',
            }
        },

        //
        // App components
        //

        status: {
            connected: '#34C759',
            connecting: '#007AFF',
            disconnected: '#999999',
            error: '#FF3B30',
            default: '#8E8E93',
        },

        // Permission mode colors
        permission: {
            default: '#8E8E93',
            acceptEdits: '#007AFF',
            bypass: '#FF9500',
            plan: '#34C759',
            readOnly: '#8B8B8D',
            safeYolo: '#FF6B35',
            yolo: '#DC143C',
        },

        // Permission button colors
        permissionButton: {
            allow: {
                background: '#34C759',
                text: '#FFFFFF',
            },
            deny: {
                background: '#FF3B30',
                text: '#FFFFFF',
            },
            allowAll: {
                background: '#007AFF',
                text: '#FFFFFF',
            },
            inactive: {
                background: '#E5E5EA',
                border: '#D1D1D6',
                text: '#8E8E93',
            },
            selected: {
                background: '#F2F2F7',
                border: '#D1D1D6',
                text: '#3C3C43',
            },
        },


        // Diff view
        diff: {
            outline: '#E0E0E0',
            success: '#28A745',
            error: '#DC3545',
            // Traditional diff colors
            addedBg: '#E6FFED',
            addedBorder: '#34D058',
            addedText: '#24292E',
            removedBg: '#FFEEF0',
            removedBorder: '#D73A49',
            removedText: '#24292E',
            contextBg: '#F6F8FA',
            contextText: '#586069',
            lineNumberBg: '#F6F8FA',
            lineNumberText: '#959DA5',
            hunkHeaderBg: '#F1F8FF',
            hunkHeaderText: '#005CC5',
            leadingSpaceDot: '#E8E8E8',
            inlineAddedBg: '#ACFFA6',
            inlineAddedText: '#0A3F0A',
            inlineRemovedBg: '#FFCECB',
            inlineRemovedText: '#5A0A05',
        },

        // Message View colors
        userMessageBackground: '#f0eee6',
        userMessageText: '#000000',
        agentMessageText: '#000000',
        agentEventText: '#666666',

        // Code/Syntax colors
        syntaxKeyword: '#1d4ed8',
        syntaxString: '#059669',
        syntaxComment: '#6b7280',
        syntaxNumber: '#0891b2',
        syntaxFunction: '#9333ea',
        syntaxBracket1: '#ff6b6b',
        syntaxBracket2: '#4ecdc4',
        syntaxBracket3: '#45b7d1',
        syntaxBracket4: '#f7b731',
        syntaxBracket5: '#5f27cd',
        syntaxDefault: '#374151',

        // Git status colors
        gitBranchText: '#6b7280',
        gitFileCountText: '#6b7280',
        gitAddedText: '#22c55e',
        gitRemovedText: '#ef4444',

        // Terminal/Command colors
        terminal: {
            background: '#1E1E1E',
            prompt: '#34C759',
            command: '#E0E0E0',
            stdout: '#E0E0E0',
            stderr: '#FFB86C',
            error: '#FF5555',
            emptyOutput: '#6272A4',
        },

    },
};

export const darkTheme = {
    dark: true,
    colors: {

        //
        // Main colors - Enhanced with modern dark theme palette
        //

        text: '#f1f5f9',
        textDestructive: Platform.select({ ios: '#FF453A', default: '#f87171' }),
        textSecondary: Platform.select({ ios: '#8E8E93', default: '#94a3b8' }),
        textLink: '#60A5FA',
        warningCritical: '#EF4444',
        warning: '#F59E0B',
        success: '#10B981',
        surface: Platform.select({ ios: '#0f0f0f', default: '#0a0a0a' }),
        surfaceRipple: 'rgba(255, 255, 255, 0.06)',
        surfacePressed: '#1e293b',
        surfaceSelected: '#1e293b',
        surfacePressedOverlay: Platform.select({ ios: '#2C2C2E', default: 'transparent' }),
        // iOS dark theme is #1c1c1e for items, and #000 for the background
        surfaceHigh: Platform.select({ ios: '#1C1C1E', default: '#171717' }),
        surfaceHighest: Platform.select({ ios: '#38383A', default: '#1e293b' }),
        divider: Platform.select({ ios: '#38383A', default: '#334155' }),
        shadow: {
            color: Platform.select({ default: 'rgba(0, 0, 0, 0.3)', web: 'rgba(0, 0, 0, 0.3)' }),
            opacity: 0.3,
        },

        //
        // System components - Enhanced with modern dark styling
        //

        header: {
            background: Platform.select({ ios: '#18171C', default: '#0a0a0a' }),
            tint: '#f1f5f9'
        },
        switch: {
            track: {
                active: Platform.select({ ios: '#34C759', default: '#10B981' }),
                inactive: '#334155',
            },
            thumb: {
                active: '#FFFFFF',
                inactive: '#94a3b8',
            },
        },
        groupped: {
            background: Platform.select({ ios: '#1C1C1E', default: '#0f172a' }),
            chevron: Platform.select({ ios: '#48484A', default: '#64748B' }),
            sectionTitle: Platform.select({ ios: '#8E8E93', default: '#94a3b8' }),
        },
        fab: {
            background: '#3B82F6',
            backgroundPressed: '#2563EB',
            icon: '#FFFFFF',
        },
        radio: {
            active: '#60A5FA',
            inactive: '#475569',
            dot: '#60A5FA',
        },
        modal: {
            border: 'rgba(255, 255, 255, 0.08)'
        },
        button: {
            primary: {
                background: '#3B82F6',
                backgroundPressed: '#2563EB',
                tint: '#FFFFFF',
                disabled: '#475569',
            },
            secondary: {
                background: '#1e293b',
                tint: '#cbd5e1',
            }
        },
        input: {
            background: Platform.select({ ios: '#1C1C1E', default: '#0f172a' }),
            text: '#f1f5f9',
            placeholder: '#64748B',
            border: '#334155',
            focusBorder: '#60A5FA',
        },
        box: {
            warning: {
                background: 'rgba(251, 191, 36, 0.15)',
                border: '#fbbf24',
                text: '#fde68a',
            },
            error: {
                background: 'rgba(248, 113, 113, 0.15)',
                border: '#f87171',
                text: '#fecaca',
            },
            info: {
                background: 'rgba(96, 165, 250, 0.15)',
                border: '#60a5fa',
                text: '#bfdbfe',
            },
            success: {
                background: 'rgba(52, 211, 153, 0.15)',
                border: '#34d399',
                text: '#a7f3d0',
            }
        },

        //
        // App components
        //

        status: { // App Connection Status
            connected: '#34C759',
            connecting: '#FFFFFF',
            disconnected: '#8E8E93',
            error: '#FF453A',
            default: '#8E8E93',
        },

        // Permission mode colors
        permission: {
            default: '#8E8E93',
            acceptEdits: '#0A84FF',
            bypass: '#FF9F0A',
            plan: '#32D74B',
            readOnly: '#98989D',
            safeYolo: '#FF7A4C',
            yolo: '#FF453A',
        },

        // Permission button colors
        permissionButton: {
            allow: {
                background: '#32D74B',
                text: '#FFFFFF',
            },
            deny: {
                background: '#FF453A',
                text: '#FFFFFF',
            },
            allowAll: {
                background: '#0A84FF',
                text: '#FFFFFF',
            },
            inactive: {
                background: '#2C2C2E',
                border: '#38383A',
                text: '#8E8E93',
            },
            selected: {
                background: '#1C1C1E',
                border: '#38383A',
                text: '#FFFFFF',
            },
        },


        // Diff view
        diff: {
            outline: '#30363D',
            success: '#3FB950',
            error: '#F85149',
            // Traditional diff colors for dark mode
            addedBg: '#0D2E1F',
            addedBorder: '#3FB950',
            addedText: '#C9D1D9',
            removedBg: '#3F1B23',
            removedBorder: '#F85149',
            removedText: '#C9D1D9',
            contextBg: '#161B22',
            contextText: '#8B949E',
            lineNumberBg: '#161B22',
            lineNumberText: '#6E7681',
            hunkHeaderBg: '#161B22',
            hunkHeaderText: '#58A6FF',
            leadingSpaceDot: '#2A2A2A',
            inlineAddedBg: '#2A5A2A',
            inlineAddedText: '#7AFF7A',
            inlineRemovedBg: '#5A2A2A',
            inlineRemovedText: '#FF7A7A',
        },

        // Message View colors
        userMessageBackground: '#2C2C2E',
        userMessageText: '#FFFFFF',
        agentMessageText: '#FFFFFF',
        agentEventText: '#8E8E93',

        // Code/Syntax colors (brighter for dark mode)
        syntaxKeyword: '#569CD6',
        syntaxString: '#CE9178',
        syntaxComment: '#6A9955',
        syntaxNumber: '#B5CEA8',
        syntaxFunction: '#DCDCAA',
        syntaxBracket1: '#FFD700',
        syntaxBracket2: '#DA70D6',
        syntaxBracket3: '#179FFF',
        syntaxBracket4: '#FF8C00',
        syntaxBracket5: '#00FF00',
        syntaxDefault: '#D4D4D4',

        // Git status colors
        gitBranchText: '#8E8E93',
        gitFileCountText: '#8E8E93',
        gitAddedText: '#34C759',
        gitRemovedText: '#FF453A',

        // Terminal/Command colors
        terminal: {
            background: '#1E1E1E',
            prompt: '#32D74B',
            command: '#E0E0E0',
            stdout: '#E0E0E0',
            stderr: '#FFB86C',
            error: '#FF6B6B',
            emptyOutput: '#7B7B93',
        },

    },
} satisfies typeof lightTheme;

export type Theme = typeof lightTheme;
