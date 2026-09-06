import styles from "./Header.module.css";
import Logo from "../../../assets/images/logo.png";
import { useEffect, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import authStore from "../../../store/authStore";
import useUnreadChatCount from "../../../hooks/useUnreadChatCount";
import TeamRequiredModal from "../modal/TeamRequiredModal";
import {
    clearDashboardCache,
    requestAdminDashboard,
    requestUserDashboard,
} from "../../../api/dashboardApi";
import {
    ADMIN_TEAM_CREATED_CHANGE_EVENT,
    getStoredAdminTeamCreated,
    setStoredAdminTeamCreated,
} from "../../../utils/adminTeamStatusStorage";
import { isAdminRole } from "../../../utils/accountRole";
import { getAdminTeamCreationStatus } from "../../../utils/teamStatus";
import { getStudentNumberInfo } from "../../../utils/student";

const TEAM_STATUS_CACHE_TTL = 1000 * 60 * 5;
const teamStatusCache = new Map();

const getTeamStatusCacheKey = (role, userId) => `${role}:${userId || ""}`;

const getCachedTeamStatus = (cacheKey) => {
    const cachedTeamStatus = teamStatusCache.get(cacheKey);

    if (!cachedTeamStatus) return null;

    const isExpired = Date.now() - cachedTeamStatus.savedAt > TEAM_STATUS_CACHE_TTL;

    if (isExpired) {
        teamStatusCache.delete(cacheKey);
        return null;
    }

    return cachedTeamStatus.value;
};

const setCachedTeamStatus = (cacheKey, value) => {
    teamStatusCache.set(cacheKey, {
        value,
        savedAt: Date.now(),
    });
};

const Header = () => {
    const location = useLocation();
    const user = authStore((state) => state.user);

    const hasUser = Boolean(user);
    const isAdmin = isAdminRole(user?.accountRole);
    const isAdminPage = location.pathname.startsWith("/admin");
    const teamStatusCacheKey = getTeamStatusCacheKey(
        isAdmin ? "ADMIN" : "STUDENT",
        user?.userId
    );

    const [storedTeamCreated, setStoredTeamCreated] = useState(
        getStoredAdminTeamCreated
    );
    const [adminAllTeamCreated, setAdminAllTeamCreated] = useState(null);
    const [studentTeamCreated, setStudentTeamCreated] = useState(null);
    const [teamRequiredModal, setTeamRequiredModal] = useState(null);
    const [menuOpen, setMenuOpen] = useState(false);

    const { hasUnreadChat } = useUnreadChatCount({
        enabled: hasUser,
    });

    useEffect(() => {
        if (!isAdmin) return undefined;

        const updateStoredTeamStatus = () => {
            teamStatusCache.clear();
            clearDashboardCache();
            setStoredTeamCreated(getStoredAdminTeamCreated());
        };

        const updateChangedTeamStatus = (event) => {
            teamStatusCache.clear();
            clearDashboardCache();
            setStoredTeamCreated(event.detail);
        };

        window.addEventListener("storage", updateStoredTeamStatus);
        window.addEventListener(
            ADMIN_TEAM_CREATED_CHANGE_EVENT,
            updateChangedTeamStatus
        );

        return () => {
            window.removeEventListener("storage", updateStoredTeamStatus);
            window.removeEventListener(
                ADMIN_TEAM_CREATED_CHANGE_EVENT,
                updateChangedTeamStatus
            );
        };
    }, [isAdmin]);

    useEffect(() => {
        if (!hasUser || !isAdmin) return undefined;

        let ignore = false;
        const cachedTeamStatus = getCachedTeamStatus(teamStatusCacheKey);

        if (cachedTeamStatus) {
            const cacheTimerId = window.setTimeout(() => {
                setStoredAdminTeamCreated(cachedTeamStatus.teamManageAccessible);
                setAdminAllTeamCreated(cachedTeamStatus.allTeamCreated);
            }, 0);

            return () => {
                window.clearTimeout(cacheTimerId);
            };
        }

        const loadAdminTeamStatus = async () => {
            try {
                const dashboard = await requestAdminDashboard();
                const teamStatus = getAdminTeamCreationStatus(dashboard);

                if (!ignore) {
                    setStoredAdminTeamCreated(teamStatus.teamManageAccessible);
                    setAdminAllTeamCreated(teamStatus.allTeamCreated);
                    setCachedTeamStatus(teamStatusCacheKey, {
                        teamManageAccessible: teamStatus.teamManageAccessible,
                        allTeamCreated: teamStatus.allTeamCreated,
                    });
                }
            } catch {
                if (!ignore) {
                    setAdminAllTeamCreated(false);
                }
            }
        };

        loadAdminTeamStatus();

        return () => {
            ignore = true;
        };
    }, [hasUser, isAdmin, teamStatusCacheKey]);

    useEffect(() => {
        if (!hasUser || isAdmin) return undefined;

        let ignore = false;
        const cachedTeamStatus = getCachedTeamStatus(teamStatusCacheKey);

        if (cachedTeamStatus) {
            const cacheTimerId = window.setTimeout(() => {
                setStudentTeamCreated(cachedTeamStatus.teamCreated);
            }, 0);

            return () => {
                window.clearTimeout(cacheTimerId);
            };
        }

        const loadStudentTeamStatus = async () => {
            try {
                const dashboard = await requestUserDashboard();

                if (!ignore) {
                    setStudentTeamCreated(Boolean(dashboard.teamCreated));
                    setCachedTeamStatus(teamStatusCacheKey, {
                        teamCreated: Boolean(dashboard.teamCreated),
                    });
                }
            } catch {
                if (!ignore) {
                    setStudentTeamCreated(false);
                }
            }
        };

        loadStudentTeamStatus();

        return () => {
            ignore = true;
        };
    }, [hasUser, isAdmin, teamStatusCacheKey]);

    // 드로어가 열려 있는 동안은 본문 스크롤을 막는다 (닫기는 링크 클릭에서 처리)
    useEffect(() => {
        if (!menuOpen) return undefined;

        const previousOverflow = document.body.style.overflow;
        document.body.style.overflow = "hidden";

        return () => {
            document.body.style.overflow = previousOverflow;
        };
    }, [menuOpen]);

    const makeHeaderName = (user) => {
        if (!user) return "";

        if (user.userId.startsWith("stu")) {
            return `${getStudentNumberInfo(user.userId).number} ${user.name}`;
        }

        if (user.userId.startsWith("tea")) {
            return `${user.name} 선생님`;
        }

        return user.name;
    };

    const displayName = makeHeaderName(user);

    const logoPath =
        isAdmin || (!hasUser && isAdminPage)
            ? "/admin/dashboard"
            : "/user/dashboard";

    const adminTeamManageAccessible = storedTeamCreated;
    const teamCreated = isAdmin ? adminTeamManageAccessible : studentTeamCreated;

    const adminTeamPath = adminTeamManageAccessible
        ? "/admin/team-manage"
        : "/admin/team-create";

    const adminTeamLabel = adminTeamManageAccessible ? "팀 관리" : "팀 생성";

    const showTeamRequiredModal = (event, message) => {
        event.preventDefault();
        setTeamRequiredModal({
            message,
        });
    };

    const navItems = !hasUser
        ? []
        : isAdmin
          ? [
                { to: adminTeamPath, label: adminTeamLabel },
                {
                    to: "/admin/chat",
                    label: "채팅 관리",
                    badge: true,
                    guardMessage:
                        "팀 생성이 완료되면 팀별 채팅방을 확인할 수 있습니다.",
                },
                {
                    to: "/admin/log",
                    label: "캡스톤 일지",
                    guardMessage:
                        "팀 생성이 완료되면 팀별 캡스톤 일지를 확인할 수 있습니다.",
                },
                { to: "/admin/student", label: "학생 관리" },
                { to: "/admin/notice", label: "공지" },
            ]
          : [
                {
                    to: "/user/project",
                    label: "프로젝트",
                    guardMessage:
                        "팀 생성이 완료되면 프로젝트 정보를 작성할 수 있습니다.",
                },
                {
                    to: "/user/chat",
                    label: "팀 채팅",
                    badge: true,
                    guardMessage:
                        "팀 생성이 완료되면 팀 채팅을 사용할 수 있습니다.",
                },
                {
                    to: "/user/log",
                    label: "캡스톤 일지",
                    guardMessage:
                        "팀 생성이 완료되면 캡스톤 일지를 작성할 수 있습니다.",
                },
                { to: "/user/notice", label: "공지" },
            ];

    const handleNavClick = (event, guardMessage) => {
        setMenuOpen(false);

        if (guardMessage && teamCreated === false) {
            showTeamRequiredModal(event, guardMessage);
        }
    };

    const renderNavLink = (item, className) => (
        <Link
            key={item.to + item.label}
            to={item.to}
            className={`${className} ${
                location.pathname.startsWith(item.to) ? styles.navLinkActive : ""
            }`}
            onClick={(event) => handleNavClick(event, item.guardMessage)}
        >
            {item.label}
            {item.badge && hasUnreadChat && (
                <span
                    className={styles.chatUnreadDot}
                    aria-label="읽지 않은 채팅"
                />
            )}
        </Link>
    );

    return (
        <header className={styles.header}>
            <div className={styles.inner}>
                <Link to={logoPath} className={styles.logoLink}>
                    <img className={styles.logo} src={Logo} alt="로고" />
                </Link>

                <nav className={styles.nav}>
                    {navItems.map((item) =>
                        renderNavLink(item, styles.navLink)
                    )}
                </nav>

                <div className={styles.actions}>
                    {hasUser && (
                        <Link
                            to={isAdmin ? "/admin/profile" : "/user/profile"}
                            className={styles.userLink}
                        >
                            <span className={styles.user}>{displayName}</span>
                        </Link>
                    )}

                    {navItems.length > 0 && (
                        <button
                            type="button"
                            className={styles.menuButton}
                            aria-label={menuOpen ? "메뉴 닫기" : "메뉴 열기"}
                            aria-expanded={menuOpen}
                            onClick={() => setMenuOpen((open) => !open)}
                        >
                            <span
                                className={`${styles.menuIcon} ${
                                    menuOpen ? styles.menuIconOpen : ""
                                }`}
                            />
                        </button>
                    )}
                </div>
            </div>

            {navItems.length > 0 && (
                <>
                    <div
                        className={`${styles.drawerOverlay} ${
                            menuOpen ? styles.drawerOverlayOpen : ""
                        }`}
                        onClick={() => setMenuOpen(false)}
                    />
                    <nav
                        className={`${styles.drawer} ${
                            menuOpen ? styles.drawerOpen : ""
                        }`}
                        aria-hidden={!menuOpen}
                    >
                        {navItems.map((item) =>
                            renderNavLink(item, styles.drawerLink)
                        )}
                    </nav>
                </>
            )}

            {teamRequiredModal && (
                <TeamRequiredModal
                    title="팀 생성 후 이용 가능합니다"
                    message={teamRequiredModal.message}
                    onClose={() => setTeamRequiredModal(null)}
                />
            )}
        </header>
    );
};

export default Header;
