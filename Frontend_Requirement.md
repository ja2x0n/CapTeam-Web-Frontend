# Frontend 유지보수 진행 현황 & 개발 순서

이 문서는 "지금 뭐가 끝났고, 뭐가 남았고, 다음엔 뭐부터 해야 하는지"만 보여주는 스냅샷이다. 필드명·API 상세 스펙은 항상 루트의 [Frontend.md](../Frontend.md)(Notion 원본 기준)를 따르고, 과거 작업 이력·왜 그렇게 했는지는 [FrontendResult.md](../FrontendResult.md)를 본다. 이 문서 자체는 진행 상황이 바뀔 때마다 갱신한다.

**전제**: 아래 순서는 전부 "Notion 유지보수 계획에 적힌 API를 백엔드가 그대로 구현해서 넘겨준다"는 가정하에 짠 순서다. 실제로 그 필드가 안 내려오면 대부분 항목이 기존 동작으로 자연 폴백되도록 짜여 있지만(리스크 없음), 체감 효과는 백엔드가 실제로 붙어야 나타난다.

---

## 완료된 것

- 설문 문항 역량 태그 제거
- 선호 팀원 검색·선택 UI (`UserSurvey.jsx`) — 경로/필드 버그 수정 완료(구 0순위, 커밋 `67f50f2`)
- 팀 생성 배치 스트리밍(로딩 → 첫 팀 도착 시 조기 전환) — API 필드 존재 여부만 미확인
- **팀 재생성 → 버전 기반 전·후 비교**(재생성도 같은 로딩 화면 재사용, "변경사항" 모달로 검토 후 적용/취소) — API·엔티티 전부 미확인
- **팀 구성 방식 선택(AI 자동 / 직접 구성)** — `AdminTeamCreate.jsx`에 모드 선택 UI, `AdminTeamManualCreate.jsx`(직접 구성 화면, 역할 검색·5명 정원 제한 포함) 실제 페이지, `requestCreateManualTeams` API 연동까지 전부 이전 세션에 이미 완료됨(`FrontendResult.md` 18번). Design 목업 단계가 아니라 실구현 상태 — 이 문서 이전 버전에 "미착수"로 잘못 적혀 있었음, 정정.
- 관리자 대시보드 미응답 알림 버튼 제거(기능 자체가 계획에서 제외됨)
- 전체 서비스 디자인 스윕(배경색 배지 제거, 폰트 굵기, border-radius 등)
- **dev 환경 로그인 404 수정(8/3)** — `.env.development`가 git 추적에서 빠진 뒤 대체 템플릿이 없어서 새로 클론한 환경에선 로그인이 404가 나던 문제. `vite.config.js`에 `/api`,`/ws` → `localhost:8080` 프록시 추가 + `.env.example` 신규(＋`.gitignore` 예외 처리), 커밋 `9192d16`.
- **FCM 공통 인프라 뼈대(8/3)** — `src/firebase/firebaseConfig.js`/`messaging.js`(토큰 발급·포그라운드 수신), `public/firebase-messaging-sw.js`(백그라운드 알림), `src/api/notificationApi.js`(토큰 등록/해제), `src/hooks/useFcmNotifications.js`(로그인 시 등록·로그아웃 시 해제, 포그라운드 알림 토스트) + `NotificationToast` 컴포넌트, `App.jsx`에 연결. `notificationType`(`JOURNAL_DEADLINE`/`CHAT_MESSAGE`/`NOTICE_CREATED`) 전부 제네릭하게 처리하므로 캡스톤 일지 마감 알림·공지 알림은 프론트 쪽 추가 작업 없이 이 인프라만으로 끝남. **실제 Firebase 프로젝트 설정값이 아직 없어서(`VITE_FIREBASE_*`, VAPID key) 지금은 아무 것도 등록되지 않는 안전한 no-op 상태** — 값이 채워지면 바로 동작.
- **팀 채팅 전역 알림(8/3)** — api.md 8번. `chatSocket.js`에 `subscribeUserChatNotifications` 추가(경로를 `/sub/users/{userId}/notifications`에서 이 코드베이스의 실제 관례인 `/user/queue/chat/notifications`로 정정), `useFcmNotifications.js`에서 로그인 시(학생 계정만) 구독해 FCM 토스트와 같은 `NotificationToast`로 표시. `/user/chat` 페이지를 보고 있을 때는 그 화면 안에서 이미 실시간으로 보이므로 전역 토스트는 생략. api.md/Notion 8번 섹션도 같이 정정. 백엔드가 이 경로로 아직 발행 안 하면 구독만 걸린 채 조용히 아무 일도 안 일어남(기존 동작 안 깨짐).
- **학생 상세 분석 결과 `analysisStatus` 분기(8/6)** — 백엔드 확인 결과 `studentLevel`/`analysisResult`가 null이던 건 프론트 필드 매핑 문제가 아니라 백엔드가 아직 null을 내려주고 있었기 때문(프론트는 이미 올바르게 읽고 fallback 문구 처리 중이었음). 백엔드가 확정한 신규 계약(`analysisStatus`: SUCCESS/PENDING/FAILED)에 맞춰 `AdminStudentDetailModal.jsx`에 상태별 분기 추가 — PENDING("분석 중"), FAILED("분석 실패", 빨간색 강조 + 재시도 안내), SUCCESS/미지정은 기존과 동일하게 등급+분석 설명 표시. `reason`/`skill_level` 등 AI 원본 필드는 여전히 프론트에서 직접 참조하지 않음(계약 유지). 백엔드가 아직 `analysisStatus`를 안 내려주므로 현재는 항상 기존과 동일한 분기라 회귀 없음.

