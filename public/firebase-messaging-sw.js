/* global importScripts, firebase, clients */

// FCM 백그라운드(탭 닫힘) 알림 처리용 서비스워커.
// Firebase SDK가 기본 클릭 동작을 등록하기 전에 앱의 이동 규칙을 먼저 등록한다.
self.addEventListener("notificationclick", (event) => {
    event.notification.close();

    const notificationData = event.notification.data || {};
    const messageData = notificationData.FCM_MSG?.data || {};
    const requestedUrl = notificationData.clickUrl || messageData.clickUrl || "/";
    const targetUrl = new URL(requestedUrl, self.location.origin);
    const safeUrl =
        targetUrl.origin === self.location.origin
            ? targetUrl.href
            : self.location.origin;

    event.waitUntil(
        clients
            .matchAll({ type: "window", includeUncontrolled: true })
            .then(async (windowClients) => {
                const exactClient = windowClients.find(
                    (client) => client.url === safeUrl
                );

                if (exactClient) {
                    return exactClient.focus();
                }

                const appClient = windowClients.find(
                    (client) =>
                        new URL(client.url).origin === self.location.origin
                );

                if (appClient) {
                    const navigatedClient = await appClient.navigate(safeUrl);

                    if (navigatedClient) {
                        return navigatedClient.focus();
                    }
                }

                return clients.openWindow(safeUrl);
            })
    );
});

// public/ 정적 파일이라 Vite의 import.meta.env를 사용할 수 없어 웹 공개용 Firebase 설정을 직접 사용한다.
importScripts(
    "https://www.gstatic.com/firebasejs/10.13.1/firebase-app-compat.js"
);
importScripts(
    "https://www.gstatic.com/firebasejs/10.13.1/firebase-messaging-compat.js"
);

const firebaseConfig = {
    apiKey: "AIzaSyAvDwUmwU4g9t_REPN7ll-RuWbGagS-3lQ",
    authDomain: "capteam-c0216.firebaseapp.com",
    projectId: "capteam-c0216",
    storageBucket: "capteam-c0216.firebasestorage.app",
    messagingSenderId: "966982679733",
    appId: "1:966982679733:web:ea31cccb5775f89a1552fc",
};

firebase.initializeApp(firebaseConfig);

const messaging = firebase.messaging();

// data payload 형식은 api.md 2번 섹션 참고: { type, targetId, clickUrl }
messaging.onBackgroundMessage((payload) => {
    // notification payload는 Firebase SDK가 자동 표시하므로 다시 띄우지 않는다.
    if (payload.notification) return;

    const data = payload.data || {};
    const title = data.title || "CapTeam 알림";
    const body = data.body || "";

    self.registration.showNotification(title, {
        body,
        icon: "/logo.png",
        data,
    });
});
