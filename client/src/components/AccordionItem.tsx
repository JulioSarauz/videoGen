import type { ReactNode } from "react";

export default function AccordionItem({
  title,
  isOpen,
  onToggle,
  children
}: {
  title: ReactNode;
  isOpen: boolean;
  onToggle: () => void;
  children: ReactNode;
}) {
  return (
    <div className="accordion-item">
      <button type="button" className="accordion-header" onClick={onToggle}>
        <span className={`accordion-chevron${isOpen ? " accordion-chevron-open" : ""}`}>▸</span>
        {title}
      </button>
      {isOpen && <div className="accordion-body">{children}</div>}
    </div>
  );
}
