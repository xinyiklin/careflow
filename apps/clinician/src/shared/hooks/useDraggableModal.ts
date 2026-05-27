import { useEffect, useRef, useState, useCallback } from "react";

import type { CSSProperties, PointerEvent } from "react";

type ModalPosition = {
  x: number;
  y: number;
};

type DraggableModalOptions = {
  isOpen?: boolean;
  resetOnOpen?: boolean;
};

type DragHandleProps = {
  onPointerDown: (event: PointerEvent<HTMLElement>) => void;
};

type DraggableModalState = {
  modalRef: React.RefObject<HTMLDivElement | null>;
  modalStyle: CSSProperties | undefined;
  dragHandleProps: DragHandleProps;
  recenter: () => void;
};

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

export default function useDraggableModal({
  isOpen,
  resetOnOpen = true,
}: DraggableModalOptions = {}): DraggableModalState {
  const modalRef = useRef<HTMLDivElement | null>(null);
  const [position, setPosition] = useState<ModalPosition | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const dragStateRef = useRef({ offsetX: 0, offsetY: 0 });

  const centerModal = useCallback(() => {
    const modalEl = modalRef.current;
    if (!modalEl) return;

    const x = Math.max((window.innerWidth - modalEl.offsetWidth) / 2, 0);
    const y = Math.max((window.innerHeight - modalEl.offsetHeight) / 2, 0);

    setPosition({ x, y });
  }, []);

  const handlePointerDown = useCallback((e: PointerEvent<HTMLElement>) => {
    if (e.button !== 0) return;
    const modalEl = modalRef.current;
    if (!modalEl) return;

    const rect = modalEl.getBoundingClientRect();
    dragStateRef.current = {
      offsetX: e.clientX - rect.left,
      offsetY: e.clientY - rect.top,
    };

    setIsDragging(true);
  }, []);

  useEffect(() => {
    if (!isDragging) return undefined;

    const handlePointerMove = (e: globalThis.PointerEvent) => {
      const modalEl = modalRef.current;
      if (!modalEl) return;

      const nextX = clamp(
        e.clientX - dragStateRef.current.offsetX,
        0,
        Math.max(window.innerWidth - modalEl.offsetWidth, 0)
      );

      const nextY = clamp(
        e.clientY - dragStateRef.current.offsetY,
        0,
        Math.max(window.innerHeight - modalEl.offsetHeight, 0)
      );

      setPosition({ x: nextX, y: nextY });
    };

    const handlePointerUp = () => {
      setIsDragging(false);
    };

    document.body.style.userSelect = "none";
    document.body.style.cursor = "grabbing";

    window.addEventListener("pointermove", handlePointerMove);
    window.addEventListener("pointerup", handlePointerUp);

    return () => {
      document.body.style.userSelect = "";
      document.body.style.cursor = "";
      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("pointerup", handlePointerUp);
    };
  }, [isDragging]);

  useEffect(() => {
    if (isOpen && resetOnOpen) {
      requestAnimationFrame(centerModal);
    }
  }, [isOpen, resetOnOpen, centerModal]);

  const modalStyle = position
    ? { left: `${position.x}px`, top: `${position.y}px` }
    : undefined;

  return {
    modalRef,
    modalStyle,
    dragHandleProps: { onPointerDown: handlePointerDown },
    recenter: centerModal,
  };
}
