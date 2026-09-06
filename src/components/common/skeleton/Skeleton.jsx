import styles from "./Skeleton.module.css";

/**
 * 로딩 자리표시자. 실제 레이아웃을 흉내내야 하므로
 * 화면마다 이걸 조합해서 그 화면 모양의 스켈레톤을 만든다.
 */
const Skeleton = ({
    width = "100%",
    height = 16,
    radius,
    circle = false,
    className = "",
    style,
}) => {
    return (
        <div
            aria-hidden="true"
            className={`${styles.skeleton} ${circle ? styles.circle : ""} ${className}`}
            style={{ width, height, borderRadius: radius, ...style }}
        />
    );
};

export default Skeleton;
