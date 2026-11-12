import * as api from "../api";
import { QRLoginExpiresAt, QRLoginHelp, QRLoginPanel } from "./QRLoginPanel";
import { useQRLogin, type QRLoginProvider } from "./useQRLogin";

const p123: QRLoginProvider<api.P123QRSession, api.P123QRStatus, string> = {
  start: () => api.startP123QRLogin(),
  status: (session) => api.getP123QRStatus(session.uniID, session.loginUuid),
  evaluate: (next) => {
    if (next.accessToken) return { type: "success", credential: next.accessToken };
    return next.loginStatus === 2 || next.loginStatus === 4 ? { type: "terminal" } : { type: "pending" };
  },
  intervalMs: () => 1800,
  successMessage: "扫码成功，保存后生效",
};

export function P123QRCodeLogin({ onToken }: { onToken: (token: string) => void }) {
  const { session, status, starting, pollingError, start } = useQRLogin(p123, onToken);
  return (
    <QRLoginPanel
      qrImageDataUrl={session?.qrImageDataUrl}
      alt="123网盘扫码登录二维码"
      starting={starting}
      hasSession={!!session}
      onStart={start}
    >
      {pollingError && <QRLoginHelp>{pollingError}</QRLoginHelp>}
      <QRLoginExpiresAt expiresAt={session?.expiresAt} />
      {(status?.loginStatus === 2 || status?.loginStatus === 4) && (
        <QRLoginHelp>当前二维码{status.loginStatus === 2 ? "已被拒绝" : "已过期"}，请重新生成。</QRLoginHelp>
      )}
    </QRLoginPanel>
  );
}
