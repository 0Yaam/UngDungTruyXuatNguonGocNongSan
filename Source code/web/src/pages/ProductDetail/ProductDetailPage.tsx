import React, { useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { productApi } from '../../core/api/product.api';
import { traceEventApi } from '../../core/api/traceEvent.api';
import type { FullTrace, InventoryTransaction, Product, TraceEvent } from '../../core/types';
import './ProductDetailPage.css';

type TabKey = 'overview' | 'inventory' | 'timeline';
type AdjustmentType = 'IN' | 'OUT';

const statusLabel: Record<Product['status'], string> = {
  draft: 'Bản nháp',
  active: 'Đang theo dõi',
  completed: 'Đã hoàn thành',
  recalled: 'Đã thu hồi',
};

const eventLabel: Record<string, string> = {
  SEEDING: 'Gieo hạt',
  FERTILIZING: 'Bón phân',
  WATERING: 'Tưới nước',
  PEST_CONTROL: 'Phòng trừ sâu bệnh',
  HARVESTING: 'Thu hoạch',
  PACKAGING: 'Đóng gói',
  SHIPPING: 'Vận chuyển',
};

const transactionLabel: Record<string, string> = {
  INITIAL: 'Khởi tạo tồn',
  ADJUST_IN: 'Nhập bổ sung',
  ADJUST_OUT: 'Xuất/hao hụt',
  SPLIT_OUT: 'Tách lô nguồn',
  SPLIT_IN: 'Nhận từ tách lô',
  MERGE_OUT: 'Gộp vào lô khác',
  MERGE_IN: 'Nhận từ gộp lô',
  RECALL_OUT: 'Thu hồi',
};

const formatDateTime = (value?: string) => {
  if (!value) return 'Chưa cập nhật';
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? value
    : date.toLocaleString('vi-VN', { dateStyle: 'short', timeStyle: 'short' });
};

const formatNumber = (value?: number) =>
  typeof value === 'number' ? value.toLocaleString('vi-VN') : '0';

const getImageUrl = (product?: Product) => {
  const path = product?.images?.[0]?.path;
  if (!path) return '';
  if (/^(https?:)?\/\//i.test(path) || path.startsWith('data:')) return path;
  return path.startsWith('/') ? path : `/${path}`;
};

const getAreaName = (product?: Product) => {
  if (!product?.farming_area) return product?.origin || 'Chưa gán vùng trồng';
  return typeof product.farming_area === 'string'
    ? product.origin || 'Đã gán vùng trồng'
    : product.farming_area.name;
};

const ProductDetailPage: React.FC = () => {
  const { productId = '' } = useParams();
  const [activeTab, setActiveTab] = useState<TabKey>('overview');
  const [product, setProduct] = useState<Product | null>(null);
  const [trace, setTrace] = useState<FullTrace | null>(null);
  const [transactions, setTransactions] = useState<InventoryTransaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [adjustType, setAdjustType] = useState<AdjustmentType>('IN');
  const [quantity, setQuantity] = useState('');
  const [note, setNote] = useState('');

  const loadData = async () => {
    if (!productId) return;
    setError('');
    try {
      setLoading(true);
      const [productRes, inventoryRes, traceRes] = await Promise.allSettled([
        productApi.getById(productId),
        productApi.getInventory(productId),
        traceEventApi.getInternalTrace(productId),
      ]);

      if (productRes.status === 'fulfilled') {
        setProduct(productRes.value.data.product);
      } else {
        throw productRes.reason;
      }

      if (inventoryRes.status === 'fulfilled') {
        setTransactions(inventoryRes.value.data.transactions || []);
        setProduct(inventoryRes.value.data.product || productRes.value.data.product);
      }

      if (traceRes.status === 'fulfilled') {
        setTrace(traceRes.value.data);
      }
    } catch (err: any) {
      setError(err.message || 'Không tải được chi tiết lô.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadData();
  }, [productId]);

  const events = useMemo<TraceEvent[]>(() => trace?.events || [], [trace]);
  const inventoryPercent = useMemo(() => {
    const initial = product?.initial_quantity || 0;
    const current = product?.current_quantity || 0;
    if (!initial) return 0;
    return Math.max(0, Math.min(100, Math.round((current / initial) * 100)));
  }, [product]);

  const handleAdjustment = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const parsedQuantity = Number(quantity);
    if (!parsedQuantity || parsedQuantity <= 0) {
      setError('Số lượng điều chỉnh phải lớn hơn 0.');
      return;
    }

    try {
      setSaving(true);
      setError('');
      setNotice('');
      const { data } = await productApi.adjustInventory(productId, {
        type: adjustType,
        quantity: parsedQuantity,
        note: note.trim() || undefined,
      });
      setProduct(data.product);
      setTransactions((current) => [data.transaction, ...current]);
      setQuantity('');
      setNote('');
      setNotice('Đã cập nhật tồn kho cho lô.');
    } catch (err: any) {
      setError(err.message || 'Không thể điều chỉnh tồn kho.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="product-detail-state">
        <span className="product-detail-spinner" />
        <strong>Đang tải chi tiết lô...</strong>
      </div>
    );
  }

  if (error && !product) {
    return (
      <div className="product-detail-state product-detail-state--error">
        <strong>{error}</strong>
        <Link to="/products">Quay lại danh sách lô</Link>
      </div>
    );
  }

  if (!product) return null;

  const image = getImageUrl(product);

  return (
    <div className="product-detail-page">
      <header className="product-detail-hero">
        <div className="product-detail-hero__image">
          {image ? <img src={image} alt="" /> : <span>{product.type === 'Plant' ? 'Cây trồng' : 'Vật nuôi'}</span>}
        </div>
        <div className="product-detail-hero__copy">
          <Link className="product-detail-back" to="/products">← Danh sách lô</Link>
          <div className="product-detail-title-row">
            <div>
              <p className="product-detail-eyebrow">{product.batch_code || product._id.slice(-8).toUpperCase()}</p>
              <h1>{product.name}</h1>
            </div>
            <span className={`product-detail-status is-${product.status}`}>{statusLabel[product.status]}</span>
          </div>
          <p>{product.description || 'Lô nông sản đang được quản lý trong hệ thống truy xuất AgriTrace.'}</p>
          <div className="product-detail-actions">
            <Link to={`/add-event?product=${product._id}`}>Ghi nhật ký</Link>
            <Link to={`/trace/${product._id}`}>Mở trang truy xuất công khai</Link>
          </div>
        </div>
      </header>

      {(error || notice) && (
        <div className={`product-detail-alert ${error ? 'is-error' : 'is-success'}`}>
          {error || notice}
          <button type="button" onClick={() => { setError(''); setNotice(''); }}>×</button>
        </div>
      )}

      <section className="product-detail-kpis" aria-label="Chỉ số lô">
        <article><span>Tồn hiện tại</span><strong>{formatNumber(product.current_quantity)} {product.unit || 'kg'}</strong></article>
        <article><span>Tồn ban đầu</span><strong>{formatNumber(product.initial_quantity)} {product.unit || 'kg'}</strong></article>
        <article><span>Nhật ký</span><strong>{events.length}</strong></article>
        <article><span>Blockchain</span><strong>{product.onChainBatchId ? 'Đã xác thực' : 'Chờ đồng bộ'}</strong></article>
      </section>

      <div className="product-detail-tabs" role="tablist" aria-label="Nội dung chi tiết lô">
        <button className={activeTab === 'overview' ? 'is-active' : ''} onClick={() => setActiveTab('overview')} type="button">Tổng quan</button>
        <button className={activeTab === 'inventory' ? 'is-active' : ''} onClick={() => setActiveTab('inventory')} type="button">Tồn kho</button>
        <button className={activeTab === 'timeline' ? 'is-active' : ''} onClick={() => setActiveTab('timeline')} type="button">Nhật ký</button>
      </div>

      {activeTab === 'overview' && (
        <section className="product-detail-grid">
          <article className="product-detail-panel">
            <h2>Thông tin sản xuất</h2>
            <dl className="product-detail-list">
              <div><dt>Danh mục</dt><dd>{product.category || product.type}</dd></div>
              <div><dt>Loại lô</dt><dd>{product.type === 'Plant' ? 'Cây trồng' : 'Vật nuôi'}</dd></div>
              <div><dt>Vùng trồng</dt><dd>{getAreaName(product)}</dd></div>
              <div><dt>Thời gian canh tác</dt><dd>{product.cultivation_time || 'Chưa cập nhật'}</dd></div>
              <div><dt>Ngày tạo</dt><dd>{formatDateTime(product.createdAt)}</dd></div>
              <div><dt>Cập nhật cuối</dt><dd>{formatDateTime(product.updatedAt)}</dd></div>
            </dl>
          </article>
          <article className="product-detail-panel">
            <h2>Tình trạng tồn kho</h2>
            <div className="product-detail-meter">
              <span style={{ width: `${inventoryPercent}%` }} />
            </div>
            <p className="product-detail-muted">
              Còn {inventoryPercent}% so với số lượng ban đầu. Các thay đổi tồn kho được ghi lại ở tab Tồn kho.
            </p>
          </article>
        </section>
      )}

      {activeTab === 'inventory' && (
        <section className="product-detail-grid product-detail-grid--inventory">
          <form className="product-detail-panel product-detail-adjust" onSubmit={handleAdjustment}>
            <h2>Điều chỉnh tồn kho</h2>
            <div className="product-detail-segment">
              <button type="button" className={adjustType === 'IN' ? 'is-active' : ''} onClick={() => setAdjustType('IN')}>Nhập vào</button>
              <button type="button" className={adjustType === 'OUT' ? 'is-active' : ''} onClick={() => setAdjustType('OUT')}>Xuất ra</button>
            </div>
            <label>Số lượng
              <input min="0.000001" step="0.000001" type="number" value={quantity} onChange={(event) => setQuantity(event.target.value)} required />
            </label>
            <label>Ghi chú
              <textarea rows={4} value={note} onChange={(event) => setNote(event.target.value)} placeholder="Ví dụ: hao hụt sau kiểm kê, nhập bổ sung sau phân loại..." />
            </label>
            <button disabled={saving} type="submit">{saving ? 'Đang lưu...' : 'Cập nhật tồn kho'}</button>
          </form>

          <article className="product-detail-panel">
            <h2>Lịch sử tồn kho</h2>
            {!transactions.length ? (
              <div className="product-detail-empty">Chưa có giao dịch tồn kho.</div>
            ) : (
              <div className="product-detail-transactions">
                {transactions.map((item) => (
                  <div key={item._id}>
                    <span className={`product-detail-transaction-type ${item.type.includes('OUT') || item.type === 'RECALL_OUT' ? 'is-out' : 'is-in'}`}>
                      {transactionLabel[item.type] || item.type}
                    </span>
                    <strong>{formatNumber(item.quantity)} {item.unit}</strong>
                    <small>{formatNumber(item.balance_before)} → {formatNumber(item.balance_after)} {item.unit}</small>
                    <p>{item.note || 'Không có ghi chú'}</p>
                    <time>{formatDateTime(item.occurred_at || item.createdAt)}</time>
                  </div>
                ))}
              </div>
            )}
          </article>
        </section>
      )}

      {activeTab === 'timeline' && (
        <section className="product-detail-panel">
          <div className="product-detail-panel-head">
            <h2>Nhật ký truy xuất</h2>
            <Link to={`/add-event?product=${product._id}`}>Thêm sự kiện</Link>
          </div>
          {!events.length ? (
            <div className="product-detail-empty">Chưa có sự kiện truy xuất cho lô này.</div>
          ) : (
            <div className="product-detail-timeline">
              {events.map((event) => (
                <article key={event._id}>
                  <span>{eventLabel[event.eventType] || event.eventType}</span>
                  <div>
                    <h3>{event.description}</h3>
                    <p>{event.onChainStatus === 'confirmed' ? 'Đã ghi blockchain' : `Blockchain: ${event.onChainStatus}`}</p>
                    <time>{formatDateTime(event.createdAt)}</time>
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>
      )}
    </div>
  );
};

export default ProductDetailPage;
