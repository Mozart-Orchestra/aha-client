import { getServerUrl } from '@/sync/serverConfig';

const DEFAULT_PRODUCTION_API = 'https://aha-agi.com/api';
const DEFAULT_PRODUCTION_HOST = 'aha-agi.com';

function getBrowserOriginServerUrl(): string | null {
    if (typeof window === 'undefined') {
        return null;
    }

    const origin = window.location?.origin?.trim();
    const hostname = window.location?.hostname?.trim();
    if (!origin || !hostname || hostname === 'localhost' || hostname === '127.0.0.1') {
        return null;
    }
    if (hostname === DEFAULT_PRODUCTION_HOST) {
        return null;
    }

    return `${origin.replace(/\/+$/, '')}/api`;
}

function quoteShellValue(value: string): string {
    return `'${value.replace(/'/g, "'\\''")}'`;
}

export function getCliInstallAndLoginCommand(code?: string): string {
    const resolvedServerUrl = getServerUrl();
    const serverUrl = resolvedServerUrl === DEFAULT_PRODUCTION_API
        ? (getBrowserOriginServerUrl() ?? resolvedServerUrl)
        : resolvedServerUrl;
    const isNonDefault = serverUrl !== DEFAULT_PRODUCTION_API
        && !serverUrl.startsWith(DEFAULT_PRODUCTION_API);
    const loginCmd = code
        ? `npx aha auth login --code ${code}`
        : 'npx aha auth login';
    const installAndLoginCmd = `npm i aha-agi && ${loginCmd}`;

    return isNonDefault
        ? `export AHA_SERVER_URL=${quoteShellValue(serverUrl)} && ${installAndLoginCmd}`
        : installAndLoginCmd;
}
