import type { DecryptedArtifact } from './artifactTypes';

export function mergeArtifact(
    existingArtifact: DecryptedArtifact | undefined,
    nextArtifact: DecryptedArtifact,
): DecryptedArtifact {
    if (!existingArtifact) {
        return nextArtifact;
    }

    return {
        ...existingArtifact,
        ...nextArtifact,
        title: nextArtifact.title,
        type: nextArtifact.type !== undefined ? nextArtifact.type : existingArtifact.type,
        sessions: nextArtifact.sessions !== undefined ? nextArtifact.sessions : existingArtifact.sessions,
        draft: nextArtifact.draft !== undefined ? nextArtifact.draft : existingArtifact.draft,
        body: nextArtifact.body !== undefined ? nextArtifact.body : existingArtifact.body,
        bodyVersion: nextArtifact.bodyVersion !== undefined ? nextArtifact.bodyVersion : existingArtifact.bodyVersion,
    };
}
