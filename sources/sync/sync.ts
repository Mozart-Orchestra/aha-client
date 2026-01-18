import Constants from 'expo-constants';
import { apiSocket } from '@/sync/apiSocket';
import { AuthCredentials } from '@/auth/tokenStorage';
import { Encryption } from '@/sync/encryption/encryption';
import { decodeBase64, encodeBase64 } from '@/encryption/base64';
import { storage } from './storage';
import { ApiEphemeralUpdateSchema, ApiMessage, ApiUpdateContainerSchema } from './apiTypes';
import type { ApiEphemeralActivityUpdate } from './apiTypes';
import { Session, Machine } from './storageTypes';
import { InvalidateSync } from '@/utils/sync';
import { SessionEncryption } from './encryption/sessionEncryption';
import { ActivityUpdateAccumulator } from './reducer/activityUpdateAccumulator';
import { randomUUID } from 'expo-crypto';
import * as Notifications from 'expo-notifications';
import { registerPushToken } from './apiPush';
import { Platform, AppState } from 'react-native';
import { isRunningOnMac } from '@/utils/platform';
import { NormalizedMessage, normalizeRawMessage, RawRecord } from './typesRaw';
import { applySettings, Settings, settingsDefaults, settingsParse } from './settings';
import { Profile, profileParse } from './profile';
import { loadPendingSettings, savePendingSettings } from './persistence';
import { initializeTracking, tracking } from '@/track';
import { parseToken } from '@/utils/parseToken';
import { RevenueCat, LogLevel, PaywallResult } from './revenueCat';
import { trackPaywallPresented, trackPaywallPurchased, trackPaywallCancelled, trackPaywallRestored, trackPaywallError } from '@/track';
import { getServerUrl } from './serverConfig';
import { config } from '@/config';
import { log } from '@/log';
import { gitStatusSync } from './gitStatusSync';
import { projectManager } from './projectManager';
import { voiceHooks } from '@/realtime/hooks/voiceHooks';
import { Message } from './typesMessage';
import { EncryptionCache } from './encryption/encryptionCache';
import { systemPrompt } from './prompt/systemPrompt';
import { fetchArtifact, fetchArtifacts, createArtifact, updateArtifact, deleteArtifact } from './apiArtifacts';
import { DecryptedArtifact, Artifact, ArtifactCreateRequest, ArtifactUpdateRequest } from './artifactTypes';
import { ArtifactEncryption } from './encryption/artifactEncryption';
import { getFriendsList, getUserProfile } from './apiFriends';
import { fetchFeed } from './apiFeed';
import { FeedItem } from './feedTypes';
import { UserProfile } from './friendTypes';
import { initializeTodoSync } from '../-zen/model/ops';
import { Mutex } from '@/utils/asyncMutex';

class Sync {

    encryption!: Encryption;
    serverID!: string;
    anonID!: string;
    private credentials!: AuthCredentials;
    public encryptionCache = new EncryptionCache();
    private sessionsSync: InvalidateSync;
    private messagesSync = new Map<string, InvalidateSync>();
    private sessionReceivedMessages = new Map<string, Set<string>>();
    private sessionDataKeys = new Map<string, Uint8Array>(); // Store session data encryption keys internally
    private machineDataKeys = new Map<string, Uint8Array>(); // Store machine data encryption keys internally
    private artifactDataKeys = new Map<string, Uint8Array>(); // Store artifact data encryption keys internally
    private settingsSync: InvalidateSync;
    private profileSync: InvalidateSync;
    private purchasesSync: InvalidateSync;
    private machinesSync: InvalidateSync;
    private pushTokenSync: InvalidateSync;
    private nativeUpdateSync: InvalidateSync;
    private artifactsSync: InvalidateSync;
    private friendsSync: InvalidateSync;
    private friendRequestsSync: InvalidateSync;
    private feedSync: InvalidateSync;
    private todosSync: InvalidateSync;
    private activityAccumulator: ActivityUpdateAccumulator;
    private pendingSettings: Partial<Settings> = loadPendingSettings();
    revenueCatInitialized = false;

    // Team messaging
    private teamMessagesCache = new Map<string, import('@/sync/teamMessageTypes').TeamMessage[]>();
    private teamMessageSubscriptions = new Map<string, Set<(message: import('@/sync/teamMessageTypes').TeamMessage) => void>>();

    // Mutex locks for protecting team messaging Maps from concurrent access
    private teamMessagesMutexes = new Map<string, Mutex>();
    private teamSubscriptionsMutexes = new Map<string, Mutex>();

    // Generic locking mechanism
    private recalculationLockCount = 0;
    private lastRecalculationTime = 0;

    /**
     * Get or create a mutex for a specific teamId's message cache
     */
    private getTeamMessagesMutex(teamId: string): Mutex {
        if (!this.teamMessagesMutexes.has(teamId)) {
            this.teamMessagesMutexes.set(teamId, new Mutex());
        }
        return this.teamMessagesMutexes.get(teamId)!;
    }

    /**
     * Get or create a mutex for a specific teamId's subscription set
     */
    private getTeamSubscriptionsMutex(teamId: string): Mutex {
        if (!this.teamSubscriptionsMutexes.has(teamId)) {
            this.teamSubscriptionsMutexes.set(teamId, new Mutex());
        }
        return this.teamSubscriptionsMutexes.get(teamId)!;
    }

    constructor() {
        this.sessionsSync = new InvalidateSync(this.fetchSessions);
        this.settingsSync = new InvalidateSync(this.syncSettings);
        this.profileSync = new InvalidateSync(this.fetchProfile);
        this.purchasesSync = new InvalidateSync(this.syncPurchases);
        this.machinesSync = new InvalidateSync(this.fetchMachines);
        this.nativeUpdateSync = new InvalidateSync(this.fetchNativeUpdate);
        this.artifactsSync = new InvalidateSync(this.fetchArtifactsList);
        this.friendsSync = new InvalidateSync(this.fetchFriends);
        this.friendRequestsSync = new InvalidateSync(this.fetchFriendRequests);
        this.feedSync = new InvalidateSync(this.fetchFeed);
        this.todosSync = new InvalidateSync(this.fetchTodos);

        const registerPushToken = async () => {
            if (__DEV__) {
                return;
            }
            await this.registerPushToken();
        }
        this.pushTokenSync = new InvalidateSync(registerPushToken);
        this.activityAccumulator = new ActivityUpdateAccumulator(this.flushActivityUpdates.bind(this), 2000);

        // Listen for app state changes to refresh purchases
        AppState.addEventListener('change', (nextAppState) => {
            if (nextAppState === 'active') {
                log.log('📱 App became active');
                this.purchasesSync.invalidate();
                this.profileSync.invalidate();
                this.machinesSync.invalidate();
                this.pushTokenSync.invalidate();
                this.sessionsSync.invalidate();
                this.nativeUpdateSync.invalidate();
                log.log('📱 App became active: Invalidating artifacts sync');
                this.artifactsSync.invalidate();
                this.friendsSync.invalidate();
                this.friendRequestsSync.invalidate();
                this.feedSync.invalidate();
                this.todosSync.invalidate();
            } else {
                log.log(`📱 App state changed to: ${nextAppState}`);
            }
        });
    }

    async create(credentials: AuthCredentials, encryption: Encryption) {
        this.credentials = credentials;
        this.encryption = encryption;
        this.anonID = encryption.anonID;
        this.serverID = parseToken(credentials.token);
        await this.#init();

        // Await settings sync to have fresh settings
        await this.settingsSync.awaitQueue();

        // Await profile sync to have fresh profile
        await this.profileSync.awaitQueue();

        // Await purchases sync to have fresh purchases
        await this.purchasesSync.awaitQueue();
    }

    async restore(credentials: AuthCredentials, encryption: Encryption) {
        // NOTE: No awaiting anything here, we're restoring from a disk (ie app restarted)
        this.credentials = credentials;
        this.encryption = encryption;
        this.anonID = encryption.anonID;
        this.serverID = parseToken(credentials.token);
        await this.#init();
    }

    async #init() {

        // Subscribe to updates
        this.subscribeToUpdates();

        // Sync initial PostHog opt-out state with stored settings
        if (tracking) {
            const currentSettings = storage.getState().settings;
            if (currentSettings.analyticsOptOut) {
                tracking.optOut();
            } else {
                tracking.optIn();
            }
        }

        // Invalidate sync
        log.log('🔄 #init: Invalidating all syncs');
        this.sessionsSync.invalidate();
        this.settingsSync.invalidate();
        this.profileSync.invalidate();
        this.purchasesSync.invalidate();
        this.machinesSync.invalidate();
        this.pushTokenSync.invalidate();
        this.nativeUpdateSync.invalidate();
        this.friendsSync.invalidate();
        this.friendRequestsSync.invalidate();
        this.artifactsSync.invalidate();
        this.feedSync.invalidate();
        this.todosSync.invalidate();
        log.log('🔄 #init: All syncs invalidated, including artifacts and todos');

