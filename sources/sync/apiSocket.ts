import { io, type Socket } from 'socket.io-client';
import { TokenStorage } from '@/auth/tokenStorage';
import { Encryption } from './encryption/encryption';
import { getCurrentAhaTraceId, withAhaTraceHeaders } from '@/observability/traceContext';

//
// Types
//

export interface SyncSocketConfig {
    endpoint: string;
    token: string;
}

export interface SyncSocketState {
    isConnected: boolean;
    connectionStatus: 'disconnected' | 'connecting' | 'connected' | 'error';
    lastError: Error | null;
}

export type SyncSocketListener = (state: SyncSocketState) => void;

const AUTH_FAILURE_PATTERNS = [
    'authentication failed',
    'invalid token',
    'account not found for token',
    'invalid authentication token',
    'missing authentication token',
];

const RPC_ERROR_FLAG = '__ahaRpcError';
const POLLING_FALLBACK_STORAGE_KEY = 'aha:sync-socket:polling-fallback-until';
const POLLING_FALLBACK_TTL_MS = 10 * 60 * 1000;

function getErrorText(error: unknown): string {
    if (typeof error === 'string') {
        return error;
    }

    if (error instanceof Error) {
        return error.message;
    }

    if (error && typeof error === 'object') {
        const value = error as Record<string, unknown>;
        return [value.message, value.description, value.type, value.context]
            .filter((part): part is string => typeof part === 'string' && part.length > 0)
            .join(' ');
    }

    return '';
}

function isAuthFailure(error: unknown): boolean {
    const message = getErrorText(error).toLowerCase();
    return AUTH_FAILURE_PATTERNS.some(pattern => message.includes(pattern)) || /\b401\b/.test(message);
}

function isWebSocketTransportFailure(error: unknown): boolean {
    const message = getErrorText(error).toLowerCase();

    return message.includes('websocket')
        || message.includes('transport error')
        || message.includes('xhr poll error');
}

function isPollingFallbackPreferred(): boolean {
    try {
        if (typeof sessionStorage === 'undefined') {
            return false;
        }

        const rawUntil = sessionStorage.getItem(POLLING_FALLBACK_STORAGE_KEY);
        if (!rawUntil) {
            return false;
        }

        const until = Number(rawUntil);
        if (!Number.isFinite(until) || until <= Date.now()) {
            sessionStorage.removeItem(POLLING_FALLBACK_STORAGE_KEY);
            return false;
        }

        return true;
    } catch {
        return false;
    }
}

function rememberPollingFallbackPreference() {
    try {
        if (typeof sessionStorage === 'undefined') {
            return;
        }

        sessionStorage.setItem(POLLING_FALLBACK_STORAGE_KEY, String(Date.now() + POLLING_FALLBACK_TTL_MS));
    } catch {
        // Best effort only; reconnect still downgrades for this socket instance.
    }
}

function getRpcErrorMessage(payload: unknown): string | null {
    if (!payload || typeof payload !== 'object') {
        return null;
    }

    const record = payload as Record<string, unknown>;
    if (record[RPC_ERROR_FLAG] !== true) {
        return null;
    }

    return typeof record.message === 'string' && record.message.trim().length > 0
        ? record.message
        : 'RPC call failed';
}

//
// Main Class
//

export class ApiSocket {

    // State
    private socket: Socket | null = null;
    private config: SyncSocketConfig | null = null;
    private encryption: Encryption | null = null;
    private messageHandlers: Map<string, (data: any) => void> = new Map();
    private reconnectedListeners: Set<() => void> = new Set();
    private statusListeners: Set<(status: 'disconnected' | 'connecting' | 'connected' | 'error') => void> = new Set();
    private currentStatus: 'disconnected' | 'connecting' | 'connected' | 'error' = 'disconnected';
    private usePollingFallback = isPollingFallbackPreferred();

    //
    // Initialization
    //

    initialize(config: SyncSocketConfig, encryption: Encryption) {
        this.config = config;
        this.encryption = encryption;
        this.connect();
    }

