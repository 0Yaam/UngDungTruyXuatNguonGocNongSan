import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useLocation } from 'react-router-dom';
import CameraFeed from './components/CameraFeed';
import CameraNavigator from './components/CameraNavigator';
import useModalA11y from '../../components/ui/useModalA11y';
import { purposeLabels, sourceLabels, statusLabels, statusTone } from './cameraUi';
import StatusBadge from '../../components/ui/StatusBadge';
import { Camera, CameraPayload, CameraTask, CameraTaskRun, cameraApi } from '../../core/api/camera.api';
import { FarmingArea, farmingAreaApi } from '../../core/api/farmingArea.api';
import './CameraPage.css';

const emptyForm: CameraPayload = {
  name: '',
  source_type: 'mediamtx',
  purpose: 'field_overview',
  playback_url: '',
  snapshot_url: '',
  source_url: '',
  stream_path: '',
  username: '',
  password: '',
  location: '',
  is_enabled: true,
  status_override: 'auto',
};

const GRID_PAGE_SIZE = 12;

const messageOf = (error: any) =>
  error?.response?.data?.message || error?.message || 'Không thể thực hiện yêu cầu.';

const formatTime = (value?: string) => value
  ? new Intl.DateTimeFormat('vi-VN', { dateStyle: 'short', timeStyle: 'medium' }).format(new Date(value))
  : 'Chưa ghi nhận';

