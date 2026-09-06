// Design/log-result.html 반영.
// 목록 API가 이미 완료된 일지를 전부 내려주므로, 최신 1건만 쓰지 않고 날짜 선택을 붙였다.
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import Header from "../../../components/common/header/Header";
import Skeleton from "../../../components/common/skeleton/Skeleton";
import EmptyState from "../../../components/common/empty/EmptyState";
import useInView from "../../../hooks/useInView";
import { requestUserLogDetail, requestUserLogList } from "../../../api/logApi";
import { getLogTeamName } from "../../../utils/log";
import styles from "./UserLogResult.module.css";

const DAY_LABELS = ["일", "월", "화", "수", "목", "금", "토"];

const formatFullDate = (date) => {
    if (!date) return "";

    const parsed = new Date(date);
    if (Number.isNaN(parsed.getTime())) return date;

    const year = parsed.getFullYear();
    const month = String(parsed.getMonth() + 1).padStart(2, "0");
    const day = String(parsed.getDate()).padStart(2, "0");

    return `${year}.${month}.${day} (${DAY_LABELS[parsed.getDay()]})`;
};

const formatShortDate = (date) => {
    if (!date) return "";

    const parsed = new Date(date);
    if (Number.isNaN(parsed.getTime())) return date;

    return `${parsed.getMonth() + 1}/${parsed.getDate()}`;
};

const ENTRY_BLOCKS = [
    { key: "activityContent", label: "활동 내용" },
    { key: "nextPlanContent", label: "다음 계획" },
    { key: "reflectionContent", label: "자기 반성" },
];

