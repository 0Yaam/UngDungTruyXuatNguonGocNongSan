import React, {
  ChangeEvent,
  FormEvent,
  useEffect,
  useMemo,
  useState,
} from 'react';
import { diseaseDetectionApi } from '../../core/api/diseaseDetection.api';
import { productApi } from '../../core/api/product.api';
import { useAuth } from '../../core/hooks/useAuth';
import type {
  DiseaseAnalysisStatus,
  DiseaseCandidate,
  DiseaseDetection,
  DiseaseDetectionCapabilities,
  DiseaseRiskLevel,
  DiseaseSupportedCrop,
  Product,
  User,
} from '../../core/types';
import './DiseaseDetectionPage.css';

const symptomOptions = [
  'Vàng lá',
  'Đốm nâu',
  'Cháy lá',
  'Héo rũ',
  'Thối rễ',
  'Phấn trắng',
  'Lỗ thủng trên lá',
  'Rệp hoặc côn trùng',
  'Xoăn lá',
  'Chậm lớn',
];

const acceptedImageTypes = ['image/jpeg', 'image/png', 'image/webp'];
const maxFileSize = 5 * 1024 * 1024;
const frontendMaxImages = 3;

const riskLabels: Record<DiseaseRiskLevel, string> = {
  low: 'Rủi ro thấp',
  medium: 'Cần theo dõi',
  high: 'Nguy cơ cao',
};

const analysisLabels: Record<DiseaseAnalysisStatus, string> = {
  completed: 'AI đã phân tích',
  inconclusive: 'Chưa đủ cơ sở',
  legacy: 'Kết quả cũ',
};

const normalizeText = (value: string) =>
  value
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();

const getAnalysisStatus = (item: DiseaseDetection): DiseaseAnalysisStatus => {
  if (item.analysis_status) return item.analysis_status;
  if (item.inference_engine === 'rules' || item.model_version?.includes('rules')) {
    return 'legacy';
  }
  return 'completed';
};

const getEntityId = (value?: string | User) => {
  if (!value) return '';
  if (typeof value === 'string') return value;
  return value._id || value.userId || '';
};

const getCropMatch = (
  product: Product,
  crops: DiseaseSupportedCrop[]
): DiseaseSupportedCrop | undefined => {
  if (product.type !== 'Plant') return undefined;
  const source = normalizeText(`${product.name} ${product.category}`);

  return crops.find((crop) =>
    [crop.label, crop.code, ...crop.aliases].some((alias) => {
      const normalizedAlias = normalizeText(alias);
      return normalizedAlias.length > 1 && source.includes(normalizedAlias);
    })
  );
};

