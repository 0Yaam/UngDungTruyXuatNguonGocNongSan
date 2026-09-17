import { Request, Response } from 'express';
import { StatusCodes } from 'http-status-codes';
import * as searchService from '../services/search.service';
import { BadRequestError } from '../utils/errors';

const parsePagination = (query: Request['query']) => {
  const page = Math.max(1, parseInt(query.page as string, 10) || 1);
  const limit = Math.min(100, Math.max(1, parseInt(query.limit as string, 10) || 10));
  return { page, limit };
};

const parseDate = (dateString?: string): Date | undefined => {
  if (!dateString) return undefined;
  const date = new Date(dateString);
  return isNaN(date.getTime()) ? undefined : date;
};

export const searchProducts = async (req: Request, res: Response) => {
  const { q, category, type, status, origin, farming_area, created_by, from, to, sortBy, order } =
    req.query;

  const pagination = parsePagination(req.query);

  const filters: searchService.ProductSearchFilters = {
    q: q as string,
    category: category as string,
    type: type as 'Plant' | 'Animal',
    status: status as 'draft' | 'active' | 'completed' | 'recalled',
    origin: origin as string,
    farming_area: farming_area as string,
    created_by: created_by as string,
    createdFrom: parseDate(from as string),
    createdTo: parseDate(to as string),
  };

  const sort: searchService.ProductSortOptions = {
    sortBy: sortBy as string,
    order: order as 'asc' | 'desc',
  };

  const result = await searchService.searchProducts(filters, pagination, sort);
  res.status(StatusCodes.OK).json(result);
};

export const getProductStats = async (_req: Request, res: Response) => {
  const stats = await searchService.getProductStats();
  res.status(StatusCodes.OK).json({ stats });
};

export const searchEvents = async (req: Request, res: Response) => {
  const { productId, eventType, onChainStatus, from, to, recorded_by } = req.query;

  const pagination = parsePagination(req.query);

  const filters: searchService.EventSearchFilters = {
    productId: productId as string,
    eventType: eventType as string,
    onChainStatus: onChainStatus as 'pending' | 'confirmed' | 'failed' | 'skipped',
    from: parseDate(from as string),
    to: parseDate(to as string),
    recorded_by: recorded_by as string,
  };

  if (filters.eventType) {
    const validEventTypes = [
      'SEEDING',
      'FERTILIZING',
      'WATERING',
      'PEST_CONTROL',
      'HARVESTING',
      'PACKAGING',
      'SHIPPING',
    ];
    if (!validEventTypes.includes(filters.eventType)) {
      throw new BadRequestError(
        `Loại sự kiện không hợp lệ. Các loại hợp lệ: ${validEventTypes.join(', ')}`
      );
    }
  }

  const result = await searchService.searchEvents(filters, pagination);
  res.status(StatusCodes.OK).json(result);
};

export const getEventStats = async (_req: Request, res: Response) => {
  const stats = await searchService.getEventStats();
  res.status(StatusCodes.OK).json({ stats });
};