## 계획에서 제외된 것

- 설문 미응답 학생 FCM 알림 (실효성 없다고 판단해 제외 확정)
- "학생 희망 팀 제출 후 AI 보정" 방식 (AI 자동 / 직접 구성 2가지로 축소)
- AI 처리 진행률/신뢰성 설명 보강 (불필요 판단, 8/6 제외 확정)

---

## 남은 작업 순서

### 1순위 — 지금 만든 기능 검증 (백엔드 무관, 바로 가능)
- [x] **로그인/로그아웃, 관리자·학생 대시보드, 페이지 이동 콘솔 에러 없음 확인(8/4)** — 로컬 백엔드(docker compose) 띄우고 `tea1111`(관리자)/`stu2301`(학생) 실계정으로 로그인해서 확인. 로그아웃 후 `localStorage`만 지워도 refresh 쿠키로 자동 재로그인되는 것도 실제로 확인(지난번 `useAuth.js` 검토 때 지키기로 한 그 동작).
- [x] **AI 팀 생성 흐름 — 에러 처리 정상 확인, 생성 자체는 백엔드/AI 서버 이슈로 막힘(8/4)** — `stu2399`(시연학생) 설문을 34문항 전부 채워 제출 완료시켜서 2학년 설문 완료율 100%(10/10)로 만듦. 그 결과 "설문 미완료 학생" 에러 화면은 정상적으로 사라지고 AI 생성이 실제로 시작되는 것까지 확인. 다만 생성 도중 **"AI 서버 호출에 실패했습니다"** 에러로 끝남 — 백엔드 로그 확인 결과 프론트 문제가 아니라 AI(FastAPI) 서버가 `role_counts`를 객체로 응답하는데 백엔드(`AiClient.java:171`, `AiTeamSummaryResponseDto.TeamDto.role_counts`)는 `List<RoleCountDto>`로 역직렬화를 시도하다 `MismatchedInputException` → `AiServerException`으로 실패하는 백엔드/AI 레이어 스키마 불일치 버그. 에러 메시지 자체는 한글로 정상 노출됨(`getApiErrorMessage` 수정 반영 확인). **AI 팀 생성 성공 케이스, 재생성/변경사항 모달은 이 백엔드 버그가 고쳐져야 이어서 확인 가능.**
- [x] **`POST /api/admin/teams/manual` 405 실제 재현(8/4)** — 위 2순위 4번 참고.
- [x] **`GET /api/user/students/search`(선호 팀원 검색) 수정 확인(8/4)** — `stu2399`로 재테스트 중 404 발생 → 원인은 프론트 코드가 아니라 **로컬 백엔드 도커 이미지가 8일 전(7/25) 빌드본이라 8/2에 추가된 검색 엔드포인트를 못 갖고 있던 것**(`docker inspect` 빌드 시각 vs `git log` 커밋 시각 비교로 확인). `docker compose build backend` + `up -d`로 이미지 재빌드 후 재확인하니 정상 200 응답, 검색 결과도 올바르게 나옴. 프론트 코드 수정(경로 등)은 이미 맞게 되어 있었음.
- [ ] 팀 재생성 전체 흐름(재생성 → 로딩 → 팀 에딧 복귀 → 변경사항 모달 → 적용/취소) — 확정된 팀이 있어야 재생성이 가능한데, AI 서버 스키마 버그로 팀이 아예 안 만들어져서 이번에도 확인 못 함
- [ ] 팀 채팅(전역 알림 포함) — 팀이 없어서 `/user/chat` 접근 자체가 막힘(정상 가드 동작은 확인). 팀 배정 후 재확인 필요

