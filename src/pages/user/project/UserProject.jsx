import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import Header from "../../../components/common/header/Header";
import UserPlanForm from "../../../components/user/project/UserPlanForm";
import {
    requestSaveUserProjectPlan,
    requestUserProjectPlan,
} from "../../../api/projectApi";
import {
    emptyProjectPlan,
    getMainFeaturesText,
    hasEmptyProjectPlanField,
    normalizeProjectPlan,
} from "../../../utils/projectPlan";
import styles from "./UserProject.module.css";

const UserProject = () => {
    const navigate = useNavigate();
    const [projectPlan, setProjectPlan] = useState(emptyProjectPlan);
    const [error, setError] = useState("");
    const [isLoading, setIsLoading] = useState(true);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const hasSavedPlan = Boolean(projectPlan.projectId);

    useEffect(() => {
        const getProjectPlan = async () => {
            try {
                const data = await requestUserProjectPlan();
                setProjectPlan(normalizeProjectPlan(data));
            } catch {
                setError("저장된 기획서를 불러오지 못했습니다.");
            } finally {
                setIsLoading(false);
            }
        };

        getProjectPlan();
    }, []);

    const updateField = (field, value) => {
        setProjectPlan((prevPlan) => ({
            ...prevPlan,
            [field]: value,
        }));
        setError("");
    };

    const addCoreFeature = () => {
        setProjectPlan((prevPlan) => ({
            ...prevPlan,
            coreFeatures: [
                ...prevPlan.coreFeatures,
                {
                    id: Date.now(),
                    value: "",
                },
            ],
        }));
    };

    const updateCoreFeature = (id, value) => {
        setProjectPlan((prevPlan) => ({
            ...prevPlan,
            coreFeatures: prevPlan.coreFeatures.map((feature) =>
                feature.id === id ? { ...feature, value } : feature
            ),
        }));
    };

    const removeCoreFeature = (id) => {
        setProjectPlan((prevPlan) => ({
            ...prevPlan,
            coreFeatures: prevPlan.coreFeatures.filter(
                (feature) => feature.id !== id
            ),
        }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (hasEmptyProjectPlanField(projectPlan)) {
            setError("모든 항목을 작성해야 저장할 수 있습니다.");
            return;
        }

        try {
            setIsSubmitting(true);
            const savedPlan = await requestSaveUserProjectPlan({
                ...projectPlan,
                coreFeatures: getMainFeaturesText(projectPlan.coreFeatures),
            });
            setProjectPlan(normalizeProjectPlan(savedPlan));
            navigate("/user/dashboard");
        } catch {
            setError("기획서를 저장하지 못했습니다.");
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className={styles.page}>
            <Header />

            <main className={styles.body}>
                <div className={styles.inner}>
                    <div className={styles.backRow}>
                        <Link
                            to="/user/dashboard"
                            className={styles.backLink}
                        >
                            ← 홈으로
                        </Link>
                    </div>

                    <section className={styles.pageHead}>
                        <p className={styles.eyebrow}>프로젝트 기획서</p>
                        <h1 className={styles.headline}>
                            우리 팀이 만들 서비스를
                            <br />
                            정리해주세요
                        </h1>
                        <p className={styles.subline}>
                            여기에 적은 내용은 팀 관리 화면에서 담당 교사가 함께
                            봅니다.
                            <br />
                            언제든 다시 수정할 수 있어요.
                        </p>
                    </section>

                    <UserPlanForm
                        projectPlan={projectPlan}
                        hasSavedPlan={hasSavedPlan}
                        error={error}
                        isLoading={isLoading}
                        isSubmitting={isSubmitting}
                        onSubmit={handleSubmit}
                        onFieldChange={updateField}
                        onAddFeature={addCoreFeature}
                        onFeatureChange={updateCoreFeature}
                        onRemoveFeature={removeCoreFeature}
                    />
                </div>
            </main>
        </div>
    );
};

export default UserProject;
