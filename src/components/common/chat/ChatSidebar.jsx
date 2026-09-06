import ChatChannel from "./ChatChannel";
import styles from "../../../pages/user/chat/UserTeamChat.module.css";

const ChatSidebar = ({
    teamName,
    channels = [],
    selectedChannelId,
    getChannelUnreadCount,
    canManageChannel,
    onSelectChannel,
    onOpenChannelModal,
    onEditChannel,
    onDeleteChannel,
    onCloseDrawer,
}) => {
    return (
        <aside className={styles.sidebar}>
            <div className={styles.sidebarHeader}>
                <div>
                    <h1>{teamName ?? "\u00A0"}</h1>
                    <p>프로젝트 대화 공간</p>
                </div>
                <button
                    type="button"
                    className={styles.drawerClose}
                    aria-label="채널 목록 닫기"
                    onClick={onCloseDrawer}
                >
                    ×
                </button>
            </div>

            <div className={styles.channelArea}>
                <div className={styles.sectionTitle}>
                    <span>채널</span>
                    {canManageChannel && (
                        <button
                            type="button"
                            className={styles.addChannelButton}
                            aria-label="채널 추가"
                            onClick={onOpenChannelModal}
                        >
                            +
                        </button>
                    )}
                </div>

                <div className={styles.channelList}>
                    {channels.map((channel) => (
                        <ChatChannel
                            key={channel.id}
                            channel={channel}
                            unreadCount={getChannelUnreadCount(channel.id)}
                            selected={selectedChannelId === channel.id}
                            canManageChannel={canManageChannel}
                            onClick={() => onSelectChannel(channel)}
                            onEdit={() => onEditChannel(channel)}
                            onDelete={() => onDeleteChannel(channel)}
                        />
                    ))}
                </div>
            </div>
        </aside>
    );
};

export default ChatSidebar;
