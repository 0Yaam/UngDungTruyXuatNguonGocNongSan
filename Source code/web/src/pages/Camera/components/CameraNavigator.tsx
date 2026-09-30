import React from 'react';
import { Camera } from '../../../core/api/camera.api';
import { FarmingArea } from '../../../core/api/farmingArea.api';
import { purposeLabels, statusLabels } from '../cameraUi';

interface CameraNavigatorProps {
  cameras: Camera[];
  farmingAreas: FarmingArea[];
  selectedId: string;
  search: string;
  areaFilter: string;
  statusFilter: string;
  onSearchChange: (value: string) => void;
  onAreaFilterChange: (value: string) => void;
  onStatusFilterChange: (value: string) => void;
  onSelect: (cameraId: string) => void;
  onClose?: () => void;
}

const CameraNavigator: React.FC<CameraNavigatorProps> = ({
  cameras,
  farmingAreas,
  selectedId,
  search,
  areaFilter,
  statusFilter,
  onSearchChange,
  onAreaFilterChange,
  onStatusFilterChange,
  onSelect,
  onClose,
}) => (
  <aside className="camera-navigator" aria-label="Danh sách camera">
    <div className="camera-navigator__heading">
      <div>
        <strong>Danh sách camera</strong>
        <span>{cameras.length} kết quả</span>
      </div>
      {onClose && <button type="button" onClick={onClose} aria-label="Đóng danh sách camera">×</button>}
    </div>

    <div className="camera-navigator__filters">
      <label className="camera-search">
        <span className="sr-only">Tìm camera</span>
        <input
          type="search"
          value={search}
          onChange={(event) => onSearchChange(event.target.value)}
          placeholder="Tìm tên, vị trí, mã camera…"
        />
      </label>
      <div>
        <select value={areaFilter} onChange={(event) => onAreaFilterChange(event.target.value)} aria-label="Lọc theo vùng trồng">
          <option value="">Tất cả vùng trồng</option>
          {farmingAreas.map((area) => <option key={area._id} value={area._id}>{area.name}</option>)}
        </select>
        <select value={statusFilter} onChange={(event) => onStatusFilterChange(event.target.value)} aria-label="Lọc theo trạng thái">
          <option value="">Mọi trạng thái</option>
          <option value="online">Đang hoạt động</option>
          <option value="offline">Mất kết nối</option>
          <option value="maintenance">Đang bảo trì</option>
        </select>
      </div>
    </div>

    <div className="camera-navigator__list">
      {cameras.map((camera) => (
        <button
          type="button"
          key={camera._id}
          className={`camera-nav-item${selectedId === camera._id ? ' is-active' : ''}`}
          onClick={() => onSelect(camera._id)}
        >
          <span className={`camera-status camera-status--${camera.status}`} aria-hidden="true" />
          <span className="camera-nav-item__body">
            <strong>{camera.name}</strong>
            <small>{camera.farming_area?.name || camera.location || purposeLabels[camera.purpose]}</small>
          </span>
          <span className={`camera-nav-item__state camera-nav-item__state--${camera.status}`}>{statusLabels[camera.status]}</span>
        </button>
      ))}
      {!cameras.length && <div className="camera-empty">Không tìm thấy camera phù hợp.</div>}
    </div>
  </aside>
);

export default React.memo(CameraNavigator);
