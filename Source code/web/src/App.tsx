import React, { Suspense, useEffect, useMemo, useRef, useState } from 'react';
import {
  BrowserRouter,
  Link,
  Navigate,
  NavLink,
  Outlet,
  Route,
  Routes,
  useLocation,
  useNavigate,
} from 'react-router-dom';
import { AuthProvider } from './core/context/AuthContext';
import { useAuth } from './core/hooks/useAuth';
import './styles/shell.css';

const AccountPage = React.lazy(() => import('./pages/Account/AccountPage'));
const AdminPage = React.lazy(() => import('./pages/Admin/AdminPage'));
const CameraPage = React.lazy(() => import('./pages/Camera/CameraPage'));
const CertificationPage = React.lazy(() => import('./pages/Certification/CertificationPage'));
const DashboardPage = React.lazy(() => import('./pages/Dashboard/DashboardPage'));
const DesignLabPage = React.lazy(() => import('./pages/DesignLab/DesignLabPage'));
const ExportPage = React.lazy(() => import('./pages/Export/ExportPage'));
const FarmingAreaPage = React.lazy(() => import('./pages/FarmingArea/FarmingAreaPage'));
const JournalPage = React.lazy(() => import('./pages/Journal/JournalPage'));
const LoginPage = React.lazy(() => import('./pages/Login/LoginPage'));
const OverviewPage = React.lazy(() => import('./pages/Overview/OverviewPage'));
const ProductDetailPage = React.lazy(() => import('./pages/ProductDetail/ProductDetailPage'));
const QualityInspectionPage = React.lazy(() => import('./pages/QualityInspection/QualityInspectionPage'));
const SupplyChainPage = React.lazy(() => import('./pages/SupplyChain/SupplyChainPage'));
const TraceDetailPage = React.lazy(() => import('./pages/TraceDetail/TraceDetailPage'));

type IconName =
  | 'bell'
  | 'camera'
  | 'certificate'
  | 'chevronDown'
  | 'close'
  | 'collapse'
  | 'dashboard'
  | 'disease'
  | 'help'
  | 'journal'
  | 'logout'
  | 'menu'
  | 'more'
  | 'package'
  | 'pin'
  | 'quality'
  | 'report'
  | 'search'
  | 'settings'
  | 'supply';

type NavigationItem = {
  to: string;
  label: string;
  shortLabel?: string;
  icon: IconName;
  section: 'main' | 'production' | 'quality' | 'traceability' | 'operations' | 'system';
};

const navigationSectionLabels: Record<NavigationItem['section'], string> = {
  main: 'Tổng quan',
  production: 'Sản xuất',
  quality: 'Chất lượng & tin cậy',
  traceability: 'Truy xuất',
  operations: 'Vận hành',
  system: 'Hệ thống',
};

