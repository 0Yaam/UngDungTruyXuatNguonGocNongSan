import React, { FormEvent, useEffect, useMemo, useState } from 'react';
import { productApi } from '../../core/api/product.api';
import {
  qualityInspectionApi,
  QualityInspectionInput,
} from '../../core/api/qualityInspection.api';
import { useAuth } from '../../core/hooks/useAuth';
import type { InspectionMetric, Product, QualityInspection } from '../../core/types';
import './QualityInspectionPage.css';

const typeLabels: Record<QualityInspection['inspection_type'], string> = {
  PESTICIDE_RESIDUE: 'Dư lượng thuốc BVTV',
  MICROBIOLOGY: 'Vi sinh vật',
  HEAVY_METAL: 'Kim loại nặng',
  NUTRITION: 'Thành phần dinh dưỡng',
  GENERAL: 'Kiểm nghiệm tổng hợp',
};

const resultLabels = {
  passed: 'Đạt yêu cầu',
  failed: 'Không đạt',
  pending: 'Chờ kết quả',
};

const emptyForm = (): QualityInspectionInput => ({
  product: '',
  report_number: '',
  inspection_type: 'GENERAL',
  laboratory: '',
  sample_date: new Date().toISOString().slice(0, 10),
  result_date: '',
  result: 'pending',
  summary: '',
  document_url: '',
  metrics: [],
});

