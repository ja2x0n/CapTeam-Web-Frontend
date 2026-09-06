// Design/user-home.html 반영.
// 표시하는 값은 전부 실제 API가 내려주는 데이터로 한정한다 — 화면을 채우려고 없는 값을 만들지 않는다.
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import Header from "../../../components/common/header/Header";
import TeamRequiredModal from "../../../components/common/modal/TeamRequiredModal";
import Skeleton from "../../../components/common/skeleton/Skeleton";
import EmptyState from "../../../components/common/empty/EmptyState";
import useInView from "../../../hooks/useInView";
import authStore from "../../../store/authStore";
import { requestUserDashboard } from "../../../api/dashboardApi";
import { requestUserProjectPlan } from "../../../api/projectApi";
import { requestNoticeList } from "../../../api/noticeApi";
import { normalizeProjectPlan } from "../../../utils/projectPlan";
import {
    formatCountdownTime,
    getCapstoneLogRemainingMs,
    getCapstoneLogUnavailableText,
    isCapstoneLogTime,
} from "../../../utils/capstoneLogTime";
import { formatCreatedAt, stripMarkdown, truncateText } from "../../../utils/format";
import useUnreadChatCount from "../../../hooks/useUnreadChatCount";
import styles from "./UserDashboard.module.css";

const PROJECT_PLAN_FIELDS = [
    { key: "teamName", label: "팀명" },
    { key: "serviceName", label: "서비스명" },
    { key: "serviceSummary", label: "서비스 소개" },
];

const buildProjectPlanStatus = (projectPlan) => {
    const hasCoreFeature = projectPlan.coreFeatures.some((feature) =>
        feature.value.trim()
    );

    const incompleteItemLabels = PROJECT_PLAN_FIELDS.filter(
        (field) => !projectPlan[field.key].trim()
    ).map((field) => field.label);
    if (!hasCoreFeature) incompleteItemLabels.push("핵심 기능");

    return { incompleteItemLabels };
};

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

const HomeSkeleton = () => (
    <>
        <div className={styles.hero}>
            <div className={styles.heroMain}>
                <Skeleton width={96} height={20} />
                <Skeleton width="min(520px, 100%)" height={44} style={{ marginTop: 20 }} />
                <Skeleton width="60%" height={44} style={{ marginTop: 12 }} />
                <Skeleton width="min(420px, 66%)" height={24} style={{ marginTop: 28 }} />
                <Skeleton width={160} height={48} style={{ marginTop: 36 }} />
            </div>
            <div className={styles.statusPanel}>
                <Skeleton width={96} height={20} />
                <Skeleton width={192} height={48} style={{ marginTop: 8 }} />
            </div>
        </div>

        <div className={styles.columns}>
            <div>
                <Skeleton width={96} height={24} />
                <Skeleton height={48} style={{ marginTop: 20 }} />
                <Skeleton height={48} style={{ marginTop: 12 }} />
            </div>
            <div>
                <Skeleton width={64} height={24} />
                <Skeleton height={56} style={{ marginTop: 20 }} />
                <Skeleton height={56} style={{ marginTop: 12 }} />
                <Skeleton height={56} style={{ marginTop: 12 }} />
            </div>
        </div>
    </>
);

