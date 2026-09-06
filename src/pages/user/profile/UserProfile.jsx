import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import Header from "../../../components/common/header/Header";
import authStore from "../../../store/authStore";
import { requestMySurvey } from "../../../api/surveyApi";
import { requestMyTeam } from "../../../api/teamApi";
import { roleLabels } from "../../../constants/student";
import useInView from "../../../hooks/useInView";
import styles from "./UserProfile.module.css";
import { requestChangePassword, requestLogout } from "../../../api/authApi";
import { getApiErrorMessage } from "../../../utils/apiError";
import { getStudentNumberInfo } from "../../../utils/student";

const personalityFields = [
    { key: "ideaPlanning", label: "기획" },
    { key: "communication", label: "소통" },
    { key: "roleFlexibility", label: "유연 역할" },
    { key: "timePressure", label: "시간 대응" },
    { key: "staminaFocus", label: "집중 유지" },
];

const developmentFields = [
    { key: "implementation", label: "실행력" },
    { key: "problemSolving", label: "문제 해결" },
    { key: "completionQuality", label: "완성도" },
    { key: "presentation", label: "발표" },
    { key: "leadership", label: "리더십" },
];

const getSurveyScore = (survey, groupKey, fieldKey) => {
    const directScore = survey?.[fieldKey];
    const groupedScore = survey?.[groupKey]?.[fieldKey];
    const score = Number(directScore ?? groupedScore ?? 0);

    return Number.isFinite(score) ? score : 0;
};