const Icon: React.FC<{ name: IconName; size?: number }> = ({ name, size = 21 }) => {
  const paths: Record<IconName, React.ReactNode> = {
    bell: (
      <>
        <path d="M18 9a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9" />
        <path d="M10 22h4" />
      </>
    ),
    camera: (
      <>
        <rect x="3" y="6" width="14" height="12" rx="2" />
        <path d="m17 10 4-2v8l-4-2M8 10.5h4M10 8.5v4" />
      </>
    ),
    certificate: (
      <>
        <path d="M12 3 4 7v5c0 5 3.4 8.3 8 9 4.6-.7 8-4 8-9V7l-8-4Z" />
        <path d="m9 12 2 2 4-4" />
      </>
    ),
    chevronDown: <path d="m7 10 5 5 5-5" />,
    close: <path d="m6 6 12 12M18 6 6 18" />,
    collapse: (
      <>
        <path d="m11 17-5-5 5-5" />
        <path d="m18 17-5-5 5-5" />
      </>
    ),
    dashboard: (
      <>
        <path d="m3 10 9-7 9 7v10a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1V10Z" />
      </>
    ),
    disease: (
      <>
        <path d="M20 4C11 4 5 8 5 17c7 1 13-3 15-13Z" />
        <path d="M5 21c3-6 7-9 12-12M15 16l4 4M19 16l-4 4" />
      </>
    ),
    help: (
      <>
        <circle cx="12" cy="12" r="9" />
        <path d="M9.5 9a2.7 2.7 0 0 1 5.2 1c0 2-2.7 2.2-2.7 4M12 17h.01" />
      </>
    ),
    journal: (
      <>
        <rect x="4" y="3" width="16" height="18" rx="2" />
        <path d="M8 8h8M8 12h8M8 16h5" />
      </>
    ),
    logout: (
      <>
        <path d="M10 5H5a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2h5" />
        <path d="m14 16 4-4-4-4M18 12H8" />
      </>
    ),
    menu: <path d="M4 7h16M4 12h16M4 17h16" />,
    more: (
      <>
        <circle cx="5" cy="12" r="1" fill="currentColor" stroke="none" />
        <circle cx="12" cy="12" r="1" fill="currentColor" stroke="none" />
        <circle cx="19" cy="12" r="1" fill="currentColor" stroke="none" />
      </>
    ),
    package: (
      <>
        <path d="m3 7 9-4 9 4-9 4-9-4Z" />
        <path d="M3 7v10l9 4 9-4V7M12 11v10" />
      </>
    ),
    pin: (
      <>
        <path d="M20 10c0 5-8 11-8 11S4 15 4 10a8 8 0 1 1 16 0Z" />
        <circle cx="12" cy="10" r="2.5" />
      </>
    ),
    quality: (
      <>
        <path d="M9 3h6M10 3v5l-5 9a3 3 0 0 0 2.6 4h8.8a3 3 0 0 0 2.6-4l-5-9V3" />
        <path d="M7.5 15h9" />
      </>
    ),
    report: (
      <>
        <rect x="3" y="3" width="18" height="18" rx="2" />
        <path d="M7 16v-4M12 16V8M17 16v-6" />
      </>
    ),
    search: (
      <>
        <circle cx="11" cy="11" r="6.5" />
        <path d="m16 16 4 4" />
      </>
    ),
    settings: (
      <>
        <circle cx="12" cy="12" r="3" />
        <path d="M19.4 15a1.7 1.7 0 0 0 .3 1.9l.1.1-2.1 2.1-.1-.1a1.7 1.7 0 0 0-1.9-.3 1.7 1.7 0 0 0-1 1.5v.2h-3v-.2a1.7 1.7 0 0 0-1-1.5 1.7 1.7 0 0 0-1.9.3l-.1.1-2.1-2.1.1-.1A1.7 1.7 0 0 0 7 15a1.7 1.7 0 0 0-1.5-1H5v-3h.2A1.7 1.7 0 0 0 6.7 10a1.7 1.7 0 0 0-.3-1.9l-.1-.1 2.1-2.1.1.1a1.7 1.7 0 0 0 1.9.3 1.7 1.7 0 0 0 1-1.5V4h3v.2a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.9-.3l.1-.1 2.1 2.1-.1.1a1.7 1.7 0 0 0-.3 1.9 1.7 1.7 0 0 0 1.5 1h.2v3h-.2a1.7 1.7 0 0 0-1.5 1Z" />
      </>
    ),
    supply: (
      <>
        <circle cx="7" cy="8" r="3" />
        <circle cx="17" cy="9" r="2.5" />
        <path d="M2.5 20c.6-4 2.4-6 5-6 2.7 0 4.5 2 5.1 6M14 15c3.6 0 6.3 1.6 7 5" />
      </>
    ),
  };

  return (
    <svg
      aria-hidden="true"
      className="agr-icon"
      fill="none"
      height={size}
      viewBox="0 0 24 24"
      width={size}
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="1.8"
    >
      {paths[name]}
    </svg>
  );
};

