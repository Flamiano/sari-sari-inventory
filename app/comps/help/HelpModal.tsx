"use client";

import { useState, useRef, useEffect } from "react";
import { X, HelpCircle, Send, Bot, User, ChevronDown } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

interface HelpModalProps {
    isOpen: boolean;
    onClose: () => void;
}

interface Message {
    id: string;
    role: "user" | "assistant";
    text: string;
    time: string;
}

const QUICK_QUESTIONS = [
    "How do I manage store owners?",
    "How do I view sales reports?",
    "How do I handle staff oversight?",
    "What does low stock alert mean?",
];

const FAQ: Record<string, string> = {
    "how do i manage store owners":
        "Navigate to **Store Owners** in the sidebar. You can view all registered store owner accounts, their store names, emails, and activity. Currently, owners self-register — you can monitor their status from that section.",
    "how do i view sales reports":
        "Go to **Reports** in the sidebar for full analytics. The **Dashboard** also shows a real-time revenue breakdown with Today / Week / Month / Year filters, plus a store revenue leaderboard.",
    "how do i handle staff oversight":
        "Click **Staff Oversight** in the sidebar. You'll see all staff members across every store, their roles (cashier/staff/manager), attendance records, and activity logs.",
    "what does low stock alert mean":
        "A **Low Stock** alert means a product has ≤5 units remaining (or ≤2 for prepared meals). You'll see the count on the Dashboard. Go to **Inventory** to drill down by store.",
    "how do i resolve feedback":
        "Open **Feedback Hub**, click on a feedback item, and update its status to *In Review* or *Resolved*. The bell icon in the topbar shows the count of open items.",
    "what is utang":
        "**Utang** (credit/debt) tracks amounts owed by customers to each store. The Dashboard shows the total unpaid balance across all stores. Store owners manage individual records.",
};

function getAutoReply(input: string): string {
    const lower = input.toLowerCase();
    for (const [key, answer] of Object.entries(FAQ)) {
        if (lower.includes(key.split(" ").slice(0, 3).join(" "))) return answer;
    }
    return "I'm not sure about that specific question. For detailed help, check the **Reports** or relevant section in the sidebar. You can also reach the development team at support@sarisariims.com.";
}

function formatTime() {
    return new Date().toLocaleTimeString("en-PH", { hour: "2-digit", minute: "2-digit" });
}

