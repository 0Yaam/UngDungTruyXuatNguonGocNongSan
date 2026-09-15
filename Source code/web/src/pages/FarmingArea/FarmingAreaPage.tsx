import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  farmingAreaApi,
  type CreateFarmingAreaData,
  type FarmingArea,
} from '../../core/api/farmingArea.api';
import {
  locationApi,
  type Coordinates,
  type LocationSuggestion,
} from '../../core/api/location.api';
import FarmingAreaMap from '../../components/Map/FarmingAreaMap';
import FarmingAreaMapPicker from '../../components/Map/FarmingAreaMapPicker';
import {
  borderRadius,
  colors,
  shadows,
  spacing,
  typography,
} from '../../core/theme';

interface FarmingAreaFormState {
  name: string;
  address: string;
  areaSize: string;
  description: string;
  coordinates?: Coordinates;
}

const panelStyle: React.CSSProperties = {
  background: colors.surface,
  border: `1px solid ${colors.neutral[200]}`,
  borderRadius: borderRadius['2xl'],
  boxShadow: shadows.md,
};

const inputStyle: React.CSSProperties = {
  width: '100%',
  padding: `${spacing[3]} ${spacing[4]}`,
  borderRadius: borderRadius.lg,
  border: `1px solid ${colors.neutral[300]}`,
  fontSize: typography.sizes.base,
  background: colors.surface,
  outline: 'none',
};

const emptyForm = (): FarmingAreaFormState => ({
  name: '',
  address: '',
  areaSize: '',
  description: '',
  coordinates: undefined,
});

const ownerName = (area: FarmingArea) => {
  const first = area.owner?.first_name?.trim() || '';
  const last = area.owner?.last_name?.trim() || '';
  return `${first} ${last}`.trim() || area.owner?.email || 'Chua cap nhat';
};

const areaText = (value?: number) =>
  typeof value === 'number' ? `${value.toFixed(value % 1 === 0 ? 0 : 1)} ha` : 'Chua cap nhat';

