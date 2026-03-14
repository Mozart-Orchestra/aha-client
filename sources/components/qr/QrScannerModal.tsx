import React from 'react';
import { ActivityIndicator, Text, View } from 'react-native';
import { BarcodeScanningResult, CameraView, useCameraPermissions } from 'expo-camera';
import { StyleSheet, useUnistyles } from 'react-native-unistyles';
import { Typography } from '@/constants/Typography';
import { RoundButton } from '@/components/ui/RoundButton';
import { t } from '@/text';

type QrScannerModalProps = {
    title: string;
    subtitle?: string;
    permissionMessage?: string;
    onScan: (data: string) => Promise<boolean> | boolean;
    onClose: () => void;
};

const stylesheet = StyleSheet.create((theme) => ({
    container: {
        width: '90%',
        maxWidth: 360,
        padding: 16,
        backgroundColor: theme.colors.surface,
        borderRadius: 12,
        alignItems: 'center'
    },
    title: {
        fontSize: 18,
        color: theme.colors.text,
        textAlign: 'center',
        marginBottom: 6
    },
    subtitle: {
        fontSize: 14,
        color: theme.colors.textSecondary,
        textAlign: 'center',
        marginBottom: 12,
        lineHeight: 20
    },
    cameraShell: {
        width: '100%',
        aspectRatio: 1,
        borderRadius: 12,
        overflow: 'hidden',
        borderWidth: 1,
        borderColor: theme.colors.divider,
        backgroundColor: theme.colors.surfaceHigh,
        alignItems: 'center',
        justifyContent: 'center'
    },
    camera: {
        width: '100%',
        height: '100%'
    },
    placeholder: {
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: 16
    },
    placeholderText: {
        marginTop: 10,
        fontSize: 13,
        color: theme.colors.textSecondary,
        textAlign: 'center',
        lineHeight: 18
    },
    actions: {
        width: '100%',
        marginTop: 16
    }
}));

export function QrScannerModal({ title, subtitle, permissionMessage, onScan, onClose }: QrScannerModalProps) {
    const { theme } = useUnistyles();
    const styles = stylesheet;
    const [permission, requestPermission] = useCameraPermissions();
    const [cameraAvailable, setCameraAvailable] = React.useState<boolean | null>(null);
    const [requestingPermission, setRequestingPermission] = React.useState(false);
    const processingRef = React.useRef(false);

    React.useEffect(() => {
        let active = true;
        CameraView.isAvailableAsync()
            .then((available) => {
                if (active) {
                    setCameraAvailable(available);
                }
            })
            .catch(() => {
                if (active) {
                    setCameraAvailable(false);
                }
            });

        return () => {
            active = false;
        };
    }, []);

    const handleRequestPermission = React.useCallback(async () => {
        setRequestingPermission(true);
        try {
            await requestPermission();
        } finally {
            setRequestingPermission(false);
        }
    }, [requestPermission]);

    const handleBarcodeScanned = React.useCallback(async (result: BarcodeScanningResult) => {
        if (processingRef.current) return;
        processingRef.current = true;

        try {
            const success = await onScan(result.data);
            if (success) {
                onClose();
                return;
            }
        } catch (error) {
            console.error('QR scan handling failed:', error);
        }

        processingRef.current = false;
    }, [onClose, onScan]);

    const renderCameraContent = () => {
        if (!permission || cameraAvailable === null) {
            return (
                <View style={styles.placeholder}>
                    <ActivityIndicator size="small" color={theme.colors.text} />
                    <Text style={[styles.placeholderText, Typography.default()]}>
                        {t('common.loading')}
                    </Text>
                </View>
            );
        }

        if (!permission.granted) {
            return (
                <View style={styles.placeholder}>
                    <Text style={[styles.placeholderText, Typography.default()]}>
                        {permissionMessage || t('modals.cameraPermissionsRequiredToScanQr')}
                    </Text>
                    <RoundButton
                        title={t('common.continue')}
                        size="normal"
                        onPress={handleRequestPermission}
                        loading={requestingPermission}
                    />
                </View>
            );
        }

        if (cameraAvailable === false) {
            return (
                <View style={styles.placeholder}>
                    <Text style={[styles.placeholderText, Typography.default()]}>
                        {permissionMessage || t('modals.cameraPermissionsRequiredToScanQr')}
                    </Text>
                </View>
            );
        }

        return (
            <CameraView
                style={styles.camera}
                barcodeScannerSettings={{ barcodeTypes: ['qr'] }}
                onBarcodeScanned={handleBarcodeScanned}
            />
        );
    };

    return (
        <View style={styles.container}>
            <Text style={[styles.title, Typography.default('semiBold')]}>{title}</Text>
            {subtitle && (
                <Text style={[styles.subtitle, Typography.default()]}>
                    {subtitle}
                </Text>
            )}
            <View style={styles.cameraShell}>
                {renderCameraContent()}
            </View>
            <View style={styles.actions}>
                <RoundButton
                    title={t('common.cancel')}
                    size="normal"
                    display="inverted"
                    onPress={onClose}
                />
            </View>
        </View>
    );
}
