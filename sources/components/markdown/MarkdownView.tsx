import { MarkdownSpan, parseMarkdown } from './parseMarkdown';
import { Link } from 'expo-router';
import * as React from 'react';
import { ScrollView, View, Platform, Pressable } from 'react-native';
import { StyleSheet, useUnistyles } from 'react-native-unistyles';
import { Text } from '../ui/StyledText';
import { Typography } from '@/constants/Typography';
import { SimpleSyntaxHighlighter } from '../ui/SimpleSyntaxHighlighter';
import { Modal } from '@/modal';
import { useLocalSetting } from '@/sync/storage';
import { storeTempText } from '@/sync/persistence';
import { useRouter } from 'expo-router';
import * as Clipboard from 'expo-clipboard';
import { Ionicons } from '@expo/vector-icons';

// Option type for callback
export type Option = {
    title: string;
};

export const MarkdownView = React.memo((props: {
    markdown: string;
    onOptionPress?: (option: Option) => void;
    textColor?: string;
}) => {
    const blocks = React.useMemo(() => parseMarkdown(props.markdown), [props.markdown]);

    // Backwards compatibility: The original version just returned the view, wrapping the list of blocks.
    // It made each of the individual text elements selectable. When we enable the markdownCopyV2 feature,
    // we disable the selectable property on individual text segments on mobile only. Instead, the long press
    // will be handled by a wrapper Pressable. If we don't disable the selectable property, then you will see
    // the native copy modal come up at the same time as the long press handler is fired.
    const markdownCopyV2 = useLocalSetting('markdownCopyV2');
    const selectable = Platform.OS === 'web' || !markdownCopyV2;
    const router = useRouter();

    const handleLongPress = React.useCallback(() => {
        try {
            const textId = storeTempText(props.markdown);
            router.push(`/text-selection?textId=${textId}`);
        } catch (error) {
            console.error('Error storing text for selection:', error);
            Modal.alert('Error', 'Failed to open text selection. Please try again.');
        }
    }, [props.markdown, router]);
    const renderContent = () => {
        return (
            <View>
                {blocks.map((block, index) => {
                    if (block.type === 'text') {
                        return <RenderTextBlock spans={block.content} key={index} first={index === 0} last={index === blocks.length - 1} selectable={selectable} textColor={props.textColor} />;
                    } else if (block.type === 'header') {
                        return <RenderHeaderBlock level={block.level} spans={block.content} key={index} first={index === 0} last={index === blocks.length - 1} selectable={selectable} textColor={props.textColor} />;
                    } else if (block.type === 'horizontal-rule') {
                        return <View style={style.horizontalRule} key={index} />;
                    } else if (block.type === 'list') {
                        return <RenderListBlock items={block.items} key={index} first={index === 0} last={index === blocks.length - 1} selectable={selectable} textColor={props.textColor} />;
                    } else if (block.type === 'numbered-list') {
                        return <RenderNumberedListBlock items={block.items} key={index} first={index === 0} last={index === blocks.length - 1} selectable={selectable} textColor={props.textColor} />;
                    } else if (block.type === 'code-block') {
                        return <RenderCodeBlock content={block.content} language={block.language} key={index} first={index === 0} last={index === blocks.length - 1} selectable={selectable} />;
                    } else if (block.type === 'options') {
                        return <RenderOptionsBlock items={block.items} key={index} first={index === 0} last={index === blocks.length - 1} selectable={selectable} onOptionPress={props.onOptionPress} textColor={props.textColor} />;
                    } else if (block.type === 'table') {
                        return <RenderTableBlock headers={block.headers} alignments={block.alignments} rows={block.rows} key={index} first={index === 0} last={index === blocks.length - 1} selectable={selectable} textColor={props.textColor} />;
                    } else {
                        return null;
                    }
                })}
            </View>
        );
    }

    if (!markdownCopyV2) {
        return renderContent();
    }

    if (Platform.OS === 'web') {
        return renderContent();
    }

    return <Pressable onLongPress={handleLongPress} delayLongPress={500}>{renderContent()}</Pressable>;
});

