import { Request, Response } from 'express';
import { StatusCodes } from 'http-status-codes';
import * as exportService from '../services/export.service';
import { BadRequestError } from '../utils/errors';

export const exportProductPDF = async (req: Request, res: Response) => {
  const { id } = req.params;
  const pdfBuffer = await exportService.exportProductToPDF(id);

  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `attachment; filename="product-trace-${id}.pdf"`);
  res.setHeader('Content-Length', pdfBuffer.length);
  res.send(pdfBuffer);
};

export const exportTraceTimeline = async (req: Request, res: Response) => {
  const { id } = req.params;
  const pdfBuffer = await exportService.exportTraceTimeline(id);

  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `attachment; filename="trace-timeline-${id}.pdf"`);
  res.setHeader('Content-Length', pdfBuffer.length);
  res.send(pdfBuffer);
};

export const exportProductsExcel = async (req: Request, res: Response) => {
  const { status, category, type } = req.query;

  const filters: {
    status?: string;
    category?: string;
    type?: string;
    created_by?: string;
  } = {};

  if (status && typeof status === 'string') filters.status = status;
  if (category && typeof category === 'string') filters.category = category;
  if (type && typeof type === 'string') filters.type = type;

  // If user is not admin, only export their own products
  if (req.user && req.user.role !== 'admin') {
    filters.created_by = req.user.userId;
  }

  const excelBuffer = await exportService.exportProductsToExcel(filters);

  const timestamp = new Date().toISOString().split('T')[0];
  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  res.setHeader('Content-Disposition', `attachment; filename="products-${timestamp}.xlsx"`);
  res.setHeader('Content-Length', excelBuffer.length);
  res.send(excelBuffer);
};

export const getProductQRCode = async (req: Request, res: Response) => {
  const { id } = req.params;
  const qrBuffer = await exportService.generateQRCode(id);

  res.setHeader('Content-Type', 'image/png');
  res.setHeader('Content-Disposition', `attachment; filename="qr-${id}.png"`);
  res.setHeader('Content-Length', qrBuffer.length);
  res.send(qrBuffer);
};

export const generateBatchQRCodes = async (req: Request, res: Response) => {
  const { productIds } = req.body;

  if (!productIds || !Array.isArray(productIds) || productIds.length === 0) {
    throw new BadRequestError('Vui lòng cung cấp danh sách ID sản phẩm');
  }

  if (productIds.length > 100) {
    throw new BadRequestError('Chỉ có thể tạo tối đa 100 mã QR cùng lúc');
  }

  // Generate PDF with all QR codes
  const pdfBuffer = await exportService.generateQRCodesPDFBatch(productIds);

  const timestamp = new Date().toISOString().split('T')[0];
  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `attachment; filename="qr-batch-${timestamp}.pdf"`);
  res.setHeader('Content-Length', pdfBuffer.length);
  res.send(pdfBuffer);
};