const UserProfile = () => {
    const navigate = useNavigate();
    const user = authStore((state) => state.user);
    const logout = authStore((state) => state.logout);
    const [currentPassword, setCurrentPassword] = useState("");
    const [newPassword, setNewPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [isSubmittingPassword, setIsSubmittingPassword] = useState(false);
    const [error, setError] = useState("");
    const [isEditingPassword, setIsEditingPassword] = useState(false);
    const [successMessage, setSuccessMessage] = useState("");
    const [survey, setSurvey] = useState(null);
    const [myTeam, setMyTeam] = useState(null);
    const [profileError, setProfileError] = useState("");

    const profile = {
        name: user?.name || "",
        userId: user?.userId || "",
    };

    const canSubmitPassword = Boolean(
        currentPassword &&
            newPassword &&
            confirmPassword &&
            !isSubmittingPassword
    );

    const studentNumber = getStudentNumberInfo(profile.userId).number;

    const skillList = useMemo(() => {
        if (Array.isArray(survey?.skill)) return survey.skill;
        if (Array.isArray(survey?.skills)) return survey.skills;
        return [];
    }, [survey]);

    const teamDisplayName =
        myTeam?.projectTeamName ||
        myTeam?.project?.teamName ||
        myTeam?.teamName ||
        "미배정";

    const personalityChart = personalityFields.map((field) => ({
        ...field,
        score: getSurveyScore(survey, "personalityScores", field.key),
    }));
    const developmentChart = developmentFields.map((field) => ({
        ...field,
        score: getSurveyScore(survey, "developmentScores", field.key),
    }));

    useEffect(() => {
        const getProfileSummary = async () => {
            try {
                const [surveyData, teamData] = await Promise.allSettled([
                    requestMySurvey(),
                    requestMyTeam(),
                ]);

                if (surveyData.status === "fulfilled") {
                    setSurvey(surveyData.value);
                }

                if (teamData.status === "fulfilled") {
                    setMyTeam(teamData.value);
                }

                if (
                    surveyData.status === "rejected" &&
                    teamData.status === "rejected"
                ) {
                    setProfileError("설문과 팀 정보를 불러오지 못했습니다.");
                }
            } catch {
                setProfileError("프로필 요약 정보를 불러오지 못했습니다.");
            }
        };

        getProfileSummary();
    }, []);

    const handleLogout = async () => {
        try {
            await requestLogout();
        } finally {
            logout();
            navigate("/login", { replace: true });
        }
    };

    const handlePasswordSubmit = async (e) => {
        e.preventDefault();

        if (!currentPassword) {
            setError("기존 비밀번호를 입력해주세요.");
            return;
        }

        if (!newPassword) {
            setError("새 비밀번호를 입력해주세요.");
            return;
        }
        if (currentPassword === newPassword) {
            setError("기존 비밀번호와 새 비밀번호가 같습니다.");
            return;
        }

        if (newPassword !== confirmPassword) {
            setError("새 비밀번호가 일치하지 않습니다.");
            return;
        }
        setError("");

        try {
            setIsSubmittingPassword(true);

            await requestChangePassword({
                password: currentPassword,
                newPassword,
                checkPassword: confirmPassword,
            });
            setSuccessMessage("비밀번호 변경이 완료되었습니다.");
            setIsEditingPassword(false);
            setCurrentPassword("");
            setNewPassword("");
            setConfirmPassword("");
        } catch (e) {
            setError(getApiErrorMessage(e, "비밀번호 변경에 실패했습니다."));
        } finally {
            setIsSubmittingPassword(false);
        }
    };

    const contentRef = useInView();
    const initial = profile.name?.trim().charAt(0) ?? "";

    return (
        <div className={styles.page}>
            <Header />

            <main className={styles.body} ref={contentRef}>
                <div className={styles.inner}>
                    <section className={styles.accountHead}>
                        <div className={styles.accountMain}>
                            <span data-reveal className={styles.avatar}>
                                {initial}
                            </span>
                            <div>
                                <p data-reveal className={styles.accountRole}>
                                    학생 계정
                                </p>
                                <h1 data-reveal className={styles.accountName}>
                                    {profile.name}
                                </h1>
                                <p data-reveal className={styles.accountMeta}>
                                    {studentNumber}
                                </p>
                            </div>
                        </div>

                        <button
                            type="button"
                            data-reveal
                            className={styles.logoutButton}
                            onClick={handleLogout}
                        >
                            로그아웃
                        </button>
                    </section>

                    <div className={styles.columns}>
                        <div className={styles.infoColumn}>
                            <section>
                                <h2 data-reveal className={styles.sectionTitle}>
                                    기본 정보
                                </h2>
                                <div className={styles.infoRows}>
                                    <div data-reveal className={styles.infoRow}>
                                        <span>희망 직군</span>
                                        <strong>
                                            {roleLabels[survey?.studentRole] ||
                                                survey?.studentRole ||
                                                "설문 미입력"}
                                        </strong>
                                    </div>
                                    <div data-reveal className={styles.infoRow}>
                                        <span>배정된 팀</span>
                                        <strong>{teamDisplayName}</strong>
                                    </div>
                                </div>
                            </section>

                            <section className={styles.section}>
                                <h2 data-reveal className={styles.sectionTitle}>
                                    기술 스택
                                </h2>
                                <div data-reveal className={styles.stackList}>
                                    {skillList.length > 0 ? (
                                        skillList.map((skill) => (
                                            <span
                                                key={skill}
                                                className={styles.stackChip}
                                            >
                                                {skill}
                                            </span>
                                        ))
                                    ) : (
                                        <p className={styles.emptyText}>
                                            입력된 기술 스택이 없어요.
                                        </p>
                                    )}
                                </div>
                            </section>

                            <section className={styles.section}>
                                <div
                                    data-reveal
                                    className={styles.chartSectionHead}
                                >
                                    <h2 className={styles.sectionTitle}>
                                        성향 차트
                                    </h2>
                                    <span className={styles.chartNote}>
                                        5점 기준
                                    </span>
                                </div>

                                <div className={styles.chartGroups}>
                                    {[
                                        {
                                            title: "캡스톤 협업 성향",
                                            traits: personalityChart,
                                        },
                                        {
                                            title: "캡스톤 실행 성향",
                                            traits: developmentChart,
                                        },
                                    ].map((group) => (
                                        <div key={group.title} data-reveal>
                                            <h3
                                                className={styles.chartTitle}
                                            >
                                                {group.title}
                                            </h3>
                                            <div className={styles.traitList}>
                                                {group.traits.map((trait) => (
                                                    <div
                                                        key={trait.key}
                                                        className={
                                                            styles.traitRow
                                                        }
                                                    >
                                                        <span
                                                            className={
                                                                styles.traitLabel
                                                            }
                                                        >
                                                            {trait.label}
                                                        </span>
                                                        <div
                                                            className={
                                                                styles.traitTrack
                                                            }
                                                        >
                                                            <div
                                                                className={
                                                                    styles.traitBar
                                                                }
                                                                style={{
                                                                    width: `${Math.min(
                                                                        trait.score *
                                                                            20,
                                                                        100
                                                                    )}%`,
                                                                }}
                                                            />
                                                        </div>
                                                        <strong
                                                            className={
                                                                styles.traitScore
                                                            }
                                                        >
                                                            {trait.score
                                                                ? trait.score.toFixed(
                                                                      1
                                                                  )
                                                                : "-"}
                                                        </strong>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </section>

                            {profileError && (
                                <p className={styles.errorText}>
                                    {profileError}
                                </p>
                            )}
                        </div>

                        <aside className={styles.passwordColumn}>
                            <div className={styles.passwordCard}>
                                <div className={styles.passwordHead}>
                                    <h2 className={styles.passwordTitle}>
                                        비밀번호 변경
                                    </h2>
                                    {!isEditingPassword && (
                                        <button
                                            type="button"
                                            className={styles.textButton}
                                            onClick={() => {
                                                setError("");
                                                setSuccessMessage("");
                                                setIsEditingPassword(true);
                                            }}
                                        >
                                            변경하기
                                        </button>
                                    )}
                                </div>

                                {isEditingPassword ? (
                                    <form
                                        className={styles.passwordForm}
                                        onSubmit={handlePasswordSubmit}
                                    >
                                        <label className={styles.passwordField}>
                                            <span>기존 비밀번호</span>
                                            <input
                                                type="password"
                                                placeholder="기존 비밀번호를 입력해주세요"
                                                value={currentPassword}
                                                onChange={(event) =>
                                                    setCurrentPassword(
                                                        event.target.value
                                                    )
                                                }
                                            />
                                        </label>

                                        <label className={styles.passwordField}>
                                            <span>새 비밀번호</span>
                                            <input
                                                type="password"
                                                placeholder="새 비밀번호를 입력해주세요"
                                                value={newPassword}
                                                onChange={(event) =>
                                                    setNewPassword(
                                                        event.target.value
                                                    )
                                                }
                                            />
                                        </label>

                                        <label className={styles.passwordField}>
                                            <span>새 비밀번호 확인</span>
                                            <input
                                                type="password"
                                                placeholder="새 비밀번호를 다시 입력해주세요"
                                                value={confirmPassword}
                                                onChange={(event) =>
                                                    setConfirmPassword(
                                                        event.target.value
                                                    )
                                                }
                                            />
                                        </label>

                                        {error && (
                                            <p className={styles.errorText}>
                                                {error}
                                            </p>
                                        )}

                                        <div
                                            className={styles.passwordActions}
                                        >
                                            <button
                                                type="submit"
                                                className={
                                                    styles.primaryButton
                                                }
                                                disabled={!canSubmitPassword}
                                            >
                                                {isSubmittingPassword
                                                    ? "저장 중..."
                                                    : "변경하기"}
                                            </button>
                                            <button
                                                type="button"
                                                className={styles.ghostButton}
                                                onClick={() => {
                                                    setError("");
                                                    setIsEditingPassword(
                                                        false
                                                    );
                                                }}
                                            >
                                                취소
                                            </button>
                                        </div>
                                    </form>
                                ) : (
                                    <div className={styles.passwordPreview}>
                                        <p className={styles.passwordLabel}>
                                            비밀번호
                                        </p>
                                        <p className={styles.passwordDots}>
                                            ••••••••
                                        </p>
                                        {successMessage && (
                                            <p
                                                className={styles.successText}
                                            >
                                                {successMessage}
                                            </p>
                                        )}
                                    </div>
                                )}
                            </div>
                        </aside>
                    </div>
                </div>
            </main>
        </div>
    );
};

export default UserProfile;
