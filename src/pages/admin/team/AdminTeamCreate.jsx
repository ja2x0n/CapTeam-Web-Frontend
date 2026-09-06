// Design/team-create.html 반영.
// 흐름: 두 학년 모두 생성 완료 → 이 화면에 머물지 않고 팀 관리로 보낸다.
//       선택 학년만 생성 완료 → 남은 학년으로 넘어가는 안내만 보여준다.
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import Header from "../../../components/common/header/Header";
import Skeleton from "../../../components/common/skeleton/Skeleton";
import EmptyState from "../../../components/common/empty/EmptyState";
import useInView from "../../../hooks/useInView";
import { requestAdminDashboard } from "../../../api/dashboardApi";
import { requestAdminStudentList } from "../../../api/studentApi";
import {
    DEFAULT_TEAM_CREATE_GRADE,
    getAdminTeamCreationStatus,
    isGradeTeamCreated,
} from "../../../utils/teamStatus";
import {
    getActiveMatchingJobLock,
    gradeLabels,
} from "../../../utils/matchingJobLock";
import styles from "./AdminTeamCreate.module.css";

const AI_CRITERIA = [
    {
        index: "01",
        title: "역할 분산",
        body: "희망 직군과 기술 스택을 기준으로 프론트엔드·백엔드·AI·앱 역할이 한 팀에 몰리지 않게 나눠요.",
    },
    {
        index: "02",
        title: "실행력 균형",
        body: "구현 경험과 개발 실행력·문제 해결력 점수를 함께 봐서 프로젝트를 끝까지 끌고 갈 수 있게 맞춰요.",
    },
    {
        index: "03",
        title: "협업 성향 매칭",
        body: "발표·설명, 리더십·정리, 시간 압박 대응, 체력·집중 유지 점수를 반영해 장기 협업 흐름을 고려해요.",
    },
];

const CreateSkeleton = () => (
    <>
        <div className={styles.hero}>
            <div>
                <Skeleton width={96} height={20} />
                <Skeleton width="min(520px, 100%)" height={44} style={{ marginTop: 20 }} />
                <Skeleton width="55%" height={44} style={{ marginTop: 12 }} />
                <Skeleton width="min(460px, 70%)" height={24} style={{ marginTop: 28 }} />
            </div>
            <div className={styles.statusPanel}>
                <Skeleton width={128} height={20} />
                <Skeleton width={176} height={48} style={{ marginTop: 8 }} />
            </div>
        </div>
        <div className={styles.section}>
            <Skeleton width={256} height={28} />
            <Skeleton width={240} height={52} style={{ marginTop: 16 }} />
            <Skeleton width="min(576px, 100%)" height={40} style={{ marginTop: 32 }} />
        </div>
    </>
);