### 2순위 — 백엔드 확인 필요, 확인되는 즉시 마무리 가능 (거의 다 됨)
1. **팀 재생성 버전 API** — `TeamMatchingVersion` 엔티티, `versions/{id}`, `versions/diff`, `versions/{id}/apply`, `versions/{id}/discard`, `MatchingJob`의 `origin`/`baseVersionId`/`versionId` 필드. 프론트는 이미 이 스펙대로 `AdminTeamEdit.jsx`/`AdminTeamCreateLoading.jsx`/`teamApi.js`에 연결까지 끝냄 — 필드만 내려오면 그대로 동작.
2. **팀 생성 배치 스트리밍** — `totalBatches`/`completedBatches`/`partialTeams`. 위와 마찬가지로 프론트 구현은 끝, 확인만 남음.
3. **대시보드 `MOCK_*` → 실제 API 교체** — `requestMyTeam`/`requestUserProjectPlan`/`requestNoticeList`/`requestAdminStudentList`/`requestAdminLogList`는 이미 존재 확인됨(연결만 하면 됨). 채팅 미리보기(`recentChatMessages`)만 대응 API가 아예 없어서 백엔드에 신규 필드 요청 필요.
4. **`POST /api/admin/teams/manual` 백엔드 미구현 — 실제 재현 확인 완료(8/4)** — 로컬 백엔드(`docker compose`, `gao-backend`)에 로그인해서 직접 구성 화면에서 "직접 구성 완료"를 눌러 재현함: `405 Method Not Allowed` 응답. 프론트 코드는 스펙대로 맞게 구현돼 있고 백엔드에만 없는 게 확정됐으니, 백엔드가 엔드포인트를 추가하면 바로 될 것. **영문 에러 원문("Method Not Allowed")이 그대로 노출되던 문제는 프론트에서 자체 수정 완료(8/4)** — `src/utils/apiError.js`에 `getApiErrorMessage` 헬퍼 신규 작성, `GlobalExceptionHandler`가 실제로 처리하는 상태코드(400/401/403/404/503)에서만 서버 메시지를 신뢰하고 그 외(405 등 스프링 기본 에러 페이지로 빠지는 케이스)는 항상 한글 fallback을 쓰도록 7개 호출 지점에 전부 적용함.
5. **`/user/queue/chat/notifications` 백엔드 발행 확인** — 팀 채팅 전역 알림용 신규 채널. 백엔드가 아직 이 경로로 안 보내면 조용히 no-op(위 완료 목록 참고).
6. **AI 서버 `role_counts` 응답 스키마 불일치 — 신규 발견(8/4)** — AI(FastAPI) 매칭 서버가 팀 생성 응답의 `role_counts`를 객체(object)로 내려주는데, 백엔드 `AiTeamSummaryResponseDto.TeamDto.role_counts`는 `List<RoleCountDto>`를 기대해서 역직렬화 시 `MismatchedInputException` → `AiServerException`으로 실패, AI 팀 생성이 항상 실패함(`AiClient.java:171`). 프론트 범위 밖(백엔드/AI 레이어)이라 코드는 안 건드렸고, 백엔드·AI 담당에게 스키마 정합 확인 요청 필요. 이게 고쳐져야 AI 팀 생성 성공 케이스·재생성·변경사항 모달·팀 채팅 테스트를 이어갈 수 있음.

### 2.5순위 — Firebase 프로젝트 실제 값만 있으면 바로 되는 것
1. **`VITE_FIREBASE_*`/VAPID key 필요** — 팀에서 Firebase 프로젝트를 만들면 `.env.development`/`.env.production`에 `VITE_FIREBASE_API_KEY`, `VITE_FIREBASE_AUTH_DOMAIN`, `VITE_FIREBASE_PROJECT_ID`, `VITE_FIREBASE_STORAGE_BUCKET`, `VITE_FIREBASE_MESSAGING_SENDER_ID`, `VITE_FIREBASE_APP_ID`, `VITE_FIREBASE_VAPID_KEY`를 채우고, `public/firebase-messaging-sw.js`의 `REPLACE_ME` 6곳도 같은 값으로 채워야 함(서비스워커는 정적 파일이라 `import.meta.env`를 못 씀). **`.env` 파일 자체는 직접 건드리면 안 되는 파일이라 이 작업은 팀원이 직접 해야 함.**
2. **`POST /api/user/fcm-token`/`DELETE /api/user/fcm-token` 백엔드 확인** — `FcmToken` 엔티티, 로그인/로그아웃 시 등록·해제 API. 프론트는 `useFcmNotifications.js`에 이미 연결 완료.
3. **`JournalDeadlineScheduler` 등 백엔드 자동 발송 확인** — `notificationType: JOURNAL_DEADLINE`/`NOTICE_CREATED` payload가 실제로 오는지. 프론트는 `NotificationToast`가 타입 무관하게 제네릭 처리하므로 추가 작업 없음.

