// Design/admin-home.html 반영.
// 팀 생성 전에는 팀·일지·채팅방이 아예 없으므로 관련 숫자와 섹션을 자리째로 만들지 않는다.
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import Header from "../../../components/common/header/Header";
import TeamRequiredModal from "../../../components/common/modal/TeamRequiredModal";
import Skeleton from "../../../components/common/skeleton/Skeleton";
import EmptyState from "../../../components/common/empty/EmptyState";
import useInView from "../../../hooks/useInView";
import { requestAdminDashboard } from "../../../api/dashboardApi";
import { requestAdminStudentList } from "../../../api/studentApi";
import { requestAdminLogList } from "../../../api/logApi";
import {
    requestAdminChannelSummaries,
    requestAdminChatRooms,
} from "../../../api/adminChatApi";
import { requestNoticeList } from "../../../api/noticeApi";
import {
    formatCountdownTime,
    getCapstoneLogRemainingMs,
    isCapstoneLogTime,
} from "../../../utils/capstoneLogTime";
import { formatChatTime } from "../../../utils/chat";
import { formatCreatedAt } from "../../../utils/format";
import { gradeLabels } from "../../../constants/team";
import { getAdminTeamCreationStatus } from "../../../utils/teamStatus";
import { setStoredAdminTeamCreated } from "../../../utils/adminTeamStatusStorage";
import useUnreadChatCount from "../../../hooks/useUnreadChatCount";
import styles from "./AdminDashboard.module.css";

const countSurveyProgress = (students, grade) => {
    const gradeStudents = students.filter((student) => student.grade === grade);

    return {
        responded: gradeStudents.filter((student) => student.surveyCompleted)
            .length,
        total: gradeStudents.length,
    };
};

// 채팅방 목록에서 각 방의 마지막 메시지를 병렬로 가져온다(방 개수가 적어 N+1이어도 무해함).
const fetchRecentMessages = async (rooms) => {
    const previews = await Promise.all(
        rooms.map(async (room) => {
            const firstChannel = room.channels?.[0];
            if (!firstChannel) return null;

            const summaries = await requestAdminChannelSummaries(
                room.id
            ).catch(() => []);
            const lastMessage = summaries?.[0]?.lastMessage;

            if (!lastMessage) return null;

            return {
                teamName: room.teamName,
                timeText: formatChatTime(lastMessage.createdAt),
                preview: `${lastMessage.senderName}: ${
                    lastMessage.message ?? "파일을 보냈습니다."
                }`,
                createdAt: lastMessage.createdAt,
            };
        })
    );

    return previews
        .filter(Boolean)
        .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
        .slice(0, 2);
};

const toPercent = (value, total) => (total ? (value / total) * 100 : 0);

const ChevronIcon = () => (
    <svg
        className={styles.chevron}
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
);

const ProgressBar = ({ label, value, percent }) => (
    <div className={styles.progress}>
        <div className={styles.progressHead}>
            <span className={styles.progressLabel}>{label}</span>
            <span className={styles.progressValue}>{value}</span>
        </div>
        <div className={styles.progressTrack}>
            <div
                className={styles.progressFill}
                style={{ width: `${percent}%` }}
            />
        </div>
    </div>
);

const HomeSkeleton = () => (
    <>
        <div className={styles.hero}>
            <div className={styles.heroMain}>
                <Skeleton width={176} height={20} />
                <Skeleton width="min(520px, 100%)" height={44} style={{ marginTop: 20 }} />
                <Skeleton width="50%" height={44} style={{ marginTop: 12 }} />
                <Skeleton width="min(420px, 66%)" height={24} style={{ marginTop: 28 }} />
                <Skeleton width={176} height={48} style={{ marginTop: 36 }} />
            </div>
            <div className={styles.statusPanel}>
                <Skeleton width={112} height={20} />
                <Skeleton width={192} height={48} style={{ marginTop: 8 }} />
            </div>
        </div>
        <Skeleton height={64} />
        <div className={styles.columns}>
            <div>
                <Skeleton width={160} height={24} />
                <Skeleton height={40} style={{ marginTop: 20 }} />
                <Skeleton height={48} style={{ marginTop: 24 }} />
                <Skeleton height={48} style={{ marginTop: 12 }} />
            </div>
            <div>
                <Skeleton width={80} height={24} />
                <Skeleton height={48} style={{ marginTop: 20 }} />
                <Skeleton height={48} style={{ marginTop: 12 }} />
            </div>
        </div>
    </>
);