const Brand: React.FC<{ compact?: boolean }> = ({ compact = false }) => (
  <Link className={`agr-brand${compact ? ' agr-brand--compact' : ''}`} to="/" aria-label="AgriTrace - về tổng quan">
    <span className="agr-brand__mark" aria-hidden="true">
      <svg viewBox="0 0 36 36" fill="none">
        <path d="M31 5C17.5 5 7.2 11.2 6.4 26.1 17.7 26.6 26.3 19.4 31 5Z" fill="currentColor" />
        <path d="M5.5 31C10.2 21.8 16.3 16.2 25.5 10.8" stroke="white" strokeWidth="2.6" strokeLinecap="round" />
      </svg>
    </span>
    <span className="agr-brand__text">
      <strong>AgriTrace</strong>
      <small>Nông sản minh bạch</small>
    </span>
  </Link>
);

const initialsFromName = (name?: string) => {
  const words = (name || 'Người dùng').trim().split(/\s+/).filter(Boolean);
  return words.slice(-2).map((word) => word.charAt(0)).join('').toUpperCase();
};

const roleLabel = (role?: string) => {
  const labels: Record<string, string> = {
    admin: 'Quản trị viên',
    manager: 'Quản lý',
    farmer: 'Nông hộ',
    consumer: 'Người tiêu dùng',
  };
  return labels[role || ''] || 'Thành viên';
};

const ProtectedRoute: React.FC = () => {
  const { isAuthenticated, loading } = useAuth();

  if (loading) {
    return (
      <div className="agr-auth-loader" role="status" aria-live="polite">
        <span className="agr-auth-loader__spinner" aria-hidden="true" />
        <strong>Đang mở không gian làm việc</strong>
        <small>AgriTrace đang chuẩn bị dữ liệu của bạn...</small>
      </div>
    );
  }

  return isAuthenticated ? <Outlet /> : <Navigate to="/login" replace />;
};

