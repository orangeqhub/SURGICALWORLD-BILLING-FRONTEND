import apiClient, { isMockMode } from './apiClient';
import { listCategories, listProducts, searchProducts, getProductByBarcode, getBranchStock, getAllBranchStock } from '../../database/repositories/productRepository';

export async function fetchCategories() {
  if (isMockMode()) {
    return listCategories();
  }
  return apiClient.get('/categories');
}

export async function fetchProducts() {
  if (isMockMode()) {
    return listProducts();
  }
  return apiClient.get('/products');
}

export async function fetchProductsBySearch(query) {
  if (isMockMode()) {
    return searchProducts(query);
  }
  return apiClient.get(`/products/search?q=${encodeURIComponent(query)}`);
}

export async function fetchProductByBarcode(barcode) {
  if (isMockMode()) {
    return getProductByBarcode(barcode);
  }
  return apiClient.get(`/products/barcode/${barcode}`);
}

export async function fetchBranchStock(branchId) {
  if (isMockMode()) {
    return getBranchStock(branchId);
  }
  return apiClient.get(`/branches/${branchId}/stock`);
}

export async function fetchAllBranchStock() {
  if (isMockMode()) {
    return getAllBranchStock();
  }
  return apiClient.get('/stock');
}

export default { fetchCategories, fetchProducts, fetchProductsBySearch, fetchProductByBarcode, fetchBranchStock, fetchAllBranchStock };
