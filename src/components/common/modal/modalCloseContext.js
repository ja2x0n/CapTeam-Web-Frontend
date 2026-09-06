import { createContext, useContext } from "react";

/** 모달 안쪽에서 퇴장 모션을 거쳐 닫기 위한 컨텍스트. ModalOverlay가 값을 넣는다. */
export const ModalCloseContext = createContext(null);

export const useModalClose = () => useContext(ModalCloseContext);