const FarmingAreaPage: React.FC = () => {
  const [areas, setAreas] = useState<FarmingArea[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState<FarmingAreaFormState>(emptyForm());
  const [suggestions, setSuggestions] = useState<LocationSuggestion[]>([]);
  const [searching, setSearching] = useState(false);
  const [locationMessage, setLocationMessage] = useState('');
  const searchAbortRef = useRef<AbortController | null>(null);
  const reverseAbortRef = useRef<AbortController | null>(null);

  const loadAreas = async () => {
    setLoading(true);
    setError('');
    try {
      const response = await farmingAreaApi.getMyAreas();
      setAreas(response.data.farmingAreas);
    } catch (myErr) {
      try {
        const response = await farmingAreaApi.getAll();
        setAreas(response.data.farmingAreas);
      } catch (err: any) {
        setError(
          err?.message || (myErr as any)?.message || 'Khong tai duoc vung trong'
        );
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadAreas();
  }, []);

  useEffect(() => {
    const query = formData.address.trim();
    if (!showForm || query.length < 3) {
      setSuggestions([]);
      setSearching(false);
      searchAbortRef.current?.abort();
      return;
    }

    searchAbortRef.current?.abort();
    const controller = new AbortController();
    searchAbortRef.current = controller;

    const timer = window.setTimeout(async () => {
      setSearching(true);
      try {
        const next = await locationApi.searchAddress(query, controller.signal);
        setSuggestions(next);
      } catch (err) {
        if (!(err instanceof DOMException && err.name === 'AbortError')) {
          setSuggestions([]);
          setLocationMessage('Khong tim duoc goi y dia chi luc nay.');
        }
      } finally {
        setSearching(false);
      }
    }, 350);

    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [formData.address, showForm]);

  const stats = useMemo(
    () => ({
      total: areas.length,
      mapped: areas.filter((item) => item.coordinates).length,
      active: areas.filter((item) => item.status === 'active').length,
      totalArea: areas.reduce(
        (sum, item) => sum + (typeof item.area_size === 'number' ? item.area_size : 0),
        0
      ),
    }),
    [areas]
  );

  const resetForm = () => {
    setFormData(emptyForm());
    setShowForm(false);
    setEditingId(null);
    setSuggestions([]);
    setLocationMessage('');
    searchAbortRef.current?.abort();
    reverseAbortRef.current?.abort();
  };

  const openCreateForm = () => {
    setFormData(emptyForm());
    setShowForm(true);
    setEditingId(null);
    setLocationMessage('Nhap dia chi de lay goi y, hoac bam tren map de dat pin.');
  };

  const selectSuggestion = (suggestion: LocationSuggestion) => {
    setFormData((prev) => ({
      ...prev,
      address: suggestion.displayName || suggestion.name,
      coordinates: suggestion.coordinates,
    }));
    setSuggestions([]);
    setLocationMessage('Da cap nhat vi tri tu dia chi goi y.');
  };

  const handleCoordinateChange = async (coordinates: Coordinates) => {
    setFormData((prev) => ({
      ...prev,
      coordinates,
    }));
    setLocationMessage('Dang doi dia chi gan nhat tu ban do...');

    reverseAbortRef.current?.abort();
    const controller = new AbortController();
    reverseAbortRef.current = controller;

    try {
      const result = await locationApi.reverseGeocode(coordinates, controller.signal);
      if (result) {
        setFormData((prev) => ({
          ...prev,
          coordinates,
          address: result.displayName || prev.address,
        }));
        setLocationMessage('Da cap nhat dia chi gan nhat tu ban do.');
      } else {
        setLocationMessage('Da cap nhat toa do. Ban co the bo sung dia chi neu can.');
      }
    } catch (err) {
      if (!(err instanceof DOMException && err.name === 'AbortError')) {
        setLocationMessage('Da cap nhat toa do, nhung chua lay duoc dia chi.');
      }
    }
  };

  const saveArea = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError('');

    if (!formData.name.trim()) {
      setError('Vui long nhap ten vung trong.');
      return;
    }
    if (!formData.address.trim()) {
      setError('Vui long nhap dia chi hoac chon vi tri tren ban do.');
      return;
    }

    const payload: CreateFarmingAreaData = {
      name: formData.name.trim(),
      address: formData.address.trim(),
      description: formData.description.trim() || undefined,
      area_size: formData.areaSize ? Number(formData.areaSize) : undefined,
      coordinates: formData.coordinates,
    };

    if (
      payload.area_size !== undefined &&
      (!Number.isFinite(payload.area_size) || payload.area_size <= 0)
    ) {
      setError('Dien tich phai lon hon 0.');
      return;
    }

    setSubmitting(true);
    try {
      if (editingId) {
        await farmingAreaApi.update(editingId, payload);
      } else {
        await farmingAreaApi.create(payload);
      }
      await loadAreas();
      resetForm();
    } catch (err: any) {
      setError(err?.message || 'Khong luu duoc vung trong.');
    } finally {
      setSubmitting(false);
    }
  };

  const editArea = (area: FarmingArea) => {
    setEditingId(area._id);
    setShowForm(true);
    setFormData({
      name: area.name,
      address: area.address,
      areaSize: typeof area.area_size === 'number' ? String(area.area_size) : '',
      description: area.description || '',
      coordinates: area.coordinates,
    });
    setLocationMessage('Ban co the sua dia chi, chon goi y hoac keo pin tren map.');
  };

  const deleteArea = async (id: string) => {
    if (!window.confirm('Ban co chac chan muon xoa vung trong nay khong?')) {
      return;
    }
    try {
      await farmingAreaApi.delete(id);
      await loadAreas();
    } catch (err: any) {
      setError(err?.message || 'Khong xoa duoc vung trong.');
    }
  };

  return (
<<<<<<< HEAD
    <div className="feature-page farming-page">
      <div className="feature-page-heading" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing[6] }}>
        <div>
          <h1 style={{ margin: 0, fontSize: typography.sizes['2xl'], fontWeight: typography.weights.bold }}>
            Quản lý Vùng trồng
          </h1>
          <p style={{ color: colors.textSecondary, margin: `${spacing[2]} 0 0`, fontSize: typography.sizes.sm }}>
            Thêm, sửa, xóa thông tin các vùng trồng / trang trại
          </p>
=======
    <div style={{ display: 'grid', gap: spacing[6] }}>
      <section
        style={{
          ...panelStyle,
          padding: spacing[8],
          background:
            'radial-gradient(circle at top right, rgba(34,197,94,0.14), transparent 34%), linear-gradient(135deg, #FFFFFF 0%, #F2F8F3 100%)',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: spacing[6], flexWrap: 'wrap' }}>
          <div style={{ flex: 1, minWidth: 280 }}>
            <div style={{ display: 'inline-flex', background: colors.primary[50], color: colors.primary[700], borderRadius: borderRadius.full, padding: `${spacing[2]} ${spacing[3]}`, fontWeight: typography.weights.semibold, fontSize: typography.sizes.sm, marginBottom: spacing[4] }}>
              Ban do thong minh cho vung trong
            </div>
            <h1 style={{ margin: 0, fontSize: typography.sizes['3xl'], fontWeight: typography.weights.bold, lineHeight: typography.lineHeights.tight }}>
              Quan ly vung trong ro rang, khong can nho toa do
            </h1>
            <p style={{ margin: `${spacing[3]} 0 0`, color: colors.textSecondary, maxWidth: 720, lineHeight: 1.7 }}>
              Nhap dia chi de lay goi y, hoac bam tren ban do va keo pin den dung vi tri. Trang nay duoc lam lai de viec demo va cap nhat vung trong truc quan hon.
            </p>
          </div>
          <div style={{ minWidth: 220, display: 'grid', gap: spacing[3] }}>
            <button type="button" onClick={openCreateForm} style={{ border: 'none', borderRadius: borderRadius.xl, padding: `${spacing[4]} ${spacing[5]}`, background: colors.primary[600], color: colors.surface, fontWeight: typography.weights.semibold, cursor: 'pointer', boxShadow: shadows.md }}>
              Tao vung trong moi
            </button>
            <div style={{ ...panelStyle, padding: spacing[4], background: 'rgba(255,255,255,0.82)' }}>
              <div style={{ fontSize: typography.sizes.xs, color: colors.textSecondary, marginBottom: spacing[2] }}>
                Tong dien tich da cap nhat
              </div>
              <div style={{ fontSize: typography.sizes['2xl'], fontWeight: typography.weights.bold }}>
                {stats.totalArea.toFixed(1)} ha
              </div>
            </div>
          </div>
>>>>>>> dan/main
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: spacing[4], marginTop: spacing[6] }}>
          {[
            { label: 'Tong vung', value: `${stats.total}`, tone: colors.primary[50], text: colors.primary[700] },
            { label: 'Da gan map', value: `${stats.mapped}`, tone: '#ECFDF3', text: '#166534' },
            { label: 'Dang hoat dong', value: `${stats.active}`, tone: '#EFF6FF', text: '#1D4ED8' },
          ].map((item) => (
            <div key={item.label} style={{ padding: spacing[4], borderRadius: borderRadius.xl, background: item.tone, border: `1px solid ${colors.neutral[200]}` }}>
              <div style={{ fontSize: typography.sizes.xs, color: colors.textSecondary, marginBottom: spacing[2] }}>{item.label}</div>
              <div style={{ fontSize: typography.sizes['2xl'], fontWeight: typography.weights.bold, color: item.text }}>{item.value}</div>
            </div>
          ))}
        </div>
      </section>

      {error && (
        <div style={{ ...panelStyle, padding: spacing[4], background: '#FEF2F2', color: '#B91C1C' }}>
          {error}
        </div>
      )}

      {showForm && (
<<<<<<< HEAD
        <div className="feature-form-card" style={{
          background: colors.surface, border: `1px solid ${colors.neutral[200]}`, 
          borderRadius: borderRadius.xl, padding: spacing[6], marginBottom: spacing[6], boxShadow: shadows.sm 
        }}>
          <h3 style={{ marginTop: 0, fontSize: typography.sizes.lg, fontWeight: typography.weights.semibold }}>
            {editingId ? 'Sửa vùng trồng' : 'Thêm vùng trồng mới'}
          </h3>
          <form onSubmit={handleSubmit}>
            <div style={{ display: 'grid', gap: spacing[4], maxWidth: 500 }}>
              <div>
                <label style={{ display: 'block', marginBottom: spacing[2], fontWeight: typography.weights.medium, fontSize: typography.sizes.sm }}>
                  Tên vùng trồng *
=======
        <section style={{ ...panelStyle, padding: spacing[6], display: 'grid', gap: spacing[6] }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: spacing[4], flexWrap: 'wrap', alignItems: 'flex-start' }}>
            <div>
              <h2 style={{ margin: 0, fontSize: typography.sizes.xl, fontWeight: typography.weights.bold }}>
                {editingId ? 'Cap nhat vung trong' : 'Tao vung trong moi'}
              </h2>
              <p style={{ margin: `${spacing[2]} 0 0`, color: colors.textSecondary, fontSize: typography.sizes.sm }}>
                Nhap dia chi de lay goi y, hoac chon vi tri truc tiep tren map.
              </p>
            </div>
            <button type="button" onClick={resetForm} style={{ border: `1px solid ${colors.neutral[300]}`, borderRadius: borderRadius.xl, padding: `${spacing[3]} ${spacing[4]}`, background: colors.surface, color: colors.textSecondary, fontWeight: typography.weights.semibold, cursor: 'pointer' }}>
              Dong form
            </button>
          </div>

          <form onSubmit={saveArea}>
            <div style={{ display: 'grid', gridTemplateColumns: 'minmax(320px, 1.05fr) minmax(320px, 1fr)', gap: spacing[6] }}>
              <div style={{ display: 'grid', gap: spacing[4] }}>
                <label style={{ display: 'grid', gap: spacing[2] }}>
                  <span style={{ fontWeight: typography.weights.semibold }}>Ten vung trong</span>
                  <input value={formData.name} onChange={(event) => setFormData((prev) => ({ ...prev, name: event.target.value }))} placeholder="Vi du: Khu trong rau huu co Da Lat" style={inputStyle} />
>>>>>>> dan/main
                </label>

                <label style={{ display: 'grid', gap: spacing[2] }}>
                  <span style={{ fontWeight: typography.weights.semibold }}>Dia chi</span>
                  <div style={{ position: 'relative' }}>
                    <input value={formData.address} onChange={(event) => setFormData((prev) => ({ ...prev, address: event.target.value }))} placeholder="Nhap xa, huyen, tinh hoac dia diem cu the" style={inputStyle} />
                    {(searching || suggestions.length > 0) && (
                      <div style={{ position: 'absolute', top: 'calc(100% + 8px)', left: 0, right: 0, zIndex: 10, ...panelStyle, overflow: 'hidden' }}>
                        {searching && <div style={{ padding: spacing[3], color: colors.textSecondary, fontSize: typography.sizes.sm }}>Dang tim dia chi phu hop...</div>}
                        {!searching && suggestions.map((suggestion) => (
                          <button key={suggestion.id} type="button" onClick={() => selectSuggestion(suggestion)} style={{ width: '100%', textAlign: 'left', border: 'none', borderTop: `1px solid ${colors.neutral[200]}`, background: colors.surface, padding: spacing[3], cursor: 'pointer' }}>
                            <div style={{ fontWeight: typography.weights.semibold, marginBottom: spacing[1] }}>{suggestion.name}</div>
                            <div style={{ fontSize: typography.sizes.xs, color: colors.textSecondary, lineHeight: 1.6 }}>{suggestion.displayName}</div>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </label>

                <label style={{ display: 'grid', gap: spacing[2] }}>
                  <span style={{ fontWeight: typography.weights.semibold }}>Dien tich (ha)</span>
                  <input type="number" min="0" step="0.1" value={formData.areaSize} onChange={(event) => setFormData((prev) => ({ ...prev, areaSize: event.target.value }))} placeholder="Vi du: 2.5" style={inputStyle} />
                </label>

                <label style={{ display: 'grid', gap: spacing[2] }}>
                  <span style={{ fontWeight: typography.weights.semibold }}>Mo ta ngan</span>
                  <textarea value={formData.description} onChange={(event) => setFormData((prev) => ({ ...prev, description: event.target.value }))} rows={5} placeholder="Mo ta cay trong, quy mo, thong tin nhan biet..." style={{ ...inputStyle, resize: 'vertical', minHeight: 132 }} />
                </label>

                <div style={{ display: 'flex', gap: spacing[2], flexWrap: 'wrap' }}>
                  {formData.coordinates && (
                    <>
                      <span style={{ background: colors.primary[50], color: colors.primary[700], borderRadius: borderRadius.full, padding: `${spacing[2]} ${spacing[3]}`, fontSize: typography.sizes.xs, fontWeight: typography.weights.semibold }}>
                        Lat: {formData.coordinates.lat.toFixed(6)}
                      </span>
                      <span style={{ background: colors.neutral[100], color: colors.textSecondary, borderRadius: borderRadius.full, padding: `${spacing[2]} ${spacing[3]}`, fontSize: typography.sizes.xs, fontWeight: typography.weights.semibold }}>
                        Lng: {formData.coordinates.lng.toFixed(6)}
                      </span>
                    </>
                  )}
                </div>

                <div style={{ ...panelStyle, padding: spacing[4], background: colors.neutral[50] }}>
                  <div style={{ fontWeight: typography.weights.semibold, marginBottom: spacing[2] }}>Trang thai vi tri</div>
                  <div style={{ color: colors.textSecondary, fontSize: typography.sizes.sm, lineHeight: 1.7 }}>
                    {locationMessage || 'Nhap dia chi de lay goi y, hoac keo pin tren map de chon dung vi tri.'}
                  </div>
                </div>

                <div style={{ display: 'flex', gap: spacing[3], flexWrap: 'wrap' }}>
                  <button type="submit" disabled={submitting} style={{ border: 'none', borderRadius: borderRadius.xl, padding: `${spacing[4]} ${spacing[5]}`, background: submitting ? colors.neutral[400] : colors.primary[600], color: colors.surface, fontWeight: typography.weights.semibold, cursor: submitting ? 'not-allowed' : 'pointer' }}>
                    {submitting ? 'Dang luu...' : editingId ? 'Cap nhat vung trong' : 'Luu vung trong'}
                  </button>
                  <button type="button" onClick={resetForm} style={{ border: `1px solid ${colors.neutral[300]}`, borderRadius: borderRadius.xl, padding: `${spacing[4]} ${spacing[5]}`, background: colors.surface, color: colors.textSecondary, fontWeight: typography.weights.semibold, cursor: 'pointer' }}>
                    Huy
                  </button>
                </div>
              </div>

              <div style={{ display: 'grid', gap: spacing[4], alignContent: 'start' }}>
                <FarmingAreaMapPicker coordinates={formData.coordinates} address={formData.address} height={420} onCoordinatesChange={handleCoordinateChange} />
                <div style={{ ...panelStyle, padding: spacing[4], background: 'linear-gradient(180deg, rgba(240,253,244,0.9) 0%, rgba(255,255,255,0.95) 100%)' }}>
                  <div style={{ fontSize: typography.sizes.xs, color: colors.textSecondary, marginBottom: spacing[2] }}>
                    Ban ghi se duoc luu voi
                  </div>
                  <div style={{ fontSize: typography.sizes.lg, fontWeight: typography.weights.bold, marginBottom: spacing[2] }}>
                    {formData.name.trim() || 'Ten vung trong se hien o day'}
                  </div>
                  <div style={{ color: colors.textSecondary, fontSize: typography.sizes.sm, lineHeight: 1.7 }}>
                    {formData.address.trim() || 'Dia chi va vi tri chon tren map se giup trang chi tiet hien thi ro rang hon.'}
                  </div>
                </div>
              </div>
            </div>
          </form>
        </section>
      )}

      <section style={{ display: 'grid', gap: spacing[4] }}>
        <div>
          <h2 style={{ margin: 0, fontSize: typography.sizes['2xl'], fontWeight: typography.weights.bold }}>
            Danh sach vung trong
          </h2>
          <p style={{ margin: `${spacing[2]} 0 0`, color: colors.textSecondary, fontSize: typography.sizes.sm }}>
            Xem nhanh vi tri, chu so huu va tinh trang cap nhat ban do.
          </p>
        </div>

        {loading ? (
          <div style={{ ...panelStyle, padding: spacing[8], textAlign: 'center', color: colors.textSecondary }}>
            Dang tai danh sach vung trong...
          </div>
        ) : areas.length === 0 ? (
          <div style={{ ...panelStyle, padding: spacing[8], textAlign: 'center' }}>
            <div style={{ fontSize: typography.sizes['2xl'], fontWeight: typography.weights.bold, marginBottom: spacing[2] }}>
              Chua co vung trong nao
            </div>
            <p style={{ margin: 0, color: colors.textSecondary, lineHeight: 1.7 }}>
              Tao vung dau tien de hien thi ban do va lien ket voi lo nong san.
            </p>
            <button type="button" onClick={openCreateForm} style={{ marginTop: spacing[4], border: 'none', borderRadius: borderRadius.xl, padding: `${spacing[4]} ${spacing[5]}`, background: colors.primary[600], color: colors.surface, fontWeight: typography.weights.semibold, cursor: 'pointer' }}>
              Tao vung trong
            </button>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: spacing[5] }}>
            {areas.map((area) => (
              <article key={area._id} style={{ ...panelStyle, padding: spacing[5], display: 'grid', gap: spacing[4] }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: spacing[3], flexWrap: 'wrap', alignItems: 'flex-start' }}>
                  <div>
                    <div style={{ fontSize: typography.sizes.xs, color: colors.textSecondary, marginBottom: spacing[1] }}>Vung trong</div>
                    <h3 style={{ margin: 0, fontSize: typography.sizes.xl, fontWeight: typography.weights.bold }}>{area.name}</h3>
                  </div>
                  <div style={{ display: 'flex', gap: spacing[2], flexWrap: 'wrap' }}>
                    <span style={{ borderRadius: borderRadius.full, padding: `${spacing[1]} ${spacing[3]}`, fontSize: typography.sizes.xs, fontWeight: typography.weights.semibold, ...(area.status === 'active' ? { background: colors.primary[50], color: colors.primary[700] } : { background: '#FEF3C7', color: '#B45309' }) }}>
                      {area.status === 'active' ? 'Dang hoat dong' : 'Tam dung'}
                    </span>
                    <button type="button" onClick={() => editArea(area)} style={{ border: `1px solid ${colors.neutral[300]}`, borderRadius: borderRadius.full, padding: `${spacing[1]} ${spacing[3]}`, background: colors.surface, color: colors.textSecondary, fontSize: typography.sizes.xs, fontWeight: typography.weights.semibold, cursor: 'pointer' }}>
                      Sua
                    </button>
                    <button type="button" onClick={() => void deleteArea(area._id)} style={{ border: 'none', borderRadius: borderRadius.full, padding: `${spacing[1]} ${spacing[3]}`, background: '#FEF2F2', color: '#B91C1C', fontSize: typography.sizes.xs, fontWeight: typography.weights.semibold, cursor: 'pointer' }}>
                      Xoa
                    </button>
                  </div>
                </div>

                <div style={{ color: colors.textSecondary, fontSize: typography.sizes.sm, lineHeight: 1.7 }}>{area.address}</div>
                {area.description && <div style={{ padding: spacing[4], borderRadius: borderRadius.xl, background: colors.neutral[50], color: colors.textSecondary, fontSize: typography.sizes.sm, lineHeight: 1.7 }}>{area.description}</div>}
                <FarmingAreaMap coordinates={area.coordinates} address={area.address} title="Ban do khu vuc" height={220} />
                <div style={{ display: 'flex', gap: spacing[2], flexWrap: 'wrap' }}>
                  <span style={{ background: colors.neutral[100], color: colors.textSecondary, borderRadius: borderRadius.full, padding: `${spacing[2]} ${spacing[3]}`, fontSize: typography.sizes.xs, fontWeight: typography.weights.semibold }}>
                    Dien tich: {areaText(area.area_size)}
                  </span>
                  <span style={{ background: colors.primary[50], color: colors.primary[700], borderRadius: borderRadius.full, padding: `${spacing[2]} ${spacing[3]}`, fontSize: typography.sizes.xs, fontWeight: typography.weights.semibold }}>
                    Chu so huu: {ownerName(area)}
                  </span>
                </div>
                <div style={{ color: colors.textMuted, fontSize: typography.sizes.xs }}>
                  Cap nhat lan cuoi: {new Date(area.updatedAt).toLocaleString('vi-VN')}
                </div>
              </article>
            ))}
          </div>
        )}
      </section>
    </div>
  );
};

export default FarmingAreaPage;
