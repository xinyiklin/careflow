import { useEffect, useRef, useState, useCallback } from "react";

function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

export default function useDraggableModal({ isOpen, resetOnOpen = true } = {}) {
  const modalRef = useRef(null);
  const [position, setPosition] = useState(null);
  const [isDragging, setIsDragging] = useState(false);
  const dragStateRef = useRef({ offsetX: 0, offsetY: 0 });

  const centerModal = useCallback(() => {
    const modalEl = modalRef.current;
    if (!modalEl) return;

    const x = Math.max((window.innerWidth - modalEl.offsetWidth) / 2, 0);
    const y = Math.max((window.innerHeight - modalEl.offsetHeight) / 2, 0);

    setPosition({ x, y });
  }, []);

  const handlePointerDown = useCallback((e) => {
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
    if (!isDragging) return;

    const handlePointerMove = (e) => {
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
  }, [isDragging]); // Only re-runs when dragging starts/stops

  // 4. Handle auto-centering and window resizing
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
