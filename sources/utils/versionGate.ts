import type { TeamReleaseGate } from '@/sync/apiTeamComposition';

export interface GateReadiness {
    passed: number;
    total: number;
    ready: boolean;
    missing: Array<'aha-cli' | 'happy-server' | 'kanban'>;
}

export interface ReleaseGateSummary {
    totalGates: number;
    readyGates: number;
    allReady: boolean;
}

export function calculateGateReadiness(gate: TeamReleaseGate): GateReadiness {
    const requiredChecks = gate.requiredChecks || [];
    const missing = requiredChecks
        .filter((check) => check.status !== 'passed')
        .map((check) => check.component) as Array<'aha-cli' | 'happy-server' | 'kanban'>;

    const total = requiredChecks.length;
    const passed = total - missing.length;

    return {
        passed,
        total,
        ready: missing.length === 0 && total > 0,
        missing,
    };
}

export function summarizeReleaseGates(gates: TeamReleaseGate[]): ReleaseGateSummary {
    const totalGates = gates.length;
    const readyGates = gates.filter((gate) => calculateGateReadiness(gate).ready).length;

    return {
        totalGates,
        readyGates,
        allReady: totalGates > 0 && readyGates === totalGates,
    };
}
