// Design/team-manage.html 상세 모달 반영. 넓어진 폭을 2단으로 쓰고,
// 강조는 4곳(기획서 배지 / 기능 번호 / 팀장 표시 / 강점 블록)으로만 제한한다.
import { useNavigate } from "react-router-dom";
import { gradeLabels, roleLabels } from "../../../constants/team";
import { parseMainFeatures } from "../../../utils/projectPlan";
import {
    hasProjectInfo,
    getTeamDisplayName,
} from "../../../utils/teamRecommendation";
import ModalOverlay from "../../common/modal/ModalOverlay";
import { useModalClose } from "../../common/modal/modalCloseContext";
import Skeleton from "../../common/skeleton/Skeleton";
import EmptyState from "../../common/empty/EmptyState";
import useInView from "../../../hooks/useInView";
import styles from "./AdminTeamDetailModal.module.css";

const MANUAL_TEAM_DESCRIPTION = "관리자가 직접 구성한 팀입니다.";

const countRoles = (members) =>
    members.reduce((counts, member) => {
        const label = roleLabels[member.studentRole] || member.studentRole;
        counts[label] = (counts[label] || 0) + 1;
        return counts;
    }, {});

const CloseButton = () => {
    const close = useModalClose();

    return (
        <button
            type="button"
            className={styles.closeButton}
            onClick={close}
            aria-label="닫기"
        >
            ×
        </button>
    );
};

const DetailSkeleton = () => (
    <div className={styles.columns}>
        <div>
            <Skeleton width={128} height={24} />
            <Skeleton width={96} height={20} style={{ marginTop: 16 }} />
            <Skeleton height={64} style={{ marginTop: 12 }} />
            <Skeleton height={48} style={{ marginTop: 24 }} />
            <Skeleton height={48} style={{ marginTop: 8 }} />
        </div>
        <div>
            <Skeleton width={96} height={24} />
            <Skeleton height={56} style={{ marginTop: 16 }} />
            <Skeleton height={56} style={{ marginTop: 8 }} />
            <Skeleton height={56} style={{ marginTop: 8 }} />
        </div>
    </div>
);