const CameraPage: React.FC = () => {
  const location = useLocation();
  const queryMode = new URLSearchParams(location.search).get('mode');
  const [cameras, setCameras] = useState<Camera[]>([]);
  const [tasks, setTasks] = useState<CameraTask[]>([]);
  const [farmingAreas, setFarmingAreas] = useState<FarmingArea[]>([]);
  const [areaFilter, setAreaFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [search, setSearch] = useState('');
  const [selectedId, setSelectedId] = useState('');
  const [viewMode, setViewMode] = useState<'focus' | 'grid'>('focus');
  const [navigatorOpen, setNavigatorOpen] = useState(() => window.matchMedia('(min-width: 701px)').matches);
  const [aiMenuOpen, setAiMenuOpen] = useState(false);
  const [gridPage, setGridPage] = useState(0);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [mode, setMode] = useState(queryMode || '');
  const [runs, setRuns] = useState<CameraTaskRun[]>([]);
  const [form, setForm] = useState<CameraPayload>(emptyForm);
  const [editingId, setEditingId] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [image, setImage] = useState<File>();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [ingestKey, setIngestKey] = useState('');
  useModalA11y(showForm, () => setShowForm(false), '.camera-form');
  const [pairingCode, setPairingCode] = useState('');
  const stageViewportRef = useRef<HTMLDivElement>(null);

  const productFilter = useMemo(() => new URLSearchParams(location.search).get('product') || '', [location.search]);
  const visibleCameras = useMemo(() => {
    const keyword = search.trim().toLocaleLowerCase('vi-VN');
    return cameras.filter((camera) => {
      const searchable = [
        camera.name,
        camera.code,
        camera.location,
        camera.farming_area?.name,
      ].filter(Boolean).join(' ').toLocaleLowerCase('vi-VN');

      return (!areaFilter || camera.farming_area?._id === areaFilter)
        && (!statusFilter || camera.status === statusFilter)
        && (!productFilter || camera.product?._id === productFilter)
        && (!keyword || searchable.includes(keyword));
    });
  }, [areaFilter, cameras, productFilter, search, statusFilter]);
  const selected = useMemo(() =>
    visibleCameras.find((camera) => camera._id === selectedId) || visibleCameras[0],
  [selectedId, visibleCameras]);
  const selectedTask = tasks.find((task) => task.key === mode);
  const latest = runs[0];
  const topDisease = latest?.result?.top_disease;
  const gridPageCount = Math.max(1, Math.ceil(visibleCameras.length / GRID_PAGE_SIZE));
  const gridCameras = visibleCameras.slice(gridPage * GRID_PAGE_SIZE, (gridPage + 1) * GRID_PAGE_SIZE);

  const load = useCallback(async () => {
    try {
      const [cameraResponse, areaResponse, taskResponse] = await Promise.all([
        cameraApi.list(), farmingAreaApi.getAll(), cameraApi.tasks(),
      ]);
      setCameras(cameraResponse.data.cameras);
      setFarmingAreas(areaResponse.data.farmingAreas);
      setTasks(taskResponse.data.tasks);
      setSelectedId((current) => current || cameraResponse.data.cameras[0]?._id || '');
      setError('');
    } catch (loadError) {
      setError(messageOf(loadError));
    }
  }, []);

  const loadRuns = useCallback(async () => {
    if (!selected?._id || !mode) {
      setRuns([]);
      return;
    }
    try {
      const response = await cameraApi.runs(selected._id, mode);
      setRuns(response.data.runs);
    } catch (loadError) {
      setError(messageOf(loadError));
    }
  }, [mode, selected?._id]);

  useEffect(() => { void load(); }, [load]);
  useEffect(() => { void loadRuns(); }, [loadRuns]);
  useEffect(() => { setMode(queryMode || ''); }, [queryMode]);

  useEffect(() => { setGridPage(0); }, [areaFilter, search, statusFilter]);

  useEffect(() => {
    const handleFullscreenChange = () => setIsFullscreen(document.fullscreenElement === stageViewportRef.current);
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  const openCreate = () => {
    setEditingId('');
    setForm({ ...emptyForm, farming_area: areaFilter || farmingAreas[0]?._id || '' });
    setIngestKey('');
    setPairingCode('');
    setShowForm(true);
  };

  const openEdit = (camera: Camera) => {
    setEditingId(camera._id);
    setForm({
      name: camera.name,
      description: camera.description || '',
      source_type: camera.source_type,
      purpose: camera.purpose,
      stream_path: camera.stream_path || '',
      playback_url: camera.playback_url,
      snapshot_url: camera.snapshot_url || '',
      farming_area: camera.farming_area?._id,
      product: camera.product?._id,
      location: camera.location || '',
      is_enabled: camera.is_enabled,
      status_override: camera.status_override,
    });
    setIngestKey('');
    setPairingCode(camera.code);
    setShowForm(true);
  };

  const save = async (event: React.FormEvent) => {
    event.preventDefault();
    setBusy(true);
    setError('');
    try {
      if (editingId) {
        await cameraApi.update(editingId, form);
        setShowForm(false);
      } else {
        const response = await cameraApi.create(form);
        setIngestKey(response.data.ingest_key);
        setPairingCode(response.data.camera.code);
      }
      await load();
    } catch (saveError) {
      setError(messageOf(saveError));
    } finally {
      setBusy(false);
    }
  };

  const remove = async (camera: Camera) => {
    if (!window.confirm(`Xóa camera “${camera.name}”? Camera và lịch sử tác vụ liên quan sẽ bị xóa. Thao tác này không thể hoàn tác.`)) return;
    try {
      await cameraApi.remove(camera._id);
      setSelectedId('');
      await load();
    } catch (removeError) {
      setError(messageOf(removeError));
    }
  };

  const rotateKey = async (camera: Camera) => {
    if (!window.confirm(`Tạo ingest key mới cho “${camera.name}”? Key cũ sẽ ngừng hoạt động ngay.`)) return;
    setBusy(true);
    try {
      const response = await cameraApi.rotateKey(camera._id);
      openEdit(camera);
      setIngestKey(response.data.ingest_key);
    } catch (rotateError) {
      setError(messageOf(rotateError));
    } finally {
      setBusy(false);
    }
  };

  const runSelectedTask = async () => {
    if (!selected || !selectedTask) return;
    setBusy(true);
    setError('');
    try {
      await cameraApi.run(selected._id, selectedTask.key, image);
      setImage(undefined);
      await loadRuns();
    } catch (runError) {
      setError(messageOf(runError));
    } finally {
      setBusy(false);
    }
  };

  const toggleFullscreen = async () => {
    try {
      if (document.fullscreenElement) {
        await document.exitFullscreen();
      } else {
        await stageViewportRef.current?.requestFullscreen();
      }
    } catch (fullscreenError) {
      setError(messageOf(fullscreenError));
    }
  };

  return (
    <div className="camera-monitor-page">
      <header className="monitor-toolbar">
        <div className="monitor-toolbar__identity">
          {viewMode === 'focus' && (
            <button
              type="button"
              className={`monitor-icon-button${navigatorOpen ? ' is-active' : ''}`}
              onClick={() => setNavigatorOpen((value) => !value)}
              aria-label={navigatorOpen ? 'Ẩn danh sách camera' : 'Hiện danh sách camera'}
              aria-pressed={navigatorOpen}
            >
              ☰
            </button>
          )}
          <div>
            <span className="camera-eyebrow">Camera nông trại</span>
            <h1>Giám sát trực tiếp</h1>
          </div>
        </div>


        <div className="monitor-toolbar__actions">
          <div className="monitor-view-toggle" aria-label="Chế độ hiển thị">
            <button type="button" className={viewMode === 'focus' ? 'is-active' : ''} onClick={() => setViewMode('focus')}>Tập trung</button>
            <button type="button" className={viewMode === 'grid' ? 'is-active' : ''} onClick={() => setViewMode('grid')}>Lưới</button>
          </div>
          <button
            type="button"
            className="camera-button camera-button--primary"
            onClick={openCreate}
            disabled={!farmingAreas.length}
          >
            Thêm camera
          </button>
        </div>
      </header>

      {error && <div className="camera-alert" role="alert">{error}</div>}
      {!farmingAreas.length && <div className="camera-notice">Cần tạo vùng trồng trước khi thêm camera giám sát.</div>}

      {viewMode === 'grid' && (
        <section className="monitor-filterbar" aria-label="Bộ lọc camera">
          <input
            type="search"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Tìm tên, vị trí, mã camera…"
            aria-label="Tìm camera"
          />
          <select value={areaFilter} onChange={(event) => setAreaFilter(event.target.value)} aria-label="Lọc theo vùng trồng">
            <option value="">Tất cả vùng trồng</option>
            {farmingAreas.map((area) => <option key={area._id} value={area._id}>{area.name}</option>)}
          </select>
          <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)} aria-label="Lọc theo trạng thái">
            <option value="">Mọi trạng thái</option>
            <option value="online">Đang hoạt động</option>
            <option value="offline">Mất kết nối</option>
            <option value="maintenance">Đang bảo trì</option>
          </select>
          <span>{visibleCameras.length} camera phù hợp</span>
        </section>
      )}

      {viewMode === 'focus' ? (
        <div className={`monitor-focus${navigatorOpen ? '' : ' is-navigator-hidden'}${selectedTask ? ' has-ai-panel' : ''}`}>
          {navigatorOpen && (
            <CameraNavigator
              cameras={visibleCameras}
              farmingAreas={farmingAreas}
              selectedId={selected?._id || ''}
              search={search}
              areaFilter={areaFilter}
              statusFilter={statusFilter}
              onSearchChange={setSearch}
              onAreaFilterChange={setAreaFilter}
              onStatusFilterChange={setStatusFilter}
              onSelect={(cameraId) => {
                setSelectedId(cameraId);
                setAiMenuOpen(false);
              }}
              onClose={() => setNavigatorOpen(false)}
            />
          )}

          <main className="monitor-stage">
            {selected ? (
              <section className="camera-stage" aria-label={`Camera ${selected.name}`}>
                <div className="camera-stage__header">
                  <div className="camera-stage__identity">
                    <div>
                      <span className={`camera-status camera-status--${selected.status}`} aria-hidden="true" />
                      <h2>{selected.name}</h2>
                    </div>
                    <p>{selected.farming_area?.name || 'Chưa gắn vùng trồng'} · {selected.location || purposeLabels[selected.purpose]}</p>
                  </div>

                  <div className="camera-stage__actions">
                    <button type="button" className="camera-stage__fullscreen" onClick={toggleFullscreen}>
                      {isFullscreen ? 'Thoát toàn màn hình' : 'Toàn màn hình'}
                    </button>
                    <div className="camera-ai-control">
                      <button
                        type="button"
                        className={`camera-ai-trigger${selectedTask ? ' is-active' : ''}`}
                        onClick={() => setAiMenuOpen((value) => !value)}
                        aria-expanded={aiMenuOpen}
                      >
                        {selectedTask ? selectedTask.name : 'Chọn tác vụ AI'}
                      </button>
                      {aiMenuOpen && (
                        <div className="camera-ai-menu">
                          <strong>Tác vụ theo yêu cầu</strong>
                          <span>AI không chạy cho đến khi bạn chọn.</span>
                          {tasks.map((task) => (
                            <button
                              type="button"
                              key={task.key}
                              onClick={() => {
                                setMode(task.key);
                                setAiMenuOpen(false);
                              }}
                            >
                              <strong>{task.name}</strong>
                              <small>{task.description}</small>
                            </button>
                          ))}
                          {!tasks.length && <small>Chưa có tác vụ AI khả dụng.</small>}
                        </div>
                      )}
                    </div>

                    <details className="camera-action-menu">
                      <summary>Quản lý</summary>
                      <div>
                        <button type="button" onClick={() => openEdit(selected)}>Chỉnh sửa camera</button>
                        {selected.source_type === 'phone' && <button type="button" onClick={() => navigator.clipboard.writeText(selected.code)}>Sao chép mã ghép</button>}
                        {selected.source_type !== 'phone' && <button type="button" onClick={() => rotateKey(selected)}>Tạo lại khóa kết nối</button>}
                        <button type="button" className="danger" onClick={() => remove(selected)}>Xóa camera</button>
                      </div>
                    </details>
                  </div>
                </div>

                <div className="camera-stage__viewport" ref={stageViewportRef}>
                  <CameraFeed camera={selected} aiTaskKey={selectedTask?.key} />

                </div>

                <div className="camera-stage__footer">
                  <div><span>Nguồn</span><strong>{sourceLabels[selected.source_type]}</strong></div>
                  <div><span>Mục đích</span><strong>{purposeLabels[selected.purpose]}</strong></div>
                  {selected.source_type === 'phone' && <div><span>Mã ghép</span><code>{selected.code}</code></div>}
                <div className="camera-stage__hint">
                  {selectedTask ? `${selectedTask.name} đang hoạt động.` : 'AI đang tắt mặc định. Chọn tác vụ khi cần phân tích.'}
                </div>
                </div>

                {selected.last_error && <div className="camera-alert camera-alert--inside">Không thể phát camera: {selected.last_error}</div>}
              </section>
            ) : (
              <div className="camera-empty camera-empty--stage">Không có camera phù hợp với bộ lọc hiện tại.</div>
            )}
          </main>

          {selected && selectedTask && (
            <aside className="camera-ai-panel" aria-label={`Tác vụ ${selectedTask.name}`}>
              <header>
                <div>
                  <span className="camera-eyebrow">Phân tích theo yêu cầu</span>
                  <h2>{selectedTask.name}</h2>
                </div>
                <button type="button" onClick={() => setMode('')} aria-label="Đóng tác vụ AI">×</button>
              </header>

              <p className="camera-ai-panel__description">{selectedTask.description}</p>

              <button type="button" className="camera-button camera-button--primary camera-ai-panel__run" disabled={busy} onClick={runSelectedTask}>
                {busy ? 'Đang phân tích…' : image ? 'Phân tích ảnh đã chọn' : 'Phân tích khung hình hiện tại'}
              </button>

              <label className="camera-ai-upload">
                <span>Dùng ảnh khác</span>
                <input type="file" accept="image/jpeg,image/png,image/webp" onChange={(event) => setImage(event.target.files?.[0])} />
                <small>{image ? image.name : 'Để trống để dùng khung hình mới nhất.'}</small>
              </label>

              <div className="camera-ai-warning">
                Kết quả AI chỉ hỗ trợ sàng lọc, không thay thế kết luận chuyên môn.
              </div>

              {latest?.result?.warnings?.map((warning) => (
                <div className="camera-ai-warning" key={warning}>{warning}</div>
              ))}

              {topDisease && latest && (
                <article className={`camera-ai-result camera-ai-result--${topDisease.risk_level}`}>
                  {latest.frame_url && <img src={latest.frame_url} alt="Khung hình được phân tích" />}
                  <div>
                    <span>Độ tin cậy {(topDisease.confidence * 100).toFixed(1)}%</span>
                    <h3>{topDisease.disease_name}</h3>
                    <p>{topDisease.description}</p>
                    {(topDisease.recommendations?.length || 0) > 0 && <ul>{topDisease.recommendations.map((item) => <li key={item}>{item}</li>)}</ul>}
                  </div>
                </article>
              )}

              {latest?.status === 'failed' && <div className="camera-alert">{latest.error}</div>}

              <section className="camera-ai-history">
                <h3>Lịch sử gần đây</h3>
                {runs.slice(0, 8).map((run) => (
                  <div key={run._id}>
                    <span>{formatTime(run.createdAt)}</span>
                    <strong>{run.result?.top_disease?.disease_name || run.error || run.status}</strong>
                    <em>{run.confidence ? `${(run.confidence * 100).toFixed(1)}%` : ''}</em>
                  </div>
                ))}
                {!runs.length && <div className="camera-empty">Chưa có lần phân tích nào.</div>}
              </section>
            </aside>
          )}
        </div>
      ) : (
        <main className="monitor-grid-workspace">
          <div className={`camera-grid camera-grid--${Math.min(gridCameras.length, 5)}`}>
            {gridCameras.map((camera) => (
              <article
                className="camera-grid-card"
                key={camera._id}
                role="button"
                tabIndex={0}
                onClick={() => {
                  setSelectedId(camera._id);
                  setViewMode('focus');
                  setNavigatorOpen(false);
                }}
                onKeyDown={(event) => {
                  if (event.key === 'Enter' || event.key === ' ') {
                    event.preventDefault();
                    setSelectedId(camera._id);
                    setViewMode('focus');
                    setNavigatorOpen(false);
                  }
                }}
              >
                <div className="camera-grid-card__feed">
                  <CameraFeed camera={camera} compact />
                  <header>
                    <div>
                      <span className={`camera-status camera-status--${camera.status}`} aria-hidden="true" />
                      <strong>{camera.name}</strong>
                    </div>
                    <small className={`camera-grid-card__state camera-grid-card__state--${camera.status}`}>{statusLabels[camera.status]}</small>
                  </header>
                  <footer>
                    <span>{camera.farming_area?.name || camera.location || purposeLabels[camera.purpose]}</span>
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedId(camera._id);
                        setViewMode('focus');
                        setNavigatorOpen(false);
                      }}
                    >
                      Mở tập trung
                    </button>
                  </footer>
                </div>
              </article>
            ))}
          </div>

          {!visibleCameras.length && <div className="camera-empty camera-empty--stage">Không tìm thấy camera phù hợp.</div>}
          {gridPageCount > 1 && (
            <nav className="camera-grid-pagination" aria-label="Phân trang camera">
              <button type="button" disabled={gridPage === 0} onClick={() => setGridPage((page) => Math.max(0, page - 1))}>Trang trước</button>
              <span>Trang {gridPage + 1} / {gridPageCount}</span>
              <button type="button" disabled={gridPage >= gridPageCount - 1} onClick={() => setGridPage((page) => Math.min(gridPageCount - 1, page + 1))}>Trang sau</button>
            </nav>
          )}
        </main>
      )}

      {showForm && (
        <div className="camera-modal" role="dialog" aria-modal="true" aria-label="Cấu hình camera">
          <form className="camera-form" onSubmit={save}>
            <header><div><h2>{editingId ? 'Cấu hình điểm quan sát' : 'Thêm camera cho vùng trồng'}</h2><p>Camera phải thuộc một vùng sản xuất và có mục đích quan sát rõ ràng.</p></div><button type="button" onClick={() => setShowForm(false)} aria-label="Đóng">×</button></header>
            <label>Vùng trồng<select required value={form.farming_area || ''} onChange={(event) => setForm({ ...form, farming_area: event.target.value })}><option value="">Chọn vùng trồng</option>{farmingAreas.map((area) => <option key={area._id} value={area._id}>{area.name} · {area.address}</option>)}</select></label>
            <label>Mục đích quan sát<select value={form.purpose} onChange={(event) => setForm({ ...form, purpose: event.target.value as Camera['purpose'] })}>{Object.entries(purposeLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
            <label>Tên điểm quan sát<input required value={form.name} placeholder="Ví dụ: Camera luống cà chua số 1" onChange={(event) => setForm({ ...form, name: event.target.value })} /></label>
            <label>Loại nguồn<select value={form.source_type} onChange={(event) => setForm({ ...form, source_type: event.target.value as Camera['source_type'] })}><option value="mediamtx">MediaMTX / RTSP</option><option value="webrtc">WebRTC</option><option value="hls">HLS</option><option value="mjpeg">MJPEG</option><option value="phone">Điện thoại qua Tailscale</option></select></label>
            {form.source_type !== 'phone' && <>
              <label>Stream path<input value={form.stream_path || ''} placeholder="nha-kinh-01" onChange={(event) => setForm({ ...form, stream_path: event.target.value })} /></label>
              <label>Playback URL<input value={form.playback_url || ''} placeholder="Để trống nếu dùng stream path MediaMTX" onChange={(event) => setForm({ ...form, playback_url: event.target.value })} /></label>
              <label>RTSP/source URL<input value={form.source_url || ''} placeholder="rtsp://camera/stream" onChange={(event) => setForm({ ...form, source_url: event.target.value })} /></label>
              <label>Snapshot URL<input value={form.snapshot_url || ''} placeholder="http://camera/snapshot.jpg (không bắt buộc)" onChange={(event) => setForm({ ...form, snapshot_url: event.target.value })} /></label>
              <label>Tài khoản camera<input value={form.username || ''} autoComplete="off" onChange={(event) => setForm({ ...form, username: event.target.value })} /></label>
              <label>Mật khẩu camera<input type="password" value={form.password || ''} autoComplete="new-password" onChange={(event) => setForm({ ...form, password: event.target.value })} /></label>
            </>}
            <label>Vị trí lắp đặt<input value={form.location || ''} placeholder="Ví dụ: Cột phía Đông, nhìn về khu tưới A" onChange={(event) => setForm({ ...form, location: event.target.value })} /></label>
            <label>Trạng thái<select value={form.status_override} onChange={(event) => setForm({ ...form, status_override: event.target.value as Camera['status_override'] })}><option value="auto">Tự động theo heartbeat</option><option value="online">Buộc online</option><option value="offline">Buộc offline</option><option value="maintenance">Bảo trì</option></select></label>
            <label className="camera-checkbox"><input type="checkbox" checked={form.is_enabled !== false} onChange={(event) => setForm({ ...form, is_enabled: event.target.checked })} />Camera đang bật</label>
              {form.source_type === 'phone' && pairingCode && (
                <div className="camera-key camera-key--pairing">
                  <strong>Mã ghép camera trên điện thoại</strong>
                  <code>{pairingCode}</code>
                  <small>Nhập mã bắt đầu bằng CAM- này vào ứng dụng Phone Camera. Không nhập ingest key.</small>
                </div>
              )}
              {form.source_type !== 'phone' && ingestKey && (
                <div className="camera-key">
                  <strong>Ingest key chỉ hiển thị một lần</strong>
                  <code>{ingestKey}</code>
                  <small>Khóa bí mật này chỉ dùng cho agent heartbeat, không phải mã ghép camera.</small>
                </div>
              )}
            <footer><button type="button" onClick={() => setShowForm(false)}>Đóng</button><button className="camera-button camera-button--primary" disabled={busy}>{busy ? 'Đang lưu...' : 'Lưu camera'}</button></footer>
          </form>
        </div>
      )}
    </div>
  );
};

export default CameraPage;
