// 공지 작성/수정이 같은 폼을 쓴다. styles는 호출한 페이지의 CSS 모듈을 그대로 받는다.
const TITLE_MAX_LENGTH = 60;

const NoticeForm = ({
    title,
    setTitle,
    content,
    setContent,
    important,
    setImportant,
    error,
    isSubmitting,
    handleSubmit,
    Editor,
    styles,
    submitLabel,
    submittingLabel,
    onCancel,
}) => {
    const canSubmit = Boolean(title.trim() && content.trim()) && !isSubmitting;

    return (
        <form className={styles.form} onSubmit={handleSubmit}>
            <div className={styles.field}>
                <label htmlFor="title" className={styles.label}>
                    제목
                </label>
                <input
                    id="title"
                    type="text"
                    className={styles.titleInput}
                    placeholder="공지 제목을 입력해주세요"
                    maxLength={TITLE_MAX_LENGTH}
                    value={title}
                    onChange={(event) => setTitle(event.target.value)}
                />
                <div className={styles.fieldFoot}>
                    <span />
                    <span>
                        {title.length}/{TITLE_MAX_LENGTH}
                    </span>
                </div>
            </div>

            <div className={styles.field}>
                <div className={styles.labelRow}>
                    <span className={styles.label}>내용</span>
                    <span className={styles.labelHint}>
                        마크다운을 쓸 수 있고, 오른쪽에서 바로 미리 볼 수 있어요
                    </span>
                </div>

                <div className={styles.editorBox}>
                    <Editor
                        className={styles.markdownEditor}
                        value={content}
                        onChange={(value) => setContent(value || "")}
                        height={560}
                        visibleDragbar={false}
                        textareaProps={{
                            id: "content",
                            placeholder: "공지 내용을 입력해주세요",
                        }}
                        data-color-mode="light"
                    />
                </div>
            </div>

            <label className={styles.importantCard}>
                <input
                    type="checkbox"
                    className={styles.checkboxInput}
                    checked={important}
                    onChange={(event) => setImportant(event.target.checked)}
                />
                <span className={styles.checkboxBox} aria-hidden="true">
                    <svg
                        width="12"
                        height="12"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="#fff"
                        strokeWidth="3.5"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                    >
                        <path d="M20 6 9 17l-5-5" />
                    </svg>
                </span>
                <span>
                    <span className={styles.checkboxTitle}>
                        중요 공지로 등록
                    </span>
                    <span className={styles.checkboxDesc}>
                        목록과 학생 홈에서 <b>중요</b> 배지가 붙고, 상세 화면
                        아래에 확인 안내가 함께 표시돼요.
                    </span>
                </span>
            </label>

            {error && <p className={styles.errorText}>{error}</p>}

            <div className={styles.actions}>
                <button
                    type="submit"
                    className={styles.submitButton}
                    disabled={!canSubmit}
                >
                    {isSubmitting ? submittingLabel : submitLabel}
                </button>
                <button
                    type="button"
                    className={styles.cancelButton}
                    onClick={onCancel}
                >
                    취소
                </button>
                {!canSubmit && !isSubmitting && (
                    <span className={styles.submitHint}>
                        제목과 내용을 모두 입력해야 등록할 수 있어요.
                    </span>
                )}
            </div>
        </form>
    );
};

export default NoticeForm;