const UserDashboard = () => {
    const user = authStore((state) => state.user);
    const [dashboard, setDashboard] = useState({
        teamCreated: false,
        todayJournalSubmitted: false,
    });
    const [isDashboardLoading, setIsDashboardLoading] = useState(true);
    const [currentTime, setCurrentTime] = useState(new Date());
    const [error, setError] = useState("");
    const [teamRequiredModal, setTeamRequiredModal] = useState(null);
    const [projectPlanStatus, setProjectPlanStatus] = useState(null);
    const [notices, setNotices] = useState([]);
    const [sectionErrors, setSectionErrors] = useState({});
    const { unreadChatCount } = useUnreadChatCount({
        enabled: dashboard.teamCreated,
    });

    // 로딩이 끝나 실제 화면이 붙는 순간부터 "스르륵" 재생
    const revealRef = useInView({ replayKey: isDashboardLoading });

    useEffect(() => {
        const getDashboardData = async () => {
            try {
                const dashboardData = await requestUserDashboard();
                setDashboard((prevDashboard) => ({
                    ...prevDashboard,
                    ...dashboardData,
                }));
            } catch {
                setError("대시보드 정보를 불러오지 못했습니다.");
            } finally {
                setIsDashboardLoading(false);
            }
        };

        getDashboardData();
    }, []);

    useEffect(() => {
        if (!dashboard.teamCreated) return;

        let ignore = false;

        requestUserProjectPlan()
            .then((plan) => {
                if (ignore) return;
                setProjectPlanStatus(
                    buildProjectPlanStatus(normalizeProjectPlan(plan))
                );
            })
            .catch(() => {
                if (ignore) return;
                setSectionErrors((prev) => ({
                    ...prev,
                    plan: "불러오지 못했어요",
                }));
            });

        return () => {
            ignore = true;
        };
    }, [dashboard.teamCreated]);

    useEffect(() => {
        const getNoticeData = async () => {
            try {
                const noticeList = await requestNoticeList();
                setNotices(Array.isArray(noticeList) ? noticeList.slice(0, 3) : []);
            } catch {
                setSectionErrors((prev) => ({
                    ...prev,
                    notices: "공지를 불러오지 못했습니다.",
                }));
            }
        };

        getNoticeData();
    }, []);

    useEffect(() => {
        const timerId = setInterval(() => {
            setCurrentTime(new Date());
        }, 1000);

        return () => clearInterval(timerId);
    }, []);

    const blockTeamRequired = (event, message) => {
        if (dashboard.teamCreated) return;

        event.preventDefault();
        setTeamRequiredModal({ message });
    };

    const canWriteLog = isCapstoneLogTime(currentTime);
    const hero = !dashboard.teamCreated
        ? {
              title: (
                  <>
                      팀이 만들어지면
                      <br />
                      바로 알려드릴게요
                  </>
              ),
              sub: "설문 제출이 끝났어요. 관리자가 AI로 팀을 만들면 이 화면에서 팀원과 일정을 확인할 수 있어요.",
              ctaText: "공지 확인하기",
              ctaTo: "/user/notice",
          }
        : canWriteLog && !dashboard.todayJournalSubmitted
          ? {
                title: (
                    <>
                        오늘 캡스톤 일지를
                        <br />
                        작성할 시간이에요
                    </>
                ),
                sub: "오늘 활동 내용을 남기면 팀원 일지와 함께 자동으로 취합돼요.",
                countdownText: formatCountdownTime(
                    getCapstoneLogRemainingMs(currentTime)
                ),
                ctaText: "일지 작성하기",
                ctaTo: "/user/log",
                noteText: "지난 일지 보기",
                noteTo: "/user/log/result",
            }
          : canWriteLog
            ? {
                  title: (
                      <>
                          오늘 일지를
                          <br />
                          제출했어요
                      </>
                  ),
                  sub: "수고했어요. 지난 일지는 언제든 다시 볼 수 있어요.",
                  ctaText: "지난 일지 보기",
                  ctaTo: "/user/log/result",
              }
            : {
                  title: (
                      <>
                          오늘은 캡스톤 일지
                          <br />
                          작성일이 아니에요
                      </>
                  ),
                  sub: getCapstoneLogUnavailableText(currentTime),
                  ctaText: "지난 일지 보기",
                  ctaTo: "/user/log/result",
              };

    const incompleteLabels = projectPlanStatus?.incompleteItemLabels ?? [];
    const projectPlanValue = sectionErrors.plan
        ? { text: sectionErrors.plan, isWarning: true }
        : !projectPlanStatus
          ? null
          : incompleteLabels.length === 0
            ? { text: "작성 완료", isWarning: false }
            : {
                  text:
                      incompleteLabels.length === 1
                          ? `${incompleteLabels[0]} 미작성`
                          : `${incompleteLabels.length}개 항목 미작성`,
                  isWarning: true,
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
                                    {user?.name ? `${user.name} 님` : "학생 홈"}
                                </p>
                                <h1 data-reveal className={styles.headline}>
                                    {hero.title}
                                </h1>
                                <p data-reveal className={styles.subline}>
                                    {hero.sub}
                                </p>
                                <div data-reveal className={styles.heroActions}>
                                    <Link
                                        to={hero.ctaTo}
                                        className={styles.primaryCta}
                                        onClick={(event) =>
                                            blockTeamRequired(
                                                event,
                                                "팀 생성이 완료되면 캡스톤 일지를 작성할 수 있습니다."
                                            )
                                        }
                                    >
                                        {hero.ctaText}
                                    </Link>
                                    {hero.noteText && (
                                        <Link
                                            to={hero.noteTo}
                                            className={styles.secondaryCta}
                                        >
                                            {hero.noteText}
                                        </Link>
                                    )}
                                </div>
                            </div>

                            {hero.countdownText && (
                                <div data-reveal className={styles.statusPanel}>
                                    <p className={styles.statusLabel}>
                                        작성 마감까지
                                    </p>
                                    <p className={styles.countdown}>
                                        {hero.countdownText}
                                    </p>
                                </div>
                            )}
                        </section>

                        <div className={styles.columns}>
                            {/* 팀 생성 전에는 기획서·채팅 자체가 없으므로 섹션을 아예 만들지 않는다 */}
                            {dashboard.teamCreated && (
                                <section>
                                    <h2
                                        data-reveal
                                        className={styles.sectionTitle}
                                    >
                                        내 캡스톤
                                    </h2>
                                    <div className={styles.rows}>
                                        <Link
                                            data-reveal
                                            to="/user/project"
                                            className={styles.row}
                                        >
                                            <span className={styles.rowLabel}>
                                                프로젝트 기획서
                                            </span>
                                            <span className={styles.rowValue}>
                                                {projectPlanValue && (
                                                    <span
                                                        className={
                                                            projectPlanValue.isWarning
                                                                ? styles.valueWarning
                                                                : styles.valueStrong
                                                        }
                                                    >
                                                        {projectPlanValue.text}
                                                    </span>
                                                )}
                                                <ChevronIcon />
                                            </span>
                                        </Link>

                                        <Link
                                            data-reveal
                                            to="/user/chat"
                                            className={styles.row}
                                        >
                                            <span className={styles.rowLabel}>
                                                팀 채팅
                                            </span>
                                            <span className={styles.rowValue}>
                                                <span
                                                    className={
                                                        unreadChatCount > 0
                                                            ? styles.valueStrong
                                                            : undefined
                                                    }
                                                >
                                                    안 읽은 메시지{" "}
                                                    {unreadChatCount}
                                                </span>
                                                <ChevronIcon />
                                            </span>
                                        </Link>
                                    </div>
                                </section>
                            )}

                            <section>
                                <div
                                    data-reveal
                                    className={styles.sectionHeader}
                                >
                                    <h2 className={styles.sectionTitle}>공지</h2>
                                    <Link
                                        to="/user/notice"
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
                                        description="새 공지가 올라오면 여기에서 바로 확인할 수 있어요."
                                    />
                                ) : (
                                    <div className={styles.rows}>
                                        {notices.map((notice, index) => (
                                            <Link
                                                key={notice.id}
                                                data-reveal
                                                to={`/user/notice/${notice.id}`}
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
                                                {index === 0 &&
                                                    notice.content && (
                                                        <p
                                                            className={
                                                                styles.noticeExcerpt
                                                            }
                                                        >
                                                            {truncateText(
                                                                stripMarkdown(
                                                                    notice.content
                                                                ),
                                                                80
                                                            )}
                                                        </p>
                                                    )}
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

export default UserDashboard;
