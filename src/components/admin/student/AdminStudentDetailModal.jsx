import { useNavigate } from "react-router-dom";
import { levelLabels, roleLabels } from "../../../constants/student";
import { getStudentNumberInfo } from "../../../utils/student";
import ModalOverlay from "../../common/modal/ModalOverlay";
import { useModalClose } from "../../common/modal/modalCloseContext";
import useInView from "../../../hooks/useInView";
import styles from "./AdminStudentDetailModal.module.css";
import {
    PolarAngleAxis,
    PolarGrid,
    PolarRadiusAxis,
    Radar,
    RadarChart,
    ResponsiveContainer,
} from "recharts";

const getDevelopmentChartData = (student) => [
    { label: "실행력", score: student.implementation },
    { label: "문제 해결", score: student.problemSolving },
    { label: "완성도", score: student.completionQuality },
    { label: "발표", score: student.presentation },
    { label: "리더십", score: student.leadership },
];

const getPersonalityChartData = (student) => [
    { label: "기획", score: student.ideaPlanning },
    { label: "소통", score: student.communication },
    { label: "유연 역할", score: student.roleFlexibility },
    { label: "시간 대응", score: student.timePressure },
    { label: "집중 유지", score: student.staminaFocus },
];

const reliabilityLabels = {
    HIGH: "높음",
    MEDIUM: "보통",
    LOW: "낮음",
};

const getAnalysisDisplay = (student) => {
    const status = student.analysisStatus;

    if (status === "PENDING") {
        return { levelText: "분석 중", resultText: "분석이 진행 중입니다. 잠시 후 다시 확인해주세요." };
    }

    if (status === "FAILED") {
        return {
            levelText: "분석 실패",
            resultText: "분석에 실패했습니다. 잠시 후 다시 시도해주세요.",
            isFailed: true,
        };
    }

    return {
        levelText: levelLabels[student.studentLevel] || student.studentLevel || "분석 전",
        resultText:
            student.analysisResult ||
            "분석 설명을 아직 조회할 수 없습니다. 학생의 성향 점수와 기술 스택을 함께 참고해주세요.",
    };
};

const reliabilityDescriptions = {
    HIGH: "문항 간 답변 흐름이 안정적입니다.",
    MEDIUM: "일부 문항에서 답변 차이가 있어 참고가 필요합니다.",
    LOW: "문항 간 답변 차이가 커 관리자 확인이 필요합니다.",
};

const formatPreferredMember = (memberId, students = []) => {
    const numberInfo = getStudentNumberInfo(memberId);
    const matchedStudent = students.find(
        (student) => student.userId === memberId
    );

    return matchedStudent?.name
        ? `${numberInfo.number} ${matchedStudent.name}`
        : numberInfo.number || memberId;
};

const getStudentTeamKey = (student) => {
    const teamId = student?.projectTeamId ?? student?.teamId;

    if (teamId !== null && teamId !== undefined) {
        return `id:${teamId}`;
    }

    const teamName = student?.projectTeamName || student?.teamName;
    const grade = getStudentNumberInfo(student?.userId || "").number.charAt(0);

    return teamName ? `name:${grade}:${teamName}` : "";
};

const SurveyReliabilityCard = ({ student }) => {
    const reliability = student.responseReliability;
    const inconsistentCount = student.inconsistentAnswers;
    const hasReliabilityData =
        reliability !== null &&
        reliability !== undefined &&
        inconsistentCount !== null &&
        inconsistentCount !== undefined;

    return (
        <article data-reveal className={styles.reliabilityCard}>
            <div className={styles.reliabilityHeader}>
                <h3>응답 신뢰도</h3>
                {hasReliabilityData && (
                    <span
                        className={`${styles.reliabilityBadge} ${
                            styles[`reliability${reliability}`]
                        }`}
                    >
                        {reliabilityLabels[reliability] || reliability}
                    </span>
                )}
            </div>

            {hasReliabilityData ? (
                <>
                    <strong className={styles.reliabilityCount}>
                        일관성 낮은 응답 {inconsistentCount}개
                    </strong>
                    <p>
                        {reliabilityDescriptions[reliability] ||
                            "응답 신뢰도 값을 확인했습니다."}
                    </p>
                </>
            ) : (
                <p className={styles.reliabilityEmptyText}>
                    응답 신뢰도 정보를 아직 조회할 수 없습니다.
                </p>
            )}
        </article>
    );
};

