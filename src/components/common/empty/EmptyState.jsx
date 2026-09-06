import styles from "./EmptyState.module.css";

/**
 * 빈 목록 / 로딩 실패 공용. 조용한 빈 화면을 만들지 않기 위한 컴포넌트.
 * variant="error"면 제목을 위험색으로 보여준다.
 */
const EmptyState = ({ title, description, variant = "empty", action }) => {
    return (
        <div
            className={`${styles.empty} ${variant === "error" ? styles.error : ""}`}
            role={variant === "error" ? "alert" : undefined}
        >
            <p className={styles.title}>{title}</p>
            {description && <p className={styles.description}>{description}</p>}
            {action && <div className={styles.action}>{action}</div>}
        </div>
    );
};

export default EmptyState;
