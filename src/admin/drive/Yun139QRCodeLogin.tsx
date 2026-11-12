import * as api from "../api";
import { QRLoginHelp, QRLoginPanel } from "./QRLoginPanel";
import { useQRLogin, type QRLoginProvider } from "./useQRLogin";

const yun139: QRLoginProvider<api.Yun139QRSession, api.Yun139QRStatus, string> = {
  start: (signal) => api.startYun139QRLogin(signal),
  status: (session, signal) => api.getYun139QRStatus(session.sessionId, signal),
  evaluate: (next) => {
    if (next.state === "success") {
      return next.authorization
        ? { type: "success", credential: next.authorization }
        : { type: "failed", error: "登录成功但未获取到授权，请重新生成二维码" };
    }
    return next.state === "expired" || next.state === "canceled" || next.state === "error"
      ? { type: "terminal" }
      : { type: "pending" };
  },
  intervalMs: () => 2000,
  successMessage: "扫码成功，已填入 Authorization，保存后生效",
  expiry: (session) => ({
    at: Date.parse(session.expiresAt),
    status: { state: "expired", statusText: "二维码已过期，请重新生成" },
  }),
  failedStatus: { state: "error", statusText: "扫码登录失败，请重新生成二维码" },
};

export function Yun139QRCodeLogin({ onAuthorization }: { onAuthorization: (authorization: string) => void }) {
  const { session, status, starting, pollingError, start } = useQRLogin(yun139, onAuthorization);
  return (
    <QRLoginPanel
      qrImageDataUrl={session?.qrImageDataUrl}
      alt="移动网盘扫码登录二维码"
      starting={starting}
      hasSession={!!session}
      onStart={start}
    >
      <QRLoginHelp>{status?.statusText || "请使用中国移动云盘 App 或微信扫码"}</QRLoginHelp>
      {pollingError && <QRLoginHelp>{pollingError}</QRLoginHelp>}
    </QRLoginPanel>
  );
}
