export function getCliInstallAndLoginCommand(code?: string): string {
    return code
        ? `npm i aha-agi && npx aha auth login --code ${code}`
        : 'npm i aha-agi && npx aha auth login';
}
