import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { QRCodeSVG } from 'qrcode.react';
import ProductCameraModal from '../../components/LiveStream/ProductCameraModal';
import { farmingAreaApi, FarmingArea } from '../../core/api/farmingArea.api';
import { productApi } from '../../core/api/product.api';
import { useAuth } from '../../core/hooks/useAuth';
import type { Product } from '../../core/types';
import './DashboardPage.css';

type IconName =
  | 'archive'
  | 'arrow'
  | 'camera'
  | 'chain'
  | 'check'
  | 'chevron'
  | 'close'
  | 'cube'
  | 'edit'
  | 'eye'
  | 'filter'
  | 'history'
  | 'journal'
  | 'location'
  | 'plus'
  | 'qr'
  | 'refresh'
  | 'restore'
  | 'search'
  | 'shield'
  | 'trash'
  | 'upload'
  | 'warning';

const Icon: React.FC<{ name: IconName; size?: number }> = ({ name, size = 20 }) => {
  const paths: Record<IconName, React.ReactNode> = {
    archive: <><path d="M4 7h16v13H4z"/><path d="M3 4h18v3H3zM9 11h6"/></>,
    arrow: <><path d="M5 12h14M13 6l6 6-6 6"/></>,
    camera: <><path d="M4 8h3l2-3h6l2 3h3v11H4z"/><circle cx="12" cy="13" r="3.5"/></>,
    chain: <><path d="m9 15-2 2a3.5 3.5 0 0 1-5-5l3-3a3.5 3.5 0 0 1 5 0"/><path d="m15 9 2-2a3.5 3.5 0 1 1 5 5l-3 3a3.5 3.5 0 0 1-5 0M8 16l8-8"/></>,
    check: <><circle cx="12" cy="12" r="9"/><path d="m8 12 2.7 2.7L16.5 9"/></>,
    chevron: <path d="m9 18 6-6-6-6"/>,
    close: <path d="M6 6l12 12M18 6 6 18"/>,
    cube: <><path d="m12 3 8 4.5v9L12 21l-8-4.5v-9z"/><path d="m4 7.5 8 4.5 8-4.5M12 12v9"/></>,
    edit: <><path d="M4 20h4l11-11-4-4L4 16z"/><path d="m13.5 6.5 4 4"/></>,
    eye: <><path d="M2.5 12s3.5-6 9.5-6 9.5 6 9.5 6-3.5 6-9.5 6-9.5-6-9.5-6Z"/><circle cx="12" cy="12" r="2.5"/></>,
    filter: <path d="M4 5h16l-6 7v6l-4 2v-8z"/>,
    history: <><path d="M3 12a9 9 0 1 0 3-6.7L3 8"/><path d="M3 3v5h5M12 7v5l3 2"/></>,
    journal: <><path d="M5 3h14v18H5zM8 7h8M8 11h8M8 15h5"/></>,
    location: <><path d="M20 10c0 5-8 11-8 11S4 15 4 10a8 8 0 1 1 16 0Z"/><circle cx="12" cy="10" r="2.5"/></>,
    plus: <path d="M12 5v14M5 12h14"/>,
    qr: <><path d="M4 4h6v6H4zM14 4h6v6h-6zM4 14h6v6H4zM14 14h2v2h-2zM18 14h2v6h-4v-2M12 12h3"/></>,
    refresh: <><path d="M20 7v5h-5M4 17v-5h5"/><path d="M6.1 8a7 7 0 0 1 11.4-2L20 8M4 16l2.5 2A7 7 0 0 0 18 16"/></>,
    restore: <><path d="M4 9V4m0 0h5M4 4l4 4"/><path d="M5.5 14a7 7 0 1 0 2-7"/></>,
    search: <><circle cx="10.5" cy="10.5" r="6.5"/><path d="m16 16 5 5"/></>,
    shield: <><path d="m12 3 8 3v5c0 5-3.4 8.2-8 10-4.6-1.8-8-5-8-10V6z"/><path d="m8.5 12 2.2 2.2 4.8-5"/></>,
    trash: <><path d="M4 7h16M9 7V4h6v3M7 7l1 14h8l1-14M10 11v6M14 11v6"/></>,
    upload: <><path d="M12 16V4m0 0L7 9m5-5 5 5"/><path d="M4 15v5h16v-5"/></>,
    warning: <><path d="M12 3 2.5 20h19z"/><path d="M12 9v5M12 17h.01"/></>,
  };

  return (
    <svg
      className="dash-icon"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {paths[name]}
    </svg>
  );
};

type ProductStatus = Product['status'];
type Notice = { type: 'success' | 'error' | 'info'; message: string } | null;
type ConfirmAction = { kind: 'archive' | 'permanent'; product: Product } | null;

interface ProductFormState {
  type: Product['type'];
  name: string;
  category: string;
  farmingAreaId: string;
  origin: string;
  cultivationTime: string;
  initialQuantity: string;
  unit: string;
  description: string;
  status: ProductStatus;
  newImages: File[];
  existingImages: Array<{ path: string; filename: string }>;
}

const emptyForm = (): ProductFormState => ({
  type: 'Plant',
  name: '',
  category: '',
  farmingAreaId: '',
  origin: '',
  cultivationTime: '',
  initialQuantity: '',
  unit: 'kg',
  description: '',
  status: 'active',
  newImages: [],
  existingImages: [],
});

const statusMeta: Record<ProductStatus, { label: string; tone: string }> = {
  draft: { label: 'Bản nháp', tone: 'neutral' },
  active: { label: 'Đang theo dõi', tone: 'green' },
  completed: { label: 'Đã hoàn thành', tone: 'blue' },
  recalled: { label: 'Đã thu hồi', tone: 'red' },
};

const getErrorMessage = (error: unknown, fallback: string) => {
  if (typeof error === 'object' && error && 'message' in error) {
    const message = (error as { message?: unknown }).message;
    if (typeof message === 'string' && message.trim()) return message;
  }
  return fallback;
};

const formatDate = (value?: string) => {
  if (!value) return 'Chưa cập nhật';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleDateString('vi-VN');
};

const formatNumber = (value?: number) =>
  typeof value === 'number' ? value.toLocaleString('vi-VN') : '0';