const AdminDashboard = () => {
    const [dashboard, setDashboard] = useState({
        teamCreated: false,
        grade2TeamCreated: false,
        grade3TeamCreated: false,
        totalTeamCount: 0,
        grade2TeamCount: 0,
        grade3TeamCount: 0,
        activeChatRoomCount: 0,
        journalNotSubmittedTeamCount: 0,
        totalStudentCount: 0,
        hasUnreadNotice: false,
    });
    const [surveyProgress, setSurveyProgress] = useState({
        grade2: { responded: 0, total: 0 },
        grade3: { responded: 0, total: 0 },
    });
    const [journalStatus, setJournalStatus] = useState({
        submittedTeamCount: 0,
        totalTeamCount: 0,
        notSubmittedTeamNames: [],
    });
    const [recentMessages, setRecentMessages] = useState([]);
    const [notices, setNotices] = useState([]);
    const [sectionErrors, setSectionErrors] = useState({});
    const [isDashboardLoading, setIsDashboardLoading] = useState(true);
    const [currentTime, setCurrentTime] = useState(new Date());
    const [error, setError] = useState("");
    const [teamRequiredModal, setTeamRequiredModal] = useState(null);

    const teamStatus = getAdminTeamCreationStatus(dashboard);
    const isTeamManageAccessible = teamStatus.teamManageAccessible;
    const { unreadChatCount } = useUnreadChatCount({
        enabled: isTeamManageAccessible,
    });

    const revealRef = useInView({ replayKey: isDashboardLoading });

    useEffect(() => {
        const getDashboardData = async () => {
            try {
                const dashboardData = await requestAdminDashboard();
                setDashboard((prevDashboard) => ({
                    ...prevDashboard,
                    ...dashboardData,
                }));
                setStoredAdminTeamCreated(
                    getAdminTeamCreationStatus(dashboardData)
                        .teamManageAccessible
                );
            } catch {
                setError("대시보드 정보를 불러오지 못했습니다.");
            } finally {
                setIsDashboardLoading(false);
            }
        };

        getDashboardData();
    }, []);

    useEffect(() => {
        const getSectionData = async () => {
            const [studentsResult, logsResult, roomsResult, noticesResult] =
                await Promise.allSettled([
                    requestAdminStudentList(),
                    requestAdminLogList(),
                    requestAdminChatRooms(),
                    requestNoticeList(),
                ]);

            const nextSectionErrors = {};

            if (studentsResult.status === "fulfilled") {
                const students = studentsResult.value?.students ?? [];
                setSurveyProgress({
                    grade2: countSurveyProgress(students, "GRADE_2"),
                    grade3: countSurveyProgress(students, "GRADE_3"),
                });
            } else {
                nextSectionErrors.students = "학생 현황을 불러오지 못했습니다.";
            }

            if (logsResult.status === "fulfilled") {
                const logData = logsResult.value;
                const journals = Array.isArray(logData?.journals)
                    ? logData.journals
                    : [];
                setJournalStatus({
                    submittedTeamCount: logData?.submittedCount ?? 0,
                    totalTeamCount: logData?.totalCount ?? 0,
                    notSubmittedTeamNames: journals
                        .filter((journal) => !journal.submitted)
                        .map(
                            (journal) =>
                                `${gradeLabels[journal.grade] ?? ""} ${
                                    journal.teamName
                                }`
                        ),
                });
            } else {
                nextSectionErrors.journal = "일지 제출 현황을 불러오지 못했습니다.";
            }

            if (roomsResult.status === "fulfilled") {
                const rooms = Array.isArray(roomsResult.value)
                    ? roomsResult.value
                    : [];
                setRecentMessages(await fetchRecentMessages(rooms));
            } else {
                nextSectionErrors.chat = "채팅 미리보기를 불러오지 못했습니다.";
            }

            if (noticesResult.status === "fulfilled") {
                setNotices(
                    Array.isArray(noticesResult.value)
                        ? noticesResult.value.slice(0, 3)
                        : []
                );
            } else {
                nextSectionErrors.notices = "공지를 불러오지 못했습니다.";
            }

            setSectionErrors(nextSectionErrors);
        };

        getSectionData();
    }, []);

    useEffect(() => {
        const timerId = setInterval(() => {
            setCurrentTime(new Date());
        }, 1000);

        return () => clearInterval(timerId);
    }, []);

    const nextGrade = !teamStatus.grade2TeamCreated
        ? "GRADE_2"
        : !teamStatus.grade3TeamCreated
          ? "GRADE_3"
          : null;
    const isSetup = Boolean(nextGrade);

    const blockTeamRequired = (event, message) => {
        if (isTeamManageAccessible) return;

        event.preventDefault();
        setTeamRequiredModal({ message });
    };

    const nextGradeSurvey =
        nextGrade === "GRADE_3" ? surveyProgress.grade3 : surveyProgress.grade2;
    const nextGradeSurveyPercent = Math.round(
        toPercent(nextGradeSurvey.responded, nextGradeSurvey.total)
    );

    const totalSurveyResponded =
        surveyProgress.grade2.responded + surveyProgress.grade3.responded;
    const totalSurveyTarget =
        surveyProgress.grade2.total + surveyProgress.grade3.total;

    const isLogTime = isCapstoneLogTime(currentTime);
    const notSubmittedCount = journalStatus.notSubmittedTeamNames.length;
    const countdownText = formatCountdownTime(
        getCapstoneLogRemainingMs(currentTime)
    );

    const hero = isSetup
        ? {
              title: (
                  <>
                      {gradeLabels[nextGrade]} 팀을
                      <br />
                      생성할 차례예요
                  </>
              ),
              sub:
                  nextGradeSurveyPercent === 100
                      ? "설문 응답이 전부 모였어요. 지금 생성하면 AI가 역할·실력 균형을 맞춰 팀을 추천합니다."
                      : `${gradeLabels[nextGrade]} 설문 응답이 ${nextGradeSurveyPercent}% 모였어요. 전체 학생이 설문을 완료해야 팀을 생성할 수 있습니다.`,
              progress: {
                  label: `${gradeLabels[nextGrade]} 설문 완료`,
                  value: `${nextGradeSurvey.responded} / ${nextGradeSurvey.total}명 · ${nextGradeSurveyPercent}%`,
                  percent: nextGradeSurveyPercent,
              },
              ctaText: `${gradeLabels[nextGrade]} 팀 생성하기`,
              ctaTo: "/admin/team-create",
              noteText: "학생 관리",
              noteTo: "/admin/student",
          }
        : isLogTime && notSubmittedCount > 0
          ? {
                title: (
                    <>
                        오늘 {notSubmittedCount}팀이
                        <br />
                        일지를 내지 않았어요
                    </>
                ),
                sub: `마감까지 ${countdownText} 남았어요. 미제출 팀과 제출 현황을 확인해 보세요.`,
                countdownText,
                ctaText: "일지 제출 현황 보기",
                ctaTo: "/admin/log",
                noteText: "팀 관리",
                noteTo: "/admin/team-manage",
            }
          : isLogTime
            ? {
                  title: (
                      <>
                          오늘 모든 팀이
                          <br />
                          일지를 제출했어요
                      </>
                  ),
                  sub: "미제출 팀이 없습니다. 제출된 일지는 캡스톤 일지에서 팀별로 확인할 수 있어요.",
                  countdownText,
                  ctaText: "일지 확인하기",
                  ctaTo: "/admin/log",
                  noteText: "팀 관리",
                  noteTo: "/admin/team-manage",
              }
            : {
                  title: (
                      <>
                          이번 학기 {dashboard.totalTeamCount}팀이
                          <br />
                          운영 중이에요
                      </>
                  ),
                  sub: `2학년 ${dashboard.grade2TeamCount}팀, 3학년 ${dashboard.grade3TeamCount}팀이 확정되어 프로젝트를 진행 중입니다.`,
                  ctaText: "팀 관리 보기",
                  ctaTo: "/admin/team-manage",
                  noteText: "학생 관리",
                  noteTo: "/admin/student",
              };

    return (
        <div className={styles.page}>
            <Header />

            <main className={styles.body} ref={revealRef}>
                {isDashboardLoading ? (
                    <HomeSkeleton />
                ) : error ? (
                    <EmptyState
                        variant="error"
                        title="대시보드를 불러오지 못했어요"
                        description={error}
                    />
                ) : (
                    <>
                        <section className={styles.hero}>
                            <div className={styles.heroMain}>
                                <p data-reveal className={styles.eyebrow}>
                                    캡스톤 관리자
                                </p>
                                <h1 data-reveal className={styles.headline}>
                                    {hero.title}
                                </h1>
                                <p data-reveal className={styles.subline}>
                                    {hero.sub}
                                </p>

                                {hero.progress && (
                                    <div
                                        data-reveal
                                        className={styles.heroProgress}
                                    >
                                        <ProgressBar {...hero.progress} />
                                    </div>
                                )}

                                <div data-reveal className={styles.heroActions}>
                                    {/* 팀 생성 화면으로 가는 CTA는 막으면 안 된다 —
                                        팀이 없어서 여기까지 온 것이기 때문 */}
                                    <Link
                                        to={hero.ctaTo}
                                        className={styles.primaryCta}
                                        onClick={(event) => {
                                            if (isSetup) return;

                                            blockTeamRequired(
                                                event,
                                                "팀 생성이 완료되면 이용할 수 있습니다."
                                            );
                                        }}
                                    >
                                        {hero.ctaText}
                                    </Link>
                                    <Link
                                        to={hero.noteTo}
                                        className={styles.secondaryCta}
                                    >
                                        {hero.noteText}
                                    </Link>
                                </div>
                            </div>

                            {hero.countdownText && (
                                <div data-reveal className={styles.statusPanel}>
                                    <p className={styles.statusLabel}>
                                        오늘 일지 마감까지
                                    </p>
                                    <p className={styles.countdown}>
                                        {hero.countdownText}
                                    </p>
                                </div>
                            )}
                        </section>

                        {/* 핵심 숫자 — 박스 없이 구분선으로만 */}
                        <div data-reveal className={styles.statRow}>
                            <div className={styles.stat}>
                                <p className={styles.statLabel}>전체 학생</p>
                                <p className={styles.statValue}>
                                    {dashboard.totalStudentCount}명{" "}
                                    <span className={styles.statSub}>
                                        2학년 {surveyProgress.grade2.total} ·
                                        3학년 {surveyProgress.grade3.total}
                                    </span>
                                </p>
                            </div>

                            {isSetup ? (
                                <div className={styles.stat}>
                                    <p className={styles.statLabel}>설문 완료</p>
                                    <p className={styles.statValue}>
                                        {totalSurveyResponded}명{" "}
                                        <span className={styles.statSub}>
                                            / {totalSurveyTarget}명
                                        </span>
                                    </p>
                                </div>
                            ) : (
                                <>
                                    <div className={styles.stat}>
                                        <p className={styles.statLabel}>
                                            생성된 팀
                                        </p>
                                        <p className={styles.statValue}>
                                            {dashboard.totalTeamCount}팀{" "}
                                            <span className={styles.statSub}>
                                                2학년 {dashboard.grade2TeamCount}{" "}
                                                · 3학년{" "}
                                                {dashboard.grade3TeamCount}
                                            </span>
                                        </p>
                                    </div>
                                    {isLogTime && (
                                        <div className={styles.stat}>
                                            <p className={styles.statLabel}>
                                                오늘 미제출
                                            </p>
                                            <p
                                                className={`${styles.statValue} ${
                                                    notSubmittedCount > 0
                                                        ? styles.statDanger
                                                        : ""
                                                }`}
                                            >
                                                {notSubmittedCount}팀
                                            </p>
                                        </div>
                                    )}
                                    <div className={styles.stat}>
                                        <p className={styles.statLabel}>
                                            안 읽은 메시지
                                        </p>
                                        <p className={styles.statValue}>
                                            {unreadChatCount}개
                                        </p>
                                    </div>
                                </>
                            )}
                        </div>

                        <div className={styles.columns}>
                            <section>
                                <div
                                    data-reveal
                                    className={styles.sectionHeader}
                                >
                                    <h2 className={styles.sectionTitle}>
                                        {isSetup
                                            ? "설문 응답 현황"
                                            : "캡스톤 일지 제출 현황"}
                                    </h2>
                                    <Link
                                        to={
                                            isSetup
                                                ? "/admin/student"
                                                : "/admin/log"
                                        }
                                        className={styles.sectionAction}
                                        onClick={(event) =>
                                            isSetup
                                                ? undefined
                                                : blockTeamRequired(
                                                      event,
                                                      "팀 생성이 완료되면 팀별 캡스톤 일지를 확인할 수 있습니다."
                                                  )
                                        }
                                    >
                                        전체보기
                                    </Link>
                                </div>

                                {isSetup ? (
                                    sectionErrors.students ? (
                                        <EmptyState
                                            variant="error"
                                            title="학생 현황을 불러오지 못했어요"
                                            description={sectionErrors.students}
                                        />
                                    ) : (
                                        <div className={styles.progressList}>
                                            {["grade2", "grade3"].map((key) => {
                                                const grade =
                                                    surveyProgress[key];
                                                const remaining =
                                                    grade.total -
                                                    grade.responded;

                                                return (
                                                    <div
                                                        key={key}
                                                        data-reveal
                                                    >
                                                        <ProgressBar
                                                            label={
                                                                key === "grade2"
                                                                    ? "2학년"
                                                                    : "3학년"
                                                            }
                                                            value={`${grade.responded} / ${grade.total}명 · ${
                                                                remaining === 0
                                                                    ? "완료"
                                                                    : `${remaining}명 미제출`
                                                            }`}
                                                            percent={toPercent(
                                                                grade.responded,
                                                                grade.total
                                                            )}
                                                        />
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    )
                                ) : sectionErrors.journal ? (
                                    <EmptyState
                                        variant="error"
                                        title="일지 제출 현황을 불러오지 못했어요"
                                        description={sectionErrors.journal}
                                    />
                                ) : !isLogTime ? (
                                    <EmptyState
                                        title="오늘은 일지 작성일이 아니에요"
                                        description="작성일에 팀별 제출 현황이 여기에 표시됩니다."
                                    />
                                ) : (
                                    <>
                                        <div data-reveal>
                                            <ProgressBar
                                                label="제출한 팀"
                                                value={`${journalStatus.submittedTeamCount} / ${journalStatus.totalTeamCount}팀`}
                                                percent={toPercent(
                                                    journalStatus.submittedTeamCount,
                                                    journalStatus.totalTeamCount
                                                )}
                                            />
                                        </div>

                                        {notSubmittedCount > 0 && (
                                            <>
                                                <p
                                                    data-reveal
                                                    className={styles.listLabel}
                                                >
                                                    아직 안 낸 팀
                                                </p>
                                                <div className={styles.rows}>
                                                    {journalStatus.notSubmittedTeamNames.map(
                                                        (teamName) => (
                                                            <Link
                                                                key={teamName}
                                                                data-reveal
                                                                to="/admin/log"
                                                                className={
                                                                    styles.row
                                                                }
                                                            >
                                                                <span
                                                                    className={
                                                                        styles.rowLabel
                                                                    }
                                                                >
                                                                    {teamName}
                                                                </span>
                                                                <span
                                                                    className={
                                                                        styles.rowValue
                                                                    }
                                                                >
                                                                    <span
                                                                        className={
                                                                            styles.valueWarning
                                                                        }
                                                                    >
                                                                        미제출
                                                                    </span>
                                                                    <ChevronIcon />
                                                                </span>
                                                            </Link>
                                                        )
                                                    )}
                                                </div>
                                            </>
                                        )}
                                    </>
                                )}
                            </section>

                            <section>
                                <div
                                    data-reveal
                                    className={styles.sectionHeader}
                                >
                                    <h2 className={styles.sectionTitle}>
                                        최근 공지
                                    </h2>
                                    <Link
                                        to="/admin/notice"
                                        className={styles.sectionAction}
                                    >
                                        전체보기
                                    </Link>
                                </div>

                                {sectionErrors.notices ? (
                                    <EmptyState
                                        variant="error"
                                        title="공지를 불러오지 못했어요"
                                        description={sectionErrors.notices}
                                    />
                                ) : notices.length === 0 ? (
                                    <EmptyState
                                        title="아직 등록된 공지가 없어요"
                                        description="작성한 공지가 여기에 최근 순으로 표시됩니다."
                                    />
                                ) : (
                                    <div className={styles.rows}>
                                        {notices.map((notice) => (
                                            <Link
                                                key={notice.id}
                                                data-reveal
                                                to={`/admin/notice/${notice.id}`}
                                                className={styles.noticeRow}
                                            >
                                                {notice.important ===
                                                    "IMPORTANT" && (
                                                    <span
                                                        className={styles.badge}
                                                    >
                                                        중요
                                                    </span>
                                                )}
                                                <p
                                                    className={
                                                        styles.noticeTitle
                                                    }
                                                >
                                                    {notice.title}
                                                </p>
                                                <p
                                                    className={styles.noticeMeta}
                                                >
                                                    {notice.writer} ·{" "}
                                                    {formatCreatedAt(
                                                        notice.createdAt
                                                    )}
                                                </p>
                                            </Link>
                                        ))}
                                    </div>
                                )}

                                {/* 팀 생성 전에는 채팅방 자체가 없다 */}
                                {!isSetup && !sectionErrors.chat && (
                                    <>
                                        <h3
                                            data-reveal
                                            className={styles.subSectionTitle}
                                        >
                                            팀 채팅 최근 대화
                                        </h3>
                                        {recentMessages.length === 0 ? (
                                            <p
                                                data-reveal
                                                className={styles.listLabel}
                                            >
                                                아직 대화가 없어요.
                                            </p>
                                        ) : (
                                            <div className={styles.rows}>
                                                {recentMessages.map(
                                                    (message) => (
                                                        <Link
                                                            key={
                                                                message.teamName +
                                                                message.createdAt
                                                            }
                                                            data-reveal
                                                            to="/admin/chat"
                                                            className={
                                                                styles.noticeRow
                                                            }
                                                        >
                                                            <p
                                                                className={
                                                                    styles.chatTeam
                                                                }
                                                            >
                                                                {
                                                                    message.teamName
                                                                }
                                                            </p>
                                                            <p
                                                                className={
                                                                    styles.chatPreview
                                                                }
                                                            >
                                                                {
                                                                    message.preview
                                                                }{" "}
                                                                ·{" "}
                                                                {
                                                                    message.timeText
                                                                }
                                                            </p>
                                                        </Link>
                                                    )
                                                )}
                                            </div>
                                        )}
                                    </>
                                )}
                            </section>
                        </div>
                    </>
                )}
            </main>

            {teamRequiredModal && (
                <TeamRequiredModal
                    message={teamRequiredModal.message}
                    onClose={() => setTeamRequiredModal(null)}
                />
            )}
        </div>
    );
};

export default AdminDashboard;
