import { Link, useParams } from "react-router-dom";
import Header from "../../../components/common/header/Header";
import ChatInput from "../../../components/common/chat/ChatInput";
import ChatMessageList from "../../../components/common/chat/ChatMessageList";
import ChatMemberSidebar from "../../../components/common/chat/ChatMemberSidebar";
import ChatPinnedBar from "../../../components/common/chat/ChatPinnedBar";
import ChatSidebar from "../../../components/common/chat/ChatSidebar";
import authStore from "../../../store/authStore";
import useAdminChatRoom from "../../../hooks/useAdminChatRoom";
import useChatMessages from "../../../hooks/useChatMessages";
import useAdminChatSocket from "../../../hooks/useAdminChatSocket";
import useChatPresence from "../../../hooks/useChatPresence";
import Skeleton from "../../../components/common/skeleton/Skeleton";
import styles from "../../user/chat/UserTeamChat.module.css";
import useDelayedLoading from "../../../hooks/useDelayedLoading";
import { useCallback, useEffect, useState } from "react";
import {
    requestAdminChannelSummaries,
    requestAdminChatMessages,
    requestMarkAdminChatAsRead,
} from "../../../api/adminChatApi";
import {
    requestPinChatMessage,
    requestUnpinChatMessage,
} from "../../../api/chatApi";
import { CHAT_UNREAD_CHANGE_EVENT } from "../../../utils/chat";

const FLASH_DURATION_MS = 1100;

const dispatchChatUnreadChange = () => {
    window.dispatchEvent(new Event(CHAT_UNREAD_CHANGE_EVENT));
};

