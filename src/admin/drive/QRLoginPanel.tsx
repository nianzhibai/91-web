import type { ReactNode } from "react";
import { QrCode } from "lucide-react";

export function QRLoginPanel({
  qrImageDataUrl,
  alt,
  starting,
  hasSession,
  onStart,
  children,
}: {
  qrImageDataUrl?: string;
  alt: string;
  starting: boolean;
  hasSession: boolean;
  onStart: () => void;
  children?: ReactNode;
}) {
  return (
    <div className="admin-form__row admin-drive-qr-login">
      <span className="admin-form__label">扫码登录</span>
      <div className="admin-p123-qr">
        <div className="admin-p123-qr__actions">
          <button type="button" className="admin-btn" onClick={onStart} disabled={starting}>
            <QrCode size={14} />
            {starting ? "生成中..." : hasSession ? "重新生成二维码" : "生成二维码"}
          </button>
        </div>

        {hasSession && (
          <div className="admin-p123-qr__body">
            <img className="admin-p123-qr__image" src={qrImageDataUrl} alt={alt} />
            <div className="admin-p123-qr__meta" aria-live="polite">
              {children}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export function QRLoginHelp({ children }: { children: ReactNode }) {
  return <div className="admin-form__help">{children}</div>;
}

export function QRLoginExpiresAt({ expiresAt }: { expiresAt?: string }) {
  if (!expiresAt) return null;
  return (
    <QRLoginHelp>
      过期时间：{new Date(expiresAt).toLocaleTimeString("zh-CN", {
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
      })}
    </QRLoginHelp>
  );
}
