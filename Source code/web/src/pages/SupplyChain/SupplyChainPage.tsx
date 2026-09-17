import React, { FormEvent, useEffect, useMemo, useState } from 'react';
import { productApi } from '../../core/api/product.api';
import { supplyChainApi } from '../../core/api/supplyChain.api';
import { useAuth } from '../../core/hooks/useAuth';
import type { Product, SupplyChainOrganization, SupplyChainRecord } from '../../core/types';
import './SupplyChainPage.css';

const operationLabels: Record<SupplyChainRecord['operation_type'], string> = {
  TRANSFER: 'Bàn giao lô', SPLIT: 'Tách lô', MERGE: 'Gộp lô', PROCESSING: 'Chế biến',
  WAREHOUSE_IN: 'Nhập kho', WAREHOUSE_OUT: 'Xuất kho', TRANSPORT: 'Vận chuyển', RECALL: 'Thu hồi',
};
const operationIcons: Record<SupplyChainRecord['operation_type'], string> = {
  TRANSFER: '⇄', SPLIT: '⑂', MERGE: '⑃', PROCESSING: '⚙', WAREHOUSE_IN: '↘', WAREHOUSE_OUT: '↗', TRANSPORT: '▰', RECALL: '!',
};
const orgLabels: Record<SupplyChainOrganization['type'], string> = {
  SUPPLIER: 'Nhà cung cấp', COOPERATIVE: 'Hợp tác xã', PROCESSOR: 'Cơ sở chế biến', WAREHOUSE: 'Kho',
  CARRIER: 'Đơn vị vận chuyển', DISTRIBUTOR: 'Nhà phân phối', RETAILER: 'Cửa hàng bán lẻ',
};

const emptyRecord = () => ({ product: '', related_products: [] as string[], operation_type: 'TRANSFER' as SupplyChainRecord['operation_type'], title: '', description: '', from_organization: '', to_organization: '', status: 'PLANNED', quantity: '', unit: 'kg', occurred_at: new Date().toISOString().slice(0, 16), location: '', temperature: '', humidity: '', vehicle: '', driver: '', recall_reason: '' });
const emptyOrg = () => ({ name: '', type: 'COOPERATIVE' as SupplyChainOrganization['type'], tax_code: '', address: '', contact_name: '', phone: '', email: '' });

