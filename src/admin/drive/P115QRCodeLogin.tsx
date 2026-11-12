import * as api from "../api";
import { QRLoginHelp, QRLoginPanel } from "./QRLoginPanel";
import { useQRLogin, type QRLoginProvider } from "./useQRLogin";

const p115: QRLoginProvider<api.P115QRSession, api.P115QRStatus, string> = {
  start: (signal) => api.startP115QRLogin(signal),
  status: (session, signal) => api.getP115QRStatus(session, signal),
  evaluate: (next) => {
    if (next.state === "success") {
      return next.cookie
        ? { type: "success", credential: next.cookie }
        : { type: "failed", error: "登录成功但未获取到 Cookie，请重新生成二维码" };
    }
    return next.state === "expired" || next.state === "canceled" || next.state === "error"
      ? { type: "terminal" }
      : { type: "pending" };
  },
  intervalMs: () => 2000,
  successMessage: "扫码成功，已填入 Cookie，保存后生效",
};

export function P115QRCodeLogin({ onCookie }: { onCookie: (cookie: string) => void }) {
  const { session, status, starting, pollingError, start } = useQRLogin(p115, onCookie);
  return (
    <QRLoginPanel
      qrImageDataUrl={session?.qrImageDataUrl}
      alt="115 网盘扫码登录二维码"
      starting={starting}
      hasSession={!!session}
      onStart={start}
    >
      {pollingError && <QRLoginHelp>{pollingError}</QRLoginHelp>}
      {status?.state === "scanned" && <QRLoginHelp>已扫码，请在 115 App 确认登录。</QRLoginHelp>}
      {(status?.state === "expired" || status?.state === "canceled") && (
        <QRLoginHelp>当前二维码{status.state === "canceled" ? "已取消" : "已过期"}，请重新生成。</QRLoginHelp>
      )}
      {status?.state === "error" && <QRLoginHelp>扫码状态异常，请重新生成二维码。</QRLoginHelp>}
    </QRLoginPanel>
  );
}
