import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import Header from "../../../components/common/header/Header";
import {
    requestAdminChannelSummaries,
    requestAdminChatRooms,
} from "../../../api/adminChatApi";
import { requestAdminTeamList } from "../../../api/teamApi";
import { gradeLabels } from "../../../utils/matchingJobLock";
import { formatChatTime, parseChatDate } from "../../../utils/chat";
import useAdminChatListRealtime from "../../../hooks/useAdminChatListRealtime";
import Skeleton from "../../../components/common/skeleton/Skeleton";
import EmptyState from "../../../components/common/empty/EmptyState";
import useInView from "../../../hooks/useInView";
import styles from "./AdminChatList.module.css";

const GRADE_ORDER = ["GRADE_2", "GRADE_3"];
const ROOM_REFRESH_DELAY = 150;

const getMessageTimestamp = (message) =>
    parseChatDate(message?.createdAt)?.getTime() ?? 0;

const sortRoomsByLatestMessage = (roomList) => {
    return [...roomList].sort(
        (first, second) =>
            getMessageTimestamp(second.lastMessage) -
            getMessageTimestamp(first.lastMessage)
    );
};

const getRoomPreview = async (room) => {
    if (!room.id || !room.channels?.length) {
        return { lastMessage: null, unreadCount: 0 };
    }

    const channelSummaries = await requestAdminChannelSummaries(room.id);
    const summaries = Array.isArray(channelSummaries) ? channelSummaries : [];
    const lastMessage = summaries.reduce((latestMessage, summary) => {
        const nextMessage = summary?.lastMessage;

        if (
            getMessageTimestamp(nextMessage) >
            getMessageTimestamp(latestMessage)
        ) {
            return nextMessage;
        }

        return latestMessage;
    }, null);
    const unreadCount = summaries.reduce(
        (total, summary) => total + Number(summary.unreadCount ?? 0),
        0
    );

    return { lastMessage, unreadCount };
};

