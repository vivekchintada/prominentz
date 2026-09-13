import React, { useEffect, useState } from 'react';
import type { LowStockItem } from '@/types/dashboard';

export default function InventoryLowStock() {
  const [items, setItems] = useState<LowStockItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const res = await fetch('/api/inventory/low');
        if (res.ok) {
          const data = await res.json();
          setItems(data);
        }
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  return (
    <div className="card">
      <h3 className="font-semibold text-lg mb-2">📦 Low Stock Items</h3>
      {loading ? (
        <p className="text-sm text-secondary">Loading…</p>
      ) : items.length === 0 ? (
        <p className="text-sm text-success">All items sufficiently stocked.</p>
      ) : (
        <ul className="list-disc list-inside space-y-1 text-sm">
          {items.map((it) => (
            <li key={it.id}>
              {it.name} – {it.currentStock} / {it.minStock}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
