// Design/log-write.html의 "작성 시간이 아닐 때" 화면.
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import Header from "../../../components/common/header/Header";
import useInView from "../../../hooks/useInView";
import {
    formatCountdownTime,
    getCapstoneLogRemainingMs,
    getCapstoneLogUnavailableText,
    getNextCapstoneLogStartRemainingMs,
    isCapstoneLogTime,
} from "../../../utils/capstoneLogTime";
import styles from "./UserLogCountdown.module.css";

const UserLogCountdown = () => {
    const [currentTime, setCurrentTime] = useState(new Date());
    const contentRef = useInView();

    useEffect(() => {
        const timerId = setInterval(() => {
            setCurrentTime(new Date());
        }, 1000);

        return () => clearInterval(timerId);
    }, []);

    const canWriteLog = isCapstoneLogTime(currentTime);
    const countdownText = formatCountdownTime(
        canWriteLog
            ? getCapstoneLogRemainingMs(currentTime)
            : getNextCapstoneLogStartRemainingMs(currentTime)
    );

    return (
        <div className={styles.page}>
            <Header />

            <main className={styles.body} ref={contentRef}>
                <div className={styles.inner}>
                    <p data-reveal className={styles.eyebrow}>
                        캡스톤 일지
                    </p>

                    {canWriteLog ? (
                        <>
                            <h1 data-reveal className={styles.headline}>
                                지금 일지를
                                <br />
                                작성할 수 있어요
                            </h1>
                            <p data-reveal className={styles.subline}>
                                오늘 활동 내용을 남기면 팀원 일지와 함께 자동으로
                                취합돼요.
                            </p>
                        </>
                    ) : (
                        <>
                            <h1 data-reveal className={styles.headline}>
                                지금은 일지를
                                <br />
                                작성할 시간이 아니에요
                            </h1>
                            <p data-reveal className={styles.subline}>
                                캡스톤 일지는 매주{" "}
                                <b>수요일 15:40 ~ 18:10</b>에만 작성할 수 있어요.
                            </p>
                        </>
                    )}

                    <div data-reveal className={styles.timerBlock}>
                        <p className={styles.timerLabel}>
                            {canWriteLog
                                ? "작성 마감까지"
                                : "다음 작성 시작까지"}
                        </p>
                        <p className={styles.countdown}>{countdownText}</p>
                        {!canWriteLog && (
                            <p className={styles.timerNote}>
                                {getCapstoneLogUnavailableText(currentTime)}
                            </p>
                        )}
                    </div>

                    <div data-reveal className={styles.actions}>
                        <Link
                            to={
                                canWriteLog
                                    ? "/user/log/write"
                                    : "/user/log/result"
                            }
                            className={styles.primaryButton}
                        >
                            {canWriteLog ? "일지 작성하기" : "지난 일지 보기"}
                        </Link>
                        <Link
                            to="/user/dashboard"
                            className={styles.ghostButton}
                        >
                            홈으로
                        </Link>
                    </div>
                </div>
            </main>
        </div>
    );
};

export default UserLogCountdown;
