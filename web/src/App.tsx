import { useState } from 'react';

type Role = 'client' | 'admin';

export default function App() {
  const [role, setRole] = useState<Role>('client');

  return (
    <div style={{ fontFamily: 'system-ui, sans-serif', maxWidth: 900, margin: '0 auto', padding: '2rem' }}>
      <header style={{ borderBottom: '2px solid #e5e7eb', marginBottom: '2rem', paddingBottom: '1rem' }}>
        <h1 style={{ margin: 0, fontSize: '1.75rem' }}>MeterMate</h1>
        <p style={{ margin: '0.25rem 0 1rem', color: '#6b7280', fontSize: '0.9rem' }}>
          Billing concierge — Maxio + Slack
        </p>
        <div>
          <button
            onClick={() => setRole('client')}
            style={{
              marginRight: 8,
              padding: '0.4rem 1.2rem',
              background: role === 'client' ? '#3b82f6' : '#f3f4f6',
              color: role === 'client' ? '#fff' : '#374151',
              border: 'none',
              borderRadius: 6,
              cursor: 'pointer',
              fontWeight: 600,
            }}
          >
            Client
          </button>
          <button
            onClick={() => setRole('admin')}
            style={{
              padding: '0.4rem 1.2rem',
              background: role === 'admin' ? '#7c3aed' : '#f3f4f6',
              color: role === 'admin' ? '#fff' : '#374151',
              border: 'none',
              borderRadius: 6,
              cursor: 'pointer',
              fontWeight: 600,
            }}
          >
            Admin / Consultant
          </button>
        </div>
      </header>

      <main>
        {role === 'client' ? (
          <div>
            <p style={{ color: '#6b7280' }}>
              Client forms will appear here as each use case is implemented.
            </p>
          </div>
        ) : (
          <div>
            <p style={{ color: '#6b7280' }}>
              Admin forms will appear here as each use case is implemented.
            </p>
          </div>
        )}
      </main>
    </div>
  );
}