const SupplyChainPage: React.FC = () => {
  const { user } = useAuth();
  const [tab, setTab] = useState<'records' | 'organizations'>('records');
  const [records, setRecords] = useState<SupplyChainRecord[]>([]);
  const [organizations, setOrganizations] = useState<SupplyChainOrganization[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [operationFilter, setOperationFilter] = useState('');
  const [modal, setModal] = useState<'record' | 'organization' | 'split' | 'merge' | 'recall' | null>(null);
  const [recordForm, setRecordForm] = useState(emptyRecord());
  const [orgForm, setOrgForm] = useState(emptyOrg());
  const [splitForm, setSplitForm] = useState({ source: '', quantity: '', childName: '', childQuantity: '', note: '' });
  const [mergeForm, setMergeForm] = useState({ sourceA: '', sourceB: '', targetName: '', targetQuantity: '', note: '' });
  const [recallForm, setRecallForm] = useState({ product: '', quantity: '', reason: '', note: '', location: '', status: 'IN_PROGRESS' as 'IN_PROGRESS' | 'COMPLETED' });
  const [saving, setSaving] = useState(false);
  const canManageOrganizations = user?.role === 'admin' || user?.role === 'manager';

  const load = async () => {
    try {
      setLoading(true); setError('');
      const [recordRes, orgRes, productRes] = await Promise.all([supplyChainApi.getRecords(), supplyChainApi.getOrganizations(), productApi.getAll()]);
      setRecords(recordRes.data.records); setOrganizations(orgRes.data.organizations); setProducts(productRes.data.products);
      setRecordForm((current) => ({ ...current, product: current.product || productRes.data.products[0]?._id || '' }));
      setSplitForm((current) => ({ ...current, source: current.source || productRes.data.products[0]?._id || '' }));
      setMergeForm((current) => ({ ...current, sourceA: current.sourceA || productRes.data.products[0]?._id || '', sourceB: current.sourceB || productRes.data.products.find((product) => product._id !== productRes.data.products[0]?._id)?._id || '' }));
      setRecallForm((current) => ({ ...current, product: current.product || productRes.data.products[0]?._id || '' }));
    } catch (err: any) { setError(err.message || 'Không thể tải dữ liệu chuỗi cung ứng'); }
    finally { setLoading(false); }
  };
  useEffect(() => { load(); }, []);

  const visibleRecords = useMemo(() => records.filter((record) => !operationFilter || record.operation_type === operationFilter), [records, operationFilter]);
  const recalls = records.filter((record) => record.operation_type === 'RECALL' && record.status !== 'COMPLETED').length;
  const inTransit = records.filter((record) => record.operation_type === 'TRANSPORT' && record.status === 'IN_PROGRESS').length;

  const submitOrganization = async (event: FormEvent) => {
    event.preventDefault();
    try { setSaving(true); await supplyChainApi.createOrganization({ ...orgForm, active: true }); setModal(null); setOrgForm(emptyOrg()); await load(); }
    catch (err: any) { setError(err.message || 'Không thể tạo tổ chức'); }
    finally { setSaving(false); }
  };
  const submitRecord = async (event: FormEvent) => {
    event.preventDefault();
    try {
      setSaving(true);
      const data: Record<string, unknown> = { ...recordForm, related_products: recordForm.related_products, quantity: recordForm.quantity ? Number(recordForm.quantity) : undefined, temperature: recordForm.temperature ? Number(recordForm.temperature) : undefined, humidity: recordForm.humidity ? Number(recordForm.humidity) : undefined, from_organization: recordForm.from_organization || undefined, to_organization: recordForm.to_organization || undefined };
      if (recordForm.operation_type === 'RECALL') {
        await productApi.recall(recordForm.product, { quantity: recordForm.quantity ? Number(recordForm.quantity) : undefined, reason: recordForm.recall_reason, note: recordForm.description || recordForm.title, occurred_at: recordForm.occurred_at, location: recordForm.location, status: recordForm.status === 'COMPLETED' ? 'COMPLETED' : 'IN_PROGRESS' });
      } else {
        await supplyChainApi.createRecord(data);
      }
      setModal(null); setRecordForm({ ...emptyRecord(), product: products[0]?._id || '' }); await load();
    } catch (err: any) { setError(err.message || 'Không thể tạo hồ sơ'); }
    finally { setSaving(false); }
  };
  const submitSplit = async (event: FormEvent) => {
    event.preventDefault();
    try {
      setSaving(true);
      const quantity = Number(splitForm.quantity);
      await productApi.split(splitForm.source, { quantity, note: splitForm.note, children: [{ name: splitForm.childName || undefined, quantity: splitForm.childQuantity ? Number(splitForm.childQuantity) : quantity }] });
      setModal(null); setSplitForm({ source: products[0]?._id || '', quantity: '', childName: '', childQuantity: '', note: '' }); await load();
    } catch (err: any) { setError(err.message || 'Không thể tách lô'); }
    finally { setSaving(false); }
  };
  const submitMerge = async (event: FormEvent) => {
    event.preventDefault();
    try {
      setSaving(true);
      await productApi.merge({ sources: [{ product: mergeForm.sourceA }, { product: mergeForm.sourceB }], target: { name: mergeForm.targetName || undefined }, target_quantity: mergeForm.targetQuantity ? Number(mergeForm.targetQuantity) : undefined, note: mergeForm.note });
      setModal(null); setMergeForm({ sourceA: products[0]?._id || '', sourceB: products.find((product) => product._id !== products[0]?._id)?._id || '', targetName: '', targetQuantity: '', note: '' }); await load();
    } catch (err: any) { setError(err.message || 'Không thể gộp lô'); }
    finally { setSaving(false); }
  };
  const submitRecall = async (event: FormEvent) => {
    event.preventDefault();
    try {
      setSaving(true);
      await productApi.recall(recallForm.product, { quantity: recallForm.quantity ? Number(recallForm.quantity) : undefined, reason: recallForm.reason, note: recallForm.note, location: recallForm.location, status: recallForm.status });
      setModal(null); setRecallForm({ product: products[0]?._id || '', quantity: '', reason: '', note: '', location: '', status: 'IN_PROGRESS' }); await load();
    } catch (err: any) { setError(err.message || 'Không thể thu hồi lô'); }
    finally { setSaving(false); }
  };

  return <div className="supply-page">
    <header className="supply-heading"><div><span>ĐIỀU PHỐI TOÀN CHUỖI</span><h1>Chuỗi cung ứng</h1><p>Theo dõi hành trình lô từ nhà cung cấp đến điểm bán và quản lý sự cố thu hồi.</p></div><div className="supply-heading-actions">{tab === 'records' && <><button onClick={() => setModal('split')}>Tách lô</button><button onClick={() => setModal('merge')}>Gộp lô</button><button onClick={() => setModal('recall')}>Thu hồi</button></>}<button onClick={() => setModal(tab === 'records' ? 'record' : 'organization')} disabled={tab === 'organizations' && !canManageOrganizations}>＋ {tab === 'records' ? 'Tạo nghiệp vụ' : 'Thêm tổ chức'}</button></div></header>
    {error && <div className="supply-alert">{error}<button onClick={() => setError('')}>×</button></div>}
    <section className="supply-stats"><article><span>◎</span><div><small>TỔ CHỨC</small><strong>{organizations.length}</strong><p>Đơn vị trong chuỗi</p></div></article><article><span>↝</span><div><small>HỒ SƠ VẬN HÀNH</small><strong>{records.length}</strong><p>Hoạt động đã ghi nhận</p></div></article><article><span>▰</span><div><small>ĐANG VẬN CHUYỂN</small><strong>{inTransit}</strong><p>Chuyến đang thực hiện</p></div></article><article className={recalls ? 'has-warning' : ''}><span>!</span><div><small>ĐANG THU HỒI</small><strong>{recalls}</strong><p>Sự cố chưa hoàn tất</p></div></article></section>
    <section className="supply-panel">
      <div className="supply-tabs"><button className={tab === 'records' ? 'is-active' : ''} onClick={() => setTab('records')}>Hành trình vận hành</button><button className={tab === 'organizations' ? 'is-active' : ''} onClick={() => setTab('organizations')}>Tổ chức tham gia</button>{tab === 'records' && <select value={operationFilter} onChange={(e) => setOperationFilter(e.target.value)}><option value="">Tất cả nghiệp vụ</option>{Object.entries(operationLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select>}</div>
      {loading ? <div className="supply-empty">Đang tải dữ liệu...</div> : tab === 'records' ? <div className="supply-timeline">{visibleRecords.length === 0 ? <div className="supply-empty">Chưa có hồ sơ vận hành.</div> : visibleRecords.map((record) => { const product = record.product as Product; return <article className={`supply-record operation-${record.operation_type.toLowerCase()}`} key={record._id}><span className="supply-operation-icon">{operationIcons[record.operation_type]}</span><div className="supply-record-main"><div className="supply-record-head"><span>{operationLabels[record.operation_type]}</span><small>{new Date(record.occurred_at).toLocaleString('vi-VN')}</small></div><h3>{record.title}</h3><p>{record.description || `${product?.name || 'Lô nông sản'} · ${record.location || 'Chưa nhập địa điểm'}`}</p><div className="supply-record-meta"><span>Lô: <b>{product?.name || '—'}</b></span>{record.quantity != null && <span>Số lượng: <b>{record.quantity} {record.unit}</b></span>}{record.from_organization && <span>Từ: <b>{record.from_organization.name}</b></span>}{record.to_organization && <span>Đến: <b>{record.to_organization.name}</b></span>}</div></div><span className={`supply-status status-${record.status.toLowerCase()}`}>{record.status === 'COMPLETED' ? 'Hoàn tất' : record.status === 'IN_PROGRESS' ? 'Đang thực hiện' : record.status === 'CANCELLED' ? 'Đã hủy' : 'Kế hoạch'}</span></article>; })}</div> : <div className="supply-org-grid">{organizations.length === 0 ? <div className="supply-empty">Chưa có tổ chức tham gia.</div> : organizations.map((org) => <article key={org._id}><span className="supply-org-icon">{org.type === 'CARRIER' ? '▰' : org.type === 'WAREHOUSE' ? '▣' : '◎'}</span><small>{orgLabels[org.type]}</small><h3>{org.name}</h3><p>{org.address}</p><dl><div><dt>Liên hệ</dt><dd>{org.contact_name || '—'}</dd></div><div><dt>Điện thoại</dt><dd>{org.phone || '—'}</dd></div></dl></article>)}</div>}
    </section>

    {modal === 'organization' && <div className="supply-modal-backdrop"><form className="supply-modal" onSubmit={submitOrganization}><div className="supply-modal-head"><div><span>ĐỐI TÁC MỚI</span><h2>Thêm tổ chức</h2></div><button type="button" onClick={() => setModal(null)}>×</button></div><div className="supply-form-grid"><label>Tên tổ chức<input required value={orgForm.name} onChange={(e) => setOrgForm({ ...orgForm, name: e.target.value })} /></label><label>Loại tổ chức<select value={orgForm.type} onChange={(e) => setOrgForm({ ...orgForm, type: e.target.value as SupplyChainOrganization['type'] })}>{Object.entries(orgLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label><label className="wide">Địa chỉ<input required value={orgForm.address} onChange={(e) => setOrgForm({ ...orgForm, address: e.target.value })} /></label><label>Mã số thuế<input value={orgForm.tax_code} onChange={(e) => setOrgForm({ ...orgForm, tax_code: e.target.value })} /></label><label>Người liên hệ<input value={orgForm.contact_name} onChange={(e) => setOrgForm({ ...orgForm, contact_name: e.target.value })} /></label><label>Điện thoại<input value={orgForm.phone} onChange={(e) => setOrgForm({ ...orgForm, phone: e.target.value })} /></label><label>Email<input type="email" value={orgForm.email} onChange={(e) => setOrgForm({ ...orgForm, email: e.target.value })} /></label></div><div className="supply-modal-actions"><button type="button" onClick={() => setModal(null)}>Hủy</button><button className="primary" disabled={saving}>{saving ? 'Đang lưu...' : 'Lưu tổ chức'}</button></div></form></div>}
    {modal === 'record' && <div className="supply-modal-backdrop"><form className="supply-modal is-wide" onSubmit={submitRecord}><div className="supply-modal-head"><div><span>HỒ SƠ VẬN HÀNH</span><h2>Tạo nghiệp vụ chuỗi cung ứng</h2></div><button type="button" onClick={() => setModal(null)}>×</button></div><div className="supply-form-grid"><label>Lô chính<select required value={recordForm.product} onChange={(e) => setRecordForm({ ...recordForm, product: e.target.value })}><option value="">Chọn lô</option>{products.map((p) => <option key={p._id} value={p._id}>{p.name}</option>)}</select></label><label>Loại nghiệp vụ<select value={recordForm.operation_type} onChange={(e) => setRecordForm({ ...recordForm, operation_type: e.target.value as SupplyChainRecord['operation_type'] })}>{Object.entries(operationLabels).filter(([value]) => !['SPLIT','MERGE','RECALL'].includes(value)).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label><label className="wide">Tiêu đề<input required value={recordForm.title} onChange={(e) => setRecordForm({ ...recordForm, title: e.target.value })} placeholder="Mô tả ngắn hoạt động" /></label><label>Trạng thái<select value={recordForm.status} onChange={(e) => setRecordForm({ ...recordForm, status: e.target.value })}><option value="PLANNED">Kế hoạch</option><option value="IN_PROGRESS">Đang thực hiện</option><option value="COMPLETED">Hoàn tất</option><option value="CANCELLED">Đã hủy</option></select></label><label>Thời điểm<input type="datetime-local" value={recordForm.occurred_at} onChange={(e) => setRecordForm({ ...recordForm, occurred_at: e.target.value })} /></label><label>Đơn vị giao<select value={recordForm.from_organization} onChange={(e) => setRecordForm({ ...recordForm, from_organization: e.target.value })}><option value="">Không chọn</option>{organizations.map((org) => <option key={org._id} value={org._id}>{org.name}</option>)}</select></label><label>Đơn vị nhận/quản lý<select value={recordForm.to_organization} onChange={(e) => setRecordForm({ ...recordForm, to_organization: e.target.value })}><option value="">Không chọn</option>{organizations.map((org) => <option key={org._id} value={org._id}>{org.name}</option>)}</select></label><label>Số lượng<input type="number" min="0" value={recordForm.quantity} onChange={(e) => setRecordForm({ ...recordForm, quantity: e.target.value })} /></label><label>Đơn vị<input value={recordForm.unit} onChange={(e) => setRecordForm({ ...recordForm, unit: e.target.value })} /></label><label className="wide">Địa điểm<input value={recordForm.location} onChange={(e) => setRecordForm({ ...recordForm, location: e.target.value })} /></label>{recordForm.operation_type === 'TRANSPORT' && <><label>Phương tiện<input value={recordForm.vehicle} onChange={(e) => setRecordForm({ ...recordForm, vehicle: e.target.value })} /></label><label>Tài xế<input value={recordForm.driver} onChange={(e) => setRecordForm({ ...recordForm, driver: e.target.value })} /></label></>}{['TRANSPORT','WAREHOUSE_IN','WAREHOUSE_OUT'].includes(recordForm.operation_type) && <><label>Nhiệt độ (°C)<input type="number" value={recordForm.temperature} onChange={(e) => setRecordForm({ ...recordForm, temperature: e.target.value })} /></label><label>Độ ẩm (%)<input type="number" min="0" max="100" value={recordForm.humidity} onChange={(e) => setRecordForm({ ...recordForm, humidity: e.target.value })} /></label></>}<label className="wide">Mô tả chi tiết<textarea rows={3} value={recordForm.description} onChange={(e) => setRecordForm({ ...recordForm, description: e.target.value })} /></label></div><div className="supply-modal-actions"><button type="button" onClick={() => setModal(null)}>Hủy</button><button className="primary" disabled={saving}>{saving ? 'Đang lưu...' : 'Lưu nghiệp vụ'}</button></div></form></div>}
    {modal === 'split' && <div className="supply-modal-backdrop"><form className="supply-modal" onSubmit={submitSplit}><div className="supply-modal-head"><div><span>TÁCH LÔ</span><h2>Tạo lô con từ tồn kho</h2></div><button type="button" onClick={() => setModal(null)}>×</button></div><div className="supply-form-grid"><label className="wide">Lô nguồn<select required value={splitForm.source} onChange={(e) => setSplitForm({ ...splitForm, source: e.target.value })}><option value="">Chọn lô</option>{products.map((p) => <option key={p._id} value={p._id}>{p.name} - {p.current_quantity} {p.unit}</option>)}</select></label><label>Số lượng tách<input required type="number" min="0.000001" step="0.000001" value={splitForm.quantity} onChange={(e) => setSplitForm({ ...splitForm, quantity: e.target.value, childQuantity: splitForm.childQuantity || e.target.value })} /></label><label>Số lượng lô con<input required type="number" min="0.000001" step="0.000001" value={splitForm.childQuantity} onChange={(e) => setSplitForm({ ...splitForm, childQuantity: e.target.value })} /></label><label className="wide">Tên lô con<input value={splitForm.childName} onChange={(e) => setSplitForm({ ...splitForm, childName: e.target.value })} placeholder="Để trống để hệ thống tự đặt tên" /></label><label className="wide">Ghi chú<textarea rows={3} value={splitForm.note} onChange={(e) => setSplitForm({ ...splitForm, note: e.target.value })} /></label></div><div className="supply-modal-actions"><button type="button" onClick={() => setModal(null)}>Hủy</button><button className="primary" disabled={saving}>{saving ? 'Đang xử lý...' : 'Tách lô'}</button></div></form></div>}
    {modal === 'merge' && <div className="supply-modal-backdrop"><form className="supply-modal" onSubmit={submitMerge}><div className="supply-modal-head"><div><span>GỘP LÔ</span><h2>Tạo lô mới từ 2 lô nguồn</h2></div><button type="button" onClick={() => setModal(null)}>×</button></div><div className="supply-form-grid"><label>Lô nguồn 1<select required value={mergeForm.sourceA} onChange={(e) => setMergeForm({ ...mergeForm, sourceA: e.target.value })}><option value="">Chọn lô</option>{products.map((p) => <option key={p._id} value={p._id}>{p.name} - {p.current_quantity} {p.unit}</option>)}</select></label><label>Lô nguồn 2<select required value={mergeForm.sourceB} onChange={(e) => setMergeForm({ ...mergeForm, sourceB: e.target.value })}><option value="">Chọn lô</option>{products.filter((p) => p._id !== mergeForm.sourceA).map((p) => <option key={p._id} value={p._id}>{p.name} - {p.current_quantity} {p.unit}</option>)}</select></label><label className="wide">Tên lô sau gộp<input value={mergeForm.targetName} onChange={(e) => setMergeForm({ ...mergeForm, targetName: e.target.value })} placeholder="Để trống để hệ thống tự đặt tên" /></label><label className="wide">Số lượng sau gộp<input type="number" min="0.000001" step="0.000001" value={mergeForm.targetQuantity} onChange={(e) => setMergeForm({ ...mergeForm, targetQuantity: e.target.value })} placeholder="Để trống để dùng toàn bộ tồn của 2 lô" /></label><label className="wide">Ghi chú<textarea rows={3} value={mergeForm.note} onChange={(e) => setMergeForm({ ...mergeForm, note: e.target.value })} /></label></div><div className="supply-modal-actions"><button type="button" onClick={() => setModal(null)}>Hủy</button><button className="primary" disabled={saving || mergeForm.sourceA === mergeForm.sourceB}>{saving ? 'Đang xử lý...' : 'Gộp lô'}</button></div></form></div>}
    {modal === 'recall' && <div className="supply-modal-backdrop"><form className="supply-modal" onSubmit={submitRecall}><div className="supply-modal-head"><div><span>THU HỒI</span><h2>Ghi nhận thu hồi lô</h2></div><button type="button" onClick={() => setModal(null)}>×</button></div><div className="supply-form-grid"><label className="wide">Lô cần thu hồi<select required value={recallForm.product} onChange={(e) => setRecallForm({ ...recallForm, product: e.target.value })}><option value="">Chọn lô</option>{products.map((p) => <option key={p._id} value={p._id}>{p.name} - {p.current_quantity} {p.unit}</option>)}</select></label><label>Số lượng thu hồi<input type="number" min="0.000001" step="0.000001" value={recallForm.quantity} onChange={(e) => setRecallForm({ ...recallForm, quantity: e.target.value })} placeholder="Để trống để thu hồi toàn bộ tồn" /></label><label>Trạng thái<select value={recallForm.status} onChange={(e) => setRecallForm({ ...recallForm, status: e.target.value as 'IN_PROGRESS' | 'COMPLETED' })}><option value="IN_PROGRESS">Đang thực hiện</option><option value="COMPLETED">Hoàn tất</option></select></label><label className="wide">Địa điểm<input value={recallForm.location} onChange={(e) => setRecallForm({ ...recallForm, location: e.target.value })} /></label><label className="wide">Lý do thu hồi<textarea required rows={3} value={recallForm.reason} onChange={(e) => setRecallForm({ ...recallForm, reason: e.target.value })} /></label><label className="wide">Ghi chú<textarea rows={3} value={recallForm.note} onChange={(e) => setRecallForm({ ...recallForm, note: e.target.value })} /></label></div><div className="supply-modal-actions"><button type="button" onClick={() => setModal(null)}>Hủy</button><button className="primary" disabled={saving}>{saving ? 'Đang xử lý...' : 'Thu hồi lô'}</button></div></form></div>}
  </div>;
};
export default SupplyChainPage;
