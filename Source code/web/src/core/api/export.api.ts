import axiosClient from './axiosClient';

export const exportApi = {
  // Download product trace as PDF
  getProductPdf: (productId: string) =>
    axiosClient.get(`/export/product/${productId}/pdf`, { responseType: 'blob' }),

  // Download product timeline as PDF
  getTimelinePdf: (productId: string) =>
    axiosClient.get(`/export/product/${productId}/timeline`, { responseType: 'blob' }),

  // Download products list as Excel
  getProductsExcel: (params?: { status?: string; category?: string; type?: string }) =>
    axiosClient.get('/export/products/excel', { params, responseType: 'blob' }),

  // Download single QR code as PNG
  getQrCode: (productId: string) =>
    axiosClient.get(`/export/product/${productId}/qr`, { responseType: 'blob' }),

  // Download batch QR codes as PDF
  getQrCodesBatch: (productIds: string[]) =>
    axiosClient.post('/export/qr/batch', { productIds }, { responseType: 'blob' }),
};

// Helper to trigger download
export const downloadBlob = (blob: Blob, filename: string) => {
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  window.URL.revokeObjectURL(url);
};
