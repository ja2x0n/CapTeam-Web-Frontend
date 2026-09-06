import { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import {
    requestStartTeamMatchingJob,
    requestTeamMatchingJob,
} from "../../../api/teamApi";
import {
    clearMatchingJobLock,
    getActiveMatchingJobLock,
    setMatchingJobLock,
    gradeLabels,
    MATCHING_POLL_INTERVAL,
    WAITING_JOB_STATUSES,
    wait,
} from "../../../utils/matchingJobLock";
import useInView from "../../../hooks/useInView";
import styles from "./AdminTeamCreateLoading.module.css";

const STEPS = [
    {
        title: "설문 데이터 분석",
        desc: "희망 직군, 기술 스택, 실행 경험을 취합합니다",
    },
    {
        title: "역할 밸런싱",
        desc: "프론트엔드·백엔드·AI·앱 역할이 몰리지 않도록 분산합니다",
    },
    {
        title: "협업 성향 매칭",
        desc: "리더십, 시간 압박 대응, 체력·집중 유지 점수를 반영합니다",
    },
    {
        title: "팀 구성 확정",
        desc: "추천 팀장과 팀 배정 이유를 정리합니다",
    },
];

// AI가 실제 워크플로우 단계에 진입할 때 백엔드에 저장한 0~3 값을 사용한다.
const getActiveStepIndex = (progressStep) =>
    Math.min(STEPS.length - 1, Math.max(0, Number(progressStep) || 0));

const getErrorMessage = (error) => {
    const responseData = error.response?.data;

    if (typeof responseData === "string") {
        return responseData;
    }

    if (typeof responseData?.error === "string") {
        return responseData.error;
    }

    if (typeof responseData?.message === "string") {
        return responseData.message;
    }

    if (error.response?.status === 502) {
        return "AI 서버 또는 백엔드 연결이 불안정해 팀 추천안을 생성하지 못했습니다. 잠시 후 다시 시도해주세요.";
    }

    return "팀 추천안 생성 중 오류가 발생했습니다.";
};

const parsePendingSurveyStudents = (message) => {
    if (typeof message !== "string" || !message.includes("설문 미완료 학생")) {
        return null;
    }

    const studentPattern = /([^,:(]+)\((stu\d{4,})\)/g;
    const students = [];
    let match = studentPattern.exec(message);

    while (match) {
        const [, name, userId] = match;
        const grade = userId[3];
        const classNumber = userId[4];
        const groupKey =
            grade && classNumber
                ? `${grade}학년 ${classNumber}반`
                : "반 정보 없음";

        students.push({
            name: name.trim(),
            userId,
            groupKey,
        });

        match = studentPattern.exec(message);
    }

    if (students.length === 0) {
        return null;
    }

    return students.reduce((groups, student) => {
        const matchedGroup = groups.find(
            (group) => group.groupKey === student.groupKey
        );

        if (matchedGroup) {
            matchedGroup.students.push(student);
            return groups;
        }

        return [
            ...groups,
            {
                groupKey: student.groupKey,
                students: [student],
            },
        ];
    }, []);
};

const AdminTeamCreateLoading = () => {
    const navigate = useNavigate();
    const location = useLocation(); // navigate 안에 state값을 확인할 수 있는 함수
    const storedMatchingJob = getActiveMatchingJobLock();
    const grade = location.state?.grade || storedMatchingJob?.grade; // 만약 state가 넘어왔다면 그레이드를 사용하지만 안 넘어오면 저장된 작업의 학년을 사용
    const regenerationPrompt = location.state?.regenerationPrompt || "";
    const baseVersionId = location.state?.baseVersionId || null;
    const [error, setError] = useState("");
    const [progressStep, setProgressStep] = useState(0);
    const pendingSurveyGroups = parsePendingSurveyStudents(error);
    const hasPartialTeams = (job) =>
        Array.isArray(job?.partialTeams) && job.partialTeams.length > 0;
    const isMatchingInProgress = Boolean(grade) && !error;
    const activeStepIndex = getActiveStepIndex(progressStep);

    useEffect(() => {
        if (!isMatchingInProgress) return;

        const preventUnload = (event) => {
            event.preventDefault();
            event.returnValue = "";
        };

        const preventBack = () => {
            window.history.pushState(null, "", window.location.href);
        };

        window.history.pushState(null, "", window.location.href);
        window.addEventListener("beforeunload", preventUnload);
        window.addEventListener("popstate", preventBack);

        return () => {
            window.removeEventListener("beforeunload", preventUnload);
            window.removeEventListener("popstate", preventBack);
        };
    }, [isMatchingInProgress]);

    useEffect(() => {
        if (!grade) {
            navigate("/admin/team-create", { replace: true });
            return;
        } // 하지만 팀 로딩 페이지 이동시 api 호출되는 불상사 막기 위해 학생 선택을 안 했다면 다시 팀 생성 페이지로 이동

        let ignore = false;
        let visibleProgressStep = 0;

        // 폴링 사이에 AI 단계가 여러 칸 진행됐어도 1→2→3→4를 건너뛰지 않고
        // 화면에 순서대로 보여준 뒤 다음 페이지로 이동한다.
        const advanceProgressStep = async (targetStep) => {
            const normalizedTarget = getActiveStepIndex(targetStep);

            while (!ignore && visibleProgressStep < normalizedTarget) {
                visibleProgressStep += 1;
                setProgressStep(visibleProgressStep);
                await wait(700);
            }
        };

        const createTeamRecommendation = async () => {
            try {
                const activeLock = getActiveMatchingJobLock();
                const shouldStartNewJob = Boolean(regenerationPrompt);
                let currentJob;

                if (!shouldStartNewJob && activeLock?.jobId) {
                    if (activeLock.grade && activeLock.grade !== grade) {
                        const activeGradeLabel =
                            gradeLabels[activeLock.grade] || "선택한 학년";

                        setError(
                            `${activeGradeLabel} 팀 생성 작업이 진행 중입니다. 완료 후 다시 시도해주세요.`
                        );
                        return;
                    }

                    currentJob = await requestTeamMatchingJob(activeLock.jobId);
                } else if (!shouldStartNewJob && activeLock) {
                    setError(
                        "팀 생성 작업을 시작하는 중입니다. 잠시 후 다시 확인해주세요."
                    );
                    return;
                } else {
                    if (shouldStartNewJob) {
                        clearMatchingJobLock();
                    }

                    setMatchingJobLock({
                        grade,
                        status: "STARTING",
                    });

                    currentJob = await requestStartTeamMatchingJob(
                        grade,
                        regenerationPrompt,
                        baseVersionId
                    );
                }

                setMatchingJobLock({
                    jobId: currentJob?.jobId,
                    grade,
                    status: currentJob?.status,
                });
                await advanceProgressStep(currentJob?.progressStep);
                if (ignore) return;

                // 첫 팀 데이터가 실제로 저장된 경우에만 로딩 화면을 벗어나
                // 팀 에딧 화면으로 넘어간다 — 전체 완료를 기다리게 하지 않기 위함(8/2 결정).
                // 나머지 팀은 팀 에딧 화면이 이어서 폴링해 순차적으로 채워 넣는다.
                if (hasPartialTeams(currentJob) && currentJob?.versionId) {
                    clearMatchingJobLock();
                    navigate("/admin/team-edit", {
                        replace: true,
                        state: {
                            grade,
                            jobId: currentJob.jobId,
                            versionId: currentJob.versionId,
                            baseVersionId,
                        },
                    });
                    return;
                }

                while (
                    !ignore &&
                    WAITING_JOB_STATUSES.includes(currentJob?.status)
                ) {
                    await wait(MATCHING_POLL_INTERVAL);
                    if (ignore) return;

                    currentJob = await requestTeamMatchingJob(currentJob.jobId);
                    setMatchingJobLock({
                        jobId: currentJob?.jobId,
                        grade,
                        status: currentJob?.status,
                    });
                    await advanceProgressStep(currentJob?.progressStep);
                    if (ignore) return;

                    if (hasPartialTeams(currentJob) && currentJob?.versionId) {
                        clearMatchingJobLock();
                        navigate("/admin/team-edit", {
                            replace: true,
                            state: {
                                grade,
                                jobId: currentJob.jobId,
                                versionId: currentJob.versionId,
                                baseVersionId,
                            },
                        });
                        return;
                    }
                }

                if (ignore) return;

                if (currentJob?.status === "SUCCEEDED") {
                    clearMatchingJobLock();
                    navigate("/admin/team-edit", {
                        replace: true,
                        state: {
                            grade,
                            jobId: currentJob.jobId,
                            versionId: currentJob.versionId,
                            baseVersionId,
                        },
                    });
                    return;
                }

                clearMatchingJobLock();
                setError(
                    currentJob?.errorMessage ||
                        "팀 추천안 생성 중 오류가 발생했습니다."
                );
            } catch (e) {
                if (ignore) return;

                console.error("팀 추천안 생성 실패:", e);
                clearMatchingJobLock();
                setError(getErrorMessage(e));
            }
        };

        createTeamRecommendation();

        return () => {
            ignore = true;
        };
    }, [grade, navigate, regenerationPrompt, baseVersionId]);

    const contentRef = useInView({
        replayKey: `${Boolean(pendingSurveyGroups)}-${Boolean(error)}`,
    });

    return (
        <div className={styles.page}>
            <main className={styles.body} ref={contentRef}>
                {pendingSurveyGroups ? (
                    <section className={styles.narrow}>
                        <p data-reveal className={styles.errorEyebrow}>
                            설문 미완료
                        </p>
                        <h1 data-reveal className={styles.title}>
                            아직 팀을 만들 수 없어요
                        </h1>
                        <p data-reveal className={styles.sub}>
                            아래 학생들이 설문을 제출하면 다시 시도할 수 있어요.
                        </p>

                        <div className={styles.pendingList}>
                            {pendingSurveyGroups.map((group) => (
                                <div key={group.groupKey}>
                                    <div
                                        data-reveal
                                        className={styles.pendingGroupHead}
                                    >
                                        <strong>{group.groupKey}</strong>
                                        <span>{group.students.length}명</span>
                                    </div>
                                    {group.students.map((student) => (
                                        <div
                                            key={student.userId}
                                            data-reveal
                                            className={styles.pendingRow}
                                        >
                                            <span>{student.name}</span>
                                            <span
                                                className={styles.pendingUserId}
                                            >
                                                {student.userId}
                                            </span>
                                        </div>
                                    ))}
                                </div>
                            ))}
                        </div>

                        <div data-reveal className={styles.actions}>
                            <button
                                type="button"
                                className={styles.primaryButton}
                                onClick={() => navigate("/admin/team-create")}
                            >
                                다시 선택하기
                            </button>
                            <button
                                type="button"
                                className={styles.ghostButton}
                                onClick={() => navigate("/admin/student")}
                            >
                                학생 관리로 가기
                            </button>
                        </div>
                    </section>
                ) : error ? (
                    <section className={styles.narrow}>
                        <p data-reveal className={styles.errorEyebrow}>
                            생성 실패
                        </p>
                        <h1 data-reveal className={styles.title}>
                            팀을 만들지 못했어요
                        </h1>
                        <p data-reveal className={styles.sub}>
                            {error}
                        </p>
                        <div data-reveal className={styles.actions}>
                            <button
                                type="button"
                                className={styles.primaryButton}
                                onClick={() => navigate("/admin/team-create")}
                            >
                                다시 시도하기
                            </button>
                            <button
                                type="button"
                                className={styles.ghostButton}
                                onClick={() => navigate("/admin/dashboard")}
                            >
                                처음으로
                            </button>
                        </div>
                    </section>
                ) : (
                    <section className={styles.running}>
                        <div className={styles.runningMain}>
                            <p data-reveal className={styles.runningEyebrow}>
                                {gradeLabels[grade]} ·{" "}
                                {regenerationPrompt
                                    ? "AI 재생성"
                                    : "AI 자동 배정"}
                            </p>
                            <h1 data-reveal className={styles.title}>
                                팀을 만들고 있어요
                            </h1>
                            <p data-reveal className={styles.sub}>
                                설문 데이터를 분석하는 중이에요. 보통 1~2분 정도
                                걸려요.
                            </p>

                            <div data-reveal className={styles.flowBar} />

                            {regenerationPrompt && (
                                <div data-reveal className={styles.promptBlock}>
                                    <p className={styles.promptLabel}>
                                        적용한 조건
                                    </p>
                                    <p className={styles.promptText}>
                                        {regenerationPrompt}
                                    </p>
                                </div>
                            )}

                            <p data-reveal className={styles.runNote}>
                                창을 닫거나 뒤로 가면 생성이 중단될 수 있어요.
                                <br />
                                첫 팀이 만들어지면 바로 검토 화면으로 넘어가요.
                            </p>
                        </div>

                        <ol className={styles.steps}>
                            {STEPS.map((step, index) => (
                                <li
                                    key={step.title}
                                    className={`${styles.step} ${
                                        index < activeStepIndex
                                            ? styles.stepDone
                                            : index === activeStepIndex
                                              ? styles.stepActive
                                              : ""
                                    }`}
                                >
                                    <span className={styles.stepMark}>
                                        {index < activeStepIndex
                                            ? "✓"
                                            : index + 1}
                                    </span>
                                    <span>
                                        <span className={styles.stepTitle}>
                                            {step.title}
                                        </span>
                                        <span className={styles.stepDesc}>
                                            {step.desc}
                                        </span>
                                    </span>
                                </li>
                            ))}
                        </ol>
                    </section>
                )}
            </main>
        </div>
    );
};

export default AdminTeamCreateLoading;
