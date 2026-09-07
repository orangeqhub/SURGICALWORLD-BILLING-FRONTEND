import React from 'react';
import { FlatList, View, StyleSheet, useWindowDimensions } from 'react-native';
import ProductCard from './ProductCard';
import EmptyState from '../ui/EmptyState';
import { SPACING } from '../../theme';

export default function ProductGrid({ products = [], stockByProductId = {}, onSelectProduct }) {
  const { width } = useWindowDimensions();
  const numColumns = width < 480 ? 1 : width < 768 ? 2 : width < 1200 ? 3 : 4;

  if (products.length === 0) {
    return <EmptyState icon="cube-outline" title="No products found" message="Try a different search term or category" />;
  }

  return (
    <FlatList
      key={numColumns}
      data={products}
      keyExtractor={(item) => item.id}
      numColumns={numColumns}
      columnWrapperStyle={numColumns > 1 ? styles.row : undefined}
      contentContainerStyle={styles.content}
      renderItem={({ item }) => (
        <View style={styles.cell}>
          <ProductCard product={item} stock={stockByProductId[item.id]} onPress={onSelectProduct} />
        </View>
      )}
    />
  );
}

const styles = StyleSheet.create({
  content: { paddingBottom: SPACING.xxxl, gap: SPACING.md },
  row: { gap: SPACING.md },
  cell: { flex: 1, marginBottom: SPACING.xs },
});
