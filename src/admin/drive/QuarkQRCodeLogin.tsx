import * as api from "../api";
import { QRLoginHelp, QRLoginPanel } from "./QRLoginPanel";
import { useQRLogin, type QRLoginProvider } from "./useQRLogin";

const quark: QRLoginProvider<api.QuarkQRSession, api.QuarkQRStatus, string> = {
  start: () => api.startQuarkQRLogin(),
  status: (session) => api.getQuarkQRStatus(session.token),
  evaluate: (next) => {
    if (next.state === "success") {
      return next.cookie
        ? { type: "success", credential: next.cookie }
        : { type: "failed", error: "登录成功但未获取到 Cookie，请重新生成二维码" };
    }
    return next.state === "expired" || next.state === "error" ? { type: "terminal" } : { type: "pending" };
  },
  intervalMs: () => 2000,
  successMessage: "扫码成功，已填入 Cookie，保存后生效",
};

export function QuarkQRCodeLogin({ onCookie }: { onCookie: (cookie: string) => void }) {
  const { session, status, starting, pollingError, start } = useQRLogin(quark, onCookie);
  return (
    <QRLoginPanel
      qrImageDataUrl={session?.qrImageDataUrl}
      alt="夸克网盘扫码登录二维码"
      starting={starting}
      hasSession={!!session}
      onStart={start}
    >
      {pollingError && <QRLoginHelp>{pollingError}</QRLoginHelp>}
      {status?.state === "expired" && <QRLoginHelp>当前二维码已过期，请重新生成。</QRLoginHelp>}
      {status?.state === "error" && <QRLoginHelp>扫码状态异常，请重新生成二维码。</QRLoginHelp>}
    </QRLoginPanel>
  );
}
