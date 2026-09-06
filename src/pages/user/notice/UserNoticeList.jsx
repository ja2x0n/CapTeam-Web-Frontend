// Design/notice-list.html 반영.
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import styles from "./UserNoticeList.module.css";
import NoticeItem from "../../../components/common/notice/NoticeItem";
import Pagination from "../../../components/common/pagination/Pagination";
import Header from "../../../components/common/header/Header";
import Skeleton from "../../../components/common/skeleton/Skeleton";
import EmptyState from "../../../components/common/empty/EmptyState";
import useInView from "../../../hooks/useInView";
import { requestNoticeList } from "../../../api/noticeApi";

const NOTICE_PER_PAGE = 6;

const sortNoticesByLatest = (notices) =>
    [...notices].sort((a, b) => {
        const timeA = new Date(a.createdAt ?? 0).getTime();
        const timeB = new Date(b.createdAt ?? 0).getTime();

        if (timeA !== timeB) return timeB - timeA;

        return Number(b.id ?? 0) - Number(a.id ?? 0);
    });

export const NoticeListSkeleton = ({ className }) => (
    <div className={className}>
        {[0, 1, 2].map((index) => (
            <div key={index} style={{ padding: "28px 12px" }}>
                <Skeleton width={288} height={24} />
                <Skeleton
                    width="min(640px, 100%)"
                    height={20}
                    style={{ marginTop: 12 }}
                />
                <Skeleton width={160} height={16} style={{ marginTop: 12 }} />
            </div>
        ))}
    </div>
);

const UserNoticeList = () => {
    const [currentPage, setCurrentPage] = useState(1);
    const [notices, setNotices] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState("");

    const totalPage = Math.ceil(notices.length / NOTICE_PER_PAGE);
    const startIndex = (currentPage - 1) * NOTICE_PER_PAGE;
    const currentNotices = notices.slice(
        startIndex,
        startIndex + NOTICE_PER_PAGE
    );
    const importantCount = notices.filter(
        (notice) => notice.important === "IMPORTANT"
    ).length;

    // 페이지를 넘길 때마다 목록이 다시 스르륵 올라온다
    const listRef = useInView({ replayKey: `${isLoading}-${currentPage}` });

    useEffect(() => {
        const getNoticeList = async () => {
            try {
                const data = await requestNoticeList();
                setNotices(
                    Array.isArray(data) ? sortNoticesByLatest(data) : []
                );
            } catch {
                setError("공지 목록을 불러오지 못했습니다.");
            } finally {
                setIsLoading(false);
            }
        };

        getNoticeList();
    }, []);

    return (
        <div className={styles.page}>
            <Header />

            <main className={styles.body}>
                <section className={styles.pageHead}>
                    <div>
                        <p className={styles.eyebrow}>공지</p>
                        <h1 className={styles.headline}>
                            캡스톤 진행에 필요한
                            <br />
                            소식을 모았어요
                        </h1>
                        <p className={styles.subline}>
                            일정 변경과 제출 안내는 이곳에 먼저 올라와요.
                            <br />
                            중요 표시가 붙은 공지는 꼭 확인해주세요.
                        </p>
                    </div>

                    {!isLoading && importantCount > 0 && (
                        <div className={styles.statusPanel}>
                            <p className={styles.statusLabel}>중요 공지</p>
                            <p className={styles.statusValue}>
                                {importantCount}
                            </p>
                        </div>
                    )}
                </section>

                {isLoading ? (
                    <NoticeListSkeleton className={styles.list} />
                ) : error ? (
                    <EmptyState
                        variant="error"
                        title="공지를 불러오지 못했어요"
                        description={error}
                    />
                ) : notices.length === 0 ? (
                    <EmptyState
                        title="아직 올라온 공지가 없어요"
                        description="새 소식이 등록되면 여기에서 바로 확인할 수 있어요."
                    />
                ) : (
                    <>
                        <ul className={styles.list} ref={listRef}>
                            {currentNotices.map((notice) => (
                                <Link
                                    key={notice.id}
                                    to={`/user/notice/${notice.id}`}
                                    data-reveal
                                >
                                    <NoticeItem notice={notice} />
                                </Link>
                            ))}
                        </ul>

                        <Pagination
                            currentPage={currentPage}
                            totalPage={totalPage}
                            onPageChange={setCurrentPage}
                        />
                    </>
                )}
            </main>
        </div>
    );
};

export default UserNoticeList;
