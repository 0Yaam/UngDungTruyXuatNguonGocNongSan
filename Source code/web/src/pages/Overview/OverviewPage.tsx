import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { certificationApi } from '../../core/api/certification.api';
import { productApi } from '../../core/api/product.api';
import { qualityInspectionApi } from '../../core/api/qualityInspection.api';
import { supplyChainApi } from '../../core/api/supplyChain.api';
import type { Product, QualityInspection, SupplyChainRecord } from '../../core/types';
import type { Certification } from '../../core/api/certification.api';
import './OverviewPage.css';

type OverviewData = {
  products: Product[];
  certifications: Certification[];
  inspections: QualityInspection[];
  records: SupplyChainRecord[];
};

const statusLabel: Record<Product['status'], string> = {
  draft: 'Bản nháp',
  active: 'Đang theo dõi',
  completed: 'Hoàn thành',
  recalled: 'Thu hồi',
};

const formatDate = (value?: string) => {
  if (!value) return 'Chưa cập nhật';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleDateString('vi-VN');
};

const daysUntil = (value?: string) => {
  if (!value) return Number.POSITIVE_INFINITY;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const target = new Date(value);
  target.setHours(0, 0, 0, 0);
  return Math.ceil((target.getTime() - today.getTime()) / 86400000);
};

const productName = (recordProduct: SupplyChainRecord['product']) =>
  typeof recordProduct === 'string' ? 'Lô liên quan' : recordProduct.name;

const productChartColors = ['#138a56', '#2563eb', '#f59e0b', '#0f766e', '#dc2626', '#7c3aed', '#64748b'];

