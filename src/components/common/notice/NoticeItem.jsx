// Design/notice-list.html 반영. 카드 → 구분선 리스트 로우.
import { formatCreatedAt, stripMarkdown, truncateText } from "../../../utils/format";
import styles from "./NoticeItem.module.css";

const NoticeItem = ({ notice }) => {
    return (
        <li className={styles.item}>
            <div className={styles.main}>
                <div className={styles.titleRow}>
                    {notice.important === "IMPORTANT" && (
                        <span className={styles.tag}>중요</span>
                    )}
                    <h3 className={styles.title}>{notice.title}</h3>
                </div>

                {notice.content && (
                    <p className={styles.content}>
                        {truncateText(stripMarkdown(notice.content), 100)}
                    </p>
                )}

                <p className={styles.meta}>
                    {notice.writer} · {formatCreatedAt(notice.createdAt)}
                </p>
            </div>

            <svg
                className={styles.chevron}
                width="20"
                height="20"
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
        </li>
    );
};

export default NoticeItem;
