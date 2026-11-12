import { useEffect, useRef, useState, type ComponentType, type MouseEvent } from "react";
import { NavLink, useLocation } from "react-router";
import {
  House,
  LogOut,
  X,
} from "lucide-react";
import brandIconUrl from "@/assets/brand-icon.png";
import { useAuth } from "@/admin/AuthContext";
import { SearchPanel } from "@/components/SearchPanel";
import { UploadIcon } from "@/components/icons/UploadIcon";
import { VideoIcon } from "@/components/icons/VideoIcon";
import { requestShortsFullscreenOnEntry } from "@/shorts/fullscreen";
import { useNativeBackHandler } from "@/lib/useNativeBack";

// Font Awesome Free 7.3.1 by Fonticons, Inc. — https://fontawesome.com/license/free
function ShortVideoIcon({ size = 16 }: { size?: number }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 448 512"
      width={size}
      height={size}
      fill="currentColor"
      aria-hidden="true"
      focusable="false"
    >
      <path d="M448.5 209.9c-44 .1-87-13.6-122.8-39.2l0 178.7c0 33.1-10.1 65.4-29 92.6s-45.6 48-76.6 59.6-64.8 13.5-96.9 5.3-60.9-25.9-82.7-50.8-35.3-56-39-88.9 2.9-66.1 18.6-95.2 40-52.7 69.6-67.7 62.9-20.5 95.7-16l0 89.9c-15-4.7-31.1-4.6-46 .4s-27.9 14.6-37 27.3-14 28.1-13.9 43.9 5.2 31 14.5 43.7 22.4 22.1 37.4 26.9 31.1 4.8 46-.1 28-14.4 37.2-27.1 14.2-28.1 14.2-43.8l0-349.4 88 0c-.1 7.4 .6 14.9 1.9 22.2 3.1 16.3 9.4 31.9 18.7 45.7s21.3 25.6 35.2 34.6c19.9 13.1 43.2 20.1 67 20.1l0 87.4z" />
    </svg>
  );
}

function AdminIcon({ size = 16 }: { size?: number }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 512 512"
      width={size}
      height={size}
      fill="currentColor"
      aria-hidden="true"
      focusable="false"
    >
      <path d="M195.1 9.5C198.1-5.3 211.2-16 226.4-16l59.8 0c15.2 0 28.3 10.7 31.3 25.5L332 79.5c14.1 6 27.3 13.7 39.3 22.8l67.8-22.5c14.4-4.8 30.2 1.2 37.8 14.4l29.9 51.8c7.6 13.2 4.9 29.8-6.5 39.9L447 233.3c.9 7.4 1.3 15 1.3 22.7s-.5 15.3-1.3 22.7l53.4 47.5c11.4 10.1 14 26.8 6.5 39.9l-29.9 51.8c-7.6 13.1-23.4 19.2-37.8 14.4l-67.8-22.5c-12.1 9.1-25.3 16.7-39.3 22.8l-14.4 69.9c-3.1 14.9-16.2 25.5-31.3 25.5l-59.8 0c-15.2 0-28.3-10.7-31.3-25.5l-14.4-69.9c-14.1-6-27.2-13.7-39.3-22.8L73.5 432.3c-14.4 4.8-30.2-1.2-37.8-14.4L5.8 366.1c-7.6-13.2-4.9-29.8 6.5-39.9l53.4-47.5c-.9-7.4-1.3-15-1.3-22.7s.5-15.3 1.3-22.7L12.3 185.8c-11.4-10.1-14-26.8-6.5-39.9L35.7 94.1c7.6-13.2 23.4-19.2 37.8-14.4l67.8 22.5c12.1-9.1 25.3-16.7 39.3-22.8L195.1 9.5zM256.3 336a80 80 0 1 0 -.6-160 80 80 0 1 0 .6 160z" />
    </svg>
  );
}

function HomeIcon({ size = 16 }: { size?: number }) {
  return <House size={size} strokeWidth={2.2} aria-hidden="true" />;
}

