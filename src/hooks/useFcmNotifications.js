import { useCallback, useEffect, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import authStore from "../store/authStore";
import { requestFcmToken, onForegroundFcmMessage } from "../firebase/messaging";
import {
    requestRegisterFcmToken,
    requestRemoveFcmToken,
} from "../api/notificationApi";
import {
    createChatClient,
    disconnectChatClient,
    subscribeUserChatNotifications,
} from "../api/chatSocket";
import { isAdminRole } from "../utils/accountRole";

const USER_CHAT_PAGE_PATH = "/user/chat";

// 로그인 상태에 따라 FCM 토큰을 등록/해제하고, 포그라운드로 도착한 알림(일지 마감·공지)을
// 토스트로 보여준다. 팀 채팅 알림(api.md 8번)도 여기서 같은 토스트로 합쳐서 보여준다 —
// 채팅 페이지 안에서 다른 채널 메시지 오는 건 기존 ChatToast가 그대로 처리하고,
// 여기서는 "채팅 페이지 밖에 있을 때"만 전역 토스트를 띄운다.
const useFcmNotifications = () => {
    const authStatus = authStore((state) => state.authStatus);
    const user = authStore((state) => state.user);
    const wasAuthenticatedRef = useRef(false);
    const [toasts, setToasts] = useState([]);
    const navigate = useNavigate();
    const location = useLocation();
    const locationRef = useRef(location.pathname);

    useEffect(() => {
        if (authStatus === "authenticated" && !wasAuthenticatedRef.current) {
            wasAuthenticatedRef.current = true;

            requestFcmToken()
                .then((token) => {
                    if (token) return requestRegisterFcmToken(token);
                    return null;
                })
                .catch((error) => {
                    console.error("FCM 토큰 등록에 실패했습니다.", error);
                });
        }

        if (authStatus === "unauthenticated" && wasAuthenticatedRef.current) {
            wasAuthenticatedRef.current = false;
            requestRemoveFcmToken().catch(() => {});
        }
    }, [authStatus]);

    useEffect(() => {
        let isActive = true;
        let unsubscribe = () => {};

        onForegroundFcmMessage((payload) => {
            if (!isActive) return;

            setToasts((prev) => [
                ...prev,
                { id: `${payload.type ?? "FCM"}-${Date.now()}`, ...payload },
            ]);
        })
            .then((cleanup) => {
                if (!isActive) {
                    cleanup();
                    return;
                }

                unsubscribe = cleanup;
            })
            .catch((error) => {
                console.error("FCM 메시지 구독에 실패했습니다.", error);
            });

        return () => {
            isActive = false;
            unsubscribe();
        };
    }, []);

    useEffect(() => {
        locationRef.current = location.pathname;
    }, [location.pathname]);

    useEffect(() => {
        const shouldConnect =
            authStatus === "authenticated" &&
            Boolean(user) &&
            !isAdminRole(user.accountRole);

        if (!shouldConnect) return undefined;

        let subscription = null;

        const client = createChatClient({
            onConnect: (connectedClient) => {
                try {
                    subscription = subscribeUserChatNotifications(
                        connectedClient,
                        (event) => {
                            // 채팅 페이지를 보고 있을 땐 그 화면 안 메시지 목록으로 이미 보이므로 토스트 생략
                            if (locationRef.current === USER_CHAT_PAGE_PATH) {
                                return;
                            }

                            setToasts((prev) => [
                                ...prev,
                                {
                                    id: `CHAT_MESSAGE-${Date.now()}`,
                                    type: "CHAT_MESSAGE",
                                    title: `${event?.teamName ?? "팀 채팅"} · ${
                                        event?.senderName ?? ""
                                    }`,
                                    body: event?.messagePreview,
                                    clickUrl: USER_CHAT_PAGE_PATH,
                                },
                            ]);
                        }
                    );
                } catch {
                    subscription = null;
                }
            },
        });

        client.activate();

        return () => {
            disconnectChatClient(client, [subscription]).catch(() => {
                client.deactivate();
            });
        };
    }, [authStatus, user]);

    const dismissToast = useCallback((id) => {
        setToasts((prev) => prev.filter((toast) => toast.id !== id));
    }, []);

    const selectToast = useCallback(
        (toast) => {
            if (toast.clickUrl) navigate(toast.clickUrl);
        },
        [navigate]
    );

    return { toasts, dismissToast, selectToast };
};

export default useFcmNotifications;
