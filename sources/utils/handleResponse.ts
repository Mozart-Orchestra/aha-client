import { NonRetryableError } from '@/utils/time';
import { getCurrentAuth } from '@/auth/AuthContext';

/**
 * Check fetch response for 401 auth failures.
 *
 * On 401 with current token: triggers auto-logout and throws NonRetryableError.
 * On 401 with stale token (token was already refreshed): only throws NonRetryableError
 * to stop the backoff loop without logging out — the new token is already in use.
 *
 * @param response - fetch Response object
 * @param requestToken - the token that was used in this request's Authorization header
 */
export function checkAuth(response: Response, requestToken?: string): void {
    if (response.status === 401) {
        const auth = getCurrentAuth();
        if (auth) {
            // If we know the request token and it differs from the current one,
            // the token was already refreshed — don't logout, just stop retrying.
            const isStaleToken = requestToken && auth.credentials && auth.credentials.token !== requestToken;
            if (!isStaleToken) {
                auth.logout();
            }
        }
        throw new NonRetryableError('Unauthorized');
    }
}
