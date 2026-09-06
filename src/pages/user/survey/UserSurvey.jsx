import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { requestSubmitSurvey } from "../../../api/surveyApi";
import { requestStudentSearch } from "../../../api/studentApi";
import { gradeLabels, roleLabels } from "../../../constants/team";
import authStore from "../../../store/authStore";
import { requestLogout } from "../../../api/authApi";
import { getApiErrorMessage } from "../../../utils/apiError";
import styles from "./UserSurvey.module.css";
import {
    roles,
    personalityGroups,
    developmentGroups,
    roleToStudentRole,
} from "../../../constants/survey";
import {
    flattenQuestions,
    calculateAverageScores,
    getSkillsFromText,
    calculateInconsistentAnswers,
    getReliabilityLevel,
} from "../../../utils/survey";

import { RatingRow } from "../../../components/user/survey/UserSurveyForm";

const personalityQuestions = flattenQuestions(personalityGroups, "personality");
const developmentQuestions = flattenQuestions(developmentGroups, "development");
const allRatingQuestions = [...personalityQuestions, ...developmentQuestions];
const SURVEY_DRAFT_STORAGE_KEY = "capteam-survey-draft";

const defaultExperiences = [
    {
        id: 1,
        value: "",
    },
];

const getSurveyDraftKey = (userId) =>
    userId ? `${SURVEY_DRAFT_STORAGE_KEY}-${userId}` : SURVEY_DRAFT_STORAGE_KEY;

const getStoredSurveyDraft = (userId) => {
    try {
        const storedDraft = localStorage.getItem(getSurveyDraftKey(userId));

        return storedDraft ? JSON.parse(storedDraft) : null;
    } catch {
        return null;
    }
};

const getSurveySubmitErrorMessage = (error) => {
    const serverMessage = getApiErrorMessage(error, "");

    if (error.isAuthExpired || error.response?.status === 401) {
        return "로그인이 만료되었습니다. 다시 로그인한 뒤 설문을 제출해주세요.";
    }

    if (!error.response) {
        return "서버와 연결하지 못했습니다. 네트워크 상태를 확인한 뒤 다시 제출해주세요.";
    }

    if (
        serverMessage.includes("student_level") ||
        serverMessage.includes("Data truncated") ||
        serverMessage.includes("could not execute statement")
    ) {
        return "설문 분석 결과를 저장하는 중 문제가 발생했습니다. 잠시 후 다시 제출해주세요.";
    }

    if (
        error.response.status === 503 ||
        serverMessage.includes("AI 학생 분석") ||
        serverMessage.includes("AI 서버")
    ) {
        return "학생 분석에 실패했어요. 설문은 저장되지 않았으니 잠시 후 다시 제출해주세요.";
    }

    if (error.response.status >= 500) {
        return "서버에서 설문을 처리하는 중 문제가 발생했습니다. 잠시 후 다시 시도해주세요.";
    }

    return (
        serverMessage ||
        "설문 저장 중 오류가 발생했습니다. 입력 내용을 확인한 뒤 다시 제출해주세요."
    );
};

