import React, { useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { productApi } from '../../core/api/product.api';
import { traceEventApi } from '../../core/api/traceEvent.api';
import type { EventType, Product, TraceEvent } from '../../core/types';
import './JournalPage.css';

const eventOptions: Array<{ value: EventType; label: string; icon: string; hint: string }> = [
  { value: 'SEEDING', label: 'Gieo hạt', icon: '01', hint: 'Giống, mật độ và thời điểm xuống giống' },
  { value: 'FERTILIZING', label: 'Bón phân', icon: '02', hint: 'Loại phân, liều lượng và cách sử dụng' },
  { value: 'WATERING', label: 'Tưới nước', icon: '03', hint: 'Phương pháp tưới và điều kiện nguồn nước' },
  { value: 'PEST_CONTROL', label: 'Phòng trừ sâu bệnh', icon: '04', hint: 'Biện pháp xử lý và thuốc bảo vệ thực vật' },
  { value: 'HARVESTING', label: 'Thu hoạch', icon: '05', hint: 'Sản lượng, thời điểm và điều kiện thu hoạch' },
  { value: 'PACKAGING', label: 'Đóng gói', icon: '06', hint: 'Quy cách đóng gói và bảo quản' },
  { value: 'SHIPPING', label: 'Vận chuyển', icon: '07', hint: 'Phương tiện, tuyến đường và điều kiện vận chuyển' },
];

const errorMessage = (error: unknown) => {
  if (typeof error === 'object' && error && 'message' in error && typeof error.message === 'string') return error.message;
  return 'Không thể hoàn thành thao tác. Vui lòng thử lại.';
};

const JournalPage: React.FC = () => {
  const [params] = useSearchParams();
  const [products, setProducts] = useState<Product[]>([]);
  const [productId, setProductId] = useState(params.get('product') || params.get('productId') || '');
  const [eventType, setEventType] = useState<EventType>('SEEDING');
  const [description, setDescription] = useState('');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [created, setCreated] = useState<TraceEvent | null>(null);

  useEffect(() => {
    let active = true;
    productApi.getAll()
      .then(({ data }) => {
        if (!active) return;
        const editable = data.products.filter((item) => item.status !== 'completed' && item.status !== 'recalled');
        setProducts(editable);
        setProductId((current) => editable.some((item) => item._id === current) ? current : editable[0]?._id || '');
      })
      .catch((reason) => active && setError(errorMessage(reason)))
      .finally(() => active && setLoading(false));
    return () => { active = false; };
  }, []);

  const selectedProduct = useMemo(() => products.find((item) => item._id === productId), [products, productId]);
  const selectedEvent = eventOptions.find((item) => item.value === eventType)!;

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError('');
    setCreated(null);
    if (!productId || !description.trim()) {
      setError('Vui lòng chọn lô và nhập mô tả hoạt động.');
      return;
    }
    try {
      setSubmitting(true);
      const { data } = await traceEventApi.create({ product: productId, eventType, description: description.trim() });
      setCreated(data.traceEvent);
      setDescription('');
    } catch (reason) {
      setError(errorMessage(reason));
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return <div className="journal-state"><i />Đang tải danh sách lô...</div>;

  return (
    <div className="journal-page">
      <header className="journal-heading">
        <div><span>NHẬT KÝ SẢN XUẤT</span><h1>Ghi hoạt động canh tác</h1><p>Cập nhật từng công đoạn để hoàn thiện hồ sơ truy xuất minh bạch.</p></div>
        {selectedProduct && <Link to={`/trace/${selectedProduct._id}`}>Xem hồ sơ truy xuất <b>↗</b></Link>}
      </header>

      <div className="journal-layout">
        <form className="journal-form" onSubmit={submit}>
          <div className="journal-section-head"><span>01</span><div><h2>Chọn lô nông sản</h2><p>Chỉ hiển thị các lô đang có thể cập nhật.</p></div></div>
          {!products.length ? <div className="journal-empty">Không có lô đang theo dõi. <Link to="/products">Tạo hoặc cập nhật lô</Link></div> : <label className="journal-field">Lô nông sản<select value={productId} onChange={(event) => setProductId(event.target.value)} required>{products.map((item) => <option key={item._id} value={item._id}>{item.name} · {item.batch_code || item._id.slice(-8).toUpperCase()}</option>)}</select></label>}

          <div className="journal-section-head"><span>02</span><div><h2>Loại hoạt động</h2><p>Chọn công đoạn vừa được thực hiện.</p></div></div>
          <div className="journal-event-grid" role="radiogroup" aria-label="Loại hoạt động">{eventOptions.map((item) => <button aria-checked={eventType === item.value} className={eventType === item.value ? 'is-active' : ''} key={item.value} onClick={() => setEventType(item.value)} role="radio" type="button"><b>{item.icon}</b><span><strong>{item.label}</strong><small>{item.hint}</small></span></button>)}</div>

          <div className="journal-section-head"><span>03</span><div><h2>Mô tả chi tiết</h2><p>Thông tin này sẽ xuất hiện trong dòng thời gian truy xuất.</p></div></div>
          <label className="journal-field">Nội dung hoạt động<textarea rows={5} value={description} onChange={(event) => setDescription(event.target.value)} placeholder={`Mô tả ${selectedEvent.label.toLowerCase()}: thời gian, vật tư, số lượng, người thực hiện...`} required /></label>

          {error && <div className="journal-message is-error" role="alert">{error}</div>}
          {created && <div className="journal-message is-success" role="status"><strong>Đã ghi nhật ký thành công</strong><span>Blockchain: {created.onChainStatus === 'confirmed' ? 'Đã xác thực' : created.onChainStatus === 'failed' ? 'Chưa đồng bộ' : 'Đang xử lý'}</span></div>}
          <footer><button type="submit" disabled={submitting || !products.length}>{submitting ? 'Đang ghi nhận...' : 'Ghi vào nhật ký'}</button></footer>
        </form>

        <aside className="journal-summary">
          <span>TÓM TẮT BẢN GHI</span><h2>{selectedEvent.label}</h2>
          {selectedProduct ? <><div className="journal-product"><i>{selectedProduct.type === 'Plant' ? 'P' : 'A'}</i><div><strong>{selectedProduct.name}</strong><small>{selectedProduct.batch_code || selectedProduct._id.slice(-8).toUpperCase()}</small></div></div><dl><div><dt>Xuất xứ</dt><dd>{selectedProduct.origin || 'Chưa cập nhật'}</dd></div><div><dt>Trạng thái</dt><dd>{selectedProduct.status === 'active' ? 'Đang theo dõi' : 'Bản nháp'}</dd></div><div><dt>Số lượng hiện tại</dt><dd>{selectedProduct.current_quantity ?? 0} {selectedProduct.unit || 'kg'}</dd></div></dl></> : <p>Chưa có lô được chọn.</p>}
          <div className="journal-chain-note"><b>✓</b><p><strong>Sẵn sàng xác thực</strong><span>Sự kiện được gửi tới hệ thống blockchain ngay sau khi lưu.</span></p></div>
        </aside>
      </div>
    </div>
  );
};

export default JournalPage;