const AdminChatManage = () => {
    const user = authStore((state) => state.user);
    const currentUserId = user?.userId;
    const { roomId } = useParams();

    const {
        selectedRoom,
        selectedChannel,
        isLoading,
        error,
        updateSelectedChannel,
        handleChannelEvent,
    } = useAdminChatRoom(roomId);

    const {
        messages,
        isMessageLoading,
        isLoadingMoreMessages,
        messageError,
        messageListRef,
        addMessage,
        clearMessages,
        pinToBottom,
        handleEditMessage,
        handleDeleteMessage,
        handleMessageEvent,
        handleMessageScroll,
    } = useChatMessages({
        selectedChannel,
        fetchMessages: requestAdminChatMessages,
        markAsRead: requestMarkAdminChatAsRead,
        onReadComplete: dispatchChatUnreadChange,
    });

    const [channelSummaries, setChannelSummaries] = useState([]);
    const selectedRoomId = selectedRoom?.id;
    const selectedChannelId = selectedChannel?.id;
    const showRoomLoading = useDelayedLoading(isLoading);
    const showMessageLoading = useDelayedLoading(isMessageLoading);

    useEffect(() => {
        let ignore = false;

        if (!selectedRoomId) {
            const timeoutId = window.setTimeout(() => {
                setChannelSummaries([]);
            }, 0);

            return () => {
                window.clearTimeout(timeoutId);
            };
        }

        const getChannelSummaries = async () => {
            try {
                const summaries = await requestAdminChannelSummaries(
                    selectedRoomId
                );

                if (!ignore) {
                    setChannelSummaries(summaries ?? []);
                }
            } catch {
                if (!ignore) {
                    setChannelSummaries([]);
                }
            }
        };

        getChannelSummaries();

        return () => {
            ignore = true;
        };
    }, [selectedRoomId]);

    const getChannelUnreadCount = useCallback(
        (channelId) => {
            const channelSummary = channelSummaries.find(
                (summary) => String(summary.channel?.id) === String(channelId)
            );

            return Number(channelSummary?.unreadCount ?? 0);
        },
        [channelSummaries]
    );

    const clearChannelUnreadCount = useCallback((channelId) => {
        setChannelSummaries((prevSummaries) =>
            prevSummaries.map((summary) =>
                String(summary.channel?.id) === String(channelId)
                    ? {
                          ...summary,
                          unreadCount: 0,
                      }
                    : summary
            )
        );
    }, []);

    const handleReceiveMessage = useCallback(
        (receivedMessage) => {
            addMessage(receivedMessage);

            if (!selectedChannelId) return;

            clearChannelUnreadCount(selectedChannelId);
            requestMarkAdminChatAsRead(selectedChannelId)
                .then(() => {
                    window.dispatchEvent(new Event(CHAT_UNREAD_CHANGE_EVENT));
                })
                .catch(() => {});
        },
        [addMessage, clearChannelUnreadCount, selectedChannelId]
    );

    const handleUnreadEvent = useCallback(
        (event) => {
            if (!event?.channelId) return;

            const isCurrentChannel =
                String(selectedChannelId) === String(event.channelId);

            if (isCurrentChannel) {
                clearChannelUnreadCount(event.channelId);
                window.dispatchEvent(new Event(CHAT_UNREAD_CHANGE_EVENT));
                return;
            }

            setChannelSummaries((prevSummaries) =>
                prevSummaries.map((summary) =>
                    String(summary.channel?.id) === String(event.channelId)
                        ? {
                              ...summary,
                              unreadCount: Number(event.unreadCount ?? 0),
                          }
                        : summary
                )
            );

            window.dispatchEvent(new Event(CHAT_UNREAD_CHANGE_EVENT));
        },
        [clearChannelUnreadCount, selectedChannelId]
    );

    const {
        chatClientRef,
        isSocketConnected,
        isSending,
        isFileSending,
        socketError,
        sendMessage,
        sendFile,
    } = useAdminChatSocket({
        roomId: selectedRoom?.id,
        selectedChannel,
        onReceiveMessage: handleReceiveMessage,
        onMessageEvent: handleMessageEvent,
        onChannelEvent: handleChannelEvent,
        onUnreadEvent: handleUnreadEvent,
        onBeforeSend: pinToBottom,
    });

    const { members, onlineMembers, offlineMembers, hasPresenceLoaded } =
        useChatPresence({
            chatClientRef,
            socketConnected: isSocketConnected,
            selectedChannel,
            teamIdFallback: selectedRoom?.teamId,
            gateBySelectedChannel: true,
        });

    const handleSelectChannel = async (channel) => {
        if (String(selectedChannel?.id) === String(channel?.id)) {
            return;
        }

        clearMessages();
        updateSelectedChannel(channel);
        clearChannelUnreadCount(channel.id);
    };

    const [flashingMessageId, setFlashingMessageId] = useState(null);
    const [isPinUpdating, setIsPinUpdating] = useState(false);
    const [pinError, setPinError] = useState("");

    const pinnedMessageId = selectedChannel?.pinnedMessageId ?? null;
    const pinnedMessage = messages.find(
        (message) => message.id === pinnedMessageId
    );

    const handleTogglePin = async (messageId) => {
        if (!selectedChannel?.id || isPinUpdating) return;

        try {
            setIsPinUpdating(true);
            setPinError("");

            if (pinnedMessageId === messageId) {
                await requestUnpinChatMessage(selectedChannel.id);
            } else {
                await requestPinChatMessage(selectedChannel.id, messageId);
            }
        } catch {
            setPinError("메시지 고정에 실패했습니다.");
        } finally {
            setIsPinUpdating(false);
        }
    };

    const handleUnpin = async () => {
        if (!selectedChannel?.id || isPinUpdating) return;

        try {
            setIsPinUpdating(true);
            setPinError("");
            await requestUnpinChatMessage(selectedChannel.id);
        } catch {
            setPinError("고정 해제에 실패했습니다.");
        } finally {
            setIsPinUpdating(false);
        }
    };

    const handleJumpToPinnedMessage = () => {
        if (!pinnedMessage) return;

        const target = document.getElementById(
            `chat-message-${pinnedMessage.id}`
        );
        target?.scrollIntoView({ behavior: "smooth", block: "center" });

        setFlashingMessageId(pinnedMessage.id);
        window.setTimeout(() => {
            setFlashingMessageId((current) =>
                current === pinnedMessage.id ? null : current
            );
        }, FLASH_DURATION_MS);
    };

    const finalError = error || messageError || socketError || pinError;

    const showEmptyChannel =
        !isLoading && !isMessageLoading && !selectedChannel;

    const showEmptyMessage =
        !isLoading &&
        !isMessageLoading &&
        selectedChannel &&
        messages.length === 0;

    const showMessageList =
        !isLoading &&
        !isMessageLoading &&
        selectedChannel &&
        messages.length > 0;

    const memberCount = members.length;
    const isChatInputDisabled = !selectedChannel || !isSocketConnected;
    const chatInputPlaceholder = !selectedChannel
        ? "채널을 선택하면 메시지를 보낼 수 있습니다"
        : !isSocketConnected
        ? "채팅 서버에 연결하는 중입니다"
        : `${selectedChannel.channelName}에 메시지 입력`;

    const [openDrawer, setOpenDrawer] = useState(null);
    const closeDrawers = () => setOpenDrawer(null);

    return (
        <div className={styles.page}>
            <Header />

            <main className={styles.body}>
                <div className={styles.layout}>
                    <div
                        className={`${styles.drawer} ${styles.drawerLeft} ${
                            openDrawer === "channel" ? styles.drawerOpen : ""
                        }`}
                    >
                        <div className={styles.backBar}>
                            <Link to="/admin/chat" className={styles.backLink}>
                                ← 채팅 목록
                            </Link>
                        </div>

                        <ChatSidebar
                            teamName={selectedRoom?.teamName}
                            channels={selectedRoom?.channels ?? []}
                            selectedChannelId={selectedChannel?.id}
                            getChannelUnreadCount={getChannelUnreadCount}
                            canManageChannel={false}
                            onSelectChannel={(channel) => {
                                handleSelectChannel(channel);
                                closeDrawers();
                            }}
                            onOpenChannelModal={() => {}}
                            onEditChannel={() => {}}
                            onDeleteChannel={() => {}}
                            onCloseDrawer={closeDrawers}
                        />
                    </div>

                    <section className={styles.chatColumn}>
                        <div className={styles.chatHeader}>
                            <button
                                type="button"
                                className={`${styles.iconButton} ${styles.channelToggle}`}
                                aria-label="채널 목록"
                                onClick={() => setOpenDrawer("channel")}
                            >
                                <svg
                                    width="19"
                                    height="19"
                                    viewBox="0 0 24 24"
                                    fill="none"
                                    stroke="currentColor"
                                    strokeWidth="1.9"
                                    strokeLinecap="round"
                                    aria-hidden="true"
                                >
                                    <path d="M4 6h16M4 12h16M4 18h16" />
                                </svg>
                            </button>

                            <div className={styles.chatHeaderMain}>
                                <p className={styles.chatHeaderTitle}>
                                    {selectedChannel?.channelName ?? "채팅"}
                                </p>
                                <p className={styles.chatHeaderMeta}>
                                    {selectedRoom?.teamName
                                        ? `${selectedRoom.teamName} · ${memberCount}명 참여 중`
                                        : `${memberCount}명 참여 중`}
                                </p>
                            </div>

                            <div className={styles.chatHeaderRight}>
                                <button
                                    type="button"
                                    className={`${styles.iconButton} ${styles.memberToggle}`}
                                    aria-label="팀원"
                                    onClick={() => setOpenDrawer("member")}
                                >
                                    <svg
                                        width="19"
                                        height="19"
                                        viewBox="0 0 24 24"
                                        fill="none"
                                        stroke="currentColor"
                                        strokeWidth="1.8"
                                        strokeLinecap="round"
                                        aria-hidden="true"
                                    >
                                        <path d="M16 19v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
                                        <circle cx="9" cy="7" r="4" />
                                        <path d="M22 19v-2a4 4 0 0 0-3-3.87" />
                                    </svg>
                                </button>
                            </div>
                        </div>

                        <ChatPinnedBar
                            pinnedMessage={pinnedMessage}
                            onJump={handleJumpToPinnedMessage}
                            onUnpin={handleUnpin}
                        />

                        {finalError && (
                            <p className={styles.errorText}>{finalError}</p>
                        )}

                        <div
                            ref={messageListRef}
                            className={styles.messageArea}
                            onScroll={handleMessageScroll}
                        >
                            {(isLoading && showRoomLoading) ||
                            (!isLoading &&
                                isMessageLoading &&
                                showMessageLoading) ? (
                                <div className={styles.messageSkeleton}>
                                    <div className={styles.skeletonRow}>
                                        <Skeleton width={36} height={36} circle />
                                        <div className={styles.skeletonBody}>
                                            <Skeleton width={96} height={16} />
                                            <Skeleton
                                                width="66%"
                                                height={40}
                                                radius={16}
                                                style={{ marginTop: 8 }}
                                            />
                                        </div>
                                    </div>
                                    <div className={styles.skeletonRowMine}>
                                        <Skeleton
                                            width="50%"
                                            height={40}
                                            radius={16}
                                        />
                                    </div>
                                </div>
                            ) : showEmptyChannel ? (
                                <div className={styles.emptyState}>
                                    <p className={styles.emptyTitle}>
                                        선택할 수 있는 채널이 없어요
                                    </p>
                                    <p className={styles.emptyDesc}>
                                        팀이 채널을 만들면 여기에서 대화를 볼 수
                                        있어요.
                                    </p>
                                </div>
                            ) : showEmptyMessage ? (
                                <div className={styles.emptyState}>
                                    <p className={styles.emptyTitle}>
                                        아직 작성된 메시지가 없어요
                                    </p>
                                    <p className={styles.emptyDesc}>
                                        팀원이 대화를 시작하면 여기에 표시돼요.
                                    </p>
                                </div>
                            ) : (
                                showMessageList && (
                                    <ChatMessageList
                                        messages={messages}
                                        currentUserId={currentUserId}
                                        isLoadingMoreMessages={
                                            isLoadingMoreMessages
                                        }
                                        onEditMessage={handleEditMessage}
                                        onDeleteMessage={handleDeleteMessage}
                                        pinnedMessageId={pinnedMessageId}
                                        flashingMessageId={flashingMessageId}
                                        onTogglePin={handleTogglePin}
                                    />
                                )
                            )}
                        </div>

                        <ChatInput
                            onSend={sendMessage}
                            onFileSend={sendFile}
                            disabled={isChatInputDisabled}
                            isSending={isSending}
                            isFileSending={isFileSending}
                            placeholder={chatInputPlaceholder}
                        />
                    </section>

                    <div
                        className={`${styles.drawer} ${styles.drawerRight} ${
                            openDrawer === "member" ? styles.drawerOpen : ""
                        }`}
                    >
                        <ChatMemberSidebar
                            hasPresenceLoaded={hasPresenceLoaded}
                            members={members}
                            onlineMembers={onlineMembers}
                            offlineMembers={offlineMembers}
                            onCloseDrawer={closeDrawers}
                        />
                    </div>

                    {openDrawer && (
                        <div
                            className={styles.scrim}
                            onClick={closeDrawers}
                            role="presentation"
                        />
                    )}
                </div>
            </main>
        </div>
    );
};

export default AdminChatManage;