const AdminChatList = () => {
    const navigate = useNavigate();
    const [rooms, setRooms] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState("");
    const [keyword, setKeyword] = useState("");
    const [activeGrade, setActiveGrade] = useState("");
    const loadSequenceRef = useRef(0);
    const roomRefreshSequenceRef = useRef(new Map());
    const roomRefreshTimersRef = useRef(new Map());

    const loadRooms = useCallback(async ({ showLoading = false } = {}) => {
        const loadSequence = loadSequenceRef.current + 1;
        loadSequenceRef.current = loadSequence;

        try {
            if (showLoading) {
                setIsLoading(true);
            }
            setError("");

            const [roomList, teamList] = await Promise.all([
                requestAdminChatRooms(),
                requestAdminTeamList().catch(() => []),
            ]);

            if (loadSequence !== loadSequenceRef.current) return;

            const normalizedRooms = Array.isArray(roomList) ? roomList : [];
            const teamsById = new Map(
                (Array.isArray(teamList) ? teamList : []).map((team) => [
                    String(team.teamId),
                    team,
                ])
            );

            const joinedRooms = await Promise.all(
                normalizedRooms.map(async (room) => {
                    const team = teamsById.get(String(room.teamId));
                    const { lastMessage, unreadCount } =
                        await getRoomPreview(room).catch(() => ({
                            lastMessage: null,
                            unreadCount: 0,
                        }));

                    return {
                        ...room,
                        grade: team?.grade ?? "",
                        memberCount: team?.members?.length ?? 0,
                        lastMessage,
                        unreadCount,
                    };
                })
            );

            if (loadSequence !== loadSequenceRef.current) return;

            const sortedRooms = sortRoomsByLatestMessage(joinedRooms);
            setRooms(sortedRooms);

            setActiveGrade((currentGrade) => {
                if (
                    currentGrade &&
                    sortedRooms.some((room) => room.grade === currentGrade)
                ) {
                    return currentGrade;
                }

                return (
                    GRADE_ORDER.find((grade) =>
                        sortedRooms.some((room) => room.grade === grade)
                    ) ?? ""
                );
            });
        } catch {
            if (loadSequence === loadSequenceRef.current) {
                setError("채팅방 목록을 불러오지 못했습니다.");
            }
        } finally {
            if (loadSequence === loadSequenceRef.current) {
                setIsLoading(false);
            }
        }
    }, []);

    const refreshRoomPreview = useCallback(async (roomId) => {
        const roomKey = String(roomId);
        const refreshSequence =
            (roomRefreshSequenceRef.current.get(roomKey) ?? 0) + 1;
        roomRefreshSequenceRef.current.set(roomKey, refreshSequence);

        try {
            const room = rooms.find(
                (candidate) => String(candidate.id) === roomKey
            );

            if (!room) return;

            const preview = await getRoomPreview(room);

            if (
                roomRefreshSequenceRef.current.get(roomKey) !==
                refreshSequence
            ) {
                return;
            }

            setRooms((currentRooms) =>
                sortRoomsByLatestMessage(
                    currentRooms.map((currentRoom) =>
                        String(currentRoom.id) === roomKey
                            ? { ...currentRoom, ...preview }
                            : currentRoom
                    )
                )
            );
        } catch {
            // 일시적인 갱신 실패 시 현재 목록을 유지하고 다음 이벤트나 focus 재조회를 기다린다.
        }
    }, [rooms]);

    const scheduleRoomRefresh = useCallback(
        (roomId) => {
            const roomKey = String(roomId);
            const previousTimer = roomRefreshTimersRef.current.get(roomKey);

            if (previousTimer) {
                window.clearTimeout(previousTimer);
            }

            const timerId = window.setTimeout(() => {
                roomRefreshTimersRef.current.delete(roomKey);
                refreshRoomPreview(roomKey);
            }, ROOM_REFRESH_DELAY);

            roomRefreshTimersRef.current.set(roomKey, timerId);
        },
        [refreshRoomPreview]
    );

    const refreshAllRooms = useCallback(() => {
        loadRooms();
    }, [loadRooms]);

    useAdminChatListRealtime({
        rooms,
        onRoomChanged: scheduleRoomRefresh,
        onRoomsChanged: refreshAllRooms,
        onReconnect: refreshAllRooms,
    });

    useEffect(() => {
        loadRooms({ showLoading: true });
    }, [loadRooms]);

    useEffect(() => {
        const refreshOnFocus = () => {
            loadRooms();
        };

        window.addEventListener("focus", refreshOnFocus);

        return () => {
            window.removeEventListener("focus", refreshOnFocus);
        };
    }, [loadRooms]);

    useEffect(() => {
        const refreshTimers = roomRefreshTimersRef.current;

        return () => {
            refreshTimers.forEach((timerId) => {
                window.clearTimeout(timerId);
            });
            refreshTimers.clear();
        };
    }, []);

    const gradeTabs = useMemo(
        () =>
            GRADE_ORDER.filter((grade) =>
                rooms.some((room) => room.grade === grade)
            ),
        [rooms]
    );

    const visibleRooms = rooms.filter((room) => {
        const matchesGrade = !activeGrade || room.grade === activeGrade;
        const matchesKeyword = (room.teamName ?? "")
            .toLowerCase()
            .includes(keyword.toLowerCase());

        return matchesGrade && matchesKeyword;
    });

    const totalUnread = rooms.reduce(
        (sum, room) => sum + (room.unreadCount || 0),
        0
    );
    const listRef = useInView({
        replayKey: `${isLoading}-${activeGrade}-${keyword}`,
    });

    return (
        <div className={styles.page}>
            <Header />

            <main className={styles.body}>
                <section className={styles.pageHead}>
                    <div>
                        <p className={styles.eyebrow}>채팅 관리</p>
                        <h1 className={styles.headline}>
                            팀별 대화를
                            <br />
                            확인할 수 있어요
                        </h1>
                        <p className={styles.subline}>
                            팀을 누르면 그 팀의 채팅방으로 이동해요.
                        </p>
                    </div>

                    {!isLoading && rooms.length > 0 && (
                        <div className={styles.statusPanel}>
                            <p className={styles.statusLabel}>안 읽은 메시지</p>
                            <p className={styles.statusValue}>
                                {totalUnread}
                                <span>개</span>
                            </p>
                        </div>
                    )}
                </section>

                <div className={styles.controls}>
                    {gradeTabs.length > 0 && (
                        <div className={styles.segments}>
                            {gradeTabs.map((grade) => (
                                <button
                                    key={grade}
                                    type="button"
                                    className={`${styles.segment} ${
                                        activeGrade === grade
                                            ? styles.segmentOn
                                            : ""
                                    }`}
                                    onClick={() => setActiveGrade(grade)}
                                    aria-pressed={activeGrade === grade}
                                >
                                    {gradeLabels[grade] ?? grade}
                                </button>
                            ))}
                        </div>
                    )}

                    <div className={styles.searchBox}>
                        <svg
                            className={styles.searchIcon}
                            width="18"
                            height="18"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="1.9"
                            strokeLinecap="round"
                            aria-hidden="true"
                        >
                            <circle cx="11" cy="11" r="7" />
                            <path d="m20 20-3.5-3.5" />
                        </svg>
                        <input
                            type="text"
                            className={styles.search}
                            placeholder="팀명을 검색하세요"
                            value={keyword}
                            onChange={(event) => setKeyword(event.target.value)}
                        />
                    </div>
                </div>

                {isLoading ? (
                    <div className={styles.list}>
                        {[0, 1, 2].map((index) => (
                            <div key={index} className={styles.skeletonRow}>
                                <Skeleton width={208} height={24} />
                                <Skeleton
                                    width={320}
                                    height={20}
                                    style={{ marginTop: 12 }}
                                />
                            </div>
                        ))}
                    </div>
                ) : error ? (
                    <EmptyState
                        variant="error"
                        title="채팅방 목록을 불러오지 못했어요"
                        description={error}
                    />
                ) : visibleRooms.length === 0 ? (
                    <EmptyState
                        title="조건에 맞는 채팅방이 없어요"
                        description="검색어를 지우거나 다른 학년을 골라보세요."
                        action={
                            <button
                                type="button"
                                className={styles.resetButton}
                                onClick={() => {
                                    setKeyword("");
                                    setActiveGrade("");
                                }}
                            >
                                필터 초기화
                            </button>
                        }
                    />
                ) : (
                    <div className={styles.list} ref={listRef}>
                        {visibleRooms.map((room) => (
                            <button
                                key={room.id}
                                type="button"
                                data-reveal
                                className={styles.row}
                                onClick={() =>
                                    navigate(`/admin/chat/${room.id}`)
                                }
                            >
                                <span className={styles.rowMain}>
                                    <span className={styles.rowTitleLine}>
                                        <span className={styles.rowTeam}>
                                            {room.teamName}
                                        </span>
                                        {room.grade && (
                                            <span
                                                className={styles.gradeBadge}
                                            >
                                                {gradeLabels[room.grade] ??
                                                    room.grade}
                                            </span>
                                        )}
                                        {room.unreadCount > 0 && (
                                            <span
                                                className={styles.unreadDot}
                                                aria-label="읽지 않은 메시지"
                                            />
                                        )}
                                    </span>

                                    <span
                                        className={
                                            room.lastMessage
                                                ? styles.rowPreview
                                                : styles.rowPreviewEmpty
                                        }
                                    >
                                        {room.lastMessage ? (
                                            <>
                                                <b>
                                                    {
                                                        room.lastMessage
                                                            .senderName
                                                    }
                                                    :
                                                </b>{" "}
                                                {room.lastMessage.message ??
                                                    "파일을 보냈습니다."}
                                            </>
                                        ) : (
                                            "아직 대화가 없어요."
                                        )}
                                    </span>
                                </span>

                                <span className={styles.rowMeta}>
                                    {room.lastMessage && (
                                        <span className={styles.rowTime}>
                                            {formatChatTime(
                                                room.lastMessage.createdAt
                                            )}
                                        </span>
                                    )}
                                    <span className={styles.rowMembers}>
                                        팀원 {room.memberCount}명
                                    </span>
                                </span>
                            </button>
                        ))}
                    </div>
                )}
            </main>
        </div>
    );
};

export default AdminChatList;
