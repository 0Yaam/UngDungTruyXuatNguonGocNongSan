import Certification from '../models/Certification';
import FarmingArea from '../models/FarmingArea';
import { BadRequestError, NotFoundError } from '../utils/errors';

export const getAllCertifications = async () => {
  return Certification.find({})
    .populate('holder', 'first_name last_name email')
    .populate('farming_area', 'name address')
    .populate('products', 'name category');
};

export const getCertificationById = async (certificationId: string) => {
  const certification = await Certification.findById(certificationId)
    .populate('holder', 'first_name last_name email')
    .populate('farming_area', 'name address')
    .populate('products', 'name category');

  if (!certification) {
    throw new NotFoundError(`Không tìm thấy chứng nhận ${certificationId}`);
  }

  return certification;
};

export const getCertificationsByHolder = async (userId: string) => {
  return Certification.find({ holder: userId })
    .populate('holder', 'first_name last_name email')
    .populate('farming_area', 'name address')
    .populate('products', 'name category');
};

export const getCertificationsByFarmingArea = async (areaId: string) => {
  return Certification.find({ farming_area: areaId })
    .populate('holder', 'first_name last_name email')
    .populate('farming_area', 'name address')
    .populate('products', 'name category');
};

export const createCertification = async (
  data: {
    name: string;
    type: 'VietGAP' | 'GlobalGAP' | 'Organic' | 'HACCP' | 'ISO22000' | 'Other';
    issuing_authority: string;
    certificate_number: string;
    issue_date: Date;
    expiry_date: Date;
    scope?: string;
    document_url?: string;
    farming_area?: string;
    products?: string[];
  },
  userId: string
) => {
  if (
    !data.name ||
    !data.type ||
    !data.issuing_authority ||
    !data.certificate_number ||
    !data.issue_date ||
    !data.expiry_date
  ) {
    throw new BadRequestError('Vui lòng điền đầy đủ thông tin chứng nhận');
  }

  // Check if certificate number already exists
  const existingCert = await Certification.findOne({
    certificate_number: data.certificate_number,
  });
  if (existingCert) {
    throw new BadRequestError('Số chứng nhận đã tồn tại trong hệ thống');
  }

  // Validate dates
  const issueDate = new Date(data.issue_date);
  const expiryDate = new Date(data.expiry_date);
  if (expiryDate <= issueDate) {
    throw new BadRequestError('Ngày hết hạn phải sau ngày cấp');
  }

  // Determine initial status based on expiry date
  const now = new Date();
  const status = expiryDate < now ? 'expired' : 'valid';

  const certification = await Certification.create({
    ...data,
    holder: userId,
    status,
  });

  // Sync: Add certification to FarmingArea.certifications[]
  if (data.farming_area) {
    await FarmingArea.findByIdAndUpdate(
      data.farming_area,
      { $addToSet: { certifications: certification._id } }
    );
  }

  return certification;
};

export const updateCertification = async (
  certificationId: string,
  data: Partial<{
    name: string;
    type: 'VietGAP' | 'GlobalGAP' | 'Organic' | 'HACCP' | 'ISO22000' | 'Other';
    issuing_authority: string;
    certificate_number: string;
    issue_date: Date;
    expiry_date: Date;
    scope: string;
    document_url: string;
    status: 'valid' | 'expired' | 'revoked';
    farming_area: string;
    products: string[];
  }>
) => {
  // If updating certificate_number, check for duplicates
  if (data.certificate_number) {
    const existingCert = await Certification.findOne({
      certificate_number: data.certificate_number,
      _id: { $ne: certificationId },
    });
    if (existingCert) {
      throw new BadRequestError('Số chứng nhận đã tồn tại trong hệ thống');
    }
  }

  // Validate dates if both are provided
  if (data.issue_date && data.expiry_date) {
    const issueDate = new Date(data.issue_date);
    const expiryDate = new Date(data.expiry_date);
    if (expiryDate <= issueDate) {
      throw new BadRequestError('Ngày hết hạn phải sau ngày cấp');
    }
  }

  // Get old certification to check farming_area change
  const oldCert = await Certification.findById(certificationId);
  if (!oldCert) {
    throw new NotFoundError(`Không tìm thấy chứng nhận ${certificationId}`);
  }

  const certification = await Certification.findByIdAndUpdate(
    certificationId,
    data,
    {
      new: true,
      runValidators: true,
    }
  );

  // Sync: Update FarmingArea.certifications[] if farming_area changed
  if (data.farming_area !== undefined) {
    const oldAreaId = oldCert.farming_area?.toString();
    const newAreaId = data.farming_area;

    // Remove from old area
    if (oldAreaId && oldAreaId !== newAreaId) {
      await FarmingArea.findByIdAndUpdate(
        oldAreaId,
        { $pull: { certifications: certificationId } }
      );
    }

    // Add to new area
    if (newAreaId && newAreaId !== oldAreaId) {
      await FarmingArea.findByIdAndUpdate(
        newAreaId,
        { $addToSet: { certifications: certificationId } }
      );
    }
  }

  return certification;
};

export const deleteCertification = async (certificationId: string) => {
  const certification = await Certification.findById(certificationId);

  if (!certification) {
    throw new NotFoundError(`Không tìm thấy chứng nhận ${certificationId}`);
  }

  // Sync: Remove certification from FarmingArea.certifications[]
  if (certification.farming_area) {
    await FarmingArea.findByIdAndUpdate(
      certification.farming_area,
      { $pull: { certifications: certificationId } }
    );
  }

  await Certification.findByIdAndDelete(certificationId);

  return certification;
};

export const checkExpiredCertifications = async () => {
  const now = new Date();

  const result = await Certification.updateMany(
    {
      status: 'valid',
      expiry_date: { $lt: now },
    },
    {
      status: 'expired',
    }
  );

  return {
    updatedCount: result.modifiedCount,
    message: `Đã cập nhật ${result.modifiedCount} chứng nhận hết hạn`,
  };
};
