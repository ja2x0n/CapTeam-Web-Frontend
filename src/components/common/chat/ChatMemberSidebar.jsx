import { roleLabels } from "../../../constants/student";
import styles from "../../../pages/user/chat/UserTeamChat.module.css";

const MemberItem = ({ member, online }) => {
    const roleLabel = roleLabels[member.studentRole];

    return (
        <li
            className={`${styles.memberItem} ${
                online ? styles.onlineMember : styles.offlineMember
            }`}
        >
            <span
                className={`${styles.statusDot} ${
                    online ? styles.online : ""
                }`}
            />
            <div className={styles.memberInfo}>
                <span className={styles.memberName}>
                    {member.name}
                    {roleLabel ? ` · ${roleLabel}` : ""}
                </span>
            </div>
        </li>
    );
};

const ChatMemberSidebar = ({
    hasPresenceLoaded,
    members = [],
    onlineMembers = [],
    offlineMembers = [],
    onCloseDrawer,
}) => {
    const isInitialPending = !hasPresenceLoaded && members.length === 0;

    return (
        <aside className={styles.memberSidebar}>
            <div className={styles.memberSidebarHeader}>
                <strong>팀원</strong>
                <span>{isInitialPending ? "" : `${members.length}명`}</span>
                <button
                    type="button"
                    className={styles.drawerClose}
                    aria-label="팀원 목록 닫기"
                    onClick={onCloseDrawer}
                >
                    ×
                </button>
            </div>

            {isInitialPending ? (
                <div className={styles.memberPendingArea} />
            ) : (
                <>
                    <div className={styles.memberGroup}>
                        <p className={styles.memberGroupTitle}>
                            온라인 - {onlineMembers.length}
                        </p>

                        <ul className={styles.memberList}>
                            {onlineMembers.map((member) => (
                                <MemberItem
                                    key={member.userId}
                                    member={member}
                                    online
                                />
                            ))}
                        </ul>
                    </div>

                    <div className={styles.memberGroup}>
                        <p className={styles.memberGroupTitle}>
                            오프라인 - {offlineMembers.length}
                        </p>

                        {offlineMembers.length === 0 ? (
                            <p className={styles.memberEmptyText}>
                                오프라인 팀원이 없습니다.
                            </p>
                        ) : (
                            <ul className={styles.memberList}>
                                {offlineMembers.map((member) => (
                                    <MemberItem
                                        key={member.userId}
                                        member={member}
                                        online={false}
                                    />
                                ))}
                            </ul>
                        )}
                    </div>
                </>
            )}
        </aside>
    );
};

export default ChatMemberSidebar;