// Font Awesome Pro 7.3.1 by Fonticons, Inc. — commercial license: https://fontawesome.com/license
function MobileMenuIcon({ size = 26 }: { size?: number }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 540 540"
      width={size}
      height={size}
      aria-hidden="true"
      focusable="false"
    >
      <path
        opacity=".4"
        fill="currentColor"
        d="M27 306c0 7.5 6 13.5 13.5 13.5S54 313.5 54 306l432 0c7.5 0 13.5-6 13.5-13.5S493.5 279 486 279L54 279c-14.9 0-27 12.1-27 27zM63.1 167.2c-.6 7.4 5 13.9 12.5 14.5s13.9-5 14.5-12.5c.8-10.2 9.5-28.8 42.4-47.5 32.8-18.6 81.2-31.7 137.5-31.7 7.5 0 13.5-6 13.5-13.5S277.5 63 270 63c-60.1 0-113.3 14-150.8 35.3-37.1 21.1-54.3 46.3-56 69zM63 450c0 7.5 6 13.5 13.5 13.5S90 457.5 90 450l360 0c7.5 0 13.5-6 13.5-13.5S457.5 423 450 423L90 423c-14.9 0-27 12.1-27 27z"
      />
      <path
        fill="currentColor"
        d="M454.9 216C481.4 216 503 195 504 168.7 501.9 95.2 397.9 36 270 36S38.1 95.2 36 168.7C37 195 58.6 216 85.1 216l369.8 0zM132.5 121.7c-33 18.7-41.7 37.3-42.4 47.5-.6 7.4-7 13-14.5 12.5s-13-7-12.5-14.5c1.7-22.7 18.9-47.9 56-69 37.5-21.3 90.7-35.3 150.8-35.3 7.5 0 13.5 6 13.5 13.5S277.5 90 270 90c-56.3 0-104.7 13.1-137.5 31.7zM54 252c-29.8 0-54 24.2-54 54s24.2 54 54 54l432 0c29.8 0 54-24.2 54-54s-24.2-54-54-54L54 252zm0 27l432 0c7.5 0 13.5 6 13.5 13.5S493.5 306 486 306L54 306c0 7.5-6 13.5-13.5 13.5S27 313.5 27 306c0-14.9 12.1-27 27-27zM90 396c-29.8 0-54 24.2-54 54s24.2 54 54 54l360 0c29.8 0 54-24.2 54-54s-24.2-54-54-54L90 396zm0 27l360 0c7.5 0 13.5 6 13.5 13.5S457.5 450 450 450L90 450c0 7.5-6 13.5-13.5 13.5S63 457.5 63 450c0-14.9 12.1-27 27-27z"
      />
    </svg>
  );
}

type NavItem = {
  to: string;
  label: string;
  icon: ComponentType<{ size?: number }>;
};

const homeNavItem = { to: "/", label: "首页", icon: HomeIcon };

const navItems = [
  { to: "/shorts", label: "短视频", icon: ShortVideoIcon },
  { to: "/list", label: "视频", icon: VideoIcon },
];

const uploadNavItem = { to: "/upload", label: "上传", icon: UploadIcon };
const adminNavItem = { to: "/admin", label: "后台", icon: AdminIcon };

/** 首页、短视频、视频是公共入口；上传和后台只对管理员显示。 */
function useNavItems(): { primary: NavItem[]; admin: NavItem[] } {
  const { isAdmin } = useAuth();
  return {
    primary: [homeNavItem, ...navItems],
    admin: isAdmin ? [uploadNavItem, adminNavItem] : [],
  };
}

/**
 * Shared link behaviour: entering shorts from home replaces the history entry
 * because the shorts page prepares home as its own return target, and a plain
 * primary click asks for fullscreen while the user gesture is still active.
 */
function useNavLinkProps(onNavigate?: () => void) {
  const location = useLocation();
  return (to: string) => ({
    to,
    end: to === "/",
    replace: to === "/shorts" && location.pathname === "/",
    onClick: (event: MouseEvent<HTMLAnchorElement>) => {
      onNavigate?.();
      if (to === "/shorts" && event.button === 0 &&
        !event.metaKey && !event.ctrlKey && !event.shiftKey && !event.altKey) {
        void requestShortsFullscreenOnEntry();
      }
    },
  });
}

/** 搜索结果留在当前列表页；其他页面统一回到首页展示结果。 */
function searchNavigationPath(pathname: string): string {
  return pathname === "/list" ? "/list" : "/";
}

type MainNavProps = {
  searchLoading?: boolean;
};

