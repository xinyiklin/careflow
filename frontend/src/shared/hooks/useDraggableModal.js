import { useEffect, useRef, useState } from "react";

function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

export default function useDraggableModal({
  isOpen,
  resetOnOpen = true,
} = {}) {
  const modalRef = useRef(null);
  const dragStateRef = useRef(null);

  const [position, setPosition] = useState(null);

  const centerModal = () => {
    const modalEl = modalRef.current;
    if (!modalEl) return;

    const modalWidth = modalEl.offsetWidth;
    const modalHeight = modalEl.offsetHeight;

    const x = Math.max((window.innerWidth - modalWidth) / 2, 0);
    const y = Math.max((window.innerHeight - modalHeight) / 2, 0);

    setPosition({ x, y });
  };

  const handlePointerMove = (e) => {
    const modalEl = modalRef.current;
    const dragState = dragStateRef.current;

    if (!modalEl || !dragState) return;

    const modalWidth = modalEl.offsetWidth;
    const modalHeight = modalEl.offsetHeight;

    const nextX = clamp(
      e.clientX - dragState.offsetX,
      0,
      Math.max(window.innerWidth - modalWidth, 0)
    );

    const nextY = clamp(
      e.clientY - dragState.offsetY,
      0,
      Math.max(window.innerHeight - modalHeight, 0)
    );

    setPosition({ x: nextX, y: nextY });
  };

  const handlePointerUp = () => {
    dragStateRef.current = null;
    document.body.style.userSelect = "";
    document.body.style.cursor = "";

    window.removeEventListener("pointermove", handlePointerMove);
    window.removeEventListener("pointerup", handlePointerUp);
  };

  const handlePointerDown = (e) => {
    if (e.button !== 0) return;

    const modalEl = modalRef.current;
    if (!modalEl) return;

    const rect = modalEl.getBoundingClientRect();

    dragStateRef.current = {
      offsetX: e.clientX - rect.left,
      offsetY: e.clientY - rect.top,
    };

    document.body.style.userSelect = "none";
    document.body.style.cursor = "grabbing";

    window.addEventListener("pointermove", handlePointerMove);
    window.addEventListener("pointerup", handlePointerUp);
  };

  useEffect(() => {
    if (!isOpen) return;

    if (resetOnOpen) {
      requestAnimationFrame(() => {
        centerModal();
      });
    }
  }, [isOpen, resetOnOpen]);

  useEffect(() => {
    if (!isOpen) return;

    const handleResize = () => {
      const modalEl = modalRef.current;
      if (!modalEl || !position) return;

      const modalWidth = modalEl.offsetWidth;
      const modalHeight = modalEl.offsetHeight;

      setPosition((prev) => {
        if (!prev) return prev;

        return {
          x: clamp(prev.x, 0, Math.max(window.innerWidth - modalWidth, 0)),
          y: clamp(prev.y, 0, Math.max(window.innerHeight - modalHeight, 0)),
        };
      });
    };

    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, [isOpen, position]);

  useEffect(() => {
    if (isOpen) return;

    handlePointerUp();
  }, [isOpen]);

  useEffect(() => {
    return () => {
      handlePointerUp();
    };
  }, []);

  const modalStyle = position
    ? {
      left: `${position.x}px`,
      top: `${position.y}px`,
    }
    : undefined;

  return {
    modalRef,
    modalStyle,
    dragHandleProps: {
      onPointerDown: handlePointerDown,
    },
    recenter: centerModal,
  };
}