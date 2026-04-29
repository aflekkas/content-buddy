"use client";

import { useEffect } from "react";
import { BRAND_NAME } from "@/lib/brand";

export default function GlobalError({
  error,
  unstable_retry,
}: {
  error: Error & { digest?: string };
  unstable_retry: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <html lang="en">
      <body
        style={{
          margin: 0,
          minHeight: "100vh",
          background: "#000",
          color: "#fff",
          fontFamily:
            'ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, sans-serif',
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: "24px",
          textAlign: "center",
        }}
      >
        <title>{`Error · ${BRAND_NAME}`}</title>
        <div style={{ maxWidth: 420 }}>
          <div
            aria-hidden
            style={{
              width: 48,
              height: 48,
              borderRadius: 9999,
              border: "1px solid rgba(255,255,255,0.18)",
              background: "rgba(255,255,255,0.06)",
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              marginBottom: 20,
            }}
          >
            <svg
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z" />
              <line x1="12" x2="12" y1="9" y2="13" />
              <line x1="12" x2="12.01" y1="17" y2="17" />
            </svg>
          </div>

          <h1
            style={{
              fontSize: 28,
              fontWeight: 600,
              letterSpacing: "-0.02em",
              margin: "0 0 8px",
            }}
          >
            This page couldn&apos;t load
          </h1>
          <p
            style={{
              fontSize: 14,
              color: "rgba(255,255,255,0.6)",
              margin: "0 0 24px",
            }}
          >
            Reload to try again, or go back.
          </p>

          <div
            style={{
              display: "flex",
              gap: 8,
              justifyContent: "center",
              flexWrap: "wrap",
            }}
          >
            <button
              type="button"
              onClick={() => unstable_retry()}
              style={{
                appearance: "none",
                cursor: "pointer",
                border: "1px solid transparent",
                background: "#fff",
                color: "#000",
                padding: "0 14px",
                height: 36,
                borderRadius: 8,
                fontSize: 14,
                fontWeight: 500,
              }}
            >
              Reload
            </button>
            <button
              type="button"
              onClick={() => {
                if (typeof window !== "undefined") window.history.back();
              }}
              style={{
                appearance: "none",
                cursor: "pointer",
                border: "1px solid rgba(255,255,255,0.18)",
                background: "transparent",
                color: "#fff",
                padding: "0 14px",
                height: 36,
                borderRadius: 8,
                fontSize: 14,
                fontWeight: 500,
              }}
            >
              Back
            </button>
          </div>

          {error.message ? (
            <pre
              style={{
                marginTop: 24,
                padding: 12,
                borderRadius: 8,
                border: "1px solid rgba(255,255,255,0.12)",
                background: "rgba(255,255,255,0.04)",
                fontFamily:
                  'ui-monospace, SFMono-Regular, Menlo, Consolas, monospace',
                fontSize: 11,
                color: "rgba(255,255,255,0.7)",
                textAlign: "left",
                whiteSpace: "pre-wrap",
                wordBreak: "break-word",
                overflowX: "auto",
              }}
            >
              {error.message}
            </pre>
          ) : null}

          {error.digest ? (
            <p
              style={{
                marginTop: 16,
                fontFamily:
                  'ui-monospace, SFMono-Regular, Menlo, Consolas, monospace',
                fontSize: 11,
                color: "rgba(255,255,255,0.4)",
              }}
            >
              ref {error.digest}
            </p>
          ) : null}
        </div>
      </body>
    </html>
  );
}
