import { useCallback, useEffect, useRef, useState } from "react";
import { ModalCloseContext } from "./modalCloseContext";
import styles from "./ModalOverlay.module.css";

// 퇴장 모션이 끝난 뒤에 onClose를 부른다 — 부모가 바로 언마운트하면 나가는 모션이 안 보인다
const CLOSE_DURATION = 240;

const ModalOverlay = ({
    onClose,
    overlayClassName = "",
    modalClassName = "",
    ariaLabelledby,
    children,
}) => {
    const [isShown, setIsShown] = useState(false);
    const closeTimerRef = useRef(null);

    // 마운트된 다음 프레임에 클래스를 붙여야 transition이 시작점부터 실행된다
    useEffect(() => {
        const frameId = requestAnimationFrame(() =>
            requestAnimationFrame(() => setIsShown(true))
        );

        return () => cancelAnimationFrame(frameId);
    }, []);

    useEffect(() => {
        return () => clearTimeout(closeTimerRef.current);
    }, []);

    const handleClose = useCallback(() => {
        if (closeTimerRef.current) return;

        setIsShown(false);
        closeTimerRef.current = setTimeout(onClose, CLOSE_DURATION);
    }, [onClose]);

    useEffect(() => {
        const closeOnEscape = (event) => {
            if (event.key === "Escape") handleClose();
        };

        document.addEventListener("keydown", closeOnEscape);
        const previousOverflow = document.body.style.overflow;
        document.body.style.overflow = "hidden";

        return () => {
            document.removeEventListener("keydown", closeOnEscape);
            document.body.style.overflow = previousOverflow;
        };
    }, [handleClose]);

    return (
        <ModalCloseContext.Provider value={handleClose}>
            <div
                className={`${overlayClassName} ${styles.overlay} ${
                    isShown ? styles.overlayShown : ""
                }`}
                role="presentation"
                onClick={handleClose}
            >
                <section
                    className={`${modalClassName} ${styles.panel} ${
                        isShown ? styles.panelShown : ""
                    }`}
                    role="dialog"
                    aria-modal="true"
                    aria-labelledby={ariaLabelledby}
                    onClick={(event) => event.stopPropagation()}
                >
                    {children}
                </section>
            </div>
        </ModalCloseContext.Provider>
    );
};

export default ModalOverlay;