export function MainNav({ searchLoading = false }: MainNavProps) {
  const location = useLocation();
  const [open, setOpen] = useState(false);
  const menuRef = useRef<HTMLUListElement | null>(null);
  const toggleRef = useRef<HTMLButtonElement | null>(null);
  const searchRef = useRef<HTMLDivElement | null>(null);
  const { status, isAdmin, logout } = useAuth();
  const { primary, admin } = useNavItems();
  const linkProps = useNavLinkProps(() => setOpen(false));
  useNativeBackHandler(open, () => setOpen(false), "menu");

  const items = [...primary, ...admin];

  const handleLogout = async () => {
    try {
      await logout();
    } catch {
      // ignore
    }
  };

  useEffect(() => {
    if (!open) return;

    const handlePointerDown = (event: PointerEvent) => {
      const target = event.target;
      if (!(target instanceof Node)) return;
      if (menuRef.current?.contains(target) || toggleRef.current?.contains(target)) {
        return;
      }
      setOpen(false);
    };

    document.addEventListener("pointerdown", handlePointerDown);
    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
    };
  }, [open]);

  // "/" focuses the global search, matching the convention of most media sites.
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "/" || event.metaKey || event.ctrlKey || event.altKey) return;
      const target = event.target;
      if (target instanceof HTMLElement &&
        (target.isContentEditable || /^(?:INPUT|TEXTAREA|SELECT)$/.test(target.tagName))) {
        return;
      }
      const input = searchRef.current?.querySelector("input");
      if (!input || input.offsetParent === null) return;
      event.preventDefault();
      input.focus();
      input.select();
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, []);

  return (
    <nav className={`main-nav ${open ? "is-open" : ""}`}>
      <div className="main-nav__inner">
        <NavLink to="/" className="main-nav__logo" aria-label="91 首页">
          <span className="main-nav__logo-mark">
            <img src={brandIconUrl} alt="" className="main-nav__logo-img" />
          </span>
        </NavLink>

        <div ref={searchRef} className="main-nav__search">
          <SearchPanel
            navigationPath={searchNavigationPath(location.pathname)}
            variant="uiverse"
            className="search-panel--header"
            loading={searchLoading}
          />
          <kbd className="main-nav__search-hint" aria-hidden="true">/</kbd>
        </div>

        <div className="main-nav__actions">
          {isAdmin && (
            <NavLink to="/upload" className="main-nav__action">
              <UploadIcon size={15} />
              <span>上传</span>
            </NavLink>
          )}
        </div>

        <ul ref={menuRef} className="main-nav__list" role="menubar">
          {items.map(({ to, label, icon: Icon }) => (
            <li key={to} role="none">
              <NavLink
                {...linkProps(to)}
                role="menuitem"
                className={({ isActive }) =>
                  `main-nav__link ${isActive ? "is-active" : ""}`
                }
              >
                <Icon size={16} />
                {label}
              </NavLink>
            </li>
          ))}
          {status === "authed" && !isAdmin && (
            <li role="none">
              <button
                className="main-nav__link"
                role="menuitem"
                onClick={handleLogout}
              >
                <LogOut size={16} />
                退出
              </button>
            </li>
          )}
        </ul>

        <button
          ref={toggleRef}
          className="main-nav__toggle"
          aria-label={open ? "关闭菜单" : "打开菜单"}
          aria-expanded={open}
          onClick={() => setOpen((v) => !v)}
        >
          {open ? <X size={22} /> : <MobileMenuIcon size={26} />}
        </button>
      </div>
    </nav>
  );
}

export function SideNav() {
  const { status, isAdmin, logout } = useAuth();
  const { primary, admin } = useNavItems();
  const linkProps = useNavLinkProps();

  const renderItem = ({ to, label, icon: Icon }: NavItem) => (
    <li key={to}>
      <NavLink
        {...linkProps(to)}
        className={({ isActive }) => `side-nav__link ${isActive ? "is-active" : ""}`}
        title={label}
      >
        <span className="side-nav__icon"><Icon size={17} /></span>
        <span className="side-nav__label">{label}</span>
      </NavLink>
    </li>
  );

  return (
    <aside className="side-nav" aria-label="主导航">
      <ul className="side-nav__list">{primary.map(renderItem)}</ul>

      {admin.length > 0 && (
        <>
          <div className="side-nav__divider" role="presentation" />
          <p className="side-nav__heading">管理</p>
          <ul className="side-nav__list">{admin.map(renderItem)}</ul>
        </>
      )}

      {status === "authed" && !isAdmin && (
        <div className="side-nav__footer">
          <button
            type="button"
            className="side-nav__link"
            onClick={() => { void logout().catch(() => undefined); }}
            title="退出"
          >
            <span className="side-nav__icon"><LogOut size={17} /></span>
            <span className="side-nav__label">退出</span>
          </button>
        </div>
      )}
    </aside>
  );
}