const getArea = (product: Product) => {
  if (!product.farming_area) return null;
  return typeof product.farming_area === 'string'
    ? null
    : product.farming_area;
};

const getAreaId = (product: Product) => {
  if (!product.farming_area) return '';
  return typeof product.farming_area === 'string'
    ? product.farming_area
    : product.farming_area._id;
};

const getImageUrl = (product: Product) => {
  const path = product.images?.[0]?.path;
  if (!path) return '';
  if (/^(https?:)?\/\//i.test(path) || path.startsWith('data:')) return path;
  return path.startsWith('/') ? path : `/${path}`;
};

const getInventoryPercent = (product: Product) => {
  const initial = product.initial_quantity ?? 0;
  if (initial <= 0) return null;
  return Math.max(0, Math.min(100, Math.round(((product.current_quantity ?? 0) / initial) * 100)));
};

const isSameDay = (value: string | undefined, date: Date) => {
  if (!value) return false;
  const candidate = new Date(value);
  return (
    candidate.getFullYear() === date.getFullYear() &&
    candidate.getMonth() === date.getMonth() &&
    candidate.getDate() === date.getDate()
  );
};

const StatCard: React.FC<{
  icon: IconName;
  label: string;
  value: number;
  helper: string;
  tone?: 'green' | 'blue' | 'amber';
}> = ({ icon, label, value, helper, tone = 'green' }) => (
  <article className={`dash-stat dash-stat--${tone}`}>
    <span className="dash-stat__icon"><Icon name={icon} size={23} /></span>
    <div className="dash-stat__content">
      <p>{label}</p>
      <strong>{value.toLocaleString('vi-VN')}</strong>
      <small>{helper}</small>
    </div>
  </article>
);

const StatusBadge: React.FC<{ status: ProductStatus }> = ({ status }) => (
  <span className={`dash-badge dash-badge--${statusMeta[status].tone}`}>
    <i />{statusMeta[status].label}
  </span>
);

const ProductThumb: React.FC<{ product: Product }> = ({ product }) => {
  const image = getImageUrl(product);
  return image ? (
    <img className="dash-product-thumb" src={image} alt="" loading="lazy" />
  ) : (
    <span className="dash-product-thumb dash-product-thumb--empty" aria-hidden="true">
      <Icon name="cube" size={22} />
    </span>
  );
};

interface ProductActionsProps {
  product: Product;
  canArchive: boolean;
  onEdit: (product: Product) => void;
  onQr: (product: Product) => void;
  onCamera: (product: Product) => void;
  onArchive: (product: Product) => void;
}

const ProductActions: React.FC<ProductActionsProps> = ({
  product,
  canArchive,
  onEdit,
  onQr,
  onCamera,
  onArchive,
}) => (
  <div className="dash-row-actions">
    <Link className="dash-icon-button" to={`/products/${product._id}`} title="Chi tiết lô" aria-label={`Xem chi tiết ${product.name}`}>
      <Icon name="eye" size={17} />
    </Link>
    <button className="dash-icon-button" type="button" onClick={() => onQr(product)} title="Mã QR" aria-label={`Mở mã QR ${product.name}`}>
      <Icon name="qr" size={17} />
    </button>
    <Link className="dash-icon-button" to={`/add-event?product=${product._id}`} title="Ghi nhật ký" aria-label={`Ghi nhật ký ${product.name}`}>
      <Icon name="journal" size={17} />
    </Link>
    <button className="dash-icon-button" type="button" onClick={() => onCamera(product)} title="Camera" aria-label={`Quản lý camera ${product.name}`}>
      <Icon name="camera" size={17} />
    </button>
    <button className="dash-icon-button" type="button" onClick={() => onEdit(product)} title="Chỉnh sửa" aria-label={`Chỉnh sửa ${product.name}`}>
      <Icon name="edit" size={17} />
    </button>
    {canArchive && (
      <button className="dash-icon-button dash-icon-button--danger" type="button" onClick={() => onArchive(product)} title="Lưu trữ" aria-label={`Lưu trữ ${product.name}`}>
        <Icon name="archive" size={17} />
      </button>
    )}
  </div>
);

interface ProductListProps extends ProductActionsProps {
  products: Product[];
  startIndex: number;
}

const ProductList: React.FC<Omit<ProductListProps, 'product'>> = ({
  products,
  startIndex,
  canArchive,
  onEdit,
  onQr,
  onCamera,
  onArchive,
}) => {
  if (!products.length) {
    return (
      <div className="dash-empty">
        <span><Icon name="search" size={28} /></span>
        <strong>Không tìm thấy lô phù hợp</strong>
        <p>Hãy thử đổi từ khóa hoặc bỏ bớt bộ lọc.</p>
      </div>
    );
  }

  return (
    <>
      <div className="dash-table-wrap">
        <table className="dash-table">
          <caption className="sr-only">Danh sách lô nông sản gần đây</caption>
          <thead>
            <tr>
              <th scope="col">Sản phẩm</th>
              <th scope="col">Mã lô</th>
              <th scope="col">Vùng sản xuất</th>
              <th scope="col">Trạng thái</th>
              <th scope="col">Tồn kho</th>
              <th scope="col">Blockchain</th>
              <th scope="col"><span className="sr-only">Thao tác</span></th>
            </tr>
          </thead>
          <tbody>
            {products.map((product) => {
              const inventory = getInventoryPercent(product);
              const area = getArea(product);
              return (
                <tr key={product._id}>
                  <td>
                    <div className="dash-product-cell">
                      <ProductThumb product={product} />
                      <div>
                        <Link to={`/products/${product._id}`}>{product.name}</Link>
                        <span>{product.category || product.type}</span>
                      </div>
                    </div>
                  </td>
                  <td><strong className="dash-code">{product.batch_code || product._id.slice(-8).toUpperCase()}</strong><small>{formatDate(product.createdAt)}</small></td>
                  <td><span className="dash-area"><Icon name="location" size={15} />{area?.name || product.origin || 'Chưa gán vùng'}</span></td>
                  <td><StatusBadge status={product.status} /></td>
                  <td>
                    <div className="dash-inventory">
                      <span>{formatNumber(product.current_quantity)} {product.unit || 'kg'}</span>
                      {inventory !== null && <i><b style={{ width: `${inventory}%` }} /></i>}
                    </div>
                  </td>
                  <td>
                    <span className={`dash-chain-state ${product.onChainBatchId ? 'is-verified' : ''}`}>
                      <Icon name={product.onChainBatchId ? 'check' : 'history'} size={16} />
                      {product.onChainBatchId ? 'Đã xác thực' : 'Chờ đồng bộ'}
                    </span>
                  </td>
                  <td>
                    <ProductActions
                      product={product}
                      canArchive={canArchive}
                      onEdit={onEdit}
                      onQr={onQr}
                      onCamera={onCamera}
                      onArchive={onArchive}
                    />
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className="dash-mobile-list">
        {products.map((product, index) => {
          const area = getArea(product);
          return (
            <article className="dash-mobile-product" key={product._id}>
              <div className="dash-mobile-product__top">
                <ProductThumb product={product} />
                <div>
                  <small>#{startIndex + index + 1} · {product.batch_code || product._id.slice(-8).toUpperCase()}</small>
                  <Link to={`/products/${product._id}`}>{product.name}</Link>
                  <span>{product.category}</span>
                </div>
                <StatusBadge status={product.status} />
              </div>
              <div className="dash-mobile-product__meta">
                <span><Icon name="location" size={15} />{area?.name || product.origin || 'Chưa gán vùng'}</span>
                <span><Icon name="cube" size={15} />{formatNumber(product.current_quantity)} {product.unit || 'kg'}</span>
                <span className={product.onChainBatchId ? 'is-verified' : ''}><Icon name="chain" size={15} />{product.onChainBatchId ? 'Đã xác thực' : 'Chờ đồng bộ'}</span>
              </div>
              <ProductActions product={product} canArchive={canArchive} onEdit={onEdit} onQr={onQr} onCamera={onCamera} onArchive={onArchive} />
            </article>
          );
        })}
      </div>
    </>
  );
};

const ActivityChart: React.FC<{ products: Product[] }> = ({ products }) => {
  const data = useMemo(() => {
    return Array.from({ length: 7 }, (_, index) => {
      const date = new Date();
      date.setHours(0, 0, 0, 0);
      date.setDate(date.getDate() - (6 - index));
      const created = products.filter((product) => isSameDay(product.createdAt, date)).length;
      const updated = products.filter(
        (product) => !isSameDay(product.createdAt, date) && isSameDay(product.updatedAt, date)
      ).length;
      return {
        label: date.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' }),
        value: created + updated,
      };
    });
  }, [products]);

  const maxValue = Math.max(1, ...data.map((item) => item.value));
  const points = data.map((item, index) => ({
    ...item,
    x: 38 + index * 103,
    y: 154 - (item.value / maxValue) * 112,
  }));
  const line = points.map((point) => `${point.x},${point.y}`).join(' ');
  const area = `38,154 ${line} 656,154`;

  return (
    <section className="dash-panel dash-chart-card">
      <div className="dash-panel__header">
        <div><p className="dash-eyebrow">7 ngày gần nhất</p><h2>Hoạt động truy xuất</h2></div>
        <span className="dash-live-label"><i /> Dữ liệu trực tiếp</span>
      </div>
      <div className="dash-chart" role="img" aria-label={`Biểu đồ hoạt động 7 ngày: ${data.map((item) => `${item.label} có ${item.value}`).join(', ')}`}>
        <svg viewBox="0 0 694 205" preserveAspectRatio="none" aria-hidden="true">
          <defs>
            <linearGradient id="dash-chart-fill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" stopColor="#28a765" stopOpacity=".24" />
              <stop offset="1" stopColor="#28a765" stopOpacity=".01" />
            </linearGradient>
          </defs>
          <path className="dash-chart__grid" d="M38 42H656M38 98H656M38 154H656" />
          <polygon points={area} fill="url(#dash-chart-fill)" />
          <polyline points={line} className="dash-chart__line" />
          {points.map((point) => <circle key={point.label} cx={point.x} cy={point.y} r="4.5" className="dash-chart__dot" />)}
        </svg>
        <div className="dash-chart__labels">
          {data.map((item) => <span key={item.label}>{item.label}</span>)}
        </div>
      </div>
      <p className="dash-chart__note">Bao gồm lô được tạo mới và lô có cập nhật trong ngày.</p>
    </section>
  );
};

type JourneyState = 'done' | 'current' | 'waiting' | 'warning';

const JourneyCard: React.FC<{ product?: Product }> = ({ product }) => {
  const stages: Array<{ label: string; description: string; state: JourneyState }> = product
    ? [
        { label: 'Khởi tạo lô', description: formatDate(product.createdAt), state: 'done' },
        { label: product.type === 'Plant' ? 'Canh tác' : 'Chăn nuôi', description: product.status === 'draft' ? 'Chưa bắt đầu' : 'Đang ghi nhận', state: product.status === 'draft' ? 'current' : 'done' },
        { label: 'Thu hoạch & đóng gói', description: product.status === 'completed' ? 'Đã hoàn tất' : 'Chờ cập nhật', state: product.status === 'completed' ? 'done' : product.status === 'active' ? 'current' : 'waiting' },
        { label: 'Xác thực blockchain', description: product.onChainBatchId ? 'Đã lưu trên chuỗi' : 'Chưa đồng bộ', state: product.onChainBatchId ? 'done' : 'waiting' },
        { label: product.status === 'recalled' ? 'Thu hồi' : 'Phân phối', description: product.status === 'recalled' ? 'Lô đang được thu hồi' : 'Theo dõi hành trình', state: product.status === 'recalled' ? 'warning' : product.status === 'completed' ? 'current' : 'waiting' },
      ]
    : [];

  return (
    <section className="dash-panel dash-journey-card">
      <div className="dash-panel__header">
        <div><p className="dash-eyebrow">Lô cập nhật gần nhất</p><h2>Hành trình chuỗi cung ứng</h2></div>
        {product && <Link to={`/products/${product._id}`}>Chi tiết <Icon name="arrow" size={15} /></Link>}
      </div>
      {!product ? (
        <div className="dash-compact-empty">Chưa có lô để hiển thị hành trình.</div>
      ) : (
        <>
          <div className="dash-journey-product">
            <ProductThumb product={product} />
            <div><strong>{product.name}</strong><span>{product.batch_code || product._id.slice(-8).toUpperCase()}</span></div>
            <StatusBadge status={product.status} />
          </div>
          <ol className="dash-timeline">
            {stages.map((stage, index) => (
              <li className={`is-${stage.state}`} key={stage.label}>
                <span className="dash-timeline__marker">{stage.state === 'done' ? <Icon name="check" size={17} /> : index + 1}</span>
                <div><strong>{stage.label}</strong><small>{stage.description}</small></div>
              </li>
            ))}
          </ol>
        </>
      )}
    </section>
  );
};

interface AlertItem {
  id: string;
  tone: 'danger' | 'warning' | 'info';
  count: number;
  title: string;
  detail: string;
}

const AlertsCard: React.FC<{ products: Product[] }> = ({ products }) => {
  const alerts = useMemo<AlertItem[]>(() => {
    const recalled = products.filter((product) => product.status === 'recalled').length;
    const lowStock = products.filter((product) => {
      const percent = getInventoryPercent(product);
      return percent !== null && percent <= 20 && product.status === 'active';
    }).length;
    const missingChain = products.filter((product) => !product.onChainBatchId && product.status !== 'draft').length;
    const missingArea = products.filter((product) => !getAreaId(product)).length;
    return [
      recalled ? { id: 'recalled', tone: 'danger', count: recalled, title: 'Lô đang thu hồi', detail: 'Cần theo dõi tiến độ và tồn kho liên quan.' } : null,
      lowStock ? { id: 'low-stock', tone: 'warning', count: lowStock, title: 'Lô sắp hết tồn kho', detail: 'Tồn kho còn tối đa 20% số lượng ban đầu.' } : null,
      missingChain ? { id: 'chain', tone: 'info', count: missingChain, title: 'Lô chưa xác thực blockchain', detail: 'Kiểm tra kết nối và nhật ký đồng bộ.' } : null,
      missingArea ? { id: 'area', tone: 'warning', count: missingArea, title: 'Lô chưa gán vùng sản xuất', detail: 'Bổ sung vùng để hồ sơ truy xuất đầy đủ.' } : null,
    ].filter((item): item is AlertItem => Boolean(item));
  }, [products]);

  return (
    <section className="dash-panel dash-alerts-card">
      <div className="dash-panel__header">
        <div><p className="dash-eyebrow">Tự động từ dữ liệu lô</p><h2>Cảnh báo cần xử lý</h2></div>
        <span className="dash-alert-count">{alerts.length}</span>
      </div>
      {!alerts.length ? (
        <div className="dash-all-clear"><span><Icon name="shield" size={24} /></span><div><strong>Mọi thứ đang ổn</strong><small>Không phát hiện vấn đề từ dữ liệu hiện tại.</small></div></div>
      ) : (
        <div className="dash-alert-list">
          {alerts.map((alert) => (
            <div className={`dash-alert dash-alert--${alert.tone}`} key={alert.id}>
              <span className="dash-alert__icon"><Icon name="warning" size={19} /></span>
              <div><strong><b>{alert.count}</b> {alert.title}</strong><small>{alert.detail}</small></div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
};

const BlockchainCard: React.FC<{ total: number; verified: number }> = ({ total, verified }) => {
  const percentage = total ? Math.round((verified / total) * 100) : 0;
  const style = { '--dash-progress': `${percentage * 3.6}deg` } as React.CSSProperties;
  return (
    <section className="dash-panel dash-blockchain-card">
      <div className="dash-panel__header"><div><p className="dash-eyebrow">Trạng thái hệ thống</p><h2>Xác thực blockchain</h2></div><Icon name="chain" size={22} /></div>
      <div className="dash-blockchain-card__body">
        <div className="dash-donut" style={style}><span><strong>{percentage}%</strong><small>đã xác thực</small></span></div>
        <dl>
          <div><dt>Tổng số lô</dt><dd>{total}</dd></div>
          <div><dt>Đã lưu trên chuỗi</dt><dd>{verified}</dd></div>
          <div><dt>Chờ đồng bộ</dt><dd>{Math.max(0, total - verified)}</dd></div>
        </dl>
      </div>
      <p className={`dash-network ${total === verified && total > 0 ? 'is-good' : ''}`}><i />{total === verified && total > 0 ? 'Tất cả lô đã được xác thực' : 'Còn dữ liệu cần được đồng bộ'}</p>
    </section>
  );
};

interface ModalShellProps {
  title: string;
  description?: string;
  size?: 'small' | 'large';
  onClose: () => void;
  children: React.ReactNode;
}

const ModalShell: React.FC<ModalShellProps> = ({ title, description, size = 'large', onClose, children }) => {
  useEffect(() => {
    const handleKey = (event: KeyboardEvent) => event.key === 'Escape' && onClose();
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, [onClose]);

  return (
    <div className="dash-modal-backdrop" role="presentation" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
      <section className={`dash-modal dash-modal--${size}`} role="dialog" aria-modal="true" aria-labelledby="dash-modal-title">
        <div className="dash-modal__header">
          <div><h2 id="dash-modal-title">{title}</h2>{description && <p>{description}</p>}</div>
          <button className="dash-icon-button" type="button" onClick={onClose} aria-label="Đóng"><Icon name="close" /></button>
        </div>
        {children}
      </section>
    </div>
  );
};

interface ProductFormModalProps {
  editing: Product | null;
  form: ProductFormState;
  setForm: React.Dispatch<React.SetStateAction<ProductFormState>>;
  areas: FarmingArea[];
  categories: string[];
  submitting: boolean;
  error: string;
  onClose: () => void;
  onSubmit: (event: React.FormEvent) => void;
}

const ProductFormModal: React.FC<ProductFormModalProps> = ({ editing, form, setForm, areas, categories, submitting, error, onClose, onSubmit }) => {
  const update = <K extends keyof ProductFormState>(key: K, value: ProductFormState[K]) => setForm((current) => ({ ...current, [key]: value }));
  const handleFiles = (event: React.ChangeEvent<HTMLInputElement>) => {
    const selected = Array.from(event.target.files || []).filter((file) => file.type.startsWith('image/')).slice(0, Math.max(0, 5 - form.existingImages.length));
    update('newImages', selected);
  };
  const handleArea = (id: string) => {
    const area = areas.find((item) => item._id === id);
    setForm((current) => ({ ...current, farmingAreaId: id, origin: area?.address || current.origin }));
  };

  return (
    <ModalShell title={editing ? 'Chỉnh sửa lô nông sản' : 'Tạo lô nông sản mới'} description="Thông tin rõ ràng giúp hồ sơ truy xuất đáng tin cậy hơn." onClose={onClose}>
      <form className="dash-product-form" onSubmit={onSubmit}>
        {error && <div className="dash-form-message dash-form-message--error" role="alert">{error}</div>}
        <fieldset className="dash-type-picker">
          <legend>Mô hình sản xuất</legend>
          <label className={form.type === 'Plant' ? 'is-selected' : ''}><input type="radio" checked={form.type === 'Plant'} onChange={() => update('type', 'Plant')} /><span>🌱</span><div><strong>Trồng trọt</strong><small>Rau, củ, quả, ngũ cốc...</small></div></label>
          <label className={form.type === 'Animal' ? 'is-selected' : ''}><input type="radio" checked={form.type === 'Animal'} onChange={() => update('type', 'Animal')} /><span>🐄</span><div><strong>Chăn nuôi</strong><small>Gia súc, gia cầm, thủy sản...</small></div></label>
        </fieldset>
        <div className="dash-form-grid">
          <label className="dash-field dash-field--wide"><span>Tên lô <b>*</b></span><input autoFocus required value={form.name} onChange={(event) => update('name', event.target.value)} placeholder="Ví dụ: Xoài cát lứa tháng 6" /></label>
          <label className="dash-field"><span>Nhóm sản phẩm <b>*</b></span><input required list="dash-category-options" value={form.category} onChange={(event) => update('category', event.target.value)} placeholder="Chọn hoặc nhập nhóm" /><datalist id="dash-category-options">{categories.map((category) => <option value={category} key={category} />)}</datalist></label>
          <label className="dash-field"><span>Trạng thái</span><select value={form.status} disabled={!editing} onChange={(event) => update('status', event.target.value as ProductStatus)}>{Object.entries(statusMeta).map(([value, meta]) => <option value={value} key={value}>{meta.label}</option>)}</select></label>
          <label className="dash-field"><span>Vùng sản xuất <b>*</b></span><select required value={form.farmingAreaId} onChange={(event) => handleArea(event.target.value)}><option value="">Chọn vùng sản xuất</option>{areas.map((area) => <option value={area._id} key={area._id}>{area.name}</option>)}</select></label>
          <label className="dash-field"><span>Địa chỉ / xuất xứ <b>*</b></span><input required value={form.origin} onChange={(event) => update('origin', event.target.value)} placeholder="Địa điểm sản xuất" /></label>
          <label className="dash-field"><span>Ngày bắt đầu</span><input type="date" value={form.cultivationTime.slice(0, 10)} onChange={(event) => update('cultivationTime', event.target.value)} /></label>
          <div className="dash-field"><span>Số lượng ban đầu</span><div className="dash-quantity-field"><input type="number" min="0" step="any" disabled={Boolean(editing)} value={form.initialQuantity} onChange={(event) => update('initialQuantity', event.target.value)} placeholder="0" /><input aria-label="Đơn vị" disabled={Boolean(editing)} value={form.unit} onChange={(event) => update('unit', event.target.value)} /></div>{editing && <small>Số lượng được điều chỉnh trong nghiệp vụ tồn kho.</small>}</div>
          <label className="dash-field dash-field--wide"><span>Mô tả</span><textarea rows={4} value={form.description} onChange={(event) => update('description', event.target.value)} placeholder="Ghi chú giống, quy trình hoặc thông tin cần lưu ý..." /></label>
          <div className="dash-field dash-field--wide"><span>Hình ảnh (tối đa 5)</span><label className="dash-upload"><input type="file" accept="image/*" multiple onChange={handleFiles} /><Icon name="upload" /><strong>Chọn ảnh từ thiết bị</strong><small>PNG, JPG, WEBP; nên dùng ảnh ngang rõ nét.</small></label>
            {(form.existingImages.length > 0 || form.newImages.length > 0) && <div className="dash-file-list">{form.existingImages.map((image, index) => <span key={`${image.path}-${index}`}>{image.filename}<button type="button" onClick={() => update('existingImages', form.existingImages.filter((_, itemIndex) => itemIndex !== index))} aria-label={`Bỏ ${image.filename}`}><Icon name="close" size={13} /></button></span>)}{form.newImages.map((file) => <span key={`${file.name}-${file.lastModified}`}>{file.name}</span>)}</div>}
          </div>
        </div>
        <div className="dash-modal__footer"><button className="dash-button dash-button--secondary" type="button" onClick={onClose}>Hủy</button><button className="dash-button dash-button--primary" type="submit" disabled={submitting}>{submitting ? <><span className="dash-spinner" /> Đang lưu...</> : editing ? 'Lưu thay đổi' : 'Tạo lô mới'}</button></div>
      </form>
    </ModalShell>
  );
};

const DashboardPage: React.FC = () => {
  const { user } = useAuth();
  const [searchParams] = useSearchParams();
  const [products, setProducts] = useState<Product[]>([]);
  const [areas, setAreas] = useState<FarmingArea[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [notice, setNotice] = useState<Notice>(null);
  const [search, setSearch] = useState(searchParams.get('search') || '');
  const [statusFilter, setStatusFilter] = useState<'all' | ProductStatus>('all');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [chainFilter, setChainFilter] = useState<'all' | 'verified' | 'pending'>('all');
  const [dateFilter, setDateFilter] = useState('');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(5);
  const [editing, setEditing] = useState<Product | null>(null);
  const [form, setForm] = useState<ProductFormState>(emptyForm);
  const [formOpen, setFormOpen] = useState(false);
  const [formError, setFormError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [trashOpen, setTrashOpen] = useState(false);
  const [trashProducts, setTrashProducts] = useState<Product[]>([]);
  const [trashLoading, setTrashLoading] = useState(false);
  const [trashError, setTrashError] = useState('');
  const [qrProduct, setQrProduct] = useState<Product | null>(null);
  const [cameraProduct, setCameraProduct] = useState<Product | null>(null);
  const [confirmAction, setConfirmAction] = useState<ConfirmAction>(null);
  const [confirmBusy, setConfirmBusy] = useState(false);

  const canManageTrash = user?.role === 'admin' || user?.role === 'manager';
  const canArchive = user?.role === 'admin';

  const loadData = useCallback(async () => {
    setLoading(true);
    setLoadError('');
    try {
      const productResponse = await productApi.getAll();
      setProducts(productResponse.data.products || []);
      try {
        const areaResponse = await farmingAreaApi.getAll();
        setAreas(areaResponse.data.farmingAreas || []);
      } catch (error) {
        setAreas([]);
        setNotice({ type: 'info', message: 'Danh sách lô đã tải, nhưng chưa thể tải vùng sản xuất.' });
      }
    } catch (error) {
      setLoadError(getErrorMessage(error, 'Không thể tải dữ liệu tổng quan.'));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void loadData(); }, [loadData]);
  useEffect(() => { setSearch(searchParams.get('search') || ''); }, [searchParams]);
  useEffect(() => {
    if (!notice) return;
    const timeout = window.setTimeout(() => setNotice(null), 4500);
    return () => window.clearTimeout(timeout);
  }, [notice]);

  const categories = useMemo(() => Array.from(new Set(products.map((product) => product.category).filter(Boolean))).sort((a, b) => a.localeCompare(b, 'vi')), [products]);
  const sortedProducts = useMemo(() => [...products].sort((a, b) => new Date(b.updatedAt || b.createdAt).getTime() - new Date(a.updatedAt || a.createdAt).getTime()), [products]);
  const filteredProducts = useMemo(() => {
    const keyword = search.trim().toLocaleLowerCase('vi');
    return sortedProducts.filter((product) => {
      const area = getArea(product);
      const haystack = `${product.name} ${product.batch_code || ''} ${product.category} ${product.origin} ${area?.name || ''}`.toLocaleLowerCase('vi');
      return (!keyword || haystack.includes(keyword))
        && (statusFilter === 'all' || product.status === statusFilter)
        && (categoryFilter === 'all' || product.category === categoryFilter)
        && (chainFilter === 'all' || (chainFilter === 'verified' ? Boolean(product.onChainBatchId) : !product.onChainBatchId))
        && (!dateFilter || product.createdAt.slice(0, 10) === dateFilter);
    });
  }, [categoryFilter, chainFilter, dateFilter, search, sortedProducts, statusFilter]);
  const totalPages = Math.max(1, Math.ceil(filteredProducts.length / pageSize));
  const pagedProducts = useMemo(() => filteredProducts.slice((page - 1) * pageSize, page * pageSize), [filteredProducts, page, pageSize]);

  useEffect(() => { setPage(1); }, [search, statusFilter, categoryFilter, chainFilter, dateFilter, pageSize]);
  useEffect(() => { if (page > totalPages) setPage(totalPages); }, [page, totalPages]);

  const activeCount = products.filter((product) => product.status === 'active').length;
  const completedCount = products.filter((product) => product.status === 'completed').length;
  const verifiedCount = products.filter((product) => Boolean(product.onChainBatchId)).length;

  const openCreate = () => {
    setEditing(null);
    setForm(emptyForm());
    setFormError('');
    setFormOpen(true);
  };
  const openEdit = (product: Product) => {
    setEditing(product);
    setForm({
      type: product.type,
      name: product.name,
      category: product.category,
      farmingAreaId: getAreaId(product),
      origin: product.origin || getArea(product)?.address || '',
      cultivationTime: product.cultivation_time || '',
      initialQuantity: String(product.initial_quantity ?? ''),
      unit: product.unit || 'kg',
      description: product.description || '',
      status: product.status,
      newImages: [],
      existingImages: product.images || [],
    });
    setFormError('');
    setFormOpen(true);
  };

  const uploadImages = async (files: File[]) => {
    if (!files.length) return [];
    const payload = new FormData();
    files.slice(0, 5).forEach((file) => payload.append('files', file));
    const { default: axiosClient } = await import('../../core/api/axiosClient');
    const response = await axiosClient.post<{ files: Array<{ path: string; filename: string; mediaType?: string }> }>('/upload/media', payload, { headers: { 'Content-Type': 'multipart/form-data' } });
    return response.data.files.filter((file) => !file.mediaType || file.mediaType === 'image').map(({ path, filename }) => ({ path, filename }));
  };

  const saveProduct = async (event: React.FormEvent) => {
    event.preventDefault();
    setFormError('');
    if (!form.name.trim() || !form.category.trim() || !form.farmingAreaId || !form.origin.trim()) {
      setFormError('Vui lòng điền đủ tên lô, nhóm sản phẩm, vùng sản xuất và xuất xứ.');
      return;
    }
    if (form.newImages.some((file) => file.size > 5 * 1024 * 1024)) {
      setFormError('Mỗi hình ảnh cần nhỏ hơn 5 MB.');
      return;
    }
    setSubmitting(true);
    try {
      const uploaded = await uploadImages(form.newImages);
      if (editing) {
        const response = await productApi.update(editing._id, {
          type: form.type,
          name: form.name.trim(),
          category: form.category.trim(),
          farming_area: form.farmingAreaId,
          origin: form.origin.trim(),
          cultivation_time: form.cultivationTime || undefined,
          description: form.description.trim(),
          images: [...form.existingImages, ...uploaded].slice(0, 5),
          status: form.status,
        });
        setProducts((current) => current.map((item) => item._id === response.data.product._id ? response.data.product : item));
        setNotice({ type: 'success', message: `Đã cập nhật lô “${response.data.product.name}”.` });
      } else {
        const quantity = form.initialQuantity ? Number(form.initialQuantity) : 0;
        const response = await productApi.create({
          type: form.type,
          name: form.name.trim(),
          category: form.category.trim(),
          farming_area: form.farmingAreaId,
          origin: form.origin.trim(),
          cultivation_time: form.cultivationTime || undefined,
          initial_quantity: quantity,
          current_quantity: quantity,
          unit: form.unit.trim() || 'kg',
          description: form.description.trim(),
          images: uploaded,
        });
        setProducts((current) => [response.data.product, ...current]);
        setNotice({ type: 'success', message: `Đã tạo lô “${response.data.product.name}”.` });
      }
      setFormOpen(false);
    } catch (error) {
      setFormError(getErrorMessage(error, editing ? 'Không thể cập nhật lô.' : 'Không thể tạo lô mới.'));
    } finally {
      setSubmitting(false);
    }
  };

  const openTrash = async () => {
    setTrashOpen(true);
    setTrashLoading(true);
    setTrashError('');
    try {
      const response = await productApi.getTrash();
      setTrashProducts(response.data.products || []);
    } catch (error) {
      setTrashError(getErrorMessage(error, 'Không thể tải thùng rác.'));
    } finally {
      setTrashLoading(false);
    }
  };

  const restoreProduct = async (product: Product) => {
    try {
      const response = await productApi.restore(product._id);
      setTrashProducts((current) => current.filter((item) => item._id !== product._id));
      setProducts((current) => [response.data.product, ...current]);
      setNotice({ type: 'success', message: `Đã khôi phục lô “${product.name}”.` });
    } catch (error) {
      setTrashError(getErrorMessage(error, 'Không thể khôi phục lô.'));
    }
  };

  const runConfirmedAction = async () => {
    if (!confirmAction) return;
    setConfirmBusy(true);
    try {
      if (confirmAction.kind === 'archive') {
        await productApi.delete(confirmAction.product._id);
        setProducts((current) => current.filter((item) => item._id !== confirmAction.product._id));
        setNotice({ type: 'success', message: `Đã chuyển “${confirmAction.product.name}” vào thùng rác.` });
      } else {
        await productApi.permanentDelete(confirmAction.product._id);
        setTrashProducts((current) => current.filter((item) => item._id !== confirmAction.product._id));
        setNotice({ type: 'success', message: `Đã xóa vĩnh viễn “${confirmAction.product.name}”.` });
      }
      setConfirmAction(null);
    } catch (error) {
      const message = getErrorMessage(error, 'Không thể hoàn tất thao tác.');
      if (confirmAction.kind === 'permanent') setTrashError(message);
      else setNotice({ type: 'error', message });
      setConfirmAction(null);
    } finally {
      setConfirmBusy(false);
    }
  };

  const resetFilters = () => {
    setSearch('');
    setStatusFilter('all');
    setCategoryFilter('all');
    setChainFilter('all');
    setDateFilter('');
  };
  const hasFilters = Boolean(search || statusFilter !== 'all' || categoryFilter !== 'all' || chainFilter !== 'all' || dateFilter);

  if (loading) {
    return <div className="dash-state"><span className="dash-spinner dash-spinner--large" /><strong>Đang tải không gian quản lý...</strong><p>Dữ liệu lô và vùng sản xuất đang được đồng bộ.</p></div>;
  }
  if (loadError) {
    return <div className="dash-state dash-state--error"><span><Icon name="warning" size={28} /></span><strong>Không thể tải Dashboard</strong><p>{loadError}</p><button className="dash-button dash-button--primary" type="button" onClick={() => void loadData()}><Icon name="refresh" size={17} /> Thử lại</button></div>;
  }

  return (
    <div className="dash-page">
      {notice && <div className={`dash-toast dash-toast--${notice.type}`} role="status"><Icon name={notice.type === 'success' ? 'check' : notice.type === 'error' ? 'warning' : 'history'} size={19} /><span>{notice.message}</span><button type="button" onClick={() => setNotice(null)} aria-label="Đóng thông báo"><Icon name="close" size={15} /></button></div>}
      {cameraProduct && <ProductCameraModal product={cameraProduct} onClose={() => setCameraProduct(null)} onSaved={(updated) => { setProducts((current) => current.map((item) => item._id === updated._id ? updated : item)); setCameraProduct(updated); setNotice({ type: 'success', message: 'Đã cập nhật camera của lô.' }); }} />}
      {formOpen && <ProductFormModal editing={editing} form={form} setForm={setForm} areas={areas} categories={categories} submitting={submitting} error={formError} onClose={() => setFormOpen(false)} onSubmit={saveProduct} />}
      {qrProduct && <ModalShell title={`Mã QR · ${qrProduct.name}`} description="Quét mã để mở hồ sơ truy xuất công khai." size="small" onClose={() => setQrProduct(null)}><div className="dash-qr-modal"><QRCodeSVG value={`${window.location.origin}/trace/${qrProduct._id}`} size={220} level="H" marginSize={2} /><strong>{qrProduct.batch_code || qrProduct._id}</strong><Link className="dash-button dash-button--primary" to={`/trace/${qrProduct._id}`}>Mở hồ sơ truy xuất <Icon name="arrow" size={17} /></Link></div></ModalShell>}
      {trashOpen && <ModalShell title="Thùng rác lô nông sản" description="Khôi phục lô đã lưu trữ hoặc xóa vĩnh viễn khi không còn dữ liệu liên quan." onClose={() => setTrashOpen(false)}><div className="dash-trash-content">{trashError && <div className="dash-form-message dash-form-message--error">{trashError}</div>}{trashLoading ? <div className="dash-compact-empty"><span className="dash-spinner" /> Đang tải...</div> : !trashProducts.length ? <div className="dash-empty"><span><Icon name="trash" size={28} /></span><strong>Thùng rác đang trống</strong><p>Các lô đã lưu trữ sẽ xuất hiện tại đây.</p></div> : <div className="dash-trash-list">{trashProducts.map((product) => <article key={product._id}><ProductThumb product={product} /><div><strong>{product.name}</strong><span>{product.batch_code || product._id.slice(-8).toUpperCase()} · Xóa {formatDate(product.deletedAt)}</span></div><button className="dash-button dash-button--secondary" type="button" onClick={() => void restoreProduct(product)}><Icon name="restore" size={16} /> Khôi phục</button>{user?.role === 'admin' && <button className="dash-button dash-button--danger" type="button" onClick={() => setConfirmAction({ kind: 'permanent', product })}><Icon name="trash" size={16} /> Xóa hẳn</button>}</article>)}</div>}</div></ModalShell>}
      {confirmAction && <ModalShell title={confirmAction.kind === 'archive' ? 'Lưu trữ lô?' : 'Xóa vĩnh viễn lô?'} description={confirmAction.kind === 'archive' ? 'Lô sẽ được chuyển vào thùng rác và có thể khôi phục.' : 'Thao tác này không thể hoàn tác và chỉ thành công nếu lô không có dữ liệu liên quan.'} size="small" onClose={() => !confirmBusy && setConfirmAction(null)}><div className="dash-confirm"><span className={confirmAction.kind === 'archive' ? '' : 'is-danger'}><Icon name={confirmAction.kind === 'archive' ? 'archive' : 'warning'} size={28} /></span><strong>{confirmAction.product.name}</strong><p>{confirmAction.product.batch_code || confirmAction.product._id}</p><div className="dash-modal__footer"><button className="dash-button dash-button--secondary" type="button" disabled={confirmBusy} onClick={() => setConfirmAction(null)}>Hủy</button><button className={`dash-button ${confirmAction.kind === 'archive' ? 'dash-button--primary' : 'dash-button--danger'}`} type="button" disabled={confirmBusy} onClick={() => void runConfirmedAction()}>{confirmBusy ? 'Đang xử lý...' : confirmAction.kind === 'archive' ? 'Chuyển vào thùng rác' : 'Xóa vĩnh viễn'}</button></div></div></ModalShell>}

      <header className="dash-page-header">
        <div><p className="dash-eyebrow">AgriTrace · Trung tâm vận hành</p><h1>Tổng quan truy xuất</h1><p>Theo dõi lô nông sản, tồn kho và tình trạng xác thực trong một màn hình.</p></div>
        <div className="dash-page-header__actions">{canManageTrash && <button className="dash-button dash-button--secondary" type="button" onClick={() => void openTrash()}><Icon name="trash" size={17} /> Thùng rác</button>}<button className="dash-button dash-button--primary" type="button" onClick={openCreate}><Icon name="plus" size={18} /> Tạo lô mới</button></div>
      </header>

      <section className="dash-stats" aria-label="Số liệu tổng quan">
        <StatCard icon="cube" label="Tổng số lô" value={products.length} helper="Toàn bộ lô đang quản lý" />
        <StatCard icon="eye" label="Đang theo dõi" value={activeCount} helper={`${products.length ? Math.round((activeCount / products.length) * 100) : 0}% tổng số lô`} />
        <StatCard icon="check" label="Đã hoàn thành" value={completedCount} helper="Sẵn sàng cho phân phối" tone="blue" />
        <StatCard icon="chain" label="Blockchain sẵn sàng" value={verifiedCount} helper={`${products.length ? Math.round((verifiedCount / products.length) * 100) : 0}% đã được xác thực`} tone="amber" />
      </section>

      <div className="dash-layout">
        <div className="dash-layout__main">
          <section className="dash-panel dash-products-card">
            <div className="dash-panel__header dash-products-card__header"><div><p className="dash-eyebrow">Danh sách vận hành</p><h2>Lô nông sản gần đây</h2></div><span>{filteredProducts.length} / {products.length} lô</span></div>
            <div className="dash-filters">
              <label className="dash-search"><span className="sr-only">Tìm kiếm lô</span><Icon name="search" size={19} /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Tìm tên, mã lô, vùng sản xuất..." />{search && <button type="button" onClick={() => setSearch('')} aria-label="Xóa từ khóa"><Icon name="close" size={15} /></button>}</label>
              <label><span className="sr-only">Lọc trạng thái</span><select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value as 'all' | ProductStatus)}><option value="all">Tất cả trạng thái</option>{Object.entries(statusMeta).map(([value, meta]) => <option value={value} key={value}>{meta.label}</option>)}</select></label>
              <label><span className="sr-only">Lọc nhóm sản phẩm</span><select value={categoryFilter} onChange={(event) => setCategoryFilter(event.target.value)}><option value="all">Tất cả sản phẩm</option>{categories.map((category) => <option value={category} key={category}>{category}</option>)}</select></label>
              <label><span className="sr-only">Lọc blockchain</span><select value={chainFilter} onChange={(event) => setChainFilter(event.target.value as typeof chainFilter)}><option value="all">Mọi trạng thái chuỗi</option><option value="verified">Đã xác thực</option><option value="pending">Chờ đồng bộ</option></select></label>
              <label className="dash-date-filter"><span className="sr-only">Lọc ngày tạo</span><input type="date" value={dateFilter} onChange={(event) => setDateFilter(event.target.value)} /></label>
              {hasFilters && <button className="dash-reset" type="button" onClick={resetFilters}><Icon name="refresh" size={15} /> Đặt lại</button>}
            </div>
            <ProductList products={pagedProducts} startIndex={(page - 1) * pageSize} canArchive={canArchive} onEdit={openEdit} onQr={setQrProduct} onCamera={setCameraProduct} onArchive={(product) => setConfirmAction({ kind: 'archive', product })} />
            {filteredProducts.length > 0 && <div className="dash-pagination"><p>Hiển thị <strong>{(page - 1) * pageSize + 1}–{Math.min(page * pageSize, filteredProducts.length)}</strong> trong {filteredProducts.length} lô</p><div><button type="button" disabled={page === 1} onClick={() => setPage((current) => current - 1)} aria-label="Trang trước">‹</button>{Array.from({ length: totalPages }, (_, index) => index + 1).filter((item) => item === 1 || item === totalPages || Math.abs(item - page) <= 1).map((item, index, list) => <React.Fragment key={item}>{index > 0 && item - list[index - 1] > 1 && <span>…</span>}<button type="button" className={item === page ? 'is-active' : ''} onClick={() => setPage(item)} aria-current={item === page ? 'page' : undefined}>{item}</button></React.Fragment>)}</div><label><span className="sr-only">Số dòng mỗi trang</span><select value={pageSize} onChange={(event) => setPageSize(Number(event.target.value))}><option value={5}>5 / trang</option><option value={10}>10 / trang</option><option value={20}>20 / trang</option></select></label></div>}
          </section>
          <ActivityChart products={products} />
        </div>
        <aside className="dash-layout__aside">
          <JourneyCard product={sortedProducts[0]} />
          <AlertsCard products={products} />
          <BlockchainCard total={products.length} verified={verifiedCount} />
        </aside>
      </div>
    </div>
  );
};

export default DashboardPage;
