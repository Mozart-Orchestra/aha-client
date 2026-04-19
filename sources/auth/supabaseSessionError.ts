export type SupabaseSessionErrorLike = {
    message?: string | null;
    status?: number | string | null;
    code?: number | string | null;
} | null | undefined;

export function shouldClearSupabaseSessionError(error: SupabaseSessionErrorLike): boolean {
    if (!error) {
        return false;
    }

    const status = Number(error.status ?? error.code ?? NaN);
    if (status === 401) {
        return true;
    }

    const message = `${error.message ?? ''}`.toLowerCase();
    return message.includes('invalid api key') || message.includes('refresh token');
}
