// Design/student-manage.html 반영. 카드 격자 → 세로 리스트.
import { useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";
import AdminStudentDetailModal from "../../../components/admin/student/AdminStudentDetailModal";
import Header from "../../../components/common/header/Header";
import Skeleton from "../../../components/common/skeleton/Skeleton";
import EmptyState from "../../../components/common/empty/EmptyState";
import useInView from "../../../hooks/useInView";
import {
    requestAdminStudentDetail,
    requestAdminStudentList,
} from "../../../api/studentApi";
import { levelLabels, roleLabels, summaryFilters } from "../../../constants/student";
import {
    getStudentNumberInfo,
    getStudentSearchText,
    normalizeSearchText,
} from "../../../utils/student";
import { getApiErrorMessage } from "../../../utils/apiError";
import styles from "./AdminStudentManage.module.css";

const ListSkeleton = () => (
    <div className={styles.list}>
        {[0, 1, 2].map((index) => (
            <div key={index} className={styles.skeletonRow}>
                <Skeleton width={160} height={24} />
                <Skeleton width={288} height={20} style={{ marginTop: 12 }} />
            </div>
        ))}
    </div>
);

const AdminStudentManage = () => {
    const [searchParams, setSearchParams] = useSearchParams();
    const [students, setStudents] = useState([]);
    const [summaryCounts, setSummaryCounts] = useState({
        all: 0,
        grade2: 0,
        grade3: 0,
        surveyPending: 0,
    });
    const [searchKeyword, setSearchKeyword] = useState("");
    const [activeSummaryFilter, setActiveSummaryFilter] = useState("all");
    const [selectedStudent, setSelectedStudent] = useState(null);
    const [error, setError] = useState("");
    const [modalError, setModalError] = useState("");
    const [isLoading, setIsLoading] = useState(true);
    const targetUserId = searchParams.get("userId");
    const openedQueryUserIdRef = useRef(null);

    useEffect(() => {
        const getStudents = async () => {
            try {
                setIsLoading(true);
                const data = await requestAdminStudentList();
                setStudents(Array.isArray(data.students) ? data.students : []);
                setSummaryCounts({
                    all: data.totalStudentCount || 0,
                    grade2: data.grade2StudentCount || 0,
                    grade3: data.grade3StudentCount || 0,
                    surveyPending: data.surveyNotSubmittedCount || 0,
                });
            } catch (e) {
                setError(
                    getApiErrorMessage(e, "학생 정보를 불러오지 못했습니다.")
                );
            } finally {
                setIsLoading(false);
            }
        };

        getStudents();
    }, []);

    useEffect(() => {
        if (isLoading || !targetUserId || selectedStudent) return;
        if (openedQueryUserIdRef.current === targetUserId) return;

        const targetStudent = students.find(
            (student) => student.userId === targetUserId
        );

        if (!targetStudent) return;

        openedQueryUserIdRef.current = targetUserId;
        handleOpenStudent(targetStudent);
    }, [isLoading, selectedStudent, students, targetUserId]);

    useEffect(() => {
        if (targetUserId) return;

        openedQueryUserIdRef.current = null;
    }, [targetUserId]);

    const filteredStudents = useMemo(() => {
        return students.filter((student) => {
            const keyword = normalizeSearchText(searchKeyword);
            const studentSearchText = getStudentSearchText(student);
            const matchesKeyword =
                !keyword || studentSearchText.includes(keyword);
            const matchesSummary =
                activeSummaryFilter === "all" ||
                (activeSummaryFilter === "grade2" &&
                    student.grade === "GRADE_2") ||
                (activeSummaryFilter === "grade3" &&
                    student.grade === "GRADE_3") ||
                (activeSummaryFilter === "surveyPending" &&
                    !student.surveyCompleted);

            return matchesKeyword && matchesSummary;
        });
    }, [activeSummaryFilter, searchKeyword, students]);

    // 필터·검색이 바뀔 때마다 진입 모션을 다시 재생
    const listRef = useInView({
        replayKey: `${isLoading}-${activeSummaryFilter}-${searchKeyword}`,
    });

    const handleOpenStudent = async (student) => {
        if (!student.surveyCompleted) {
            setSelectedStudent(student);
            return;
        }

        try {
            setModalError("");
            const detail = await requestAdminStudentDetail(student.userId);
            setSelectedStudent({
                ...student,
                ...detail,
                surveyCompleted: student.surveyCompleted,
            });
        } catch (e) {
            setSelectedStudent(student);
            setModalError(
                getApiErrorMessage(e, "학생 상세 정보를 불러오지 못했습니다.")
            );
        }
    };

    const handleCloseStudentModal = () => {
        if (targetUserId) {
            const nextSearchParams = new URLSearchParams(searchParams);
            nextSearchParams.delete("userId");
            setSearchParams(nextSearchParams, { replace: true });
        }

        setSelectedStudent(null);
    };

    const resetFilters = () => {
        setSearchKeyword("");
        setActiveSummaryFilter("all");
    };

    return (
        <div className={styles.page}>
            <Header />

            <main className={styles.body}>
                <section className={styles.pageHead}>
                    <div>
                        <p className={styles.eyebrow}>학생 관리</p>
                        <h1 className={styles.headline}>
                            학생별 설문 결과와
                            <br />
                            성향을 확인해요
                        </h1>
                        <p className={styles.subline}>
                            학생을 누르면 기술 스택, 실행·협업 성향 점수, AI 분석
                            결과를 함께 볼 수 있어요.
                        </p>
                    </div>

                    {!isLoading && summaryCounts.all > 0 && (
                        <div className={styles.statusPanel}>
                            <p className={styles.statusLabel}>설문 미제출</p>
                            <p className={styles.statusValue}>
                                {summaryCounts.surveyPending}{" "}
                                <span>/ {summaryCounts.all}명</span>
                            </p>
                        </div>
                    )}
                </section>

                <div className={styles.controls}>
                    <div className={styles.segments}>
                        {summaryFilters.map((filter) => (
                            <button
                                key={filter.key}
                                type="button"
                                className={`${styles.segment} ${
                                    activeSummaryFilter === filter.key
                                        ? styles.segmentOn
                                        : ""
                                }`}
                                onClick={() =>
                                    setActiveSummaryFilter(filter.key)
                                }
                                aria-pressed={activeSummaryFilter === filter.key}
                            >
                                {filter.label}
                                <span
                                    className={`${styles.segmentCount} ${
                                        filter.key === "surveyPending"
                                            ? styles.segmentCountDanger
                                            : ""
                                    }`}
                                >
                                    {summaryCounts[filter.key]}
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
                            value={searchKeyword}
                            placeholder="이름, 학번, 희망 직군 검색"
                            onChange={(event) =>
                                setSearchKeyword(event.target.value)
                            }
                        />
                    </div>
                </div>

                {isLoading ? (
                    <ListSkeleton />
                ) : error ? (
                    <EmptyState
                        variant="error"
                        title="학생 정보를 불러오지 못했어요"
                        description={error}
                    />
                ) : filteredStudents.length === 0 ? (
                    <EmptyState
                        title="조건에 맞는 학생이 없어요"
                        description="검색어를 지우거나 다른 필터를 골라보세요."
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
                        {filteredStudents.map((student) => {
                            const numberInfo = getStudentNumberInfo(
                                student.userId
                            );
                            const teamName =
                                student.projectTeamName ||
                                student.teamName ||
                                "미배정";
                            const summaryParts = [
                                roleLabels[student.studentRole] ||
                                    student.studentRole,
                                teamName,
                                student.leaderRole === "LEADER" ? "팀장" : null,
                                levelLabels[student.studentLevel]
                                    ? `실력 ${levelLabels[student.studentLevel]}`
                                    : null,
                            ].filter(Boolean);

                            return (
                                <button
                                    key={student.userId}
                                    type="button"
                                    data-reveal
                                    className={styles.row}
                                    onClick={() => handleOpenStudent(student)}
                                >
                                    <span className={styles.rowMain}>
                                        <span className={styles.rowTitleLine}>
                                            <span className={styles.rowName}>
                                                {student.name}
                                            </span>
                                            <span className={styles.rowClass}>
                                                {numberInfo.classText}
                                            </span>
                                            {!student.surveyCompleted && (
                                                <span
                                                    className={
                                                        styles.pendingBadge
                                                    }
                                                >
                                                    설문 미제출
                                                </span>
                                            )}
                                        </span>

                                        {student.surveyCompleted ? (
                                            <>
                                                <span
                                                    className={styles.rowSummary}
                                                >
                                                    {summaryParts.join(" · ")}
                                                </span>
                                                {student.skill?.length > 0 && (
                                                    <span
                                                        className={
                                                            styles.rowSkills
                                                        }
                                                    >
                                                        {student.skill.join(
                                                            " · "
                                                        )}
                                                    </span>
                                                )}
                                            </>
                                        ) : (
                                            <span className={styles.rowSkills}>
                                                설문을 제출하면 성향 분석과 기술
                                                스택을 볼 수 있어요.
                                            </span>
                                        )}
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

            {selectedStudent && (
                <AdminStudentDetailModal
                    student={selectedStudent}
                    students={students}
                    modalError={modalError}
                    onOpenStudent={handleOpenStudent}
                    onClose={handleCloseStudentModal}
                />
            )}
        </div>
    );
};

export default AdminStudentManage;
