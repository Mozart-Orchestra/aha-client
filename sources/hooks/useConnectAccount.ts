import * as React from 'react';
import { Platform } from 'react-native';
import { CameraView } from 'expo-camera';
import { useAuth } from '@/auth/AuthContext';
import { decodeBase64 } from '@/encryption/base64';
import { encryptBox } from '@/encryption/libsodium';
import { authAccountApprove } from '@/auth/authAccountApprove';
import { useCheckScannerPermissions } from '@/hooks/useCheckCameraPermissions';
import { QrScannerModal } from '@/components/QrScannerModal';
import { Modal } from '@/modal';
import { t } from '@/text';

interface UseConnectAccountOptions {
    onSuccess?: () => void;
    onError?: (error: any) => void;
}

export function useConnectAccount(options?: UseConnectAccountOptions) {
    const auth = useAuth();
    const [isLoading, setIsLoading] = React.useState(false);
    const checkScannerPermissions = useCheckScannerPermissions();

    const processAuthUrl = React.useCallback(async (url: string) => {
        console.log('[AUTH] 🔍 Processing auth URL:', url);

        if (!url.startsWith('happy:///account?')) {
            console.log('[AUTH] ❌ Invalid URL format - does not start with "happy:///account?"');
            console.log('[AUTH] URL received:', url);
            Modal.alert(t('common.error'), t('modals.invalidAuthUrl'), [{ text: t('common.ok') }]);
            return false;
        }

        setIsLoading(true);
        try {
            const tail = url.slice('happy:///account?'.length);
            console.log('[AUTH] 📊 URL tail (base64url publicKey):', tail.substring(0, 20) + '...');

            const publicKey = decodeBase64(tail, 'base64url');
            console.log('[AUTH] 🔑 Decoded publicKey length:', publicKey.length);
            console.log('[AUTH] 🔑 PublicKey first 10 bytes:', Array.from(publicKey.slice(0, 10)));

            if (!auth.credentials?.secret) {
                console.log('[AUTH] ❌ No auth credentials available');
                throw new Error('No auth credentials');
            }

            const mySecret = decodeBase64(auth.credentials.secret, 'base64url');
            console.log('[AUTH] 🔐 My secret length:', mySecret.length);

            const response = encryptBox(mySecret, publicKey);
            console.log('[AUTH] 🔒 Encrypted response length:', response.length);

            console.log('[AUTH] 📤 Sending approval to server...');
            await authAccountApprove(auth.credentials.token, publicKey, response);

            console.log('[AUTH] ✅ Device linked successfully!');
            Modal.alert(t('common.success'), t('modals.deviceLinkedSuccessfully'), [
                {
                    text: t('common.ok'),
                    onPress: () => options?.onSuccess?.()
                }
            ]);
            return true;
        } catch (e) {
            console.error('[AUTH] ❌ Failed to link device:', e);
            if (e instanceof Error) {
                console.error('[AUTH] Error message:', e.message);
                console.error('[AUTH] Error stack:', e.stack);
            }
            Modal.alert(t('common.error'), t('modals.failedToLinkDevice'), [{ text: t('common.ok') }]);
            options?.onError?.(e);
            return false;
        } finally {
            setIsLoading(false);
        }
    }, [auth.credentials, options]);

    const showScannerModal = React.useCallback(() => {
        Modal.show({
            component: QrScannerModal,
            props: {
                title: t('settingsAccount.linkNewDevice'),
                subtitle: t('settingsAccount.linkNewDeviceSubtitle'),
                permissionMessage: t('modals.cameraPermissionsRequiredToScanQr'),
                onScan: async (data: string) => {
                    return await processAuthUrl(data);
                }
            }
        });
    }, [processAuthUrl]);

    const connectAccount = React.useCallback(async () => {
        if (Platform.OS === 'web') {
            showScannerModal();
            return;
        }

        if (!CameraView.isModernBarcodeScannerAvailable) {
            showScannerModal();
            return;
        }

        if (await checkScannerPermissions()) {
            // Use camera scanner
            CameraView.launchScanner({
                barcodeTypes: ['qr']
            });
        } else {
            Modal.alert(t('common.error'), t('modals.cameraPermissionsRequiredToScanQr'), [{ text: t('common.ok') }]);
        }
    }, [checkScannerPermissions, showScannerModal]);

    const connectWithUrl = React.useCallback(async (url: string) => {
        return await processAuthUrl(url);
    }, [processAuthUrl]);

    // Set up barcode scanner listener
    React.useEffect(() => {
        if (Platform.OS !== 'web' && CameraView.isModernBarcodeScannerAvailable) {
            const subscription = CameraView.onModernBarcodeScanned(async (event) => {
                if (event.data.startsWith('happy:///account?')) {
                    // Dismiss scanner on Android is called automatically when barcode is scanned
                    if (Platform.OS === 'ios') {
                        await CameraView.dismissScanner();
                    }
                    await processAuthUrl(event.data);
                }
            });
            return () => {
                subscription.remove();
            };
        }
    }, [processAuthUrl]);

    return {
        connectAccount,
        connectWithUrl,
        isLoading,
        processAuthUrl
    };
}
