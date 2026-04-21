import * as React from 'react';
import { useSession, useSessionMessages } from "@/sync/storage";
import { FlatList, Platform, View } from 'react-native';
import { useCallback } from 'react';
import { useHeaderHeight } from '@/utils/responsive';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { resolveWebInvertedListAnchorAdjustment, type WebInvertedListAnchorSnapshot } from '@/utils/invertedListAnchor';
import { MessageView } from './MessageView';
import { Metadata, Session } from '@/sync/storageTypes';
import { ChatFooter } from './ChatFooter';
import { Message } from '@/sync/typesMessage';
import { isNearBottom } from '@/components/team/teamChatRoomList';

export const ChatList = React.memo((props: { session: Session }) => {
    const { messages, isLoaded } = useSessionMessages(props.session.id);
    return (
        <ChatListInternal
            metadata={props.session.metadata}
            sessionId={props.session.id}
            messages={messages}
            isLoaded={isLoaded}
        />
    )
});

const ListHeader = React.memo(() => {
    const headerHeight = useHeaderHeight();
    const safeArea = useSafeAreaInsets();
    return <View style={{ flexDirection: 'row', alignItems: 'center', height: headerHeight + safeArea.top + 32 }} />;
});

const ListFooter = React.memo((props: { sessionId: string }) => {
    const session = useSession(props.sessionId)!;
    return (
        <ChatFooter controlledByUser={session.agentState?.controlledByUser || false} />
    )
});

const ChatListInternal = React.memo((props: {
    metadata: Metadata | null,
    sessionId: string,
    messages: Message[],
    isLoaded: boolean,
}) => {
    const listRef = React.useRef<FlatList<Message>>(null);
    const isNearBottomRef = React.useRef(true);
    const currentOffsetYRef = React.useRef(0);
    const contentHeightRef = React.useRef(0);
    const prevMessageCountRef = React.useRef(props.messages.length);
    const prevIsLoadedRef = React.useRef(props.isLoaded);
    const pendingWebAnchorSnapshotRef = React.useRef<WebInvertedListAnchorSnapshot | null>(null);

    const scrollToBottom = useCallback((animated: boolean) => {
        listRef.current?.scrollToOffset({ offset: 0, animated });
    }, []);

    const keyExtractor = useCallback((item: any) => item.id, []);
    const renderItem = useCallback(({ item }: { item: any }) => (
        <MessageView message={item} metadata={props.metadata} sessionId={props.sessionId} />
    ), [props.metadata, props.sessionId]);

    React.useEffect(() => {
        if (
            Platform.OS === 'web' &&
            prevIsLoadedRef.current &&
            props.isLoaded &&
            props.messages.length > prevMessageCountRef.current
        ) {
            pendingWebAnchorSnapshotRef.current = {
                previousContentHeight: contentHeightRef.current,
                previousOffsetY: currentOffsetYRef.current,
                wasNearBottom: isNearBottomRef.current,
            };
        }

        prevMessageCountRef.current = props.messages.length;
        prevIsLoadedRef.current = props.isLoaded;
    }, [props.isLoaded, props.messages.length]);

    return (
        <FlatList
            ref={listRef}
            style={{ flex: 1 }}
            data={props.messages}
            inverted={true}
            keyExtractor={keyExtractor}
            // maintainVisibleContentPosition has known issues on web — skip it there
            maintainVisibleContentPosition={Platform.OS !== 'web' ? {
                minIndexForVisible: 0,
                autoscrollToTopThreshold: 10,
            } : undefined}
            keyboardShouldPersistTaps="handled"
            keyboardDismissMode={Platform.OS === 'ios' ? 'interactive' : 'none'}
            onContentSizeChange={(_, contentHeight) => {
                contentHeightRef.current = contentHeight;

                if (Platform.OS === 'web' && pendingWebAnchorSnapshotRef.current) {
                    const adjustment = resolveWebInvertedListAnchorAdjustment(
                        pendingWebAnchorSnapshotRef.current,
                        contentHeight
                    );
                    pendingWebAnchorSnapshotRef.current = null;

                    if (adjustment.type !== 'none') {
                        requestAnimationFrame(() => {
                            if (adjustment.type === 'scroll_to_latest') {
                                scrollToBottom(false);
                                return;
                            }

                            listRef.current?.scrollToOffset({
                                offset: adjustment.offset,
                                animated: false,
                            });
                        });
                    }
                }
            }}
            onScroll={(event) => {
                const offsetY = event.nativeEvent.contentOffset.y;
                currentOffsetYRef.current = offsetY;
                contentHeightRef.current = event.nativeEvent.contentSize.height;
                isNearBottomRef.current = isNearBottom(offsetY);
            }}
            scrollEventThrottle={16}
            renderItem={renderItem}
            ListHeaderComponent={<ListFooter sessionId={props.sessionId} />}
            ListFooterComponent={<ListHeader />}
        />
    )
});
