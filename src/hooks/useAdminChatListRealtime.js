import { useCallback, useEffect, useRef } from "react";
import {
    createChatClient,
    disconnectChatClient,
    subscribeAdminChatUnreadEvents,
    subscribeChatChannelEvents,
    subscribeChatRoomChannelEvents,
} from "../api/chatSocket";

const unsubscribeAll = (subscriptions) => {
    subscriptions.forEach((subscription) => {
        try {
            subscription?.unsubscribe?.();
        } catch {
            // 연결이 이미 끊긴 경우 STOMP 구독도 함께 정리된 상태다.
        }
    });
};

const useAdminChatListRealtime = ({
    rooms = [],
    onRoomChanged,
    onRoomsChanged,
    onReconnect,
}) => {
    const clientRef = useRef(null);
    const subscriptionsRef = useRef([]);
    const roomsRef = useRef(rooms);
    const callbacksRef = useRef({
        onRoomChanged,
        onRoomsChanged,
        onReconnect,
    });
    const hasConnectedRef = useRef(false);

    const subscriptionKey = rooms
        .map((room) => {
            const channelIds = (room.channels ?? [])
                .map((channel) => channel.id)
                .sort((first, second) => Number(first) - Number(second))
                .join(",");

            return `${room.id}:${channelIds}`;
        })
        .sort()
        .join("|");

    const subscribeToCurrentRooms = useCallback((client) => {
        unsubscribeAll(subscriptionsRef.current);

        const subscriptions = [];

        try {
            subscriptions.push(
                subscribeAdminChatUnreadEvents(client, (event) => {
                    if (event?.roomId) {
                        callbacksRef.current.onRoomChanged?.(event.roomId);
                    }
                })
            );

            roomsRef.current.forEach((room) => {
                subscriptions.push(
                    subscribeChatRoomChannelEvents(client, room.id, () => {
                        callbacksRef.current.onRoomsChanged?.();
                    })
                );

                (room.channels ?? []).forEach((channel) => {
                    subscriptions.push(
                        subscribeChatChannelEvents(client, channel.id, () => {
                            callbacksRef.current.onRoomChanged?.(room.id);
                        })
                    );
                });
            });
        } catch (error) {
            console.error("관리자 채팅 목록 실시간 구독에 실패했습니다.", error);
        }

        subscriptionsRef.current = subscriptions.filter(Boolean);
    }, [callbacksRef, roomsRef, subscriptionsRef]);

    useEffect(() => {
        roomsRef.current = rooms;
    }, [rooms]);

    useEffect(() => {
        callbacksRef.current = {
            onRoomChanged,
            onRoomsChanged,
            onReconnect,
        };
    }, [onReconnect, onRoomChanged, onRoomsChanged]);

    useEffect(() => {
        let disposed = false;
        const client = createChatClient({
            onConnect: (connectedClient) => {
                if (disposed) return;

                clientRef.current = connectedClient;
                subscribeToCurrentRooms(connectedClient);

                if (hasConnectedRef.current) {
                    callbacksRef.current.onReconnect?.();
                }

                hasConnectedRef.current = true;
            },
            onError: () => {
                // REST로 불러온 마지막 목록은 유지하고 STOMP 자동 재연결을 기다린다.
            },
        });

        clientRef.current = client;
        client.activate();

        return () => {
            disposed = true;
            const subscriptions = subscriptionsRef.current;

            subscriptionsRef.current = [];
            clientRef.current = null;
            hasConnectedRef.current = false;

            disconnectChatClient(client, subscriptions).catch(() => {
                client.deactivate();
            });
        };
    }, [subscribeToCurrentRooms]);

    useEffect(() => {
        const client = clientRef.current;

        if (!client?.connected) return;

        subscribeToCurrentRooms(client);
    }, [subscribeToCurrentRooms, subscriptionKey]);
};

export default useAdminChatListRealtime;