### 3순위 — 아직 프론트 실구현도 안 한 것
Notion P0 항목은 위 완료 목록으로 전부 끝났음(설문 태그 제거·선호 팀원 검색·버전 저장·재생성 비교·팀 구성 방식 선택 5개 다 완료). AI 처리 진행률/신뢰성 설명 보강(구 P1)은 불필요 판단으로 계획에서 제외(8/6).

1. **팀 채팅 — 메시지 고정: 실구현 완료(8/6)**. 디자인 목업(`Design/TeamChat.html`)의 고정 바를 다시 다듬어서(민트 배경 전체 채움 → 흰 배경+좌측 얇은 강조선으로 절제, 클릭 시 원본 메시지로 스크롤+하이라이트) `ChatMessage.jsx`/`ChatMessageList.jsx`/`UserTeamChat.jsx`/신규 `ChatPinnedBar.jsx`에 연결함. ~~백엔드에 고정 메시지 API가 아직 없어서 클라이언트 로컬 state로만 구현~~ → **정정(9/4)**: 백엔드에 `POST/DELETE /api/chat/channels/{channelId}/pin`이 실제로 존재하고(`ChatController.java:163,173`), 프론트도 `chatApi.js`의 `requestPinChatMessage`/`requestUnpinChatMessage`로 이미 서버에 저장하고 있음. `selectedChannel.pinnedMessageId`를 서버 값으로 읽는 것까지 연결 완료 — 로컬 state 아님.
2. **팀 채팅 — 담당 업무 표시: 실구현 완료(8/6)**. 목업의 자유 텍스트 담당 업무("로그인/라우팅" 등)와 달리, 그 정도로 세부적인 필드는 백엔드에 없어서 **이미 확정된 `GET /api/teams/my-team` 응답의 `members[].studentRole`(희망 직군)을 대신 사용** — `ChatMemberSidebar.jsx`에 "담당: 프론트엔드" 식으로 표시. `useUserTeamChat.js`가 팀 로드 시 `requestMyTeam()`을 한 번 호출해 `userId` 기준으로 presence 목록(`useChatPresence`, 이름/온라인 여부만 내려줌)과 합침. `studentRole`이 없는 학생은 표시 생략(안전한 폴백).
3. **팀 채팅 — 읽음 상태 표시: 보류(8/6)**. 백엔드 코드 확인 결과 `ChatMemberPresenceResponseDto`엔 `userId`/`name`/`online`만 있고, 메시지별 읽음 인원을 알 수 있는 필드가 프로젝트 어디에도 없음(기존 `unreadCount`는 채널 단위 안 읽은 개수일 뿐, "이 메시지를 누가 읽었는지"와는 다른 개념). 실제 데이터 없이 숫자를 지어내는 건 하지 않았음 — 백엔드에 메시지별 읽음 인원 API가 생기면 그때 구현.

### 보류
- 팀 버전 이력 목록 화면(`GET /api/admin/team-recommendations/versions?grade=` 전체 목록 UI) — 지금은 "직전 버전과의 비교"만 구현, 여러 버전을 오가며 보는 UI는 필요성이 확인되면 추가.

---

## 다음에 손댈 것 (제안)

Notion P0는 전부 끝났고, FCM 인프라·팀 채팅 전역 알림 뼈대까지 세웠다. 프론트에서 백엔드 확인 없이 바로 할 수 있는 새 작업은 이제 별로 안 남았음 — 남은 건 대부분 2순위/2.5순위의 "백엔드 확인 필요" 항목이거나(버전 API, 배치 스트리밍, `teams/manual`, 채팅 알림 발행, Firebase 키), 디자인부터 새로 해야 하는 P2(팀 채팅 고정/읽음/담당업무). 다음 세션은 **1순위 브라우저 실사용 검증**부터 하고, 그다음은 2순위 항목들을 백엔드 팀원과 하나씩 맞춰나가는 걸 추천한다.
