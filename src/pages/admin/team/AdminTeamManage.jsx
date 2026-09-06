// Design/team-manage.html 반영. 카드 격자 → 세로 리스트.
import { useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";
import Header from "../../../components/common/header/Header";
import AdminTeamDetailModal from "../../../components/admin/team/AdminTeamDetailModal";
import Skeleton from "../../../components/common/skeleton/Skeleton";
import EmptyState from "../../../components/common/empty/EmptyState";
import useInView from "../../../hooks/useInView";
import {
    requestAdminTeamDetail,
    requestAdminTeamList,
} from "../../../api/teamApi";
import { gradeLabels } from "../../../constants/team";
import {
    getRoleCountSummary,
    getTeamDisplayName,
    hasProjectInfo,
} from "../../../utils/teamRecommendation";
import styles from "./AdminTeamManage.module.css";

const GRADE_FILTERS = [
    { key: "all", label: "전체 팀" },
    { key: "GRADE_2", label: "2학년" },
    { key: "GRADE_3", label: "3학년" },
];

const ListSkeleton = () => (
    <div className={styles.list}>
        {[0, 1, 2].map((index) => (
            <div key={index} className={styles.skeletonRow}>
                <Skeleton width={224} height={24} />
                <Skeleton width={320} height={20} style={{ marginTop: 12 }} />
            </div>
        ))}
    </div>
);

const AdminTeamManage = () => {
    const [teams, setTeams] = useState([]);
    const [selectedGrade, setSelectedGrade] = useState("all");
    const [searchText, setSearchText] = useState("");
    const [selectedTeam, setSelectedTeam] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isDetailLoading, setIsDetailLoading] = useState(false);
    const [error, setError] = useState("");
    const [modalError, setModalError] = useState("");
    const [searchParams] = useSearchParams();
    const targetTeamName = searchParams.get("teamName");
    const openedQueryTeamNameRef = useRef(null);

    useEffect(() => {
        const getTeams = async () => {
            try {
                setIsLoading(true);
                const data = await requestAdminTeamList();
                setTeams(Array.isArray(data) ? data : []);
            } catch {
                setError("팀 목록을 불러오지 못했습니다.");
            } finally {
                setIsLoading(false);
            }
        };

        getTeams();
    }, []);

    const counts = useMemo(
        () => ({
            all: teams.length,
            GRADE_2: teams.filter((team) => team.grade === "GRADE_2").length,
            GRADE_3: teams.filter((team) => team.grade === "GRADE_3").length,
        }),
        [teams]
    );

    const filteredTeams = useMemo(() => {
        const keyword = searchText.trim().toLowerCase();

        return teams.filter((team) => {
            const isSameGrade =
                selectedGrade === "all" || team.grade === selectedGrade;
            const memberNames = (team.members || [])
                .map((member) => member.name)
                .join(" ")
                .toLowerCase();
            const searchableText = `${team.teamName || ""} ${
                team.serviceName || ""
            } ${memberNames}`.toLowerCase();

            return (
                isSameGrade && (!keyword || searchableText.includes(keyword))
            );
        });
    }, [searchText, selectedGrade, teams]);

    // 필터·검색이 바뀔 때마다 리스트 진입 모션을 다시 재생한다
    const listRef = useInView({
        replayKey: `${isLoading}-${selectedGrade}-${searchText}`,
    });

    const planWrittenCount = useMemo(
        () => teams.filter(hasProjectInfo).length,
        [teams]
    );

    const handleOpenTeam = async (teamId) => {
        try {
            setSelectedTeam(null);
            setModalError("");
            setIsDetailLoading(true);

            const data = await requestAdminTeamDetail(teamId);
            setSelectedTeam(data);
        } catch {
            setModalError("팀 상세 정보를 불러오지 못했습니다.");
        } finally {
            setIsDetailLoading(false);
        }
    };

    useEffect(() => {
        if (isLoading || !targetTeamName) return;
        if (openedQueryTeamNameRef.current === targetTeamName) return;

        const targetTeam = teams.find(
            (team) =>
                (team.projectTeamName || team.teamName) === targetTeamName ||
                team.teamName === targetTeamName
        );

        if (!targetTeam) return;

        openedQueryTeamNameRef.current = targetTeamName;
        handleOpenTeam(targetTeam.teamId);
    }, [isLoading, targetTeamName, teams]);

    const handleCloseModal = () => {
        setSelectedTeam(null);
        setModalError("");
        setIsDetailLoading(false);
    };

    const resetFilters = () => {
        setSearchText("");
        setSelectedGrade("all");
    };

    return (
        <div className={styles.page}>
            <Header />

            <main className={styles.body}>
                <section className={styles.pageHead}>
                    <div>
                        <p className={styles.eyebrow}>팀 관리</p>
                        <h1 className={styles.headline}>
                            확정된 팀을
                            <br />한눈에 확인해요
                        </h1>
                        <p className={styles.subline}>
                            팀을 누르면 프로젝트 기획서, 팀원 구성, AI 팀 분석을
                            함께 볼 수 있어요.
                        </p>
                    </div>

                    {!isLoading && teams.length > 0 && (
                        <div className={styles.statusPanel}>
                            <p className={styles.statusLabel}>
                                기획서 작성 완료
                            </p>
                            <p className={styles.statusValue}>
                                {planWrittenCount}{" "}
                                <span>/ {teams.length}팀</span>
                            </p>
                        </div>
                    )}
                </section>

                <div className={styles.controls}>
                    <div className={styles.segments}>
                        {GRADE_FILTERS.map((filter) => (
                            <button
                                key={filter.key}
                                type="button"
                                className={`${styles.segment} ${
                                    selectedGrade === filter.key
                                        ? styles.segmentOn
                                        : ""
                                }`}
                                onClick={() => setSelectedGrade(filter.key)}
                                aria-pressed={selectedGrade === filter.key}
                            >
                                {filter.label}
                                <span className={styles.segmentCount}>
                                    {counts[filter.key]}
                                </span>
                            </button>
                        ))}
                    </div>

                    <div className={styles.searchBox}>
                        <svg
                            className={styles.searchIcon}
                            width="18"
                            height="18"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="1.9"
                            strokeLinecap="round"
                            aria-hidden="true"
                        >
                            <circle cx="11" cy="11" r="7" />
                            <path d="m20 20-3.5-3.5" />
                        </svg>
                        <input
                            type="text"
                            className={styles.search}
                            value={searchText}
                            placeholder="팀명 또는 학생 이름 검색"
                            onChange={(event) =>
                                setSearchText(event.target.value)
                            }
                        />
                    </div>
                </div>

                {isLoading ? (
                    <ListSkeleton />
                ) : error ? (
                    <EmptyState
                        variant="error"
                        title="팀 목록을 불러오지 못했어요"
                        description={error}
                    />
                ) : filteredTeams.length === 0 ? (
                    <EmptyState
                        title="조건에 맞는 팀이 없어요"
                        description="검색어를 지우거나 다른 학년을 골라보세요."
                        action={
                            <button
                                type="button"
                                className={styles.resetButton}
                                onClick={resetFilters}
                            >
                                필터 초기화
                            </button>
                        }
                    />
                ) : (
                    <div className={styles.list} ref={listRef}>
                        {filteredTeams.map((team) => {
                            const projectWritten = hasProjectInfo(team);
                            const memberCount = team.members?.length ?? 0;

                            return (
                                <button
                                    key={team.teamId}
                                    type="button"
                                    data-reveal
                                    className={styles.row}
                                    onClick={() => handleOpenTeam(team.teamId)}
                                >
                                    <span className={styles.rowMain}>
                                        <span className={styles.rowTitleLine}>
                                            <span className={styles.rowTitle}>
                                                {getTeamDisplayName(
                                                    team,
                                                    projectWritten
                                                )}
                                            </span>
                                            <span
                                                className={styles.gradeBadge}
                                            >
                                                {gradeLabels[team.grade] ||
                                                    team.grade}
                                            </span>
                                            <span
                                                className={
                                                    projectWritten
                                                        ? styles.planDone
                                                        : styles.planPending
                                                }
                                            >
                                                {projectWritten
                                                    ? "기획서 작성 완료"
                                                    : "기획서 작성 전"}
                                            </span>
                                        </span>
                                        <span className={styles.rowRoles}>
                                            {getRoleCountSummary(
                                                team.roleCount
                                            )}
                                        </span>
                                        <span className={styles.rowMeta}>
                                            {projectWritten
                                                ? `${team.teamName} · 팀원 ${memberCount}명`
                                                : `팀원 ${memberCount}명`}
                                        </span>
                                    </span>

                                    <svg
                                        className={styles.chevron}
                                        width="20"
                                        height="20"
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
                                </button>
                            );
                        })}
                    </div>
                )}
            </main>

            {(selectedTeam || isDetailLoading || modalError) && (
                <AdminTeamDetailModal
                    team={selectedTeam}
                    loading={isDetailLoading}
                    error={modalError}
                    onClose={handleCloseModal}
                />
            )}
        </div>
    );
};

export default AdminTeamManage;
