// Design/log-write.html 반영. 제출 버튼은 페이지의 오른쪽 상태 레일이 갖는다.
import styles from "./UserLogForm.module.css";
import { getLogFields } from "../../../utils/log";

const UserLogForm = ({ formData, isLeader, isCompleted = false, onFieldChange }) => {
    const fields = getLogFields(isLeader);

    return (
        <div className={styles.fieldList}>
            {fields.map((field, index) => (
                <div key={field.name} data-reveal className={styles.field}>
                    <div className={styles.fieldTitle}>
                        <span className={styles.fieldIndex}>
                            {String(index + 1).padStart(2, "0")}
                        </span>
                        {field.label}
                    </div>
                    <p className={styles.fieldDesc}>{field.desc}</p>
                    <textarea
                        className={styles.textarea}
                        value={formData[field.name] ?? ""}
                        placeholder={field.placeholder}
                        disabled={isCompleted}
                        onChange={(event) =>
                            onFieldChange(field.name, event.target.value)
                        }
                    />
                </div>
            ))}
        </div>
    );
};

export default UserLogForm;
