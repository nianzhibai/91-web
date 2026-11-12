import * as api from "../api";
import { QRLoginExpiresAt, QRLoginHelp, QRLoginPanel } from "./QRLoginPanel";
import { useQRLogin, type QRLoginProvider } from "./useQRLogin";

type GuangYaPanCredentials = { accessToken: string; refreshToken: string };

const pollDelay = (seconds: number) => Math.max(1000, seconds * 1000);

const guangYaPan: QRLoginProvider<api.GuangYaPanQRSession, api.GuangYaPanQRStatus, GuangYaPanCredentials> = {
  start: () => api.startGuangYaPanQRLogin(),
  status: (session) => api.getGuangYaPanQRStatus(session.deviceCode),
  evaluate: (next) => {
    if (next.accessToken && next.refreshToken) {
      return { type: "success", credential: { accessToken: next.accessToken, refreshToken: next.refreshToken } };
    }
    return next.state === "expired" || next.state === "denied" || next.state === "error"
      ? { type: "terminal" }
      : { type: "pending" };
  },
  // The device-code flow may ask clients to slow down; honor the latest interval.
  intervalMs: (session, status) =>
    pollDelay(status?.intervalSeconds && status.intervalSeconds > 0
      ? status.intervalSeconds
      : session.intervalSeconds || 5),
  successMessage: "扫码成功，已填入 access_token 和 refresh_token，保存后生效",
};

export function GuangYaPanQRCodeLogin({
  onCredentials,
}: {
  onCredentials: (credentials: GuangYaPanCredentials) => void;
}) {
  const { session, status, starting, pollingError, start } = useQRLogin(guangYaPan, onCredentials);
  return (
    <QRLoginPanel
      qrImageDataUrl={session?.qrImageDataUrl}
      alt="光鸭网盘扫码登录二维码"
      starting={starting}
      hasSession={!!session}
      onStart={start}
    >
      {pollingError && <QRLoginHelp>{pollingError}</QRLoginHelp>}
      <QRLoginExpiresAt expiresAt={session?.expiresAt} />
      {(status?.state === "expired" || status?.state === "denied") && (
        <QRLoginHelp>当前二维码{status.state === "denied" ? "已被拒绝" : "已过期"}，请重新生成。</QRLoginHelp>
      )}
    </QRLoginPanel>
  );
}
