function parseBooleanEnv(value: string | undefined): boolean {
    return ['1', 'true', 'yes', 'on'].includes((value ?? '').trim().toLowerCase());
}

export function isInvitationGateEnabled(
    envValue = process.env.EXPO_PUBLIC_INVITATION_GATE_ENABLED,
): boolean {
    return parseBooleanEnv(envValue);
}