const AppShell: React.FC = () => {
  const { logout, user } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const actionsRef = useRef<HTMLDivElement | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [globalSearch, setGlobalSearch] = useState('');
  const [openPanel, setOpenPanel] = useState<'help' | 'notifications' | 'user' | null>(null);
  const [sidebarCompact, setSidebarCompact] = useState(() => localStorage.getItem('agritrace.sidebar') === 'compact');

  const navigation = useMemo<NavigationItem[]>(
    () => [
      { to: '/', label: 'Tổng quan', shortLabel: 'Tổng quan', icon: 'dashboard', section: 'main' },
      { to: '/products', label: 'Lô nông sản', shortLabel: 'Lô hàng', icon: 'package', section: 'production' },
      { to: '/farming-areas', label: 'Vùng trồng', icon: 'pin', section: 'production' },
      { to: '/add-event', label: 'Nhật ký canh tác', shortLabel: 'Nhật ký', icon: 'journal', section: 'production' },
      ...(user?.role !== 'consumer'
        ? [{ to: '/cameras', label: 'Giám sát nông trại', icon: 'camera' as IconName, section: 'production' as const }]
        : []),
      { to: '/quality-inspections', label: 'Kiểm nghiệm', icon: 'quality', section: 'quality' },
      { to: '/certifications', label: 'Chứng nhận', icon: 'certificate', section: 'quality' },
      { to: '/supply-chain', label: 'Chuỗi cung ứng', icon: 'supply', section: 'traceability' },
      { to: '/export', label: 'Xuất báo cáo', shortLabel: 'Báo cáo', icon: 'report', section: 'operations' },
      ...(user?.role === 'admin'
        ? [{ to: '/admin', label: 'Quản trị', icon: 'settings' as IconName, section: 'system' as const }]
        : []),
    ],
    [user?.role]
  );

  const primaryMobileNavigation = navigation.filter((item) =>
    ['/', '/products', '/add-event', '/export'].includes(item.to)
  );

  const currentNavigation = navigation.find((item) => item.to === '/'
    ? location.pathname === '/'
    : location.pathname.startsWith(item.to));

  useEffect(() => {
    setDrawerOpen(false);
    setOpenPanel(null);
  }, [location.pathname, location.search]);

  useEffect(() => {
    localStorage.setItem('agritrace.sidebar', sidebarCompact ? 'compact' : 'expanded');
  }, [sidebarCompact]);

  useEffect(() => {
    const closeOnOutsideClick = (event: PointerEvent) => {
      if (actionsRef.current && !actionsRef.current.contains(event.target as Node)) {
        setOpenPanel(null);
      }
    };
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setDrawerOpen(false);
        setOpenPanel(null);
      }
    };

    document.addEventListener('pointerdown', closeOnOutsideClick);
    document.addEventListener('keydown', closeOnEscape);
    return () => {
      document.removeEventListener('pointerdown', closeOnOutsideClick);
      document.removeEventListener('keydown', closeOnEscape);
    };
  }, []);

  useEffect(() => {
    if (!drawerOpen) return undefined;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [drawerOpen]);

  const handleSearch = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const query = globalSearch.trim();
    navigate(query ? `/products?search=${encodeURIComponent(query)}` : '/products');
  };

  const handleLogout = () => {
    logout();
    navigate('/login', { replace: true });
  };

  const renderNavigation = (mobile = false) => (
    <nav className="agr-nav" aria-label={mobile ? 'Điều hướng trên thiết bị di động' : 'Điều hướng chính'}>
      {navigation.map((item, index) => (
        <React.Fragment key={item.to}>
          {(index === 0 || navigation[index - 1].section !== item.section) && (
            <span className="agr-nav__section">{navigationSectionLabels[item.section]}</span>
          )}
          <NavLink
            className={({ isActive }) => `agr-nav__link${isActive ? ' agr-nav__link--active' : ''}`}
            end={item.to === '/'}
            title={sidebarCompact && !mobile ? item.label : undefined}
            to={item.to}
          >
            <span className="agr-nav__icon"><Icon name={item.icon} /></span>
            <span className="agr-nav__label">{item.label}</span>
          </NavLink>
        </React.Fragment>
      ))}
    </nav>
  );

  return (
    <div
      className={`agr-shell${sidebarCompact ? ' agr-shell--compact' : ''}`}
      data-route={location.pathname.split('/').filter(Boolean)[0] || 'overview'}
    >
      <a className="agr-skip-link" href="#main-content">Đi đến nội dung chính</a>

      <aside className={`agr-sidebar${drawerOpen ? ' agr-sidebar--open' : ''}`} id="primary-sidebar">
        <div className="agr-sidebar__head">
          <Brand compact={sidebarCompact} />
          <button
            aria-label="Đóng menu"
            className="agr-sidebar__mobile-close"
            onClick={() => setDrawerOpen(false)}
            type="button"
          >
            <Icon name="close" size={23} />
          </button>
        </div>

        <div className="agr-sidebar__scroll">{renderNavigation(true)}</div>

        <div className="agr-sidebar__footer">
          <div className="agr-sidebar-user">
            <span className="agr-avatar agr-avatar--sidebar" aria-hidden="true">
              {user?.avatar ? (
                <img
                  alt=""
                  src={user.avatar}
                  onError={(event) => {
                    event.currentTarget.onerror = null;
                    event.currentTarget.src = '/uploads/sample-media/default-avatar.svg';
                  }}
                />
              ) : initialsFromName(user?.name)}
            </span>
            <span className="agr-sidebar-user__copy">
              <strong>{user?.name || 'Người dùng AgriTrace'}</strong>
              <small>{roleLabel(user?.role)}</small>
            </span>
          </div>

          <button className="agr-sidebar-action agr-sidebar-action--logout" onClick={handleLogout} type="button">
            <Icon name="logout" size={19} />
            <span>Đăng xuất</span>
          </button>
          <button
            aria-label={sidebarCompact ? 'Mở rộng thanh điều hướng' : 'Thu gọn thanh điều hướng'}
            aria-pressed={sidebarCompact}
            className="agr-sidebar-action agr-sidebar-action--collapse"
            onClick={() => setSidebarCompact((value) => !value)}
            type="button"
          >
            <Icon name="collapse" size={19} />
            <span>Thu gọn menu</span>
          </button>
        </div>
      </aside>

      {drawerOpen && (
        <button
          aria-label="Đóng lớp phủ menu"
          className="agr-sidebar-backdrop"
          onClick={() => setDrawerOpen(false)}
          type="button"
        />
      )}

      <div className="agr-shell__workspace">
        <header className="agr-topbar">
          <div className="agr-topbar__mobile-brand">
            <button
              aria-controls="primary-sidebar"
              aria-expanded={drawerOpen}
              aria-label="Mở menu chính"
              className="agr-topbar__menu"
              onClick={() => setDrawerOpen(true)}
              type="button"
            >
              <Icon name="menu" size={23} />
            </button>
            <Brand />
          </div>

          <div className="agr-topbar__context" aria-live="polite">
            <span>Không gian làm việc</span>
            <strong>{currentNavigation?.label || 'AgriTrace'}</strong>
          </div>

          <form className="agr-search" onSubmit={handleSearch} role="search">
            <Icon name="search" size={20} />
            <input
              aria-label="Tìm kiếm lô nông sản"
              onChange={(event) => setGlobalSearch(event.target.value)}
              placeholder="Tìm theo tên sản phẩm, mã lô, vùng trồng..."
              type="search"
              value={globalSearch}
            />
            {globalSearch && (
              <button aria-label="Xóa từ khóa" onClick={() => setGlobalSearch('')} type="button">
                <Icon name="close" size={16} />
              </button>
            )}
          </form>

          <div className="agr-topbar__actions" ref={actionsRef}>
            <button
              aria-expanded={openPanel === 'notifications'}
              aria-haspopup="dialog"
              aria-label="Thông báo, có 3 thông báo mới"
              className="agr-topbar-button agr-topbar-button--notification"
              onClick={() => setOpenPanel((value) => value === 'notifications' ? null : 'notifications')}
              type="button"
            >
              <Icon name="bell" size={22} />
              <span>3</span>
            </button>
            <button
              aria-expanded={openPanel === 'help'}
              aria-haspopup="dialog"
              aria-label="Mở trợ giúp"
              className="agr-topbar-button agr-topbar-button--help"
              onClick={() => setOpenPanel((value) => value === 'help' ? null : 'help')}
              type="button"
            >
              <Icon name="help" size={22} />
            </button>
            <button
              aria-expanded={openPanel === 'user'}
              aria-haspopup="menu"
              aria-label="Mở menu tài khoản"
              className="agr-user-button"
              onClick={() => setOpenPanel((value) => value === 'user' ? null : 'user')}
              type="button"
            >
              <span className="agr-avatar">{initialsFromName(user?.name)}</span>
              <span className="agr-user-button__copy">
                <strong>{user?.name || 'Người dùng'}</strong>
                <small>{roleLabel(user?.role)}</small>
              </span>
              <Icon name="chevronDown" size={16} />
            </button>

            {openPanel === 'notifications' && (
              <section className="agr-popover agr-popover--notifications" role="dialog" aria-label="Thông báo">
                <header>
                  <div><strong>Thông báo</strong><small>3 mục cần bạn chú ý</small></div>
                  <span className="agr-popover__count">3 mới</span>
                </header>
                <div className="agr-notification-list">
                  <Link to="/certifications">
                    <span className="agr-notification-list__icon agr-notification-list__icon--danger">!</span>
                    <span><strong>3 chứng nhận sắp hết hạn</strong><small>Cần gia hạn trong vòng 7 ngày</small></span>
                  </Link>
                  <Link to="/add-event">
                    <span className="agr-notification-list__icon agr-notification-list__icon--warning">!</span>
                    <span><strong>2 lô cần cập nhật nhật ký</strong><small>Hoạt động gần nhất đã quá 5 ngày</small></span>
                  </Link>
                  <Link to="/quality-inspections">
                    <span className="agr-notification-list__icon agr-notification-list__icon--danger">!</span>
                    <span><strong>1 phiếu kiểm nghiệm cần xử lý</strong><small>Kết quả không đạt tiêu chuẩn</small></span>
                  </Link>
                </div>
              </section>
            )}

            {openPanel === 'help' && (
              <section className="agr-popover agr-popover--help" role="dialog" aria-label="Trợ giúp nhanh">
                <header><div><strong>Trợ giúp nhanh</strong><small>Bắt đầu với AgriTrace</small></div></header>
                <p>Tìm lô bằng mã hoặc tên sản phẩm, sau đó cập nhật nhật ký để hoàn thiện hồ sơ truy xuất.</p>
                <Link className="agr-popover__action" to="/add-event">Ghi nhật ký canh tác</Link>
                <Link className="agr-popover__action" to="/export">Xuất báo cáo truy xuất</Link>
              </section>
            )}

            {openPanel === 'user' && (
              <section className="agr-popover agr-popover--user" role="menu" aria-label="Menu tài khoản">
                <header>
                  <span className="agr-avatar agr-avatar--large">{initialsFromName(user?.name)}</span>
                  <div><strong>{user?.name || 'Người dùng'}</strong><small>{user?.email || roleLabel(user?.role)}</small></div>
                </header>
                <Link role="menuitem" to="/account"><Icon name="settings" size={18} />Hồ sơ tài khoản</Link>
                {user?.role === 'admin' && <Link role="menuitem" to="/admin"><Icon name="settings" size={18} />Quản trị tài khoản</Link>}
                <button role="menuitem" onClick={handleLogout} type="button"><Icon name="logout" size={18} />Đăng xuất</button>
              </section>
            )}
          </div>
        </header>

        <div className={`agr-shell__main${location.pathname === '/cameras' ? ' agr-shell__main--monitoring' : ''}`} id="main-content" role="main" tabIndex={-1}>
          <Outlet />
        </div>
      </div>

      <nav className="agr-bottom-nav" aria-label="Điều hướng nhanh">
        {primaryMobileNavigation.map((item) => (
          <NavLink
            className={({ isActive }) => `agr-bottom-nav__link${isActive ? ' agr-bottom-nav__link--active' : ''}`}
            end={item.to === '/'}
            key={item.to}
            to={item.to}
          >
            <Icon name={item.icon} size={21} />
            <span>{item.shortLabel || item.label}</span>
          </NavLink>
        ))}
        <button
          aria-controls="primary-sidebar"
          aria-expanded={drawerOpen}
          className="agr-bottom-nav__link"
          onClick={() => setDrawerOpen(true)}
          type="button"
        >
          <Icon name="more" size={21} />
          <span>Thêm</span>
        </button>
      </nav>
    </div>
  );
};