const StudentRadarChart = ({ title, data }) => {
    const hasData = data.every(
        (item) => item.score !== null && item.score !== undefined
    );

    return (
        <article data-reveal className={styles.chartCard}>
            <h3>{title}</h3>

            {hasData ? (
                <div className={styles.chartBox}>
                    <ResponsiveContainer width="100%" height="100%">
                        <RadarChart data={data} outerRadius="70%">
                            <PolarGrid />
                            <PolarAngleAxis
                                dataKey="label"
                                tick={{
                                    fill: "#4e5968",
                                    fontSize: 13,
                                    fontWeight: 600,
                                }}
                            />
                            <PolarRadiusAxis
                                domain={[0, 5]}
                                tickCount={6}
                                tick={false}
                                axisLine={false}
                            />
                            <Radar
                                dataKey="score"
                                stroke="#60c49b"
                                fill="#60c49b"
                                fillOpacity={0.14}
                                strokeWidth={2}
                                dot={false}
                            />
                        </RadarChart>
                    </ResponsiveContainer>
                </div>
            ) : (
                <p className={styles.emptyChartText}>
                    성향 점수 데이터가 없습니다.
                </p>
            )}
        </article>
    );
};

const CloseButton = () => {
    const close = useModalClose();

    return (
        <button
            type="button"
            className={styles.closeButton}
            aria-label="학생 상세 모달 닫기"
            onClick={close}
        >
            ×
        </button>
    );
};

