import FarmingArea from '../models/FarmingArea';
import { BadRequestError, NotFoundError, UnauthorizedError } from '../utils/errors';

export const getAllFarmingAreas = async () => {
  return FarmingArea.find({})
    .populate('owner', 'first_name last_name email')
    .populate({
      path: 'certifications',
      select: 'name type certificate_number status expiry_date issuing_authority'
    });
};

export const getFarmingAreaById = async (id: string) => {
  const farmingArea = await FarmingArea.findById(id)
    .populate('owner', 'first_name last_name email')
    .populate({
      path: 'certifications',
      select: 'name type certificate_number status expiry_date issuing_authority scope'
    });

  if (!farmingArea) {
    throw new NotFoundError(`Không tìm thấy vùng canh tác ${id}`);
  }

  return farmingArea;
};

export const getFarmingAreasByOwner = async (userId: string) => {
  return FarmingArea.find({ owner: userId })
    .populate('owner', 'first_name last_name email')
    .populate({
      path: 'certifications',
      select: 'name type certificate_number status expiry_date'
    });
};

export const createFarmingArea = async (
  data: {
    name: string;
    address: string;
    coordinates?: { lat: number; lng: number };
    area_size?: number;
    description?: string;
    images?: { path: string; filename: string }[];
    status?: 'active' | 'inactive';
  },
  userId: string
) => {
  if (!data.name || !data.address) {
    throw new BadRequestError('Vui lòng điền đầy đủ thông tin vùng canh tác');
  }

  const farmingArea = await FarmingArea.create({ ...data, owner: userId });
  return farmingArea;
};

export const updateFarmingArea = async (
  id: string,
  data: Partial<{
    name: string;
    address: string;
    coordinates: { lat: number; lng: number };
    area_size: number;
    description: string;
    images: { path: string; filename: string }[];
    certifications: string[];
    status: 'active' | 'inactive';
  }>,
  userId: string,
  userRole: string
) => {
  const current = await FarmingArea.findById(id);
  if (!current) {
    throw new NotFoundError(`Không tìm thấy vùng canh tác ${id}`);
  }
  if (userRole === 'farmer' && current.owner.toString() !== userId) {
    throw new UnauthorizedError('Bạn chỉ được chỉnh sửa vùng trồng của mình');
  }

  const farmingArea = await FarmingArea.findByIdAndUpdate(id, data, {
    new: true,
    runValidators: true,
  });

  if (!farmingArea) {
    throw new NotFoundError(`Không tìm thấy vùng canh tác ${id}`);
  }

  return farmingArea;
};

export const deleteFarmingArea = async (id: string) => {
  const farmingArea = await FarmingArea.findByIdAndDelete(id);

  if (!farmingArea) {
    throw new NotFoundError(`Không tìm thấy vùng canh tác ${id}`);
  }

  return farmingArea;
};
