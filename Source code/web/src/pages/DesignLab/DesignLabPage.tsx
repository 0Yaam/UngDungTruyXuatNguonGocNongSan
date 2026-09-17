import React, { useMemo, useState } from 'react';
import './DesignLabPage.css';

type DesignConcept = {
  id: string;
  name: string;
  tone: string;
  bestFor: string;
  description: string;
  palette: string[];
  metrics: Array<{ label: string; value: string; trend: string }>;
  modules: Array<{ label: string; value: string }>;
  timeline: Array<{ step: string; label: string; status: string }>;
  image: string;
};

const concepts: DesignConcept[] = [
  {
    id: 'ops-console',
    name: 'Ops Console',
    tone: 'Gọn, chuyên nghiệp, nhiều dữ liệu',
    bestFor: 'Quản trị, dashboard vận hành, kiểm nghiệm',
    description:
      'Tập trung vào bảng điều khiển, trạng thái lô, cảnh báo và thao tác nhanh. Phù hợp nếu hệ thống dùng thường xuyên bởi quản lý hoặc nhân viên vận hành.',
    palette: ['#102a43', '#1d6f5f', '#f2b84b', '#f8faf7'],
    metrics: [
      { label: 'Lô đang theo dõi', value: '128', trend: '+12%' },
      { label: 'Đạt kiểm nghiệm', value: '94%', trend: '+4%' },
      { label: 'Cảnh báo', value: '7', trend: '-3' },
    ],
    modules: [
      { label: 'Canh tác', value: '42 lô' },
      { label: 'Đóng gói', value: '18 lô' },
      { label: 'Vận chuyển', value: '11 tuyến' },
    ],
    timeline: [
      { step: '01', label: 'Gieo trồng', status: 'Hoàn tất' },
      { step: '02', label: 'Kiểm nghiệm', status: 'Đang xử lý' },
      { step: '03', label: 'Xuất kho', status: 'Sẵn sàng' },
    ],
    image: '/sample-media/fruit-packaging.png',
  },
  {
    id: 'fresh-market',
    name: 'Fresh Market',
    tone: 'Sáng, thân thiện, dễ hiểu',
    bestFor: 'Trang public truy xuất QR, người tiêu dùng',
    description:
      'Ưu tiên hình ảnh sản phẩm, chứng nhận và hành trình lô nông sản. Giao diện mềm hơn để khách hàng quét QR thấy tin cậy ngay.',
    palette: ['#f7fbf2', '#2f8f5b', '#f08a4b', '#22332a'],
    metrics: [
      { label: 'Điểm minh bạch', value: '98', trend: 'A+' },
      { label: 'Ngày thu hoạch', value: '09/07', trend: 'Mới' },
      { label: 'Chứng nhận', value: '5', trend: '+2' },
    ],
    modules: [
      { label: 'Nguồn gốc', value: 'Đà Lạt' },
      { label: 'Vườn trồng', value: '12.5 ha' },
      { label: 'Lưu kho', value: '6 giờ' },
    ],
    timeline: [
      { step: '01', label: 'Vùng trồng', status: 'Đã xác thực' },
      { step: '02', label: 'Thu hoạch', status: 'Có ảnh' },
      { step: '03', label: 'Đóng gói', status: 'Có QR' },
    ],
    image: '/sample-media/cherry-tomatoes.png',
  },
  {
    id: 'chain-map',
    name: 'Chain Map',
    tone: 'Hiện đại, nổi bật luồng cung ứng',
    bestFor: 'Chuỗi cung ứng, truy vết liên tổ chức',
    description:
      'Biến hành trình sản phẩm thành bản đồ luồng rõ ràng, giúp nhìn nhanh điểm chuyển giao, đơn vị phụ trách và bằng chứng blockchain.',
    palette: ['#0f172a', '#22c55e', '#38bdf8', '#f8fafc'],
    metrics: [
      { label: 'Điểm chuyển giao', value: '9', trend: 'Live' },
      { label: 'Hash hợp lệ', value: '100%', trend: 'OK' },
      { label: 'Thời gian vận chuyển', value: '18h', trend: '-2h' },
    ],
    modules: [
      { label: 'Nông trại', value: 'Farm A' },
      { label: 'Kho lạnh', value: 'Hub 03' },
      { label: 'Đại lý', value: 'Store 21' },
    ],
    timeline: [
      { step: '01', label: 'Farm', status: 'Signed' },
      { step: '02', label: 'Hub', status: 'Verified' },
      { step: '03', label: 'Store', status: 'Delivered' },
    ],
    image: '/sample-media/hydroponic-lettuce.png',
  },
  {
    id: 'quality-lab',
    name: 'Quality Lab',
    tone: 'Sạch, khoa học, tập trung kiểm định',
    bestFor: 'Kiểm nghiệm chất lượng, chứng nhận, hồ sơ QA',
    description:
      'Tổ chức giao diện quanh mẫu kiểm định, chỉ số chất lượng và hồ sơ chứng nhận. Phù hợp nếu bạn muốn màn kiểm nghiệm nhìn nghiêm túc, rõ đạt/chưa đạt.',
    palette: ['#f8fafc', '#2563eb', '#14b8a6', '#f59e0b'],
    metrics: [
      { label: 'Mẫu đạt', value: '42', trend: '+8' },
      { label: 'Độ tin cậy', value: '99%', trend: 'Lab' },
      { label: 'Chờ duyệt', value: '6', trend: 'Ký số' },
    ],
    modules: [
      { label: 'Dư lượng', value: 'Đạt' },
      { label: 'Vi sinh', value: 'An toàn' },
      { label: 'Hồ sơ', value: '5 tệp' },
    ],
    timeline: [
      { step: '01', label: 'Lấy mẫu', status: 'Đủ điều kiện' },
      { step: '02', label: 'Phân tích', status: 'Đang chạy' },
      { step: '03', label: 'Duyệt QA', status: 'Chờ ký' },
    ],
    image: '/sample-media/agritrace-hero.png',
  },
  {
    id: 'field-mobile',
    name: 'Field Mobile',
    tone: 'Nhanh, rõ, tối ưu thao tác ngoài hiện trường',
    bestFor: 'Nông hộ, nhân viên ghi nhật ký, dùng nhiều trên điện thoại',
    description:
      'Tập trung vào nút thao tác lớn, form ngắn và trạng thái đồng bộ. Phù hợp nếu web cần thân thiện hơn với người dùng ngoài ruộng hoặc kho.',
    palette: ['#fffaf0', '#b45309', '#16a34a', '#292524'],
    metrics: [
      { label: 'Nhật ký hôm nay', value: '18', trend: 'Sync' },
      { label: 'Ảnh hiện trường', value: '64', trend: '+9' },
      { label: 'Chờ mạng', value: '3', trend: 'Offline' },
    ],
    modules: [
      { label: 'Tưới nước', value: '1 chạm' },
      { label: 'Chụp ảnh', value: 'GPS' },
      { label: 'Đồng bộ', value: 'Tự động' },
    ],
    timeline: [
      { step: '01', label: 'Ghi nhanh', status: 'Đã lưu' },
      { step: '02', label: 'Ảnh bằng chứng', status: 'Có GPS' },
      { step: '03', label: 'Blockchain', status: 'Chờ mạng' },
    ],
    image: '/sample-media/mango-harvest.png',
  },
];