function RenderTextBlock(props: { spans: MarkdownSpan[], first: boolean, last: boolean, selectable: boolean, textColor?: string }) {
    const textStyle = [style.text, props.first && style.first, props.last && style.last, props.textColor && { color: props.textColor }];
    return <Text selectable={props.selectable} style={textStyle}><RenderSpans spans={props.spans} baseStyle={textStyle} /></Text>;
}

function RenderHeaderBlock(props: { level: 1 | 2 | 3 | 4 | 5 | 6, spans: MarkdownSpan[], first: boolean, last: boolean, selectable: boolean, textColor?: string }) {
    const s = (style as any)[`header${props.level}`];
    const headerStyle = [style.header, s, props.first && style.first, props.last && style.last, props.textColor && { color: props.textColor }];
    return <Text selectable={props.selectable} style={headerStyle}><RenderSpans spans={props.spans} baseStyle={headerStyle} /></Text>;
}

function RenderListBlock(props: { items: MarkdownSpan[][], first: boolean, last: boolean, selectable: boolean, textColor?: string }) {
    const listStyle = [style.text, style.list, props.textColor && { color: props.textColor }];
    return (
        <View style={{ flexDirection: 'column', marginBottom: 8, gap: 0 }}>
            {props.items.map((item, index) => (
                <Text selectable={props.selectable} style={listStyle} key={index}>- <RenderSpans spans={item} baseStyle={listStyle} /></Text>
            ))}
        </View>
    );
}

function RenderNumberedListBlock(props: { items: { number: number, spans: MarkdownSpan[] }[], first: boolean, last: boolean, selectable: boolean, textColor?: string }) {
    const listStyle = [style.text, style.list, props.textColor && { color: props.textColor }];
    return (
        <View style={{ flexDirection: 'column', marginBottom: 8, gap: 0 }}>
            {props.items.map((item, index) => (
                <Text selectable={props.selectable} style={listStyle} key={index}>{item.number.toString()}. <RenderSpans spans={item.spans} baseStyle={listStyle} /></Text>
            ))}
        </View>
    );
}

function RenderCodeBlock(props: { content: string, language: string | null, first: boolean, last: boolean, selectable: boolean }) {
    const { theme } = useUnistyles();
    const [copied, setCopied] = React.useState(false);

    const handleCopy = React.useCallback(async () => {
        try {
            await Clipboard.setStringAsync(props.content);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        } catch (error) {
            console.error('Failed to copy code:', error);
        }
    }, [props.content]);

    return (
        <View style={[style.codeBlock, props.first && style.first, props.last && style.last]}>
            <View style={style.codeHeader}>
                {props.language ? (
                    <Text selectable={props.selectable} style={style.codeLanguage}>{props.language}</Text>
                ) : (
                    <View />
                )}
                <Pressable
                    onPress={handleCopy}
                    style={({ pressed }) => [
                        style.copyButton,
                        pressed && { opacity: 0.7 }
                    ]}
                    hitSlop={8}
                >
                    {copied ? (
                        <View style={style.copiedContainer}>
                            <Ionicons name="checkmark" size={14} color={theme.colors.textSecondary} />
                            <Text style={style.copiedText}>Copied</Text>
                        </View>
                    ) : (
                        <Ionicons name="copy-outline" size={16} color={theme.colors.textSecondary} />
                    )}
                </Pressable>
            </View>
            <ScrollView
                style={{ flexGrow: 0, flexShrink: 0 }}
                horizontal={true}
                contentContainerStyle={{ paddingHorizontal: 16, paddingVertical: 16 }}
                showsHorizontalScrollIndicator={false}
            >
                <SimpleSyntaxHighlighter
                    code={props.content}
                    language={props.language}
                    selectable={props.selectable}
                />
            </ScrollView>
        </View>
    );
}

function RenderOptionsBlock(props: {
    items: string[],
    first: boolean,
    last: boolean,
    selectable: boolean,
    onOptionPress?: (option: Option) => void,
    textColor?: string
}) {
    return (
        <View style={[style.optionsContainer, props.first && style.first, props.last && style.last]}>
            {props.items.map((item, index) => {
                if (props.onOptionPress) {
                    return (
                        <Pressable
                            key={index}
                            style={({ pressed }) => [
                                style.optionItem,
                                pressed && style.optionItemPressed
                            ]}
                            onPress={() => props.onOptionPress?.({ title: item })}
                        >
                            <Text selectable={props.selectable} style={[style.optionText, props.textColor && { color: props.textColor }]}>{item}</Text>
                        </Pressable>
                    );
                } else {
                    return (
                        <View key={index} style={style.optionItem}>
                            <Text selectable={props.selectable} style={[style.optionText, props.textColor && { color: props.textColor }]}>{item}</Text>
                        </View>
                    );
                }
            })}
        </View>
    );
}

