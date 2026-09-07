export const BRANCHES = [
  { id: 'BR-GNT', code: 'SW-GNT-01', name: 'Guntur', address: '14-6-22, Arundelpet, Guntur, Andhra Pradesh 522002', phone: '0863-2234567', gst: '37ABCDE1234F1Z5', manager: 'K. Ramesh Kumar', opening: '09:00', closing: '21:00', warehouse: 'Guntur Central Warehouse', status: 'Active' },
  { id: 'BR-PNR', code: 'SW-PNR-01', name: 'Ponnur', address: 'Main Road, Ponnur, Guntur District, Andhra Pradesh 522124', phone: '08647-222345', gst: '37ABCDE1234F1Z6', manager: 'B. Srinivasa Rao', opening: '09:00', closing: '20:30', warehouse: 'Ponnur Storage Unit', status: 'Active' },
  { id: 'BR-CHR', code: 'SW-CHR-01', name: 'Chirala', address: 'Station Road, Chirala, Andhra Pradesh 523155', phone: '08594-223456', gst: '37ABCDE1234F1Z7', manager: 'M. Lakshmi Prasanna', opening: '09:00', closing: '20:30', warehouse: 'Chirala Depot', status: 'Active' },
  { id: 'BR-ONG', code: 'SW-ONG-01', name: 'Ongole', address: 'Trunk Road, Ongole, Prakasam District, Andhra Pradesh 523001', phone: '08592-234567', gst: '37ABCDE1234F1Z8', manager: 'P. Venkata Rao', opening: '09:00', closing: '21:00', warehouse: 'Ongole Warehouse', status: 'Active' },
  { id: 'BR-VJA', code: 'SW-VJA-01', name: 'Vijayawada', address: 'Governorpet, Vijayawada, Andhra Pradesh 520002', phone: '0866-2345678', gst: '37ABCDE1234F1Z9', manager: 'D. Naga Raju', opening: '08:30', closing: '21:30', warehouse: 'Vijayawada Regional Warehouse', status: 'Active' },
  { id: 'BR-ELR', code: 'SW-ELR-01', name: 'Eluru', address: 'Ramachandra Rao Peta, Eluru, Andhra Pradesh 534001', phone: '08812-234567', gst: '37ABCDE1234F1ZA', manager: 'S. Anil Kumar', opening: '09:00', closing: '20:30', warehouse: 'Eluru Storage Unit', status: 'Active' },
  { id: 'BR-KKD', code: 'SW-KKD-01', name: 'Kakinada', address: 'Main Road, Kakinada, Andhra Pradesh 533001', phone: '0884-2345678', gst: '37ABCDE1234F1ZB', manager: 'V. Suresh Babu', opening: '09:00', closing: '21:00', warehouse: 'Kakinada Warehouse', status: 'Active' },
  { id: 'BR-TPT', code: 'SW-TPT-01', name: 'Tirupati', address: 'Tilak Road, Tirupati, Andhra Pradesh 517501', phone: '0877-2345678', gst: '37ABCDE1234F1ZC', manager: 'R. Chandra Sekhar', opening: '08:00', closing: '21:30', warehouse: 'Tirupati Regional Warehouse', status: 'Active' },
];

export const getBranchById = (id) => BRANCHES.find((b) => b.id === id);
export const getBranchByCode = (code) => BRANCHES.find((b) => b.code.toLowerCase() === String(code).toLowerCase());

export default BRANCHES;