        // Wait for both sessions and machines to load, then mark as ready
        Promise.all([
            this.sessionsSync.awaitQueue(),
            this.machinesSync.awaitQueue()
        ]).then(() => {
            storage.getState().applyReady();
        }).catch((error) => {
            console.error('Failed to load initial data:', error);
        });
    }


    onSessionVisible = (sessionId: string) => {
        let ex = this.messagesSync.get(sessionId);
        if (!ex) {
            ex = new InvalidateSync(() => this.fetchMessages(sessionId));
            this.messagesSync.set(sessionId, ex);
        }
        ex.invalidate();

        // Also invalidate git status sync for this session
        gitStatusSync.getSync(sessionId).invalidate();

        // Notify voice assistant about session visibility
        const session = storage.getState().sessions[sessionId];
        if (session) {
            voiceHooks.onSessionFocus(sessionId, session.metadata || undefined);
        }
    }


    async sendMessage(sessionId: string, text: string, displayText?: string) {

        // Get encryption
        const encryption = this.encryption.getSessionEncryption(sessionId);
        if (!encryption) { // Should never happen
            console.error(`Session ${sessionId} not found`);
            return;
        }

        // Get session data from storage
        const session = storage.getState().sessions[sessionId];
        if (!session) {
            console.error(`Session ${sessionId} not found in storage`);
            return;
        }

        // Read permission mode and model mode from session state
        const permissionMode = session.permissionMode || 'bypassPermissions';
        const modelMode = session.modelMode || 'default';

        // Generate local ID
        const localId = randomUUID();

        // Determine sentFrom based on platform
        let sentFrom: string;
        if (Platform.OS === 'web') {
            sentFrom = 'web';
        } else if (Platform.OS === 'android') {
            sentFrom = 'android';
        } else if (Platform.OS === 'ios') {
            // Check if running on Mac (Catalyst or Designed for iPad on Mac)
            if (isRunningOnMac()) {
                sentFrom = 'mac';
            } else {
                sentFrom = 'ios';
            }
        } else {
            sentFrom = 'web'; // fallback
        }

        // Resolve model settings based on modelMode
        let model: string | null = null;
        let fallbackModel: string | null = null;

        switch (modelMode) {
            case 'default':
                model = null;
                fallbackModel = null;
                break;
            case 'adaptiveUsage':
                model = 'claude-opus-4-1-20250805';
                fallbackModel = 'claude-sonnet-4-5-20250929';
                break;
            case 'sonnet':
                model = 'claude-sonnet-4-5-20250929';
                fallbackModel = null;
                break;
            case 'opus':
                model = 'claude-opus-4-1-20250805';
                fallbackModel = null;
                break;
            default:
                // If no modelMode is specified, use default behavior (let server decide)
                model = null;
                fallbackModel = null;
                break;
        }

        // Create user message content with metadata
        const content: RawRecord = {
            role: 'user',
            content: {
                type: 'text',
                text
            },
            meta: {
                sentFrom,
                permissionMode: permissionMode || 'bypassPermissions',
                model,
                fallbackModel,
                appendSystemPrompt: systemPrompt,
                ...(displayText && { displayText }) // Add displayText if provided
            }
        };
        const encryptedRawRecord = await encryption.encryptRawRecord(content);

        // Add to messages - normalize the raw record
        const createdAt = Date.now();
        const normalizedMessage = normalizeRawMessage(localId, localId, createdAt, content);
        if (normalizedMessage) {
            this.applyMessages(sessionId, [normalizedMessage]);
        }

        // Send message with optional permission mode and source identifier
        apiSocket.send('message', {
            sid: sessionId,
            message: encryptedRawRecord,
            localId,
            sentFrom,
            permissionMode: permissionMode || 'bypassPermissions'
        });
    }

    applySettings = (delta: Partial<Settings>) => {
        storage.getState().applySettingsLocal(delta);

        // Save pending settings
        this.pendingSettings = { ...this.pendingSettings, ...delta };
        savePendingSettings(this.pendingSettings);

        // Sync PostHog opt-out state if it was changed
        if (tracking && 'analyticsOptOut' in delta) {
            const currentSettings = storage.getState().settings;
            if (currentSettings.analyticsOptOut) {
                tracking.optOut();
            } else {
                tracking.optIn();
            }
        }

        // Invalidate settings sync
        this.settingsSync.invalidate();
    }

    refreshPurchases = () => {
        this.purchasesSync.invalidate();
    }

    refreshProfile = async () => {
        await this.profileSync.invalidateAndAwait();
    }

    purchaseProduct = async (productId: string): Promise<{ success: boolean; error?: string }> => {
        try {
            // Check if RevenueCat is initialized
            if (!this.revenueCatInitialized) {
                return { success: false, error: 'RevenueCat not initialized' };
            }

            // Fetch the product
            const products = await RevenueCat.getProducts([productId]);
            if (products.length === 0) {
                return { success: false, error: `Product '${productId}' not found` };
            }

            // Purchase the product
            const product = products[0];
            const { customerInfo } = await RevenueCat.purchaseStoreProduct(product);

            // Update local purchases data
            storage.getState().applyPurchases(customerInfo);

            return { success: true };
        } catch (error: any) {
            // Check if user cancelled
            if (error.userCancelled) {
                return { success: false, error: 'Purchase cancelled' };
            }

            // Return the error message
            return { success: false, error: error.message || 'Purchase failed' };
        }
    }

    getOfferings = async (): Promise<{ success: boolean; offerings?: any; error?: string }> => {
        try {
            // Check if RevenueCat is initialized
            if (!this.revenueCatInitialized) {
                return { success: false, error: 'RevenueCat not initialized' };
            }

            // Fetch offerings
            const offerings = await RevenueCat.getOfferings();

            // Return the offerings data
            return {
                success: true,
                offerings: {
                    current: offerings.current,
                    all: offerings.all
                }
            };
        } catch (error: any) {
            return { success: false, error: error.message || 'Failed to fetch offerings' };
        }
    }

    presentPaywall = async (): Promise<{ success: boolean; purchased?: boolean; error?: string }> => {
        try {
            // Check if RevenueCat is initialized
            if (!this.revenueCatInitialized) {
                const error = 'RevenueCat not initialized';
                trackPaywallError(error);
                return { success: false, error };
            }

            // Track paywall presentation
            trackPaywallPresented();

            // Present the paywall
            const result = await RevenueCat.presentPaywall();

            // Handle the result
            switch (result) {
                case PaywallResult.PURCHASED:
                    trackPaywallPurchased();
                    // Refresh customer info after purchase
                    await this.syncPurchases();
                    return { success: true, purchased: true };
                case PaywallResult.RESTORED:
                    trackPaywallRestored();
                    // Refresh customer info after restore
                    await this.syncPurchases();
                    return { success: true, purchased: true };
                case PaywallResult.CANCELLED:
                    trackPaywallCancelled();
                    return { success: true, purchased: false };
                case PaywallResult.NOT_PRESENTED:
                    // Don't track error for NOT_PRESENTED as it's a platform limitation
                    return { success: false, error: 'Paywall not available on this platform' };
                case PaywallResult.ERROR:
                default:
                    const errorMsg = 'Failed to present paywall';
                    trackPaywallError(errorMsg);
                    return { success: false, error: errorMsg };
            }
        } catch (error: any) {
            const errorMessage = error.message || 'Failed to present paywall';
            trackPaywallError(errorMessage);
            return { success: false, error: errorMessage };
        }
    }

    async assumeUsers(userIds: string[]): Promise<void> {
        if (!this.credentials || userIds.length === 0) return;

        const state = storage.getState();
        // Filter out users we already have in cache (including null for 404s)
        const missingIds = userIds.filter(id => !(id in state.users));

        if (missingIds.length === 0) return;

        log.log(`👤 Fetching ${missingIds.length} missing users...`);

        // Fetch missing users in parallel
        const results = await Promise.all(
            missingIds.map(async (id) => {
                try {
                    const profile = await getUserProfile(this.credentials!, id);
                    return { id, profile };  // profile is null if 404
                } catch (error) {
                    console.error(`Failed to fetch user ${id}:`, error);
                    return { id, profile: null };  // Treat errors as 404
                }
            })
        );

        // Convert to Record<string, UserProfile | null>
        const usersMap: Record<string, UserProfile | null> = {};
        results.forEach(({ id, profile }) => {
            usersMap[id] = profile;
        });

        storage.getState().applyUsers(usersMap);
        log.log(`👤 Applied ${results.length} users to cache (${results.filter(r => r.profile).length} found, ${results.filter(r => !r.profile).length} not found)`);
    }

    //
    // Private
    //

    private fetchSessions = async () => {
        if (!this.credentials) return;

        const API_ENDPOINT = getServerUrl();
        const response = await fetch(`${API_ENDPOINT}/v1/sessions`, {
            headers: {
                'Authorization': `Bearer ${this.credentials.token}`,
                'Content-Type': 'application/json'
            }
        });

        if (!response.ok) {
            throw new Error(`Failed to fetch sessions: ${response.status}`);
        }

        const data = await response.json();
        const sessions = data.sessions as Array<{
            id: string;
            tag: string;
            seq: number;
            metadata: string;
            metadataVersion: number;
            agentState: string | null;
            agentStateVersion: number;
            dataEncryptionKey: string | null;
            active: boolean;
            activeAt: number;
            createdAt: number;
            updatedAt: number;
            lastMessage: ApiMessage | null;
        }>;

        // Initialize all session encryptions first
        const sessionKeys = new Map<string, Uint8Array | null>();
        const results = await Promise.allSettled(
            sessions.map(async (session) => {
                if (!session.dataEncryptionKey) {
                    return { sessionId: session.id, key: null };
                }
                try {
                    const decrypted = await this.encryption.decryptEncryptionKey(session.dataEncryptionKey);
                    if (!decrypted) {
                        console.error(`Failed to decrypt data encryption key for session ${session.id}`);
                        return { sessionId: session.id, key: null };
                    }
                    return { sessionId: session.id, key: decrypted };
                } catch (error) {
                    console.error(`Exception decrypting key for session ${session.id}:`, error);
                    return { sessionId: session.id, key: null };
                }
            })
        );

        // Collect successful decryptions
        for (const result of results) {
            if (result.status === 'fulfilled') {
                sessionKeys.set(result.value.sessionId, result.value.key);
            }
        }
        await this.encryption.initializeSessions(sessionKeys);

        // Decrypt sessions
        let decryptedSessions: (Omit<Session, 'presence'> & { presence?: "online" | number })[] = [];
        for (const session of sessions) {
            // Get session encryption (should always exist after initialization)
            const sessionEncryption = this.encryption.getSessionEncryption(session.id);
            if (!sessionEncryption) {
                console.error(`Session encryption not found for ${session.id} - this should never happen`);
                continue;
            }

            // Decrypt metadata using session-specific encryption
            let metadata = await sessionEncryption.decryptMetadata(session.metadataVersion, session.metadata);

            // Decrypt agent state using session-specific encryption
            let agentState = await sessionEncryption.decryptAgentState(session.agentStateVersion, session.agentState);

            // Put it all together
            const processedSession = {
                ...session,
                thinking: false,
                thinkingAt: 0,
                metadata,
                agentState
            };
            decryptedSessions.push(processedSession);
        }

        // Apply to storage
        this.applySessions(decryptedSessions);
        log.log(`📥 fetchSessions completed - processed ${decryptedSessions.length} sessions`);

    }

    public refreshMachines = async () => {
        return this.fetchMachines();
    }

    public refreshSessions = async () => {
        return this.sessionsSync.invalidateAndAwait();
    }

    public getCredentials() {
        return this.credentials;
    }

    // Artifact methods
    public fetchArtifactsList = async (): Promise<void> => {
        log.log('📦 fetchArtifactsList: Starting artifact sync');
        if (!this.credentials) {
            log.log('📦 fetchArtifactsList: No credentials, skipping');
            return;
        }

        try {
            log.log('📦 fetchArtifactsList: Fetching artifacts from server');
            const artifacts = await fetchArtifacts(this.credentials);
            log.log(`📦 fetchArtifactsList: Received ${artifacts.length} artifacts from server`);
            let decryptedArtifacts: DecryptedArtifact[] = [];
            const invalidArtifactIds: string[] = [];

            for (const artifact of artifacts) {
                try {
                    // Decrypt the data encryption key
                    const decryptedKey = await this.encryption.decryptEncryptionKey(artifact.dataEncryptionKey);
                    if (!decryptedKey) {
                        console.error(`Failed to decrypt key for artifact ${artifact.id}`);
                        continue;
                    }

                    // Store the decrypted key in memory
                    this.artifactDataKeys.set(artifact.id, decryptedKey);

                    // Create artifact encryption instance
                    const artifactEncryption = new ArtifactEncryption(decryptedKey);

                    // Decrypt header
                    const header = await artifactEncryption.decryptHeader(artifact.header);

                    const decryptedArtifact = {
                        id: artifact.id,
                        title: header?.title || null,
                        type: header?.type,          // Include type from header
                        sessions: header?.sessions,  // Include sessions from header
                        draft: header?.draft,        // Include draft flag from header
                        body: undefined, // Body not loaded in list
                        headerVersion: artifact.headerVersion,
                        bodyVersion: artifact.bodyVersion,
                        seq: artifact.seq,
                        createdAt: artifact.createdAt,
                        updatedAt: artifact.updatedAt,
                        isDecrypted: !!header,
                    };

                    decryptedArtifacts.push(decryptedArtifact);
                } catch (err) {
                    console.error(`Failed to decrypt artifact ${artifact.id}:`, err);
                    invalidArtifactIds.push(artifact.id);
                }
            }

            // Clean up invalid artifacts from server and local storage
            if (invalidArtifactIds.length > 0) {
                log.log(`Deleting ${invalidArtifactIds.length} invalid artifacts`);

                // Remove from local storage first
                for (const artifactId of invalidArtifactIds) {
                    storage.getState().deleteArtifact(artifactId);
                }

                // Then delete from server
                for (const artifactId of invalidArtifactIds) {
                    try {
                        await deleteArtifact(this.credentials, artifactId);
                        console.log(`✅ Deleted invalid artifact ${artifactId} from server`);
                    } catch (deleteErr) {
                        console.error(`Failed to delete invalid artifact ${artifactId}:`, deleteErr);
                    }
                }
            }

            log.log(`📦 fetchArtifactsList: Successfully decrypted ${decryptedArtifacts.length} artifacts (deleted ${invalidArtifactIds.length} invalid)`);

            // MIGRATION: Fix artifacts with undefined type by checking their body content
            // This is a one-time fix for artifacts created before the type field was properly saved
            const artifactsNeedingTypeFix = decryptedArtifacts.filter(a => !a.type);
            if (artifactsNeedingTypeFix.length > 0) {
                log.log(`[Migration] Found ${artifactsNeedingTypeFix.length} artifacts without type, migrating...`);

                const fixedArtifacts = new Map<string, DecryptedArtifact>();
                let migratedCount = 0;

                for (const artifact of artifactsNeedingTypeFix) {
                    try {
                        // Heuristic: If artifact has sessions array, likely a team
                        const likelyTeam = artifact.sessions && artifact.sessions.length >= 1;

                        // Fetch the full artifact with body
                        const fullArtifact = await this.fetchArtifactWithBody(artifact.id);
                        if (fullArtifact && fullArtifact.body) {
                            try {
                                const bodyData = JSON.parse(fullArtifact.body);
                                if (bodyData.team && Array.isArray(bodyData.team.members)) {
                                    fixedArtifacts.set(artifact.id, { ...fullArtifact, type: 'team' });
                                    await this.updateArtifact(artifact.id, fullArtifact.title, fullArtifact.body, fullArtifact.sessions, fullArtifact.draft, 'team');
                                    migratedCount++;
                                } else if (likelyTeam) {
                                    fixedArtifacts.set(artifact.id, { ...fullArtifact, type: 'team' });
                                    await this.updateArtifact(artifact.id, fullArtifact.title, fullArtifact.body, fullArtifact.sessions, fullArtifact.draft, 'team');
                                    migratedCount++;
                                }
                            } catch (parseError) {
                                // Fallback to heuristic if body parsing fails
                                if (likelyTeam) {
                                    fixedArtifacts.set(artifact.id, { ...fullArtifact, type: 'team' });
                                    await this.updateArtifact(artifact.id, fullArtifact.title, fullArtifact.body, fullArtifact.sessions, fullArtifact.draft, 'team');
                                    migratedCount++;
                                }
                            }
                        } else if (likelyTeam) {
                            // No body but has sessions - likely a team
                            const minimalTeam = { ...artifact, type: 'team' as const };
                            fixedArtifacts.set(artifact.id, minimalTeam);
                            await this.updateArtifact(artifact.id, artifact.title, artifact.body || null, artifact.sessions, artifact.draft, 'team');
                            migratedCount++;
                        }
                    } catch (error) {
                        console.error(`[Migration] Failed to migrate artifact ${artifact.id}:`, error);
                    }
                }

                // Update the decryptedArtifacts array with the fixed artifacts
                decryptedArtifacts = decryptedArtifacts.map(artifact => {
                    const fixedArtifact = fixedArtifacts.get(artifact.id);
                    return fixedArtifact || artifact;
                });

                log.log(`[Migration] Successfully migrated ${migratedCount} artifacts`);
            }

            storage.getState().applyArtifacts(decryptedArtifacts);
            log.log('📦 fetchArtifactsList: Artifacts applied to storage');
        } catch (error) {
            log.log(`📦 fetchArtifactsList: Error fetching artifacts: ${error}`);
            console.error('Failed to fetch artifacts:', error);
            throw error;
        }
    }

    public async fetchArtifactWithBody(artifactId: string): Promise<DecryptedArtifact | null> {
        if (!this.credentials) return null;

        try {
            const artifact = await fetchArtifact(this.credentials, artifactId);

            // Decrypt the data encryption key
            const decryptedKey = await this.encryption.decryptEncryptionKey(artifact.dataEncryptionKey);
            if (!decryptedKey) {
                console.error(`Failed to decrypt key for artifact ${artifactId}`);
                return null;
            }

            // Store the decrypted key in memory
            this.artifactDataKeys.set(artifact.id, decryptedKey);

            // Create artifact encryption instance
            const artifactEncryption = new ArtifactEncryption(decryptedKey);

            // Decrypt header and body
            const header = await artifactEncryption.decryptHeader(artifact.header);
            const body = artifact.body ? await artifactEncryption.decryptBody(artifact.body) : null;

            const decryptedArtifact = {
                id: artifact.id,
                title: header?.title || null,
                type: header?.type,          // Include type from header
                sessions: header?.sessions,  // Include sessions from header
                draft: header?.draft,        // Include draft flag from header
                body: body?.body || null,
                headerVersion: artifact.headerVersion,
                bodyVersion: artifact.bodyVersion,
                seq: artifact.seq,
                createdAt: artifact.createdAt,
                updatedAt: artifact.updatedAt,
                isDecrypted: !!header,
            };

            // Apply to storage to ensure UI updates and prevent infinite loops
            storage.getState().applyArtifacts([decryptedArtifact]);

            return decryptedArtifact;
        } catch (error) {
            console.error(`Failed to fetch artifact ${artifactId}:`, error);
            return null;
        }
    }

    public async createArtifact(
        title: string | null,
        body: string | null,
        sessions?: string[],
        draft?: boolean,
        type?: 'note' | 'team' | 'kanban'
    ): Promise<string> {
        if (!this.credentials) {
            throw new Error('Not authenticated');
        }

        try {
            // Generate unique artifact ID
            const artifactId = this.encryption.generateId();

            // Generate data encryption key
            const dataEncryptionKey = ArtifactEncryption.generateDataEncryptionKey();

            // Store the decrypted key in memory
            this.artifactDataKeys.set(artifactId, dataEncryptionKey);

            // Encrypt the data encryption key with user's key
            const encryptedKey = await this.encryption.encryptEncryptionKey(dataEncryptionKey);

            // Create artifact encryption instance
            const artifactEncryption = new ArtifactEncryption(dataEncryptionKey);

            // Encrypt header
            const encryptedHeader = await artifactEncryption.encryptHeader({ title, sessions, draft, type });

            // For team artifacts, store body as base64-encoded plaintext (no encryption)
            // This allows Happy-CLI to read team context without shared encryption keys
            let encryptedBody: string;
            if (type === 'team') {
                // Store as plaintext JSON (base64 encoded)
                const plainBody = JSON.stringify({ body });
                encryptedBody = encodeBase64(new TextEncoder().encode(plainBody), 'base64');
                console.log('📝 Creating team artifact with plaintext body for cross-client access');
            } else {
                // Normal encryption for non-team artifacts
                encryptedBody = await artifactEncryption.encryptBody({ body });
            }

            // Create the request
            const request: ArtifactCreateRequest = {
                id: artifactId,
                header: encryptedHeader,
                body: encryptedBody,
                dataEncryptionKey: encodeBase64(encryptedKey, 'base64'),
            };

            // Send to server
            const artifact = await createArtifact(this.credentials, request);

            // Add to local storage
            const decryptedArtifact: DecryptedArtifact = {
                id: artifact.id,
                title,
                type,
                sessions,
                draft,
                body,
                headerVersion: artifact.headerVersion,
                bodyVersion: artifact.bodyVersion,
                seq: artifact.seq,
                createdAt: artifact.createdAt,
                updatedAt: artifact.updatedAt,
                isDecrypted: true,
            };

            storage.getState().addArtifact(decryptedArtifact);
            console.log(`✅ Created artifact ${artifactId} with type: ${type}, title: ${title}`);
            console.log(`📦 Total artifacts in storage: ${Object.keys(storage.getState().artifacts).length}`);

            return artifactId;
        } catch (error) {
            console.error('Failed to create artifact:', error);
            throw error;
        }
    }

    public async updateArtifact(
        artifactId: string,
        title: string | null,
        body: string | null,
        sessions?: string[],
        draft?: boolean,
        type?: 'note' | 'team' | 'kanban'
    ): Promise<void> {
        if (!this.credentials) {
            throw new Error('Not authenticated');
        }

        try {
            // Get current artifact to get versions and encryption key
            const currentArtifact = storage.getState().artifacts[artifactId];
            if (!currentArtifact) {
                throw new Error('Artifact not found');
            }

            // Get the data encryption key from memory or fetch it
            let dataEncryptionKey = this.artifactDataKeys.get(artifactId);

            // Fetch full artifact if we don't have version info or encryption key
            let headerVersion = currentArtifact.headerVersion;
            let bodyVersion = currentArtifact.bodyVersion;

            if (headerVersion === undefined || bodyVersion === undefined || !dataEncryptionKey) {
                const fullArtifact = await fetchArtifact(this.credentials, artifactId);
                headerVersion = fullArtifact.headerVersion;
                bodyVersion = fullArtifact.bodyVersion;

                // Decrypt and store the data encryption key if we don't have it
                if (!dataEncryptionKey) {
                    const decryptedKey = await this.encryption.decryptEncryptionKey(fullArtifact.dataEncryptionKey);
                    if (!decryptedKey) {
                        throw new Error('Failed to decrypt encryption key');
                    }
                    this.artifactDataKeys.set(artifactId, decryptedKey);
                    dataEncryptionKey = decryptedKey;
                }
            }

            // Create artifact encryption instance
            const artifactEncryption = new ArtifactEncryption(dataEncryptionKey);

            // Prepare update request
            const updateRequest: ArtifactUpdateRequest = {};

            // Check if header needs updating (title, sessions, or draft changed)
            if (title !== currentArtifact.title ||
                JSON.stringify(sessions) !== JSON.stringify(currentArtifact.sessions) ||
                draft !== currentArtifact.draft) {
                const encryptedHeader = await artifactEncryption.encryptHeader({
                    title,
                    sessions,
                    draft,
                    type
                });
                updateRequest.header = encryptedHeader;
                updateRequest.expectedHeaderVersion = headerVersion;
            }

            // Only update body if it changed
            if (body !== currentArtifact.body) {
                // For team artifacts, store body as base64-encoded plaintext (no encryption)
                let encryptedBody: string;
                if (type === 'team' || currentArtifact.type === 'team') {
                    const plainBody = JSON.stringify({ body });
                    encryptedBody = encodeBase64(new TextEncoder().encode(plainBody), 'base64');
                } else {
                    encryptedBody = await artifactEncryption.encryptBody({ body });
                }
                updateRequest.body = encryptedBody;
                updateRequest.expectedBodyVersion = bodyVersion;
            }

            // Skip if no changes
            if (Object.keys(updateRequest).length === 0) {
                return;
            }

            // Send update to server
            const response = await updateArtifact(this.credentials, artifactId, updateRequest);

            if (!response.success) {
                // Handle version mismatch
                if (response.error === 'version-mismatch') {
                    console.log('🔄 Version mismatch detected, retrying update...');

                    // Fetch latest artifact data
                    const latestArtifact = await this.fetchArtifactWithBody(artifactId);
                    if (!latestArtifact) {
                        throw new Error('Failed to fetch latest artifact for retry');
                    }

                    // Update local state with latest data
                    storage.getState().updateArtifact(latestArtifact);

                    // Retry update with new versions
                    // Note: In a real collaborative app, we should merge changes here.
                    // For now, we'll retry the update with the new expected versions.
                    // This effectively implements "last write wins" but ensures we're building on the latest version.

                    const retryRequest: ArtifactUpdateRequest = {};

                    if (updateRequest.header) {
                        retryRequest.header = updateRequest.header;
                        retryRequest.expectedHeaderVersion = latestArtifact.headerVersion;
                    }

                    if (updateRequest.body) {
                        retryRequest.body = updateRequest.body;
                        retryRequest.expectedBodyVersion = latestArtifact.bodyVersion;
                    }

                    const retryResponse = await updateArtifact(this.credentials, artifactId, retryRequest);

                    if (!retryResponse.success) {
                        throw new Error('Failed to update artifact after retry: ' + retryResponse.error);
                    }

                    // Update local storage with retry response versions
                    const finalArtifact: DecryptedArtifact = {
                        ...latestArtifact,
                        title,
                        type,
                        sessions,
                        draft,
                        body,
                        headerVersion: retryResponse.headerVersion !== undefined ? retryResponse.headerVersion : latestArtifact.headerVersion,
                        bodyVersion: retryResponse.bodyVersion !== undefined ? retryResponse.bodyVersion : latestArtifact.bodyVersion,
                        updatedAt: Date.now(),
                    };
                    storage.getState().updateArtifact(finalArtifact);
                    return;
                }
                throw new Error('Failed to update artifact: ' + response.error);
            }

            // Update local storage
            const updatedArtifact: DecryptedArtifact = {
                ...currentArtifact,
                title,
                type,
                sessions,
                draft,
                body,
                headerVersion: response.headerVersion !== undefined ? response.headerVersion : headerVersion,
                bodyVersion: response.bodyVersion !== undefined ? response.bodyVersion : bodyVersion,
                updatedAt: Date.now(),
            };

            storage.getState().updateArtifact(updatedArtifact);
        } catch (error) {
            console.error('Failed to update artifact:', error);
            throw error;
        }
    }

    public async deleteArtifact(artifactId: string): Promise<void> {
        if (!this.credentials) {
            throw new Error('Not authenticated');
        }

        try {
            await deleteArtifact(this.credentials, artifactId);
            storage.getState().deleteArtifact(artifactId);
        } catch (error) {
            console.error('Failed to delete artifact:', error);
            throw error;
        }
    }

    private fetchMachines = async () => {
        if (!this.credentials) return;

        console.log('📊 Sync: Fetching machines...');
        const API_ENDPOINT = getServerUrl();
        const response = await fetch(`${API_ENDPOINT}/v1/machines`, {
            headers: {
                'Authorization': `Bearer ${this.credentials.token}`,
                'Content-Type': 'application/json'
            }
        });

        if (!response.ok) {
            console.error(`Failed to fetch machines: ${response.status}`);
            return;
        }

        const data = await response.json();
        console.log(`📊 Sync: Fetched ${Array.isArray(data) ? data.length : 0} machines from server`);
        const machines = data as Array<{
            id: string;
            metadata: string;
            metadataVersion: number;
            daemonState?: string | null;
            daemonStateVersion?: number;
            dataEncryptionKey?: string | null; // Add support for per-machine encryption keys
            seq: number;
            active: boolean;
            activeAt: number;  // Changed from lastActiveAt
            createdAt: number;
            updatedAt: number;
        }>;

        // First, collect and decrypt encryption keys for all machines
        const machineKeysMap = new Map<string, Uint8Array | null>();
        for (const machine of machines) {
            if (machine.dataEncryptionKey) {
                const decryptedKey = await this.encryption.decryptEncryptionKey(machine.dataEncryptionKey);
                if (!decryptedKey) {
                    console.error(`Failed to decrypt data encryption key for machine ${machine.id}`);
                    continue;
                }
                machineKeysMap.set(machine.id, decryptedKey);
                this.machineDataKeys.set(machine.id, decryptedKey);
            } else {
                machineKeysMap.set(machine.id, null);
            }
        }

        // Initialize machine encryptions
        await this.encryption.initializeMachines(machineKeysMap);

        // Process all machines first, then update state once
        const decryptedMachines: Machine[] = [];

        for (const machine of machines) {
            // Get machine-specific encryption (might exist from previous initialization)
            const machineEncryption = this.encryption.getMachineEncryption(machine.id);
            if (!machineEncryption) {
                console.error(`Machine encryption not found for ${machine.id} - this should never happen`);
                continue;
            }

            try {

                // Use machine-specific encryption (which handles fallback internally)
                const metadata = machine.metadata
                    ? await machineEncryption.decryptMetadata(machine.metadataVersion, machine.metadata)
                    : null;

                const daemonState = machine.daemonState
                    ? await machineEncryption.decryptDaemonState(machine.daemonStateVersion || 0, machine.daemonState)
                    : null;

                decryptedMachines.push({
                    id: machine.id,
                    seq: machine.seq,
                    createdAt: machine.createdAt,
                    updatedAt: machine.updatedAt,
                    active: machine.active,
                    activeAt: machine.activeAt,
                    metadata,
                    metadataVersion: machine.metadataVersion,
                    daemonState,
                    daemonStateVersion: machine.daemonStateVersion || 0
                });
            } catch (error) {
                console.error(`Failed to decrypt machine ${machine.id}:`, error);
                // Still add the machine with null metadata
                decryptedMachines.push({
                    id: machine.id,
                    seq: machine.seq,
                    createdAt: machine.createdAt,
                    updatedAt: machine.updatedAt,
                    active: machine.active,
                    activeAt: machine.activeAt,
                    metadata: null,
                    metadataVersion: machine.metadataVersion,
                    daemonState: null,
                    daemonStateVersion: 0
                });
            }
        }

        // Replace entire machine state with fetched machines
        storage.getState().applyMachines(decryptedMachines, true);
        log.log(`🖥️ fetchMachines completed - processed ${decryptedMachines.length} machines`);
    }

    private fetchFriends = async () => {
        if (!this.credentials) return;

        try {
            log.log('👥 Fetching friends list...');
            const friendsList = await getFriendsList(this.credentials);
            storage.getState().applyFriends(friendsList);
            log.log(`👥 fetchFriends completed - processed ${friendsList.length} friends`);
        } catch (error) {
            console.error('Failed to fetch friends:', error);
            // Silently handle error - UI will show appropriate state
        }
    }

    private fetchFriendRequests = async () => {
        // Friend requests are now included in the friends list with status='pending'
        // This method is kept for backward compatibility but does nothing
        log.log('👥 fetchFriendRequests called - now handled by fetchFriends');
    }

    private fetchTodos = async () => {
        if (!this.credentials) return;

        try {
            log.log('📝 Fetching todos...');
            await initializeTodoSync(this.credentials);
            log.log('📝 Todos loaded');
        } catch (error) {
            log.log('📝 Failed to fetch todos:');
        }
    }

    private applyTodoSocketUpdates = async (changes: any[]) => {
        if (!this.credentials || !this.encryption) return;

        const currentState = storage.getState();
        const todoState = currentState.todoState;
        if (!todoState) {
            // No todo state yet, just refetch
            this.todosSync.invalidate();
            return;
        }

        const { todos, undoneOrder, doneOrder, versions } = todoState;
        let updatedTodos = { ...todos };
        let updatedVersions = { ...versions };
        let indexUpdated = false;
        let newUndoneOrder = undoneOrder;
        let newDoneOrder = doneOrder;

        // Process each change
        for (const change of changes) {
            try {
                const key = change.key;
                const version = change.version;

                // Update version tracking
                updatedVersions[key] = version;

                if (change.value === null) {
                    // Item was deleted
                    if (key.startsWith('todo.') && key !== 'todo.index') {
                        const todoId = key.substring(5); // Remove 'todo.' prefix
                        delete updatedTodos[todoId];
                        newUndoneOrder = newUndoneOrder.filter(id => id !== todoId);
                        newDoneOrder = newDoneOrder.filter(id => id !== todoId);
                    }
                } else {
                    // Item was added or updated
                    const decrypted = await this.encryption.decryptRaw(change.value);

                    if (key === 'todo.index') {
                        // Update the index
                        const index = decrypted as any;
                        newUndoneOrder = index.undoneOrder || [];
                        newDoneOrder = index.completedOrder || []; // Map completedOrder to doneOrder
                        indexUpdated = true;
                    } else if (key.startsWith('todo.')) {
                        // Update a todo item
                        const todoId = key.substring(5);
                        if (todoId && todoId !== 'index') {
                            updatedTodos[todoId] = decrypted as any;
                        }
                    }
                }
            } catch (error) {
                console.error(`Failed to process todo change for key ${change.key}:`, error);
            }
        }

        // Apply the updated state
        storage.getState().applyTodos({
            todos: updatedTodos,
            undoneOrder: newUndoneOrder,
            doneOrder: newDoneOrder,
            versions: updatedVersions
        });

        log.log('📝 Applied todo socket updates successfully');
    }

    private fetchFeed = async () => {
        if (!this.credentials) return;

        try {
            log.log('📰 Fetching feed...');
            const state = storage.getState();
            const existingItems = state.feedItems;
            const head = state.feedHead;

            // Load feed items - if we have a head, load newer items
            let allItems: FeedItem[] = [];
            let hasMore = true;
            let cursor = head ? { after: head } : undefined;
            let loadedCount = 0;
            const maxItems = 500;

            // Keep loading until we reach known items or hit max limit
            while (hasMore && loadedCount < maxItems) {
                const response = await fetchFeed(this.credentials, {
                    limit: 100,
                    ...cursor
                });

                // Check if we reached known items (O(1) lookup using Set)
                const existingItemIds = new Set(existingItems.map(e => e.id));
                const foundKnown = response.items.some(item => existingItemIds.has(item.id));

                allItems.push(...response.items);
                loadedCount += response.items.length;
                hasMore = response.hasMore && !foundKnown;

                // Update cursor for next page
                if (response.items.length > 0) {
                    const lastItem = response.items[response.items.length - 1];
                    cursor = { after: lastItem.cursor };
                }
            }

            // If this is initial load (no head), also load older items
            if (!head && allItems.length < 100) {
                const response = await fetchFeed(this.credentials, {
                    limit: 100
                });
                allItems.push(...response.items);
            }

            // Collect user IDs from friend-related feed items
            const userIds = new Set<string>();
            allItems.forEach(item => {
                if (item.body && (item.body.kind === 'friend_request' || item.body.kind === 'friend_accepted')) {
                    userIds.add(item.body.uid);
                }
            });

            // Fetch missing users
            if (userIds.size > 0) {
                await this.assumeUsers(Array.from(userIds));
            }

            // Filter out items where user is not found (404)
            const users = storage.getState().users;
            const compatibleItems = allItems.filter(item => {
                // Keep text items
                if (item.body.kind === 'text') return true;

                // For friend-related items, check if user exists and is not null (404)
                if (item.body.kind === 'friend_request' || item.body.kind === 'friend_accepted') {
                    const userProfile = users[item.body.uid];
                    // Keep item only if user exists and is not null
                    return userProfile !== null && userProfile !== undefined;
                }

                return true;
            });

            // Apply only compatible items to storage
            storage.getState().applyFeedItems(compatibleItems);
            log.log(`📰 fetchFeed completed - loaded ${compatibleItems.length} compatible items (${allItems.length - compatibleItems.length} filtered)`);
        } catch (error) {
            console.error('Failed to fetch feed:', error);
        }
    }

    private syncSettings = async () => {
        if (!this.credentials) return;

        const API_ENDPOINT = getServerUrl();
        // Apply pending settings
        if (Object.keys(this.pendingSettings).length > 0) {

            while (true) {
                let version = storage.getState().settingsVersion;
                let settings = applySettings(storage.getState().settings, this.pendingSettings);
                const response = await fetch(`${API_ENDPOINT}/v1/account/settings`, {
                    method: 'POST',
                    body: JSON.stringify({
                        settings: await this.encryption.encryptRaw(settings),
                        expectedVersion: version ?? 0
                    }),
                    headers: {
                        'Authorization': `Bearer ${this.credentials.token}`,
                        'Content-Type': 'application/json'
                    }
                });
                const data = await response.json() as {
                    success: false,
                    error: string,
                    currentVersion: number,
                    currentSettings: string | null
                } | {
                    success: true
                };
                if (data.success) {
                    break;
                }
                if (data.error === 'version-mismatch') {
                    let parsedSettings: Settings;
                    if (data.currentSettings) {
                        parsedSettings = settingsParse(await this.encryption.decryptRaw(data.currentSettings));
                    } else {
                        parsedSettings = { ...settingsDefaults };
                    }

                    // Log
                    console.log('settings', JSON.stringify({
                        settings: parsedSettings,
                        version: data.currentVersion
                    }));

                    // Apply settings to storage
                    storage.getState().applySettings(parsedSettings, data.currentVersion);

                    // Clear pending
                    savePendingSettings({});

                    // Sync PostHog opt-out state with settings
                    if (tracking) {
                        if (parsedSettings.analyticsOptOut) {
                            tracking.optOut();
                        } else {
                            tracking.optIn();
                        }
                    }

                } else {
                    throw new Error(`Failed to sync settings: ${data.error}`);
                }

                // Wait 1 second
                await new Promise(resolve => setTimeout(resolve, 1000));
                break;
            }
        }

        // Run request
        const response = await fetch(`${API_ENDPOINT}/v1/account/settings`, {
            headers: {
                'Authorization': `Bearer ${this.credentials.token}`,
                'Content-Type': 'application/json'
            }
        });
        if (!response.ok) {
            throw new Error(`Failed to fetch settings: ${response.status}`);
        }
        const data = await response.json() as {
            settings: string | null,
            settingsVersion: number
        };

        // Parse response
        let parsedSettings: Settings;
        if (data.settings) {
            parsedSettings = settingsParse(await this.encryption.decryptRaw(data.settings));
        } else {
            parsedSettings = { ...settingsDefaults };
        }

        // Log
        console.log('settings', JSON.stringify({
            settings: parsedSettings,
            version: data.settingsVersion
        }));

        // Apply settings to storage
        storage.getState().applySettings(parsedSettings, data.settingsVersion);

        // Sync PostHog opt-out state with settings
        if (tracking) {
            if (parsedSettings.analyticsOptOut) {
                tracking.optOut();
            } else {
                tracking.optIn();
            }
        }
    }

    private fetchProfile = async () => {
        if (!this.credentials) return;

        const API_ENDPOINT = getServerUrl();
        const response = await fetch(`${API_ENDPOINT}/v1/account/profile`, {
            headers: {
                'Authorization': `Bearer ${this.credentials.token}`,
                'Content-Type': 'application/json'
            }
        });

        if (!response.ok) {
            throw new Error(`Failed to fetch profile: ${response.status}`);
        }

        const data = await response.json();
        const parsedProfile = profileParse(data);

        // Log profile data for debugging
        console.log('profile', JSON.stringify({
            id: parsedProfile.id,
            timestamp: parsedProfile.timestamp,
            firstName: parsedProfile.firstName,
            lastName: parsedProfile.lastName,
            hasAvatar: !!parsedProfile.avatar,
            hasGitHub: !!parsedProfile.github
        }));

        // Apply profile to storage
        storage.getState().applyProfile(parsedProfile);
    }

    public async updateSessionMetadata(sessionId: string, metadata: any): Promise<void> {
        if (!this.credentials) return;

        try {
            // Get session encryption
            const sessionEncryption = this.encryption.getSessionEncryption(sessionId);
            if (!sessionEncryption) {
                throw new Error('Session encryption not found');
            }

            // Get current session to get version
            const session = storage.getState().sessions[sessionId];
            if (!session) {
                throw new Error('Session not found');
            }

            // Encrypt metadata
            const encryptedMetadata = await sessionEncryption.encryptMetadata(metadata);

            // Send update to server
            const API_ENDPOINT = getServerUrl();
            const response = await fetch(`${API_ENDPOINT}/v1/sessions/${sessionId}/metadata`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${this.credentials.token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    metadata: encryptedMetadata,
                    expectedVersion: session.metadataVersion
                })
            });

            if (!response.ok) {
                if (response.status === 404) {
                    console.warn(`Session ${sessionId} not found on server (404). Deleting locally.`);
                    storage.getState().deleteSession(sessionId);
                    return;
                }
                throw new Error(`Failed to update session metadata: ${response.status}`);
            }

            const data = await response.json();

            // Update local storage
            storage.getState().updateSessionMetadata(sessionId, metadata, data.version);
        } catch (error) {
            console.error('Failed to update session metadata:', error);
            throw error;
        }
    }

    private syncSessionToTeam = async (sessionId: string, sessionMetadata: any): Promise<void> => {
        if (!sessionMetadata) {
            return;
        }

        // Handle case where metadata is JSON string
        let metadata = sessionMetadata;
        if (typeof sessionMetadata === 'string') {
            try {
                metadata = JSON.parse(sessionMetadata);
            } catch (e) {
                console.error(`[syncSessionToTeam] Failed to parse metadata string:`, e);
                return;
            }
        }

        const teamId = metadata.teamId;
        const role = metadata.role;
        const displayName = metadata.name || metadata.path;

        // Only sync if session has both teamId and role
        if (!teamId || !role) {
            return;
        }

        try {
            // Get team artifact
            const teamArtifact = await this.fetchArtifactWithBody(teamId);

            if (!teamArtifact || !teamArtifact.body) {
                console.log(`[syncSessionToTeam] Team artifact ${teamId} not found or has no body`);
                return;
            }

            let board: any;
            try {
                board = JSON.parse(teamArtifact.body);
            } catch (e) {
                console.error(`[syncSessionToTeam] Failed to parse team body:`, e);
                return;
            }

            // Check if team structure exists
            if (!board.team || !Array.isArray(board.team.members)) {
                console.log(`[syncSessionToTeam] Team artifact has no team.members array`);
                return;
            }

            // Check if session is already in members
            const existingMember = board.team.members.find((m: any) => m.sessionId === sessionId);

            if (existingMember) {
                // Update existing member's info if needed
                if (existingMember.roleId !== role || existingMember.displayName !== displayName) {
                    console.log(`[syncSessionToTeam] Updating existing member ${sessionId}`);
                    existingMember.roleId = role;
                    existingMember.displayName = displayName;

                    // Save updated board
                    const updatedBody = JSON.stringify(board, null, 2);
                    await this.updateArtifact(teamId, teamArtifact.title || teamArtifact.id, updatedBody, teamArtifact.sessions || [], false, 'team');
                }
                return;
            }

            // Add new member
            console.log(`[syncSessionToTeam] Adding new member ${sessionId} to team ${teamId}`);
            const newMember: any = {
                sessionId,
                roleId: role,
                displayName: displayName || `Agent ${role}`,
                focusAreas: []
            };

            board.team.members.push(newMember);

            // Save updated board
            const updatedBody = JSON.stringify(board, null, 2);

            // Collect all member session IDs
            const allMemberIds = board.team.members
                .map((m: any) => m.sessionId)
                .filter((id: string) => id && id.length > 0);

            await this.updateArtifact(teamId, teamArtifact.title || teamArtifact.id, updatedBody, allMemberIds, false, 'team');

            console.log(`[syncSessionToTeam] Successfully added member ${sessionId} to team ${teamId}`);
        } catch (error) {
            console.error(`[syncSessionToTeam] Failed to sync session to team:`, error);
        }
    }

    private removeSessionFromTeams = async (sessionId: string): Promise<void> => {
        try {
            // Get all artifacts
            const artifacts = storage.getState().artifacts;

            // Filter for team artifacts
            const teamArtifacts = Object.values(artifacts).filter(a => a.type === 'team' && a.body);

            for (const teamArtifact of teamArtifacts) {
                let board: any;
                try {
                    board = JSON.parse(teamArtifact.body!);
                } catch (e) {
                    continue;
                }

                // Check if team structure exists and has members
                if (!board.team || !Array.isArray(board.team.members)) {
                    continue;
                }

                // Check if session is in members
                const memberIndex = board.team.members.findIndex((m: any) => m.sessionId === sessionId);

                if (memberIndex !== -1) {
                    console.log(`[removeSessionFromTeams] Removing ${sessionId} from team ${teamArtifact.id}`);

                    // Remove member from array
                    board.team.members.splice(memberIndex, 1);

                    // Update artifact
                    const updatedBody = JSON.stringify(board, null, 2);
                    const allMemberIds = board.team.members
                        .map((m: any) => m.sessionId)
                        .filter((id: string) => id && id.length > 0);

                    await this.updateArtifact(teamArtifact.id, teamArtifact.title || teamArtifact.id, updatedBody, allMemberIds, false, 'team');

                    console.log(`[removeSessionFromTeams] Successfully removed ${sessionId} from team ${teamArtifact.id}`);
                }
            }
        } catch (error) {
            console.error(`[removeSessionFromTeams] Failed to remove session from teams:`, error);
        }
    }

    private fetchNativeUpdate = async () => {
        try {
            // Skip in development
            if ((Platform.OS !== 'android' && Platform.OS !== 'ios') || !Constants.expoConfig?.version) {
                return;
            }
            if (Platform.OS === 'ios' && !Constants.expoConfig?.ios?.bundleIdentifier) {
                return;
            }
            if (Platform.OS === 'android' && !Constants.expoConfig?.android?.package) {
                return;
            }

            const serverUrl = getServerUrl();

            // Get platform and app identifiers
            const platform = Platform.OS;
            const version = Constants.expoConfig?.version!;
            const appId = (Platform.OS === 'ios' ? Constants.expoConfig?.ios?.bundleIdentifier! : Constants.expoConfig?.android?.package!);

            const response = await fetch(`${serverUrl}/v1/version`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    platform,
                    version,
                    app_id: appId,
                }),
            });

            if (!response.ok) {
                console.log(`[fetchNativeUpdate] Request failed: ${response.status}`);
                return;
            }

            const data = await response.json();
            console.log('[fetchNativeUpdate] Data:', data);

            // Apply update status to storage
            if (data.update_required && data.update_url) {
                storage.getState().applyNativeUpdateStatus({
                    available: true,
                    updateUrl: data.update_url
                });
            } else {
                storage.getState().applyNativeUpdateStatus({
                    available: false
                });
            }
        } catch (error) {
            console.log('[fetchNativeUpdate] Error:', error);
            storage.getState().applyNativeUpdateStatus(null);
        }
    }

    private syncPurchases = async () => {
        try {
            // Initialize RevenueCat if not already done
            if (!this.revenueCatInitialized) {
                // Get the appropriate API key based on platform
                let apiKey: string | undefined;

                if (Platform.OS === 'ios') {
                    apiKey = config.revenueCatAppleKey;
                } else if (Platform.OS === 'android') {
                    apiKey = config.revenueCatGoogleKey;
                } else if (Platform.OS === 'web') {
                    apiKey = config.revenueCatStripeKey;
                }

                if (!apiKey) {
                    console.log(`RevenueCat: No API key found for platform ${Platform.OS}`);
                    return;
                }

                // Configure RevenueCat
                if (__DEV__) {
                    RevenueCat.setLogLevel(LogLevel.DEBUG);
                }

                // Initialize with the public ID as user ID
                RevenueCat.configure({
                    apiKey,
                    appUserID: this.serverID, // In server this is a CUID, which we can assume is globaly unique even between servers
                    useAmazon: false,
                });

                this.revenueCatInitialized = true;
                console.log('RevenueCat initialized successfully');
            }

            // Sync purchases
            await RevenueCat.syncPurchases();

            // Fetch customer info
            const customerInfo = await RevenueCat.getCustomerInfo();

            // Apply to storage (storage handles the transformation)
            storage.getState().applyPurchases(customerInfo);

        } catch (error) {
            console.error('Failed to sync purchases:', error);
            // Don't throw - purchases are optional
        }
    }

    private fetchMessages = async (sessionId: string) => {
        log.log(`💬 fetchMessages starting for session ${sessionId} - acquiring lock`);

        // Get encryption
        const encryption = this.encryption.getSessionEncryption(sessionId);
        if (!encryption) { // Should never happen
            console.error(`Session ${sessionId} not found`);
            return;
        }

        // Request
        const response = await apiSocket.request(`/v1/sessions/${sessionId}/messages`);
        const data = await response.json();

        // Collect existing messages
        let eixstingMessages = this.sessionReceivedMessages.get(sessionId);
        if (!eixstingMessages) {
            eixstingMessages = new Set<string>();
            this.sessionReceivedMessages.set(sessionId, eixstingMessages);
        }

        // Decrypt and normalize messages
        let start = Date.now();
        let normalizedMessages: NormalizedMessage[] = [];

        // Filter out existing messages and prepare for batch decryption
        const messagesToDecrypt: ApiMessage[] = [];
        for (const msg of [...data.messages as ApiMessage[]].reverse()) {
            if (!eixstingMessages.has(msg.id)) {
                messagesToDecrypt.push(msg);
            }
        }

        // Batch decrypt all messages at once
        const decryptedMessages = await encryption.decryptMessages(messagesToDecrypt);

        // Process decrypted messages
        for (let i = 0; i < decryptedMessages.length; i++) {
            const decrypted = decryptedMessages[i];
            if (decrypted && decrypted.content !== null) {
                eixstingMessages.add(decrypted.id);
                // Normalize the decrypted message
                let normalized = normalizeRawMessage(decrypted.id, decrypted.localId, decrypted.createdAt, decrypted.content);
                if (normalized) {
                    normalizedMessages.push(normalized);
                }
            }
        }
        console.log('Batch decrypted and normalized messages in', Date.now() - start, 'ms');
        console.log('normalizedMessages', JSON.stringify(normalizedMessages));
        // console.log('messages', JSON.stringify(normalizedMessages));

        // Apply to storage
        this.applyMessages(sessionId, normalizedMessages);
        log.log(`💬 fetchMessages completed for session ${sessionId} - processed ${normalizedMessages.length} messages`);
    }

    private registerPushToken = async () => {
        log.log('registerPushToken');
        // Only register on mobile platforms
        if (Platform.OS === 'web') {
            return;
        }

        // Request permission
        const { status: existingStatus } = await Notifications.getPermissionsAsync();
        let finalStatus = existingStatus;
        log.log('existingStatus: ' + JSON.stringify(existingStatus));

        if (existingStatus !== 'granted') {
            const { status } = await Notifications.requestPermissionsAsync();
            finalStatus = status;
        }
        log.log('finalStatus: ' + JSON.stringify(finalStatus));

        if (finalStatus !== 'granted') {
            console.log('Failed to get push token for push notification!');
            return;
        }

        // Get push token
        const projectId = Constants.expoConfig?.extra?.eas?.projectId ?? Constants.easConfig?.projectId;
        const tokenData = await Notifications.getExpoPushTokenAsync({ projectId });
        log.log('tokenData: ' + JSON.stringify(tokenData));

        // Register with server
        try {
            await registerPushToken(this.credentials, tokenData.data);
            log.log('Push token registered successfully');
        } catch (error) {
            log.log('Failed to register push token: ' + JSON.stringify(error));
        }
    }

    public async createSession(tag: string, metadata: any): Promise<string> {
        if (!this.credentials) {
            throw new Error('Not authenticated');
        }

        try {
            // Generate session ID locally
            const sessionId = this.encryption.generateId();

            // Generate data encryption key
            const dataEncryptionKey = ArtifactEncryption.generateDataEncryptionKey();

            // Encrypt the data encryption key with user's key
            const encryptedKey = await this.encryption.encryptEncryptionKey(dataEncryptionKey);

            // Create encryptor for the session
            const encryptor = await this.encryption.openEncryption(dataEncryptionKey);

            // Create temporary SessionEncryption to encrypt metadata
            const sessionEncryption = new SessionEncryption(sessionId, encryptor, this.encryptionCache);

            // Encrypt metadata
            const encryptedMetadata = await sessionEncryption.encryptMetadata(metadata);

            // Send to server
            const API_ENDPOINT = getServerUrl();
            const response = await fetch(`${API_ENDPOINT}/v1/sessions`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${this.credentials.token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    tag,
                    metadata: encryptedMetadata,
                    dataEncryptionKey: encodeBase64(encryptedKey, 'base64')
                })
            });

            if (!response.ok) {
                const text = await response.text();
                throw new Error(`Failed to create session: ${response.status} - ${text}`);
            }

            const data = await response.json();
            const session = data.session;

            // Initialize session encryption in main encryption instance
            const sessionKeys = new Map<string, Uint8Array | null>();
            sessionKeys.set(session.id, dataEncryptionKey);
            await this.encryption.initializeSessions(sessionKeys);

            // Add to local storage
            const processedSession = {
                id: session.id,
                seq: session.seq,
                createdAt: session.createdAt,
                updatedAt: session.updatedAt,
                active: session.active,
                activeAt: session.activeAt,
                metadata: metadata,
                metadataVersion: session.metadataVersion,
                agentState: session.agentState,
                agentStateVersion: session.agentStateVersion,
                thinking: false,
                thinkingAt: 0
            };

            this.applySessions([processedSession]);

            return session.id;
        } catch (error) {
            console.error('Failed to create session:', error);
            throw error;
        }
    }

    public async spawnSessionOnMachine(machineId: string, params: {
        sessionId?: string;
        directory: string;
        agent: 'claude' | 'codex';
        token?: string;
        sessionTag?: string;
        teamId?: string;
        role?: string;
        sessionName?: string;
        sessionPath?: string;
    }): Promise<string | null> {
        try {
            const result = await apiSocket.machineRPC<any, any>(machineId, 'spawn-happy-session', {
                ...params,
                machineId,
                approvedNewDirectoryCreation: true,
                teamId: params.teamId,
                role: params.role,
                sessionName: params.sessionName,
                sessionPath: params.sessionPath
            });
            const sessionId = result?.sessionId || (result?.type === 'success' ? result?.sessionId : null);
            if (result?.type === 'requestToApproveDirectoryCreation') {
                console.warn(`Directory creation approval required for: ${result.directory}`);
            }
            if (sessionId) {
                log.log(`Spawned session ${sessionId} on machine ${machineId}`);
                return sessionId;
            }
            log.log(`Spawn request completed on machine ${machineId} (no sessionId returned)`);
            return null;
        } catch (error) {
            console.error(`Failed to spawn session on machine ${machineId}:`, error);
            throw error;
        }
    }



    private subscribeToUpdates = () => {
        // Subscribe to message updates
        apiSocket.onMessage('update', this.handleUpdate.bind(this));
        apiSocket.onMessage('ephemeral', this.handleEphemeralUpdate.bind(this));

        // Subscribe to connection state changes
        apiSocket.onReconnected(() => {
            log.log('🔌 Socket reconnected');
            this.sessionsSync.invalidate();
            this.machinesSync.invalidate();
            log.log('🔌 Socket reconnected: Invalidating artifacts sync');
            this.artifactsSync.invalidate();
            this.friendsSync.invalidate();
            this.friendRequestsSync.invalidate();
            this.feedSync.invalidate();
            const sessionsData = storage.getState().sessionsData;
            if (sessionsData) {
                for (const item of sessionsData) {
                    if (typeof item !== 'string') {
                        this.messagesSync.get(item.id)?.invalidate();
                        // Also invalidate git status on reconnection
                        gitStatusSync.invalidate(item.id);
                    }
                }
            }
        });
    }

    private handleUpdate = async (update: unknown) => {
        console.log('🔄 Sync: handleUpdate called with:', JSON.stringify(update).substring(0, 300));
        let validatedUpdate;
        try {
            validatedUpdate = ApiUpdateContainerSchema.safeParse(update);
        } catch (error) {
            console.error('❌ Sync: Schema validation crashed:', error);
            return;
        }
        if (!validatedUpdate.success) {
            console.log('❌ Sync: Invalid update received:', validatedUpdate.error);
            console.error('❌ Sync: Invalid update data:', update);
            return;
        }
        const updateData = validatedUpdate.data;
        console.log(`🔄 Sync: Validated update type: ${updateData.body.t}`);

        if (updateData.body.t === 'new-message') {

            // Get encryption
            const encryption = this.encryption.getSessionEncryption(updateData.body.sid);
            if (!encryption) { // Should never happen
                console.error(`Session ${updateData.body.sid} not found`);
                this.fetchSessions(); // Just fetch sessions again
                return;
            }

            // Decrypt message
            let lastMessage: NormalizedMessage | null = null;
            if (updateData.body.message) {
                const decrypted = await encryption.decryptMessage(updateData.body.message);
                if (decrypted && decrypted.content !== null) {
                    lastMessage = normalizeRawMessage(decrypted.id, decrypted.localId, decrypted.createdAt, decrypted.content);

                    // Update session
                    const session = storage.getState().sessions[updateData.body.sid];
                    if (session) {
                        this.applySessions([{
                            ...session,
                            updatedAt: updateData.createdAt,
                            seq: updateData.seq
                        }])
                    } else {
                        // Fetch sessions again if we don't have this session
                        this.fetchSessions();
                    }

                    // Update messages
                    if (lastMessage) {
                        console.log('🔄 Sync: Applying message:', JSON.stringify(lastMessage));
                        this.applyMessages(updateData.body.sid, [lastMessage]);
                        let hasMutableTool = false;
                        if (lastMessage.role === 'agent' && lastMessage.content[0] && lastMessage.content[0].type === 'tool-result') {
                            hasMutableTool = storage.getState().isMutableToolCall(updateData.body.sid, lastMessage.content[0].tool_use_id);
                        }
                        if (hasMutableTool) {
                            gitStatusSync.invalidate(updateData.body.sid);
                        }
                    }
                }
            }

            // Ping session
            this.onSessionVisible(updateData.body.sid);

        } else if (updateData.body.t === 'team-message') {
            const { teamId, message } = updateData.body;
            console.log(`🔄 Sync: Received team message for team ${teamId}: ${message.id}`);

            // PROTECTED: Acquire mutex for this teamId to prevent concurrent Map access
            await this.getTeamMessagesMutex(teamId).runExclusive(async () => {
                // Update cache
                const currentMessages = this.teamMessagesCache.get(teamId) || [];
                // Check for duplicates
                const isDuplicate = currentMessages.find(m => m.id === message.id);

                if (!isDuplicate) {
                    this.teamMessagesCache.set(teamId, [...currentMessages, message as any]);

                    // Only notify subscribers for new messages
                    // NOTE: Reading teamMessageSubscriptions is safe because we only read, not mutate
                    const subscribers = this.teamMessageSubscriptions.get(teamId);
                    if (subscribers) {
                        subscribers.forEach(callback => callback(message as any));
                    }
                } else {
                    console.log(`🔄 Sync: Duplicate message ${message.id}, skipping notification`);
                }
            });

        } else if (updateData.body.t === 'new-session') {
            log.log('🆕 New session update received');
            this.sessionsSync.invalidate();
        } else if (updateData.body.t === 'delete-session') {
            log.log('🗑️ Delete session update received');
            const sessionId = updateData.body.sid;

            // Remove session from storage
            storage.getState().deleteSession(sessionId);

            // Remove encryption keys from memory
            this.encryption.removeSessionEncryption(sessionId);

            // Remove from project manager
            projectManager.removeSession(sessionId);

            // Clear any cached git status
            gitStatusSync.clearForSession(sessionId);

            // Remove session from all teams it belongs to
            this.removeSessionFromTeams(sessionId);

            log.log(`🗑️ Session ${sessionId} deleted from local storage`);
        } else if (updateData.body.t === 'update-session') {
            const session = storage.getState().sessions[updateData.body.id];
            if (session) {
                // Get session encryption
                const sessionEncryption = this.encryption.getSessionEncryption(updateData.body.id);
                if (!sessionEncryption) {
                    console.error(`Session encryption not found for ${updateData.body.id} - this should never happen`);
                    return;
                }

                const agentState = updateData.body.agentState && sessionEncryption
                    ? await sessionEncryption.decryptAgentState(updateData.body.agentState.version, updateData.body.agentState.value)
                    : session.agentState;
                const metadata = updateData.body.metadata && sessionEncryption
                    ? await sessionEncryption.decryptMetadata(updateData.body.metadata.version, updateData.body.metadata.value)
                    : session.metadata;

                this.applySessions([{
                    ...session,
                    agentState,
                    agentStateVersion: updateData.body.agentState
                        ? updateData.body.agentState.version
                        : session.agentStateVersion,
                    metadata,
                    metadataVersion: updateData.body.metadata
                        ? updateData.body.metadata.version
                        : session.metadataVersion,
                    updatedAt: updateData.createdAt,
                    seq: updateData.seq
                }]);

                // Invalidate git status when agent state changes (files may have been modified)
                if (updateData.body.agentState) {
                    gitStatusSync.invalidate(updateData.body.id);

                    // Check for new permission requests and notify voice assistant
                    if (agentState?.requests && Object.keys(agentState.requests).length > 0) {
                        const requestIds = Object.keys(agentState.requests);
                        const firstRequest = agentState.requests[requestIds[0]];
                        const toolName = firstRequest?.tool;
                        voiceHooks.onPermissionRequested(updateData.body.id, requestIds[0], toolName, firstRequest?.arguments);
                    }
                }

                // Auto-sync session metadata to team artifact if session has team information
                this.syncSessionToTeam(updateData.body.id, metadata);
            }
        } else if (updateData.body.t === 'update-account') {
            const accountUpdate = updateData.body;
            const currentProfile = storage.getState().profile;

            // Build updated profile with new data
            const updatedProfile: Profile = {
                ...currentProfile,
                firstName: accountUpdate.firstName !== undefined ? accountUpdate.firstName : currentProfile.firstName,
                lastName: accountUpdate.lastName !== undefined ? accountUpdate.lastName : currentProfile.lastName,
                avatar: accountUpdate.avatar !== undefined ? accountUpdate.avatar : currentProfile.avatar,
                github: accountUpdate.github !== undefined ? accountUpdate.github : currentProfile.github,
                timestamp: updateData.createdAt // Update timestamp to latest
            };

            // Apply the updated profile to storage
            storage.getState().applyProfile(updatedProfile);
        } else if (updateData.body.t === 'update-machine') {
            const machineUpdate = updateData.body;
            const machineId = machineUpdate.machineId;  // Changed from .id to .machineId
            const machine = storage.getState().machines[machineId];

            // Create or update machine with all required fields
            const updatedMachine: Machine = {
                id: machineId,
                seq: updateData.seq,
                createdAt: machine?.createdAt ?? updateData.createdAt,
                updatedAt: updateData.createdAt,
                active: machineUpdate.active ?? true,
                activeAt: machineUpdate.activeAt ?? updateData.createdAt,
                metadata: machine?.metadata ?? null,
                metadataVersion: machine?.metadataVersion ?? 0,
                daemonState: machine?.daemonState ?? null,
                daemonStateVersion: machine?.daemonStateVersion ?? 0
            };

            // Get machine-specific encryption (might not exist if machine wasn't initialized)
            // Get machine-specific encryption (might not exist if machine wasn't initialized)
            const machineEncryption = this.encryption.getMachineEncryption(machineId);
            if (!machineEncryption) {
                // This is normal for machines we haven't paired with yet
                // We can still update basic status like active/activeAt
                console.log(`Machine encryption not found for ${machineId} - skipping decryption of updates`);
            }

            // If metadata is provided, decrypt and update it
            const metadataUpdate = machineUpdate.metadata;
            if (metadataUpdate && machineEncryption) {
                try {
                    const metadata = await machineEncryption.decryptMetadata(metadataUpdate.version, metadataUpdate.value);
                    updatedMachine.metadata = metadata;
                    updatedMachine.metadataVersion = metadataUpdate.version;
                } catch (error) {
                    console.error(`Failed to decrypt machine metadata for ${machineId}:`, error);
                }
            }

            // If daemonState is provided, decrypt and update it
            const daemonStateUpdate = machineUpdate.daemonState;
            if (daemonStateUpdate && machineEncryption) {
                try {
                    const daemonState = await machineEncryption.decryptDaemonState(daemonStateUpdate.version, daemonStateUpdate.value);
                    updatedMachine.daemonState = daemonState;
                    updatedMachine.daemonStateVersion = daemonStateUpdate.version;
                } catch (error) {
                    console.error(`Failed to decrypt machine daemonState for ${machineId}:`, error);
                }
            }

            // Update storage using applyMachines which rebuilds sessionListViewData
            storage.getState().applyMachines([updatedMachine]);
        } else if (updateData.body.t === 'new-machine') {
            log.log('💻 Received new-machine update');
            // We invalidate machines sync to fetch the new machine
            // Note: We might not have the key for this machine yet if it wasn't paired
            this.machinesSync.invalidate();
        } else if (updateData.body.t === 'relationship-updated') {
            log.log('👥 Received relationship-updated update');
            const relationshipUpdate = updateData.body;

            // Apply the relationship update to storage
            storage.getState().applyRelationshipUpdate({
                fromUserId: relationshipUpdate.fromUserId,
                toUserId: relationshipUpdate.toUserId,
                status: relationshipUpdate.status,
                action: relationshipUpdate.action,
                fromUser: relationshipUpdate.fromUser,
                toUser: relationshipUpdate.toUser,
                timestamp: relationshipUpdate.timestamp
            });

            // Invalidate friends data to refresh with latest changes
            this.friendsSync.invalidate();
            this.friendRequestsSync.invalidate();
            this.feedSync.invalidate();
        } else if (updateData.body.t === 'new-artifact') {
            log.log('📦 Received new-artifact update');
            const artifactUpdate = updateData.body;
            const artifactId = artifactUpdate.artifactId;

            try {
                // Decrypt the data encryption key
                const decryptedKey = await this.encryption.decryptEncryptionKey(artifactUpdate.dataEncryptionKey);
                if (!decryptedKey) {
                    console.error(`Failed to decrypt key for new artifact ${artifactId}`);
                    return;
                }

                // Store the decrypted key in memory
                this.artifactDataKeys.set(artifactId, decryptedKey);

                // Create artifact encryption instance
                const artifactEncryption = new ArtifactEncryption(decryptedKey);

                // Decrypt header
                const header = await artifactEncryption.decryptHeader(artifactUpdate.header);

                // Decrypt body if provided
                let decryptedBody: string | null | undefined = undefined;
                if (artifactUpdate.body && artifactUpdate.bodyVersion !== undefined) {
                    const body = await artifactEncryption.decryptBody(artifactUpdate.body);
                    decryptedBody = body?.body || null;
                }

                // Add to storage
                const decryptedArtifact: DecryptedArtifact = {
                    id: artifactId,
                    title: header?.title || null,
                    type: header?.type,
                    sessions: header?.sessions,
                    draft: header?.draft,
                    body: decryptedBody,
                    headerVersion: artifactUpdate.headerVersion,
                    bodyVersion: artifactUpdate.bodyVersion,
                    seq: artifactUpdate.seq,
                    createdAt: artifactUpdate.createdAt,
                    updatedAt: artifactUpdate.updatedAt,
                    isDecrypted: !!header,
                };

                storage.getState().addArtifact(decryptedArtifact);
                log.log(`📦 Added new artifact ${artifactId} to storage`);
            } catch (error) {
                console.error(`Failed to process new artifact ${artifactId}:`, error);
            }
        } else if (updateData.body.t === 'update-artifact') {
            log.log('📦 Received update-artifact update');
            const artifactUpdate = updateData.body;
            const artifactId = artifactUpdate.artifactId;

            // Get existing artifact
            const existingArtifact = storage.getState().artifacts[artifactId];
            if (!existingArtifact) {
                console.error(`Artifact ${artifactId} not found in storage`);
                // Fetch all artifacts to sync
                this.artifactsSync.invalidate();
                return;
            }

            try {
                // Get the data encryption key from memory
                let dataEncryptionKey = this.artifactDataKeys.get(artifactId);
                if (!dataEncryptionKey) {
                    console.error(`Encryption key not found for artifact ${artifactId}, fetching artifacts`);
                    this.artifactsSync.invalidate();
                    return;
                }

                // Create artifact encryption instance
                const artifactEncryption = new ArtifactEncryption(dataEncryptionKey);

                // Update artifact with new data  
                const updatedArtifact: DecryptedArtifact = {
                    ...existingArtifact,
                    seq: updateData.seq,
                    updatedAt: updateData.createdAt,
                };

                // Decrypt and update header if provided
                if (artifactUpdate.header) {
                    const header = await artifactEncryption.decryptHeader(artifactUpdate.header.value);
                    updatedArtifact.title = header?.title || null;
                    updatedArtifact.type = header?.type;
                    updatedArtifact.sessions = header?.sessions;
                    updatedArtifact.draft = header?.draft;
                    updatedArtifact.headerVersion = artifactUpdate.header.version;

                    // If sessions list changed or role assignments might have happened, refresh sessions
                    // This ensures that if a role was assigned in the artifact, the session metadata reflects it
                    if (header?.sessions) {
                        this.sessionsSync.invalidate();
                    }
                }

                // Decrypt and update body if provided
                if (artifactUpdate.body) {
                    const body = await artifactEncryption.decryptBody(artifactUpdate.body.value);
                    updatedArtifact.body = body?.body || null;
                    updatedArtifact.bodyVersion = artifactUpdate.body.version;
                }

                storage.getState().updateArtifact(updatedArtifact);
                log.log(`📦 Updated artifact ${artifactId} in storage`);
            } catch (error) {
                console.error(`Failed to process artifact update ${artifactId}:`, error);
            }
        } else if (updateData.body.t === 'delete-artifact') {
            log.log('📦 Received delete-artifact update');
            const artifactUpdate = updateData.body;
            const artifactId = artifactUpdate.artifactId;

            // Remove from storage
            storage.getState().deleteArtifact(artifactId);

            // Remove encryption key from memory
            this.artifactDataKeys.delete(artifactId);
        } else if (updateData.body.t === 'new-feed-post') {
            log.log('📰 Received new-feed-post update');
            const feedUpdate = updateData.body;

            // Convert to FeedItem with counter from cursor
            const feedItem: FeedItem = {
                id: feedUpdate.id,
                body: feedUpdate.body,
                cursor: feedUpdate.cursor,
                createdAt: feedUpdate.createdAt,
                repeatKey: feedUpdate.repeatKey,
                counter: parseInt(feedUpdate.cursor.substring(2), 10)
            };

            // Check if we need to fetch user for friend-related items
            if (feedItem.body && (feedItem.body.kind === 'friend_request' || feedItem.body.kind === 'friend_accepted')) {
                await this.assumeUsers([feedItem.body.uid]);

                // Check if user fetch failed (404) - don't store item if user not found
                const users = storage.getState().users;
                const userProfile = users[feedItem.body.uid];
                if (userProfile === null || userProfile === undefined) {
                    // User was not found or 404, don't store this item
                    log.log(`📰 Skipping feed item ${feedItem.id} - user ${feedItem.body.uid} not found`);
                    return;
                }
            }

            // Apply to storage (will handle repeatKey replacement)
            storage.getState().applyFeedItems([feedItem]);
        } else if (updateData.body.t === 'kv-batch-update') {
            log.log('📝 Received kv-batch-update');
            const kvUpdate = updateData.body;

            // Process KV changes for todos
            if (kvUpdate.changes && Array.isArray(kvUpdate.changes)) {
                const todoChanges = kvUpdate.changes.filter(change =>
                    change.key && change.key.startsWith('todo.')
                );

                if (todoChanges.length > 0) {
                    log.log(`📝 Processing ${todoChanges.length} todo KV changes from socket`);

                    // Apply the changes directly to avoid unnecessary refetch
                    try {
                        await this.applyTodoSocketUpdates(todoChanges);
                    } catch (error) {
                        console.error('Failed to apply todo socket updates:', error);
                        // Fallback to refetch on error
                        this.todosSync.invalidate();
                    }
                }
            }
        }
    }

    private flushActivityUpdates = (updates: Map<string, ApiEphemeralActivityUpdate>) => {
        // log.log(`🔄 Flushing activity updates for ${updates.size} sessions - acquiring lock`);


        const sessions: Session[] = [];

        for (const [sessionId, update] of updates) {
            const session = storage.getState().sessions[sessionId];
            if (session) {
                sessions.push({
                    ...session,
                    active: update.active,
                    activeAt: update.activeAt,
                    thinking: update.thinking ?? false,
                    thinkingAt: update.activeAt // Always use activeAt for consistency
                });
            }
        }

        if (sessions.length > 0) {
            // console.log('flushing activity updates ' + sessions.length);
            this.applySessions(sessions);
            // log.log(`🔄 Activity updates flushed - updated ${sessions.length} sessions`);
        }
    }

    private handleEphemeralUpdate = (update: unknown) => {
        const validatedUpdate = ApiEphemeralUpdateSchema.safeParse(update);
        if (!validatedUpdate.success) {
            console.log('Invalid ephemeral update received:', validatedUpdate.error);
            console.error('Invalid ephemeral update received:', update);
            return;
        } else {
            // console.log('Ephemeral update received:', update);
        }
        const updateData = validatedUpdate.data;

        // Process activity updates through smart debounce accumulator
        if (updateData.type === 'activity') {
            // console.log('adding activity update ' + updateData.id);
            this.activityAccumulator.addUpdate(updateData);
        }

        // Handle machine activity updates
        if (updateData.type === 'machine-activity') {
            // Update machine's active status and lastActiveAt
            const machine = storage.getState().machines[updateData.id];
            if (machine) {
                const updatedMachine: Machine = {
                    ...machine,
                    active: updateData.active,
                    activeAt: updateData.activeAt
                };
                storage.getState().applyMachines([updatedMachine]);
            }
        }

        // daemon-status ephemeral updates are deprecated, machine status is handled via machine-activity
    }

    //
    // Apply store
    //

    private applyMessages = (sessionId: string, messages: NormalizedMessage[]) => {
        const result = storage.getState().applyMessages(sessionId, messages);
        let m: Message[] = [];
        for (let messageId of result.changed) {
            const message = storage.getState().sessionMessages[sessionId].messagesMap[messageId];
            if (message) {
                m.push(message);
            }
        }
        if (m.length > 0) {
            voiceHooks.onMessages(sessionId, m);
        }
        if (result.hasReadyEvent) {
            voiceHooks.onReady(sessionId);
        }
    }

    private applySessions = (sessions: (Omit<Session, "presence"> & {
        presence?: "online" | number;
    })[]) => {
        const active = storage.getState().getActiveSessions();
        storage.getState().applySessions(sessions);
        const newActive = storage.getState().getActiveSessions();
        this.applySessionDiff(active, newActive);
    }

    private applySessionDiff = (active: Session[], newActive: Session[]) => {
        let wasActive = new Set(active.map(s => s.id));
        let isActive = new Set(newActive.map(s => s.id));
        for (let s of active) {
            if (!isActive.has(s.id)) {
                voiceHooks.onSessionOffline(s.id, s.metadata ?? undefined);
            }
        }
        for (let s of newActive) {
            if (!wasActive.has(s.id)) {
                voiceHooks.onSessionOnline(s.id, s.metadata ?? undefined);
            }
        }
    }

    //
    // Team Messaging
    //

    /**
     * 获取团队消息列表
     */
    async getTeamMessages(teamId: string): Promise<import('@/sync/teamMessageTypes').TeamMessageListResponse> {
        // 先检查缓存
        const cached = this.teamMessagesCache.get(teamId);
        if (cached) {
            return {
                messages: cached,
                hasMore: false
            };
        }

        try {
            // 从服务器获取（临时实现：从 artifact body 中读取）
            const serverUrl = getServerUrl();
            const response = await apiSocket.request(`/v1/teams/${teamId}/messages`);

            if (!response.ok) {
                const text = await response.text();
                throw new Error(`Failed to fetch team messages: ${response.status} - ${text}`);
            }

            const data = await response.json();
            const messages = data.messages || [];

            // PROTECTED: Acquire mutex before writing to Map
            await this.getTeamMessagesMutex(teamId).runExclusive(async () => {
                // 缓存消息
                this.teamMessagesCache.set(teamId, messages);
            });

            return {
                messages,
                hasMore: false
            };
        } catch (error) {
            console.error('Failed to fetch team messages:', error);
            // 返回空列表而不是抛出错误
            return {
                messages: [],
                hasMore: false
            };
        }
    }

    /**
     * 发送团队消息
     */
    async sendTeamMessage(request: import('@/sync/teamMessageTypes').SendTeamMessageRequest): Promise<void> {
        try {
            const serverUrl = getServerUrl();

            // 获取当前 session 信息
            const sessions = storage.getState().sessionsData || [];
            const fromSessionId = request.fromSessionId;

            // Resolve session metadata only when we have a session ID
            const sendingSession = fromSessionId
                ? sessions.find((s): s is import('@/sync/storageTypes').Session => typeof s !== 'string' && s.id === fromSessionId)
                : undefined;

            const fromRole = request.fromRole ?? (sendingSession?.metadata?.role);
            const fromDisplayName = request.fromDisplayName ?? (sendingSession?.metadata?.name || sendingSession?.metadata?.path);

            const messageId = request.id ?? randomUUID();
            const message: import('@/sync/teamMessageTypes').TeamMessage = {
                id: messageId,
                teamId: request.teamId,
                ...(fromSessionId ? { fromSessionId } : {}),
                ...(fromRole ? { fromRole } : {}),
                ...(fromDisplayName ? { fromDisplayName } : {}),
                content: request.content,
                type: request.type || 'chat',
                ...(request.mentions ? { mentions: request.mentions } : {}),
                timestamp: Date.now(),
                ...(request.metadata ? { metadata: request.metadata } : {})
            };

            const response = await apiSocket.request(`/v1/teams/${request.teamId}/messages`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(message)
            });

            if (!response.ok) {
                const text = await response.text();
                throw new Error(`Failed to send team message: ${response.status} - ${text}`);
            }

            // PROTECTED: Acquire mutex for this teamId to prevent concurrent Map access
            await this.getTeamMessagesMutex(request.teamId).runExclusive(async () => {
                // 立即更新本地缓存
                const cached = this.teamMessagesCache.get(request.teamId) || [];
                this.teamMessagesCache.set(request.teamId, [...cached, message]);

                // 触发本地订阅者
                // NOTE: Reading teamMessageSubscriptions is safe because we only read, not mutate
                const subscribers = this.teamMessageSubscriptions.get(request.teamId);
                if (subscribers) {
                    subscribers.forEach(callback => callback(message));
                }
            });
        } catch (error) {
            console.error('Failed to send team message:', error);
            throw error;
        }
    }

    /**
     * 订阅团队消息
     */
    subscribeToTeamMessages(
        teamId: string,
        callback: (message: import('@/sync/teamMessageTypes').TeamMessage) => void
    ): () => void {
        // PROTECTED: Acquire mutex for this teamId's subscription set
        return this.getTeamSubscriptionsMutex(teamId).runExclusive(() => {
            let subscribers = this.teamMessageSubscriptions.get(teamId);
            if (!subscribers) {
                subscribers = new Set();
                this.teamMessageSubscriptions.set(teamId, subscribers);
            }

            subscribers.add(callback);

            // 返回取消订阅函数
            return () => {
                // NOTE: Unsubscribing doesn't need mutex because Set.delete is atomic in JS
                // and we're not modifying the Map structure itself
                const subs = this.teamMessageSubscriptions.get(teamId);
                if (subs) {
                    subs.delete(callback);
                    if (subs.size === 0) {
                        // PROTECTED: Delete from Map needs mutex protection
                        this.getTeamSubscriptionsMutex(teamId).runExclusive(() => {
                            this.teamMessageSubscriptions.delete(teamId);
                        });
                    }
                }
            };
        }) as any; // Type assertion because runExclusive returns Promise<void>
    }
}

