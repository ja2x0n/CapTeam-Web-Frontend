import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import Header from "../../../components/common/header/Header";
import UserLogForm from "../../../components/user/log/UserLogForm";
import { requestMyTeam } from "../../../api/teamApi";
import {
    requestCreateUserLog,
    requestUpdateUserLog,
    requestUserLogDetail,
    requestUserLogList,
} from "../../../api/logApi";
import {
    formatCountdownTime,
    getCapstoneLogRemainingMs,
    getCapstoneLogUnavailableText,
    isCapstoneLogTime,
} from "../../../utils/capstoneLogTime";
import Skeleton from "../../../components/common/skeleton/Skeleton";
import useInView from "../../../hooks/useInView";
import { getFilledFieldCount, getLogFields } from "../../../utils/log";
import { getApiErrorMessage } from "../../../utils/apiError";
import styles from "./UserLogWrite.module.css";

const initialFormData = {
    activityContent: "",
    todayActivityContent: "",
    nextPlanContent: "",
    reflectionContent: "",
};

const DAY_LABELS = ["일", "월", "화", "수", "목", "금", "토"];

const getTodayText = () => {
    const today = new Date();

    return `${today.getMonth() + 1}월 ${today.getDate()}일(${
        DAY_LABELS[today.getDay()]
    })`;
};
const getTodayApiDate = () => {
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, "0");
    const date = String(today.getDate()).padStart(2, "0");

    return `${year}-${month}-${date}`;
};

