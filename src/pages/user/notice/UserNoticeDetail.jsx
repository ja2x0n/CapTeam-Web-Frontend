// Design/notice-detail.html 반영. 본문 + 우측 메타 레일 2단.
import { Link, useParams } from "react-router-dom";
import { useEffect, useState } from "react";
import MDEditor from "@uiw/react-md-editor";
import styles from "./UserNoticeDetail.module.css";
import Header from "../../../components/common/header/Header";
import Skeleton from "../../../components/common/skeleton/Skeleton";
import EmptyState from "../../../components/common/empty/EmptyState";
import useInView from "../../../hooks/useInView";
import { requestNoticeDetail } from "../../../api/noticeApi";
import { formatCreatedAt } from "../../../utils/format";
import TeamResultNoticeDetail from "../../../components/common/notice/TeamResultNoticeDetail";
import { parseTeamResultNoticeContent } from "../../../utils/teamResultNotice";

export const NoticeDetailSkeleton = () => (
    <div>
        <Skeleton width={64} height={20} />
        <Skeleton height={40} style={{ marginTop: 16 }} />
        <Skeleton width="66%" height={40} style={{ marginTop: 12 }} />
        <Skeleton width={224} height={20} style={{ marginTop: 24 }} />
        <Skeleton height={20} style={{ marginTop: 40 }} />
        <Skeleton height={20} style={{ marginTop: 12 }} />
        <Skeleton width="80%" height={20} style={{ marginTop: 12 }} />
        <Skeleton height={20} style={{ marginTop: 32 }} />
        <Skeleton width="75%" height={20} style={{ marginTop: 12 }} />
    </div>
);

const UserNoticeDetail = () => {
    const { id } = useParams();

    const [notice, setNotice] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState("");

    const contentRef = useInView({ replayKey: `${isLoading}-${id}` });

    useEffect(() => {
        const getNoticeDetail = async () => {
            try {
                const data = await requestNoticeDetail(id);
                setNotice(data);
            } catch {
                setError("공지 상세 정보를 불러오지 못했습니다.");
            } finally {
                setIsLoading(false);
            }
        };

        getNoticeDetail();
    }, [id]);

    const teamResultParsed =
        notice?.noticeType === "TEAM_RESULT" && notice.teamResult
            ? parseTeamResultNoticeContent(notice.content)
            : null;
    const isImportant = notice?.important === "IMPORTANT";

    return (
        <div className={styles.page}>
            <Header />

            <main className={styles.body}>
                <div className={styles.inner} ref={contentRef}>
                    <div className={styles.backRow}>
                        <Link to="/user/notice" className={styles.backLink}>
                            ← 공지 목록
                        </Link>
                    </div>

                    {isLoading ? (
                        <NoticeDetailSkeleton />
                    ) : error || !notice ? (
                        <EmptyState
                            variant={error ? "error" : "empty"}
                            title={
                                error
                                    ? "공지를 불러오지 못했어요"
                                    : "공지를 찾을 수 없어요"
                            }
                            description={
                                error ||
                                "삭제되었거나 주소가 잘못되었을 수 있어요."
                            }
                        />
                    ) : (
                        <div className={styles.columns}>
                            <article className={styles.article}>
                                <header className={styles.articleHead}>
                                    {(isImportant || teamResultParsed) && (
                                        <div
                                            data-reveal
                                            className={styles.badgeRow}
                                        >
                                            {isImportant && (
                                                <span
                                                    className={
                                                        styles.importantBadge
                                                    }
                                                >
                                                    중요
                                                </span>
                                            )}
                                            {teamResultParsed && (
                                                <span
                                                    className={styles.typeBadge}
                                                >
                                                    팀 배정 결과
                                                </span>
                                            )}
                                        </div>
                                    )}

                                    <h1 data-reveal className={styles.title}>
                                        {notice.title}
                                    </h1>

                                    <p data-reveal className={styles.metaLine}>
                                        {notice.writer} ·{" "}
                                        {formatCreatedAt(notice.createdAt)}
                                    </p>
                                </header>

                                <div className={styles.contentArea}>
                                    {teamResultParsed ? (
                                        <TeamResultNoticeDetail
                                            notice={notice}
                                            parsed={teamResultParsed}
                                        />
                                    ) : (
                                        <>
                                            <div data-reveal>
                                                <MDEditor.Markdown
                                                    className={styles.markdown}
                                                    source={notice.content}
                                                />
                                            </div>
                                            {isImportant && (
                                                <div
                                                    data-reveal
                                                    className={
                                                        styles.importantNote
                                                    }
                                                >
                                                    중요한 공지예요. 내용을
                                                    확인한 뒤 팀원들과
                                                    공유해주세요.
                                                </div>
                                            )}
                                        </>
                                    )}
                                </div>
                            </article>

                            <aside className={styles.metaRail}>
                                <div className={styles.metaRailInner}>
                                    <p className={styles.railLabel}>작성자</p>
                                    <p className={styles.railValue}>
                                        {notice.writer}
                                    </p>

                                    <p className={styles.railLabel}>작성일</p>
                                    <p className={styles.railValue}>
                                        {formatCreatedAt(notice.createdAt)}
                                    </p>

                                    <p className={styles.railLabel}>분류</p>
                                    <p className={styles.railValue}>
                                        {teamResultParsed
                                            ? "팀 배정 결과"
                                            : "일반 공지"}
                                    </p>

                                    {isImportant && (
                                        <div className={styles.railImportant}>
                                            <p
                                                className={
                                                    styles.railImportantTitle
                                                }
                                            >
                                                중요 공지
                                            </p>
                                            <p
                                                className={
                                                    styles.railImportantText
                                                }
                                            >
                                                확인 후 팀원과 공유해주세요.
                                            </p>
                                        </div>
                                    )}

                                    <Link
                                        to="/user/notice"
                                        className={styles.railButton}
                                    >
                                        공지 목록으로
                                    </Link>
                                </div>
                            </aside>
                        </div>
                    )}
                </div>
            </main>
        </div>
    );
};

export default UserNoticeDetail;