// Global singleton instance
export const sync = new Sync();

//
// Init sequence
//

let isInitialized = false;
export async function syncCreate(credentials: AuthCredentials) {
    if (isInitialized) {
        console.warn('Sync already initialized: ignoring');
        return;
    }
    isInitialized = true;
    await syncInit(credentials, false);
}

export async function syncRestore(credentials: AuthCredentials) {
    if (isInitialized) {
        console.warn('Sync already initialized: ignoring');
        return;
    }
    isInitialized = true;
    await syncInit(credentials, true);
}

async function syncInit(credentials: AuthCredentials, restore: boolean) {

    // Initialize sync engine
    const secretKey = decodeBase64(credentials.secret, 'base64url');
    if (secretKey.length !== 32) {
        throw new Error(`Invalid secret key length: ${secretKey.length}, expected 32`);
    }
    const encryption = await Encryption.create(secretKey);

    // Initialize tracking
    initializeTracking(encryption.anonID);

    // Initialize socket connection
    const API_ENDPOINT = getServerUrl();
    apiSocket.initialize({ endpoint: API_ENDPOINT, token: credentials.token }, encryption);

    // Wire socket status to storage
    apiSocket.onStatusChange((status) => {
        storage.getState().setSocketStatus(status);
    });

    // Initialize sessions engine
    if (restore) {
        await sync.restore(credentials, encryption);
    } else {
        await sync.create(credentials, encryption);
    }
}
