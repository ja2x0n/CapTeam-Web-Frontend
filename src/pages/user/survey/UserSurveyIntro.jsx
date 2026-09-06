// Design/survey-intro.html 반영. 설문 흐름에는 헤더가 없고 로그아웃만 우측 상단에.
import { Link, useNavigate } from "react-router-dom";
import { requestLogout } from "../../../api/authApi";
import authStore from "../../../store/authStore";
import useInView from "../../../hooks/useInView";
import styles from "./UserSurveyIntro.module.css";

const SURVEY_SECTIONS = [
    {
        index: "01",
        title: "캡스톤 팀 매칭 기준",
        description:
            "희망 직군, 기술 스택, 구현 경험을 바탕으로 팀 안에서 맡을 수 있는 역할을 확인해요.",
    },
    {
        index: "02",
        title: "캡스톤 협업 성향",
        description:
            "아이디어 정리, 소통, 역할 유연성, 일정 압박 대응, 집중 유지처럼 함께 결과물을 만들 때 중요한 요소를 확인해요.",
    },
    {
        index: "03",
        title: "팀 매칭 반영 방식",
        description: (
            <>
                성향 점수는 절대 기준이 아니라 참고 자료예요.
                <br />
                역할·기술 스택·발표 가능성까지 함께 고려해 팀을 구성합니다.
            </>
        ),
    },
];

const UserSurveyIntro = () => {
    const navigate = useNavigate();
    const logout = authStore((state) => state.logout);
    const contentRef = useInView();

    const handleLogout = async () => {
        try {
            await requestLogout();
        } finally {
            logout();
            navigate("/login", { replace: true });
        }
    };

    return (
        <main className={styles.page} ref={contentRef}>
            <div className={styles.topBar}>
                <button
                    type="button"
                    className={styles.logoutButton}
                    onClick={handleLogout}
                >
                    로그아웃
                </button>
            </div>

            <section className={styles.hero}>
                <div>
                    <p data-reveal className={styles.eyebrow}>
                        캡스톤 팀 매칭 설문
                    </p>
                    <h1 data-reveal className={styles.headline}>
                        팀을 만들기 전에
                        <br />몇 가지만 알려주세요
                    </h1>
                    <p data-reveal className={styles.subline}>
                        입력한 기술 정보와 협업 성향을 함께 분석해, 역할과
                        실행력이 한쪽으로 몰리지 않도록 팀을 추천해요.
                    </p>
                </div>

                <div data-reveal className={styles.statusPanel}>
                    <p className={styles.statusLabel}>예상 소요 시간</p>
                    <p className={styles.statusValue}>약 5분</p>
                    <p className={styles.statusNote}>총 34문항 · 한 번만 제출</p>
                </div>
            </section>

            <div className={styles.sectionGrid}>
                {SURVEY_SECTIONS.map((section) => (
                    <div key={section.index} data-reveal>
                        <p className={styles.sectionIndex}>{section.index}</p>
                        <h2 className={styles.sectionTitle}>{section.title}</h2>
                        <p className={styles.sectionDesc}>
                            {section.description}
                        </p>
                    </div>
                ))}
            </div>

            <div className={styles.startArea}>
                <p data-reveal className={styles.startNote}>
                    설문은 <b>한 번만 제출</b>할 수 있어요.
                    <br />
                    가능한 실제 경험과 성향에 가깝게 답변해주세요.
                </p>
                <div data-reveal className={styles.startActions}>
                    <Link
                        className={styles.startButton}
                        to="/user/survey"
                        replace
                        state={{ fromSurveyIntro: true }}
                    >
                        설문 시작하기
                    </Link>
                </div>
            </div>
        </main>
    );
};

export default UserSurveyIntro;
