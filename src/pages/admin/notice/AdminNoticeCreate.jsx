// Design/notice-write.html 반영.
// 에디터는 MDEditor의 live 모드(툴바 + 작성/미리보기 분할)를 그대로 쓰고 껍데기만 다시 입혔다.
import { Link, useNavigate } from "react-router-dom";
import MDEditor from "@uiw/react-md-editor";
import "@uiw/react-md-editor/markdown-editor.css";
import "@uiw/react-markdown-preview/markdown.css";
import Header from "../../../components/common/header/Header";
import NoticeForm from "../../../components/common/notice/NoticeForm";
import styles from "./AdminNoticeCreate.module.css";
import { requestCreateNotice } from "../../../api/noticeApi";
import useNoticeForm from "../../../hooks/useNoticeForm";

const AdminNoticeCreate = () => {
    const navigate = useNavigate();

    const form = useNoticeForm({
        onSubmit: async (payload) => {
            await requestCreateNotice(payload);
            navigate("/admin/notice");
        },
        submitErrorMessage: "공지 등록에 실패했습니다. 잠시 후 다시 시도해주세요.",
    });

    return (
        <div className={styles.page}>
            <Header />

            <main className={styles.body}>
                <div className={styles.inner}>
                    <div className={styles.backRow}>
                        <Link to="/admin/notice" className={styles.backLink}>
                            ← 공지 목록
                        </Link>
                    </div>

                    <h1 className={styles.headline}>새 공지 작성</h1>
                    <p className={styles.subline}>
                        등록하면 학생 홈과 공지 목록에 바로 올라가요.
                    </p>

                    <NoticeForm
                        {...form}
                        Editor={MDEditor}
                        styles={styles}
                        submitLabel="등록"
                        submittingLabel="등록 중..."
                        onCancel={() => navigate("/admin/notice")}
                    />
                </div>
            </main>
        </div>
    );
};

export default AdminNoticeCreate;