    //
    // Connection Management
    //

    connect() {
        if (!this.config || this.socket) {
            return;
        }

        this.updateStatus('connecting');

        // Extract path prefix from endpoint URL (e.g. '/api' from 'https://aha-agi.com/api')
        // socket.io path is relative to the domain root, so we must prepend the prefix
        const endpointUrl = new URL(this.config.endpoint);
        const pathPrefix = endpointUrl.pathname.replace(/\/+$/, ''); // remove trailing slash
        this.socket = io(endpointUrl.origin, {
            path: `${pathPrefix}/v1/updates`,
            auth: {
                token: this.config.token,
                clientType: 'user-scoped' as const,
                traceId: getCurrentAhaTraceId(),
            },
            transports: this.usePollingFallback ? ['polling'] : ['websocket', 'polling'],
            reconnection: true,
            reconnectionDelay: 1000,
            reconnectionDelayMax: 5000,
            reconnectionAttempts: Infinity
        });

        this.setupEventHandlers();
    }

    disconnect() {
        if (this.socket) {
            this.socket.disconnect();
            this.socket = null;
        }
        this.updateStatus('disconnected');
    }

    /**
     * Manual reconnect — tears down the current socket and starts fresh.
     * Safe to call even when already disconnected.
     */
    reconnect() {
        if (this.config && this.encryption) {
            this.disconnect();
            this.connect();
        }
    }

    //
    // Listener Management
    //

    onReconnected = (listener: () => void) => {
        this.reconnectedListeners.add(listener);
        return () => this.reconnectedListeners.delete(listener);
    };

    onStatusChange = (listener: (status: 'disconnected' | 'connecting' | 'connected' | 'error') => void) => {
        this.statusListeners.add(listener);
        // Immediately notify with current status
        listener(this.currentStatus);
        return () => this.statusListeners.delete(listener);
    };

    //
    // Message Handling
    //

    onMessage(event: string, handler: (data: any) => void) {
        this.messageHandlers.set(event, handler);
        return () => this.messageHandlers.delete(event);
    }

    offMessage(event: string, handler: (data: any) => void) {
        this.messageHandlers.delete(event);
    }

    /**
     * RPC call for sessions - uses session-specific encryption
     */
    async sessionRPC<R, A>(sessionId: string, method: string, params: A): Promise<R> {
        const sessionEncryption = this.encryption!.getSessionEncryption(sessionId);
        if (!sessionEncryption) {
            throw new Error(`Session encryption not found for ${sessionId}`);
        }
        
        const result = await this.socket!.emitWithAck('rpc-call', {
            method: `${sessionId}:${method}`,
            params: await sessionEncryption.encryptRaw(params)
        });
        
        if (result.ok) {
            const payload = await sessionEncryption.decryptRaw(result.result);
            const rpcError = getRpcErrorMessage(payload);
            if (rpcError) {
                throw new Error(rpcError);
            }
            return payload as R;
        }
        throw new Error(result.error || 'RPC call failed');
    }

    /**
     * RPC call for machines - uses legacy/global encryption (for now)
     */
    async machineRPC<R, A>(machineId: string, method: string, params: A): Promise<R> {   
        const machineEncryption = this.encryption!.getMachineEncryption(machineId);
        if (!machineEncryption) {
            throw new Error(`Machine encryption not found for ${machineId}`);
        }
        
        const result = await this.socket!.emitWithAck('rpc-call', {
            method: `${machineId}:${method}`,
            params: await machineEncryption.encryptRaw(params)
        });
        
        if (result.ok) {
            const payload = await machineEncryption.decryptRaw(result.result);
            const rpcError = getRpcErrorMessage(payload);
            if (rpcError) {
                throw new Error(rpcError);
            }
            return payload as R;
        }
        throw new Error(result.error || 'RPC call failed');
    }

    send(event: string, data: any) {
        this.socket!.emit(event, data);
        return true;
    }

    async emitWithAck<T = any>(event: string, data: any): Promise<T> {
        if (!this.socket) {
            throw new Error('Socket not connected');
        }
        return await this.socket.emitWithAck(event, data);
    }

