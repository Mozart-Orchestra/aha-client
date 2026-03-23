export function looksLikeConcatenatedAbsolutePaths(value: string): boolean {
    const trimmed = value.trim();
    if (!trimmed) {
        return false;
    }

    const absolutePathTokens = trimmed.match(/(?:^|[\s\n])\/[^\s]+/g) ?? [];
    return absolutePathTokens.length > 1;
}

export function getConcatenatedPathErrorMessage(value: string): string | null {
    if (!looksLikeConcatenatedAbsolutePaths(value)) {
        return null;
    }

    return `The working directory looks invalid: "${value}". It appears to contain multiple absolute paths joined together. Please provide exactly one project directory.`;
}
