import type { MarkdownBlock } from "./parseMarkdown";
import { parseMarkdownSpans } from "./parseMarkdownSpans";

export function parseMarkdownBlock(markdown: string) {
    const blocks: MarkdownBlock[] = [];
    const lines = markdown.split('\n');
    let index = 0;
    outer: while (index < lines.length) {
        const line = lines[index];
        index++;

        // Headers
        for (let i = 1; i <= 6; i++) {
            if (line.startsWith(`${'#'.repeat(i)} `)) {
                blocks.push({ type: 'header', level: i as 1 | 2 | 3 | 4 | 5 | 6, content: parseMarkdownSpans(line.slice(i + 1).trim(), true) });
                continue outer;
            }
        }

        // Trim
        let trimmed = line.trim();

        // Code block
        if (trimmed.startsWith('```')) {
            const language = trimmed.slice(3).trim() || null;
            let content = [];
            while (index < lines.length) {
                const nextLine = lines[index];
                if (nextLine.trim() === '```') {
                    index++;
                    break;
                }
                content.push(nextLine);
                index++;
            }
            blocks.push({ type: 'code-block', language, content: content.join('\n') });
            continue;
        }

        // Table detection - check if line starts with | or contains | and next line is separator
        if (trimmed.includes('|')) {
            // Check if this could be a table header
            const headerCells = parseTableRow(trimmed);
            if (headerCells.length > 0 && index < lines.length) {
                const nextLine = lines[index]?.trim();
                // Check if next line is a separator line (contains | and -)
                if (nextLine && isTableSeparator(nextLine)) {
                    // Parse alignments from separator
                    const alignments = parseTableAlignments(nextLine);
                    index++; // Skip separator line

                    // Collect data rows
                    const rows: string[][] = [];
                    while (index < lines.length) {
                        const rowLine = lines[index].trim();
                        if (!rowLine.includes('|')) break;
                        const rowCells = parseTableRow(rowLine);
                        if (rowCells.length === 0) break;
                        rows.push(rowCells);
                        index++;
                    }

                    blocks.push({
                        type: 'table',
                        headers: headerCells,
                        alignments: alignments,
                        rows: rows
                    });
                    continue;
                }
            }
        }

        // Horizontal rule (must come after table check)
        if (trimmed === '---') {
            blocks.push({ type: 'horizontal-rule' });
            continue;
        }

        // Options block
        if (trimmed.startsWith('<options>')) {
            let items: string[] = [];
            while (index < lines.length) {
                const nextLine = lines[index];
                if (nextLine.trim() === '</options>') {
                    index++;
                    break;
                }
                // Extract content from <option> tags
                const optionMatch = nextLine.match(/<option>(.*?)<\/option>/);
                if (optionMatch) {
                    items.push(optionMatch[1]);
                }
                index++;
            }
            if (items.length > 0) {
                blocks.push({ type: 'options', items });
            }
            continue;
        }

        // If it is a numbered list
        const numberedListMatch = trimmed.match(/^(\d+)\.\s/);
        if (numberedListMatch) {
            let allLines = [{ number: parseInt(numberedListMatch[1]), content: trimmed.slice(numberedListMatch[0].length) }];
            while (index < lines.length) {
                const nextLine = lines[index].trim();
                const nextMatch = nextLine.match(/^(\d+)\.\s/);
                if (!nextMatch) break;
                allLines.push({ number: parseInt(nextMatch[1]), content: nextLine.slice(nextMatch[0].length) });
                index++;
            }
            blocks.push({ type: 'numbered-list', items: allLines.map((l) => ({ number: l.number, spans: parseMarkdownSpans(l.content, false) })) });
            continue;
        }

        // If it is a list
        if (trimmed.startsWith('- ')) {
            let allLines = [trimmed.slice(2)];
            while (index < lines.length && lines[index].trim().startsWith('- ')) {
                allLines.push(lines[index].trim().slice(2));
                index++;
            }
            blocks.push({ type: 'list', items: allLines.map((l) => parseMarkdownSpans(l, false)) });
            continue;
        }

        // Fallback
        if (trimmed.length > 0) {
            blocks.push({ type: 'text', content: parseMarkdownSpans(trimmed, false) });
        }
    }
    return blocks;
}

// Helper functions for table parsing

function parseTableRow(line: string): string[] {
    // Remove leading/trailing pipes and split by |
    let trimmed = line.trim();
    if (trimmed.startsWith('|')) trimmed = trimmed.slice(1);
    if (trimmed.endsWith('|')) trimmed = trimmed.slice(0, -1);

    return trimmed.split('|').map(cell => cell.trim());
}

function isTableSeparator(line: string): boolean {
    // A separator line contains only |, -, :, and spaces
    const separatorPattern = /^[\|\-\:\s]+$/;
    if (!separatorPattern.test(line)) return false;

    // Must contain at least one -
    return line.includes('-');
}

function parseTableAlignments(separatorLine: string): ('left' | 'center' | 'right')[] {
    const cells = parseTableRow(separatorLine);
    return cells.map(cell => {
        const trimmed = cell.trim();
        const hasLeftColon = trimmed.startsWith(':');
        const hasRightColon = trimmed.endsWith(':');

        if (hasLeftColon && hasRightColon) return 'center';
        if (hasRightColon) return 'right';
        return 'left'; // default
    });
}