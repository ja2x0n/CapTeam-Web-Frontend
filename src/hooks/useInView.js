import { useEffect, useRef } from "react";

const REDUCED_MOTION = "(prefers-reduced-motion: reduce)";

/**
 * 컨테이너 안의 [data-reveal] 요소들을 순서대로 "스르륵" 올린다.
 * replayKey가 바뀌면(필터/탭/검색 변경) 처음부터 다시 재생한다.
 *
 * 데이터가 나중에 도착해 요소가 뒤늦게 붙는 경우가 많아서(공지, 채팅 미리보기 등)
 * MutationObserver로 새로 생긴 요소도 계속 감시한다.
 * 이게 없으면 늦게 붙은 요소가 opacity:0 그대로 남아 화면에서 사라진다.
 */
const useInView = ({ replayKey = null, stagger = 50, threshold = 0.15 } = {}) => {
    const containerRef = useRef(null);

    useEffect(() => {
        const container = containerRef.current;
        if (!container) return;

        const reduced = window.matchMedia(REDUCED_MOTION).matches;
        const showAll = () => {
            container
                .querySelectorAll("[data-reveal]")
                .forEach((el) => el.classList.add("isVisible"));
        };

        if (reduced || !("IntersectionObserver" in window)) {
            showAll();
            return;
        }

        const timers = [];
        let shownCount = 0;

        const intersectionObserver = new IntersectionObserver(
            (entries) => {
                entries.forEach((entry) => {
                    if (!entry.isIntersecting) return;

                    intersectionObserver.unobserve(entry.target);
                    const delay = shownCount * stagger;
                    shownCount += 1;
                    timers.push(
                        setTimeout(
                            () => entry.target.classList.add("isVisible"),
                            delay
                        )
                    );
                });
            },
            { threshold }
        );

        const observeNewTargets = () => {
            container
                .querySelectorAll("[data-reveal]:not(.isVisible)")
                .forEach((el) => intersectionObserver.observe(el));
        };

        // 재생 전 초기화 — replayKey가 바뀌면 다시 아래에서 올라와야 한다
        container
            .querySelectorAll("[data-reveal]")
            .forEach((el) => el.classList.remove("isVisible"));
        observeNewTargets();

        const mutationObserver = new MutationObserver(observeNewTargets);
        mutationObserver.observe(container, { childList: true, subtree: true });

        // 어떤 이유로든 관찰이 늦어 화면에 안 뜨는 일이 없도록 마지막 안전장치
        const failSafeId = setTimeout(showAll, 2500);

        return () => {
            intersectionObserver.disconnect();
            mutationObserver.disconnect();
            clearTimeout(failSafeId);
            timers.forEach(clearTimeout);
        };
    }, [replayKey, stagger, threshold]);

    return containerRef;
};

export default useInView;
