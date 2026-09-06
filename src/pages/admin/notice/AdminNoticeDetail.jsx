// Design/notice-detail.html 반영. 학생 상세와 같은 구조 + 수정·삭제 액션.
import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import MDEditor from "@uiw/react-md-editor";
import styles from "../../user/notice/UserNoticeDetail.module.css";
import adminStyles from "./AdminNoticeDetail.module.css";
import Header from "../../../components/common/header/Header";
import EmptyState from "../../../components/common/empty/EmptyState";
import ModalOverlay from "../../../components/common/modal/ModalOverlay";
import useInView from "../../../hooks/useInView";
import { NoticeDetailSkeleton } from "../../user/notice/UserNoticeDetail";
import {
    requestDeleteNotice,
    requestNoticeDetail,
} from "../../../api/noticeApi";
import { formatCreatedAt } from "../../../utils/format";
import TeamResultNoticeDetail from "../../../components/common/notice/TeamResultNoticeDetail";
import { parseTeamResultNoticeContent } from "../../../utils/teamResultNotice";

const AdminNoticeDetail = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const [notice, setNotice] = useState(null);
    const [error, setError] = useState("");
    const [isLoading, setIsLoading] = useState(true);
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const [isDeleting, setIsDeleting] = useState(false);
    const [deleteError, setDeleteError] = useState("");

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

    const handleDeleteNotice = async () => {
        try {
            setDeleteError("");
            setIsDeleting(true);

            await requestDeleteNotice(notice.id);
            navigate("/admin/notice");
        } catch {
            setDeleteError(
                "공지 삭제에 실패했습니다. 잠시 후 다시 시도해주세요."
            );
        } finally {
            setIsDeleting(false);
        }
    };

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
                        <Link to="/admin/notice" className={styles.backLink}>
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

                                    <div
                                        data-reveal
                                        className={adminStyles.metaRow}
                                    >
                                        <p className={styles.metaLine}>
                                            {notice.writer} ·{" "}
                                            {formatCreatedAt(notice.createdAt)}
                                        </p>

                                        <div className={adminStyles.actions}>
                                            <Link
                                                to={`/admin/notice/${id}/edit`}
                                                className={
                                                    adminStyles.outlineButton
                                                }
                                            >
                                                수정
                                            </Link>
                                            <button
                                                type="button"
                                                className={
                                                    adminStyles.dangerButton
                                                }
                                                onClick={() =>
                                                    setIsDeleteModalOpen(true)
                                                }
                                            >
                                                삭제
                                            </button>
                                        </div>
                                    </div>
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
                                                학생 홈에서도 눈에 띄게 보여요.
                                            </p>
                                        </div>
                                    )}

                                    <Link
                                        to="/admin/notice"
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

            {isDeleteModalOpen && (
                <ModalOverlay
                    onClose={() => setIsDeleteModalOpen(false)}
                    overlayClassName={adminStyles.modalOverlay}
                    modalClassName={adminStyles.modalBox}
                >
                    <>
                        <h2 className={adminStyles.modalTitle}>
                            이 공지를 삭제할까요?
                        </h2>
                        <p className={adminStyles.modalText}>
                            삭제한 공지는 다시 되돌릴 수 없어요.
                        </p>

                        {deleteError && (
                            <p className={adminStyles.deleteError}>
                                {deleteError}
                            </p>
                        )}

                        <div className={adminStyles.modalActions}>
                            <button
                                type="button"
                                className={adminStyles.cancelButton}
                                disabled={isDeleting}
                                onClick={() => setIsDeleteModalOpen(false)}
                            >
                                취소
                            </button>
                            <button
                                type="button"
                                className={adminStyles.confirmDeleteButton}
                                disabled={isDeleting}
                                onClick={handleDeleteNotice}
                            >
                                {isDeleting ? "삭제 중..." : "삭제하기"}
                            </button>
                        </div>
                    </>
                </ModalOverlay>
            )}
        </div>
    );
};

export default AdminNoticeDetail;
