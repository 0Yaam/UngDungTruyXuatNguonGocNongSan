export interface User {
<<<<<<< HEAD
  _id?: string;
  userId?: string;
=======
  _id: string;
>>>>>>> dan/main
  name?: string;
  first_name?: string;
  last_name?: string;
  email: string;
  avatar?: string;
  role: 'admin' | 'manager' | 'farmer' | 'consumer';
  phone?: string;
  address?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface FarmingArea {
  _id: string;
  name: string;
  address: string;
  area_size?: number;
  coordinates?: { lat: number; lng: number };
  owner?: User;
  certifications?: Certification[];
}

export interface Certification {
  _id: string;
  name: string;
  type: 'VietGAP' | 'GlobalGAP' | 'Organic' | 'HACCP' | 'ISO22000' | 'Other';
  certificate_number: string;
  issuing_authority: string;
  issue_date: string;
  expiry_date: string;
  status: 'valid' | 'expired' | 'revoked';
  scope?: string;
}

export interface LiveCamera {
  _id?: string;
  name: string;
  stream_url: string;
  location?: string;
  is_active: boolean;
  thumbnail?: string;
}

export interface Product {
  _id: string;
  batch_code?: string;
  name: string;
  description?: string;
  category: string;
  type: 'Plant' | 'Animal';
  origin: string;
  cultivation_time?: string;
  initial_quantity?: number;
  current_quantity?: number;
  unit?: string;
  parent_product?: string | Product;
  source_products?: Array<string | Product>;
  images: { path: string; filename: string }[];
  live_cameras?: LiveCamera[];
  qrcode?: string;
  status: 'draft' | 'active' | 'completed' | 'recalled';
  onChainBatchId?: string;
  batchTxHash?: string;
  created_by: string | User;
  isDeleted?: boolean;
  deletedAt?: string;
  deleted_by?: string | User;
  farming_area?: FarmingArea;
  createdAt: string;
  updatedAt: string;
}

export interface CreateProductResponse {
  product: Product;
  batchId: string;
  batchTxHash?: string;
}

export type EventType =
  | 'SEEDING'
  | 'FERTILIZING'
  | 'WATERING'
  | 'PEST_CONTROL'
  | 'HARVESTING'
  | 'PACKAGING'
  | 'SHIPPING';

export interface TraceEvent {
  _id: string;
  product: string | Product;
  batchId: string;
  eventType: EventType;
  description: string;
  details?: Record<string, unknown>;
  images: string[];
  recorded_by: string | User;
  dataHash?: string;
  dataHashVersion?: 'v1' | 'v2';
  txHash?: string;
  blockNumber?: number;
  onChainStatus: 'pending' | 'confirmed' | 'failed' | 'skipped';
  actionIndex?: number;
  createdAt: string;
}

export interface InspectionMetric {
  _id?: string;
  name: string;
  value: string;
  unit?: string;
  limit?: string;
  passed?: boolean;
}

export interface QualityInspection {
  _id: string;
  product: string | Product;
  report_number: string;
  inspection_type:
    | 'PESTICIDE_RESIDUE'
    | 'MICROBIOLOGY'
    | 'HEAVY_METAL'
    | 'NUTRITION'
    | 'GENERAL';
  laboratory: string;
  sample_date: string;
  result_date?: string;
  result: 'pending' | 'passed' | 'failed';
  summary?: string;
  metrics: InspectionMetric[];
  document_url?: string;
  created_by: string | User;
  createdAt: string;
  updatedAt: string;
}

export type DiseaseRiskLevel = 'low' | 'medium' | 'high';

export type DiseaseAnalysisStatus = 'completed' | 'inconclusive' | 'legacy';
export type DiseaseInferenceEngine = 'onnx' | 'rules';

export interface DiseaseCandidate {
  disease_code: string;
  disease_name: string;
  confidence: number;
  risk_level: DiseaseRiskLevel;
  description: string;
  recommendations: string[];
  model_label?: string;
  source_label?: string;
  crop_code?: string;
  is_healthy?: boolean;
}

export interface DiseaseSupportedCrop {
  code: 'tomato' | 'bell_pepper' | string;
  label: string;
  aliases: string[];
}

export interface DiseaseDetectionCapabilities {
  model: {
    ready: boolean;
    version: string | null;
    inputSize: number;
    maxImages: number;
    minConfidence: number;
  };
  supportedCrops: DiseaseSupportedCrop[];
  product?: {
    _id: string;
    name: string;
    type: Product['type'];
    supported: boolean;
    cropCode?: string;
    reason?: 'animal_product' | 'unsupported_crop';
  };
}

export interface DiseaseDetection {
  _id: string;
  product: string | Product;
  crop_name?: string;
  symptoms: string[];
  notes?: string;
  images: { path: string; filename: string }[];
  candidates: DiseaseCandidate[];
  top_disease: DiseaseCandidate;
  overall_risk: DiseaseRiskLevel;
  model_version: string;
  analysis_status?: DiseaseAnalysisStatus;
  inference_engine?: DiseaseInferenceEngine;
  warnings?: string[];
  detected_by: string | User;
  createdAt: string;
  updatedAt: string;
}

export interface SupplyChainOrganization {
  _id: string;
  name: string;
  type: 'SUPPLIER' | 'COOPERATIVE' | 'PROCESSOR' | 'WAREHOUSE' | 'CARRIER' | 'DISTRIBUTOR' | 'RETAILER';
  tax_code?: string;
  address: string;
  contact_name?: string;
  phone?: string;
  email?: string;
  active: boolean;
}

export interface SupplyChainRecord {
  _id: string;
  product: string | Product;
  related_products: Array<string | Product>;
  operation_type: 'TRANSFER' | 'SPLIT' | 'MERGE' | 'PROCESSING' | 'WAREHOUSE_IN' | 'WAREHOUSE_OUT' | 'TRANSPORT' | 'RECALL';
  title: string;
  description?: string;
  from_organization?: SupplyChainOrganization;
  to_organization?: SupplyChainOrganization;
  status: 'PLANNED' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED';
  quantity?: number;
  unit?: string;
  occurred_at: string;
  location?: string;
  temperature?: number;
  humidity?: number;
  vehicle?: string;
  driver?: string;
  recall_reason?: string;
  metadata?: Record<string, unknown>;
  createdAt: string;
}

export type InventoryTransactionType =
  | 'INITIAL'
  | 'ADJUST_IN'
  | 'ADJUST_OUT'
  | 'SPLIT_OUT'
  | 'SPLIT_IN'
  | 'MERGE_OUT'
  | 'MERGE_IN'
  | 'RECALL_OUT';

export interface InventoryTransaction {
  _id: string;
  product: string | Product;
  type: InventoryTransactionType;
  quantity: number;
  unit: string;
  balance_before: number;
  balance_after: number;
  related_products: Array<string | Product>;
  note?: string;
  occurred_at: string;
  metadata?: Record<string, unknown>;
  createdAt: string;
}

export interface FullTrace {
  product: Product;
  events: TraceEvent[];
  qualityInspections?: QualityInspection[];
  supplyChainRecords?: SupplyChainRecord[];
  diseaseDetections?: DiseaseDetection[];
  onChain?: {
    batchId: string;
    owner: string;
    actions: {
      dataHash: string;
      actionType: number;
      timestamp: number;
      recorder: string;
    }[];
  };
}

export interface VerifyResult {
  verified: boolean;
  event: TraceEvent;
  dataHash: string;
  dataHashVersion?: 'v1' | 'v2';
}

export interface TraceEventMutationResponse {
  msg: string;
  warning?: string | null;
  event: TraceEvent;
  traceEvent: TraceEvent;
  txHash: string;
  dataHash: string;
  onChainStatus: TraceEvent['onChainStatus'];
}

export interface AuthResponse {
  token: string;
  user: User;
}

export interface ApiError {
  message: string;
  statusCode: number;
}