const UserSurvey = () => {
    const navigate = useNavigate();
    const user = authStore((state) => state.user);
    const accessToken = authStore((state) => state.accessToken);
    const saveLogin = authStore((state) => state.saveLogin);
    const logout = authStore((state) => state.logout);

    const handleLogout = async () => {
        try {
            await requestLogout();
        } finally {
            logout();
            navigate("/login", { replace: true });
        }
    };
    const roleSectionRef = useRef(null);
    const stackSectionRef = useRef(null);
    const experienceSectionRef = useRef(null);
    const leaderSectionRef = useRef(null);
    const personalitySectionRef = useRef(null);
    const developmentSectionRef = useRef(null);
    const submitAreaRef = useRef(null);
    const questionRefs = useRef({});
    const storedDraft = useMemo(
        () => getStoredSurveyDraft(user?.userId),
        [user?.userId]
    );
    const [selectedRole, setSelectedRole] = useState(
        () => storedDraft?.selectedRole ?? ""
    );
    const [stackText, setStackText] = useState(
        () => storedDraft?.stackText ?? ""
    );
    const [experiences, setExperiences] = useState(() =>
        storedDraft?.experiences?.length
            ? storedDraft.experiences
            : defaultExperiences
    );
    const [preferredTeammates, setPreferredTeammates] = useState(
        () => storedDraft?.preferredTeammates ?? []
    );
    const [preferredKeyword, setPreferredKeyword] = useState("");
    const [preferredResults, setPreferredResults] = useState([]);
    const [isSearchingPreferred, setIsSearchingPreferred] = useState(false);
    const [leaderPreference, setLeaderPreference] = useState(
        () => storedDraft?.leaderPreference ?? ""
    );
    const [answers, setAnswers] = useState(() => storedDraft?.answers ?? {});
    const [error, setError] = useState("");
    const [isSubmitting, setIsSubmitting] = useState(false);

    const cleanSkills = useMemo(
        () => getSkillsFromText(stackText),
        [stackText]
    );
    const completedExperienceCount = experiences.filter((experience) =>
        experience.value.trim()
    ).length;
    const personalityAnswerCount = personalityQuestions.filter(
        (question) => answers[question.id]
    ).length;
    const developmentAnswerCount = developmentQuestions.filter(
        (question) => answers[question.id]
    ).length;
    const completedRequiredCount =
        Number(Boolean(selectedRole)) +
        Number(cleanSkills.length > 0) +
        Number(completedExperienceCount > 0) +
        Number(Boolean(leaderPreference)) +
        personalityAnswerCount +
        developmentAnswerCount;
    const totalRequiredCount = 4 + allRatingQuestions.length;
    const progressPercent = Math.round(
        (completedRequiredCount / totalRequiredCount) * 100
    );
    const isSurveyReady = completedRequiredCount === totalRequiredCount;

    useEffect(() => {
        const surveyDraft = {
            selectedRole,
            stackText,
            experiences,
            preferredTeammates,
            leaderPreference,
            answers,
        };

        localStorage.setItem(
            getSurveyDraftKey(user?.userId),
            JSON.stringify(surveyDraft)
        );
    }, [
        selectedRole,
        stackText,
        experiences,
        preferredTeammates,
        leaderPreference,
        answers,
        user?.userId,
    ]);

    useEffect(() => {
        const surveyUrl = window.location.href;

        window.history.pushState(null, "", surveyUrl);

        const blockBack = (event) => {
            event.preventDefault();
            event.stopImmediatePropagation();
            window.history.pushState(null, "", surveyUrl);
        };

        const blockRefresh = (event) => {
            event.preventDefault();
            event.returnValue = "";
        };

        window.addEventListener("popstate", blockBack, true);
        window.addEventListener("beforeunload", blockRefresh);

        return () => {
            window.removeEventListener("popstate", blockBack, true);
            window.removeEventListener("beforeunload", blockRefresh);
        };
    }, []);

    const scrollToSection = (sectionRef) => {
        requestAnimationFrame(() => {
            sectionRef.current?.scrollIntoView({
                behavior: "smooth",
                block: "center",
            });
        });
    };

    const scrollToQuestion = (questionId, fallbackRef) => {
        requestAnimationFrame(() => {
            const questionElement = questionRefs.current[questionId];

            if (questionElement) {
                questionElement.scrollIntoView({
                    behavior: "smooth",
                    block: "center",
                });
                return;
            }

            fallbackRef.current?.scrollIntoView({
                behavior: "smooth",
                block: "center",
            });
        });
    };

    const scrollToNextQuestion = (questionId) => {
        const currentQuestionIndex = allRatingQuestions.findIndex(
            (question) => question.id === questionId
        );
        const nextQuestion = allRatingQuestions[currentQuestionIndex + 1];

        requestAnimationFrame(() => {
            if (nextQuestion) {
                questionRefs.current[nextQuestion.id]?.scrollIntoView({
                    behavior: "smooth",
                    block: "center",
                });
                return;
            }

            submitAreaRef.current?.scrollIntoView({
                behavior: "smooth",
                block: "center",
            });
        });
    };

    const selectRole = (role) => {
        setSelectedRole(role);
    };

    const updateExperience = (id, value) => {
        setExperiences((prevExperiences) =>
            prevExperiences.map((experience) =>
                experience.id === id ? { ...experience, value } : experience
            )
        );
    };

    const addExperience = () => {
        setExperiences((prevExperiences) => [
            ...prevExperiences,
            {
                id: crypto.randomUUID(), // 고유한 ID 생성해주는 함수
                value: "",
            },
        ]);
    };

    const removeExperience = (id) => {
        setExperiences((prevExperiences) =>
            prevExperiences.filter((experience) => experience.id !== id)
        );
    };

    const selectPreferredTeammate = (student) => {
        if (preferredTeammates.length >= 3) return;
        if (preferredTeammates.some((m) => m.userId === student.userId)) return;

        setPreferredTeammates((prevMembers) => [...prevMembers, student]);
        setPreferredKeyword("");
        setPreferredResults([]);
    };

    const removePreferredTeammate = (userId) => {
        setPreferredTeammates((prevMembers) =>
            prevMembers.filter((member) => member.userId !== userId)
        );
    };

    useEffect(() => {
        const keyword = preferredKeyword.trim();

        if (!keyword || preferredTeammates.length >= 3) {
            setPreferredResults([]);
            return undefined;
        }

        let ignore = false;
        const timeoutId = window.setTimeout(async () => {
            try {
                setIsSearchingPreferred(true);

                const results = await requestStudentSearch(keyword);
                const selectedIds = new Set(
                    preferredTeammates.map((member) => member.userId)
                );

                if (!ignore) {
                    setPreferredResults(
                        (results ?? []).filter(
                            (student) =>
                                student.userId !== user?.userId &&
                                !selectedIds.has(student.userId)
                        )
                    );
                }
            } catch {
                if (!ignore) setPreferredResults([]);
            } finally {
                if (!ignore) setIsSearchingPreferred(false);
            }
        }, 300);

        return () => {
            ignore = true;
            window.clearTimeout(timeoutId);
        };
    }, [preferredKeyword, preferredTeammates, user?.userId]);

    const updateAnswer = (questionId, score) => {
        const isFirstAnswer = !answers[questionId];

        setAnswers((prevAnswers) => ({
            ...prevAnswers,
            [questionId]: score,
        }));

        if (isFirstAnswer) {
            scrollToNextQuestion(questionId);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        const cleanExperiences = experiences
            .map((experience) => experience.value.trim())
            .filter(Boolean);
        const cleanPreferredMembers = preferredTeammates.map(
            (member) => member.userId
        );

        if (!selectedRole) {
            setError("희망 직군을 선택해주세요.");
            scrollToSection(roleSectionRef);
            return;
        }

        if (cleanSkills.length === 0) {
            setError("사용 가능한 기술 스택을 입력해주세요.");
            scrollToSection(stackSectionRef);
            return;
        }

        if (cleanExperiences.length === 0) {
            setError("구현 경험을 1개 이상 입력해주세요.");
            scrollToSection(experienceSectionRef);
            return;
        }

        if (!leaderPreference) {
            setError("팀장 선호 여부를 선택해주세요.");
            scrollToSection(leaderSectionRef);
            return;
        }

        const hasEmptyRating = allRatingQuestions.some(
            (question) => !answers[question.id]
        );

        if (hasEmptyRating) {
            setError(
                "캡스톤 협업 성향과 캡스톤 실행 성향 문항을 모두 선택해주세요."
            );
            const firstEmptyPersonalityQuestion = personalityQuestions.find(
                (question) => !answers[question.id]
            );
            const firstEmptyDevelopmentQuestion = developmentQuestions.find(
                (question) => !answers[question.id]
            );
            const firstEmptyQuestion =
                firstEmptyPersonalityQuestion || firstEmptyDevelopmentQuestion;

            scrollToQuestion(
                firstEmptyQuestion.id,
                firstEmptyPersonalityQuestion
                    ? personalitySectionRef
                    : developmentSectionRef
            );
            return;
        }

        setError("");
        const personalityInconsistentCount = calculateInconsistentAnswers(
            personalityGroups,
            answers,
            "personality"
        );

        const developmentInconsistentCount = calculateInconsistentAnswers(
            developmentGroups,
            answers,
            "development"
        );

        const inconsistentAnswers =
            personalityInconsistentCount + developmentInconsistentCount;

        const responseReliability = getReliabilityLevel(inconsistentAnswers);
        const surveyData = {
            studentRole: roleToStudentRole[selectedRole],
            selectedRoles: [selectedRole],
            stackText,
            skill: cleanSkills,
            experience: cleanExperiences,
            experiences: cleanExperiences.map((experience) => ({
                value: experience,
            })),
            preferredTeammates: cleanPreferredMembers,
            preferredMembers: cleanPreferredMembers,
            wantsLeader: leaderPreference === "O",
            leaderPreference,
            personalityScores: calculateAverageScores(
                personalityGroups,
                answers,
                "personality"
            ),
            developmentScores: calculateAverageScores(
                developmentGroups,
                answers,
                "development"
            ),
            personalityInconsistentCount,
            developmentInconsistentCount,
            inconsistentAnswers,
            responseReliability,
        };

        try {
            setIsSubmitting(true);
            await requestSubmitSurvey(surveyData);
            localStorage.removeItem(getSurveyDraftKey(user?.userId));

            if (user && accessToken) {
                saveLogin(
                    {
                        ...user,
                        surveyCompleted: true,
                    },
                    accessToken
                );
            }

            navigate("/user/dashboard", { replace: true });
        } catch (e) {
            console.error("설문 제출 실패:", e);
            setError(getSurveySubmitErrorMessage(e));
        } finally {
            setIsSubmitting(false);
        }
    };

    // 분석 중에는 긴 폼을 그대로 두면 안내가 화면 맨 아래에 묻힌다.
    // 분석 화면만 남기고 화면 가운데에 보여준다.
    if (isSubmitting) {
        return (
            <div className={styles.page}>
                <main className={styles.analysisPage}>
                    <div className={styles.analysisBox} aria-live="polite">
                        <p className={styles.analysisEyebrow}>설문 분석 중</p>
                        <h1 className={styles.analysisTitle}>
                            설문을 분석하고 있어요
                        </h1>
                        <p className={styles.analysisDesc}>
                            캡스톤 역량과 성향을 정리해
                            <br />팀 추천 데이터를 준비하는 중이에요.
                        </p>
                        <div className={styles.analysisFlow} aria-hidden="true" />
                        <p className={styles.analysisNote}>
                            창을 닫지 말고 잠시만 기다려주세요.
                        </p>
                    </div>
                </main>
            </div>
        );
    }

    return (
        <div className={styles.page}>
            <main className={styles.body}>
                <section className={styles.surveyNav}>
                    <div className={styles.navTop}>
                        <div className={styles.progressSummary}>
                            <strong>설문 진행률 {progressPercent}%</strong>
                            <span>
                                필수 항목 {completedRequiredCount}/
                                {totalRequiredCount}개 완료
                            </span>
                        </div>
                        <button
                            type="button"
                            className={styles.logoutButton}
                            onClick={handleLogout}
                        >
                            로그아웃
                        </button>
                    </div>
                    <div
                        className={styles.progressBar}
                        aria-label={`설문 진행률 ${progressPercent}%`}
                    >
                        <span style={{ width: `${progressPercent}%` }} />
                    </div>
                    <div className={styles.stepStatusList}>
                        <span
                            className={
                                selectedRole &&
                                cleanSkills.length > 0 &&
                                completedExperienceCount > 0 &&
                                leaderPreference
                                    ? styles.completedStep
                                    : ""
                            }
                        >
                            기술 정보
                        </span>
                        <span
                            className={
                                personalityAnswerCount ===
                                personalityQuestions.length
                                    ? styles.completedStep
                                    : ""
                            }
                        >
                            협업 {personalityAnswerCount}/
                            {personalityQuestions.length}
                        </span>
                        <span
                            className={
                                developmentAnswerCount ===
                                developmentQuestions.length
                                    ? styles.completedStep
                                    : ""
                            }
                        >
                            실행 {developmentAnswerCount}/
                            {developmentQuestions.length}
                        </span>
                    </div>
                </section>

                <section className={styles.layout}>
                    <form className={styles.form} onSubmit={handleSubmit}>
                        <section className={styles.card}>
                            <div className={styles.cardHeader}>
                                <span>STEP 1</span>
                                <h2>기술 정보</h2>
                                <p>
                                    캡스톤 팀 매칭에 사용할 희망 역할, 기술
                                    스택, 구현 경험을 입력해주세요.
                                </p>
                            </div>

                            <div
                                ref={roleSectionRef}
                                className={styles.formSection}
                            >
                                <div className={styles.sectionTitleArea}>
                                    <h3>희망 직군</h3>
                                    <p>희망하는 직군을 선택해주세요.</p>
                                </div>

                                <div className={styles.roleList}>
                                    {roles.map((role) => (
                                        <button
                                            key={role}
                                            type="button"
                                            className={`${
                                                styles.optionButton
                                            } ${
                                                selectedRole === role
                                                    ? styles.selectedOption
                                                    : ""
                                            }`}
                                            onClick={() => selectRole(role)}
                                        >
                                            {role}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <div
                                ref={stackSectionRef}
                                className={styles.formSection}
                            >
                                <div className={styles.sectionTitleArea}>
                                    <h3>사용 가능한 기술 스택</h3>
                                    <p>
                                        사용할 수 있는 기술을 쉼표로 구분해서
                                        작성해주세요.
                                    </p>
                                </div>

                                <textarea
                                    className={styles.stackTextarea}
                                    value={stackText}
                                    placeholder="예: React, JavaScript, Spring, MySQL 또는 React/JavaScript/MySQL"
                                    onChange={(e) =>
                                        setStackText(e.target.value)
                                    }
                                />
                            </div>

                            <div
                                ref={experienceSectionRef}
                                className={styles.formSection}
                            >
                                <div className={styles.sectionTitleArea}>
                                    <h3>구현 경험</h3>
                                    <p>
                                        구현한 기능과 사용한 기술, 맡았던 로직을
                                        한 줄로 정리해주세요.
                                    </p>
                                </div>

                                <div className={styles.dynamicList}>
                                    {experiences.map((experience, index) => (
                                        <div
                                            key={experience.id}
                                            className={styles.dynamicItem}
                                        >
                                            <div className={styles.itemHeader}>
                                                <strong>
                                                    경험 {index + 1}
                                                </strong>
                                                {experiences.length > 1 && (
                                                    <button
                                                        type="button"
                                                        onClick={() =>
                                                            removeExperience(
                                                                experience.id
                                                            )
                                                        }
                                                    >
                                                        삭제
                                                    </button>
                                                )}
                                            </div>
                                            <textarea
                                                value={experience.value}
                                                placeholder="예: 로그인 기능 구현 - axios를 이용한 API 호출 및 zustand를 사용한 토큰 전역 관리"
                                                onChange={(e) =>
                                                    updateExperience(
                                                        experience.id,
                                                        e.target.value
                                                    )
                                                }
                                            />
                                        </div>
                                    ))}
                                </div>

                                <button
                                    type="button"
                                    className={styles.addButton}
                                    onClick={addExperience}
                                >
                                    구현 경험 추가
                                </button>
                            </div>

                            <div className={styles.formSection}>
                                <div className={styles.sectionTitleArea}>
                                    <h3>선호 팀원</h3>
                                    <p>
                                        함께 팀을 하고 싶은 학생을 검색해서
                                        최대 3명까지 선택할 수 있습니다.
                                    </p>
                                </div>

                                {preferredTeammates.length > 0 && (
                                    <div className={styles.preferredChipList}>
                                        {preferredTeammates.map((member) => (
                                            <span
                                                key={member.userId}
                                                className={styles.preferredChip}
                                            >
                                                {member.name}
                                                <button
                                                    type="button"
                                                    aria-label={`${member.name} 선택 해제`}
                                                    onClick={() =>
                                                        removePreferredTeammate(
                                                            member.userId
                                                        )
                                                    }
                                                >
                                                    ×
                                                </button>
                                            </span>
                                        ))}
                                    </div>
                                )}

                                {preferredTeammates.length < 3 && (
                                    <div
                                        className={styles.preferredSearchArea}
                                    >
                                        <input
                                            type="text"
                                            className={styles.preferredSearchInput}
                                            value={preferredKeyword}
                                            placeholder="이름 또는 학번으로 검색"
                                            onChange={(e) =>
                                                setPreferredKeyword(
                                                    e.target.value
                                                )
                                            }
                                        />

                                        {preferredKeyword.trim() && (
                                            <ul
                                                className={
                                                    styles.preferredResultList
                                                }
                                            >
                                                {isSearchingPreferred && (
                                                    <li
                                                        className={
                                                            styles.preferredResultEmpty
                                                        }
                                                    >
                                                        검색하는 중입니다.
                                                    </li>
                                                )}

                                                {!isSearchingPreferred &&
                                                    preferredResults.length ===
                                                        0 && (
                                                        <li
                                                            className={
                                                                styles.preferredResultEmpty
                                                            }
                                                        >
                                                            검색 결과가
                                                            없습니다.
                                                        </li>
                                                    )}

                                                {preferredResults.map(
                                                    (student) => (
                                                        <li
                                                            key={
                                                                student.userId
                                                            }
                                                        >
                                                            <button
                                                                type="button"
                                                                onClick={() =>
                                                                    selectPreferredTeammate(
                                                                        student
                                                                    )
                                                                }
                                                            >
                                                                <strong>
                                                                    {
                                                                        student.name
                                                                    }
                                                                </strong>
                                                                <span>
                                                                    {student.grade
                                                                        ? `${gradeLabels[student.grade] ?? student.grade} `
                                                                        : ""}
                                                                    {roleLabels[
                                                                        student.studentRole
                                                                    ] ?? ""}
                                                                </span>
                                                            </button>
                                                        </li>
                                                    )
                                                )}
                                            </ul>
                                        )}
                                    </div>
                                )}
                            </div>

                            <div
                                ref={leaderSectionRef}
                                className={styles.formSection}
                            >
                                <div className={styles.sectionTitleArea}>
                                    <h3>팀장 선호 여부</h3>
                                    <p>팀장 역할을 맡고 싶은지 선택해주세요.</p>
                                </div>

                                <div className={styles.binaryGroup}>
                                    {["O", "X"].map((value) => (
                                        <button
                                            key={value}
                                            type="button"
                                            className={`${
                                                styles.binaryButton
                                            } ${
                                                leaderPreference === value
                                                    ? styles.selectedOption
                                                    : ""
                                            }`}
                                            onClick={() =>
                                                setLeaderPreference(value)
                                            }
                                        >
                                            {value}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </section>

                        <section
                            ref={personalitySectionRef}
                            className={styles.card}
                        >
                            <div className={styles.cardHeader}>
                                <span>STEP 2</span>
                                <h2>캡스톤 협업 성향</h2>
                                <p>
                                    아이디어 정리, 소통, 역할 유연성, 일정 압박
                                    대응, 집중 유지 성향을 확인합니다.
                                </p>
                            </div>

                            <ul className={styles.questionList}>
                                {personalityQuestions.map((question, index) => (
                                    <RatingRow
                                        key={question.id}
                                        ref={(element) => {
                                            questionRefs.current[question.id] =
                                                element;
                                        }}
                                        number={index + 1}
                                        question={question.question}
                                        value={answers[question.id]}
                                        onChange={(score) =>
                                            updateAnswer(question.id, score)
                                        }
                                    />
                                ))}
                            </ul>
                        </section>

                        <section
                            ref={developmentSectionRef}
                            className={styles.card}
                        >
                            <div className={styles.cardHeader}>
                                <span>STEP 3</span>
                                <h2>캡스톤 실행 성향</h2>
                                <p>
                                    개발 실행력, 문제 해결, 완성도, 발표, 리더십
                                    정리 성향을 선택해주세요.
                                </p>
                            </div>

                            <ul className={styles.questionList}>
                                {developmentQuestions.map((question, index) => (
                                    <RatingRow
                                        key={question.id}
                                        ref={(element) => {
                                            questionRefs.current[question.id] =
                                                element;
                                        }}
                                        number={index + 16}
                                        question={question.question}
                                        value={answers[question.id]}
                                        onChange={(score) =>
                                            updateAnswer(question.id, score)
                                        }
                                    />
                                ))}
                            </ul>
                        </section>

                        <div
                            ref={submitAreaRef}
                            className={styles.submitArea}
                        >
                            <p className={error ? styles.errorText : ""}>
                                {error ||
                                    (isSurveyReady
                                        ? "필수 항목이 모두 입력되었습니다. 제출 전 내용을 한 번만 확인해주세요."
                                        : "제출 후에는 마이페이지에서 일부 정보를 수정할 수 있습니다.")}
                            </p>
                            <button type="submit">설문 제출</button>
                        </div>
                    </form>
                </section>
            </main>
        </div>
    );
};

export default UserSurvey;
