import * as React from 'react';
import { ActivityIndicator, Platform, Pressable, StyleProp, Text, TextStyle, View, ViewStyle } from 'react-native';
import { iOSUIKit } from 'react-native-typography';
import { Typography } from '@/constants/Typography';
import { StyleSheet, useUnistyles } from 'react-native-unistyles';
import { LinearGradient } from 'expo-linear-gradient';

export type RoundButtonSize = 'large' | 'normal' | 'small';
const sizes: { [key in RoundButtonSize]: { height: number, fontSize: number, hitSlop: number, pad: number } } = {
    large: { height: 48, fontSize: 21, hitSlop: 0, pad: Platform.OS == 'ios' ? 0 : -1 },
    normal: { height: 32, fontSize: 16, hitSlop: 8, pad: Platform.OS == 'ios' ? 1 : -2 },
    small: { height: 24, fontSize: 14, hitSlop: 12, pad: Platform.OS == 'ios' ? -1 : -1 }
}

export type RoundButtonDisplay = 'default' | 'inverted';

const stylesheet = StyleSheet.create((theme) => ({
    loadingContainer: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        alignItems: 'center',
        justifyContent: 'center',
    },
    contentContainer: {
        alignItems: 'center',
        justifyContent: 'center',
        minWidth: 64,
        paddingHorizontal: 16,
        borderRadius: 9999,
    },
    text: {
        ...Typography.default('semiBold'),
        fontWeight: '600',
        includeFontPadding: false,
    },
    gradient: {
        flex: 1,
        borderRadius: 9999,
    },
    buttonShadow: {
        shadowColor: theme.colors.shadowColor || '#000000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: theme.colors.shadowOpacity || 0.1,
        shadowRadius: 8,
        elevation: 4,
    },
}));

export const RoundButton = React.memo((props: { size?: RoundButtonSize, display?: RoundButtonDisplay, title?: any, style?: StyleProp<ViewStyle>, textStyle?: StyleProp<TextStyle>, disabled?: boolean, loading?: boolean, onPress?: () => void, action?: () => Promise<any>, useGradient?: boolean }) => {
    const { theme } = useUnistyles();
    const styles = stylesheet;
    const [loading, setLoading] = React.useState(false);
    const doLoading = props.loading !== undefined ? props.loading : loading;
    const doAction = React.useCallback(() => {
        if (props.onPress) {
            props.onPress();
            return;
        }
        if (props.action) {
            setLoading(true);
            (async () => {
                try {
                    await props.action!();
                } finally {
                    setLoading(false);
                }
            })();
        }
    }, [props.onPress, props.action]);
    const displays: { [key in RoundButtonDisplay]: {
        textColor: string,
        backgroundColor: string,
        borderColor: string,
        gradientStart?: string,
        gradientEnd?: string,
    } } = {
        default: {
            backgroundColor: theme.colors.primary,
            borderColor: 'transparent',
            textColor: theme.colors.onPrimary,
            gradientStart: theme.colors.gradientStart || theme.colors.primary,
            gradientEnd: theme.colors.gradientEnd || theme.colors.primary,
        },
        inverted: {
            backgroundColor: 'transparent',
            borderColor: 'transparent',
            textColor: theme.colors.onBackground,
        }
    }

    const size = sizes[props.size || 'large'];
    const display = displays[props.display || 'default'];
    const useGradient = props.useGradient !== undefined ? props.useGradient : props.display !== 'inverted';

    return (
        <Pressable
            disabled={doLoading || props.disabled}
            hitSlop={size.hitSlop}
            style={(p) => ([
                styles.buttonShadow,
                {
                    borderWidth: 1,
                    borderRadius: size.height / 2,
                    backgroundColor: display.backgroundColor,
                    borderColor: display.borderColor,
                    opacity: props.disabled ? 0.5 : 1,
                    overflow: 'hidden',
                    transform: [{ scale: p.pressed ? 0.97 : 1 }],
                },
                props.style])}
            onPress={doAction}
        >
            {useGradient && props.display !== 'inverted' ? (
                <LinearGradient
                    colors={[display.gradientStart || display.backgroundColor, display.gradientEnd || display.backgroundColor]}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={[
                        styles.contentContainer,
                        styles.gradient,
                        { height: size.height }
                    ]}
                >
                    {doLoading && (
                        <View style={styles.loadingContainer}>
                            <ActivityIndicator color={display.textColor} size='small' />
                        </View>
                    )}
                    <Text
                        style={[
                            iOSUIKit.title3,
                            styles.text,
                            {
                                marginTop: size.pad,
                                opacity: doLoading ? 0 : 1,
                                color: display.textColor,
                                fontSize: size.fontSize,
                            },
                            props.textStyle
                        ]}
                        numberOfLines={1}
                    >
                        {props.title}
                    </Text>
                </LinearGradient>
            ) : (
                <View
                    style={[
                        styles.contentContainer,
                        { height: size.height - 2 }
                    ]}
                >
                    {doLoading && (
                        <View style={styles.loadingContainer}>
                            <ActivityIndicator color={display.textColor} size='small' />
                        </View>
                    )}
                    <Text
                        style={[
                            iOSUIKit.title3,
                            styles.text,
                            {
                                marginTop: size.pad,
                                opacity: doLoading ? 0 : 1,
                                color: display.textColor,
                                fontSize: size.fontSize,
                            },
                            props.textStyle
                        ]}
                        numberOfLines={1}
                    >
                        {props.title}
                    </Text>
                </View>
            )}
        </Pressable>
    )
});