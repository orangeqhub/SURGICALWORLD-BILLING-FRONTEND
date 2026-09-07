import { useEffect, useState } from 'react';
import { getDatabase } from '../database/database';
import { seedProductCatalog } from '../database/repositories/productRepository';
import { seedCustomers } from '../database/repositories/customerRepository';
import { seedSuppliers } from '../database/repositories/purchaseRepository';
import { seedAuthData } from '../services/api/authApi';

let bootstrapPromise = null;

async function bootstrap() {
  await getDatabase();
  await seedProductCatalog();
  await seedCustomers();
  await seedSuppliers();
  await seedAuthData();
}

export function useSQLite() {
  const [ready, setReady] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    let cancelled = false;

    if (!bootstrapPromise) {
      bootstrapPromise = bootstrap();
    }

    bootstrapPromise
      .then(() => {
        if (!cancelled) setReady(true);
      })
      .catch((err) => {
        if (!cancelled) setError(err);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  return { ready, error };
}

export default useSQLite;
