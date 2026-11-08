import { useEffect, useRef, useState, type FormEvent } from "react";
import { Monitor, RefreshCw } from "lucide-react";
import type { FrontendStatus } from "@91/client";
import { client } from "@/client";
import { ConfirmModal } from "../ConfirmModal";
import { useAdminRouteActive } from "../AdminRouteCache";
import { useAdminResource } from "../useAdminResource";
import { SettingsRow, SettingsSection } from "./SettingsSection";

type Change = { kind: "activate"; id: string } | { kind: "reset" | "rollback" };
type Operation = "install" | "switch";

const loadStatus = () => client.frontend.status();

export function FrontendSettingsSection() {
  const resource = useAdminResource<FrontendStatus | null>(loadStatus, {
    active: useAdminRouteActive(),
    intervalMs: null,
    retryOnError: false,
    initialData: null,
  });
  const status = resource.data;
  const [repository, setRepository] = useState("nianzhibai/91-web");
  const [version, setVersion] = useState("");
  const [pending, setPending] = useState<Operation | null>(null);
  const [installError, setInstallError] = useState("");
  const [changeError, setChangeError] = useState("");
  const [notice, setNotice] = useState("");
  const [change, setChange] = useState<Change | null>(null);
  const operationRunning = useRef(false);
  const mounted = useRef(true);
  const busy = pending !== null;

  useEffect(() => {
    mounted.current = true;
    return () => { mounted.current = false; };
  }, []);

  async function run(kind: Operation, operation: () => Promise<void>) {
    if (operationRunning.current) return;
    operationRunning.current = true;
    setPending(kind);
    const setError = kind === "install" ? setInstallError : setChangeError;
    setError("");
    setNotice("");
    try { await operation(); }
    catch (failure) {
      if (mounted.current) setError(failure instanceof Error ? failure.message : "操作失败，请重试");
    } finally {
      operationRunning.current = false;
      if (mounted.current) setPending(null);
    }
  }

  function install(event: FormEvent) {
    event.preventDefault();
    if (!repository.trim() || !version.trim()) return;
    void run("install", async () => {
      const release = await client.frontend.install(repository.trim(), version.trim());
      if (!mounted.current) return;
      setNotice(`${release.name} ${release.version} 已安装，可以选择启用。`);
      // Retire every pre-install read, including an unfinished initial request.
      // A failed refresh is a read error; the completed install is still successful.
      await resource.invalidate();
    });
  }

  function apply() {
    if (!change) return;
    void run("switch", async () => {
      const next = change.kind === "activate"
        ? await client.frontend.activate(change.id)
        : change.kind === "reset"
          ? await client.frontend.reset()
          : await client.frontend.rollback();
      if (!mounted.current) return;
      resource.setData(next);
      window.location.assign("/");
    });
  }

  function selectChange(next: Change) {
    setChangeError("");
    setChange(next);
  }

  return (
    <SettingsSection
      id="config-frontend"
      index="04"
      icon={<Monitor size={18} />}
      title="前端版本"
      description="安装独立发布的前端，或恢复随服务提供的官方版本。"
    >
      {resource.error && <p className="frontend-settings__message is-error" role="alert">{resource.error}</p>}
      {installError && <p className="frontend-settings__message is-error" role="alert">{installError}</p>}
      {notice && <p className="frontend-settings__message" role="status">{notice}</p>}
      <SettingsRow label="当前前端" description={status?.active ? "使用已安装版本" : "跟随服务版本更新"}>
        <span>{status ? status.active || (status.builtin ? `${status.builtin.name} ${status.builtin.version} · 默认` : "默认前端") : resource.loading ? "加载中…" : "读取失败"}</span>
      </SettingsRow>
      <form className="frontend-settings__form" aria-label="安装前端版本" onSubmit={install}>
        <SettingsRow label="前端仓库" htmlFor="frontend-repository" description="填写 GitHub 仓库，例如 nianzhibai/91-web。">
          <input id="frontend-repository" className="admin-input" value={repository} onChange={event => setRepository(event.target.value)} disabled={busy} spellCheck={false} />
        </SettingsRow>
        <SettingsRow label="发布版本" htmlFor="frontend-version" description="使用明确的版本标签；安装后仍需手动启用。">
          <div className="frontend-settings__install">
            <input id="frontend-version" className="admin-input" placeholder="v1.0.0" value={version} onChange={event => setVersion(event.target.value)} disabled={busy} spellCheck={false} />
            <button type="submit" className="admin-btn is-primary" disabled={busy || !repository.trim() || !version.trim()}>
              {pending === "install" ? "安装中…" : "安装版本"}
            </button>
          </div>
        </SettingsRow>
      </form>
      <div className="frontend-settings__versions" aria-label="已安装前端">
        {status?.installed.map(release => {
          const id = `${release.name}@${release.version}`;
          return (
            <div className="frontend-settings__version" key={id}>
              <div><strong>{release.name} <span>{release.version}</span></strong><p>{release.repository || "本地安装"}</p></div>
              <button type="button" className="admin-btn" disabled={busy || status.active === id} onClick={() => selectChange({ kind: "activate", id })}>
                {status.active === id ? "使用中" : "启用"}
              </button>
            </div>
          );
        })}
      </div>
      <div className="frontend-settings__actions">
        <button type="button" className="admin-btn" disabled={busy || resource.refreshing} onClick={() => void resource.invalidate()}>
          <RefreshCw size={14} />{resource.refreshing ? "刷新中…" : "刷新"}
        </button>
        <button type="button" className="admin-btn" disabled={busy || status?.previous === undefined} onClick={() => selectChange({ kind: "rollback" })}>回到上一版本</button>
        <button type="button" className="admin-btn" disabled={busy || !status?.active || !status.builtin} onClick={() => selectChange({ kind: "reset" })}>恢复默认前端</button>
      </div>
      <ConfirmModal
        open={change !== null}
        title="切换前端"
        message={change?.kind === "activate" ? `启用 ${change.id} 后将重新打开首页。` : change?.kind === "reset" ? "恢复默认前端并重新打开首页。" : "恢复上一前端版本并重新打开首页。"}
        confirmText="切换并打开首页"
        loading={pending === "switch"}
        onCancel={() => { if (!operationRunning.current) setChange(null); }}
        onConfirm={apply}
      >
        {changeError && <p className="frontend-settings__message is-error" role="alert">{changeError}</p>}
      </ConfirmModal>
    </SettingsSection>
  );
}
