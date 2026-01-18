# Team Messaging & Multi-Agent Architecture Analysis

## Table of Contents
1. [High-Level Architecture](#high-level-architecture)
2. [Team Message Flow](#team-message-flow)
3. [Dashboard Data Flow](#dashboard-data-flow)
4. [Multi-Agent Communication](#multi-agent-communication)
5. [Critical Gaps](#critical-gaps)
6. [Recommendations](#recommendations)

---

## High-Level Architecture

```mermaid
graph TB
    subgraph "User Layer"
        KANBAN[Kanban Dashboard<br/>sources/app/(app)/teams/[id].tsx]
    end

    subgraph "Server Layer"
        SERVER[Happy Server<br/>../happy-server]
        ROUTER[Event Router<br/>eventRouter.ts:238-260]
        KV[KV Store<br/>Encrypted Messages]
    end

    subgraph "Agent Layer"
        CLI[Happy CLI Agents<br/>../happy-cli]
        MASTER[Master Agent<br/>Orchestrator]
        BUILDER[Builder Agent<br/>Implementation]
        FRAMER[Framer Agent<br/>Architecture]
        REVIEWER[Reviewer Agent<br/>Quality]
    end
    
    subgraph "Shared Layer"
        CONFIG[Shared Team Config<br/>@happy/shared-team-config]
    end
    
    KANBAN <-->|WebSocket /v1/updates<br/>User-Scoped| SERVER
    KANBAN <-->|HTTP POST<br/>/v1/teams/:teamId/messages| SERVER
    
    CLI <-->|WebSocket /v1/updates<br/>Session-Scoped| SERVER
    SERVER --> ROUTER
    ROUTER <--> KANBAN
    ROUTER <--> CLI
    ROUTER <--> MASTER
    ROUTER <--> BUILDER
    ROUTER <--> FRAMER
    ROUTER <--> REVIEWER
    
    SERVER -->|Read/Write<br/>team_messages.*| KV
    
    KANBAN -.->|Import| CONFIG
    CLI -.->|Import| CONFIG
    MASTER -.->|Import| CONFIG
    
    style KANBAN fill:#e1f5ff
    style SERVER fill:#ffe1e1
    style ROUTER fill:#fff4e1
    style CLI fill:#e1ffe1
    style CONFIG fill:#f4e1ff
```

---

## Team Message Flow

### Sending a Message

```mermaid
sequenceDiagram
    participant User
    participant Kanban
    participant Sync
    participant API
    participant Server
    participant Router
    participant KV
    
    User->>Kanban: Type message
    Kanban->>Sync: sendTeamMessage(request)
    Note over Kanban: sources/app/(app)/teams/[id].tsx:505-532
    
    Sync->>Sync: Build TeamMessage object
    Note over Sync: Include timestamp, ID, type, mentions
    
    Sync->>API: POST /v1/teams/:teamId/messages
    Note over Sync: sources/sync/sync.ts:2578-2633
    
    API->>Server: Socket.IO request
    Server->>Server: Validate & override identity
    Note over Server: Prevent spoofing<br/>teamMessagesRoutes.ts:93-210
    
    Server->>KV: Store encrypted message
    Note over KV: Key: team_messages.${teamId}.${timestamp}.${id}
    
    Server->>Router: emitUpdate({ userId, payload })
    Note over Router: Event Router<br/>eventRouter.ts:238-260
    
    Router->>Router: shouldSendToConnection()
    Note over Router: Filter by recipient type
    
    Router-->>Kanban: WebSocket 'update'<br/>{ t: 'team-message' }
    Router-->>Agent: WebSocket 'update'<br/>{ t: 'team-message' }
    
    Kanban->>Kanban: Update local cache
    Kanban->>Kanban: Notify subscribers
    Agent->>Agent: Process in message queue
```

### Receiving Messages

```mermaid
sequenceDiagram
    participant Router
    participant KanbanWS
    participant KanbanChat
    participant AgentWS
    participant AgentHandler
    participant AgentQueue
    
    Router->>KanbanWS: emit('update', { t: 'team-message', message })
    KanbanWS->>KanbanWS: handleUpdate()
    Note over KanbanWS: sources/sync/sync.ts:2061-2081
    
    alt Not duplicate
        KanbanWS->>KanbanWS: Add to teamMessagesCache
        KanbanWS->>KanbanChat: callback(message)
        
        KanbanChat->>KanbanChat: Update messages state
        KanbanChat->>KanbanChat: Auto-scroll to bottom
        Note over KanbanChat: sources/components/TeamChatRoom.tsx:458-472
    end
    
    Router->>AgentWS: emit('update', { t: 'team-message', message })
    AgentWS->>AgentWS: emit('team-message', message)
    Note over AgentWS: ../happy-cli/src/api/apiSession.ts:144-152

    AgentWS->>AgentHandler: teamMessageListener(message)
    Note over AgentHandler: ../happy-cli/src/claude/runClaude.ts:350-460
    
    AgentHandler->>AgentHandler: Check: should I respond?
    Note over AgentHandler: Based on role, mentions, priority
    
    alt Should respond
        AgentHandler->>AgentHandler: formatTeamMessage()
        AgentHandler->>AgentQueue: push(message)
        Note over AgentQueue: Processed by Claude
    end
```

---

## Dashboard Data Flow

### Kanban Board Data Sources

```mermaid
graph LR
    subgraph "Dashboard Component"
        DASH[Team Dashboard<br/>sources/app/(app)/teams/[id].tsx]
    end
    
    subgraph "Data Sources"
        ARTIFACT[Artifact Body<br/>JSON.parse(artifact.body)]
        SESSIONS[Artifact Sessions<br/>artifact.sessions]
        DESKTOP[Desktop Bridge<br/>useDesktopBridge]
    end
    
    subgraph "Derived Data"
        KANBAN[Kanban Board<br/>tasks, columns, team]
        ROSTER[Team Roster<br/>members with roles]
        ACTIVE[Active Members<br/>session.active = true]
    end
    
    subgraph "Hooks & Effects"
        USE_ARTIFACT[useArtifact teamId]
        USE_SESSIONS[useAllSessions]
        USE_DESKTOP[useDesktopBridge]
    end
    
    ARTIFACT --> USE_ARTIFACT
    SESSIONS --> USE_ARTIFACT
    DESKTOP --> USE_DESKTOP
    
    USE_ARTIFACT --> KANBAN
    USE_SESSIONS --> ROSTER
    USE_DESKTOP --> DASH
    
    KANBAN --> DASH
    ROSTER --> DASH
    ACTIVE --> DASH
    
    style DASH fill:#e1f5ff
    style KANBAN fill:#ffe1e1
    style ROSTER fill:#e1ffe1
```

### Dashboard State Updates

```mermaid
stateDiagram-v2
    [*] --> Loading: Mount component
    
    Loading --> DataFetch: useArtifact(teamId)
    
    DataFetch --> Parsing: Fetch artifact
    DataFetch --> Parsing: Fetch all sessions
    
    Parsing --> Rendering: JSON.parse(artifact.body)
    Parsing --> Rendering: Merge members + sessions
    
    Rendering --> Listening: Set up WebSocket subscriptions
    
    Listening --> Update: Receive 'update-artifact' event
    Listening --> Update: Receive 'team-message' event
    
    Update --> ReRender: Update local state
    ReRender --> Listening: Continue listening
    
    Note right of Update: Potential race condition<br/>Members may not refresh immediately
```

---

## Multi-Agent Communication

### Agent Registration Flow

```mermaid
sequenceDiagram
    participant CLI
    participant Server
    participant DB
    participant Sync
    participant Artifact
    participant Router
    
    CLI->>Server: POST /v1/sessions/start
    Note over CLI: Include teamId, role, sessionId
    
    Server->>DB: Create session record
    Server->>Server: Generate auth token
    Server-->>CLI: session + token
    
    CLI->>Server: WebSocket connect (session-scoped)
    Note over CLI: Auth with sessionId
    
    CLI->>Server: Handshake: Agent ready
    Note over CLI: Send system message
    
    Server->>Router: emitUpdate({ teamId, message })
    
    Server->>Sync: syncSessionToTeam(sessionId, metadata)
    Note over Server: Update team artifact
    
    Sync->>Artifact: GET /v1/artifacts/:teamId
    Artifact-->>Sync: team artifact body
    
    Sync->>Sync: Check if member exists
    alt New member
        Sync->>Sync: Add new member to board.team.members
        Sync->>Artifact: PUT /v1/artifacts/:teamId
        Note over Sync: Update artifact with new member
        
        Artifact->>Router: emitUpdate({ type: 'update-artifact' })
        Router-->>Kanban: WebSocket update
    end
    
    CLI->>CLI: Inject team context
    Note over CLI: Recent messages + filtered board
```

### Agent Response Logic

```mermaid
graph TB
    MSG[Incoming Message] --> CHECK_ROLE{What is my role?}
    
    CHECK_ROLE -->|Master| ALL[Receive ALL messages<br/>Orchestrate workflow]
    CHECK_ROLE -->|Worker| FILTER[Filter messages]
    
    FILTER --> CHECK_MENTION{Am I mentioned?}
    FILTER --> CHECK_MASTER{From Master?}
    FILTER --> CHECK_USER{From User?}
    FILTER --> CHECK_URGENT{Urgent priority?}
    FILTER --> CHECK_TASK{Task update?}
    
    CHECK_MENTION -->|Yes| RESPOND[Should respond]
    CHECK_MASTER -->|Yes| RESPOND
    CHECK_USER -->|Yes| RESPOND
    CHECK_URGENT -->|Yes| RESPOND
    CHECK_TASK -->|Yes| RESPOND
    
    CHECK_MENTION -->|No| IGNORE[Ignore message]
    CHECK_MASTER -->|No| IGNORE
    CHECK_USER -->|No| IGNORE
    CHECK_URGENT -->|No| IGNORE
    CHECK_TASK -->|No| IGNORE
    
    RESPOND --> QUEUE[Push to message queue]
    QUEUE --> CLAUDE[Process by Claude]
    IGNORE --> SKIP[Do nothing]
    
    style ALL fill:#e1ffe1
    style RESPOND fill:#fff4e1
    style IGNORE fill:#f4e1e1
```

---

## Critical Gaps

### Gap 1: Missing Real-Time Member Synchronization

```mermaid
graph LR
    subgraph "CLI Agent Joins"
        A1[Agent starts session]
        A2[Send handshake message]
        A3[syncSessionToTeam called]
    end
    
    subgraph "Server"
        B1[Update artifact body]
        B2[Emit update-artifact event]
    end
    
    subgraph "Dashboard (BROKEN)"
        C1[Receive update-artifact]
        C2[Update artifact.sessions]
        C3[Roster not recalculated]
        C4[Member not visible]
    end
    
    A1 --> A2
    A2 --> A3
    A3 --> B1
    B1 --> B2
    B2 --> C1
    
    C1 -.->|Race condition| C2
    C2 -.->|Misses update| C3
    C3 --> C4
    
    style C3 fill:#f4e1e1
    style C4 fill:#f4e1e1
```

**Root Cause:** `useArtifact(teamId)` hook doesn't react to `artifact.body` changes in the roster useMemo.

**File:** `/Users/swmt/happy/kanban/sources/app/(app)/teams/[id].tsx:405-440`

### Gap 2: WebSocket Connection Type Confusion

```mermaid
graph TB
    subgraph "Server Broadcasts Team Message"
        S1[Receive team message]
        S2[Find all user's sessions]
        S3[recipientFilter: all-user-authenticated-connections]
    end
    
    subgraph "Event Router Routes"
        R1[shouldSendToConnection]
        R2[Send to ALL connection types]
    end
    
    subgraph "Recipients (ALL receive)"
        U1[User-Scoped<br/>Kanban App]
        S4[Session-Scoped<br/>Master Agent]
        S5[Session-Scoped<br/>Builder Agent]
        S6[Session-Scoped<br/>Framer Agent]
        S7[Session-Scoped<br/>Reviewer Agent]
        M1[Machine-Scoped<br/>Daemon]
    end
    
    S1 --> S2
    S2 --> S3
    S3 --> R1
    R1 --> R2
    R2 --> U1
    R2 --> S4
    R2 --> S5
    R2 --> S6
    R2 --> S7
    R2 --> M1
    
    style R2 fill:#f4e1e1
    style S5 fill:#f4e1e1
    style S6 fill:#f4e1e1
    style S7 fill:#f4e1e1
```

**Problem:** Workers receive ALL messages, including irrelevant ones.

**File:** `/Users/swmt/happy/happy-server/sources/app/events/eventRouter.ts:309-335`

### Gap 3: No Role-Based Message Filtering in Dashboard

```mermaid
graph LR
    subgraph "CLI Agent"
        A1[Receive message]
        A2[Check role]
        A3[Check mentions]
        A4[Should I respond?]
        A5[Filter out irrelevant]
    end
    
    subgraph "Dashboard (NO FILTERING)"
        D1[Receive ALL messages]
        D2[Show ALL messages]
        D3[Information overload]
        D4[No relevance indicator]
    end
    
    A1 --> A2
    A2 --> A3
    A3 --> A4
    A4 --> A5
    
    D1 --> D2
    D2 --> D3
    D3 --> D4
    
    style D3 fill:#f4e1e1
    style D4 fill:#f4e1e1
```

**File:** `/Users/swmt/happy/kanban/sources/components/TeamChatRoom.tsx:579-597`

### Gap 4: Missing KV Store Event Consistency

```mermaid
graph TB
    subgraph "Server"
        S1[POST /v1/teams/:teamId/messages]
        S2[Store in KV store]
        S3[kvMutate triggers kv-batch-update]
        S4[Explicit emit: team-message]
    end
    
    subgraph "CLI Expectation"
        E1[Listen for kv-batch-update]
        E2[Parse team_messages.* keys]
        E3[Extract and emit team-message]
    end
    
    subgraph "CLI Actual Behavior"
        A1[Listen for team-message]
        A2[Process if received]
    end
    
    S1 --> S2
    S2 --> S3
    S2 --> S4
    
    E1 -.->|Not triggered| S3
    S4 --> A1
    A1 --> A2
    
    style E1 fill:#f4e1e1
    style E2 fill:#f4e1e1
    style E3 fill:#f4e1e1
```

**Problem:** CLI expects `kv-batch-update` events but server sends explicit `team-message` events.

**Files:** 
- Server: `/Users/swmt/happy/happy-server/sources/app/api/routes/teamMessagesRoutes.ts:150-163`
- CLI: `/Users/swmt/happy/happy-cli/src/api/apiSession.ts:138-151`

### Gap 5: Missing Team Member Presence Tracking

```mermaid
graph LR
    subgraph "Current Behavior"
        C1[session.active = boolean]
        C2[Derived from messages]
        C3[No real-time updates]
    end
    
    subgraph "Expected Behavior"
        E1[ephemeral events]
        E2[Typing indicators]
        E3[Activity timestamps]
        E4[Presence status]
    end
    
    subgraph "Dashboard Display"
        D1[Static online/offline]
        D2[No typing indicators]
        D3[Last seen from messages]
    end
    
    C1 --> D1
    C2 --> D3
    C3 --> D2
    
    E1 -.->|Missing| D4
    E2 -.->|Missing| D2
    E3 -.->|Missing| D3
    E4 -.->|Missing| D1
    
    style E1 fill:#f4e1e1
    style E2 fill:#f4e1e1
    style E3 fill:#f4e1e1
    style E4 fill:#f4e1e1
```

**File:** `/Users/swmt/happy/kanban/sources/components/TeamChatRoom.tsx:332-344`

---

## Recommendations

### High Priority Fixes

#### 1. Fix Real-Time Member Sync

**File:** `/Users/swmt/happy/kanban/sources/app/(app)/teams/[id].tsx:405-440`

```typescript
// BEFORE (current)
const roster = React.useMemo(() => {
    const members = kanbanData.team?.members ?? [];
    const allSessionIds = Array.from(new Set([
        ...(artifact?.sessions ?? []),
        ...members.map(m => m.sessionId)
    ]));
    // ... merge session data
}, [kanbanData.team?.members, artifact?.sessions, sessionLookup]);

// AFTER (fixed)
const roster = React.useMemo(() => {
    const members = kanbanData.team?.members ?? [];
    const allSessionIds = Array.from(new Set([
        ...(artifact?.sessions ?? []),
        ...members.map(m => m.sessionId)
    ]));
    // ... merge session data
}, [kanbanData.team?.members, kanbanData.team, artifact?.sessions, artifact, sessionLookup]);
// Added kanbanData.team and artifact to trigger recompute when body changes
```

#### 2. Implement Role-Based Message Filtering in Dashboard

**File:** `/Users/swmt/happy/kanban/sources/components/TeamChatRoom.tsx:579-597`

```typescript
// Add visual indicators for message relevance
const getMessageRelevance = (message: TeamMessage, myRole?: string): 'high' | 'medium' | 'low' => {
    const isFromUser = !message.fromRole || message.fromRole === 'user';
    const isFromMaster = message.fromRole === 'master';
    const isMentioned = message.mentions?.includes(mySessionId) || message.mentions?.includes(myRole);
    
    if (isFromUser || isFromMaster || isMentioned) return 'high';
    return 'low';
};

// Render with relevance styling
<MessageBubble
    message={message}
    relevance={getMessageRelevance(message)}
    // ...
/>
```

#### 3. Add Team Member Presence Tracking

**File:** `/Users/swmt/happy/happy-server/sources/app/events/eventRouter.ts`

```typescript
// Add new method for ephemeral presence events
emitPresence(params: { userId, sessionId, activity, recipientFilter }): void {
    this.emit({
        userId,
        eventName: 'ephemeral',
        payload: {
            t: 'presence',
            sessionId: params.sessionId,
            activity: params.activity, // 'typing', 'thinking', 'idle'
            activeAt: Date.now()
        },
        recipientFilter: params.recipientFilter
    });
}
```

### Medium Priority Improvements

#### 4. Optimize WebSocket Broadcasting

**File:** `/Users/swmt/happy/happy-server/sources/app/api/routes/teamMessagesRoutes.ts:165-178`

```typescript
// Create team-specific recipient filter
eventRouter.emitUpdate({
    userId,
    payload: messageEvent,
    recipientFilter: { 
        type: 'team-members',
        teamId,
        roles: ['master', 'user'] // Or based on message mentions
    }
});
```

#### 5. Improve Error Handling

Add retry logic, user-friendly error messages, and diagnostic logging throughout the sync layer.

### Low Priority Enhancements

#### 6. Add Message Search and Filtering

#### 7. Enhance Kanban Board Features

---

## Key Files Reference

| Component | File Path | Key Lines |
|-----------|-----------|-----------|
| Team Message Types | `kanban/sources/sync/teamMessageTypes.ts` | 7-91 |
| WebSocket Setup (Kanban) | `kanban/sources/sync/apiSocket.ts` | 51-161 |
| WebSocket Setup (Server) | `server/sources/app/api/socket.ts` | 54-92 |
| Event Router | `server/sources/app/events/eventRouter.ts` | 238-335 |
| Team Message Routes | `server/sources/app/api/routes/teamMessagesRoutes.ts` | 93-210 |
| Sync Layer | `kanban/sources/sync/sync.ts` | 1996-2660 |
| Team Dashboard | `kanban/sources/app/(app)/teams/[id].tsx` | 229-570 |
| Team Chat Room | `kanban/sources/components/TeamChatRoom.tsx` | 306-553 |
| CLI Agent Logic | `cli/src/claude/runClaude.ts` | 280-460 |
| Team Message Storage | `cli/src/claude/team/teamMessageStorage.ts` | 8-64 |
| API Client | `cli/src/api/api.ts` | 325-366 |
| Kanban Types | `kanban/sources/sync/kanbanTypes.ts` | 74-181 |

---

## Conclusion

The infrastructure for multi-agent collaboration exists, but critical gaps in real-time synchronization, message filtering, and presence tracking prevent seamless formation of multi-agent teams in the dashboard. The core issues are:

1. **Race conditions** in dashboard member roster updates
2. **Inefficient broadcasting** sending irrelevant messages to all agents
3. **Missing role-based filtering** in the dashboard UI
4. **Inconsistent event types** between server expectations and CLI implementation
5. **No real-time presence** tracking for agent activity

Addressing these gaps will enable true multi-agent collaboration where agents can join teams, communicate efficiently, and appear seamlessly in the dashboard with real-time status updates.
