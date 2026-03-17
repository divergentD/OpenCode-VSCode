import React from "react"

type Props = {
  containerRef: React.RefObject<HTMLDivElement | null>
  visible: boolean
}

export function ScrollToBottomButton({ containerRef, visible }: Props) {
  const handleClick = () => {
    const container = containerRef.current
    if (!container) return
    container.scrollTo({
      top: container.scrollHeight,
      behavior: "smooth"
    })
  }

  return (
    <button
      className="scroll-to-bottom-btn"
      onClick={handleClick}
      aria-label="Scroll to bottom"
      title="Scroll to bottom"
      style={{
        position: "fixed",
        right: "24px",
        bottom: "120px",
        width: "40px",
        height: "40px",
        borderRadius: "50%",
        background: "#3b82f6",
        border: "none",
        cursor: "pointer",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        boxShadow: "0 4px 12px rgba(59, 130, 246, 0.3)",
        opacity: visible ? 1 : 0,
        pointerEvents: visible ? "auto" : "none",
        transform: visible ? "scale(1)" : "scale(0.8)",
        transition: "opacity 0.3s ease, transform 0.2s ease",
        zIndex: 100
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.transform = "scale(1.05)"
        e.currentTarget.style.background = "#2563eb"
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.transform = visible ? "scale(1)" : "scale(0.8)"
        e.currentTarget.style.background = "#3b82f6"
      }}
    >
      <svg
        width="20"
        height="20"
        viewBox="0 0 24 24"
        fill="none"
        stroke="white"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M12 5v14M19 12l-7 7-7-7" />
      </svg>
    </button>
  )
}
