import { useState } from "react";
import Header from "../../../components/common/header/Header";
import ChatInput from "../../../components/common/chat/ChatInput";
import authStore from "../../../store/authStore";
import ChatChannelModal from "../../../components/common/chat/ChatChannelModal";
import ChatMemberSidebar from "../../../components/common/chat/ChatMemberSidebar";
import ChatMessageList from "../../../components/common/chat/ChatMessageList";
import ChatPinnedBar from "../../../components/common/chat/ChatPinnedBar";
import ChatSidebar from "../../../components/common/chat/ChatSidebar";
import ChatToast from "../../../components/common/chat/ChatToast";
import useUserTeamChat from "../../../hooks/useUserTeamChat";
import {
    requestPinChatMessage,
    requestUnpinChatMessage,
} from "../../../api/chatApi";
import Skeleton from "../../../components/common/skeleton/Skeleton";
import styles from "./UserTeamChat.module.css";

const FLASH_DURATION_MS = 1100;

const UserTeamChat = () => {
    const user = authStore((state) => state.user);
    const currentUserId = user?.userId;
    const [flashingMessageId, setFlashingMessageId] = useState(null);
    // 좁은 화면에서는 채널/팀원 패널을 드로어로 연다
    const [openDrawer, setOpenDrawer] = useState(null);
    const [isPinUpdating, setIsPinUpdating] = useState(false);
    const [pinError, setPinError] = useState("");
    const {
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
    } = useUserTeamChat();
    const currentMember = room?.myMember;
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

    const canManageChannel = currentMember?.leaderRole === "LEADER";
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
    const isChatInputDisabled = !selectedChannel || !socketConnected;
    const chatInputPlaceholder = !selectedChannel
        ? "채널을 선택하면 메시지를 보낼 수 있습니다"
        : !socketConnected
        ? "채팅 서버에 연결하는 중입니다"
        : `${selectedChannel.channelName}에 메시지 입력`;

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
                        <ChatSidebar
                            teamName={room?.teamName}
                            channels={room?.channels ?? []}
                            selectedChannelId={selectedChannel?.id}
                            getChannelUnreadCount={getChannelUnreadCount}
                            canManageChannel={canManageChannel}
                            onSelectChannel={(channel) => {
                                updateSelectedChannel(channel);
                                closeDrawers();
                            }}
                            onOpenChannelModal={openCreateChannelModal}
                            onEditChannel={openEditChannelModal}
                            onDeleteChannel={openDeleteChannelModal}
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
                                    {selectedChannel
                                        ? `${memberCount}명 참여 중`
                                        : "채널을 선택해주세요"}
                                </p>
                            </div>

                            <div className={styles.chatHeaderRight}>
                                {!socketConnected && (
                                    <span className={styles.connectingChip}>
                                        <span className={styles.connectingDot} />
                                        연결 중
                                    </span>
                                )}
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

                        {(error || pinError) && (
                            <p className={styles.errorText}>
                                {error || pinError}
                            </p>
                        )}

                        <div
                            ref={messageListRef}
                            className={styles.messageArea}
                            onScroll={handleMessageScroll}
                        >
                            {isLoading || isMessageLoading ? (
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
                                    <div className={styles.skeletonRow}>
                                        <Skeleton width={36} height={36} circle />
                                        <div className={styles.skeletonBody}>
                                            <Skeleton width={80} height={16} />
                                            <Skeleton
                                                width="60%"
                                                height={64}
                                                radius={16}
                                                style={{ marginTop: 8 }}
                                            />
                                        </div>
                                    </div>
                                </div>
                            ) : showEmptyChannel ? (
                                <div className={styles.emptyState}>
                                    <p className={styles.emptyTitle}>
                                        아직 생성된 채팅 채널이 없어요
                                    </p>
                                    <p className={styles.emptyDesc}>
                                        팀장이 채널을 만들면 여기에서 대화할 수
                                        있어요.
                                    </p>
                                </div>
                            ) : showEmptyMessage ? (
                                <div className={styles.emptyState}>
                                    <p className={styles.emptyTitle}>
                                        첫 메시지를 보내 팀 대화를 시작해보세요
                                    </p>
                                    <p className={styles.emptyDesc}>
                                        이 채널의 대화는 팀원 모두에게 보여요.
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
                            onSend={handleSendMessage}
                            onFileSend={handleSendFile}
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

            {isChannelModalOpen && (
                <ChatChannelModal
                    mode={channelModalMode}
                    targetChannel={targetChannel}
                    channelName={newChannelName}
                    error={channelCreateError}
                    isCreating={isCreatingChannel}
                    onChangeChannelName={changeNewChannelName}
                    onClose={closeChannelModal}
                    onSubmit={handleSubmitChannelModal}
                />
            )}

            <ChatToast
                toasts={toasts}
                onDismiss={dismissToast}
                onSelect={selectToastChannel}
            />
        </div>
    );
};

export default UserTeamChat;
