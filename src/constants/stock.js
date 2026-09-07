import { PRODUCTS } from './products';
import { BRANCHES } from './branches';

const seedFor = (branchIndex, productIndex) => {
  const base = 40 + ((branchIndex + 1) * 37 + (productIndex + 1) * 53) % 260;
  return base;
};

export const BRANCH_STOCK = BRANCHES.flatMap((branch, bi) =>
  PRODUCTS.map((product, pi) => {
    const available = seedFor(bi, pi);
    return {
      branchId: branch.id,
      productId: product.id,
      available,
      minStock: product.minStock,
      status: available <= 0 ? 'OUT_OF_STOCK' : available <= product.minStock ? 'LOW_STOCK' : 'IN_STOCK',
    };
  })
);

export const getStock = (branchId, productId) =>
  BRANCH_STOCK.find((s) => s.branchId === branchId && s.productId === productId);

export const getBranchStockList = (branchId) => BRANCH_STOCK.filter((s) => s.branchId === branchId);

export default BRANCH_STOCK;