const DesignLabPage: React.FC = () => {
  const [selectedId, setSelectedId] = useState(() => localStorage.getItem('agritrace-design-concept') || concepts[0].id);
  const selectedConcept = useMemo(
    () => concepts.find((concept) => concept.id === selectedId) || concepts[0],
    [selectedId]
  );

  const handleSelect = (id: string) => {
    setSelectedId(id);
    localStorage.setItem('agritrace-design-concept', id);
  };

  return (
    <div className="design-lab">
      <section className="design-lab__hero">
        <div>
          <p className="design-lab__eyebrow">AgriTrace UI direction</p>
          <h1>Chọn bản thiết kế giao diện web</h1>
          <p>
            Năm hướng giao diện dưới đây mô phỏng cách dashboard, truy xuất QR, chuỗi cung ứng, kiểm nghiệm và mobile có thể được làm mới.
            Chọn một concept để lưu làm phương án ưu tiên.
          </p>
        </div>
        <div className="design-lab__selected">
          <span>Đang chọn</span>
          <strong>{selectedConcept.name}</strong>
          <small>{selectedConcept.bestFor}</small>
        </div>
      </section>

      <section className="design-lab__grid" aria-label="Danh sách bản thiết kế">
        {concepts.map((concept) => {
          const active = concept.id === selectedId;
          return (
            <article className={`design-card${active ? ' is-active' : ''}`} key={concept.id}>
              <div className="design-card__visual" style={{ backgroundImage: `url(${concept.image})` }}>
                <div className="design-card__mock">
                  <div className="mock-header">
                    <span />
                    <span />
                    <span />
                  </div>
                  <div className="mock-body">
                    <div className="mock-side">
                      <i />
                      <i />
                      <i />
                    </div>
                    <div className="mock-content">
                      <b />
                      <b />
                      <div className="mock-chart">
                        <span />
                        <span />
                        <span />
                        <span />
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="design-card__content">
                <div className="design-card__title">
                  <div>
                    <h2>{concept.name}</h2>
                    <span>{concept.tone}</span>
                  </div>
                  <button
                    type="button"
                    className="design-card__choose"
                    aria-pressed={active}
                    onClick={() => handleSelect(concept.id)}
                  >
                    {active ? 'Đã chọn' : 'Chọn'}
                  </button>
                </div>

                <p>{concept.description}</p>

                <div className="design-card__palette" aria-label={`Bảng màu ${concept.name}`}>
                  {concept.palette.map((color) => (
                    <span key={color} style={{ backgroundColor: color }} title={color} />
                  ))}
                </div>
              </div>
            </article>
          );
        })}
      </section>

      <section className={`design-preview design-preview--${selectedConcept.id}`}>
        <div className="design-preview__toolbar">
          <div>
            <span>Preview</span>
            <h2>{selectedConcept.name}</h2>
          </div>
          <div className="design-preview__chips">
            <span>Desktop</span>
            <span>Dashboard</span>
            <span>Responsive</span>
          </div>
        </div>

        <div className="design-preview__screen">
          <aside className="preview-sidebar">
            <strong>AgriTrace</strong>
            <span>Tổng quan</span>
            <span>Lô nông sản</span>
            <span>Kiểm nghiệm</span>
            <span>Blockchain</span>
          </aside>

          <div className="preview-main">
            <div className="preview-cover" style={{ backgroundImage: `url(${selectedConcept.image})` }}>
              <div>
                <span>{selectedConcept.tone}</span>
                <h3>{selectedConcept.bestFor}</h3>
              </div>
            </div>

            <div className="preview-metrics">
              {selectedConcept.metrics.map((metric) => (
                <div key={metric.label}>
                  <span>{metric.label}</span>
                  <strong>{metric.value}</strong>
                  <small>{metric.trend}</small>
                </div>
              ))}
            </div>

            <div className="preview-lower">
              <div className="preview-panel">
                <h3>Module chính</h3>
                {selectedConcept.modules.map((module) => (
                  <div className="preview-row" key={module.label}>
                    <span>{module.label}</span>
                    <strong>{module.value}</strong>
                  </div>
                ))}
              </div>

              <div className="preview-panel">
                <h3>Hành trình lô</h3>
                {selectedConcept.timeline.map((item) => (
                  <div className="preview-step" key={item.step}>
                    <span>{item.step}</span>
                    <div>
                      <strong>{item.label}</strong>
                      <small>{item.status}</small>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};

export default DesignLabPage;
