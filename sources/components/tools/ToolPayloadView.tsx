import * as React from 'react';
import { Text, View } from 'react-native';
import { Image } from 'expo-image';
import { StyleSheet } from 'react-native-unistyles';
import { CodeView } from '../session/CodeView';

type EmbeddedImage = {
    path: string;
    uri: string;
    width?: number;
    height?: number;
};

type ParsedPayload = {
    inspectable: unknown;
    code: string;
};

const DATA_URI_IMAGE_PREFIX = /^data:image\/[a-zA-Z0-9.+-]+;base64,/i;

function isRecord(value: unknown): value is Record<string, any> {
    return !!value && typeof value === 'object' && !Array.isArray(value);
}

function guessMimeTypeFromBase64(data: string): string {
    if (data.startsWith('iVBORw0KGgo')) {
        return 'image/png';
    }
    if (data.startsWith('/9j/')) {
        return 'image/jpeg';
    }
    if (data.startsWith('R0lGOD')) {
        return 'image/gif';
    }
    if (data.startsWith('UklGR')) {
        return 'image/webp';
    }
    if (data.startsWith('PHN2Zy') || data.startsWith('PD94bWwg')) {
        return 'image/svg+xml';
    }
    return 'image/png';
}

function resolveMimeType(source: Record<string, any>): string {
    const mimeType = source.mimeType || source.mediaType || source.mime_type;
    if (typeof mimeType === 'string' && mimeType.trim()) {
        return mimeType;
    }
    if (typeof source.data === 'string') {
        return guessMimeTypeFromBase64(source.data);
    }
    return 'image/png';
}

function resolveImageUri(source: Record<string, any>): string | null {
    if (typeof source.data !== 'string' || !source.data.trim()) {
        return null;
    }
    if (DATA_URI_IMAGE_PREFIX.test(source.data)) {
        return source.data;
    }
    return `data:${resolveMimeType(source)};base64,${source.data}`;
}

function isBase64ImageSource(source: unknown): source is Record<string, any> {
    return isRecord(source)
        && source.type === 'base64'
        && typeof source.data === 'string'
        && source.data.length > 0;
}

function isEmbeddedImageBlock(value: unknown): value is Record<string, any> {
    return isRecord(value)
        && value.type === 'image'
        && isBase64ImageSource(value.source);
}

function isJsonLikeString(value: string): boolean {
    const trimmed = value.trim();
    return trimmed.startsWith('{') || trimmed.startsWith('[');
}

function parsePayload(value: unknown): ParsedPayload {
    if (typeof value === 'string') {
        if (DATA_URI_IMAGE_PREFIX.test(value)) {
            return { inspectable: value, code: `[image data URI omitted: ${value.length} chars]` };
        }
        if (isJsonLikeString(value)) {
            try {
                const parsed = JSON.parse(value);
                return {
                    inspectable: parsed,
                    code: safeStringify(sanitizePayload(parsed)),
                };
            } catch {
                return { inspectable: value, code: value };
            }
        }
        return { inspectable: value, code: value };
    }

    return {
        inspectable: value,
        code: safeStringify(sanitizePayload(value)),
    };
}

function sanitizePayload(value: unknown, seen = new WeakSet<object>()): unknown {
    if (isEmbeddedImageBlock(value)) {
        return {
            ...value,
            source: {
                ...value.source,
                data: `[base64 image omitted: ${value.source.data.length} chars]`,
            },
        };
    }

    if (typeof value === 'string' && DATA_URI_IMAGE_PREFIX.test(value)) {
        return `[image data URI omitted: ${value.length} chars]`;
    }

    if (Array.isArray(value)) {
        return value.map((item) => sanitizePayload(item, seen));
    }

    if (isRecord(value)) {
        if (seen.has(value)) {
            return '[circular]';
        }
        seen.add(value);

        const output: Record<string, unknown> = {};
        for (const [key, child] of Object.entries(value)) {
            output[key] = sanitizePayload(child, seen);
        }
        return output;
    }

    return value;
}

function safeStringify(value: unknown): string {
    try {
        const stringified = JSON.stringify(value, null, 2);
        if (typeof stringified === 'string') {
            return stringified;
        }
    } catch {
        // Fall through to string conversion below.
    }

    if (typeof value === 'string') {
        return value;
    }
    if (value === undefined) {
        return '';
    }
    return String(value);
}

function collectEmbeddedImages(
    value: unknown,
    path = 'root',
    images: EmbeddedImage[] = [],
    seen = new WeakSet<object>()
): EmbeddedImage[] {
    if (typeof value === 'string' && DATA_URI_IMAGE_PREFIX.test(value)) {
        images.push({ path, uri: value });
        return images;
    }

    if (isEmbeddedImageBlock(value)) {
        const uri = resolveImageUri(value.source);
        if (uri) {
            images.push({
                path,
                uri,
                width: typeof value.width === 'number' ? value.width : undefined,
                height: typeof value.height === 'number' ? value.height : undefined,
            });
        }
        return images;
    }

    if (Array.isArray(value)) {
        value.forEach((item, index) => {
            collectEmbeddedImages(item, `${path}[${index}]`, images, seen);
        });
        return images;
    }

    if (isRecord(value)) {
        if (seen.has(value)) {
            return images;
        }
        seen.add(value);

        for (const [key, child] of Object.entries(value)) {
            const nextPath = path === 'root' ? key : `${path}.${key}`;
            collectEmbeddedImages(child, nextPath, images, seen);
        }
    }

    return images;
}

function getImageStyle(image: EmbeddedImage) {
    if (image.width && image.height && image.width > 0 && image.height > 0) {
        return { aspectRatio: image.width / image.height };
    }
    return { height: 220 };
}

interface ToolPayloadViewProps {
    value: unknown;
}

export const ToolPayloadView = React.memo<ToolPayloadViewProps>(({ value }) => {
    const parsedPayload = React.useMemo(() => parsePayload(value), [value]);
    const images = React.useMemo(
        () => collectEmbeddedImages(parsedPayload.inspectable),
        [parsedPayload.inspectable]
    );

    return (
        <View style={styles.container}>
            {images.length > 0 && (
                <View style={styles.imagesContainer}>
                    {images.map((image, index) => (
                        <View key={`${image.path}-${index}`} style={styles.imageCard}>
                            <Image
                                source={{ uri: image.uri }}
                                style={[styles.image, getImageStyle(image)]}
                                contentFit="contain"
                            />
                            {images.length > 1 && (
                                <Text style={styles.imagePath} numberOfLines={1}>
                                    {image.path}
                                </Text>
                            )}
                        </View>
                    ))}
                </View>
            )}
            <CodeView code={parsedPayload.code} />
        </View>
    );
});

const styles = StyleSheet.create((theme) => ({
    container: {
        gap: 10,
    },
    imagesContainer: {
        gap: 10,
    },
    imageCard: {
        backgroundColor: theme.colors.surfaceHigh,
        borderRadius: 8,
        overflow: 'hidden',
    },
    image: {
        width: '100%',
        backgroundColor: theme.colors.surface,
    },
    imagePath: {
        paddingHorizontal: 10,
        paddingVertical: 8,
        fontSize: 12,
        color: theme.colors.textSecondary,
    },
}));
