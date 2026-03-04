import type { DecryptedArtifact } from '@/sync/artifactTypes';

export type TeamTaskStatus = 'todo' | 'in-progress' | 'review' | 'done';

export interface TeamTaskSnapshot {
    id: string;
    title: string;
    status: TeamTaskStatus;
    assigneeId?: string | null;
    updatedAt: number;
}

export interface TeamOverview {
    id: string;
    title: string;
    description: string;
    memberCount: number;
    roleSlots: number;
    taskCount: number;
    activeTaskCount: number;
    doneTaskCount: number;
    statusCounts: Record<TeamTaskStatus, number>;
    tasks: TeamTaskSnapshot[];
    hasBody: boolean;
    parseError: boolean;
    updatedAt: number;
    updatedAtLabel: string;
}

export interface TeamAggregateStats {
    teamCount: number;
    memberCount: number;
    taskCount: number;
    activeTaskCount: number;
    doneTaskCount: number;
}

export interface TeamBoardColumn {
    id: TeamTaskStatus;
    title: string;
    tasks: TeamTaskSnapshot[];
}

const STATUS_ORDER: TeamTaskStatus[] = ['todo', 'in-progress', 'review', 'done'];

const STATUS_TITLES: Record<TeamTaskStatus, string> = {
    todo: 'To Do',
    'in-progress': 'In Progress',
    review: 'Review',
    done: 'Done',
};

const EMPTY_STATUS_COUNTS: Record<TeamTaskStatus, number> = {
    todo: 0,
    'in-progress': 0,
    review: 0,
    done: 0,
};

function isRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === 'object' && value !== null;
}

export function normalizeTaskStatus(rawStatus: unknown): TeamTaskStatus {
    if (typeof rawStatus !== 'string') {
        return 'todo';
    }

    const normalized = rawStatus.trim().toLowerCase().replace(/[_\s]+/g, '-');
    if (normalized === 'inprogress') {
        return 'in-progress';
    }
    if (STATUS_ORDER.includes(normalized as TeamTaskStatus)) {
        return normalized as TeamTaskStatus;
    }
    return 'todo';
}

export function summarizeTeamArtifact(artifact: DecryptedArtifact): TeamOverview {
    let parsedBody: unknown = null;
    let parseError = false;

    if (typeof artifact.body === 'string' && artifact.body.trim().length > 0) {
        try {
            parsedBody = JSON.parse(artifact.body);
        } catch {
            parseError = true;
        }
    }

    const root = isRecord(parsedBody) ? parsedBody : {};
    const teamNode = isRecord(root.team) ? root.team : root;

    const members = Array.isArray(teamNode.members) ? teamNode.members : [];
    const roles = Array.isArray(teamNode.roles) ? teamNode.roles : [];
    const rawTasks = Array.isArray(root.tasks) ? root.tasks : [];

    const tasks: TeamTaskSnapshot[] = rawTasks
        .filter((task): task is Record<string, unknown> => isRecord(task))
        .map((task, index) => {
            const fallbackId = `${artifact.id}-task-${index}`;
            const id = typeof task.id === 'string' && task.id.trim().length > 0 ? task.id : fallbackId;
            const title = typeof task.title === 'string' && task.title.trim().length > 0
                ? task.title
                : 'Untitled Task';
            const assigneeId = typeof task.assigneeId === 'string' ? task.assigneeId : null;
            const updatedAt = typeof task.updatedAt === 'number' ? task.updatedAt : artifact.updatedAt;

            return {
                id,
                title,
                assigneeId,
                updatedAt,
                status: normalizeTaskStatus(task.status),
            };
        });

    const statusCounts = tasks.reduce<Record<TeamTaskStatus, number>>((acc, task) => {
        acc[task.status] += 1;
        return acc;
    }, { ...EMPTY_STATUS_COUNTS });

    const memberCount = members.length || artifact.sessions?.length || 0;
    const roleSlots = roles.reduce((total, role) => {
        if (!isRecord(role)) return total;
        const quantity = Number(role.quantity ?? 0);
        if (!Number.isFinite(quantity) || quantity <= 0) return total;
        return total + quantity;
    }, 0);

    const titleFromBody =
        typeof teamNode.name === 'string' ? teamNode.name.trim() : '';
    const titleFromArtifact = typeof artifact.title === 'string' ? artifact.title.trim() : '';
    const title = titleFromArtifact || titleFromBody || 'Untitled Team';

    const descriptionFromGoal = typeof teamNode.goal === 'string' ? teamNode.goal.trim() : '';
    const descriptionFromDesc = typeof teamNode.description === 'string' ? teamNode.description.trim() : '';
    const description = descriptionFromGoal
        || descriptionFromDesc
        || `Collaborative team with ${Math.max(memberCount, 1)} member${memberCount === 1 ? '' : 's'}.`;

    const taskCount = tasks.length;
    const doneTaskCount = statusCounts.done;
    const activeTaskCount = Math.max(0, taskCount - doneTaskCount);

    return {
        id: artifact.id,
        title,
        description,
        memberCount,
        roleSlots,
        taskCount,
        activeTaskCount,
        doneTaskCount,
        statusCounts,
        tasks,
        hasBody: Boolean(artifact.body),
        parseError,
        updatedAt: artifact.updatedAt,
        updatedAtLabel: new Date(artifact.updatedAt).toLocaleDateString(),
    };
}

export function summarizeTeamArtifacts(artifacts: DecryptedArtifact[]): TeamOverview[] {
    return artifacts
        .filter((artifact) => artifact.type === 'team')
        .map(summarizeTeamArtifact)
        .sort((a, b) => b.updatedAt - a.updatedAt);
}

export function aggregateTeamStats(teams: TeamOverview[]): TeamAggregateStats {
    return teams.reduce<TeamAggregateStats>((acc, team) => ({
        teamCount: acc.teamCount + 1,
        memberCount: acc.memberCount + team.memberCount,
        taskCount: acc.taskCount + team.taskCount,
        activeTaskCount: acc.activeTaskCount + team.activeTaskCount,
        doneTaskCount: acc.doneTaskCount + team.doneTaskCount,
    }), {
        teamCount: 0,
        memberCount: 0,
        taskCount: 0,
        activeTaskCount: 0,
        doneTaskCount: 0,
    });
}

export function buildBoardColumns(tasks: TeamTaskSnapshot[]): TeamBoardColumn[] {
    const grouped = STATUS_ORDER.reduce<Record<TeamTaskStatus, TeamTaskSnapshot[]>>((acc, status) => {
        acc[status] = [];
        return acc;
    }, {
        todo: [],
        'in-progress': [],
        review: [],
        done: [],
    });

    tasks.forEach((task) => {
        grouped[task.status].push(task);
    });

    return STATUS_ORDER.map((status) => ({
        id: status,
        title: STATUS_TITLES[status],
        tasks: grouped[status].sort((a, b) => b.updatedAt - a.updatedAt),
    }));
}