const getApiErrorMessage = (error: any, fallback: string) => {
  const status = error?.statusCode || error?.status || error?.response?.status;
  const code = String(
    error?.code || error?.response?.data?.code || ''
  ).toUpperCase();
  const rawMessage = String(
    error?.message ||
      error?.msg ||
      error?.response?.data?.message ||
      error?.response?.data?.msg ||
      ''
  );
  const normalized = normalizeText(rawMessage);

  if (
    status === 413 ||
    code === 'IMAGE_TOO_LARGE' ||
    code === 'TOO_MANY_IMAGES' ||
    normalized.includes('file too large')
  ) {
    if (code === 'TOO_MANY_IMAGES') {
      return 'Mỗi lần phân tích chỉ được tải tối đa 3 ảnh.';
    }
    return 'Ảnh tải lên quá lớn. Mỗi ảnh phải có dung lượng không quá 5 MB.';
  }
  if (code === 'IMAGE_REQUIRED') {
    return 'Vui lòng tải ít nhất 1 ảnh cây trồng để mô hình phân tích.';
  }
  if (code === 'INVALID_IMAGE') {
    return 'Ảnh không hợp lệ hoặc không thể đọc được. Hãy dùng ảnh JPEG, PNG hoặc WebP rõ nét, tối đa 5 MB.';
  }
  if (
    code === 'MODEL_UNAVAILABLE' ||
    code === 'AI_MODEL_UNAVAILABLE' ||
    code === 'MODEL_OUTPUT_INVALID'
  ) {
    return code === 'MODEL_OUTPUT_INVALID'
      ? 'Mô hình chưa thể đọc kết quả ảnh này. Vui lòng thử ảnh khác hoặc thử lại sau.'
      : 'Mô hình AI chưa sẵn sàng. Vui lòng thử lại sau hoặc liên hệ quản trị viên.';
  }
  if (code === 'UNSUPPORTED_CROP') {
    return 'Loại cây của lô đã chọn chưa được mô hình AI hỗ trợ.';
  }
  if (code === 'CROP_MISMATCH' || code === 'IMAGE_CROP_MISMATCH') {
    return 'Hình ảnh có vẻ không khớp với loại cây của lô đã chọn. Hãy kiểm tra lại lô hoặc dùng ảnh khác.';
  }
  if (
    normalized.includes('model') &&
    (normalized.includes('ready') ||
      normalized.includes('available') ||
      normalized.includes('san sang'))
  ) {
    return 'Mô hình AI chưa sẵn sàng. Vui lòng thử lại sau hoặc liên hệ quản trị viên.';
  }
  if (
    normalized.includes('unsupported') ||
    normalized.includes('khong ho tro') ||
    normalized.includes('animal product')
  ) {
    return 'Lô đã chọn chưa được mô hình AI hỗ trợ. Hiện hệ thống chỉ phân tích các cây có trong danh sách hỗ trợ.';
  }
  if (
    normalized.includes('image') ||
    normalized.includes('anh') ||
    normalized.includes('mimetype') ||
    normalized.includes('file type')
  ) {
    return 'Ảnh không hợp lệ. Hãy dùng 1–3 ảnh JPEG, PNG hoặc WebP, tối đa 5 MB mỗi ảnh.';
  }
  if (status === 403 || normalized.includes('khong co quyen')) {
    return 'Bạn không có quyền thực hiện thao tác này.';
  }
  if (!status && (normalized.includes('network') || !rawMessage)) {
    return 'Không thể kết nối tới máy chủ. Vui lòng kiểm tra kết nối và thử lại.';
  }
  return rawMessage || fallback;
};

const resolveImageUrl = (path: string) => {
  if (/^(https?:|blob:|data:)/i.test(path)) return path;
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  const configuredApi = process.env.REACT_APP_API_URL;
  if (!configuredApi || !/^https?:/i.test(configuredApi)) return normalizedPath;
  return `${configuredApi.replace(/\/api\/v1\/?$/, '')}${normalizedPath}`;
};

const fileKey = (file: File) =>
  `${file.name}-${file.size}-${file.lastModified}-${file.type}`;

