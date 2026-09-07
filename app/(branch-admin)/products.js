import React from 'react';
import ScreenContainer from '../../src/components/layout/ScreenContainer';
import ProductManager from '../../src/components/products/ProductManager';
import { usePermissions } from '../../src/hooks/usePermissions';
import { PERMISSIONS } from '../../src/constants/roles';

/**
 * Branch Admin's view of the global Product Master catalog - list/search/
 * view are always available; editing follows PRODUCT_MASTER like every
 * other permission-gated action (Branch Admin holds it via the existing
 * admin bypass in hasPermission). Branch/batch stock quantities live in
 * Inventory, not here.
 */
export default function BranchAdminProductsScreen() {
  const { can } = usePermissions();

  return (
    <ScreenContainer>
      <ProductManager allowCreate={false} allowEdit={can(PERMISSIONS.PRODUCT_MASTER)} />
    </ScreenContainer>
  );
}