const UserLogResult = () => {
    const [completedJournals, setCompletedJournals] = useState([]);
    const [selectedJournalId, setSelectedJournalId] = useState(null);
    const [journalDetail, setJournalDetail] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isDetailLoading, setIsDetailLoading] = useState(false);
    const [error, setError] = useState("");

    const contentRef = useInView({
        replayKey: `${isLoading}-${selectedJournalId}`,
    });

    useEffect(() => {
        const getCompletedJournals = async () => {
            try {
                const journals = await requestUserLogList();

                const completed = journals
                    .filter((journal) => journal.status === "COMPLETED")
                    .sort(
                        (a, b) =>
                            new Date(b.date).getTime() -
                            new Date(a.date).getTime()
                    );

                setCompletedJournals(completed);
                setSelectedJournalId(completed[0]?.journalId ?? null);
            } catch {
                setError("캡스톤 일지 조회에 실패했습니다.");
            } finally {
                setIsLoading(false);
            }
        };

        getCompletedJournals();
    }, []);

    useEffect(() => {
        if (!selectedJournalId) return;

        let ignore = false;
        setIsDetailLoading(true);

        requestUserLogDetail(selectedJournalId)
            .then((detail) => {
                if (!ignore) setJournalDetail(detail);
            })
            .catch(() => {
                if (!ignore) setError("캡스톤 일지 조회에 실패했습니다.");
            })
            .finally(() => {
                if (!ignore) setIsDetailLoading(false);
            });

        return () => {
            ignore = true;
        };
    }, [selectedJournalId]);

    const entryCount = journalDetail?.entries?.length ?? 0;
    const hasTeamSection = Boolean(journalDetail?.todayActivityContent);

    return (
        <div className={styles.page}>
            <Header />

            <main className={styles.body}>
                <div className={styles.inner} ref={contentRef}>
                    <div className={styles.backRow}>
                        <Link to="/user/log" className={styles.backLink}>
                            ← 캡스톤 일지
                        </Link>
                    </div>

                    {isLoading ? (
                        <div className={styles.skeletonArea}>
                            <Skeleton width={96} height={20} />
                            <Skeleton
                                width="50%"
                                height={40}
                                style={{ marginTop: 16 }}
                            />
                            <Skeleton
                                width={224}
                                height={24}
                                style={{ marginTop: 40 }}
                            />
                            <Skeleton height={96} style={{ marginTop: 12 }} />
                            <Skeleton height={160} style={{ marginTop: 40 }} />
                        </div>
                    ) : error ? (
                        <EmptyState
                            variant="error"
                            title="일지를 불러오지 못했어요"
                            description={error}
                        />
                    ) : completedJournals.length === 0 ? (
                        <EmptyState
                            title="아직 제출이 완료된 일지가 없어요"
                            description="팀원 전체가 제출을 마치면 그날의 일지가 여기에 모여요."
                        />
                    ) : (
                        journalDetail && (
                            <>
                                <section className={styles.pageHead}>
                                    <p
                                        data-reveal
                                        className={styles.eyebrow}
                                    >
                                        캡스톤 일지
                                    </p>
                                    <div
                                        data-reveal
                                        className={styles.titleRow}
                                    >
                                        <h1 className={styles.headline}>
                                            {getLogTeamName(journalDetail)}
                                        </h1>
                                        <div className={styles.titleMeta}>
                                            <span
                                                className={styles.statusBadge}
                                            >
                                                제출 완료 {entryCount}/
                                                {entryCount}명
                                            </span>
                                            <span className={styles.dateText}>
                                                {formatFullDate(
                                                    journalDetail.date
                                                )}
                                            </span>
                                        </div>
                                    </div>
                                </section>

                                {completedJournals.length > 1 && (
                                    <div
                                        data-reveal
                                        className={styles.dateRow}
                                    >
                                        <span className={styles.dateLabel}>
                                            지난 일지
                                        </span>
                                        <div className={styles.dateSegments}>
                                            {completedJournals.map(
                                                (journal) => (
                                                    <button
                                                        key={journal.journalId}
                                                        type="button"
                                                        className={`${styles.dateSegment} ${
                                                            journal.journalId ===
                                                            selectedJournalId
                                                                ? styles.dateSegmentOn
                                                                : ""
                                                        }`}
                                                        onClick={() =>
                                                            setSelectedJournalId(
                                                                journal.journalId
                                                            )
                                                        }
                                                        aria-pressed={
                                                            journal.journalId ===
                                                            selectedJournalId
                                                        }
                                                    >
                                                        {formatShortDate(
                                                            journal.date
                                                        )}
                                                    </button>
                                                )
                                            )}
                                        </div>
                                    </div>
                                )}

                                {isDetailLoading ? (
                                    <Skeleton
                                        height={200}
                                        style={{ marginTop: 40 }}
                                    />
                                ) : (
                                    <>
                                        {hasTeamSection && (
                                            <section
                                                className={styles.section}
                                            >
                                                <div
                                                    data-reveal
                                                    className={
                                                        styles.sectionHead
                                                    }
                                                >
                                                    <span
                                                        className={
                                                            styles.sectionIndex
                                                        }
                                                    >
                                                        01
                                                    </span>
                                                    <h2
                                                        className={
                                                            styles.sectionTitle
                                                        }
                                                    >
                                                        오늘 방과후 프로젝트
                                                        진행 상황
                                                    </h2>
                                                </div>
                                                <p
                                                    data-reveal
                                                    className={
                                                        styles.sectionBody
                                                    }
                                                >
                                                    {
                                                        journalDetail.todayActivityContent
                                                    }
                                                </p>
                                            </section>
                                        )}

                                        <section className={styles.section}>
                                            <div
                                                data-reveal
                                                className={styles.sectionHead}
                                            >
                                                <span
                                                    className={
                                                        styles.sectionIndex
                                                    }
                                                >
                                                    {hasTeamSection
                                                        ? "02"
                                                        : "01"}
                                                </span>
                                                <h2
                                                    className={
                                                        styles.sectionTitle
                                                    }
                                                >
                                                    팀원별 활동 내용
                                                </h2>
                                                <span
                                                    className={
                                                        styles.sectionCount
                                                    }
                                                >
                                                    {entryCount}명
                                                </span>
                                            </div>

                                            <div className={styles.entryList}>
                                                {journalDetail.entries?.map(
                                                    (entry) => (
                                                        <article
                                                            key={entry.entryId}
                                                            data-reveal
                                                            className={
                                                                styles.entry
                                                            }
                                                        >
                                                            <h3
                                                                className={
                                                                    styles.entryName
                                                                }
                                                            >
                                                                {
                                                                    entry.writerName
                                                                }
                                                            </h3>
                                                            <div
                                                                className={
                                                                    styles.entryBlocks
                                                                }
                                                            >
                                                                {ENTRY_BLOCKS.map(
                                                                    (block) => (
                                                                        <div
                                                                            key={
                                                                                block.key
                                                                            }
                                                                        >
                                                                            <p
                                                                                className={
                                                                                    styles.entryLabel
                                                                                }
                                                                            >
                                                                                {
                                                                                    block.label
                                                                                }
                                                                            </p>
                                                                            <p
                                                                                className={
                                                                                    styles.entryText
                                                                                }
                                                                            >
                                                                                {
                                                                                    entry[
                                                                                        block
                                                                                            .key
                                                                                    ]
                                                                                }
                                                                            </p>
                                                                        </div>
                                                                    )
                                                                )}
                                                            </div>
                                                        </article>
                                                    )
                                                )}
                                            </div>
                                        </section>
                                    </>
                                )}
                            </>
                        )
                    )}
                </div>
            </main>
        </div>
    );
};

export default UserLogResult;