const QualityInspectionPage: React.FC = () => {
  const { user } = useAuth();
  const [inspections, setInspections] = useState<QualityInspection[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [filter, setFilter] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<QualityInspectionInput>(emptyForm());
  const canManage = user?.role === 'admin' || user?.role === 'manager';

  const load = async () => {
    try {
      setLoading(true);
      const [inspectionRes, productRes] = await Promise.all([
        qualityInspectionApi.getAll(),
        productApi.getAll(),
      ]);
      setInspections(inspectionRes.data.inspections);
      setProducts(productRes.data.products);
      setForm((current) => ({
        ...current,
        product: current.product || productRes.data.products[0]?._id || '',
      }));
    } catch (err: any) {
      setError(err.message || 'Không thể tải dữ liệu kiểm nghiệm');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const visible = useMemo(
    () => inspections.filter((item) => !filter || item.result === filter),
    [inspections, filter]
  );
  const totals = useMemo(
    () => ({
      passed: inspections.filter((item) => item.result === 'passed').length,
      failed: inspections.filter((item) => item.result === 'failed').length,
      pending: inspections.filter((item) => item.result === 'pending').length,
    }),
    [inspections]
  );

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    try {
      setSaving(true);
      setError('');
      await qualityInspectionApi.create({
        ...form,
        result_date: form.result_date || undefined,
        summary: form.summary || undefined,
        document_url: form.document_url || undefined,
      });
      setShowForm(false);
      setForm({ ...emptyForm(), product: products[0]?._id || '' });
      await load();
    } catch (err: any) {
      setError(err.message || 'Không thể tạo phiếu kiểm nghiệm');
    } finally {
      setSaving(false);
    }
  };

  const remove = async (id: string) => {
    if (!window.confirm('Bạn có chắc muốn xóa phiếu kiểm nghiệm này?')) return;
    try {
      await qualityInspectionApi.delete(id);
      setInspections((items) => items.filter((item) => item._id !== id));
    } catch (err: any) {
      setError(err.message || 'Không thể xóa phiếu kiểm nghiệm');
    }
  };

  const updateMetric = (index: number, patch: Partial<InspectionMetric>) => {
    const metrics = [...(form.metrics || [])];
    metrics[index] = { ...metrics[index], ...patch };
    setForm({ ...form, metrics });
  };

  return (
    <div className="quality-page">
      <header className="quality-heading">
        <div>
          <span>QUẢN LÝ AN TOÀN THỰC PHẨM</span>
          <h1>Kiểm nghiệm chất lượng</h1>
          <p>Lưu trữ bằng chứng kiểm nghiệm và công khai kết quả trong hồ sơ truy xuất.</p>
        </div>
        {canManage && <button onClick={() => setShowForm(true)}>＋ Tạo phiếu kiểm nghiệm</button>}
      </header>

      {error && <div className="quality-alert">{error}<button onClick={() => setError('')}>×</button></div>}

      <section className="quality-stats">
        <article><span className="stat-icon is-total">⌕</span><div><small>TỔNG PHIẾU</small><strong>{inspections.length}</strong><p>Hồ sơ kiểm nghiệm</p></div></article>
        <article><span className="stat-icon is-pass">✓</span><div><small>ĐẠT YÊU CẦU</small><strong>{totals.passed}</strong><p>Đủ điều kiện chất lượng</p></div></article>
        <article><span className="stat-icon is-pending">◷</span><div><small>CHỜ KẾT QUẢ</small><strong>{totals.pending}</strong><p>Đang xử lý tại phòng lab</p></div></article>
        <article><span className="stat-icon is-fail">!</span><div><small>KHÔNG ĐẠT</small><strong>{totals.failed}</strong><p>Cần xem xét và xử lý</p></div></article>
      </section>

      <section className="quality-list-panel">
        <div className="quality-toolbar">
          <div><span>DANH SÁCH PHIẾU</span><h2>Kết quả kiểm nghiệm</h2></div>
          <select value={filter} onChange={(event) => setFilter(event.target.value)}>
            <option value="">Tất cả kết quả</option>
            <option value="passed">Đạt yêu cầu</option>
            <option value="pending">Chờ kết quả</option>
            <option value="failed">Không đạt</option>
          </select>
        </div>

        {loading ? <div className="quality-empty">Đang tải dữ liệu...</div> :
          visible.length === 0 ? (
            <div className="quality-empty"><strong>Chưa có phiếu kiểm nghiệm</strong><p>Tạo phiếu đầu tiên để bổ sung bằng chứng chất lượng cho lô.</p></div>
          ) : (
            <div className="quality-grid">
              {visible.map((item) => {
                const product = item.product as Product;
                return (
                  <article className="quality-card" key={item._id}>
                    <div className="quality-card-top"><span className={`quality-result result-${item.result}`}>{resultLabels[item.result]}</span><small>{new Date(item.sample_date).toLocaleDateString('vi-VN')}</small></div>
                    <span className="quality-type">{typeLabels[item.inspection_type]}</span>
                    <h3>{product?.name || 'Lô nông sản'}</h3>
                    <p>{item.summary || 'Chưa có mô tả kết quả kiểm nghiệm.'}</p>
                    <dl><div><dt>Số phiếu</dt><dd>{item.report_number}</dd></div><div><dt>Phòng kiểm nghiệm</dt><dd>{item.laboratory}</dd></div><div><dt>Chỉ tiêu</dt><dd>{item.metrics?.length || 0}</dd></div></dl>
                    <footer>{item.document_url ? <a href={item.document_url} target="_blank" rel="noreferrer">Xem tài liệu ↗</a> : <span>Không có tệp đính kèm</span>}{user?.role === 'admin' && <button onClick={() => remove(item._id)}>Xóa</button>}</footer>
                  </article>
                );
              })}
            </div>
          )}
      </section>

      {showForm && (
        <div className="quality-modal-backdrop" onMouseDown={(event) => event.target === event.currentTarget && setShowForm(false)}>
          <form className="quality-modal" onSubmit={submit}>
            <div className="quality-modal-head"><div><span>PHIẾU MỚI</span><h2>Thêm kết quả kiểm nghiệm</h2></div><button type="button" onClick={() => setShowForm(false)}>×</button></div>
            <div className="quality-form-grid">
              <label className="is-wide">Lô nông sản<select required value={form.product} onChange={(e) => setForm({ ...form, product: e.target.value })}><option value="">Chọn lô</option>{products.map((product) => <option key={product._id} value={product._id}>{product.name} — {product.origin}</option>)}</select></label>
              <label>Số phiếu<input required value={form.report_number} onChange={(e) => setForm({ ...form, report_number: e.target.value })} placeholder="VD: KN-2026-001" /></label>
              <label>Loại kiểm nghiệm<select value={form.inspection_type} onChange={(e) => setForm({ ...form, inspection_type: e.target.value as QualityInspection['inspection_type'] })}>{Object.entries(typeLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
              <label className="is-wide">Đơn vị kiểm nghiệm<input required value={form.laboratory} onChange={(e) => setForm({ ...form, laboratory: e.target.value })} placeholder="Tên trung tâm hoặc phòng thí nghiệm" /></label>
              <label>Ngày lấy mẫu<input required type="date" value={form.sample_date} onChange={(e) => setForm({ ...form, sample_date: e.target.value })} /></label>
              <label>Ngày trả kết quả<input type="date" value={form.result_date} onChange={(e) => setForm({ ...form, result_date: e.target.value })} /></label>
              <label>Kết luận<select value={form.result} onChange={(e) => setForm({ ...form, result: e.target.value as QualityInspection['result'] })}><option value="pending">Chờ kết quả</option><option value="passed">Đạt yêu cầu</option><option value="failed">Không đạt</option></select></label>
              <label>Liên kết tài liệu<input value={form.document_url} onChange={(e) => setForm({ ...form, document_url: e.target.value })} placeholder="https://..." /></label>
              <label className="is-wide">Tóm tắt kết quả<textarea rows={4} value={form.summary} onChange={(e) => setForm({ ...form, summary: e.target.value })} placeholder="Mô tả kết quả và nhận xét của đơn vị kiểm nghiệm" /></label>
              <div className="quality-metrics is-wide">
                <div className="quality-metrics-head"><span>CHỈ TIÊU ĐO</span><button type="button" onClick={() => setForm({ ...form, metrics: [...(form.metrics || []), { name: '', value: '', unit: '', limit: '', passed: true }] })}>＋ Thêm chỉ tiêu</button></div>
                {(form.metrics || []).length === 0 ? <p>Chưa có chỉ tiêu chi tiết. Bạn có thể bổ sung sau.</p> : (form.metrics || []).map((metric, index) => (
                  <div className="quality-metric-row" key={index}>
                    <input required value={metric.name} onChange={(e) => updateMetric(index, { name: e.target.value })} placeholder="Tên chỉ tiêu" />
                    <input required value={metric.value} onChange={(e) => updateMetric(index, { value: e.target.value })} placeholder="Kết quả" />
                    <input value={metric.unit || ''} onChange={(e) => updateMetric(index, { unit: e.target.value })} placeholder="Đơn vị" />
                    <input value={metric.limit || ''} onChange={(e) => updateMetric(index, { limit: e.target.value })} placeholder="Ngưỡng" />
                    <select value={metric.passed === false ? 'false' : 'true'} onChange={(e) => updateMetric(index, { passed: e.target.value === 'true' })}><option value="true">Đạt</option><option value="false">Không đạt</option></select>
                    <button type="button" onClick={() => setForm({ ...form, metrics: (form.metrics || []).filter((_, metricIndex) => metricIndex !== index) })}>×</button>
                  </div>
                ))}
              </div>
            </div>
            <div className="quality-modal-actions"><button type="button" onClick={() => setShowForm(false)}>Hủy bỏ</button><button className="is-primary" type="submit" disabled={saving}>{saving ? 'Đang lưu...' : 'Lưu phiếu kiểm nghiệm'}</button></div>
          </form>
        </div>
      )}
    </div>
  );
};

export default QualityInspectionPage;
