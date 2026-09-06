// Design/log-result.html 반영. 학생 결과 화면과 같은 구조로 맞춘다.
// 기존에는 같은 팀원 목록을 활동/다음계획/반성 3번 반복했는데, 사람 단위로 한 번만 보여준다.
import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import Header from "../../../components/common/header/Header";
import Skeleton from "../../../components/common/skeleton/Skeleton";
import EmptyState from "../../../components/common/empty/EmptyState";
import useInView from "../../../hooks/useInView";
import { requestAdminLogDetail } from "../../../api/logApi";
import { formatLogDate, getLogTeamName } from "../../../utils/log";
import styles from "../../user/log/UserLogResult.module.css";

const ENTRY_BLOCKS = [
    { key: "activityContent", label: "활동 내용" },
    { key: "nextPlanContent", label: "다음 계획" },
    { key: "reflectionContent", label: "자기 반성" },
];

const getEntryContent = (content) => content || "작성된 내용이 없어요.";

const AdminLogDetail = () => {
    const { id } = useParams();
    const [log, setLog] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState("");

    const contentRef = useInView({ replayKey: `${isLoading}-${id}` });

    useEffect(() => {
        const getAdminLogDetail = async () => {
            try {
                setIsLoading(true);

                const data = await requestAdminLogDetail(id);

                setLog(data);
                setError("");
            } catch {
                setError("캡스톤 일지 상세 정보를 불러오지 못했습니다.");
            } finally {
                setIsLoading(false);
            }
        };

        getAdminLogDetail();
    }, [id]);

    const memberNames = log?.teamMemberNames ?? [];
    const entries = log?.entries ?? [];
    const hasTeamSection = Boolean(log?.todayActivityContent);

    return (
        <div className={styles.page}>
            <Header />

            <main className={styles.body}>
                <div className={styles.inner} ref={contentRef}>
                    <div className={styles.backRow}>
                        <Link to="/admin/log" className={styles.backLink}>
                            ← 캡스톤 일지 목록
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
                    ) : error || !log ? (
                        <EmptyState
                            variant={error ? "error" : "empty"}
                            title={
                                error
                                    ? "일지를 불러오지 못했어요"
                                    : "일지를 찾을 수 없어요"
                            }
                            description={
                                error ||
                                "삭제되었거나 주소가 잘못되었을 수 있어요."
                            }
                        />
                    ) : entries.length === 0 ? (
                        <EmptyState
                            title={`${getLogTeamName(log)} 팀이 아직 일지를 제출하지 않았어요`}
                            description="팀원 전체가 제출을 마치면 내용이 여기에 표시돼요."
                        />
                    ) : (
                        <>
                            <section className={styles.pageHead}>
                                <p data-reveal className={styles.eyebrow}>
                                    캡스톤 일지
                                </p>
                                <div data-reveal className={styles.titleRow}>
                                    <h1 className={styles.headline}>
                                        {getLogTeamName(log)}
                                    </h1>
                                    <div className={styles.titleMeta}>
                                        <span className={styles.statusBadge}>
                                            제출 완료 {entries.length}/
                                            {memberNames.length}명
                                        </span>
                                        <span className={styles.dateText}>
                                            {formatLogDate(log.date)}
                                        </span>
                                    </div>
                                </div>
                            </section>

                            {hasTeamSection && (
                                <section className={styles.section}>
                                    <div
                                        data-reveal
                                        className={styles.sectionHead}
                                    >
                                        <span className={styles.sectionIndex}>
                                            01
                                        </span>
                                        <h2 className={styles.sectionTitle}>
                                            오늘 방과후 프로젝트 진행 상황
                                        </h2>
                                    </div>
                                    <p
                                        data-reveal
                                        className={styles.sectionBody}
                                    >
                                        {log.todayActivityContent}
                                    </p>
                                </section>
                            )}

                            <section className={styles.section}>
                                <div
                                    data-reveal
                                    className={styles.sectionHead}
                                >
                                    <span className={styles.sectionIndex}>
                                        {hasTeamSection ? "02" : "01"}
                                    </span>
                                    <h2 className={styles.sectionTitle}>
                                        팀원별 활동 내용
                                    </h2>
                                    <span className={styles.sectionCount}>
                                        {entries.length}명
                                    </span>
                                </div>

                                <div className={styles.entryList}>
                                    {entries.map((entry) => (
                                        <article
                                            key={entry.entryId}
                                            data-reveal
                                            className={styles.entry}
                                        >
                                            <h3 className={styles.entryName}>
                                                {entry.writerName}
                                            </h3>
                                            <div
                                                className={styles.entryBlocks}
                                            >
                                                {ENTRY_BLOCKS.map((block) => (
                                                    <div key={block.key}>
                                                        <p
                                                            className={
                                                                styles.entryLabel
                                                            }
                                                        >
                                                            {block.label}
                                                        </p>
                                                        <p
                                                            className={
                                                                styles.entryText
                                                            }
                                                        >
                                                            {getEntryContent(
                                                                entry[
                                                                    block.key
                                                                ]
                                                            )}
                                                        </p>
                                                    </div>
                                                ))}
                                            </div>
                                        </article>
                                    ))}
                                </div>
                            </section>
                        </>
                    )}
                </div>
            </main>
        </div>
    );
};

export default AdminLogDetail;
