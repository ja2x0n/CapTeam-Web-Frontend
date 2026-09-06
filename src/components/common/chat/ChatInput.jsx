import { useEffect, useRef, useState } from "react";
import fileIcon from "../../../assets/icons/file.svg";
import { getApiErrorMessage } from "../../../utils/apiError";
import styles from "./ChatInput.module.css";

const MAX_CHAT_FILE_SIZE = 20 * 1024 * 1024;

const formatFileSize = (size) => {
    if (!size) return "";

    if (size < 1024 * 1024) {
        return `${Math.ceil(size / 1024)}KB`;
    }

    return `${(size / 1024 / 1024).toFixed(1)}MB`;
};

const isImageFile = (file) => file?.type?.startsWith("image/");

const getFileTypeLabel = (file) => {
    if (isImageFile(file)) return "이미지 파일";

    return "첨부 파일";
};

const getFileUploadErrorMessage = (error) => {
    if (error?.response?.status === 413) {
        return "20MB 이하 파일만 업로드할 수 있습니다.";
    }

    return getApiErrorMessage(error, "파일 전송에 실패했습니다.");
};

const ChatInput = ({
    onSend,
    onFileSend,
    disabled = false,
    isSending = false,
    isFileSending = false,
    placeholder = "메시지를 입력하세요",
}) => {
    const [message, setMessage] = useState("");
    const [selectedFile, setSelectedFile] = useState(null);
    const [previewUrl, setPreviewUrl] = useState("");
    const [fileError, setFileError] = useState("");
    const inputRef = useRef(null);
    const fileInputRef = useRef(null);

    // 입력 줄 수에 맞춰 높이를 늘린다 (CSS max-height까지)
    useEffect(() => {
        const textarea = inputRef.current;
        if (!textarea) return;

        textarea.style.height = "auto";
        textarea.style.height = `${textarea.scrollHeight}px`;
    }, [message]);

    const clearSelectedFile = () => {
        if (previewUrl) {
            URL.revokeObjectURL(previewUrl);
        }

        setSelectedFile(null);
        setPreviewUrl("");
        setFileError("");
    };

    const handleSubmit = async (event) => {
        event.preventDefault();

        const trimmedMessage = message.trim();

        if (
            (!trimmedMessage && !selectedFile) ||
            disabled ||
            isSending ||
            isFileSending
        ) {
            return;
        }

        if (selectedFile) {
            try {
                const sent = await onFileSend?.(selectedFile, trimmedMessage);

                if (sent === false) {
                    inputRef.current?.focus();
                    return;
                }

                clearSelectedFile();
                setMessage("");
            } catch (error) {
                setFileError(getFileUploadErrorMessage(error));
                inputRef.current?.focus();
            }

            inputRef.current?.focus();
            return;
        }

        const sent = await onSend?.(trimmedMessage);

        if (sent === false) {
            inputRef.current?.focus();
            return;
        }

        setMessage("");
        inputRef.current?.focus();
    };

    const handleFileChange = (event) => {
        const nextFile = event.target.files?.[0];

        if (!nextFile || disabled || isFileSending) return;

        if (nextFile.size > MAX_CHAT_FILE_SIZE) {
            clearSelectedFile();
            setFileError("20MB 이하 파일만 업로드할 수 있습니다.");
            event.target.value = "";
            inputRef.current?.focus();
            return;
        }

        clearSelectedFile();
        setSelectedFile(nextFile);
        setPreviewUrl(
            isImageFile(nextFile) ? URL.createObjectURL(nextFile) : ""
        );
        event.target.value = "";
        inputRef.current?.focus();
    };

    const removeSelectedFile = () => {
        clearSelectedFile();
        inputRef.current?.focus();
    };

    return (
        <form className={styles.inputForm} onSubmit={handleSubmit}>
            {fileError && <p className={styles.errorText}>{fileError}</p>}

            {selectedFile && (
                <div className={styles.filePreview}>
                    {previewUrl ? (
                        <img
                            src={previewUrl}
                            alt={selectedFile.name}
                            className={styles.imagePreview}
                        />
                    ) : (
                        <div className={styles.documentPreview}>
                            <span className={styles.documentIcon}>
                                <img src={fileIcon} alt="" />
                            </span>
                        </div>
                    )}

                    <div className={styles.previewInfo}>
                        <strong>{selectedFile.name}</strong>
                        <span>
                            {getFileTypeLabel(selectedFile)}
                            {selectedFile.size
                                ? ` · ${formatFileSize(selectedFile.size)}`
                                : ""}
                        </span>
                    </div>

                    <button
                        type="button"
                        className={styles.removeFileButton}
                        aria-label="선택한 파일 삭제"
                        onClick={removeSelectedFile}
                    >
                        ×
                    </button>
                </div>
            )}

            <div className={styles.inputRow}>
                <button
                    type="button"
                    className={styles.fileButton}
                    aria-label="파일 업로드"
                    disabled={disabled || isFileSending}
                    onClick={() => fileInputRef.current?.click()}
                >
                    +
                </button>

                <input
                    ref={fileInputRef}
                    type="file"
                    className={styles.fileInput}
                    onChange={handleFileChange}
                />

                <textarea
                    ref={inputRef}
                    rows={1}
                    className={styles.messageInput}
                    placeholder={placeholder}
                    value={message}
                    disabled={disabled || isSending || isFileSending}
                    onChange={(event) => setMessage(event.target.value)}
                    onKeyDown={(event) => {
                        // Enter는 전송, Shift+Enter는 줄바꿈
                        if (event.key !== "Enter" || event.shiftKey) return;
                        if (event.nativeEvent.isComposing) return;

                        event.preventDefault();
                        handleSubmit(event);
                    }}
                />

                <button
                    type="submit"
                    className={styles.sendButton}
                    disabled={
                        disabled ||
                        isSending ||
                        isFileSending ||
                        (!message.trim() && !selectedFile)
                    }
                >
                    {isSending || isFileSending ? "전송 중" : "보내기"}
                </button>
            </div>
        </form>
    );
};

export default ChatInput;