const OverviewPage: React.FC = () => {
  const [data, setData] = useState<OverviewData>({
    products: [],
    certifications: [],
    inspections: [],
    records: [],
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [productChartFilter, setProductChartFilter] = useState('all');

  useEffect(() => {
    let mounted = true;

    const load = async () => {
      setLoading(true);
      setError('');
      const [productsRes, certsRes, inspectionsRes, recordsRes] = await Promise.allSettled([
        productApi.getAll(),
        certificationApi.getAll(),
        qualityInspectionApi.getAll(),
        supplyChainApi.getRecords(),
      ]);

      if (!mounted) return;
      if (productsRes.status === 'rejected') {
        setError(productsRes.reason?.message || 'Không tải được dữ liệu tổng quan.');
      }

      setData({
        products: productsRes.status === 'fulfilled' ? productsRes.value.data.products : [],
        certifications: certsRes.status === 'fulfilled' ? certsRes.value.data.certifications : [],
        inspections: inspectionsRes.status === 'fulfilled' ? inspectionsRes.value.data.inspections : [],
        records: recordsRes.status === 'fulfilled' ? recordsRes.value.data.records : [],
      });
      setLoading(false);
    };

    void load();
    return () => {
      mounted = false;
    };
  }, []);

  const metrics = useMemo(() => {
    const active = data.products.filter((item) => item.status === 'active').length;
    const completed = data.products.filter((item) => item.status === 'completed').length;
    const verified = data.products.filter((item) => item.onChainBatchId).length;
    const failedInspections = data.inspections.filter((item) => item.result === 'failed').length;
    return {
      totalProducts: data.products.length,
      active,
      completed,
      verified,
      verificationRate: data.products.length ? Math.round((verified / data.products.length) * 100) : 0,
      failedInspections,
    };
  }, [data]);

  const statusDistribution = useMemo(() => {
    return (Object.keys(statusLabel) as Product['status'][]).map((status) => ({
      status,
      label: statusLabel[status],
      count: data.products.filter((item) => item.status === status).length,
    }));
  }, [data.products]);

  const urgentItems = useMemo(() => {
    const lowInventory = data.products.filter((item) => {
      const initial = item.initial_quantity || 0;
      const current = item.current_quantity || 0;
      return initial > 0 && current / initial <= 0.2;
    });
    const expiringCerts = data.certifications.filter((item) => {
      const days = daysUntil(item.expiry_date);
      return item.status === 'valid' && days >= 0 && days <= 30;
    });
    const failedInspections = data.inspections.filter((item) => item.result === 'failed');
    const recalls = data.records.filter((item) => item.operation_type === 'RECALL' && item.status !== 'COMPLETED');

    return [
      ...lowInventory.slice(0, 2).map((item) => ({
        tone: 'warning',
        title: `${item.name} sắp hết tồn`,
        detail: `Còn ${item.current_quantity || 0} ${item.unit || 'kg'} trong kho`,
        to: `/products/${item._id}`,
      })),
      ...expiringCerts.slice(0, 2).map((item) => ({
        tone: 'warning',
        title: `${item.name} sắp hết hạn`,
        detail: `Hết hạn ngày ${formatDate(item.expiry_date)}`,
        to: '/certifications',
      })),
      ...failedInspections.slice(0, 2).map((item) => ({
        tone: 'danger',
        title: `Kiểm nghiệm ${item.report_number} không đạt`,
        detail: item.summary || 'Cần xem lại chỉ tiêu kiểm nghiệm',
        to: '/quality-inspections',
      })),
      ...recalls.slice(0, 2).map((item) => ({
        tone: 'danger',
        title: item.title || 'Lô đang thu hồi',
        detail: item.recall_reason || productName(item.product),
        to: '/supply-chain',
      })),
    ].slice(0, 5);
  }, [data]);

  const recentProducts = useMemo(() => {
    return [...data.products]
      .sort((a, b) => new Date(b.updatedAt || b.createdAt).getTime() - new Date(a.updatedAt || a.createdAt).getTime())
      .slice(0, 5);
  }, [data.products]);

  const recentRecords = useMemo(() => {
    return [...data.records]
      .sort((a, b) => new Date(b.occurred_at || b.createdAt).getTime() - new Date(a.occurred_at || a.createdAt).getTime())
      .slice(0, 4);
  }, [data.records]);

  const weeklyActivity = useMemo(() => {
    return Array.from({ length: 7 }, (_, index) => {
      const date = new Date();
      date.setHours(0, 0, 0, 0);
      date.setDate(date.getDate() - (6 - index));
      const count = data.products.filter((item) => {
        const updated = new Date(item.updatedAt || item.createdAt);
        return updated.getFullYear() === date.getFullYear()
          && updated.getMonth() === date.getMonth()
          && updated.getDate() === date.getDate();
      }).length;
      return {
        label: date.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' }),
        count,
      };
    });
  }, [data.products]);

  const maxActivity = Math.max(1, ...weeklyActivity.map((item) => item.count));

  const categoryOptions = useMemo(() => {
    return Array.from(new Set(data.products.map((item) => item.category).filter(Boolean))).sort((a, b) =>
      a.localeCompare(b, 'vi')
    );
  }, [data.products]);

  const productChartOptions = useMemo(() => [
    { value: 'all', label: 'Tất cả loại sản phẩm' },
    { value: 'type:Plant', label: 'Cây trồng' },
    { value: 'type:Animal', label: 'Vật nuôi' },
    ...categoryOptions.map((category) => ({ value: `category:${category}`, label: category })),
  ], [categoryOptions]);

  const productChartData = useMemo(() => {
    if (productChartFilter === 'all') {
      return [
        { label: 'Cây trồng', count: data.products.filter((item) => item.type === 'Plant').length },
        { label: 'Vật nuôi', count: data.products.filter((item) => item.type === 'Animal').length },
      ];
    }

    if (productChartFilter.startsWith('type:')) {
      const selectedType = productChartFilter.replace('type:', '') as Product['type'];
      const scoped = data.products.filter((item) => item.type === selectedType);
      const categories = Array.from(new Set(scoped.map((item) => item.category || 'Chưa phân loại')));
      return categories.map((category, index) => ({
        label: category,
        count: scoped.filter((item) => (item.category || 'Chưa phân loại') === category).length,
      }));
    }

    const selectedCategory = productChartFilter.replace('category:', '');
    const scoped = data.products.filter((item) => item.category === selectedCategory);
    return (Object.keys(statusLabel) as Product['status'][]).map((status) => ({
      label: statusLabel[status],
      count: scoped.filter((item) => item.status === status).length,
    }));
  }, [data.products, productChartFilter]);

  const productChartTotal = productChartData.reduce((sum, item) => sum + item.count, 0);
  const donutCircumference = 100;
  let donutOffset = 0;

  if (loading) {
    return (
      <div className="overview-state">
        <span className="overview-spinner" />
        <strong>Đang tải tổng quan...</strong>
      </div>
    );
  }

  return (
    <div className="overview-page">
      <header className="overview-hero">
        <div>
          <p className="overview-eyebrow">Bảng điều hành</p>
          <h1>Tổng quan truy xuất</h1>
          <p>Theo dõi nhanh sức khỏe dữ liệu, cảnh báo vận hành và các lô cần xử lý trong hệ thống.</p>
        </div>
        <div className="overview-hero__actions">
          <Link to="/products">Quản lý lô</Link>
          <Link to="/add-event">Ghi nhật ký</Link>
        </div>
      </header>

      {error && <div className="overview-alert">{error}</div>}

      <section className="overview-metrics" aria-label="Chỉ số chính">
        <article>
          <span>Tổng số lô</span>
          <strong>{metrics.totalProducts}</strong>
          <small>{metrics.active} lô đang theo dõi</small>
        </article>
        <article>
          <span>Đã hoàn thành</span>
          <strong>{metrics.completed}</strong>
          <small>Sẵn sàng phân phối hoặc lưu hồ sơ</small>
        </article>
        <article>
          <span>Xác thực blockchain</span>
          <strong>{metrics.verificationRate}%</strong>
          <small>{metrics.verified} lô đã có mã on-chain</small>
        </article>
        <article className={metrics.failedInspections ? 'has-risk' : ''}>
          <span>Kiểm nghiệm lỗi</span>
          <strong>{metrics.failedInspections}</strong>
          <small>{metrics.failedInspections ? 'Cần xử lý ngay' : 'Không có lỗi mở'}</small>
        </article>
      </section>

      <section className="overview-layout">
        <article className="overview-panel overview-panel--wide">
          <div className="overview-panel-head">
            <div>
              <span>Hoạt động 7 ngày</span>
              <h2>Cập nhật lô gần đây</h2>
            </div>
          </div>
          <div className="overview-bars" aria-label="Biểu đồ cập nhật trong 7 ngày">
            {weeklyActivity.map((item) => (
              <div key={item.label}>
                <strong>{item.count}</strong>
                <span
                  className={item.count === 0 ? 'is-empty' : ''}
                  style={{ height: `${item.count === 0 ? 12 : Math.max(18, (item.count / maxActivity) * 100)}%` }}
                />
                <small>{item.label}</small>
              </div>
            ))}
          </div>
        </article>

        <article className="overview-panel overview-product-chart">
          <div className="overview-panel-head">
            <div>
              <span>Cơ cấu sản phẩm</span>
              <h2>Loại & danh mục</h2>
            </div>
            <select
              aria-label="Chọn dữ liệu biểu đồ sản phẩm"
              value={productChartFilter}
              onChange={(event) => setProductChartFilter(event.target.value)}
            >
              {productChartOptions.map((option) => (
                <option key={option.value} value={option.value}>{option.label}</option>
              ))}
            </select>
          </div>
          <div className="overview-donut-wrap">
            <div className="overview-donut" role="img" aria-label="Biểu đồ tròn cơ cấu sản phẩm">
              <svg viewBox="0 0 42 42" aria-hidden="true">
                <circle className="overview-donut__track" cx="21" cy="21" r="15.9155" />
                {productChartTotal > 0 && productChartData.map((item, index) => {
                  const value = (item.count / productChartTotal) * donutCircumference;
                  const segment = (
                    <circle
                      className="overview-donut__segment"
                      cx="21"
                      cy="21"
                      key={item.label}
                      r="15.9155"
                      stroke={productChartColors[index % productChartColors.length]}
                      strokeDasharray={`${value} ${donutCircumference - value}`}
                      strokeDashoffset={-donutOffset}
                    />
                  );
                  donutOffset += value;
                  return segment;
                })}
              </svg>
              <div>
                <strong>{productChartTotal}</strong>
                <span>lô</span>
              </div>
            </div>
            <div className="overview-donut-legend">
              {productChartData.map((item, index) => {
                const percent = productChartTotal ? Math.round((item.count / productChartTotal) * 100) : 0;
                return (
                  <div key={item.label}>
                    <i style={{ background: productChartColors[index % productChartColors.length] }} />
                    <span>{item.label}</span>
                    <strong>{item.count} lô</strong>
                    <small>{percent}%</small>
                  </div>
                );
              })}
              {!productChartData.length && <div className="overview-empty">Chưa có dữ liệu sản phẩm.</div>}
            </div>
          </div>
        </article>
      </section>

      <section className="overview-panel">
        <div className="overview-panel-head">
          <div>
            <span>Tình trạng lô</span>
            <h2>Phân bố trạng thái</h2>
          </div>
        </div>
        <div className="overview-status-list overview-status-list--grid">
          {statusDistribution.map((item) => {
            const percent = data.products.length ? Math.round((item.count / data.products.length) * 100) : 0;
            return (
              <div key={item.status}>
                <div><strong>{item.label}</strong><span>{item.count}</span></div>
                <i><b style={{ width: `${percent}%` }} /></i>
              </div>
            );
          })}
        </div>
      </section>

      <section className="overview-layout overview-layout--bottom">
        <article className="overview-panel">
          <div className="overview-panel-head">
            <div>
              <span>Cần chú ý</span>
              <h2>Cảnh báo vận hành</h2>
            </div>
            <Link to="/quality-inspections">Xem kiểm nghiệm</Link>
          </div>
          {!urgentItems.length ? (
            <div className="overview-empty">Chưa có cảnh báo cần xử lý.</div>
          ) : (
            <div className="overview-alert-list">
              {urgentItems.map((item, index) => (
                <Link className={`is-${item.tone}`} to={item.to} key={`${item.title}-${index}`}>
                  <span>{item.tone === 'danger' ? '!' : 'i'}</span>
                  <div><strong>{item.title}</strong><small>{item.detail}</small></div>
                </Link>
              ))}
            </div>
          )}
        </article>

        <article className="overview-panel">
          <div className="overview-panel-head">
            <div>
              <span>Lô cập nhật</span>
              <h2>Mới thay đổi</h2>
            </div>
            <Link to="/products">Tất cả lô</Link>
          </div>
          <div className="overview-product-list">
            {recentProducts.map((item) => (
              <Link to={`/products/${item._id}`} key={item._id}>
                <div>
                  <strong>{item.name}</strong>
                  <small>{item.batch_code || item._id.slice(-8).toUpperCase()} · {formatDate(item.updatedAt || item.createdAt)}</small>
                </div>
                <span className={`is-${item.status}`}>{statusLabel[item.status]}</span>
              </Link>
            ))}
            {!recentProducts.length && <div className="overview-empty">Chưa có lô nông sản.</div>}
          </div>
        </article>

        <article className="overview-panel">
          <div className="overview-panel-head">
            <div>
              <span>Chuỗi cung ứng</span>
              <h2>Nghiệp vụ gần đây</h2>
            </div>
            <Link to="/supply-chain">Mở chuỗi</Link>
          </div>
          <div className="overview-record-list">
            {recentRecords.map((item) => (
              <Link to="/supply-chain" key={item._id}>
                <strong>{item.title}</strong>
                <small>{productName(item.product)} · {formatDate(item.occurred_at || item.createdAt)}</small>
              </Link>
            ))}
            {!recentRecords.length && <div className="overview-empty">Chưa có nghiệp vụ chuỗi cung ứng.</div>}
          </div>
        </article>
      </section>
    </div>
  );
};

export default OverviewPage;
