import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import Header from "../../../components/common/header/Header";
import NoticeForm from "../../../components/common/notice/NoticeForm";
import Skeleton from "../../../components/common/skeleton/Skeleton";
import MDEditor from "@uiw/react-md-editor";
import "@uiw/react-md-editor/markdown-editor.css";
import "@uiw/react-markdown-preview/markdown.css";
import styles from "./AdminNoticeCreate.module.css";
import { requestNoticeDetail, requestUpdateNotice } from "../../../api/noticeApi";
import useNoticeForm from "../../../hooks/useNoticeForm";

const AdminNoticeEdit = () => {
    const { id } = useParams();
    const navigate = useNavigate();

    const [isLoading, setIsLoading] = useState(true);

    const {
        title,
        setTitle,
        content,
        setContent,
        important,
        setImportant,
        error,
        setError,
        isSubmitting,
        handleSubmit,
    } = useNoticeForm({
        onSubmit: async (payload) => {
            await requestUpdateNotice(id, payload);
            navigate(`/admin/notice/${id}`);
        },
        submitErrorMessage: "공지 수정에 실패했습니다. 잠시 후 다시 시도해주세요.",
    });

    useEffect(() => {
        const getNoticeDetail = async () => {
            try {
                const notice = await requestNoticeDetail(id);

                setTitle(notice.title ?? "");
                setContent(notice.content ?? "");
                setImportant(notice.important === "IMPORTANT");
            } catch {
                setError("공지 정보를 불러오지 못했습니다.");
            } finally {
                setIsLoading(false);
            }
        };

        getNoticeDetail();
    }, [id, setTitle, setContent, setImportant, setError]);

    const form = {
        title,
        setTitle,
        content,
        setContent,
        important,
        setImportant,
        error,
        isSubmitting,
        handleSubmit,
    };

    return (
        <div className={styles.page}>
            <Header />

            <main className={styles.body}>
                <div className={styles.inner}>
                    <div className={styles.backRow}>
                        <Link
                            to={`/admin/notice/${id}`}
                            className={styles.backLink}
                        >
                            ← 공지로 돌아가기
                        </Link>
                    </div>

                    <h1 className={styles.headline}>공지 수정</h1>
                    <p className={styles.subline}>
                        수정한 내용은 저장하는 즉시 반영돼요.
                    </p>

                    {isLoading ? (
                        <div className={styles.field}>
                            <Skeleton width={64} height={24} />
                            <Skeleton height={56} style={{ marginTop: 12 }} />
                            <Skeleton height={560} style={{ marginTop: 40 }} />
                        </div>
                    ) : (
                        <NoticeForm
                            {...form}
                            Editor={MDEditor}
                            styles={styles}
                            submitLabel="저장"
                            submittingLabel="저장 중..."
                            onCancel={() => navigate(`/admin/notice/${id}`)}
                        />
                    )}
                </div>
            </main>
        </div>
    );
};

export default AdminNoticeEdit;
