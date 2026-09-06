import { useEffect, useRef, useState } from "react";
import { requestMarkChatAsRead, requestUploadChatFile } from "../api/chatApi";
import {
    createChatClient,
    disconnectChatClient,
    sendChatSocketMessage,
    subscribeChatChannel,
    subscribeChatChannelEvents,
    subscribeChatRoomChannelEvents,
    subscribeUserChatUnreadEvents,
} from "../api/chatSocket";

const useChatSocket = ({
    roomId,
    selectedChannel,
    channels = [],
    setMessages,
    onMessageEvent,
    onChannelEvent,
    clearChannelUnreadCount,
    updateChannelLastMessage,
    onUnreadEvent,
    onForeignMessage,
    onBeforeSend,
    setError,
}) => {
    const chatClientRef = useRef(null);
    const subscriptionRef = useRef(null);
    const messageEventSubscriptionRef = useRef(null);
    const roomChannelEventSubscriptionRef = useRef(null);
    const unreadEventSubscriptionRef = useRef(null);
    const notificationSubscriptionsRef = useRef([]);
    const selectedChannelRef = useRef(null);

    const [socketConnected, setSocketConnected] = useState(false);
    const [isSending, setIsSending] = useState(false);
    const [isFileSending, setIsFileSending] = useState(false);

    useEffect(() => {
        selectedChannelRef.current = selectedChannel;
    }, [selectedChannel]);

    useEffect(() => {
        const client = createChatClient({
            onConnect: () => {
                setSocketConnected(true);
            },
            onError: () => {
                setSocketConnected(false);
                setError("실시간 채팅 연결에 실패했습니다.");
            },
        });

        chatClientRef.current = client;
        client.activate();

        return () => {
            const chatSubscription = subscriptionRef.current;
            const messageEventSubscription =
                messageEventSubscriptionRef.current;
            const roomChannelEventSubscription =
                roomChannelEventSubscriptionRef.current;
            const unreadEventSubscription = unreadEventSubscriptionRef.current;
            const notificationSubscriptions =
                notificationSubscriptionsRef.current;

            subscriptionRef.current = null;
            messageEventSubscriptionRef.current = null;
            roomChannelEventSubscriptionRef.current = null;
            unreadEventSubscriptionRef.current = null;
            notificationSubscriptionsRef.current = [];

            disconnectChatClient(client, [
                chatSubscription,
                messageEventSubscription,
                roomChannelEventSubscription,
                unreadEventSubscription,
                ...notificationSubscriptions,
            ]).catch(() => {
                client.deactivate();
            });
            setSocketConnected(false);
        };
    }, [setError]);

    useEffect(() => {
        const client = chatClientRef.current;

        if (
            !client?.connected ||
            !roomId ||
            !socketConnected ||
            !onChannelEvent
        ) {
            return undefined;
        }

        roomChannelEventSubscriptionRef.current?.unsubscribe();

        try {
            roomChannelEventSubscriptionRef.current =
                subscribeChatRoomChannelEvents(client, roomId, onChannelEvent);
        } catch {
            roomChannelEventSubscriptionRef.current = null;
            return undefined;
        }

        return () => {
            roomChannelEventSubscriptionRef.current?.unsubscribe();
            roomChannelEventSubscriptionRef.current = null;
        };
    }, [roomId, socketConnected, onChannelEvent]);

    useEffect(() => {
        const client = chatClientRef.current;

        if (!client?.connected || !socketConnected || !onUnreadEvent) {
            return undefined;
        }

        unreadEventSubscriptionRef.current?.unsubscribe();

        try {
            unreadEventSubscriptionRef.current =
                subscribeUserChatUnreadEvents(client, onUnreadEvent);
        } catch {
            unreadEventSubscriptionRef.current = null;
            return undefined;
        }

        return () => {
            unreadEventSubscriptionRef.current?.unsubscribe();
            unreadEventSubscriptionRef.current = null;
        };
    }, [socketConnected, onUnreadEvent]);

    useEffect(() => {
        const client = chatClientRef.current;

        if (!client?.connected || !selectedChannel?.id || !socketConnected) {
            return undefined;
        }

        subscriptionRef.current?.unsubscribe();
        messageEventSubscriptionRef.current?.unsubscribe();

        try {
            subscriptionRef.current = subscribeChatChannel(
                client,
                selectedChannel.id,
                (receivedMessage) => {
                    setMessages((prevMessages) => {
                        const alreadyExists = prevMessages.some(
                            (message) => message.id === receivedMessage.id
                        );

                        if (alreadyExists) return prevMessages;

                        return [...prevMessages, receivedMessage];
                    });

                    requestMarkChatAsRead(selectedChannel.id);
                    clearChannelUnreadCount(selectedChannel.id);
                }
            );

            messageEventSubscriptionRef.current = subscribeChatChannelEvents(
                client,
                selectedChannel.id,
                onMessageEvent
            );
        } catch {
            subscriptionRef.current = null;
            messageEventSubscriptionRef.current = null;
            return undefined;
        }

        return () => {
            subscriptionRef.current?.unsubscribe();
            subscriptionRef.current = null;
            messageEventSubscriptionRef.current?.unsubscribe();
            messageEventSubscriptionRef.current = null;
        };
    }, [
        selectedChannel?.id,
        socketConnected,
        setMessages,
        clearChannelUnreadCount,
        onMessageEvent,
    ]);

    useEffect(() => {
        const client = chatClientRef.current;

        if (!client?.connected || !socketConnected || !channels.length) {
            return undefined;
        }

        notificationSubscriptionsRef.current.forEach((subscription) =>
            subscription?.unsubscribe()
        );

        let notificationSubscriptions = [];

        try {
            notificationSubscriptions = channels
                .filter(
                    (channel) =>
                        String(channel.id) !==
                        String(selectedChannelRef.current?.id)
                )
                .map((channel) =>
                    subscribeChatChannel(
                        client,
                        channel.id,
                        (receivedMessage) => {
                            const currentChannel = selectedChannelRef.current;

                            if (
                                String(currentChannel?.id) === String(channel.id)
                            ) {
                                return;
                            }

                            updateChannelLastMessage(
                                channel.id,
                                receivedMessage
                            );
                            onForeignMessage?.(channel, receivedMessage);
                        }
                    )
                );
        } catch {
            notificationSubscriptionsRef.current = [];
            return undefined;
        }

        notificationSubscriptionsRef.current = notificationSubscriptions;

        return () => {
            notificationSubscriptions.forEach((subscription) =>
                subscription?.unsubscribe()
            );
            notificationSubscriptionsRef.current = [];
        };
    }, [
        socketConnected,
        channels,
        selectedChannel?.id,
        updateChannelLastMessage,
        onForeignMessage,
    ]);

    const handleSendMessage = async (message) => {
        if (!selectedChannel?.id) return false;

        const client = chatClientRef.current;

        if (!client?.connected) {
            setError("채팅 서버와 연결되지 않았습니다.");
            return false;
        }

        try {
            setIsSending(true);
            // 내가 보낸 메시지는 스크롤이 따라 내려가야 한다.
            onBeforeSend?.();
            sendChatSocketMessage(client, selectedChannel.id, message);
            return true;
        } catch {
            setError("메시지 전송에 실패했습니다.");
            return false;
        } finally {
            setIsSending(false);
        }
    };

    const handleSendFile = async (file, message = "") => {
        if (!selectedChannel?.id) return false;

        const client = chatClientRef.current;

        if (!client?.connected) {
            setError("채팅 서버와 연결되지 않았습니다.");
            return false;
        }

        try {
            setIsFileSending(true);
            setError("");

            const uploadedFile = await requestUploadChatFile(
                selectedChannel.id,
                file
            );

            onBeforeSend?.();
            sendChatSocketMessage(client, selectedChannel.id, {
                message,
                fileUrl: uploadedFile.fileUrl,
                fileName: uploadedFile.fileName,
                fileType: uploadedFile.contentType,
                fileSize: uploadedFile.size,
            });

            return true;
        } catch (error) {
            setError(
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
        socketConnected,
        isSending,
        isFileSending,
        handleSendMessage,
        handleSendFile,
    };
};

export default useChatSocket;
