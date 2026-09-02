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

    return (
        <div className={styles.page}>
            <Header />

            <main className={styles.content}>
                <h1 className={styles.title}>채팅 관리</h1>
                <p className={styles.subtitle}>
                    팀을 선택하면 채팅방으로 이동합니다.
                </p>

                <div className={styles.controlRow}>
                    {gradeTabs.length > 0 && (
                        <div className={styles.gradeTabs}>
                            {gradeTabs.map((grade) => (
                                <button
                                    key={grade}
                                    type="button"
                                    className={`${styles.gradeTab} ${
                                        activeGrade === grade
                                            ? styles.activeGradeTab
                                            : ""
                                    }`}
                                    onClick={() => setActiveGrade(grade)}
                                >
                                    {gradeLabels[grade] ?? grade}
                                </button>
                            ))}
                        </div>
                    )}

                    <input
                        type="text"
                        className={styles.search}
                        placeholder="팀명을 검색하세요"
                        value={keyword}
                        onChange={(event) => setKeyword(event.target.value)}
                    />
                </div>

                {error && <p className={styles.errorText}>{error}</p>}

                <div className={styles.chatList}>
                    {isLoading && (
                        <p className={styles.emptyText}>
                            채팅방 목록을 불러오는 중입니다.
                        </p>
                    )}

                    {!isLoading && visibleRooms.length === 0 && (
                        <p className={styles.emptyText}>
                            {keyword
                                ? "검색 결과가 없습니다."
                                : "채팅방이 없습니다."}
                        </p>
                    )}

                    {!isLoading &&
                        visibleRooms.map((room) => (
                            <button
                                key={room.id}
                                type="button"
                                className={styles.chatRow}
                                onClick={() =>
                                    navigate(`/admin/chat/${room.id}`)
                                }
                            >
                                <div className={styles.chatMain}>
                                    <div className={styles.chatTitleRow}>
                                        <span className={styles.chatTeam}>
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
                                            />
                                        )}
                                    </div>

                                    <p
                                        className={`${styles.chatPreview} ${
                                            room.lastMessage
                                                ? ""
                                                : styles.emptyPreview
                                        }`}
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
                                            "아직 대화가 없습니다."
                                        )}
                                    </p>
                                </div>

                                <div className={styles.chatMeta}>
                                    {room.lastMessage && (
                                        <div className={styles.chatTime}>
                                            {formatChatTime(
                                                room.lastMessage.createdAt
                                            )}
                                        </div>
                                    )}
                                    <div className={styles.chatMembers}>
                                        팀원 {room.memberCount}명
                                    </div>
                                </div>
                            </button>
                        ))}
                </div>
            </main>
        </div>
    );
};

export default AdminChatList;