const AdminStudentDetailModal = ({
    student,
    students = [],
    modalError,
    onOpenStudent,
    onClose,
}) => {
    const navigate = useNavigate();
    const contentRef = useInView({ replayKey: student.userId });

    const developmentChartData = getDevelopmentChartData(student);
    const personalityChartData = getPersonalityChartData(student);
    const analysisDisplay = getAnalysisDisplay(student);
    const numberInfo = getStudentNumberInfo(student.userId);
    const studentTeamKey = getStudentTeamKey(student);
    const teamDisplayName =
        student.projectTeamName || student.teamName || "미배정";
    const isAssignedTeam = teamDisplayName && teamDisplayName !== "미배정";
    const isLeader = student.leaderRole === "LEADER";
    const teamMembers = isAssignedTeam && studentTeamKey
        ? students.filter((member) => {
              return (
                  member.userId !== student.userId &&
                  getStudentTeamKey(member) === studentTeamKey
              );
          })
        : [];

    const handleMemberClick = (member) => {
        if (!onOpenStudent) return;

        onOpenStudent(member);
    };
    const handleTeamClick = () => {
        if (!isAssignedTeam) return;

        onClose();
        navigate(
            `/admin/team-manage?teamName=${encodeURIComponent(teamDisplayName)}`
        );
    };

    return (
        <ModalOverlay
            onClose={onClose}
            overlayClassName={styles.modalOverlay}
            modalClassName={styles.modal}
            ariaLabelledby="student-modal-title"
        >
                <header className={styles.modalHeader}>
                    <div className={styles.meta}>
                        <div className={styles.titleRow}>
                            <h2 id="student-modal-title">{student.name}</h2>
                            <span
                                className={
                                    !student.surveyCompleted ||
                                    analysisDisplay.isFailed
                                        ? styles.levelBadgeFailed
                                        : styles.levelBadge
                                }
                            >
                                {student.surveyCompleted
                                    ? analysisDisplay.levelText
                                    : "설문 미제출"}
                            </span>
                        </div>
                        <p className={styles.metaLine}>
                            {numberInfo.classText} · {student.userId}
                        </p>
                    </div>

                    <CloseButton />
                </header>

                {modalError && <p className={styles.errorText}>{modalError}</p>}

                {!student.surveyCompleted ? (
                    <div className={styles.emptySurveyMessage}>
                        <strong>아직 설문을 제출하지 않았어요</strong>
                        <p>
                            설문을 제출하면 기술 스택, 실행·협업 성향 점수, AI
                            분석 결과를 여기에서 확인할 수 있어요.
                            <br />
                            현재는 학년·반 정보만 조회할 수 있어요.
                        </p>
                        <div className={styles.pendingClassRow}>
                            <span>학년/반/번호</span>
                            <strong>{numberInfo.classText}</strong>
                        </div>
                    </div>
                ) : (
                    <div className={styles.modalContent} ref={contentRef}>
                        <div className={styles.infoColumn}>
                            <section data-reveal className={styles.profileStrip}>
                                <div>
                                    <span>학년/반/번호</span>
                                    <strong>{numberInfo.classText}</strong>
                                </div>

                                <div>
                                    <span>희망 직군</span>
                                    <strong>
                                        {roleLabels[student.studentRole] ||
                                            student.studentRole ||
                                            "-"}
                                    </strong>
                                </div>

                                <div>
                                    <span>소속 팀</span>
                                    {isAssignedTeam ? (
                                        <button
                                            type="button"
                                            className={styles.teamLinkButton}
                                            onClick={handleTeamClick}
                                        >
                                            {teamDisplayName}
                                        </button>
                                    ) : (
                                        <strong>미배정</strong>
                                    )}
                                </div>

                                <div>
                                    <span>
                                        {isAssignedTeam
                                            ? "팀 역할"
                                            : "팀장 선호"}
                                    </span>
                                    <strong>
                                        {isAssignedTeam
                                            ? isLeader
                                                ? "팀장"
                                                : "팀원"
                                            : student.wantsLeader
                                            ? "O"
                                            : "X"}
                                    </strong>
                                </div>
                            </section>

                            <section data-reveal className={styles.trackSection}>
                                <div className={styles.sectionHeader}>
                                    <h3>기술 스택 · 구현 경험</h3>
                                </div>

                                <div className={styles.chipRow}>
                                    {(student.skill || []).length > 0 ? (
                                        student.skill.map((skill) => (
                                            <span
                                                key={skill}
                                                className={styles.chip}
                                            >
                                                {skill}
                                            </span>
                                        ))
                                    ) : (
                                        <span className={styles.emptyInlineText}>
                                            기술 스택 없음
                                        </span>
                                    )}
                                </div>

                                <ul className={styles.timelineList}>
                                    {(student.experience || []).length > 0 ? (
                                        student.experience.map((experience) => (
                                            <li key={experience}>
                                                {experience}
                                            </li>
                                        ))
                                    ) : (
                                        <li>구현 경험이 아직 없습니다.</li>
                                    )}
                                </ul>
                            </section>

                            <section data-reveal className={styles.compactSection}>
                                <h3>팀원 명단</h3>

                                {isAssignedTeam ? (
                                    <div className={styles.memberList}>
                                        {teamMembers.length > 0 ? (
                                            teamMembers.map((member) => {
                                                const memberNumber =
                                                    getStudentNumberInfo(
                                                        member.userId
                                                    ).number;

                                                return (
                                                    <button
                                                        key={member.userId}
                                                        type="button"
                                                        className={
                                                            styles.memberButton
                                                        }
                                                        onClick={() =>
                                                            handleMemberClick(
                                                                member
                                                            )
                                                        }
                                                    >
                                                        <strong>
                                                            {member.name}
                                                        </strong>
                                                        <span>
                                                            {memberNumber}
                                                        </span>
                                                        {member.leaderRole ===
                                                            "LEADER" && (
                                                            <em>팀장</em>
                                                        )}
                                                    </button>
                                                );
                                            })
                                        ) : (
                                            <p
                                                className={
                                                    styles.emptyInlineText
                                                }
                                            >
                                                함께 배정된 팀원 정보를 아직
                                                불러오지 못했습니다.
                                            </p>
                                        )}
                                    </div>
                                ) : (
                                    <p className={styles.emptyInlineText}>
                                        아직 배정된 팀이 없습니다.
                                    </p>
                                )}
                            </section>

                            <section data-reveal className={styles.compactSection}>
                                <h3>선호 팀원</h3>

                                <div className={styles.chipRow}>
                                    {(student.preferredTeammates || []).length >
                                    0 ? (
                                        student.preferredTeammates.map(
                                            (member) => (
                                                <span
                                                    key={member}
                                                    className={styles.chip}
                                                >
                                                    {formatPreferredMember(
                                                        member,
                                                        students
                                                    )}
                                                </span>
                                            )
                                        )
                                    ) : (
                                        <span className={styles.emptyInlineText}>
                                            없음
                                        </span>
                                    )}
                                </div>
                            </section>

                            <section data-reveal className={styles.analysisSection}>
                                <h3>학생 분석 결과</h3>
                                <p
                                    className={
                                        analysisDisplay.isFailed
                                            ? styles.analysisFailedText
                                            : undefined
                                    }
                                >
                                    {analysisDisplay.resultText}
                                </p>
                            </section>
                        </div>

                        <aside className={styles.chartColumn}>
                            <StudentRadarChart
                                title="캡스톤 실행 성향"
                                data={developmentChartData}
                            />
                            <StudentRadarChart
                                title="캡스톤 협업 성향"
                                data={personalityChartData}
                            />
                            <SurveyReliabilityCard student={student} />
                        </aside>
                    </div>
                )}
        </ModalOverlay>
    );
};

export default AdminStudentDetailModal;
