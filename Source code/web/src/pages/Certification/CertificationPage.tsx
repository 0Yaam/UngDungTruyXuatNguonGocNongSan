import React, { useEffect, useState } from 'react';
import { certificationApi, Certification, CreateCertificationData } from '../../core/api/certification.api';
import { farmingAreaApi, FarmingArea } from '../../core/api/farmingArea.api';
import { colors, spacing, borderRadius, shadows, typography } from '../../core/theme';

const certTypes: Certification['type'][] = ['VietGAP', 'GlobalGAP', 'Organic', 'HACCP', 'ISO22000', 'Other'];
const statusColors: Record<string, { bg: string; text: string }> = { 
  valid: { bg: colors.primary[100], text: colors.primary[700] }, 
  expired: { bg: '#fef2f2', text: '#b91c1c' }, 
  revoked: { bg: '#fef3c7', text: '#92400e' } 
};

const fieldStyle: React.CSSProperties = {
  padding: `${spacing[3]} ${spacing[4]}`,
  borderRadius: borderRadius.lg,
  border: `1px solid ${colors.neutral[300]}`,
  fontSize: typography.sizes.base,
  width: '100%',
  boxSizing: 'border-box',
};

const CertificationPage: React.FC = () => {
  const [certs, setCerts] = useState<Certification[]>([]);
  const [farmingAreas, setFarmingAreas] = useState<FarmingArea[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState<CreateCertificationData & { farming_area?: string }>({
    name: '', type: 'VietGAP', issuing_authority: '', certificate_number: '', 
    issue_date: '', expiry_date: '', scope: '', document_url: '', farming_area: ''
  });
  const [submitting, setSubmitting] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  const fetchData = async () => {
    try { 
      setLoading(true); 
      const [certRes, areaRes] = await Promise.all([
        certificationApi.getAll(),
        farmingAreaApi.getAll()
      ]);
      setCerts(certRes.data.certifications); 
      setFarmingAreas(areaRes.data.farmingAreas || []);
    }
    catch (err: any) { setError(err.message || 'Không tải được dữ liệu'); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchData(); }, []);

  const resetForm = () => { 
    setFormData({ 
      name: '', type: 'VietGAP', issuing_authority: '', certificate_number: '', 
      issue_date: '', expiry_date: '', scope: '', document_url: '', farming_area: '' 
    }); 
    setEditingId(null); 
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || !formData.certificate_number || !formData.issuing_authority) { 
      setError('Vui lòng nhập đầy đủ thông tin bắt buộc'); 
      return; 
    }
    setSubmitting(true); setError('');
    try {
      const submitData = { ...formData };
      if (!submitData.farming_area) delete submitData.farming_area;
      
      if (editingId) await certificationApi.update(editingId, submitData);
      else await certificationApi.create(submitData);
      setShowForm(false); resetForm(); fetchData();
    } catch (err: any) { setError(err.message); }
    finally { setSubmitting(false); }
  };

  const handleEdit = (cert: Certification) => {
    setFormData({ 
      name: cert.name, type: cert.type, issuing_authority: cert.issuing_authority, 
      certificate_number: cert.certificate_number, 
      issue_date: cert.issue_date.split('T')[0], 
      expiry_date: cert.expiry_date.split('T')[0], 
      scope: cert.scope || '', document_url: cert.document_url || '',
      farming_area: cert.farming_area?._id || ''
    });
    setEditingId(cert._id); setShowForm(true);
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Xóa chứng nhận này?')) return;
    try { await certificationApi.delete(id); fetchData(); } catch (err: any) { setError(err.message); }
  };

  return (
    <div className="feature-page certification-page">
      <div className="feature-page-heading" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing[6] }}>
        <div>
          <h1 style={{ margin: 0, fontSize: typography.sizes['2xl'], fontWeight: typography.weights.bold }}>
            Quản lý Chứng nhận
          </h1>
          <p style={{ color: colors.textSecondary, margin: `${spacing[2]} 0 0`, fontSize: typography.sizes.sm }}>
            VietGAP, GlobalGAP, Organic, HACCP...
          </p>
        </div>
        <button 
          style={{ 
            background: colors.primary[600], color: 'white', border: 'none', 
            borderRadius: borderRadius.lg, padding: `${spacing[3]} ${spacing[5]}`, 
            fontWeight: typography.weights.semibold, cursor: 'pointer' 
          }} 
          onClick={() => { setShowForm(true); resetForm(); }}
        >
          + Thêm chứng nhận
        </button>
      </div>

      {error && (
        <div style={{ background: '#fef2f2', color: '#b91c1c', padding: spacing[4], borderRadius: borderRadius.lg, marginBottom: spacing[4] }}>
          {error}
        </div>
      )}

      {showForm && (
        <div className="feature-form-card" style={{
          background: colors.surface, border: `1px solid ${colors.neutral[200]}`, 
          borderRadius: borderRadius.xl, padding: spacing[6], marginBottom: spacing[6], boxShadow: shadows.sm 
        }}>
          <h3 style={{ marginTop: 0, fontSize: typography.sizes.lg, fontWeight: typography.weights.semibold }}>
            {editingId ? 'Sửa chứng nhận' : 'Thêm chứng nhận mới'}
          </h3>
          <form onSubmit={handleSubmit}>
            <div style={{ display: 'grid', gap: spacing[4], maxWidth: 700, gridTemplateColumns: '1fr 1fr' }}>
              <div>
                <label style={{ display: 'block', marginBottom: spacing[2], fontWeight: typography.weights.medium, fontSize: typography.sizes.sm }}>
                  Tên chứng nhận *
                </label>
                <input 
                  style={fieldStyle} 
                  placeholder="Ví dụ: Chứng nhận VietGAP rau củ" 
                  value={formData.name} 
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })} 
                />
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: spacing[2], fontWeight: typography.weights.medium, fontSize: typography.sizes.sm }}>
                  Loại chứng nhận
                </label>
                <select 
                  style={{ ...fieldStyle, background: colors.surface }} 
                  value={formData.type} 
                  onChange={(e) => setFormData({ ...formData, type: e.target.value as Certification['type'] })}
                >
                  {certTypes.map((t) => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: spacing[2], fontWeight: typography.weights.medium, fontSize: typography.sizes.sm }}>
                  Cơ quan cấp *
                </label>
                <input 
                  style={fieldStyle} 
                  placeholder="Ví dụ: Sở NN&PTNT Lâm Đồng" 
                  value={formData.issuing_authority} 
                  onChange={(e) => setFormData({ ...formData, issuing_authority: e.target.value })} 
                />
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: spacing[2], fontWeight: typography.weights.medium, fontSize: typography.sizes.sm }}>
                  Số chứng nhận *
                </label>
                <input 
                  style={fieldStyle} 
                  placeholder="Ví dụ: VG-2024-001234" 
                  value={formData.certificate_number} 
                  onChange={(e) => setFormData({ ...formData, certificate_number: e.target.value })} 
                />
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: spacing[2], fontWeight: typography.weights.medium, fontSize: typography.sizes.sm }}>
                  Ngày cấp
                </label>
                <input 
                  style={fieldStyle} 
                  type="date" 
                  value={formData.issue_date} 
                  onChange={(e) => setFormData({ ...formData, issue_date: e.target.value })} 
                />
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: spacing[2], fontWeight: typography.weights.medium, fontSize: typography.sizes.sm }}>
                  Ngày hết hạn
                </label>
                <input 
                  style={fieldStyle} 
                  type="date" 
                  value={formData.expiry_date} 
                  onChange={(e) => setFormData({ ...formData, expiry_date: e.target.value })} 
                />
              </div>
              <div style={{ gridColumn: '1 / -1' }}>
                <label style={{ display: 'block', marginBottom: spacing[2], fontWeight: typography.weights.medium, fontSize: typography.sizes.sm }}>
                  🌱 Vùng trồng được chứng nhận
                </label>
                <select 
                  style={{ ...fieldStyle, background: colors.surface }} 
                  value={formData.farming_area || ''} 
                  onChange={(e) => setFormData({ ...formData, farming_area: e.target.value })}
                >
                  <option value="">-- Chọn vùng trồng (tùy chọn) --</option>
                  {farmingAreas.map((area) => (
                    <option key={area._id} value={area._id}>
                      {area.name} - {area.address}
                    </option>
                  ))}
                </select>
                <p style={{ margin: `${spacing[2]} 0 0`, fontSize: typography.sizes.xs, color: colors.textSecondary }}>
                  Chứng nhận này sẽ được hiển thị trên trang vùng trồng đã chọn
                </p>
              </div>
              <div style={{ gridColumn: '1 / -1' }}>
                <label style={{ display: 'block', marginBottom: spacing[2], fontWeight: typography.weights.medium, fontSize: typography.sizes.sm }}>
                  Phạm vi chứng nhận
                </label>
                <input 
                  style={fieldStyle} 
                  placeholder="Ví dụ: Rau ăn lá, rau củ quả" 
                  value={formData.scope || ''} 
                  onChange={(e) => setFormData({ ...formData, scope: e.target.value })} 
                />
              </div>
              <div style={{ display: 'flex', gap: spacing[3], gridColumn: '1 / -1' }}>
                <button 
                  type="submit" 
                  style={{ 
                    background: colors.primary[600], color: 'white', border: 'none', 
                    borderRadius: borderRadius.lg, padding: `${spacing[3]} ${spacing[5]}`, 
                    fontWeight: typography.weights.semibold, cursor: submitting ? 'not-allowed' : 'pointer' 
                  }} 
                  disabled={submitting}
                >
                  {submitting ? 'Đang lưu...' : editingId ? 'Cập nhật' : 'Thêm'}
                </button>
                <button 
                  type="button" 
                  style={{ 
                    background: colors.neutral[200], color: colors.textSecondary, border: 'none', 
                    borderRadius: borderRadius.lg, padding: `${spacing[3]} ${spacing[5]}`, 
                    fontWeight: typography.weights.medium, cursor: 'pointer' 
                  }} 
                  onClick={() => setShowForm(false)}
                >
                  Hủy
                </button>
              </div>
            </div>
          </form>
        </div>
      )}

      {loading ? (
        <p style={{ color: colors.textSecondary }}>Đang tải...</p>
      ) : certs.length === 0 ? (
        <div className="feature-table-card" style={{
          background: colors.surface, border: `1px solid ${colors.neutral[200]}`, 
          borderRadius: borderRadius.xl, padding: spacing[8], textAlign: 'center' 
        }}>
          <p style={{ color: colors.textSecondary, margin: 0 }}>Chưa có chứng nhận nào</p>
        </div>
      ) : (
        <div style={{ 
          background: colors.surface, borderRadius: borderRadius.xl, 
          border: `1px solid ${colors.neutral[200]}`, overflow: 'hidden' 
        }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: colors.neutral[50] }}>
                <th style={{ padding: spacing[4], textAlign: 'left', fontWeight: typography.weights.semibold, fontSize: typography.sizes.sm, color: colors.textSecondary }}>Tên</th>
                <th style={{ padding: spacing[4], textAlign: 'left', fontWeight: typography.weights.semibold, fontSize: typography.sizes.sm, color: colors.textSecondary }}>Loại</th>
                <th style={{ padding: spacing[4], textAlign: 'left', fontWeight: typography.weights.semibold, fontSize: typography.sizes.sm, color: colors.textSecondary }}>Số CN</th>
                <th style={{ padding: spacing[4], textAlign: 'left', fontWeight: typography.weights.semibold, fontSize: typography.sizes.sm, color: colors.textSecondary }}>Vùng trồng</th>
                <th style={{ padding: spacing[4], textAlign: 'left', fontWeight: typography.weights.semibold, fontSize: typography.sizes.sm, color: colors.textSecondary }}>Hết hạn</th>
                <th style={{ padding: spacing[4], textAlign: 'left', fontWeight: typography.weights.semibold, fontSize: typography.sizes.sm, color: colors.textSecondary }}>Trạng thái</th>
                <th style={{ padding: spacing[4], textAlign: 'left', fontWeight: typography.weights.semibold, fontSize: typography.sizes.sm, color: colors.textSecondary }}>Thao tác</th>
              </tr>
            </thead>
            <tbody>
              {certs.map((cert) => {
                const sColors = statusColors[cert.status] || statusColors.valid;
                return (
                  <tr key={cert._id} style={{ borderTop: `1px solid ${colors.neutral[100]}` }}>
                    <td style={{ padding: spacing[4], fontWeight: typography.weights.medium }}>{cert.name}</td>
                    <td style={{ padding: spacing[4] }}>
                      <span style={{ 
                        background: colors.primary[50], color: colors.primary[700], 
                        padding: `${spacing[1]} ${spacing[3]}`, borderRadius: borderRadius.full, 
                        fontSize: typography.sizes.xs, fontWeight: typography.weights.semibold 
                      }}>
                        {cert.type}
                      </span>
                    </td>
                    <td style={{ padding: spacing[4], fontFamily: 'monospace', fontSize: typography.sizes.sm, color: colors.textSecondary }}>
                      {cert.certificate_number}
                    </td>
                    <td style={{ padding: spacing[4], fontSize: typography.sizes.sm }}>
                      {cert.farming_area ? (
                        <span style={{ color: colors.primary[600] }}>🌱 {cert.farming_area.name}</span>
                      ) : (
                        <span style={{ color: colors.neutral[400] }}>—</span>
                      )}
                    </td>
                    <td style={{ padding: spacing[4], fontSize: typography.sizes.sm, color: colors.textSecondary }}>
                      {new Date(cert.expiry_date).toLocaleDateString('vi-VN')}
                    </td>
                    <td style={{ padding: spacing[4] }}>
                      <span style={{ 
                        background: sColors.bg, color: sColors.text, 
                        padding: `${spacing[1]} ${spacing[3]}`, borderRadius: borderRadius.md, 
                        fontSize: typography.sizes.xs, fontWeight: typography.weights.semibold 
                      }}>
                        {cert.status === 'valid' ? 'Còn hiệu lực' : cert.status === 'expired' ? 'Hết hạn' : 'Thu hồi'}
                      </span>
                    </td>
                    <td style={{ padding: spacing[4] }}>
                      <button 
                        onClick={() => handleEdit(cert)} 
                        style={{ 
                          background: '#2563eb', color: 'white', border: 'none', 
                          borderRadius: borderRadius.md, padding: `${spacing[1]} ${spacing[3]}`, 
                          fontSize: typography.sizes.xs, fontWeight: typography.weights.medium, 
                          cursor: 'pointer', marginRight: spacing[2] 
                        }}
                      >
                        Sửa
                      </button>
                      <button 
                        onClick={() => handleDelete(cert._id)} 
                        style={{ 
                          background: '#dc2626', color: 'white', border: 'none', 
                          borderRadius: borderRadius.md, padding: `${spacing[1]} ${spacing[3]}`, 
                          fontSize: typography.sizes.xs, fontWeight: typography.weights.medium, 
                          cursor: 'pointer' 
                        }}
                      >
                        Xóa
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default CertificationPage;