const ProductDashboardRoute: React.FC = () => {
  const location = useLocation();
  return <DashboardPage key={location.search} />;
};

const DiseaseDetectionRoute: React.FC = () => {
  const { user } = useAuth();
  return user?.role === 'consumer' ? (
    <Navigate to="/" replace />
  ) : (
    <Navigate to="/cameras?mode=plant-disease" replace />
  );
};

const AppRoutes: React.FC = () => (
  <Suspense fallback={<div className={'agri-route-loader'} role={'status'} aria-live={'polite'}><span />{'\u0110ang t\u1ea3i giao di\u1ec7n...'}</div>}>
    <Routes>
    <Route path="/login" element={<LoginPage />} />
    <Route path="/trace/:productId" element={<TraceDetailPage />} />

    <Route element={<ProtectedRoute />}>
      <Route element={<AppShell />}>
        <Route index element={<OverviewPage />} />
        <Route path="/products" element={<ProductDashboardRoute />} />
        <Route path="/products/:productId" element={<ProductDetailPage />} />
        <Route path="/account" element={<AccountPage />} />
        <Route path="/add-event" element={<JournalPage />} />
        <Route path="/farming-areas" element={<FarmingAreaPage />} />
        <Route path="/supply-chain" element={<SupplyChainPage />} />
        <Route path="/certifications" element={<CertificationPage />} />
        <Route path="/disease-detection" element={<DiseaseDetectionRoute />} />
        <Route path="/cameras" element={<CameraPage />} />
        <Route path="/design-lab" element={<DesignLabPage />} />
        <Route path="/quality-inspections" element={<QualityInspectionPage />} />
        <Route path="/export" element={<ExportPage />} />
        <Route path="/admin" element={<AdminPage />} />
      </Route>
    </Route>

    <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  </Suspense>
);

const App: React.FC = () => (
  <AuthProvider>
    <BrowserRouter>
      <AppRoutes />
    </BrowserRouter>
  </AuthProvider>
);

export default App;