const AdminTeamDetailModal = ({ team, loading, error, onClose }) => {
    const navigate = useNavigate();
    const contentRef = useInView({ replayKey: team?.teamId ?? "none" });

    const projectWritten = hasProjectInfo(team);
    const members = team?.members || [];
    const mainFeatures = parseMainFeatures(team?.mainFeatures);
    const isManualTeam = team?.strengths === MANUAL_TEAM_DESCRIPTION;

    const moveToStudentDetail = (userId) => {
        navigate(`/admin/student?userId=${encodeURIComponent(userId)}`);
    };

    return (
        <ModalOverlay
            onClose={onClose}
            overlayClassName={styles.overlay}
            modalClassName={styles.panel}
            ariaLabelledby="admin-team-detail-modal-title"
        >
            <header className={styles.header}>
                <div className={styles.headerMain}>
                    <div className={styles.titleRow}>
                        <h2
                            id="admin-team-detail-modal-title"
                            className={styles.title}
                        >
                            {team
                                ? getTeamDisplayName(team, projectWritten)
                                : "팀 상세"}
                        </h2>
                        {team && (
                            <span className={styles.gradeBadge}>
                                {gradeLabels[team.grade] || team.grade}
                            </span>
                        )}
                    </div>

                    {team && (
                        <div className={styles.subRow}>
                            <span className={styles.teamName}>
                                {team.teamName}
                            </span>
                            <span className={styles.roleChips}>
                                {Object.entries(countRoles(members)).map(
                                    ([role, count]) => (
                                        <span
                                            key={role}
                                            className={styles.roleChip}
                                        >
                                            {role} {count}
                                        </span>
                                    )
                                )}
                            </span>
                        </div>
                    )}
                </div>

                <CloseButton />
            </header>

            <div className={styles.scrollArea}>
                {loading ? (
                    <DetailSkeleton />
                ) : error ? (
                    <EmptyState
                        variant="error"
                        title="팀 정보를 불러오지 못했어요"
                        description={error}
                    />
                ) : (
                    team && (
                        <div ref={contentRef}>
                            <div className={styles.columns}>
                                <section>
                                    <div
                                        data-reveal
                                        className={styles.sectionHead}
                                    >
                                        <h3 className={styles.sectionTitle}>
                                            프로젝트 기획서
                                        </h3>
                                        <span
                                            className={
                                                projectWritten
                                                    ? styles.planDoneBadge
                                                    : styles.planPendingBadge
                                            }
                                        >
                                            {projectWritten
                                                ? "작성 완료"
                                                : "작성 전"}
                                        </span>
                                    </div>

                                    {projectWritten ? (
                                        <>
                                            <div
                                                data-reveal
                                                className={styles.planBlock}
                                            >
                                                <p
                                                    className={
                                                        styles.fieldLabel
                                                    }
                                                >
                                                    서비스 소개
                                                </p>
                                                <p
                                                    className={
                                                        styles.fieldValue
                                                    }
                                                >
                                                    {team.serviceIntro}
                                                </p>
                                            </div>

                                            {mainFeatures.length > 0 && (
                                                <div
                                                    data-reveal
                                                    className={
                                                        styles.planBlock
                                                    }
                                                >
                                                    <p
                                                        className={
                                                            styles.fieldLabel
                                                        }
                                                    >
                                                        주요 기능
                                                    </p>
                                                    <div
                                                        className={
                                                            styles.featureList
                                                        }
                                                    >
                                                        {mainFeatures.map(
                                                            (
                                                                feature,
                                                                index
                                                            ) => (
                                                                <div
                                                                    key={`${feature}-${index}`}
                                                                    className={
                                                                        styles.featureRow
                                                                    }
                                                                >
                                                                    <span
                                                                        className={
                                                                            styles.featureIndex
                                                                        }
                                                                    >
                                                                        {index +
                                                                            1}
                                                                    </span>
                                                                    <span
                                                                        className={
                                                                            styles.featureText
                                                                        }
                                                                    >
                                                                        {
                                                                            feature
                                                                        }
                                                                    </span>
                                                                </div>
                                                            )
                                                        )}
                                                    </div>
                                                </div>
                                            )}
                                        </>
                                    ) : (
                                        <p
                                            data-reveal
                                            className={styles.planEmpty}
                                        >
                                            학생이 프로젝트 기획서를 저장하면
                                            여기에서 서비스 소개와 주요 기능을
                                            볼 수 있어요.
                                        </p>
                                    )}
                                </section>

                                <section>
                                    <div
                                        data-reveal
                                        className={styles.sectionHead}
                                    >
                                        <h3 className={styles.sectionTitle}>
                                            팀원 구성
                                        </h3>
                                        <span className={styles.memberCount}>
                                            {members.length}명
                                        </span>
                                    </div>

                                    <div className={styles.memberList}>
                                        {members.map((member) => (
                                            <button
                                                key={member.userId}
                                                type="button"
                                                data-reveal
                                                className={`${styles.memberRow} ${
                                                    member.leaderRole ===
                                                    "LEADER"
                                                        ? styles.memberLeader
                                                        : ""
                                                }`}
                                                onClick={() =>
                                                    moveToStudentDetail(
                                                        member.userId
                                                    )
                                                }
                                            >
                                                <span
                                                    className={
                                                        styles.memberMain
                                                    }
                                                >
                                                    <span
                                                        className={
                                                            styles.memberNameRow
                                                        }
                                                    >
                                                        <span
                                                            className={
                                                                styles.memberName
                                                            }
                                                        >
                                                            {member.name}
                                                        </span>
                                                        {member.leaderRole ===
                                                            "LEADER" && (
                                                            <span
                                                                className={
                                                                    styles.leaderBadge
                                                                }
                                                            >
                                                                팀장
                                                            </span>
                                                        )}
                                                    </span>
                                                    {member.skill?.length >
                                                        0 && (
                                                        <span
                                                            className={
                                                                styles.memberSkill
                                                            }
                                                        >
                                                            {member.skill
                                                                .slice(0, 3)
                                                                .join(" · ")}
                                                            {member.skill
                                                                .length > 3 &&
                                                                ` · +${
                                                                    member.skill
                                                                        .length -
                                                                    3
                                                                }`}
                                                        </span>
                                                    )}
                                                </span>

                                                <span
                                                    className={
                                                        styles.memberRight
                                                    }
                                                >
                                                    <span
                                                        className={
                                                            styles.roleBadge
                                                        }
                                                    >
                                                        {roleLabels[
                                                            member.studentRole
                                                        ] || member.studentRole}
                                                    </span>
                                                    <svg
                                                        className={
                                                            styles.chevron
                                                        }
                                                        width="18"
                                                        height="18"
                                                        viewBox="0 0 24 24"
                                                        fill="none"
                                                        stroke="currentColor"
                                                        strokeWidth="1.8"
                                                        strokeLinecap="round"
                                                        strokeLinejoin="round"
                                                        aria-hidden="true"
                                                    >
                                                        <path d="m9 18 6-6-6-6" />
                                                    </svg>
                                                </span>
                                            </button>
                                        ))}
                                    </div>

                                    <p data-reveal className={styles.hint}>
                                        학생을 누르면 학생 상세 조회로 이동해요.
                                    </p>
                                </section>
                            </div>

                            <section className={styles.insightSection}>
                                <h3
                                    data-reveal
                                    className={styles.insightTitle}
                                >
                                    AI 팀 분석
                                </h3>
                                <div className={styles.insightGrid}>
                                    <div
                                        data-reveal
                                        className={styles.strengthCard}
                                    >
                                        <p className={styles.strengthLabel}>
                                            강점
                                        </p>
                                        <p className={styles.insightText}>
                                            {team.strengths ||
                                                "아직 팀 강점 정보를 받아오지 못했어요."}
                                        </p>
                                    </div>
                                    <div
                                        data-reveal
                                        className={styles.weaknessCard}
                                    >
                                        <p className={styles.weaknessLabel}>
                                            약점
                                        </p>
                                        <p className={styles.insightText}>
                                            {team.weaknesses ||
                                                (isManualTeam
                                                    ? MANUAL_TEAM_DESCRIPTION
                                                    : "아직 팀 약점 정보를 받아오지 못했어요.")}
                                        </p>
                                    </div>
                                </div>
                            </section>
                        </div>
                    )
                )}
            </div>
        </ModalOverlay>
    );
};

export default AdminTeamDetailModal;
