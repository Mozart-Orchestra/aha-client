import * as React from 'react';
import { Platform } from 'react-native';
import { CameraView } from 'expo-camera';
import { useAuth } from '@/auth/AuthContext';
import { decodeBase64 } from '@/encryption/base64';
import { encryptBox } from '@/encryption/libsodium';
import { authApprove } from '@/auth/authApprove';
import { useCheckScannerPermissions } from '@/hooks/useCheckCameraPermissions';
import { QrScannerModal } from '@/components/QrScannerModal';
import { Modal } from '@/modal';
import { t } from '@/text';
import { sync } from '@/sync/sync';

interface UseConnectTerminalOptions {
    onSuccess?: () => void;
    onError?: (error: any) => void;
}

export function useConnectTerminal(options?: UseConnectTerminalOptions) {
    const auth = useAuth();
    const [isLoading, setIsLoading] = React.useState(false);
    const checkScannerPermissions = useCheckScannerPermissions();

    const processAuthUrl = React.useCallback(async (url: string) => {
        console.log('[TERMINAL AUTH] 🔍 Processing terminal auth URL:', url);

        if (!url.startsWith('aha://terminal?')) {
            console.log('[TERMINAL AUTH] ❌ Invalid URL format - does not start with "aha://terminal?"');
            Modal.alert(t('common.error'), t('modals.invalidAuthUrl'), [{ text: t('common.ok') }]);
            return false;
        }

        setIsLoading(true);
        try {
            const tail = url.slice('aha://terminal?'.length);
            console.log('[TERMINAL AUTH] 📊 URL tail (base64url publicKey):', tail.substring(0, 20) + '...');

            const publicKey = decodeBase64(tail, 'base64url');
            console.log('[TERMINAL AUTH] 🔑 Decoded publicKey length:', publicKey.length);

            if (!auth.credentials?.secret) {
                console.log('[TERMINAL AUTH] ❌ No auth credentials available');
                throw new Error('No auth credentials');
            }

            const mySecret = decodeBase64(auth.credentials.secret, 'base64url');
            console.log('[TERMINAL AUTH] 🔐 My secret length:', mySecret.length);

            // V1 Response
            const responseV1 = encryptBox(mySecret, publicKey);
            console.log('[TERMINAL AUTH] 🔒 Encrypted V1 response length:', responseV1.length);

            // V2 Response
            if (!sync.encryption?.contentDataKey) {
                console.log('[TERMINAL AUTH] ❌ Missing content data key');
                throw new Error('Missing content data key');
            }

            const responseV2Bundle = new Uint8Array(sync.encryption.contentDataKey.length + 1);
            responseV2Bundle[0] = 0;
            responseV2Bundle.set(sync.encryption.contentDataKey, 1);
            const responseV2 = encryptBox(responseV2Bundle, publicKey);
            console.log('[TERMINAL AUTH] 🔒 Encrypted V2 response length:', responseV2.length);

            console.log('[TERMINAL AUTH] 📤 Sending approval to server...');
            await authApprove(auth.credentials.token, publicKey, responseV1, responseV2);

            console.log('[TERMINAL AUTH] ✅ Terminal connected successfully!');
            Modal.alert(t('common.success'), t('modals.terminalConnectedSuccessfully'), [
                {
                    text: t('common.ok'),
                    onPress: () => options?.onSuccess?.()
                }
            ]);
            return true;
        } catch (e) {
            console.error('[TERMINAL AUTH] ❌ Failed to connect terminal:', e);
            if (e instanceof Error) {
                console.error('[TERMINAL AUTH] Error message:', e.message);
                console.error('[TERMINAL AUTH] Error stack:', e.stack);
            }
            Modal.alert(t('common.error'), t('modals.failedToConnectTerminal'), [{ text: t('common.ok') }]);
            options?.onError?.(e);
            return false;
        } finally {
            setIsLoading(false);
        }
    }, [auth.credentials, options]);

    const connectTerminal = React.useCallback(async () => {
        if (Platform.OS === 'web') {
            Modal.show({
                component: QrScannerModal,
                props: {
                    title: t('settings.scanQrCodeToAuthenticate'),
                    permissionMessage: t('modals.cameraPermissionsRequiredToConnectTerminal'),
                    onScan: async (data: string) => {
                        return await processAuthUrl(data);
                    }
                }
            });
            return;
        }

        if (await checkScannerPermissions()) {
            // Use camera scanner
            CameraView.launchScanner({
                barcodeTypes: ['qr']
            });
        } else {
            Modal.alert(t('common.error'), t('modals.cameraPermissionsRequiredToConnectTerminal'), [{ text: t('common.ok') }]);
        }
    }, [checkScannerPermissions, processAuthUrl]);

    const connectWithUrl = React.useCallback(async (url: string) => {
        return await processAuthUrl(url);
    }, [processAuthUrl]);

    // Set up barcode scanner listener
    React.useEffect(() => {
        if (CameraView.isModernBarcodeScannerAvailable) {
            const subscription = CameraView.onModernBarcodeScanned(async (event) => {
                if (event.data.startsWith('aha://terminal?')) {
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
        connectTerminal,
        connectWithUrl,
        isLoading,
        processAuthUrl
    };
}
