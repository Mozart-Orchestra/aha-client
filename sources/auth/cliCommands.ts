import { getServerUrl } from '@/sync/serverConfig';

const DEFAULT_PRODUCTION_API = 'https://ahaagi.com/api';

export function getCliInstallAndLoginCommand(code?: string): string {
    const serverUrl = getServerUrl();
    const isNonDefault = serverUrl !== DEFAULT_PRODUCTION_API
        && !serverUrl.startsWith(DEFAULT_PRODUCTION_API);
    const envPrefix = isNonDefault ? `AHA_SERVER_URL=${serverUrl} ` : '';
    const loginCmd = code
        ? `${envPrefix}npx aha auth login --code ${code}`
        : `${envPrefix}npx aha auth login`;
    return `npm i aha-agi && ${loginCmd}`;
}
