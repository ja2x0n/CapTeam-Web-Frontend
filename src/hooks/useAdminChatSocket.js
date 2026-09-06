import { useEffect, useRef, useState } from "react";
import { requestUploadChatFile } from "../api/chatApi";
import {
    createChatClient,
    disconnectChatClient,
    sendChatSocketMessage,
    subscribeChatChannel,
    subscribeChatChannelEvents,
    subscribeChatRoomChannelEvents,
    subscribeAdminChatUnreadEvents,
} from "../api/chatSocket";

const useAdminChatSocket = ({
    roomId,
    selectedChannel,
    onReceiveMessage,
    onMessageEvent,
    onChannelEvent,
    onUnreadEvent,
    onBeforeSend,
}) => {
    const [isSocketConnected, setIsSocketConnected] = useState(false);
    const [isSending, setIsSending] = useState(false);
    const [isFileSending, setIsFileSending] = useState(false);
    const [socketError, setSocketError] = useState("");

    const chatClientRef = useRef(null);
    const channelSubscriptionRef = useRef(null);
    const messageEventSubscriptionRef = useRef(null);
    const roomChannelEventSubscriptionRef = useRef(null);
    const unreadEventSubscriptionRef = useRef(null);

    const selectedChannelId = selectedChannel?.id;

    useEffect(() => {
        const client = createChatClient({
            onConnect: () => {
                chatClientRef.current = client;
                setIsSocketConnected(true);
            },
            onError: () => {
                setIsSocketConnected(false);
                setSocketError("채팅 서버 연결에 실패했습니다.");
            },
        });

        chatClientRef.current = client;
        client.activate();

        return () => {
            const channelSubscription = channelSubscriptionRef.current;
            const messageEventSubscription =
                messageEventSubscriptionRef.current;
            const roomChannelEventSubscription =
                roomChannelEventSubscriptionRef.current;
            const unreadEventSubscription = unreadEventSubscriptionRef.current;

            channelSubscriptionRef.current = null;
            messageEventSubscriptionRef.current = null;
            roomChannelEventSubscriptionRef.current = null;
            unreadEventSubscriptionRef.current = null;

            disconnectChatClient(client, [
                channelSubscription,
                messageEventSubscription,
                roomChannelEventSubscription,
                unreadEventSubscription,
            ]).catch(() => {
                client.deactivate();
            });

            setIsSocketConnected(false);
        };
    }, []);

    useEffect(() => {
        const client = chatClientRef.current;

        if (
            !client?.connected ||
            !isSocketConnected ||
            !roomId ||
            !onChannelEvent
        ) {
            return undefined;
        }

        roomChannelEventSubscriptionRef.current?.unsubscribe?.();

        try {
            roomChannelEventSubscriptionRef.current =
                subscribeChatRoomChannelEvents(client, roomId, onChannelEvent);
        } catch (error) {
            console.error("관리자 채널 이벤트 구독 실패:", error);
            roomChannelEventSubscriptionRef.current = null;

            return undefined;
        }

        return () => {
            roomChannelEventSubscriptionRef.current?.unsubscribe?.();
            roomChannelEventSubscriptionRef.current = null;
        };
    }, [isSocketConnected, roomId, onChannelEvent]);

    useEffect(() => {
        const client = chatClientRef.current;

        if (
            !client ||
            !client.connected ||
            !isSocketConnected ||
            !selectedChannelId
        ) {
            return undefined;
        }

        channelSubscriptionRef.current?.unsubscribe?.();
        messageEventSubscriptionRef.current?.unsubscribe?.();

        try {
            channelSubscriptionRef.current = subscribeChatChannel(
                client,
                selectedChannelId,
                onReceiveMessage
            );

            messageEventSubscriptionRef.current = subscribeChatChannelEvents(
                client,
                selectedChannelId,
                onMessageEvent
            );
        } catch (error) {
            console.error("관리자 채팅 구독 실패:", error);
            channelSubscriptionRef.current = null;
            messageEventSubscriptionRef.current = null;

            return undefined;
        }

        return () => {
            channelSubscriptionRef.current?.unsubscribe?.();
            messageEventSubscriptionRef.current?.unsubscribe?.();

            channelSubscriptionRef.current = null;
            messageEventSubscriptionRef.current = null;
        };
    }, [
        isSocketConnected,
        selectedChannelId,
        onReceiveMessage,
        onMessageEvent,
    ]);
    useEffect(() => {
        const client = chatClientRef.current;

        if (!client?.connected || !isSocketConnected || !onUnreadEvent) {
            return undefined;
        }

        unreadEventSubscriptionRef.current?.unsubscribe?.();

        try {
            unreadEventSubscriptionRef.current = subscribeAdminChatUnreadEvents(
                client,
                onUnreadEvent
            );
        } catch (error) {
            console.error("관리자 unread 이벤트 구독 실패:", error);
            unreadEventSubscriptionRef.current = null;

            return undefined;
        }

        return () => {
            unreadEventSubscriptionRef.current?.unsubscribe?.();
            unreadEventSubscriptionRef.current = null;
        };
    }, [isSocketConnected, onUnreadEvent]);
    const sendMessage = async (message) => {
        if (!selectedChannelId) return false;

        const client = chatClientRef.current;

        if (!client?.connected) {
            setSocketError("채팅 서버와 연결되지 않았습니다.");
            return false;
        }

        try {
            setIsSending(true);
            setSocketError("");

            // 내가 보낸 메시지는 스크롤이 따라 내려가야 한다.
            onBeforeSend?.();
            sendChatSocketMessage(client, selectedChannelId, {
                message,
            });

            return true;
        } catch {
            setSocketError("메시지 전송에 실패했습니다.");
            return false;
        } finally {
            setIsSending(false);
        }
    };

    const sendFile = async (file, message = "") => {
        if (!selectedChannelId) return false;

        const client = chatClientRef.current;

        if (!client?.connected) {
            setSocketError("채팅 서버와 연결되지 않았습니다.");
            return false;
        }

        try {
            setIsFileSending(true);
            setSocketError("");

            const uploadedFile = await requestUploadChatFile(
                selectedChannelId,
                file
            );

            onBeforeSend?.();
            sendChatSocketMessage(client, selectedChannelId, {
                message,
                fileUrl: uploadedFile.fileUrl,
                fileName: uploadedFile.fileName,
                fileType: uploadedFile.contentType,
                fileSize: uploadedFile.size,
            });

            return true;
        } catch (error) {
            setSocketError(
                error?.response?.status === 413
                    ? "20MB 이하 파일만 업로드할 수 있습니다."
                    : "파일 전송에 실패했습니다."
            );
            throw error;
        } finally {
            setIsFileSending(false);
        }
    };

    return {
        chatClientRef,
        isSocketConnected,
        isSending,
        isFileSending,
        socketError,
        sendMessage,
        sendFile,
    };
};

export default useAdminChatSocket;