function RenderTableBlock(props: {
    headers: string[],
    alignments: ('left' | 'center' | 'right')[],
    rows: string[][],
    first: boolean,
    last: boolean,
    selectable: boolean,
    textColor?: string
}) {
    const getTextAlign = (index: number): 'left' | 'center' | 'right' => {
        return props.alignments[index] || 'left';
    };

    return (
        <View style={[style.tableContainer, props.first && style.first, props.last && style.last]}>
            <ScrollView
                horizontal={true}
                showsHorizontalScrollIndicator={true}
                style={style.tableScrollView}
                contentContainerStyle={style.tableContentContainer}
                nestedScrollEnabled={true}
            >
                <View style={style.table}>
                    {/* Header Row */}
                    <View style={style.tableHeaderRow}>
                        {props.headers.map((header, colIndex) => (
                            <View key={colIndex} style={[style.tableHeaderCell, colIndex === 0 && style.tableFirstCell]}>
                                <Text
                                    selectable={props.selectable}
                                    style={[
                                        style.tableHeaderText,
                                        { textAlign: getTextAlign(colIndex) },
                                        props.textColor && { color: props.textColor }
                                    ]}
                                    numberOfLines={1}
                                >
                                    {header}
                                </Text>
                            </View>
                        ))}
                    </View>
                    {/* Data Rows */}
                    {props.rows.map((row, rowIndex) => (
                        <View key={rowIndex} style={[style.tableRow, rowIndex % 2 === 1 && style.tableRowAlt]}>
                            {row.map((cell, colIndex) => (
                                <View key={colIndex} style={[style.tableCell, colIndex === 0 && style.tableFirstCell]}>
                                    <Text
                                        selectable={props.selectable}
                                        style={[
                                            style.tableCellText,
                                            { textAlign: getTextAlign(colIndex) },
                                            props.textColor && { color: props.textColor }
                                        ]}
                                        numberOfLines={2}
                                    >
                                        {cell}
                                    </Text>
                                </View>
                            ))}
                        </View>
                    ))}
                </View>
            </ScrollView>
        </View>
    );
}

function RenderSpans(props: { spans: MarkdownSpan[], baseStyle?: any }) {
    return (<>
        {props.spans.map((span, index) => {
            if (span.url) {
                return <Link key={index} href={span.url as any} target="_blank" style={[style.link, span.styles.map(s => style[s])]}>{span.text}</Link>
            } else {
                return <Text key={index} selectable style={[props.baseStyle, span.styles.map(s => style[s])]}>{span.text}</Text>
            }
        })}
    </>)
}


