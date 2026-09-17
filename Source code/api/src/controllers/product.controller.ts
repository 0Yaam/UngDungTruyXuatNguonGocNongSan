import { Request, Response } from 'express';
import { StatusCodes } from 'http-status-codes';
import * as productService from '../services/product.service';

export const getAllProducts = async (_req: Request, res: Response) => {
  const products = await productService.getAllProducts();
  res.status(StatusCodes.OK).json({ products, count: products.length });
};

export const getMyProducts = async (req: Request, res: Response) => {
  const products = await productService.getProductsForUser(
    req.user!.userId,
    req.user!.role
  );
  res.status(StatusCodes.OK).json({ products, count: products.length });
};

export const getProduct = async (req: Request, res: Response) => {
  const product = await productService.getProductById(req.params.id);
  res.status(StatusCodes.OK).json({ product });
};

export const getTrashProducts = async (_req: Request, res: Response) => {
  const products = await productService.getDeletedProducts();
  res.status(StatusCodes.OK).json({ products, count: products.length });
};

export const createProduct = async (req: Request, res: Response) => {
  const userId = req.user!.userId;
  const result = await productService.createProduct(
    req.body,
    userId,
    req.user!.role
  );
  res.status(StatusCodes.CREATED).json(result);
};

export const updateProduct = async (req: Request, res: Response) => {
  const product = await productService.updateProduct(
    req.params.id,
    req.body,
    req.user!.userId,
    req.user!.role
  );
  res.status(StatusCodes.OK).json({ product });
};

export const updateProductStatus = async (req: Request, res: Response) => {
  const product = await productService.updateProductStatus(
    req.params.id,
    req.body,
    req.user!.userId,
    req.user!.role
  );
  res.status(StatusCodes.OK).json({ product });
};

export const updateProductCameras = async (req: Request, res: Response) => {
  const product = await productService.updateProductCameras(
    req.params.id,
    req.body.live_cameras ?? [],
    req.user!.userId,
    req.user!.role
  );
  res.status(StatusCodes.OK).json({ product });
};

export const deleteProduct = async (req: Request, res: Response) => {
  await productService.deleteProduct(req.params.id, req.user!.userId);
  res.status(StatusCodes.OK).json({ msg: 'Đã lưu trữ lô sản phẩm' });
};

export const restoreProduct = async (req: Request, res: Response) => {
  const product = await productService.restoreProduct(req.params.id);
  res.status(StatusCodes.OK).json({ product, msg: 'Đã khôi phục lô sản phẩm' });
};

export const permanentlyDeleteProduct = async (req: Request, res: Response) => {
  await productService.permanentlyDeleteProduct(req.params.id);
  res.status(StatusCodes.OK).json({ msg: 'Đã xóa vĩnh viễn lô sản phẩm' });
};
