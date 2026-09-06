import { useMemo, useState, useEffect } from "react";
import Header from "../../../components/common/header/Header";
import AdminLogItem from "../../../components/admin/log/AdminLogItem";
import styles from "./AdminLogList.module.css";
import { requestAdminLogList } from "../../../api/logApi";
import {
    getLogTeamName,
    LOG_GRADE_OPTIONS,
    matchesLogStatus,
} from "../../../utils/log";
import Skeleton from "../../../components/common/skeleton/Skeleton";
import EmptyState from "../../../components/common/empty/EmptyState";
import useInView from "../../../hooks/useInView";

const summaryCards = [
    { key: "all", label: "전체 일지" },
    { key: "submitted", label: "제출 일지" },
    { key: "pending", label: "미제출 일지" },
];

const AdminLogList = () => {
    const [activeGrade, setActiveGrade] = useState("GRADE_2");
    const [searchKeyword, setSearchKeyword] = useState("");
    const [activeStatus, setActiveStatus] = useState("all");
    const [logData, setLogData] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState("");

    useEffect(() => {
        const getAdminLogs = async () => {
            try {
                setIsLoading(true);

                const data = await requestAdminLogList();

                setLogData(data);
                setError("");
            } catch {
                setError("캡스톤 일지 목록을 불러오지 못했습니다.");
            } finally {
                setIsLoading(false);
            }
        };

        getAdminLogs();
    }, []);

    const summary = useMemo(() => {
        return {
            all: logData?.totalCount ?? 0,
            submitted: logData?.submittedCount ?? 0,
            pending: logData?.notSubmittedCount ?? 0,
        };
    }, [logData]);

    const filteredLogs = useMemo(() => {
        const logs = logData?.journals ?? [];
        const keyword = searchKeyword.trim().toLowerCase();

        return logs.filter((log) => {
            const matchesGrade = log.grade === activeGrade;
            const matchesKeyword =
                !keyword ||
                `${getLogTeamName(log)} ${log.serviceName} ${log.date}`
                    .toLowerCase()
                    .includes(keyword);
            const matchesStatus = matchesLogStatus(log, activeStatus);

            return matchesGrade && matchesKeyword && matchesStatus;
        });
    }, [activeGrade, searchKeyword, activeStatus, logData]);

    const listRef = useInView({
        replayKey: `${isLoading}-${activeStatus}-${activeGrade}-${searchKeyword}`,
    });

    return (
        <div className={styles.page}>
            <Header />

            <main className={styles.body}>
                <section className={styles.pageHead}>
                    <div>
                        <p className={styles.eyebrow}>캡스톤 일지 관리</p>
                        <h1 className={styles.headline}>
                            팀별 일지 제출 현황을
                            <br />
                            확인해요
                        </h1>
                        <p className={styles.subline}>
                            일지는 매주 수요일 15:40 ~ 18:10에 작성돼요.
                            <br />
                            미제출 팀에게는 마감 30분 전에 자동으로 알림이
                            발송됩니다.
                        </p>
                    </div>

                    {!isLoading && summary.all > 0 && (
                        <div className={styles.statusPanel}>
                            <p className={styles.statusLabel}>오늘 미제출</p>
                            <p className={styles.statusValue}>
                                {summary.pending}{" "}
                                <span>/ {summary.all}팀</span>
                            </p>
                        </div>
                    )}
                </section>

                <div className={styles.controls}>
                    <div className={styles.segments}>
                        {summaryCards.map((card) => (
                            <button
                                key={card.key}
                                type="button"
                                className={`${styles.segment} ${
                                    activeStatus === card.key
                                        ? styles.segmentOn
                                        : ""
                                }`}
                                aria-pressed={activeStatus === card.key}
                                onClick={() => setActiveStatus(card.key)}
                            >
                                {card.label}
                                <span
                                    className={`${styles.segmentCount} ${
                                        card.key === "pending"
                                            ? styles.segmentCountDanger
                                            : ""
                                    }`}
                                >
                                    {summary[card.key] ?? 0}
                                </span>
                            </button>
                        ))}
                    </div>

                    <div className={styles.controlRight}>
                        <div className={styles.segments}>
                            {LOG_GRADE_OPTIONS.map((grade) => (
                                <button
                                    key={grade.value}
                                    type="button"
                                    className={`${styles.segment} ${
                                        activeGrade === grade.value
                                            ? styles.segmentOn
                                            : ""
                                    }`}
                                    aria-pressed={activeGrade === grade.value}
                                    onClick={() => setActiveGrade(grade.value)}
                                >
                                    {grade.label}
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
                                placeholder="팀명 또는 날짜 검색"
                                onChange={(event) =>
                                    setSearchKeyword(event.target.value)
                                }
                            />
                        </div>
                    </div>
                </div>

                {isLoading ? (
                    <div className={styles.list}>
                        {[0, 1, 2].map((index) => (
                            <div key={index} className={styles.skeletonRow}>
                                <Skeleton width={224} height={24} />
                                <Skeleton
                                    width={288}
                                    height={20}
                                    style={{ marginTop: 12 }}
                                />
                            </div>
                        ))}
                    </div>
                ) : error ? (
                    <EmptyState
                        variant="error"
                        title="일지 목록을 불러오지 못했어요"
                        description={error}
                    />
                ) : filteredLogs.length === 0 ? (
                    <EmptyState
                        title="조건에 맞는 일지가 없어요"
                        description="검색어를 지우거나 다른 필터를 골라보세요."
                        action={
                            <button
                                type="button"
                                className={styles.resetButton}
                                onClick={() => {
                                    setSearchKeyword("");
                                    setActiveStatus("all");
                                }}
                            >
                                필터 초기화
                            </button>
                        }
                    />
                ) : (
                    <div className={styles.list} ref={listRef}>
                        {filteredLogs.map((log) => (
                            <AdminLogItem
                                key={
                                    log.journalId ??
                                    `${log.teamId}-${log.date}-${log.grade}`
                                }
                                log={log}
                            />
                        ))}
                    </div>
                )}
            </main>
        </div>
    );
};

export default AdminLogList;
