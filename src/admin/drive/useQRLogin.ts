import { useEffect, useRef, useState } from "react";
import { useToast } from "@/components/ToastContext";

/** How one status response moves a QR login forward. */
export type QRLoginStep<C> =
  | { type: "pending" }
  | { type: "terminal" }
  | { type: "success"; credential: C }
  | { type: "failed"; error: string };

export interface QRLoginProvider<S, T, C> {
  start: (signal: AbortSignal) => Promise<S>;
  status: (session: S, signal: AbortSignal) => Promise<T>;
  evaluate: (status: T) => QRLoginStep<C>;
  /** Delay before the next poll; read after every response. */
  intervalMs: (session: S, status: T | null) => number;
  successMessage: string;
  /** Stops polling at the session deadline and shows the given status. */
  expiry?: (session: S) => { at: number; status: T } | undefined;
  /** Status shown when a success response lacks its credential. */
  failedStatus?: T;
}

/**
 * Drives a QR login session: one request in flight at a time, polling that
 * survives parent rerenders, and cancellation on regenerate or unmount.
 * Callbacks are read through refs so late responses always reach the
 * latest form state.
 */
export function useQRLogin<S, T, C>(
  provider: QRLoginProvider<S, T, C>,
  onCredential: (credential: C) => void
) {
  const { show } = useToast();
  const [session, setSession] = useState<S | null>(null);
  const [status, setStatus] = useState<T | null>(null);
  const [starting, setStarting] = useState(false);
  const [pollingError, setPollingError] = useState("");
  const [completed, setCompleted] = useState(false);
  const latestRef = useRef({ provider, onCredential, show });
  latestRef.current = { provider, onCredential, show };
  const startControllerRef = useRef<AbortController | null>(null);
  const pollControllerRef = useRef<AbortController | null>(null);

  useEffect(() => () => startControllerRef.current?.abort(), []);

  async function start() {
    startControllerRef.current?.abort();
    pollControllerRef.current?.abort();
    const controller = new AbortController();
    startControllerRef.current = controller;
    setStarting(true);
    setSession(null);
    setStatus(null);
    setPollingError("");
    setCompleted(false);
    try {
      const next = await latestRef.current.provider.start(controller.signal);
      if (!controller.signal.aborted) setSession(next);
    } catch (e) {
      if (!controller.signal.aborted) {
        latestRef.current.show(e instanceof Error ? e.message : "生成二维码失败", "error");
      }
    } finally {
      if (!controller.signal.aborted) setStarting(false);
    }
  }

  useEffect(() => {
    if (!session || completed) return;
    const activeSession = session;
    const controller = new AbortController();
    pollControllerRef.current = controller;
    let timer: number | undefined;
    let expiryTimer: number | undefined;

    const expiry = latestRef.current.provider.expiry?.(activeSession);
    if (expiry) {
      expiryTimer = window.setTimeout(() => {
        controller.abort();
        if (timer !== undefined) window.clearTimeout(timer);
        setPollingError("");
        setStatus(expiry.status);
      }, Math.max(0, expiry.at - Date.now()));
    }

    async function poll() {
      if (controller.signal.aborted) return;
      const { provider } = latestRef.current;
      let latest: T | null = null;
      try {
        const next = await provider.status(activeSession, controller.signal);
        if (controller.signal.aborted) return;
        latest = next;
        setStatus(next);
        setPollingError("");
        const step = provider.evaluate(next);
        if (step.type !== "pending") {
          window.clearTimeout(expiryTimer);
          if (step.type === "success") {
            setCompleted(true);
            const { onCredential, show } = latestRef.current;
            onCredential(step.credential);
            show(provider.successMessage, "success");
          } else if (step.type === "failed") {
            if (provider.failedStatus) setStatus(provider.failedStatus);
            setPollingError(step.error);
          }
          return;
        }
      } catch (e) {
        if (controller.signal.aborted) return;
        setPollingError(e instanceof Error ? e.message : "查询扫码状态失败");
      }
      if (!controller.signal.aborted) {
        timer = window.setTimeout(poll, provider.intervalMs(activeSession, latest));
      }
    }

    poll();
    return () => {
      controller.abort();
      window.clearTimeout(expiryTimer);
      if (timer !== undefined) window.clearTimeout(timer);
    };
  }, [session, completed]);

  return { session, status, starting, pollingError, start };
}
