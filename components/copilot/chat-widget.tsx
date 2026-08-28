
"use client";

import { useState, useRef, useEffect } from "react";
import { MessageSquare, X, Send, Loader2 } from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

type Message = {
  role: "user" | "assistant";
  content: string;
};

export function ChatWidget() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);

  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop =
        scrollRef.current.scrollHeight;
    }
  }, [messages, loading]);

  const handleSend = async () => {
    if (!input.trim() || loading) return;

    const userMessage: Message = {
      role: "user",
      content: input,
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setLoading(true);

    try {
      const res = await fetch("/api/ai/copilot", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          messages: [...messages, userMessage],
        }),
      });

      const data = await res.json();

      const assistantMessage: Message = {
        role: "assistant",
        content:
          data.text ||
          "Sorry, I couldn't process that.",
      };

      setMessages((prev) => [
        ...prev,
        assistantMessage,
      ]);
    } catch (error) {
      console.error("Chat error:", error);

      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content:
            "Sorry, something went wrong. Please try again.",
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      {/* Floating Chat Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="fixed bottom-6 right-6 z-50 flex h-14 w-14 items-center justify-center rounded-full bg-indigo-600 text-white shadow-lg shadow-indigo-600/30 transition-all hover:scale-105 hover:bg-indigo-500"
      >
        {isOpen ? (
          <X className="h-6 w-6" />
        ) : (
          <MessageSquare className="h-6 w-6" />
        )}
      </button>

      {/* Chat Window */}
      {isOpen && (
        <div className="fixed bottom-24 right-6 z-50 flex h-[500px] w-[350px] flex-col overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-900 shadow-2xl backdrop-blur-xl">

          {/* Header */}
          <div className="flex items-center justify-between border-b border-zinc-800 bg-zinc-950/50 p-4">
            <div className="flex items-center gap-2">
              <div className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />

                <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
              </div>

              <h3 className="text-sm font-semibold text-white">
                AI Career Copilot
              </h3>
            </div>
          </div>

          {/* Messages */}
          <div
            ref={scrollRef}
            className="flex-1 space-y-4 overflow-y-auto p-4"
          >
            {messages.length === 0 && (
              <div className="flex h-full flex-col items-center justify-center text-center">
                <MessageSquare className="mb-2 h-8 w-8 text-zinc-700" />

                <p className="text-sm text-zinc-500">
                  Ask me about your applications,
                  metrics, or upcoming deadlines!
                </p>
              </div>
            )}

            {messages.map((m, i) => (
              <div
                key={i}
                className={`flex ${
                  m.role === "user"
                    ? "justify-end"
                    : "justify-start"
                }`}
              >
                <div
                  className={`max-w-[85%] rounded-2xl px-3 py-2 text-sm ${
                    m.role === "user"
                      ? "bg-indigo-600 text-white"
                      : "bg-zinc-800 text-zinc-100"
                  }`}
                >
                  {m.role === "user" ? (
                    m.content
                  ) : (
                    <ReactMarkdown
                      remarkPlugins={[remarkGfm]}
                      components={{
                        h1: ({ node, ...props }) => (
                          <h1
                            className="mb-2 text-base font-bold"
                            {...props}
                          />
                        ),

                        h2: ({ node, ...props }) => (
                          <h2
                            className="mb-2 text-sm font-bold"
                            {...props}
                          />
                        ),

                        h3: ({ node, ...props }) => (
                          <h3
                            className="mb-1 text-sm font-semibold"
                            {...props}
                          />
                        ),

                        p: ({ node, ...props }) => (
                          <p
                            className="mb-2 leading-relaxed"
                            {...props}
                          />
                        ),

                        ul: ({ node, ...props }) => (
                          <ul
                            className="mb-2 list-disc space-y-1 pl-5"
                            {...props}
                          />
                        ),

                        ol: ({ node, ...props }) => (
                          <ol
                            className="mb-2 list-decimal space-y-1 pl-5"
                            {...props}
                          />
                        ),

                        li: ({ node, ...props }) => (
                          <li
                            className="text-xs leading-relaxed"
                            {...props}
                          />
                        ),

                        strong: ({ node, ...props }) => (
                          <strong
                            className="font-bold text-white"
                            {...props}
                          />
                        ),

                        code: ({ node, ...props }) => (
                          <code
                            className="rounded bg-zinc-950 px-1 py-0.5 text-xs text-indigo-300"
                            {...props}
                          />
                        ),

                        pre: ({ node, ...props }) => (
                          <pre
                            className="my-2 overflow-x-auto rounded-lg bg-zinc-950 p-2 text-xs"
                            {...props}
                          />
                        ),

                        table: ({ node, ...props }) => (
                          <div className="my-2 overflow-x-auto">
                            <table
                              className="w-full border-collapse text-xs"
                              {...props}
                            />
                          </div>
                        ),

                        th: ({ node, ...props }) => (
                          <th
                            className="border border-zinc-600 bg-zinc-700 px-2 py-1 text-left"
                            {...props}
                          />
                        ),

                        td: ({ node, ...props }) => (
                          <td
                            className="border border-zinc-600 px-2 py-1"
                            {...props}
                          />
                        ),

                        a: ({ node, ...props }) => (
                          <a
                            className="text-indigo-400 underline hover:text-indigo-300"
                            target="_blank"
                            rel="noopener noreferrer"
                            {...props}
                          />
                        ),
                      }}
                    >
                      {m.content}
                    </ReactMarkdown>
                  )}
                </div>
              </div>
            ))}

            {/* Loading */}
            {loading && (
              <div className="flex justify-start">
                <div className="rounded-2xl bg-zinc-800 px-3 py-2">
                  <Loader2 className="h-4 w-4 animate-spin text-zinc-400" />
                </div>
              </div>
            )}
          </div>

          {/* Input */}
          <div className="flex items-center gap-2 border-t border-zinc-800 bg-zinc-950/50 p-3">
            <input
              value={input}
              onChange={(e) =>
                setInput(e.target.value)
              }
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  handleSend();
                }
              }}
              placeholder="Ask about your pipeline..."
              className="flex-1 rounded-full bg-zinc-800 px-4 py-2 text-sm text-zinc-100 placeholder:text-zinc-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            />

            <button
              onClick={handleSend}
              disabled={loading || !input.trim()}
              className="flex h-8 w-8 items-center justify-center rounded-full bg-indigo-600 text-white hover:bg-indigo-500 disabled:opacity-50"
            >
              <Send className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}
    </>
  );
}

