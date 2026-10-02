import { useEffect, useRef, type ReactNode } from "react";
import { X } from "lucide-react";
export function Modal({
  title,
  children,
  onClose,
  wide = false,
}: {
  title: string;
  children: ReactNode;
  onClose: () => void;
  wide?: boolean;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const d = ref.current!;
    d.showModal();
    const fn = (e: Event) => {
      e.preventDefault();
      onClose();
    };
    d.addEventListener("cancel", fn);
    return () => {
      d.removeEventListener("cancel", fn);
      d.close();
    };
  }, []);
  return (
    <dialog
      ref={ref}
      className={wide ? "modal wide" : "modal"}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      aria-label={title}
    >
      <header>
        <span>
          <span className="red">╭─</span> {title}
        </span>
        <button className="icon" aria-label="Close dialog" onClick={onClose}>
          <X size={17} />
        </button>
      </header>
      <div className="modal-body">{children}</div>
    </dialog>
  );
}