const AdminTeamCreate = () => {
    const navigate = useNavigate();
    const [selectedGrade, setSelectedGrade] = useState(
        DEFAULT_TEAM_CREATE_GRADE
    );
    const [selectedMode, setSelectedMode] = useState("AI_AUTO");
    const [teamStatus, setTeamStatus] = useState({
        grade2TeamCreated: false,
        grade3TeamCreated: false,
        grade2TeamCount: 0,
        grade3TeamCount: 0,
    });
    const [students, setStudents] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState("");
    const [loadError, setLoadError] = useState("");

    const selectedGradeLabel = gradeLabels[selectedGrade];
    const isSelectedGradeCreated = isGradeTeamCreated(
        teamStatus,
        selectedGrade
    );
    const allGradeCreated =
        teamStatus.grade2TeamCreated && teamStatus.grade3TeamCreated;

    // 학년 탭/모드가 바뀔 때마다 다시 스르륵 올라오게
    const contentRef = useInView({
        replayKey: `${isLoading}-${selectedGrade}-${selectedMode}`,
    });

    useEffect(() => {
        const getTeamCreateData = async () => {
            const [dashboardResult, studentResult] = await Promise.allSettled([
                requestAdminDashboard(),
                requestAdminStudentList(),
            ]);

            if (dashboardResult.status === "fulfilled") {
                const dashboard = dashboardResult.value;
                const nextTeamStatus = getAdminTeamCreationStatus(dashboard);
                setTeamStatus({
                    ...nextTeamStatus,
                    grade2TeamCount: dashboard.grade2TeamCount,
                    grade3TeamCount: dashboard.grade3TeamCount,
                });

                // 아직 만들지 않은 학년을 자동으로 골라준다
                if (
                    nextTeamStatus.grade2TeamCreated &&
                    !nextTeamStatus.grade3TeamCreated
                ) {
                    setSelectedGrade("GRADE_3");
                } else if (
                    !nextTeamStatus.grade2TeamCreated &&
                    nextTeamStatus.grade3TeamCreated
                ) {
                    setSelectedGrade("GRADE_2");
                }
            } else {
                setLoadError("팀 생성 상태를 불러오지 못했습니다.");
            }

            if (studentResult.status === "fulfilled") {
                setStudents(
                    Array.isArray(studentResult.value?.students)
                        ? studentResult.value.students
                        : []
                );
            }

            setIsLoading(false);
        };

        getTeamCreateData();
    }, []);

    // 두 학년이 모두 만들어졌으면 이 화면에 머물 이유가 없다
    useEffect(() => {
        if (isLoading || !allGradeCreated) return;

        navigate("/admin/team-manage", { replace: true });
    }, [allGradeCreated, isLoading, navigate]);

    const handleGradeChange = (grade) => {
        setSelectedGrade(grade);
        setError("");
    };

    const handleCreate = () => {
        if (selectedMode === "MANUAL") {
            navigate("/admin/team-manual-create", {
                state: { grade: selectedGrade },
            });
            return;
        }

        const activeLock = getActiveMatchingJobLock();

        if (activeLock) {
            const activeGradeLabel =
                gradeLabels[activeLock.grade] || "선택한 학년";

            setError(
                `${activeGradeLabel} 팀 생성 작업이 진행 중입니다. 완료 후 다시 시도해주세요.`
            );
            return;
        }

        if (isGradeTeamCreated(teamStatus, selectedGrade)) {
            setError("이미 생성이 완료된 학년입니다.");
            return;
        }

        navigate("/admin/team-create/loading", {
            state: { grade: selectedGrade },
        });
    };

    const gradeStudents = students.filter(
        (student) => student.grade === selectedGrade
    );
    const respondedCount = gradeStudents.filter(
        (student) => student.surveyCompleted
    ).length;
    const notRespondedCount = gradeStudents.length - respondedCount;
    const surveyPercent = gradeStudents.length
        ? Math.round((respondedCount / gradeStudents.length) * 100)
        : 0;
    // 전원이 설문을 마쳐야 AI 생성을 시작할 수 있다
    const isAiBlocked = selectedMode === "AI_AUTO" && notRespondedCount > 0;

    const remainingGrade =
        selectedGrade === "GRADE_2" ? "GRADE_3" : "GRADE_2";

    return (
        <div className={styles.page}>
            <Header />

            <main className={styles.body} ref={contentRef}>
                {isLoading || allGradeCreated ? (
                    <CreateSkeleton />
                ) : loadError ? (
                    <EmptyState
                        variant="error"
                        title="팀 생성 상태를 불러오지 못했어요"
                        description={loadError}
                    />
                ) : (
                    <>
                        <section className={styles.hero}>
                            <div>
                                <p data-reveal className={styles.eyebrow}>
                                    팀 관리
                                </p>
                                <h1 data-reveal className={styles.headline}>
                                    설문 데이터로
                                    <br />
                                    학년별 팀을 추천해요
                                </h1>
                                <p data-reveal className={styles.subline}>
                                    희망 직군, 기술 스택, 실행력·협업 성향 점수를
                                    함께 보고 팀을 구성해요.
                                    <br />
                                    만든 뒤에도 팀원 교체와 재생성을 할 수
                                    있어요.
                                </p>
                            </div>

                            {!isSelectedGradeCreated &&
                                gradeStudents.length > 0 && (
                                    <div
                                        data-reveal
                                        className={styles.statusPanel}
                                    >
                                        <p className={styles.statusLabel}>
                                            {selectedGradeLabel} 설문 완료
                                        </p>
                                        <p className={styles.statusValue}>
                                            {respondedCount}{" "}
                                            <span>
                                                / {gradeStudents.length}명
                                            </span>
                                        </p>
                                    </div>
                                )}
                        </section>

                        <div className={styles.section}>
                            <h2 data-reveal className={styles.sectionTitle}>
                                어느 학년의 팀을 만들까요?
                            </h2>
                            <div data-reveal className={styles.segments}>
                                {["GRADE_2", "GRADE_3"].map((grade) => (
                                    <button
                                        key={grade}
                                        type="button"
                                        className={`${styles.segment} ${
                                            selectedGrade === grade
                                                ? styles.segmentOn
                                                : ""
                                        }`}
                                        onClick={() => handleGradeChange(grade)}
                                        aria-pressed={selectedGrade === grade}
                                    >
                                        {gradeLabels[grade]}
                                        <span
                                            className={
                                                isGradeTeamCreated(
                                                    teamStatus,
                                                    grade
                                                )
                                                    ? styles.segmentDone
                                                    : styles.segmentPending
                                            }
                                        >
                                            {isGradeTeamCreated(
                                                teamStatus,
                                                grade
                                            )
                                                ? "생성 완료"
                                                : "생성 전"}
                                        </span>
                                    </button>
                                ))}
                            </div>
                        </div>

                        {isSelectedGradeCreated ? (
                            // 선택 학년은 이미 만들었고, 다른 학년이 남아 있는 상태
                            <div className={styles.section}>
                                <h2
                                    data-reveal
                                    className={styles.sectionTitle}
                                >
                                    {selectedGradeLabel} 팀은 이미 만들었어요
                                </h2>
                                <p data-reveal className={styles.doneSub}>
                                    {gradeLabels[remainingGrade]} 팀이 아직
                                    남았어요.
                                    <br />
                                    남은 학년을 마저 만들면 팀 관리로 넘어갈 수
                                    있어요.
                                </p>
                                <div data-reveal className={styles.actionRow}>
                                    <button
                                        type="button"
                                        className={styles.primaryButton}
                                        onClick={() =>
                                            handleGradeChange(remainingGrade)
                                        }
                                    >
                                        {gradeLabels[remainingGrade]} 팀
                                        만들러 가기
                                    </button>
                                </div>
                                <p data-reveal className={styles.footNote}>
                                    두 학년이 모두 만들어져야 팀 관리로 넘어갈 수
                                    있어요.
                                </p>
                            </div>
                        ) : (
                            <>
                                <div
                                    data-reveal
                                    className={styles.surveyProgress}
                                >
                                    <div className={styles.progressHead}>
                                        <span className={styles.progressLabel}>
                                            설문 응답
                                        </span>
                                        <span className={styles.progressValue}>
                                            {respondedCount} /{" "}
                                            {gradeStudents.length}명 ·{" "}
                                            {surveyPercent}%
                                        </span>
                                    </div>
                                    <div className={styles.progressTrack}>
                                        <div
                                            className={styles.progressFill}
                                            style={{
                                                width: `${surveyPercent}%`,
                                            }}
                                        />
                                    </div>
                                    {notRespondedCount > 0 && (
                                        <p className={styles.progressWarning}>
                                            설문 미완료 학생이{" "}
                                            {notRespondedCount}명 있어요.
                                        </p>
                                    )}
                                </div>

                                <div className={styles.section}>
                                    <h2
                                        data-reveal
                                        className={styles.sectionTitle}
                                    >
                                        어떻게 구성할까요?
                                    </h2>

                                    <div className={styles.modeGrid}>
                                        {[
                                            {
                                                mode: "AI_AUTO",
                                                title: "AI 자동 배정",
                                                desc: "설문 데이터를 기반으로 AI가 팀 구성을 추천해요.",
                                            },
                                            {
                                                mode: "MANUAL",
                                                title: "직접 팀 구성",
                                                desc: "AI 추천 없이 학생 명단에서 직접 팀을 짜요.",
                                            },
                                        ].map((option) => (
                                            <button
                                                key={option.mode}
                                                type="button"
                                                data-reveal
                                                className={`${styles.modeOption} ${
                                                    selectedMode === option.mode
                                                        ? styles.modeOn
                                                        : ""
                                                }`}
                                                onClick={() =>
                                                    setSelectedMode(option.mode)
                                                }
                                                aria-pressed={
                                                    selectedMode === option.mode
                                                }
                                            >
                                                <span
                                                    className={styles.modeDot}
                                                />
                                                <span>
                                                    <span
                                                        className={
                                                            styles.modeTitle
                                                        }
                                                    >
                                                        {option.title}
                                                    </span>
                                                    <span
                                                        className={
                                                            styles.modeDesc
                                                        }
                                                    >
                                                        {option.desc}
                                                    </span>
                                                </span>
                                            </button>
                                        ))}
                                    </div>

                                    {selectedMode === "AI_AUTO" ? (
                                        <div className={styles.criteria}>
                                            <h3
                                                data-reveal
                                                className={styles.criteriaTitle}
                                            >
                                                AI가 보는 기준
                                            </h3>
                                            <div
                                                className={styles.criteriaGrid}
                                            >
                                                {AI_CRITERIA.map(
                                                    (criterion) => (
                                                        <div
                                                            key={
                                                                criterion.index
                                                            }
                                                            data-reveal
                                                        >
                                                            <p
                                                                className={
                                                                    styles.criteriaIndex
                                                                }
                                                            >
                                                                {
                                                                    criterion.index
                                                                }
                                                            </p>
                                                            <h4
                                                                className={
                                                                    styles.criteriaHeading
                                                                }
                                                            >
                                                                {
                                                                    criterion.title
                                                                }
                                                            </h4>
                                                            <p
                                                                className={
                                                                    styles.criteriaBody
                                                                }
                                                            >
                                                                {criterion.body}
                                                            </p>
                                                        </div>
                                                    )
                                                )}
                                            </div>
                                        </div>
                                    ) : (
                                        <p
                                            data-reveal
                                            className={styles.manualNote}
                                        >
                                            다음 화면에서{" "}
                                            <b>미배정 학생 명단</b>을 보며 팀에
                                            직접 추가하고, 팀장을 지정할 수
                                            있어요.
                                            <br />한 팀은 최대 5명이에요.
                                        </p>
                                    )}
                                </div>

                                <div className={styles.section}>
                                    <p className={styles.createNote}>
                                        {selectedMode === "AI_AUTO"
                                            ? "생성에는 약 1~2분이 걸려요."
                                            : "AI 생성 없이 바로 팀 구성 화면으로 이동해요."}
                                    </p>
                                    <button
                                        type="button"
                                        data-reveal
                                        className={styles.primaryButton}
                                        onClick={handleCreate}
                                        disabled={isAiBlocked}
                                    >
                                        {selectedMode === "AI_AUTO"
                                            ? `${selectedGradeLabel} 팀 생성하기`
                                            : `${selectedGradeLabel} 팀 직접 구성하기`}
                                    </button>
                                    {isAiBlocked && (
                                        <p className={styles.blockNote}>
                                            설문 미완료 학생이 있어 AI 생성은
                                            아직 시작할 수 없어요.
                                        </p>
                                    )}
                                    {error && (
                                        <p className={styles.blockNote}>
                                            {error}
                                        </p>
                                    )}
                                </div>
                            </>
                        )}
                    </>
                )}
            </main>
        </div>
    );
};

export default AdminTeamCreate;