const DiseaseDetectionPage: React.FC = () => {
  const { user } = useAuth();
  const [products, setProducts] = useState<Product[]>([]);
  const [detections, setDetections] = useState<DiseaseDetection[]>([]);
  const [capabilities, setCapabilities] =
    useState<DiseaseDetectionCapabilities | null>(null);
  const [productCapability, setProductCapability] =
    useState<DiseaseDetectionCapabilities | null>(null);
  const [loading, setLoading] = useState(true);
  const [capabilityLoading, setCapabilityLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [capabilityError, setCapabilityError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [imageError, setImageError] = useState('');
  const [productId, setProductId] = useState('');
  const [selectedSymptoms, setSelectedSymptoms] = useState<string[]>([]);
  const [notes, setNotes] = useState('');
  const [images, setImages] = useState<File[]>([]);
  const [filterRisk, setFilterRisk] = useState('');

  const canAnalyze =
    user?.role === 'admin' ||
    user?.role === 'manager' ||
    user?.role === 'farmer';

  const maxImages = Math.min(
    frontendMaxImages,
    Math.max(1, capabilities?.model.maxImages || frontendMaxImages)
  );

  const supportedProducts = useMemo(() => {
    if (!capabilities) return [];
    return products.filter((product) =>
      Boolean(getCropMatch(product, capabilities.supportedCrops))
    );
  }, [capabilities, products]);

  const selectedProduct = useMemo(
    () => products.find((product) => product._id === productId),
    [productId, products]
  );

  const imagePreviews = useMemo(
    () =>
      images.map((file) => ({
        file,
        key: fileKey(file),
        url: URL.createObjectURL(file),
      })),
    [images]
  );

  useEffect(
    () => () => {
      imagePreviews.forEach((preview) => URL.revokeObjectURL(preview.url));
    },
    [imagePreviews]
  );

  const load = async () => {
    setLoading(true);
    setError('');
    setCapabilityError('');

    const [productResult, detectionResult, capabilityResult] =
      await Promise.allSettled([
        user?.role === 'farmer' ? productApi.getMine() : productApi.getAll(),
        diseaseDetectionApi.getAll(),
        diseaseDetectionApi.getCapabilities(),
      ]);

    if (productResult.status === 'fulfilled') {
      setProducts(productResult.value.data.products);
    } else {
      setError(
        getApiErrorMessage(
          productResult.reason,
          'Không thể tải danh sách lô nông sản.'
        )
      );
    }

    if (detectionResult.status === 'fulfilled') {
      setDetections(detectionResult.value.data.detections);
    } else {
      setError((current) =>
        current ||
        getApiErrorMessage(
          detectionResult.reason,
          'Không thể tải lịch sử nhận diện bệnh.'
        )
      );
    }

    if (capabilityResult.status === 'fulfilled') {
      const nextCapabilities = capabilityResult.value.data;
      const nextProducts =
        productResult.status === 'fulfilled'
          ? productResult.value.data.products
          : [];
      const firstSupported = nextProducts.find((product) =>
        Boolean(getCropMatch(product, nextCapabilities.supportedCrops))
      );
      setCapabilities(nextCapabilities);
      setProductId((current) => current || firstSupported?._id || '');
    } else {
      setCapabilityError(
        getApiErrorMessage(
          capabilityResult.reason,
          'Không thể kiểm tra trạng thái mô hình AI.'
        )
      );
    }

    setLoading(false);
  };

  useEffect(() => {
    void load();
  }, []);

  useEffect(() => {
    if (!productId) {
      setProductCapability(null);
      return undefined;
    }

    let active = true;
    setCapabilityLoading(true);
    setProductCapability(null);

    diseaseDetectionApi
      .getCapabilities(productId)
      .then(({ data }) => {
        if (!active) return;
        setProductCapability(data);
        setCapabilityError('');
      })
      .catch((requestError) => {
        if (!active) return;
        setCapabilityError(
          getApiErrorMessage(
            requestError,
            'Không thể kiểm tra khả năng hỗ trợ của lô đã chọn.'
          )
        );
      })
      .finally(() => {
        if (active) setCapabilityLoading(false);
      });

    return () => {
      active = false;
    };
  }, [productId]);

  const visible = useMemo(
    () =>
      detections.filter(
        (item) =>
          !filterRisk ||
          (getAnalysisStatus(item) !== 'inconclusive' &&
            item.overall_risk === filterRisk)
      ),
    [detections, filterRisk]
  );

  const totals = useMemo(
    () => ({
      completed: detections.filter(
        (item) => getAnalysisStatus(item) === 'completed'
      ).length,
      inconclusive: detections.filter(
        (item) => getAnalysisStatus(item) === 'inconclusive'
      ).length,
      legacy: detections.filter((item) => getAnalysisStatus(item) === 'legacy')
        .length,
      high: detections.filter(
        (item) =>
          getAnalysisStatus(item) !== 'inconclusive' &&
          item.overall_risk === 'high'
      ).length,
    }),
    [detections]
  );

  const toggleSymptom = (symptom: string) => {
    setSelectedSymptoms((current) =>
      current.includes(symptom)
        ? current.filter((item) => item !== symptom)
        : [...current, symptom]
    );
  };

  const addImages = (files: File[]) => {
    const validationMessages: string[] = [];
    const existingKeys = new Set(images.map(fileKey));
    const accepted: File[] = [];

    files.forEach((file) => {
      if (!acceptedImageTypes.includes(file.type)) {
        validationMessages.push(`${file.name}: chỉ chấp nhận JPEG, PNG hoặc WebP.`);
        return;
      }
      if (file.size > maxFileSize) {
        validationMessages.push(`${file.name}: dung lượng vượt quá 5 MB.`);
        return;
      }
      if (existingKeys.has(fileKey(file))) return;
      existingKeys.add(fileKey(file));
      accepted.push(file);
    });

    const availableSlots = Math.max(0, maxImages - images.length);
    if (accepted.length > availableSlots) {
      validationMessages.push(`Mỗi lần phân tích chỉ dùng tối đa ${maxImages} ảnh.`);
    }

    setImages((current) => [
      ...current,
      ...accepted.slice(0, availableSlots),
    ]);
    setImageError(validationMessages.join(' '));
    setError('');
    setSuccessMessage('');
  };

  const onImageChange = (event: ChangeEvent<HTMLInputElement>) => {
    addImages(Array.from(event.target.files || []));
    event.target.value = '';
  };

  const removeImage = (key: string) => {
    setImages((current) => current.filter((file) => fileKey(file) !== key));
    setImageError('');
  };

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setSuccessMessage('');

    if (!productId || !selectedProduct) {
      setError('Vui lòng chọn lô cây trồng cần phân tích.');
      return;
    }
    if (!capabilities?.model.ready) {
      setError('Mô hình AI chưa sẵn sàng. Vui lòng thử lại sau.');
      return;
    }
    if (
      capabilityLoading ||
      !productCapability?.product ||
      !productCapability.product.supported
    ) {
      setError('Lô đã chọn chưa được mô hình AI hỗ trợ.');
      return;
    }
    if (images.length < 1 || images.length > maxImages) {
      setError(`Vui lòng tải từ 1 đến ${maxImages} ảnh cây trồng.`);
      return;
    }

    try {
      setSaving(true);
      setError('');
      const { data } = await diseaseDetectionApi.create({
        product: productId,
        crop_name: selectedProduct.name,
        symptoms: selectedSymptoms,
        notes: notes.trim() || undefined,
        images,
      });
      setDetections((current) => [data.detection, ...current]);
      setSelectedSymptoms([]);
      setNotes('');
      setImages([]);
      setImageError('');
      setSuccessMessage(
        getAnalysisStatus(data.detection) === 'inconclusive'
          ? 'Đã phân tích ảnh. Hệ thống chưa đủ cơ sở kết luận; hãy xem hướng dẫn chụp lại bên dưới.'
          : 'Đã phân tích ảnh và lưu kết quả vào lịch sử của lô.'
      );
    } catch (requestError: any) {
      setError(
        getApiErrorMessage(requestError, 'Không thể phân tích ảnh cây trồng.')
      );
    } finally {
      setSaving(false);
    }
  };

  const canDeleteDetection = (item: DiseaseDetection) => {
    if (user?.role === 'admin' || user?.role === 'manager') return true;
    if (user?.role !== 'farmer') return false;
    const product = item.product;
    if (!product || typeof product === 'string') return false;
    return getEntityId(product.created_by) === getEntityId(user);
  };

  const remove = async (id: string) => {
    if (!window.confirm('Bạn có chắc muốn xóa kết quả nhận diện này?')) return;
    try {
      setError('');
      await diseaseDetectionApi.delete(id);
      setDetections((current) => current.filter((item) => item._id !== id));
    } catch (requestError: any) {
      setError(
        getApiErrorMessage(
          requestError,
          'Không thể xóa kết quả nhận diện.'
        )
      );
    }
  };

  const modelReady = Boolean(capabilities?.model.ready);
  const selectedSupport = productCapability?.product;
  const canSubmit =
    modelReady &&
    Boolean(selectedSupport?.supported) &&
    !capabilityLoading &&
    images.length >= 1 &&
    images.length <= maxImages &&
    !saving;

  return (
    <main className="disease-page">
      <header className="disease-heading">
        <div>
          <span className="disease-eyebrow">GIÁM SÁT SỨC KHỎE CÂY TRỒNG</span>
          <h1>Nhận diện bệnh bằng hình ảnh</h1>
          <p>
            AI sàng lọc ảnh lá cây theo lô và đưa ra các khả năng tham khảo để
            hỗ trợ kiểm tra tại vườn.
          </p>
        </div>
        <div
          className={`disease-model-badge ${modelReady ? 'is-ready' : 'is-offline'}`}
          role="status"
        >
          <span aria-hidden="true" />
          {loading
            ? 'Đang kiểm tra mô hình'
            : modelReady
              ? 'Mô hình AI sẵn sàng'
              : 'Mô hình AI chưa sẵn sàng'}
        </div>
      </header>

      {error && (
        <div className="disease-alert" role="alert">
          <span>{error}</span>
          <button
            type="button"
            onClick={() => setError('')}
            aria-label="Đóng thông báo lỗi"
          >
            ×
          </button>
        </div>
      )}
      {successMessage && (
        <div className="disease-alert disease-alert--success" role="status">
          <span>{successMessage}</span>
          <button
            type="button"
            onClick={() => setSuccessMessage('')}
            aria-label="Đóng thông báo"
          >
            ×
          </button>
        </div>
      )}

      <section className="disease-model-panel" aria-labelledby="model-title">
        <div className="disease-model-panel__summary">
          <span className="disease-model-panel__icon" aria-hidden="true">
            AI
          </span>
          <div>
            <span className="disease-eyebrow">MÔ HÌNH ĐANG SỬ DỤNG</span>
            <h2 id="model-title">
              {modelReady ? 'Phân tích ảnh lá cây' : 'Chưa thể phân tích ảnh'}
            </h2>
            <p>
              {modelReady
                ? `Phiên bản ${capabilities?.model.version || 'AI'} · ảnh đầu vào ${capabilities?.model.inputSize || 224} × ${capabilities?.model.inputSize || 224}px`
                : capabilityError ||
                  'Máy chủ chưa tải được mô hình. Lịch sử cũ vẫn có thể xem bình thường.'}
            </p>
          </div>
        </div>
        <div className="disease-supported-crops">
          <span>Loại cây được hỗ trợ</span>
          <div>
            {capabilities?.supportedCrops.length ? (
              capabilities.supportedCrops.map((crop) => (
                <span key={crop.code}>{crop.label}</span>
              ))
            ) : (
              <em>Chưa có dữ liệu</em>
            )}
          </div>
          <small>
            Chỉ các lô cây phù hợp mới xuất hiện trong biểu mẫu phân tích.
          </small>
        </div>
      </section>

      <section className="disease-stats" aria-label="Thống kê nhận diện">
        <article>
          <small>TỔNG KẾT QUẢ</small>
          <strong>{detections.length}</strong>
          <p>Tất cả bản ghi đã lưu</p>
        </article>
        <article className="is-completed">
          <small>AI ĐÃ PHÂN TÍCH</small>
          <strong>{totals.completed}</strong>
          <p>Kết quả phân tích hình ảnh</p>
        </article>
        <article className="is-inconclusive">
          <small>CHƯA ĐỦ CƠ SỞ</small>
          <strong>{totals.inconclusive}</strong>
          <p>Cần ảnh rõ hơn hoặc kiểm tra lại</p>
        </article>
        <article className="is-high">
          <small>NGUY CƠ CAO</small>
          <strong>{totals.high}</strong>
          <p>Cần ưu tiên kiểm tra tại vườn</p>
        </article>
      </section>

      {canAnalyze && (
        <section className="disease-analyzer" aria-labelledby="analyzer-title">
          <form onSubmit={submit} noValidate>
            <div className="disease-form-head">
              <div>
                <span className="disease-eyebrow">PHÂN TÍCH MỚI</span>
                <h2 id="analyzer-title">Tải ảnh cây nghi bệnh</h2>
                <p>
                  Dùng ảnh rõ nét, đủ sáng và để phần lá cần kiểm tra chiếm phần
                  lớn khung hình.
                </p>
              </div>
              <button type="submit" disabled={!canSubmit}>
                {saving ? 'Đang phân tích ảnh…' : 'Phân tích bằng AI'}
              </button>
            </div>

            <div className="disease-form-grid">
              <label htmlFor="disease-product">
                <span>Lô cây trồng</span>
                <select
                  id="disease-product"
                  value={productId}
                  onChange={(event) => {
                    setProductId(event.target.value);
                    setError('');
                    setSuccessMessage('');
                  }}
                  required
                  disabled={saving || !modelReady}
                  aria-describedby="disease-product-help"
                >
                  <option value="">Chọn lô được AI hỗ trợ</option>
                  {supportedProducts.map((product) => {
                    const crop = capabilities
                      ? getCropMatch(product, capabilities.supportedCrops)
                      : undefined;
                    return (
                      <option key={product._id} value={product._id}>
                        {product.name} · {crop?.label || product.category} ·{' '}
                        {product.origin}
                      </option>
                    );
                  })}
                </select>
                <small id="disease-product-help">
                  {loading
                    ? 'Đang tải danh sách lô…'
                    : supportedProducts.length
                      ? `${supportedProducts.length} lô phù hợp với mô hình hiện tại.`
                      : 'Chưa có lô cây trồng nào phù hợp với mô hình hiện tại.'}
                </small>
              </label>

              <div className="disease-support-check" role="status">
                <span>Khả năng phân tích lô</span>
                {capabilityLoading ? (
                  <strong>Đang kiểm tra…</strong>
                ) : capabilityError && productId ? (
                  <>
                    <strong className="is-unsupported">Không thể kiểm tra</strong>
                    <small>{capabilityError}</small>
                  </>
                ) : selectedSupport?.supported ? (
                  <>
                    <strong className="is-supported">Có thể phân tích</strong>
                    <small>
                      Nhận diện theo nhóm{' '}
                      {capabilities?.supportedCrops.find(
                        (crop) => crop.code === selectedSupport.cropCode
                      )?.label || selectedProduct?.name}
                      .
                    </small>
                  </>
                ) : productId ? (
                  <>
                    <strong className="is-unsupported">Chưa được hỗ trợ</strong>
                    <small>
                      {selectedSupport?.reason === 'animal_product'
                        ? 'Nhận diện bệnh hiện chỉ áp dụng cho cây trồng.'
                        : 'Mô hình chưa có lớp dữ liệu phù hợp với cây này.'}
                    </small>
                  </>
                ) : (
                  <small>Chọn một lô để kiểm tra.</small>
                )}
              </div>

              <div className="disease-upload is-wide">
                <div className="disease-upload__head">
                  <div>
                    <span>Ảnh dùng để phân tích</span>
                    <small>
                      Bắt buộc 1–{maxImages} ảnh · JPEG, PNG hoặc WebP · tối đa
                      5 MB/ảnh
                    </small>
                  </div>
                  <strong>
                    {images.length}/{maxImages} ảnh
                  </strong>
                </div>

                <div className="disease-upload__actions">
                  <label
                    className={images.length >= maxImages ? 'is-disabled' : ''}
                  >
                    Chọn ảnh từ thiết bị
                    <input
                      type="file"
                      accept="image/jpeg,image/png,image/webp"
                      multiple
                      onChange={onImageChange}
                      disabled={saving || images.length >= maxImages}
                    />
                  </label>
                  <label
                    className={images.length >= maxImages ? 'is-disabled' : ''}
                  >
                    Chụp ảnh bằng camera
                    <input
                      type="file"
                      accept="image/jpeg,image/png,image/webp"
                      capture="environment"
                      onChange={onImageChange}
                      disabled={saving || images.length >= maxImages}
                    />
                  </label>
                </div>

                {imageError && (
                  <p className="disease-upload__error" role="alert">
                    {imageError}
                  </p>
                )}

                {imagePreviews.length > 0 ? (
                  <div className="disease-preview-grid">
                    {imagePreviews.map((preview, index) => (
                      <figure key={preview.key}>
                        <img
                          src={preview.url}
                          alt={`Ảnh cây trồng đã chọn ${index + 1}`}
                        />
                        <figcaption>
                          <span title={preview.file.name}>{preview.file.name}</span>
                          <small>
                            {(preview.file.size / (1024 * 1024)).toFixed(1)} MB
                          </small>
                        </figcaption>
                        <button
                          type="button"
                          onClick={() => removeImage(preview.key)}
                          aria-label={`Bỏ ảnh ${preview.file.name}`}
                          disabled={saving}
                        >
                          ×
                        </button>
                      </figure>
                    ))}
                  </div>
                ) : (
                  <div className="disease-upload__empty">
                    <strong>Chưa có ảnh nào được chọn</strong>
                    <span>
                      Nên chụp toàn cây, mặt trên lá và mặt dưới lá nếu có thể.
                    </span>
                  </div>
                )}
              </div>

              <fieldset className="disease-symptoms is-wide">
                <legend>Triệu chứng quan sát (không bắt buộc)</legend>
                <p>
                  Thông tin này giúp kỹ thuật viên đọc kết quả, không thay thế
                  phân tích ảnh của mô hình.
                </p>
                <div>
                  {symptomOptions.map((symptom) => (
                    <button
                      className={
                        selectedSymptoms.includes(symptom) ? 'is-selected' : ''
                      }
                      key={symptom}
                      type="button"
                      onClick={() => toggleSymptom(symptom)}
                      aria-pressed={selectedSymptoms.includes(symptom)}
                      disabled={saving}
                    >
                      {symptom}
                    </button>
                  ))}
                </div>
              </fieldset>

              <label className="is-wide" htmlFor="disease-notes">
                <span>Ghi chú thực địa (không bắt buộc)</span>
                <textarea
                  id="disease-notes"
                  rows={4}
                  maxLength={1000}
                  value={notes}
                  onChange={(event) => setNotes(event.target.value)}
                  placeholder="Ví dụ: Vết bệnh lan nhanh sau mưa, lá phía dưới bị trước…"
                  disabled={saving}
                />
                <small>{notes.length}/1000 ký tự</small>
              </label>
            </div>

            <div className="disease-form-notice">
              <strong>Kết quả dùng để sàng lọc ban đầu.</strong>
              <span>
                Không tự ý sử dụng thuốc bảo vệ thực vật chỉ dựa trên dự đoán
                của mô hình; hãy xác nhận với kỹ thuật viên khi rủi ro cao.
              </span>
            </div>
          </form>
        </section>
      )}

      <section className="disease-list" aria-labelledby="history-title">
        <div className="disease-toolbar">
          <div>
            <span className="disease-eyebrow">LỊCH SỬ</span>
            <h2 id="history-title">Kết quả nhận diện</h2>
            {totals.legacy > 0 && (
              <p>
                Có {totals.legacy} kết quả cũ dựa trên triệu chứng, không phải
                phân tích ảnh AI.
              </p>
            )}
          </div>
          <label>
            <span className="disease-visually-hidden">Lọc theo mức rủi ro</span>
            <select
              value={filterRisk}
              onChange={(event) => setFilterRisk(event.target.value)}
            >
              <option value="">Tất cả mức rủi ro</option>
              <option value="high">Nguy cơ cao</option>
              <option value="medium">Cần theo dõi</option>
              <option value="low">Rủi ro thấp</option>
            </select>
          </label>
        </div>

        {loading ? (
          <div className="disease-empty" role="status">
            Đang tải dữ liệu…
          </div>
        ) : visible.length === 0 ? (
          <div className="disease-empty">
            <strong>Chưa có kết quả phù hợp</strong>
            <p>
              {filterRisk
                ? 'Thử chọn mức rủi ro khác để xem thêm kết quả.'
                : 'Tải ảnh cây trồng để tạo kết quả phân tích đầu tiên.'}
            </p>
          </div>
        ) : (
          <div className="disease-grid">
            {visible.map((item) => {
              const product = item.product as Product;
              const status = getAnalysisStatus(item);
              const top = item.top_disease;
              const candidates: DiseaseCandidate[] =
                item.candidates?.length > 0
                  ? item.candidates.slice(0, 3)
                  : top
                    ? [top]
                    : [];
              const title =
                status === 'inconclusive'
                  ? 'Chưa đủ cơ sở kết luận'
                  : top?.is_healthy
                    ? 'Không phát hiện bệnh trong phạm vi mô hình'
                    : top?.disease_name || 'Kết quả nhận diện';
              const scoreLabel =
                status === 'legacy'
                  ? 'Điểm khớp triệu chứng'
                  : status === 'inconclusive'
                    ? 'Điểm cao nhất'
                    : 'Điểm dự đoán';
              const warnings = [
                ...(status === 'legacy'
                  ? [
                      'Kết quả này được tạo bởi bộ luật triệu chứng cũ, không phải mô hình phân tích ảnh.',
                    ]
                  : []),
                ...(item.warnings || []),
              ];

              return (
                <article
                  className={`disease-card risk-${item.overall_risk} status-${status}`}
                  key={item._id}
                >
                  <div className="disease-card-top">
                    <div>
                      <span className={`disease-status-tag status-${status}`}>
                        {analysisLabels[status]}
                      </span>
                      <span
                        className={`disease-risk-tag ${
                          status === 'inconclusive'
                            ? 'risk-inconclusive'
                            : `risk-${item.overall_risk}`
                        }`}
                      >
                        {status === 'inconclusive'
                          ? 'Chưa xác định rủi ro'
                          : riskLabels[item.overall_risk]}
                      </span>
                    </div>
                    <time dateTime={item.createdAt}>
                      {new Date(item.createdAt).toLocaleString('vi-VN', {
                        dateStyle: 'short',
                        timeStyle: 'short',
                      })}
                    </time>
                  </div>

                  <div className="disease-card__headline">
                    <div>
                      <span>
                        {product?.name || item.crop_name || 'Lô cây trồng'}
                      </span>
                      <h3>{title}</h3>
                    </div>
                    {top && (
                      <strong>
                        {Math.round(top.confidence * 100)}%
                        <small>{scoreLabel}</small>
                      </strong>
                    )}
                  </div>

                  {top?.description && (
                    <p className="disease-card__description">
                      {top.description}
                    </p>
                  )}

                  {item.images?.length > 0 && (
                    <div className="disease-result-images">
                      {item.images.slice(0, 3).map((image, index) => (
                        <a
                          key={`${image.path}-${index}`}
                          href={resolveImageUrl(image.path)}
                          target="_blank"
                          rel="noreferrer"
                          aria-label={`Mở ảnh phân tích ${index + 1} của ${product?.name || 'lô cây trồng'}`}
                        >
                          <img
                            src={resolveImageUrl(image.path)}
                            alt={`Ảnh phân tích ${index + 1} của ${product?.name || 'lô cây trồng'}`}
                            loading="lazy"
                          />
                        </a>
                      ))}
                    </div>
                  )}

                  {warnings.length > 0 && (
                    <div className="disease-warnings">
                      <strong>Lưu ý khi đọc kết quả</strong>
                      <ul>
                        {warnings.map((warning, index) => (
                          <li key={`${warning}-${index}`}>{warning}</li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {candidates.length > 0 && (
                    <div className="disease-candidates">
                      <div className="disease-section-title">
                        <strong>
                          {status === 'legacy'
                            ? 'Kết quả từ triệu chứng'
                            : 'Các khả năng mô hình đề xuất'}
                        </strong>
                        <span>Tối đa 3 kết quả</span>
                      </div>
                      <ol>
                        {candidates.map((candidate, index) => (
                          <li key={`${candidate.disease_code}-${index}`}>
                            <span>{index + 1}</span>
                            <div>
                              <strong>{candidate.disease_name}</strong>
                              <small>{riskLabels[candidate.risk_level]}</small>
                            </div>
                            <b>{Math.round(candidate.confidence * 100)}%</b>
                          </li>
                        ))}
                      </ol>
                      <p>
                        Điểm dự đoán thể hiện mức phù hợp với các lớp mà mô hình
                        đã học, không phải kết luận chuyên môn.
                      </p>
                    </div>
                  )}

                  {top?.recommendations?.length > 0 && (
                    <div className="disease-recommendations">
                      <strong>Việc nên làm tiếp theo</strong>
                      <ul>
                        {top.recommendations.slice(0, 3).map((recommendation) => (
                          <li key={recommendation}>{recommendation}</li>
                        ))}
                      </ul>
                    </div>
                  )}

                  <footer>
                    <div>
                      <span>
                        {item.inference_engine === 'onnx'
                          ? 'Phân tích ảnh ONNX'
                          : status === 'legacy'
                            ? 'Luật triệu chứng'
                            : 'Phân tích hình ảnh'}
                      </span>
                      <small>{item.model_version}</small>
                    </div>
                    {canDeleteDetection(item) && (
                      <button type="button" onClick={() => void remove(item._id)}>
                        Xóa kết quả
                      </button>
                    )}
                  </footer>
                </article>
              );
            })}
          </div>
        )}
      </section>
    </main>
  );
};

export default DiseaseDetectionPage;
