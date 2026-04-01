import { formatSecretKeyForBackup } from '@/auth/secretKeyBackup';

export function getCliInstallAndLoginCommand(code?: string): string {
    return code
        ? `npm i aha-agi && npx aha auth login --code ${code}`
        : 'npm i aha-agi && npx aha auth login';
}

export function getCliRestoreCommand(secretBase64: string): string {
    return `npm i aha-agi && npx aha auth restore --code ${formatSecretKeyForBackup(secretBase64)}`;
}