const style = StyleSheet.create((theme) => ({

    // Plain text

    text: {
        ...Typography.default(),
        fontSize: 16,
        lineHeight: 24, // Reduced from 28 to 24
        marginTop: 4,
        marginBottom: 4,
        color: theme.colors.text,
        fontWeight: '400',
    },

    italic: {
        fontStyle: 'italic',
    },
    bold: {
        fontWeight: 'bold',
    },
    semibold: {
        fontWeight: '600',
    },
    code: {
        ...Typography.mono(),
        fontSize: 16,
        lineHeight: 21,  // Reduced from 24 to 21
        backgroundColor: theme.colors.surfaceHighest,
        color: theme.colors.text,
    },
    link: {
        ...Typography.default(),
        color: theme.colors.textLink,
        fontWeight: '400',
    },

    // Headers

    header: {
        ...Typography.default('semiBold'),
        color: theme.colors.text,
    },
    header1: {
        fontSize: 16,
        lineHeight: 24,  // Reduced from 36 to 24
        fontWeight: '900',
        marginTop: 12,
        marginBottom: 8
    },
    header2: {
        fontSize: 20,
        lineHeight: 24,  // Reduced from 36 to 32
        fontWeight: '600',
        marginTop: 12,
        marginBottom: 8
    },
    header3: {
        fontSize: 16,
        lineHeight: 28,  // Reduced from 32 to 28
        fontWeight: '600',
        marginTop: 10,
        marginBottom: 8,
    },
    header4: {
        fontSize: 16,
        lineHeight: 24,
        fontWeight: '600',
        marginTop: 8,
        marginBottom: 8,
    },
    header5: {
        fontSize: 16,
        lineHeight: 24,  // Reduced from 28 to 24
        fontWeight: '600'
    },
    header6: {
        fontSize: 16,
        lineHeight: 24, // Reduced from 28 to 24
        fontWeight: '600'
    },

    //
    // List
    //

    list: {
        ...Typography.default(),
        color: theme.colors.text,
        marginTop: 0,
        marginBottom: 0,
    },

    //
    // Common
    //

    first: {
        // marginTop: 0
    },
    last: {
        // marginBottom: 0
    },

    //
    // Code Block
    //

    codeBlock: {
        backgroundColor: theme.colors.surfaceHighest,
        borderRadius: 8,
        marginVertical: 4,
    },
    codeHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingTop: 8,
    },
    codeLanguage: {
        ...Typography.mono(),
        color: theme.colors.textSecondary,
        fontSize: 12,
        marginTop: 0,
        paddingHorizontal: 0,
        marginBottom: 0,
    },
    copyButton: {
        padding: 4,
        borderRadius: 4,
    },
    copiedContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
    },
    copiedText: {
        ...Typography.mono(),
        fontSize: 12,
        color: theme.colors.textSecondary,
    },
    codeText: {
        ...Typography.mono(),
        color: theme.colors.text,
        fontSize: 14,
        lineHeight: 20,
    },
    horizontalRule: {
        height: 1,
        backgroundColor: theme.colors.divider,
        marginTop: 4,
        marginBottom: 4,
    },

    //
    // Options Block
    //

    optionsContainer: {
        flexDirection: 'column',
        gap: 8,
        marginVertical: 4,
    },
    optionItem: {
        backgroundColor: theme.colors.surfaceHighest,
        borderRadius: 8,
        paddingHorizontal: 16,
        paddingVertical: 12,
        borderWidth: 1,
        borderColor: theme.colors.divider,
    },
    optionItemPressed: {
        opacity: 0.7,
        backgroundColor: theme.colors.surfaceHigh,
    },
    optionText: {
        ...Typography.default(),
        fontSize: 16,
        lineHeight: 24,
        color: theme.colors.text,
    },

    //
    // Table Block
    //

    tableContainer: {
        marginVertical: 8,
        borderRadius: 8,
        borderWidth: 1,
        borderColor: theme.colors.divider,
    },
    tableScrollView: {
        flexGrow: 0,
        flexShrink: 0,
    },
    tableContentContainer: {
        flexGrow: 0,
    },
    table: {
        flexShrink: 0,
    },
    tableHeaderRow: {
        flexDirection: 'row',
        backgroundColor: theme.colors.surfaceHighest,
        borderBottomWidth: 2,
        borderBottomColor: theme.colors.divider,
    },
    tableRow: {
        flexDirection: 'row',
        borderBottomWidth: 1,
        borderBottomColor: theme.colors.divider,
    },
    tableRowAlt: {
        backgroundColor: theme.colors.surfaceHigh,
    },
    tableHeaderCell: {
        minWidth: 100,
        paddingHorizontal: 12,
        paddingVertical: 10,
        borderLeftWidth: 1,
        borderLeftColor: theme.colors.divider,
    },
    tableCell: {
        minWidth: 100,
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderLeftWidth: 1,
        borderLeftColor: theme.colors.divider,
    },
    tableFirstCell: {
        borderLeftWidth: 0,
    },
    tableHeaderText: {
        ...Typography.default('semiBold'),
        fontSize: 14,
        lineHeight: 20,
        color: theme.colors.text,
    },
    tableCellText: {
        ...Typography.default(),
        fontSize: 14,
        lineHeight: 20,
        color: theme.colors.text,
    },
}));