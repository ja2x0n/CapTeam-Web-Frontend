import { useEffect, useMemo, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import Header from "../../../components/common/header/Header";
import { requestAdminStudentList } from "../../../api/studentApi";
import { requestCreateManualTeams } from "../../../api/teamApi";
import { roleLabels, gradeLabels } from "../../../constants/team";
import { getApiErrorMessage } from "../../../utils/apiError";
import {
    getRoleBarSegments,
    getRoleSummary,
} from "../../../utils/teamRecommendation";
import { getStudentNumberInfo } from "../../../utils/student";
import Skeleton from "../../../components/common/skeleton/Skeleton";
import EmptyState from "../../../components/common/empty/EmptyState";
import ModalOverlay from "../../../components/common/modal/ModalOverlay";
import useInView from "../../../hooks/useInView";
import styles from "./AdminTeamManualCreate.module.css";

const MAX_TEAM_SIZE = 5;

const matchesKeyword = (student, keyword) => {
    if (!keyword) return false;

    const roleLabel = roleLabels[student.studentRole] || "";

    return (
        student.name.toLowerCase().includes(keyword) ||
        getStudentNumberInfo(student.userId).number.includes(keyword) ||
        roleLabel.toLowerCase().includes(keyword)
    );
};

let teamIdSeq = 1;
const createEmptyTeam = () => ({
    id: `team-${teamIdSeq++}`,
    memberUserIds: [],
    leaderUserId: null,
});

const AdminTeamManualCreate = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const grade = location.state?.grade || "GRADE_2";
    const [students, setStudents] = useState([]);
    const [teams, setTeams] = useState([createEmptyTeam(), createEmptyTeam()]);
    const [searchByTeamId, setSearchByTeamId] = useState({});
    const [openResultsTeamId, setOpenResultsTeamId] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState("");
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false);
    // 드래그로 옮기는 중인 학생 / 지금 올라가 있는 팀
    const [draggingUserId, setDraggingUserId] = useState(null);
    const [dragOverTeamId, setDragOverTeamId] = useState(null);

    useEffect(() => {
        const getStudents = async () => {
            try {
                const data = await requestAdminStudentList();
                setStudents(
                    Array.isArray(data?.students)
                        ? data.students.filter(
                              (student) => student.grade === grade
                          )
                        : []
                );
            } catch {
                setError("학생 목록을 불러오지 못했습니다.");
            } finally {
                setIsLoading(false);
            }
        };

        getStudents();
    }, [grade]);

    const assignedUserIds = useMemo(() => {
        const assigned = new Set();
        teams.forEach((team) => {
            team.memberUserIds.forEach((userId) => assigned.add(userId));
        });
        return assigned;
    }, [teams]);

    const unassignedStudents = students.filter(
        (student) => !assignedUserIds.has(student.userId)
    );

    const findStudent = (userId) =>
        students.find((student) => student.userId === userId);

    const handleAddTeam = () => {
        setTeams((prevTeams) => [...prevTeams, createEmptyTeam()]);
    };

    const handleRemoveTeam = (teamId) => {
        setTeams((prevTeams) =>
            prevTeams.filter((team) => team.id !== teamId)
        );
    };

    const handleAddMember = (teamId, userId) => {
        setTeams((prevTeams) =>
            prevTeams.map((team) => {
                if (team.id !== teamId) return team;
                if (team.memberUserIds.includes(userId)) return team;
                if (team.memberUserIds.length >= MAX_TEAM_SIZE) return team;

                return {
                    ...team,
                    memberUserIds: [...team.memberUserIds, userId],
                    leaderUserId: team.leaderUserId || userId,
                };
            })
        );
        setSearchByTeamId((prev) => ({ ...prev, [teamId]: "" }));
        setOpenResultsTeamId(null);
    };

    const handleRemoveMember = (teamId, userId) => {
        setTeams((prevTeams) =>
            prevTeams.map((team) => {
                if (team.id !== teamId) return team;

                const memberUserIds = team.memberUserIds.filter(
                    (id) => id !== userId
                );

                return {
                    ...team,
                    memberUserIds,
                    leaderUserId:
                        team.leaderUserId === userId
                            ? memberUserIds[0] || null
                            : team.leaderUserId,
                };
            })
        );
    };

    const handleSetLeader = (teamId, userId) => {
        setTeams((prevTeams) =>
            prevTeams.map((team) =>
                team.id === teamId ? { ...team, leaderUserId: userId } : team
            )
        );
    };

    const isTeamFull = (team) => team.memberUserIds.length >= MAX_TEAM_SIZE;

    const handleDropOnTeam = (event, team) => {
        event.preventDefault();
        setDragOverTeamId(null);

        const userId =
            event.dataTransfer.getData("text/plain") || draggingUserId;

        setDraggingUserId(null);

        if (!userId || isTeamFull(team)) return;
        if (assignedUserIds.has(userId)) return;

        handleAddMember(team.id, userId);
    };

    const handleSearchChange = (teamId, value) => {
        setSearchByTeamId((prev) => ({ ...prev, [teamId]: value }));
        setOpenResultsTeamId(value.trim() ? teamId : null);
    };

    const getSearchResults = (teamId) => {
        const keyword = (searchByTeamId[teamId] || "").trim().toLowerCase();

        return unassignedStudents
            .filter((student) => matchesKeyword(student, keyword))
            .slice(0, 6);
    };

    const buildTeamsPayload = () =>
        teams
            .filter((team) => team.memberUserIds.length > 0)
            .map((team, index) => ({
                teamName: `${index + 1}팀`,
                memberUserIds: team.memberUserIds,
                leaderUserId: team.leaderUserId,
            }));

    const submitTeams = async () => {
        try {
            setIsSubmitting(true);
            setError("");
            await requestCreateManualTeams(grade, buildTeamsPayload());
            navigate("/admin/team-manage");
        } catch (e) {
            setError(getApiErrorMessage(e, "팀 구성 저장에 실패했습니다."));
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleSubmitClick = () => {
        if (unassignedStudents.length > 0) {
            setIsConfirmModalOpen(true);
            return;
        }

        submitTeams();
    };

    const assignedCount = assignedUserIds.size;
    const filledTeamCount = teams.filter(
        (team) => team.memberUserIds.length > 0
    ).length;
    const canSubmit = filledTeamCount > 0 && !isSubmitting;
    const boardRef = useInView({ replayKey: `${isLoading}-${teams.length}` });

    return (
        <div className={styles.page}>
            <Header />

            <main className={styles.body}>
                <div className={styles.backRow}>
                    <Link to="/admin/team-create" className={styles.backLink}>
                        ← 팀 생성
                    </Link>
                </div>

                <section className={styles.pageHead}>
                    <p className={styles.eyebrow}>
                        {gradeLabels[grade]} · 직접 구성
                    </p>
                    <h1 className={styles.headline}>팀을 직접 짜주세요</h1>
                    <p className={styles.subline}>
                        학생을 검색해 팀에 추가하고 팀장을 지정하세요.
                        <br />한 팀은 최대 <b>{MAX_TEAM_SIZE}명</b>까지예요.
                        <br />
                        먼저 넣은 학생이 자동으로 팀장이 되고, 언제든 바꿀 수
                        있어요.
                    </p>
                </section>

                {/* 스크롤해도 따라오는 배정 현황 + 액션 */}
                <div className={styles.summaryBar}>
                    <div className={styles.summaryRow}>
                        <div className={styles.stat}>
                            <p className={styles.statLabel}>배정 완료</p>
                            <p className={styles.statValue}>
                                {assignedCount}{" "}
                                <span>/ {students.length}명</span>
                            </p>
                        </div>
                        <div className={styles.stat}>
                            <p className={styles.statLabel}>만든 팀</p>
                            <p className={styles.statValue}>
                                {teams.length}
                                <span>팀</span>
                            </p>
                        </div>

                        <div className={styles.summaryActions}>
                            <button
                                type="button"
                                className={styles.outlineButton}
                                onClick={handleAddTeam}
                            >
                                + 팀 추가
                            </button>
                            <button
                                type="button"
                                className={styles.primaryButton}
                                disabled={!canSubmit}
                                onClick={handleSubmitClick}
                            >
                                {isSubmitting ? "저장 중..." : "직접 구성 완료"}
                            </button>
                        </div>
                    </div>

                    {!canSubmit && !isSubmitting && (
                        <p className={styles.submitHint}>
                            최소 한 팀 이상 학생을 배정해야 완료할 수 있어요.
                        </p>
                    )}
                    {error && <p className={styles.errorText}>{error}</p>}
                </div>

                {isLoading ? (
                    <div className={styles.board}>
                        <div>
                            <Skeleton width={128} height={24} />
                            <Skeleton height={56} style={{ marginTop: 16 }} />
                            <Skeleton height={56} style={{ marginTop: 8 }} />
                            <Skeleton height={56} style={{ marginTop: 8 }} />
                        </div>
                        <div>
                            <Skeleton height={160} />
                            <Skeleton height={160} style={{ marginTop: 20 }} />
                        </div>
                    </div>
                ) : (
                    <div className={styles.board} ref={boardRef}>
                        <aside className={styles.poolColumn}>
                            <div className={styles.poolSticky}>
                                <div className={styles.poolHeader}>
                                    <h2 className={styles.poolTitle}>
                                        미배정 학생
                                    </h2>
                                    <span className={styles.poolCount}>
                                        {unassignedStudents.length}명
                                    </span>
                                </div>

                                <p className={styles.poolHint}>
                                    학생을 팀으로 끌어다 놓으면 바로 배정돼요.
                                </p>

                                <div className={styles.poolList}>
                                    {unassignedStudents.length ? (
                                        unassignedStudents.map((student) => (
                                            <div
                                                key={student.userId}
                                                className={`${styles.poolItem} ${
                                                    draggingUserId ===
                                                    student.userId
                                                        ? styles.poolItemDragging
                                                        : ""
                                                }`}
                                                draggable
                                                onDragStart={(event) => {
                                                    event.dataTransfer.setData(
                                                        "text/plain",
                                                        student.userId
                                                    );
                                                    event.dataTransfer.effectAllowed =
                                                        "move";
                                                    setDraggingUserId(
                                                        student.userId
                                                    );
                                                }}
                                                onDragEnd={() => {
                                                    setDraggingUserId(null);
                                                    setDragOverTeamId(null);
                                                }}
                                            >
                                                <span
                                                    className={styles.poolName}
                                                >
                                                    {student.name}
                                                </span>
                                                <span
                                                    className={styles.poolMeta}
                                                >
                                                    {
                                                        getStudentNumberInfo(
                                                            student.userId
                                                        ).number
                                                    }{" "}
                                                    ·{" "}
                                                    {roleLabels[
                                                        student.studentRole
                                                    ] || student.studentRole}
                                                </span>
                                            </div>
                                        ))
                                    ) : (
                                        <p className={styles.poolEmpty}>
                                            모든 학생이 배정됐어요.
                                        </p>
                                    )}
                                </div>
                            </div>
                        </aside>

                        <section className={styles.teamColumn}>
                            {teams.length === 0 ? (
                                <EmptyState
                                    title="아직 만든 팀이 없어요"
                                    description="위의 «+ 팀 추가»로 시작하세요."
                                />
                            ) : (
                                teams.map((team, index) => {
                                    const members = team.memberUserIds.map(
                                        (userId) => findStudent(userId)
                                    );
                                    const isFull =
                                        team.memberUserIds.length >=
                                        MAX_TEAM_SIZE;
                                    const searchResults = getSearchResults(
                                        team.id
                                    );

                                    return (
                                        <div
                                            key={team.id}
                                            data-reveal
                                            className={`${styles.team} ${
                                                dragOverTeamId === team.id
                                                    ? isFull
                                                        ? styles.teamDropBlocked
                                                        : styles.teamDropActive
                                                    : ""
                                            }`}
                                            onDragOver={(event) => {
                                                event.preventDefault();
                                                event.dataTransfer.dropEffect =
                                                    isFull ? "none" : "move";
                                                setDragOverTeamId(team.id);
                                            }}
                                            onDragLeave={(event) => {
                                                if (
                                                    event.currentTarget.contains(
                                                        event.relatedTarget
                                                    )
                                                ) {
                                                    return;
                                                }

                                                setDragOverTeamId((current) =>
                                                    current === team.id
                                                        ? null
                                                        : current
                                                );
                                            }}
                                            onDrop={(event) =>
                                                handleDropOnTeam(event, team)
                                            }
                                        >
                                            <div className={styles.teamHead}>
                                                <h3 className={styles.teamName}>
                                                    {index + 1}팀
                                                    <span
                                                        className={
                                                            isFull
                                                                ? styles.capacityFull
                                                                : styles.capacity
                                                        }
                                                    >
                                                        {
                                                            team.memberUserIds
                                                                .length
                                                        }
                                                        /{MAX_TEAM_SIZE}명
                                                        {members.length > 0 &&
                                                            ` · ${getRoleSummary(members)}`}
                                                    </span>
                                                </h3>
                                                <button
                                                    type="button"
                                                    className={
                                                        styles.removeTeamButton
                                                    }
                                                    onClick={() =>
                                                        handleRemoveTeam(
                                                            team.id
                                                        )
                                                    }
                                                >
                                                    팀 삭제
                                                </button>
                                            </div>

                                            {members.length > 0 && (
                                                <div className={styles.roleBar}>
                                                    {getRoleBarSegments(
                                                        members
                                                    ).map((segment) => (
                                                        <span
                                                            key={segment.role}
                                                            style={{
                                                                width: `${segment.percent}%`,
                                                            }}
                                                        />
                                                    ))}
                                                </div>
                                            )}

                                            {isFull ? (
                                                <p className={styles.fullNote}>
                                                    정원 {MAX_TEAM_SIZE}명이
                                                    모두 찼어요.
                                                </p>
                                            ) : (
                                                <div
                                                    className={
                                                        styles.searchWrap
                                                    }
                                                >
                                                    <input
                                                        type="text"
                                                        className={
                                                            styles.search
                                                        }
                                                        placeholder="이름, 학번, 역할로 검색해서 추가"
                                                        autoComplete="off"
                                                        value={
                                                            searchByTeamId[
                                                                team.id
                                                            ] || ""
                                                        }
                                                        onChange={(event) =>
                                                            handleSearchChange(
                                                                team.id,
                                                                event.target
                                                                    .value
                                                            )
                                                        }
                                                    />
                                                    {openResultsTeamId ===
                                                        team.id && (
                                                        <div
                                                            className={
                                                                styles.searchResults
                                                            }
                                                        >
                                                            {searchResults.length ? (
                                                                searchResults.map(
                                                                    (
                                                                        student
                                                                    ) => (
                                                                        <button
                                                                            key={
                                                                                student.userId
                                                                            }
                                                                            type="button"
                                                                            className={
                                                                                styles.searchResult
                                                                            }
                                                                            onClick={() =>
                                                                                handleAddMember(
                                                                                    team.id,
                                                                                    student.userId
                                                                                )
                                                                            }
                                                                        >
                                                                            <span>
                                                                                {
                                                                                    student.name
                                                                                }
                                                                            </span>
                                                                            <span
                                                                                className={
                                                                                    styles.searchResultRole
                                                                                }
                                                                            >
                                                                                {roleLabels[
                                                                                    student
                                                                                        .studentRole
                                                                                ] ||
                                                                                    student.studentRole}
                                                                            </span>
                                                                        </button>
                                                                    )
                                                                )
                                                            ) : (
                                                                <p
                                                                    className={
                                                                        styles.searchEmpty
                                                                    }
                                                                >
                                                                    일치하는
                                                                    학생이
                                                                    없어요.
                                                                </p>
                                                            )}
                                                        </div>
                                                    )}
                                                </div>
                                            )}

                                            <div className={styles.memberList}>
                                                {members.length ? (
                                                    members.map((member) => (
                                                        <div
                                                            key={member.userId}
                                                            className={
                                                                styles.memberRow
                                                            }
                                                        >
                                                            <span
                                                                className={
                                                                    styles.memberMain
                                                                }
                                                            >
                                                                <span
                                                                    className={
                                                                        styles.memberName
                                                                    }
                                                                >
                                                                    {
                                                                        member.name
                                                                    }
                                                                </span>
                                                                {team.leaderUserId ===
                                                                    member.userId && (
                                                                    <span
                                                                        className={
                                                                            styles.leaderBadge
                                                                        }
                                                                    >
                                                                        팀장
                                                                    </span>
                                                                )}
                                                                <span
                                                                    className={
                                                                        styles.memberRole
                                                                    }
                                                                >
                                                                    {roleLabels[
                                                                        member
                                                                            .studentRole
                                                                    ] ||
                                                                        member.studentRole}
                                                                </span>
                                                            </span>

                                                            <span
                                                                className={
                                                                    styles.memberActions
                                                                }
                                                            >
                                                                {team.leaderUserId !==
                                                                    member.userId && (
                                                                    <button
                                                                        type="button"
                                                                        className={
                                                                            styles.textButton
                                                                        }
                                                                        onClick={() =>
                                                                            handleSetLeader(
                                                                                team.id,
                                                                                member.userId
                                                                            )
                                                                        }
                                                                    >
                                                                        팀장
                                                                        지정
                                                                    </button>
                                                                )}
                                                                <button
                                                                    type="button"
                                                                    className={
                                                                        styles.dangerTextButton
                                                                    }
                                                                    onClick={() =>
                                                                        handleRemoveMember(
                                                                            team.id,
                                                                            member.userId
                                                                        )
                                                                    }
                                                                >
                                                                    삭제
                                                                </button>
                                                            </span>
                                                        </div>
                                                    ))
                                                ) : (
                                                    <p
                                                        className={
                                                            styles.memberEmpty
                                                        }
                                                    >
                                                        아직 배정된 학생이
                                                        없어요.
                                                    </p>
                                                )}
                                            </div>
                                        </div>
                                    );
                                })
                            )}
                        </section>
                    </div>
                )}
            </main>

            {isConfirmModalOpen && (
                <ModalOverlay
                    onClose={() => setIsConfirmModalOpen(false)}
                    overlayClassName={styles.modalOverlay}
                    modalClassName={styles.confirmModal}
                >
                    <>
                        <h2 className={styles.confirmTitle}>
                            배정되지 않은 학생이 있어요
                        </h2>
                        <p className={styles.confirmText}>
                            아직 배정되지 않은 학생이{" "}
                            {unassignedStudents.length}명 있어요.
                            <br />
                            이대로 진행할까요?
                        </p>
                        <div className={styles.confirmActions}>
                            <button
                                type="button"
                                className={styles.textButton}
                                onClick={() => setIsConfirmModalOpen(false)}
                            >
                                취소
                            </button>
                            <button
                                type="button"
                                className={styles.primaryButton}
                                onClick={() => {
                                    setIsConfirmModalOpen(false);
                                    submitTeams();
                                }}
                            >
                                이대로 진행하기
                            </button>
                        </div>
                    </>
                </ModalOverlay>
            )}
        </div>
    );
};

export default AdminTeamManualCreate;
