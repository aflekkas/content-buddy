"use client";

import { useEffect } from "react";
import { ErrorScreen } from "@/components/ui/error-screen";

export default function RootError({
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
    <ErrorScreen
      variant="page"
      digest={error.digest}
      errorMessage={error.message}
      errorStack={
        process.env.NODE_ENV === "development" ? error.stack : undefined
      }
      onRetry={unstable_retry}
    />
  );
}
