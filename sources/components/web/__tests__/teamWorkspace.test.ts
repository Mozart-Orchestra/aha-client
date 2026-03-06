import { describe, expect, it } from 'vitest';
import {
    TEAM_WORKSPACE_ACTION_HREFS,
    TEAM_WORKSPACE_TAB_META,
    withTeamWorkspaceQuery,
} from '../teamWorkspace';

describe('teamWorkspace navigation contract', () => {
    it('maps the primary workspace tabs to dedicated surfaces', () => {
        expect(TEAM_WORKSPACE_TAB_META.chat.href).toBe('/web/team-chat');
        expect(TEAM_WORKSPACE_TAB_META.board.href).toBe('/web/board');
        expect(TEAM_WORKSPACE_TAB_META.info.href).toBe('/web/team-info');
    });

    it('preserves the selected team id in workspace routes', () => {
        expect(withTeamWorkspaceQuery('/web/board', 'team-42')).toBe('/web/board?teamId=team-42');
        expect(withTeamWorkspaceQuery('/web/team-chat')).toBe('/web/team-chat');
    });

    it('keeps the shell-level entry actions aligned with the default workspace', () => {
        expect(TEAM_WORKSPACE_ACTION_HREFS.manageTeams).toBe('/teams');
        expect(TEAM_WORKSPACE_ACTION_HREFS.newEmptySession).toBe('/new');
        expect(TEAM_WORKSPACE_ACTION_HREFS.onboarding).toBe('/web/onboarding');
    });
});
