export const CATEGORIES = [
  { id: 'CAT-1', name: 'Surgical Instruments' },
  { id: 'CAT-2', name: 'Consumables' },
  { id: 'CAT-3', name: 'Disposables' },
  { id: 'CAT-4', name: 'Diagnostic' },
  { id: 'CAT-5', name: 'Hospital Furniture' },
  { id: 'CAT-6', name: 'Sterilization' },
  { id: 'CAT-7', name: 'Others' },
];

export const PRODUCTS = [
  { id: 'PRD-001', name: 'Surgical Gloves (M)', code: 'SW-GLV-M', barcode: '8901234500011', category: 'CAT-3', mrp: 150, sellingPrice: 120, purchasePrice: 95, gst: 12, unit: 'Box', minStock: 20, batch: 'B-245101', hsn: '401511', mfgDate: '2025-11-01', expiryDate: '2027-11-01', brand: 'MediSafe', supplier: 'Apex Surgical Supplies' },
  { id: 'PRD-002', name: 'Syringe 5 ml', code: 'SW-SYR-5', barcode: '8901234500028', category: 'CAT-2', mrp: 6, sellingPrice: 5, purchasePrice: 3.5, gst: 12, unit: 'Pcs', minStock: 200, batch: 'B-245112', hsn: '901839', mfgDate: '2025-09-15', expiryDate: '2028-09-15', brand: 'Dispovan', supplier: 'National Meditech' },
  { id: 'PRD-003', name: 'Face Mask 3 Ply', code: 'SW-MSK-3P', barcode: '8901234500035', category: 'CAT-3', mrp: 3, sellingPrice: 2, purchasePrice: 1.2, gst: 5, unit: 'Pcs', minStock: 500, batch: 'B-245120', hsn: '630790', mfgDate: '2025-10-01', expiryDate: '2028-10-01', brand: 'Venus', supplier: 'National Meditech' },
  { id: 'PRD-004', name: 'Cotton Roll', code: 'SW-COT-RL', barcode: '8901234500042', category: 'CAT-2', mrp: 20, sellingPrice: 15, purchasePrice: 10, gst: 12, unit: 'Roll', minStock: 100, batch: 'B-245105', hsn: '300590', mfgDate: '2025-08-10', expiryDate: '2027-08-10', brand: 'Kwality', supplier: 'Apex Surgical Supplies' },
  { id: 'PRD-005', name: 'BP Monitor', code: 'SW-BPM-01', barcode: '8901234500059', category: 'CAT-4', mrp: 1650, sellingPrice: 1250, purchasePrice: 980, gst: 12, unit: 'Pcs', minStock: 10, batch: 'B-245201', hsn: '901819', mfgDate: '2025-06-01', expiryDate: null, brand: 'Omron', supplier: 'Diagnostic World' },
  { id: 'PRD-006', name: 'Thermometer', code: 'SW-THM-01', barcode: '8901234500066', category: 'CAT-4', mrp: 150, sellingPrice: 120, purchasePrice: 85, gst: 12, unit: 'Pcs', minStock: 30, batch: 'B-245210', hsn: '901180', mfgDate: '2025-07-01', expiryDate: null, brand: 'Dr. Trust', supplier: 'Diagnostic World' },
  { id: 'PRD-007', name: 'Hand Sanitizer 500ml', code: 'SW-HSN-500', barcode: '8901234500073', category: 'CAT-2', mrp: 120, sellingPrice: 95, purchasePrice: 65, gst: 18, unit: 'Bottle', minStock: 50, batch: 'B-245110', hsn: '340111', mfgDate: '2025-12-01', expiryDate: '2027-12-01', brand: 'Lifebuoy', supplier: 'National Meditech' },
  { id: 'PRD-008', name: 'Surgical Cap', code: 'SW-CAP-01', barcode: '8901234500080', category: 'CAT-3', mrp: 15, sellingPrice: 12, purchasePrice: 8, gst: 12, unit: 'Pcs', minStock: 300, batch: 'B-245309', hsn: '650699', mfgDate: '2025-09-01', expiryDate: '2028-09-01', brand: 'MediSafe', supplier: 'Apex Surgical Supplies' },
  { id: 'PRD-009', name: 'IV Set', code: 'SW-IVS-01', barcode: '8901234500097', category: 'CAT-2', mrp: 60, sellingPrice: 48, purchasePrice: 32, gst: 12, unit: 'Pcs', minStock: 80, batch: 'B-245150', hsn: '901839', mfgDate: '2025-10-15', expiryDate: '2027-10-15', brand: 'Polymed', supplier: 'National Meditech' },
  { id: 'PRD-010', name: 'Gauze Roll', code: 'SW-GZR-01', barcode: '8901234500103', category: 'CAT-2', mrp: 25, sellingPrice: 18, purchasePrice: 12, gst: 12, unit: 'Roll', minStock: 150, batch: 'B-245106', hsn: '300590', mfgDate: '2025-08-20', expiryDate: '2027-08-20', brand: 'Kwality', supplier: 'Apex Surgical Supplies' },
];

export const getProductById = (id) => PRODUCTS.find((p) => p.id === id);
export const getProductByBarcode = (barcode) => PRODUCTS.find((p) => p.barcode === barcode);
export const getCategoryName = (id) => CATEGORIES.find((c) => c.id === id)?.name || 'Others';

export default PRODUCTS;
