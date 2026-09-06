// Design/team-edit.html 반영. 카드 뒤집기 → 세로 리스트 + 배정 이유 인라인 펼치기.
import { levelLabels, roleLabels } from "../../../constants/team";
import { getRoleSummary } from "../../../utils/teamRecommendation";
import styles from "./TeamEditCard.module.css";

const TeamEditCard = ({
    team,
    teamNumber,
    selectedMember,
    highlightedUserIds,
    flipped,
    onMemberClick,
    onHeaderDoubleClick,
}) => {
    return (
        <section className={styles.team}>
            <div data-reveal className={styles.teamHead}>
                <h2 className={styles.teamName}>
                    {teamNumber}팀
                    <span className={styles.teamSummary}>
                        {team.members.length}명 · {getRoleSummary(team.members)}
                    </span>
                </h2>
                <button
                    type="button"
                    className={styles.reasonToggle}
                    onClick={onHeaderDoubleClick}
                    aria-expanded={flipped}
                >
                    {flipped ? "배정 이유 접기" : "배정 이유 보기"}
                </button>
            </div>

            <div data-reveal className={styles.memberRow}>
                {team.members.map((member) => {
                    const isLeader = member.recommendedLeader;
                    const isSelected =
                        selectedMember?.recommendationId === team.id &&
                        selectedMember?.userId === member.userId;

                    return (
                        <button
                            key={member.userId}
                            type="button"
                            className={`${styles.member} ${
                                isSelected ? styles.memberSelected : ""
                            } ${
                                highlightedUserIds.includes(member.userId)
                                    ? styles.memberHighlighted
                                    : ""
                            }`}
                            disabled={isLeader}
                            title={
                                isLeader
                                    ? "팀장은 교환할 수 없습니다."
                                    : undefined
                            }
                            onClick={() => onMemberClick(team.id, member.userId)}
                        >
                            <span className={styles.memberNameRow}>
                                <span className={styles.memberName}>
                                    {member.name}
                                </span>
                                {isLeader && (
                                    <span className={styles.leaderBadge}>
                                        팀장
                                    </span>
                                )}
                            </span>
                            <span className={styles.memberMeta}>
                                {roleLabels[member.studentRole] ||
                                    member.studentRole}{" "}
                                ·{" "}
                                {levelLabels[member.studentLevel] ||
                                    member.studentLevel ||
                                    "-"}
                            </span>
                            <span className={styles.memberSkill}>
                                {member.skill || "스택 미입력"}
                            </span>
                        </button>
                    );
                })}
            </div>

            {/* 높이 애니메이션을 위해 grid-template-rows 0fr → 1fr */}
            <div
                className={`${styles.reasonWrap} ${
                    flipped ? styles.reasonOpen : ""
                }`}
            >
                <div className={styles.reasonInner}>
                    <div className={styles.reasonList}>
                        {team.reasons?.length ? (
                            team.reasons.map((reason) => (
                                <div key={`${team.id}-${reason.title}`}>
                                    <strong className={styles.reasonTitle}>
                                        {reason.title}
                                    </strong>
                                    <p className={styles.reasonText}>
                                        {reason.description}
                                    </p>
                                </div>
                            ))
                        ) : (
                            <p className={styles.reasonText}>
                                배정 이유를 생성하지 못했어요. 팀을 재생성해주세요.
                            </p>
                        )}
                    </div>
                </div>
            </div>
        </section>
    );
};

export default TeamEditCard;
