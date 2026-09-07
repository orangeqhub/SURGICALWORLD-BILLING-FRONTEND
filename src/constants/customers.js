export const CUSTOMERS = [
  { id: 'CUS-001', name: 'Walk-in Customer', mobile: '', address: '', gst: '', doctor: '', branchId: null, type: 'WALK_IN' },
  { id: 'CUS-002', name: 'Sri Ramachandra Hospital', mobile: '9866011223', address: 'Lakshmipuram, Guntur', gst: '37AACFS1234C1Z1', doctor: 'Dr. B. Krishna Murthy', branchId: 'BR-GNT', type: 'HOSPITAL' },
  { id: 'CUS-003', name: 'Aditya Clinic', mobile: '9866011224', address: 'Brodipet, Guntur', gst: '', doctor: 'Dr. Aditya Varma', branchId: 'BR-GNT', type: 'CLINIC' },
  { id: 'CUS-004', name: 'K. Padmavathi', mobile: '9866011225', address: 'One Town, Vijayawada', gst: '', doctor: '', branchId: 'BR-VJA', type: 'RETAIL' },
  { id: 'CUS-005', name: 'Sai Nursing Home', mobile: '9866011226', address: 'Kurnool Road, Ongole', gst: '37AACFS5678D1Z2', doctor: 'Dr. Sai Prasad', branchId: 'BR-ONG', type: 'HOSPITAL' },
];

export const CUSTOMER_TYPES = ['WALK_IN', 'RETAIL', 'CLINIC', 'HOSPITAL', 'GST'];

export default CUSTOMERS;
