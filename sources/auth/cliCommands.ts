import { formatSecretKeyForBackup } from '@/auth/secretKeyBackup';

export function getCliInstallAndLoginCommand(): string {
    return 'npm i aha-agi && npx aha auth login';
}

export function getCliRestoreCommand(secretBase64: string): string {
    return `npm i aha-agi && npx aha auth restore --code ${formatSecretKeyForBackup(secretBase64)}`;
}
