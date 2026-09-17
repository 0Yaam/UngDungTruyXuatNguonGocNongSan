import React, { useEffect, useState } from 'react';
import { productApi } from '../../core/api/product.api';
import { exportApi, downloadBlob } from '../../core/api/export.api';
import type { Product } from '../../core/types';
import './ExportPage.css';

const statusLabel: Record<Product['status'], string> = { draft: 'Bản nháp', active: 'Đang theo dõi', completed: 'Hoàn tất', recalled: 'Đã thu hồi' };
const ExportPage: React.FC = () => {
  const [products, setProducts] = useState<Product[]>([]); const [loading, setLoading] = useState(true); const [exporting, setExporting] = useState('');
  const [error, setError] = useState(''); const [success, setSuccess] = useState(''); const [selected, setSelected] = useState<string[]>([]);
  useEffect(() => { productApi.getAll().then(({ data }) => setProducts(data.products)).catch((err) => setError(err.message)).finally(() => setLoading(false)); }, []);

  const handleExport = async (type: string, productId?: string) => {
    const key = type + (productId || ''); setExporting(key); setError(''); setSuccess('');
    try {
      let blob: Blob; let filename: string;
      if (type === 'product-pdf' && productId) { blob = (await exportApi.getProductPdf(productId)).data; filename = `ho-so-${productId}.pdf`; }
      else if (type === 'timeline-pdf' && productId) { blob = (await exportApi.getTimelinePdf(productId)).data; filename = `nhat-ky-${productId}.pdf`; }
      else if (type === 'qr' && productId) { blob = (await exportApi.getQrCode(productId)).data; filename = `qr-${productId}.png`; }
      else if (type === 'products-excel') { blob = (await exportApi.getProductsExcel()).data; filename = `danh-sach-lo-${new Date().toISOString().slice(0, 10)}.xlsx`; }
      else if (type === 'qr-batch' && selected.length) { blob = (await exportApi.getQrCodesBatch(selected)).data; filename = 'bo-ma-qr.pdf'; }
      else { setError('Vui lòng chọn ít nhất một lô nông sản.'); return; }
      downloadBlob(blob, filename); setSuccess(`Đã tải xuống ${filename}`);
    } catch (err: any) { setError(err.message || 'Không thể xuất tệp. Vui lòng thử lại.'); }
    finally { setExporting(''); }
  };
  const toggle = (id: string) => setSelected((value) => value.includes(id) ? value.filter((item) => item !== id) : [...value, id]);
  const allSelected = products.length > 0 && selected.length === products.length;

  return <div className="export-page">
    <header className="export-heading"><div><span>TRUNG TÂM TÀI LIỆU</span><h1>Xuất báo cáo</h1><p>Tạo hồ sơ truy xuất, bảng dữ liệu và bộ mã QR sẵn sàng chia sẻ.</p></div><div className="export-heading-mark">⇩</div></header>
    {error && <div className="export-notice is-error">{error}<button onClick={() => setError('')}>×</button></div>}{success && <div className="export-notice is-success">✓ {success}<button onClick={() => setSuccess('')}>×</button></div>}
    <section className="export-actions"><article><span className="export-action-icon is-excel">X</span><div><small>DỮ LIỆU TỔNG HỢP</small><h2>Danh sách lô Excel</h2><p>Xuất toàn bộ thông tin lô để thống kê và đối soát.</p></div><button onClick={() => handleExport('products-excel')} disabled={!!exporting}>{exporting === 'products-excel' ? 'Đang tạo...' : 'Tải Excel'}</button></article><article><span className="export-action-icon is-qr">⌗</span><div><small>IN ẤN NHANH</small><h2>Bộ mã QR</h2><p>Gộp mã QR của các lô đã chọn vào một tệp PDF.</p></div><button onClick={() => handleExport('qr-batch')} disabled={!!exporting || !selected.length}>{exporting === 'qr-batch' ? 'Đang tạo...' : `Xuất ${selected.length} mã QR`}</button></article></section>
    <section className="export-list"><div className="export-list-head"><div><span>DANH SÁCH DỮ LIỆU</span><h2>Chọn lô cần xuất</h2></div><button className="export-select-all" onClick={() => setSelected(allSelected ? [] : products.map((item) => item._id))}>{allSelected ? 'Bỏ chọn tất cả' : 'Chọn tất cả'}</button></div>
      {loading ? <div className="export-empty">Đang tải danh sách...</div> : !products.length ? <div className="export-empty">Chưa có lô nông sản để xuất.</div> : <div className="export-table-wrap"><table><thead><tr><th><input type="checkbox" checked={allSelected} onChange={() => setSelected(allSelected ? [] : products.map((item) => item._id))} /></th><th>Lô nông sản</th><th>Danh mục</th><th>Trạng thái</th><th>Tệp riêng lẻ</th></tr></thead><tbody>{products.map((product) => <tr key={product._id} className={selected.includes(product._id) ? 'is-selected' : ''}><td><input type="checkbox" checked={selected.includes(product._id)} onChange={() => toggle(product._id)} /></td><td><div className="export-product"><span>{product.type === 'Plant' ? '🌱' : '🐄'}</span><div><strong>{product.name}</strong><small>{product.origin}</small></div></div></td><td>{product.category}</td><td><span className={`export-status status-${product.status}`}>{statusLabel[product.status]}</span></td><td><div className="export-row-actions"><button onClick={() => handleExport('product-pdf', product._id)} disabled={!!exporting}>Hồ sơ PDF</button><button onClick={() => handleExport('timeline-pdf', product._id)} disabled={!!exporting}>Nhật ký</button><button onClick={() => handleExport('qr', product._id)} disabled={!!exporting}>QR</button></div></td></tr>)}</tbody></table></div>}
    </section>
  </div>;
};
export default ExportPage;