export default function HelpModal({ isOpen, onClose }: HelpModalProps) {
    const [messages, setMessages] = useState<Message[]>([
        {
            id: "0",
            role: "assistant",
            text: "Hi Superadmin 👋 I'm your SariSari.IMS help assistant. How can I help you today?",
            time: formatTime(),
        },
    ]);
    const [input, setInput] = useState("");
    const [typing, setTyping] = useState(false);
    const bottomRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        bottomRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [messages, typing]);

    const sendMessage = (text: string) => {
        if (!text.trim()) return;
        const userMsg: Message = { id: Date.now().toString(), role: "user", text: text.trim(), time: formatTime() };
        setMessages((prev) => [...prev, userMsg]);
        setInput("");
        setTyping(true);
        setTimeout(() => {
            const reply = getAutoReply(text);
            setMessages((prev) => [
                ...prev,
                { id: (Date.now() + 1).toString(), role: "assistant", text: reply, time: formatTime() },
            ]);
            setTyping(false);
        }, 900 + Math.random() * 400);
    };

    const handleKey = (e: React.KeyboardEvent) => {
        if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMessage(input); }
    };

    // Bold markdown renderer
    const renderText = (text: string) => {
        const parts = text.split(/(\*\*[^*]+\*\*)/g);
        return parts.map((part, i) =>
            part.startsWith("**") && part.endsWith("**")
                ? <strong key={i} style={{ fontWeight: 700 }}>{part.slice(2, -2)}</strong>
                : part
        );
    };

    return (
        <>
            <style>{`
        .help-overlay {
          position: fixed;
          inset: 0;
          z-index: 9998;
          display: flex;
          align-items: flex-end;
          justify-content: flex-end;
          padding: 16px;
          pointer-events: none;
        }

        @media (max-width: 640px) {
          .help-overlay {
            align-items: flex-end;
            justify-content: center;
            padding: 0;
          }
          .help-panel {
            border-radius: 20px 20px 0 0 !important;
            width: 100% !important;
            max-width: 100% !important;
            max-height: 85vh !important;
          }
        }

        .help-panel {
          pointer-events: all;
          width: 360px;
          max-width: calc(100vw - 32px);
          max-height: 560px;
          background: #ffffff;
          border-radius: 20px;
          box-shadow:
            0 0 0 1px rgba(0,0,0,0.07),
            0 32px 80px rgba(0,0,0,0.18),
            0 8px 24px rgba(0,0,0,0.10);
          display: flex;
          flex-direction: column;
          overflow: hidden;
        }

        .help-header {
          background: linear-gradient(135deg, #1e40af, #2563eb);
          padding: 16px 18px;
          display: flex;
          align-items: center;
          gap: 12px;
          flex-shrink: 0;
        }

        .help-avatar {
          width: 36px;
          height: 36px;
          border-radius: 10px;
          background: rgba(255,255,255,0.15);
          border: 1px solid rgba(255,255,255,0.2);
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
        }

        .help-header-title {
          font-size: 13px;
          font-weight: 700;
          color: white;
          line-height: 1;
        }

        .help-header-sub {
          font-size: 10px;
          color: rgba(255,255,255,0.65);
          margin-top: 3px;
        }

        .help-online-dot {
          width: 7px;
          height: 7px;
          border-radius: 50%;
          background: #4ade80;
          border: 1.5px solid white;
          flex-shrink: 0;
          margin-left: auto;
        }

        .help-close {
          width: 26px;
          height: 26px;
          border-radius: 7px;
          border: 1px solid rgba(255,255,255,0.2);
          background: rgba(255,255,255,0.1);
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          color: white;
          transition: background 0.14s;
          flex-shrink: 0;
        }
        .help-close:hover { background: rgba(255,255,255,0.2); }

        .help-messages {
          flex: 1;
          overflow-y: auto;
          padding: 14px 14px 8px;
          display: flex;
          flex-direction: column;
          gap: 10px;
          scrollbar-width: thin;
          scrollbar-color: #e5e7eb transparent;
        }

        .help-bubble-row {
          display: flex;
          align-items: flex-end;
          gap: 7px;
        }
        .help-bubble-row.user { flex-direction: row-reverse; }

        .help-bubble-icon {
          width: 24px;
          height: 24px;
          border-radius: 7px;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
          background: #eff6ff;
        }

        .help-bubble {
          max-width: 78%;
          padding: 9px 12px;
          border-radius: 14px;
          font-size: 12px;
          line-height: 1.5;
          color: #111827;
        }

        .help-bubble.assistant {
          background: #f3f4f6;
          border-radius: 4px 14px 14px 14px;
        }

        .help-bubble.user {
          background: #2563eb;
          color: white;
          border-radius: 14px 4px 14px 14px;
        }

        .help-bubble-time {
          font-size: 9px;
          color: #9ca3af;
          margin-top: 3px;
          text-align: right;
        }

        .help-typing {
          display: flex;
          gap: 4px;
          align-items: center;
          padding: 10px 14px;
        }

        .help-typing-dot {
          width: 6px;
          height: 6px;
          border-radius: 50%;
          background: #9ca3af;
          animation: help-bounce 1.2s ease-in-out infinite;
        }
        .help-typing-dot:nth-child(2) { animation-delay: 0.2s; }
        .help-typing-dot:nth-child(3) { animation-delay: 0.4s; }

        @keyframes help-bounce {
          0%, 80%, 100% { transform: translateY(0); }
          40% { transform: translateY(-5px); }
        }

        .help-quick {
          padding: 6px 14px 8px;
          display: flex;
          flex-wrap: wrap;
          gap: 5px;
          border-top: 1px solid #f3f4f6;
          flex-shrink: 0;
        }

        .help-quick-label {
          width: 100%;
          font-size: 9px;
          font-weight: 600;
          text-transform: uppercase;
          letter-spacing: 0.1em;
          color: #9ca3af;
          margin-bottom: 2px;
        }

        .help-quick-btn {
          padding: 4px 10px;
          border-radius: 99px;
          border: 1px solid #e5e7eb;
          background: white;
          font-family: inherit;
          font-size: 11px;
          font-weight: 500;
          color: #374151;
          cursor: pointer;
          transition: all 0.13s;
          white-space: nowrap;
        }
        .help-quick-btn:hover {
          background: #eff6ff;
          border-color: #bfdbfe;
          color: #2563eb;
        }

        .help-input-area {
          padding: 10px 12px;
          border-top: 1px solid #e5e7eb;
          display: flex;
          gap: 8px;
          align-items: flex-end;
          flex-shrink: 0;
          background: #fafafa;
        }

        .help-textarea {
          flex: 1;
          border: 1px solid #e5e7eb;
          border-radius: 10px;
          padding: 8px 12px;
          font-family: inherit;
          font-size: 12px;
          resize: none;
          outline: none;
          background: white;
          color: #111827;
          line-height: 1.4;
          max-height: 80px;
          transition: border-color 0.14s;
        }
        .help-textarea:focus { border-color: #2563eb; }
        .help-textarea::placeholder { color: #9ca3af; }

        .help-send-btn {
          width: 34px;
          height: 34px;
          border-radius: 10px;
          border: none;
          background: #2563eb;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          transition: all 0.14s;
          flex-shrink: 0;
          color: white;
        }
        .help-send-btn:hover { background: #1d4ed8; transform: scale(1.05); }
        .help-send-btn:disabled { opacity: 0.45; cursor: not-allowed; transform: none; }
      `}</style>

            <AnimatePresence>
                {isOpen && (
                    <div className="help-overlay">
                        <motion.div
                            className="help-panel"
                            initial={{ opacity: 0, y: 20, scale: 0.95 }}
                            animate={{ opacity: 1, y: 0, scale: 1 }}
                            exit={{ opacity: 0, y: 16, scale: 0.96 }}
                            transition={{ type: "spring", stiffness: 400, damping: 30 }}
                        >
                            {/* header */}
                            <div className="help-header">
                                <div className="help-avatar">
                                    <Bot size={17} color="white" />
                                </div>
                                <div style={{ flex: 1 }}>
                                    <div className="help-header-title">Admin Help Center</div>
                                    <div className="help-header-sub">SariSari.IMS Support</div>
                                </div>
                                <div className="help-online-dot" />
                                <button className="help-close" onClick={onClose}>
                                    <X size={12} />
                                </button>
                            </div>

                            {/* messages */}
                            <div className="help-messages">
                                {messages.map((m) => (
                                    <div key={m.id} className={`help-bubble-row ${m.role}`}>
                                        {m.role === "assistant" && (
                                            <div className="help-bubble-icon">
                                                <Bot size={13} style={{ color: "#2563eb" }} />
                                            </div>
                                        )}
                                        <div>
                                            <div className={`help-bubble ${m.role}`}>
                                                {renderText(m.text)}
                                            </div>
                                            <div className="help-bubble-time">{m.time}</div>
                                        </div>
                                    </div>
                                ))}

                                {typing && (
                                    <div className="help-bubble-row">
                                        <div className="help-bubble-icon">
                                            <Bot size={13} style={{ color: "#2563eb" }} />
                                        </div>
                                        <div className="help-bubble assistant">
                                            <div className="help-typing">
                                                <div className="help-typing-dot" />
                                                <div className="help-typing-dot" />
                                                <div className="help-typing-dot" />
                                            </div>
                                        </div>
                                    </div>
                                )}
                                <div ref={bottomRef} />
                            </div>

                            {/* quick questions */}
                            <div className="help-quick">
                                <div className="help-quick-label">Quick questions</div>
                                {QUICK_QUESTIONS.map((q) => (
                                    <button key={q} className="help-quick-btn" onClick={() => sendMessage(q)}>
                                        {q}
                                    </button>
                                ))}
                            </div>

                            {/* input */}
                            <div className="help-input-area">
                                <textarea
                                    className="help-textarea"
                                    placeholder="Ask a question…"
                                    value={input}
                                    onChange={(e) => setInput(e.target.value)}
                                    onKeyDown={handleKey}
                                    rows={1}
                                />
                                <button
                                    className="help-send-btn"
                                    onClick={() => sendMessage(input)}
                                    disabled={!input.trim() || typing}
                                >
                                    <Send size={14} />
                                </button>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </>
    );
}