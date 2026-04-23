import { getServerUrl } from '@/sync/serverConfig';

const DEFAULT_PRODUCTION_API = 'https://aha-agi.com/api';
const DEFAULT_PRODUCTION_HOST = 'aha-agi.com';
const DEFAULT_WEBAPP_PATH = '/webappv3';

type CliServerConfig = {
    serverUrl: string;
    webappUrl: string;
};

function normalizeConfiguredUrl(value?: string): string | null {
    const trimmed = value?.trim();
    return trimmed ? trimmed.replace(/\/+$/, '') : null;
}

function deriveServerUrlFromWebappUrl(webappUrl: string): string {
    try {
        const parsed = new URL(webappUrl);
        return `${parsed.origin}/api`;
    } catch {
        return webappUrl.replace(new RegExp(`${DEFAULT_WEBAPP_PATH}/?$`), '/api');
    }
}

function getDeploymentCliServerConfig(): CliServerConfig | null {
    const serverUrl = normalizeConfiguredUrl(process.env.EXPO_PUBLIC_AHA_CLI_SERVER_URL);
    const webappUrl = normalizeConfiguredUrl(process.env.EXPO_PUBLIC_AHA_CLI_WEBAPP_URL);

    if (!serverUrl && !webappUrl) {
        return null;
    }

    return {
        serverUrl: serverUrl ?? deriveServerUrlFromWebappUrl(webappUrl!),
        webappUrl: webappUrl ?? deriveWebappUrlFromServerUrl(serverUrl!),
    };
}

function getBrowserServerConfig(): CliServerConfig | null {
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

    const normalizedOrigin = origin.replace(/\/+$/, '');
    const pathname = window.location?.pathname?.trim() || '';
    const webappPath = pathname.startsWith(DEFAULT_WEBAPP_PATH) ? DEFAULT_WEBAPP_PATH : '';

    return {
        serverUrl: `${normalizedOrigin}/api`,
        webappUrl: `${normalizedOrigin}${webappPath}`,
    };
}

function deriveWebappUrlFromServerUrl(serverUrl: string): string {
    try {
        const parsed = new URL(serverUrl);
        return `${parsed.origin}${DEFAULT_WEBAPP_PATH}`;
    } catch {
        return serverUrl.replace(/\/api\/?$/, DEFAULT_WEBAPP_PATH);
    }
}

function quoteShellValue(value: string): string {
    return `'${value.replace(/'/g, "'\\''")}'`;
}

function getPersistServerConfigCommand(config: CliServerConfig): string {
    const payload = JSON.stringify(config);
    const script = [
        "const fs=require('fs'),os=require('os'),path=require('path');",
        "const dir=path.join(os.homedir(),'.aha');",
        "const file=path.join(dir,'config.json');",
        'fs.mkdirSync(dir,{recursive:true});',
        'let config={};',
        "try{config=JSON.parse(fs.readFileSync(file,'utf8'))}catch{}",
        `Object.assign(config,${payload});`,
        "fs.writeFileSync(file,JSON.stringify(config,null,2)+'\\n');",
    ].join('');

    return `node -e ${quoteShellValue(script)}`;
}

export function getCliInstallAndLoginCommand(code?: string): string {
    const deploymentConfig = getDeploymentCliServerConfig();
    const resolvedServerUrl = getServerUrl();
    const browserConfig = !deploymentConfig && resolvedServerUrl === DEFAULT_PRODUCTION_API
        ? getBrowserServerConfig()
        : null;
    const serverUrl = deploymentConfig?.serverUrl ?? browserConfig?.serverUrl ?? resolvedServerUrl;
    const webappUrl = deploymentConfig?.webappUrl ?? browserConfig?.webappUrl ?? deriveWebappUrlFromServerUrl(serverUrl);
    const isNonDefault = serverUrl !== DEFAULT_PRODUCTION_API
        && !serverUrl.startsWith(DEFAULT_PRODUCTION_API);
    const shouldPersistServerConfig = !!deploymentConfig || isNonDefault;
    const loginCmd = code
        ? `npx aha auth login --code ${code}`
        : 'npx aha auth login';
    const installAndLoginCmd = `npm i aha-agi && ${loginCmd}`;

    return shouldPersistServerConfig
        ? `${getPersistServerConfigCommand({ serverUrl, webappUrl })} && ${installAndLoginCmd}`
        : installAndLoginCmd;
}
