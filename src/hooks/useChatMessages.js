import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import {
    requestDeleteChatMessage,
    requestUpdateChatMessage,
} from "../api/chatApi";
import { parseChatDate } from "../utils/chat";

const getPageContent = (data) => {
    if (Array.isArray(data)) return data;
    if (Array.isArray(data?.content)) return data.content;
    return [];
};

// 목록 맨 아래에서 이 px 이내면 "사용자가 아래를 보고 있다"로 친다.
const BOTTOM_THRESHOLD_PX = 120;

const isNearBottom = (element) =>
    element.scrollHeight - element.scrollTop - element.clientHeight <
    BOTTOM_THRESHOLD_PX;

const useChatMessages = ({
    selectedChannel,
    fetchMessages,
    markAsRead,
    onReadComplete,
    onError,
}) => {
    const isLoadingOlderMessagesRef = useRef(false);
    const messageListRef = useRef(null);
    // 사용자가 지금 목록 맨 아래를 보고 있는지. 위로 올려 예전 대화를 읽는 중이면
    // 새 메시지가 와도 스크롤을 강제로 내리지 않는다.
    const isPinnedToBottomRef = useRef(true);

    const [messages, setMessages] = useState([]);
    const [isMessageLoading, setIsMessageLoading] = useState(false);
    const [isLoadingMoreMessages, setIsLoadingMoreMessages] = useState(false);
    const [messagePage, setMessagePage] = useState(0);
    const [hasMoreMessages, setHasMoreMessages] = useState(false);
    const [messageError, setMessageError] = useState("");

    const selectedChannelId = selectedChannel?.id;

    const setErrorMessage = useCallback(
        (message) => {
            setMessageError(message);
            onError?.(message);
        },
        [onError]
    );

    // force=true면 사용자의 스크롤 위치와 상관없이 무조건 아래로 내린다.
    // (내가 방금 메시지를 보냈을 때, 채널을 새로 열었을 때)
    const scrollToBottom = useCallback(
        ({ isPageLoading, force = false } = {}) => {
            if (isLoadingOlderMessagesRef.current) return;
            if (isPageLoading || isMessageLoading || messages.length === 0) {
                return;
            }
            if (!force && !isPinnedToBottomRef.current) return;

            const messageList = messageListRef.current;

            if (!messageList) return;

            const frameId = requestAnimationFrame(() => {
                messageList.scrollTop = messageList.scrollHeight;
                isPinnedToBottomRef.current = true;
            });

            return () => {
                cancelAnimationFrame(frameId);
            };
        },
        [isMessageLoading, messages.length]
    );

    // 내가 메시지를 보내는 순간 호출한다. 서버가 되돌려준 메시지가 목록에 붙을 때
    // 스크롤이 따라 내려가도록 아래 고정 상태로 되돌린다.
    const pinToBottom = useCallback(() => {
        isPinnedToBottomRef.current = true;
    }, []);

    useEffect(() => {
        if (!selectedChannelId) return undefined;

        let ignore = false;
        // 새 채널을 열면 항상 맨 아래(최신 메시지)에서 시작한다.
        isPinnedToBottomRef.current = true;

        const getMessages = async () => {
            try {
                setIsMessageLoading(true);
                setMessageError("");

                const data = await fetchMessages(selectedChannelId);
                const messageList = getPageContent(data);

                if (ignore) return;

                setMessages([...messageList].reverse());
                setMessagePage(0);
                setHasMoreMessages(data.last === false);

                await markAsRead(selectedChannelId);
                if (!ignore) onReadComplete?.();
            } catch {
                if (!ignore) setErrorMessage("메시지를 불러오지 못했습니다.");
            } finally {
                if (!ignore) setIsMessageLoading(false);
            }
        };

        getMessages();

        return () => {
            ignore = true;
        };
    }, [
        selectedChannelId,
        fetchMessages,
        markAsRead,
        onReadComplete,
        setErrorMessage,
    ]);

    // 메시지가 소켓으로 추가된 뒤 실제 DOM에 그려진 다음 스크롤한다.
    // setMessages 직후에는 아직 새 메시지 높이가 scrollHeight에 반영되지
    // 않을 수 있어서, addMessage 안에서 바로 스크롤하면 놓칠 수 있다.
    useLayoutEffect(() => {
        if (isMessageLoading || messages.length === 0) return;
        if (isLoadingOlderMessagesRef.current) return;

        return scrollToBottom();
    }, [isMessageLoading, messages, scrollToBottom]);

    const addMessage = useCallback(
        (message) => {
            setMessages((prevMessages) => {
                const alreadyExists = prevMessages.some(
                    (prevMessage) =>
                        String(prevMessage.id) === String(message.id)
                );

                if (alreadyExists) return prevMessages;

                return [...prevMessages, message].sort(
                    (a, b) =>
                        parseChatDate(a.createdAt) - parseChatDate(b.createdAt)
                );
            });
        },
        []
    );

    const clearMessages = useCallback(() => {
        setMessages([]);
        setMessagePage(0);
        setHasMoreMessages(false);
    }, []);

    const handleEditMessage = async (messageId, nextMessage) => {
        const trimmedMessage = nextMessage.trim();

        if (!messageId || !trimmedMessage) return;

        try {
            const updatedMessage = await requestUpdateChatMessage(
                messageId,
                trimmedMessage
            );

            setMessages((prevMessages) =>
                prevMessages.map((message) =>
                    String(message.id) === String(messageId)
                        ? {
                              ...message,
                              ...updatedMessage,
                              message:
                                  updatedMessage?.message ?? trimmedMessage,
                          }
                        : message
                )
            );
        } catch {
            setErrorMessage("메시지 수정에 실패했습니다.");
            throw new Error("메시지 수정 실패");
        }
    };

    const handleDeleteMessage = async (messageId) => {
        if (!messageId) return;

        try {
            await requestDeleteChatMessage(messageId);

            setMessages((prevMessages) =>
                prevMessages.filter(
                    (message) => String(message.id) !== String(messageId)
                )
            );
        } catch {
            setErrorMessage("메시지 삭제에 실패했습니다.");
            throw new Error("메시지 삭제 실패");
        }
    };

    const refreshVisibleReadCounts = useCallback(async () => {
        if (!selectedChannelId) return;

        try {
            const data = await fetchMessages(selectedChannelId);
            const readCountByMessageId = new Map(
                getPageContent(data).map((message) => [
                    String(message.id),
                    Number(message.readCount ?? 0),
                ])
            );

            setMessages((prevMessages) =>
                prevMessages.map((message) => {
                    const nextReadCount = readCountByMessageId.get(
                        String(message.id)
                    );

                    return nextReadCount === undefined
                        ? message
                        : { ...message, readCount: nextReadCount };
                })
            );
        } catch {
            // 읽음 수 갱신 실패가 메시지 조회/전송 자체를 막지는 않게 기존 값을 유지한다.
        }
    }, [fetchMessages, selectedChannelId]);

    const handleMessageEvent = useCallback((event) => {
        if (!event?.type) return;

        if (
            event.type === "READ_STATUS_UPDATED" &&
            String(event.channelId) === String(selectedChannelId)
        ) {
            refreshVisibleReadCounts();
            return;
        }

        if (event.type === "MESSAGE_UPDATED" && event.message) {
            setMessages((prevMessages) =>
                prevMessages.map((message) =>
                    String(message.id) === String(event.message.id)
                        ? {
                              ...message,
                              ...event.message,
                          }
                        : message
                )
            );
        }

        if (event.type === "MESSAGE_DELETED" && event.messageId) {
            setMessages((prevMessages) =>
                prevMessages.filter(
                    (message) => String(message.id) !== String(event.messageId)
                )
            );
        }
    }, [refreshVisibleReadCounts, selectedChannelId]);

    const handleMessageScroll = async (event) => {
        const messageList = event.currentTarget;

        // 이전 메시지를 끌어오는 중(스크롤 위치를 코드가 조정하는 중)에는 판정하지 않는다.
        if (!isLoadingOlderMessagesRef.current) {
            isPinnedToBottomRef.current = isNearBottom(messageList);
        }

        if (
            messageList.scrollTop > 40 ||
            isLoadingMoreMessages ||
            !hasMoreMessages ||
            !selectedChannelId
        ) {
            return;
        }

        const previousScrollHeight = messageList.scrollHeight;
        const nextPage = messagePage + 1;

        try {
            setIsLoadingMoreMessages(true);
            isLoadingOlderMessagesRef.current = true;

            const data = await fetchMessages(selectedChannelId, {
                page: nextPage,
                size: 30,
            });
            const olderMessages = [...getPageContent(data)].reverse();

            setMessages((prevMessages) => {
                const prevMessageIds = new Set(
                    prevMessages.map((message) => String(message.id))
                );
                const nextMessages = olderMessages.filter(
                    (message) => !prevMessageIds.has(String(message.id))
                );

                return [...nextMessages, ...prevMessages];
            });
            setMessagePage(nextPage);
            setHasMoreMessages(data.last === false);

            requestAnimationFrame(() => {
                messageList.scrollTop =
                    messageList.scrollHeight - previousScrollHeight;
                isLoadingOlderMessagesRef.current = false;
            });
        } catch {
            isLoadingOlderMessagesRef.current = false;
            setErrorMessage("이전 메시지를 불러오지 못했습니다.");
        } finally {
            setIsLoadingMoreMessages(false);
        }
    };

    return {
        messages,
        setMessages,
        addMessage,
        clearMessages,
        isMessageLoading,
        isLoadingMoreMessages,
        messageError,
        messageListRef,
        scrollToBottom,
        pinToBottom,
        handleEditMessage,
        handleDeleteMessage,
        handleMessageEvent,
        handleMessageScroll,
    };
};

export default useChatMessages;
