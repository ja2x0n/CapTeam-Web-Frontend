import { useCallback, useEffect, useState } from "react";
import { requestMyTeam } from "../api/teamApi";
import { requestChatMessages, requestMarkChatAsRead } from "../api/chatApi";
import useChatMessages from "./useChatMessages";
import useChatPresence from "./useChatPresence";
import useChatRoom from "./useChatRoom";
import useChatSocket from "./useChatSocket";

let toastIdSeq = 1;

const useUserTeamChat = () => {
    const [error, setError] = useState("");
    const [toasts, setToasts] = useState([]);
    const [memberRoles, setMemberRoles] = useState({});
    const {
        room,
        selectedChannel,
        isLoading,
        isChannelModalOpen,
        channelModalMode,
        targetChannel,
        newChannelName,
        channelCreateError,
        isCreatingChannel,
        updateSelectedChannel,
        getChannelUnreadCount,
        clearChannelUnreadCount,
        updateChannelLastMessage,
        applyChannelUnreadEvent,
        handleSubmitChannelModal,
        changeNewChannelName,
        openCreateChannelModal,
        openEditChannelModal,
        openDeleteChannelModal,
        handleChannelEvent,
        closeChannelModal,
    } = useChatRoom({ setError });

    const {
        messages,
        setMessages,
        isMessageLoading,
        isLoadingMoreMessages,
        messageListRef,
        pinToBottom,
        handleEditMessage,
        handleDeleteMessage,
        handleMessageEvent,
        handleMessageScroll,
    } = useChatMessages({
        selectedChannel,
        fetchMessages: requestChatMessages,
        markAsRead: requestMarkChatAsRead,
        onReadComplete: clearChannelUnreadCount,
        onError: setError,
    });

    const {
        chatClientRef,
        socketConnected,
        isSending,
        isFileSending,
        handleSendMessage,
        handleSendFile,
    } = useChatSocket({
        roomId: room?.id,
        selectedChannel,
        channels: room?.channels ?? [],
        setMessages,
        onMessageEvent: handleMessageEvent,
        onChannelEvent: handleChannelEvent,
        clearChannelUnreadCount,
        updateChannelLastMessage,
        onUnreadEvent: applyChannelUnreadEvent,
        onBeforeSend: pinToBottom,
        onForeignMessage: (channel, receivedMessage) => {
            setToasts((prevToasts) => [
                ...prevToasts,
                {
                    id: toastIdSeq++,
                    channelId: channel.id,
                    channelName: channel.channelName,
                    senderName: receivedMessage.senderName,
                    preview: receivedMessage.message,
                },
            ]);
        },
        setError,
    });

    const dismissToast = (toastId) => {
        setToasts((prevToasts) =>
            prevToasts.filter((toast) => toast.id !== toastId)
        );
    };

    const selectToastChannel = (toast) => {
        const channel = (room?.channels ?? []).find(
            (candidate) => String(candidate.id) === String(toast.channelId)
        );

        if (channel) {
            updateSelectedChannel(channel);
        }
    };

    const {
        members: presenceMembers,
        onlineMembers: presenceOnlineMembers,
        offlineMembers: presenceOfflineMembers,
        hasPresenceLoaded,
    } = useChatPresence({
        selectedChannel,
        socketConnected,
        chatClientRef,
        onError: setError,
    });

    // presence 응답엔 희망 직군(studentRole)이 없어서, 이미 확정된
    // 팀 정보 API(/api/teams/my-team)에서 받아 userId로 합쳐준다.
    const loadMemberDetails = useCallback(() => {
        if (!room?.id) return undefined;

        let isMounted = true;

        requestMyTeam()
            .then((data) => {
                if (!isMounted) return;

                const detailByUserId = {};
                (data?.members ?? []).forEach((member) => {
                    detailByUserId[member.userId] = {
                        studentRole: member.studentRole,
                    };
                });
                setMemberRoles(detailByUserId);
            })
            .catch(() => setError("팀원 정보를 불러오지 못했습니다."));

        return () => {
            isMounted = false;
        };
    }, [room?.id]);

    useEffect(() => loadMemberDetails(), [loadMemberDetails]);

    const withMemberDetails = (memberList) =>
        memberList.map((member) => ({
            ...member,
            studentRole: memberRoles[member.userId]?.studentRole,
        }));

    const members = withMemberDetails(presenceMembers);
    const onlineMembers = withMemberDetails(presenceOnlineMembers);
    const offlineMembers = withMemberDetails(presenceOfflineMembers);

    return {
        room,
        selectedChannel,
        messages,
        members,
        onlineMembers,
        offlineMembers,
        isLoading,
        isMessageLoading,
        isLoadingMoreMessages,
        hasPresenceLoaded,
        socketConnected,
        isSending,
        isFileSending,
        error,
        isChannelModalOpen,
        channelModalMode,
        targetChannel,
        newChannelName,
        channelCreateError,
        isCreatingChannel,
        messageListRef,
        updateSelectedChannel,
        getChannelUnreadCount,
        handleSendMessage,
        handleSendFile,
        handleEditMessage,
        handleDeleteMessage,
        handleMessageScroll,
        handleSubmitChannelModal,
        changeNewChannelName,
        openCreateChannelModal,
        openEditChannelModal,
        openDeleteChannelModal,
        closeChannelModal,
        toasts,
        dismissToast,
        selectToastChannel,
    };
};

export default useUserTeamChat;
