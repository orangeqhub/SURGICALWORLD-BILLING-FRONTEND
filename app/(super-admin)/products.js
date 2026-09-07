import React from 'react';
import ScreenContainer from '../../src/components/layout/ScreenContainer';
import ProductManager from '../../src/components/products/ProductManager';

export default function ProductMasterScreen() {
  return (
    <ScreenContainer>
      <ProductManager allowCreate allowEdit />
    </ScreenContainer>
  );
}
