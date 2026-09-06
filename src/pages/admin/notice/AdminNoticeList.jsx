// Design/notice-list.html 반영. 학생 목록과 같은 구조 + 새 공지 작성 버튼.
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import styles from "./AdminNoticeList.module.css";
import NoticeItem from "../../../components/common/notice/NoticeItem";
import Pagination from "../../../components/common/pagination/Pagination";
import Header from "../../../components/common/header/Header";
import EmptyState from "../../../components/common/empty/EmptyState";
import useInView from "../../../hooks/useInView";
import { NoticeListSkeleton } from "../../user/notice/UserNoticeList";
import { requestNoticeList } from "../../../api/noticeApi";

const NOTICE_PER_PAGE = 6;

const sortNoticesByLatest = (notices) =>
    [...notices].sort((a, b) => {
        const timeA = new Date(a.createdAt ?? 0).getTime();
        const timeB = new Date(b.createdAt ?? 0).getTime();

        if (timeA !== timeB) return timeB - timeA;

        return Number(b.id ?? 0) - Number(a.id ?? 0);
    });

const AdminNoticeList = () => {
    const [currentPage, setCurrentPage] = useState(1);
    const [notices, setNotices] = useState([]);
    const [error, setError] = useState("");
    const [isLoading, setIsLoading] = useState(true);

    const totalPage = Math.ceil(notices.length / NOTICE_PER_PAGE);
    const startIndex = (currentPage - 1) * NOTICE_PER_PAGE;
    const currentNotices = notices.slice(
        startIndex,
        startIndex + NOTICE_PER_PAGE
    );
    const importantCount = notices.filter(
        (notice) => notice.important === "IMPORTANT"
    ).length;

    const listRef = useInView({ replayKey: `${isLoading}-${currentPage}` });

    useEffect(() => {
        const getNoticeList = async () => {
            try {
                const data = await requestNoticeList();
                setNotices(
                    Array.isArray(data) ? sortNoticesByLatest(data) : []
                );
            } catch {
                setError("공지를 불러오지 못했습니다.");
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
                            소식을 알려주세요
                        </h1>
                        <p className={styles.subline}>
                            일정 변경과 제출 안내는 이곳에 먼저 올려주세요.
                            <br />
                            중요 표시를 붙이면 학생 홈에서도 눈에 띄어요.
                        </p>
                    </div>

                    <div className={styles.headActions}>
                        {!isLoading && importantCount > 0 && (
                            <div className={styles.statusPanel}>
                                <p className={styles.statusLabel}>중요 공지</p>
                                <p className={styles.statusValue}>
                                    {importantCount}
                                </p>
                            </div>
                        )}
                        <Link
                            to="/admin/notice/create"
                            className={styles.writeButton}
                        >
                            새 공지 작성
                        </Link>
                    </div>
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
                        title="아직 작성한 공지가 없어요"
                        description="첫 공지를 작성하면 학생 화면에 바로 보여요."
                    />
                ) : (
                    <>
                        <ul className={styles.list} ref={listRef}>
                            {currentNotices.map((notice) => (
                                <Link
                                    key={notice.id}
                                    to={`/admin/notice/${notice.id}`}
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

export default AdminNoticeList;
