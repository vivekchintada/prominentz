// src/components/dashboard/Integrations/UrbanPiperIntegration.tsx
import React, { useEffect, useState } from 'react';

export function UrbanPiperIntegration() {
  const [status, setStatus] = useState<'unknown' | 'configured' | 'missing'>('unknown');

  useEffect(() => {
    async function fetchStatus() {
      try {
        const res = await fetch('/api/integrations/urbanpiper');
        const data = await res.json();
        setStatus(data.configured ? 'configured' : 'missing');
      } catch (err) {
        console.error('Failed to fetch UrbanPiper integration status', err);
        setStatus('missing');
      }
    }
    fetchStatus();
  }, []);

  const bgColor = status === 'configured' ? 'rgba(48,209,88,0.12)' : 'rgba(37,99,235,0.12)';
  const borderColor = status === 'configured' ? '#30D15844' : '#2563eb44';
  const textColor = status === 'configured' ? '#30D158' : '#2563eb';
  const label = status === 'configured' ? 'UrbanPiper Connected' : 'UrbanPiper Not Configured';

  return (
    <div
      style={{
        padding: '16px',
        backgroundColor: bgColor,
        border: `0.5px solid ${borderColor}`,
        borderRadius: '12px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
        <span style={{ fontSize: '22px' }}>🛵</span>
        <div>
          <div style={{ fontSize: '14px', fontWeight: 600, color: textColor }}>{label}</div>
          <div style={{ fontSize: '12px', color: 'rgba(255,255,255,0.45)' }}>
            Enables order ingestion from Zomato, Swiggy, DoorDash via UrbanPiper.
          </div>
        </div>
      </div>
      {status === 'missing' && (
        <a
          href="/pricing/urbanpiper"
          style={{ fontSize: '12px', color: textColor, textDecoration: 'underline' }}
        >
          View Integration Details →
        </a>
      )}
    </div>
  );
}
