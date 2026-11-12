import * as api from "../api";
import { QRLoginExpiresAt, QRLoginHelp, QRLoginPanel } from "./QRLoginPanel";
import { useQRLogin, type QRLoginProvider } from "./useQRLogin";

type WopanCredentials = {
  accessToken: string;
  refreshToken: string;
  familyID?: string;
};

const wopan: QRLoginProvider<api.WopanQRSession, api.WopanQRStatus, WopanCredentials> = {
  start: () => api.startWopanQRLogin(),
  status: (session) => api.getWopanQRStatus(session.uuid),
  evaluate: (next) => {
    if (next.accessToken && next.refreshToken) {
      return {
        type: "success",
        credential: { accessToken: next.accessToken, refreshToken: next.refreshToken, familyID: next.familyID },
      };
    }
    return next.state === 4 ? { type: "terminal" } : { type: "pending" };
  },
  intervalMs: () => 1200,
  successMessage: "扫码成功，已填入 access_token 和 refresh_token，保存后生效",
};

export function WopanQRCodeLogin({ onCredentials }: { onCredentials: (credentials: WopanCredentials) => void }) {
  const { session, status, starting, pollingError, start } = useQRLogin(wopan, onCredentials);
  return (
    <QRLoginPanel
      qrImageDataUrl={session?.qrImageDataUrl}
      alt="联通网盘扫码登录二维码"
      starting={starting}
      hasSession={!!session}
      onStart={start}
    >
      {pollingError && <QRLoginHelp>{pollingError}</QRLoginHelp>}
      <QRLoginExpiresAt expiresAt={session?.expiresAt} />
      {status?.state === 4 && <QRLoginHelp>当前二维码已过期，请重新生成。</QRLoginHelp>}
    </QRLoginPanel>
  );
}