const UserLogWrite = () => {
    const navigate = useNavigate();
    const [myTeam, setMyTeam] = useState(null);
    const [journalId, setJournalId] = useState(null);
    const [isEditMode, setIsEditMode] = useState(false);
    const [isCompleted, setIsCompleted] = useState(false);
    const [formData, setFormData] = useState(initialFormData);
    const [error, setError] = useState("");
    const [successMessage, setSuccessMessage] = useState("");
    const [isLoadingTeam, setIsLoadingTeam] = useState(true);
    const [isLoadingJournal, setIsLoadingJournal] = useState(true);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [currentTime, setCurrentTime] = useState(new Date());

    useEffect(() => {
        const getMyTeam = async () => {
            try {
                const data = await requestMyTeam();
                setMyTeam(data);

                if (!data?.myMember?.userId) {
                    setIsLoadingJournal(false);
                }
            } catch {
                setError("팀 정보를 불러오지 못했습니다.");
                setIsLoadingJournal(false);
            } finally {
                setIsLoadingTeam(false);
            }
        };

        getMyTeam();
    }, []);

    useEffect(() => {
        const timerId = window.setInterval(() => {
            setCurrentTime(new Date());
        }, 1000);

        return () => window.clearInterval(timerId);
    }, []);

    const isInitialLoading = isLoadingTeam || isLoadingJournal;
    const teamName = myTeam?.project?.teamName || myTeam?.teamName || "";
    const isLeader = myTeam?.myMember?.leaderRole === "LEADER";
    const canWriteLog = isCapstoneLogTime(currentTime);
    const logUnavailableText = getCapstoneLogUnavailableText(currentTime);
    const fields = getLogFields(isLeader);
    const filledCount = getFilledFieldCount(formData, fields);
    const progressPercent = fields.length
        ? Math.round((filledCount / fields.length) * 100)
        : 0;

    const handleFieldChange = (fieldName, value) => {
        setSuccessMessage("");
        setFormData((prevFormData) => ({
            ...prevFormData,
            [fieldName]: value,
        }));
    };
    useEffect(() => {
        const getTodayJournal = async () => {
            try {
                const journals = await requestUserLogList();
                const todayApiDate = getTodayApiDate();

                const todayJournal = journals.find(
                    (journal) => journal.date === todayApiDate
                );

                if (!todayJournal) {
                    return;
                }

                const detail = await requestUserLogDetail(
                    todayJournal.journalId
                );

                setJournalId(detail.journalId);
                setIsCompleted(detail.status === "COMPLETED");

                const myEntry = detail.entries?.find(
                    (entry) => entry.writerId === myTeam?.myMember?.userId
                );

                if (myEntry) {
                    setIsEditMode(true);
                    setFormData({
                        activityContent: myEntry.activityContent || "",
                        todayActivityContent: detail.todayActivityContent || "",
                        nextPlanContent: myEntry.nextPlanContent || "",
                        reflectionContent: myEntry.reflectionContent || "",
                    });
                }
            } catch {
                setError("오늘 일지 정보를 불러오지 못했습니다.");
            } finally {
                setIsLoadingJournal(false);
            }
        };

        if (myTeam?.myMember?.userId) {
            getTodayJournal();
        }
    }, [myTeam?.myMember?.userId]);

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (!canWriteLog) {
            setError(`현재는 일지 작성 시간이 아닙니다. ${logUnavailableText}`);
            return;
        }

        if (isCompleted) {
            setError("팀원 전체 제출이 완료된 일지는 수정할 수 없습니다.");
            return;
        }

        try {
            setError("");
            setSuccessMessage("");
            setIsSubmitting(true);

            if (isEditMode && journalId) {
                await requestUpdateUserLog(journalId, formData);
            } else {
                const savedLog = await requestCreateUserLog(formData);
                setJournalId(savedLog.journalId);
                setIsEditMode(true);
            }

            setIsEditMode(true);
            navigate("/user/dashboard");
        } catch (e) {
            setError(getApiErrorMessage(e, "일지 저장에 실패했습니다."));
        } finally {
            setIsSubmitting(false);
        }
    };

    const hasTeam = Boolean(myTeam?.myMember?.userId);
    const isAllFilled = filledCount === fields.length;
    const contentRef = useInView({
        replayKey: `${isInitialLoading}-${canWriteLog}-${hasTeam}`,
    });

    return (
        <div className={styles.page}>
            <Header />

            <main className={styles.body} ref={contentRef}>
                <div className={styles.inner}>
                    {isInitialLoading ? (
                        <div className={styles.layout}>
                            <div>
                                <Skeleton width={96} height={20} />
                                <Skeleton
                                    width="66%"
                                    height={40}
                                    style={{ marginTop: 16 }}
                                />
                                <Skeleton
                                    width={160}
                                    height={24}
                                    style={{ marginTop: 40 }}
                                />
                                <Skeleton
                                    height={132}
                                    style={{ marginTop: 12 }}
                                />
                                <Skeleton
                                    width={208}
                                    height={24}
                                    style={{ marginTop: 32 }}
                                />
                                <Skeleton
                                    height={132}
                                    style={{ marginTop: 12 }}
                                />
                            </div>
                            <div>
                                <Skeleton height={160} />
                                <Skeleton height={96} style={{ marginTop: 16 }} />
                            </div>
                        </div>
                    ) : !hasTeam ? (
                        <section className={styles.noticeSection}>
                            <p data-reveal className={styles.eyebrow}>
                                캡스톤 일지
                            </p>
                            <h1 data-reveal className={styles.headline}>
                                팀이 만들어지면
                                <br />
                                일지를 쓸 수 있어요
                            </h1>
                            <p data-reveal className={styles.subline}>
                                관리자가 팀을 생성하면 이 화면에서 매주 캡스톤
                                일지를 작성하게 돼요.
                            </p>
                            <div data-reveal className={styles.noticeActions}>
                                <button
                                    type="button"
                                    className={styles.primaryButton}
                                    onClick={() => navigate("/user/dashboard")}
                                >
                                    홈으로
                                </button>
                            </div>
                        </section>
                    ) : !canWriteLog ? (
                        <section className={styles.noticeSection}>
                            <p data-reveal className={styles.eyebrow}>
                                캡스톤 일지
                            </p>
                            <h1 data-reveal className={styles.headline}>
                                지금은 일지를
                                <br />
                                작성할 시간이 아니에요
                            </h1>
                            <p data-reveal className={styles.subline}>
                                캡스톤 일지는 매주{" "}
                                <b>수요일 15:40 ~ 18:10</b>에만 작성할 수 있어요.
                            </p>
                            <p data-reveal className={styles.noticeDetail}>
                                {logUnavailableText}
                            </p>
                            <div data-reveal className={styles.noticeActions}>
                                <button
                                    type="button"
                                    className={styles.primaryButton}
                                    onClick={() =>
                                        navigate("/user/log/result")
                                    }
                                >
                                    지난 일지 보기
                                </button>
                                <button
                                    type="button"
                                    className={styles.ghostButton}
                                    onClick={() => navigate("/user/dashboard")}
                                >
                                    홈으로
                                </button>
                            </div>
                        </section>
                    ) : (
                        <form className={styles.layout} onSubmit={handleSubmit}>
                            <div className={styles.formColumn}>
                                <p data-reveal className={styles.eyebrow}>
                                    캡스톤 일지 · {getTodayText()}
                                </p>
                                <h1 data-reveal className={styles.formTitle}>
                                    오늘 활동을 기록해주세요
                                </h1>
                                <p data-reveal className={styles.formSub}>
                                    작성한 내용은 팀원 일지와 함께 취합돼 담당
                                    교사에게 전달돼요.
                                </p>

                                <UserLogForm
                                    formData={formData}
                                    isLeader={isLeader}
                                    isCompleted={isCompleted}
                                    onFieldChange={handleFieldChange}
                                />
                            </div>

                            <aside className={styles.rail}>
                                <div className={styles.railInner}>
                                    <p className={styles.railLabel}>
                                        작성 마감까지
                                    </p>
                                    <p className={styles.countdown}>
                                        {formatCountdownTime(
                                            getCapstoneLogRemainingMs(
                                                currentTime
                                            )
                                        )}
                                    </p>
                                    <p className={styles.railNote}>
                                        오늘 18:10에 마감돼요
                                    </p>

                                    <div className={styles.progressBlock}>
                                        <div className={styles.progressHead}>
                                            <span
                                                className={
                                                    styles.progressLabel
                                                }
                                            >
                                                작성 진행률
                                            </span>
                                            <span
                                                className={
                                                    styles.progressValue
                                                }
                                            >
                                                {filledCount} / {fields.length}
                                            </span>
                                        </div>
                                        <div className={styles.progressTrack}>
                                            <div
                                                className={styles.progressFill}
                                                style={{
                                                    width: `${progressPercent}%`,
                                                }}
                                            />
                                        </div>
                                    </div>

                                    <div className={styles.railMeta}>
                                        {teamName && (
                                            <div className={styles.railRow}>
                                                <span>팀</span>
                                                <strong>{teamName}</strong>
                                            </div>
                                        )}
                                        <div className={styles.railRow}>
                                            <span>내 역할</span>
                                            <strong>
                                                {isLeader ? "팀장" : "팀원"}
                                            </strong>
                                        </div>
                                        <div className={styles.railRow}>
                                            <span>작성일</span>
                                            <strong>{getTodayText()}</strong>
                                        </div>
                                    </div>

                                    <button
                                        type="submit"
                                        className={styles.submitButton}
                                        disabled={
                                            isSubmitting ||
                                            isCompleted ||
                                            !isAllFilled
                                        }
                                    >
                                        {isSubmitting
                                            ? "저장 중..."
                                            : isEditMode
                                              ? "수정 완료"
                                              : "작성 완료"}
                                    </button>

                                    {isCompleted ? (
                                        <p className={styles.railError}>
                                            팀원 전체 제출이 완료되어 수정할 수
                                            없어요.
                                        </p>
                                    ) : error ? (
                                        <p className={styles.railError}>
                                            {error}
                                        </p>
                                    ) : successMessage ? (
                                        <p className={styles.railSuccess}>
                                            {successMessage}
                                        </p>
                                    ) : (
                                        <p className={styles.railHint}>
                                            {isAllFilled
                                                ? "제출 전 내용을 한 번만 확인해주세요."
                                                : "모든 항목을 채우면 제출할 수 있어요."}
                                        </p>
                                    )}
                                </div>
                            </aside>
                        </form>
                    )}
                </div>
            </main>
        </div>
    );
};

export default UserLogWrite;
