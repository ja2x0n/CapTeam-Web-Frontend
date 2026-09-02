import { initializeApp, getApps } from "firebase/app";
import {
    getMessaging,
    getToken,
    isSupported,
    onMessage,
} from "firebase/messaging";
import {
    firebaseConfig,
    firebaseVapidKey,
    isFirebaseConfigured,
} from "./firebaseConfig";

let messagingPromise = null;

const getMessagingInstance = async () => {
    if (!isFirebaseConfigured || typeof window === "undefined") return null;

    if (!messagingPromise) {
        messagingPromise = isSupported()
            .then((supported) => {
                if (!supported) return null;

                const app = getApps().length
                    ? getApps()[0]
                    : initializeApp(firebaseConfig);

                return getMessaging(app);
            })
            .catch((error) => {
                messagingPromise = null;
                throw error;
            });
    }

    return messagingPromise;
};

// 알림 권한을 요청하고 FCM 토큰을 발급받는다. Firebase 설정이 없으면 null을 반환한다.
export const requestFcmToken = async () => {
    if (!isFirebaseConfigured) return null;
    if (
        typeof Notification === "undefined" ||
        typeof navigator === "undefined" ||
        !("serviceWorker" in navigator)
    ) {
        return null;
    }

    const messaging = await getMessagingInstance();
    if (!messaging) return null;

    const permission =
        Notification.permission === "granted"
            ? "granted"
            : await Notification.requestPermission();
    if (permission !== "granted") return null;

    const registration = await navigator.serviceWorker.register(
        "/firebase-messaging-sw.js"
    );

    return getToken(messaging, {
        vapidKey: firebaseVapidKey,
        serviceWorkerRegistration: registration,
    });
};

// 포그라운드(사이트 이용 중)로 도착한 FCM 메시지를 구독한다.
// payload.data(type/targetId/clickUrl)는 api.md 2번 섹션 공통 형식, payload.notification(title/body)은 표시용 텍스트.
export const onForegroundFcmMessage = async (callback) => {
    const messaging = await getMessagingInstance();
    if (!messaging) return () => {};

    return onMessage(messaging, (payload) => {
        const data = payload.data || {};

        callback({
            ...data,
            title:
                payload.notification?.title ||
                data.title ||
                "CapTeam 알림",
            body: payload.notification?.body || data.body || "",
        });
    });
};
