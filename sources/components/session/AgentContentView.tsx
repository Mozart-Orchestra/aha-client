import { useHeaderHeight } from '@/utils/responsive';
import * as React from 'react';
import { View } from 'react-native';
import { ScrollView } from 'react-native-gesture-handler';
import { useKeyboardState } from 'react-native-keyboard-controller';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

interface AgentContentViewProps {
    input?: React.ReactNode | null;
    content?: React.ReactNode | null;
    placeholder?: React.ReactNode | null;
}

// Web/Android version — uses flex layout so FlatList gets a deterministic height
// and scroll events are not blocked by position:absolute stacking issues.
export const AgentContentView: React.FC<AgentContentViewProps> = React.memo(({ input, content, placeholder }) => {
    const safeArea = useSafeAreaInsets();
    const headerHeight = useHeaderHeight();
    const state = useKeyboardState();
    return (
        <View style={{ flexBasis: 0, flexGrow: 1, paddingBottom: state.isVisible ? state.height - safeArea.bottom : 0 }}>
            <View style={{ flexBasis: 0, flexGrow: 1 }}>
                {content && (
                    <View style={{ flex: 1 }}>
                        {content}
                    </View>
                )}
                {!content && placeholder && (
                    <ScrollView
                        style={{ flex: 1, marginTop: safeArea.top + headerHeight }}
                        contentContainerStyle={{ alignItems: 'center', justifyContent: 'center', flex: 1 }}
                        keyboardShouldPersistTaps="handled"
                        alwaysBounceVertical={false}
                    >
                        {placeholder}
                    </ScrollView>
                )}
            </View>
            <View>
                {input}
            </View>
        </View>
    );
});