    //
    // HTTP Requests
    //

    async request(path: string, options?: RequestInit): Promise<Response> {
        if (!this.config) {
            throw new Error('SyncSocket not initialized');
        }

        const credentials = await TokenStorage.getCredentials();
        if (!credentials) {
            throw new Error('No authentication credentials');
        }

        const url = `${this.config.endpoint}${path}`;
        const headers = withAhaTraceHeaders(options?.headers);
        headers.Authorization = `Bearer ${credentials.token}`;

        return fetch(url, {
            ...options,
            headers
        });
    }

    //
    // Token Management
    //

    updateToken(newToken: string) {
        if (this.config && this.config.token !== newToken) {
            this.config.token = newToken;

            if (this.socket) {
                this.disconnect();
                this.connect();
            }
        }
    }

    //
    // Private Methods
    //

    private updateStatus(status: 'disconnected' | 'connecting' | 'connected' | 'error') {
        if (this.currentStatus !== status) {
            this.currentStatus = status;
            this.statusListeners.forEach(listener => listener(status));
        }
    }

    private setupEventHandlers() {
        const socket = this.socket;
        if (!socket) return;

        // Connection events
        socket.on('connect', () => {
            if (this.socket !== socket) {
                return;
            }

            console.log('🔌 SyncSocket: Connected, recovered: ' + socket.recovered);
            console.log('🔌 SyncSocket: Socket ID:', socket.id);
            this.updateStatus('connected');
            if (!socket.recovered) {
                this.reconnectedListeners.forEach(listener => listener());
            }
        });

        socket.on('disconnect', (reason) => {
            if (this.socket !== socket) {
                return;
            }

            console.log('🔌 SyncSocket: Disconnected', reason);
            this.updateStatus('disconnected');
        });

        // Error events
        socket.on('connect_error', (error) => {
            if (this.socket !== socket) {
                return;
            }

            console.error('🔌 SyncSocket: Connection error', error);
            // WebSocket handshake auth failures are not sufficient proof that the
            // HTTP session is invalid. On webappv3 we sometimes see a transient
            // 401 during the realtime upgrade while the freshly issued HTTP token
            // is already valid. Preserve the login session, stop the realtime
            // socket, and surface the error instead of hard-logging the user out.
            if (isAuthFailure(error)) {
                console.error('🔌 SyncSocket: Auth rejected during handshake, preserving HTTP session');
                this.disconnect();
                this.updateStatus('error');
                return;
            }

            if (!this.usePollingFallback && isWebSocketTransportFailure(error)) {
                this.reconnectWithPollingFallback(socket, error);
                return;
            }

            this.updateStatus('error');
        });

        socket.on('error', (error) => {
            if (this.socket !== socket) {
                return;
            }

            console.error('🔌 SyncSocket: Error', error);
            if (isAuthFailure(error)) {
                console.error('🔌 SyncSocket: Auth rejected via error event, preserving HTTP session');
                this.disconnect();
                this.updateStatus('error');
                return;
            }

            if (!this.usePollingFallback && isWebSocketTransportFailure(error)) {
                this.reconnectWithPollingFallback(socket, error);
                return;
            }

            this.updateStatus('error');
        });

        // Message handling
        socket.onAny((event, data) => {
            if (this.socket !== socket) {
                return;
            }

            const handler = this.messageHandlers.get(event);
            if (handler) {
                handler(data);
            } else if (event !== 'heartbeat') {
                console.warn(`📥 SyncSocket: No handler registered for '${event}'`);
            }
        });
    }

    private reconnectWithPollingFallback(socket: Socket, error: unknown) {
        console.warn('🔌 SyncSocket: WebSocket transport failed, retrying with polling fallback', error);
        this.usePollingFallback = true;
        rememberPollingFallbackPreference();
        socket.disconnect();
        if (this.socket === socket) {
            this.socket = null;
        }
        this.connect();
    }
}

//
// Singleton Export
//

export const apiSocket = new ApiSocket();
