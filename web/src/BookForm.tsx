import { useEffect, useState } from 'react';
import { api, Consultant, Product, MutatingResponse } from './api';

const inp: React.CSSProperties = {
  width: '100%',
  padding: '0.5rem 0.75rem',
  border: '1px solid #d1d5db',
  borderRadius: 6,
  fontSize: '0.95rem',
  boxSizing: 'border-box',
};

const label: React.CSSProperties = {
  display: 'block',
  fontWeight: 600,
  fontSize: '0.85rem',
  color: '#374151',
  marginBottom: '0.3rem',
};

const fieldWrap: React.CSSProperties = { marginBottom: '1rem' };

const row: React.CSSProperties = { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' };

function Field({ id, labelText, children }: { id: string; labelText: string; children: React.ReactNode }) {
  return (
    <div style={fieldWrap}>
      <label htmlFor={id} style={label}>{labelText}</label>
      {children}
    </div>
  );
}

interface FormState {
  firstName: string;
  lastName: string;
  email: string;
  consultantId: string;
  productHandle: string;
  collectionMethod: 'automatic' | 'remittance';
  couponCode: string;
}

const EMPTY: FormState = {
  firstName: '',
  lastName: '',
  email: '',
  consultantId: '',
  productHandle: '',
  collectionMethod: 'remittance',
  couponCode: '',
};

export default function BookForm() {
  const [form, setForm] = useState<FormState>(EMPTY);
  const [consultants, setConsultants] = useState<Consultant[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<MutatingResponse | null>(null);

  useEffect(() => {
    Promise.all([api.consultants(), api.products()])
      .then(([c, p]) => {
        setConsultants(c.consultants);
        setProducts(p.products.filter((p) => p.handle));
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  function set(field: keyof FormState) {
    return (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
      setForm((f) => ({ ...f, [field]: e.target.value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setResult(null);
    try {
      const res = await api.book({
        firstName: form.firstName,
        lastName: form.lastName,
        email: form.email,
        consultantId: form.consultantId,
        productHandle: form.productHandle,
        collectionMethod: form.collectionMethod,
        couponCode: form.couponCode || undefined,
      });
      setResult(res);
    } catch (err) {
      setResult({ status: 'maxio_failed', error: String(err) });
    } finally {
      setSubmitting(false);
    }
  }

  function handleReset() {
    setResult(null);
    setForm(EMPTY);
  }

  const selectedProduct = products.find((p) => p.handle === form.productHandle);

  if (loading) {
    return <p style={{ color: '#6b7280' }}>Loading consultants and plans…</p>;
  }

  if (result?.status === 'ok') {
    const mrrDollars = result.mrrCents
      ? `$${(Number(result.mrrCents) / 100).toFixed(2)}/mo`
      : null;
    const nextBill = result.nextAssessmentAt
      ? new Date(result.nextAssessmentAt as string).toLocaleDateString('en-US', { dateStyle: 'medium' })
      : null;

    return (
      <div style={{ background: '#f0fdf4', border: '1px solid #86efac', borderRadius: 10, padding: '1.5rem' }}>
        <h2 style={{ margin: '0 0 0.5rem', color: '#15803d', fontSize: '1.2rem' }}>
          Subscription active
        </h2>
        <p style={{ margin: '0 0 1rem', color: '#166534', fontSize: '0.9rem' }}>
          Your subscription has been created. Your consultant will be in touch shortly.
        </p>
        <table style={{ borderCollapse: 'collapse', width: '100%', fontSize: '0.9rem' }}>
          <tbody>
            {(
              [
                ['Customer', result.customerName],
                ['Plan', result.plan],
                ['MRR', mrrDollars],
                ['State', result.subscriptionState],
                ['Next billing', nextBill],
                ['Slack channel', result.channelName ? `#${result.channelName as string}` : null],
                ['Transaction ID', result.txnId],
              ] as [string, string | null | undefined][]
            )
              .filter(([, v]) => v)
              .map(([k, v]) => (
                <tr key={k}>
                  <td style={{ padding: '0.3rem 1rem 0.3rem 0', fontWeight: 600, color: '#374151', whiteSpace: 'nowrap' }}>{k}</td>
                  <td style={{ padding: '0.3rem 0', color: '#111827', fontFamily: k === 'Transaction ID' ? 'monospace' : undefined, fontSize: k === 'Transaction ID' ? '0.82rem' : undefined }}>{v}</td>
                </tr>
              ))}
          </tbody>
        </table>
        <button
          onClick={handleReset}
          style={{ marginTop: '1.25rem', padding: '0.4rem 1.2rem', background: '#15803d', color: '#fff', border: 'none', borderRadius: 6, cursor: 'pointer', fontWeight: 600 }}
        >
          Book another
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} noValidate>
      <h2 style={{ margin: '0 0 1.25rem', fontSize: '1.1rem', color: '#111827' }}>Book a subscription</h2>

      <div style={row}>
        <Field id="firstName" labelText="First name">
          <input id="firstName" style={inp} value={form.firstName} onChange={set('firstName')} required placeholder="Jane" />
        </Field>
        <Field id="lastName" labelText="Last name">
          <input id="lastName" style={inp} value={form.lastName} onChange={set('lastName')} required placeholder="Doe" />
        </Field>
      </div>

      <Field id="email" labelText="Email">
        <input id="email" type="email" style={inp} value={form.email} onChange={set('email')} required placeholder="jane.doe@example.com" />
      </Field>

      <Field id="consultantId" labelText="Consultant">
        <select id="consultantId" style={inp} value={form.consultantId} onChange={set('consultantId')} required>
          <option value="">— select a consultant —</option>
          {consultants.map((c) => (
            <option key={c.id} value={c.id}>{c.name}</option>
          ))}
        </select>
      </Field>

      <Field id="productHandle" labelText="Plan">
        <select id="productHandle" style={inp} value={form.productHandle} onChange={set('productHandle')} required>
          <option value="">— select a plan —</option>
          {products.map((p) => (
            <option key={p.handle} value={p.handle}>
              {p.name}{p.priceInCents ? ` — $${(p.priceInCents / 100).toFixed(0)}/${p.intervalUnit ?? 'mo'}` : ''}
            </option>
          ))}
        </select>
        {selectedProduct && (
          <p style={{ margin: '0.35rem 0 0', fontSize: '0.8rem', color: '#6b7280' }}>
            Handle: <code>{selectedProduct.handle}</code>
          </p>
        )}
      </Field>

      <Field id="collectionMethod" labelText="Payment method">
        <select id="collectionMethod" style={inp} value={form.collectionMethod} onChange={set('collectionMethod')}>
          <option value="remittance">Invoice (remittance)</option>
          <option value="automatic">Automatic charge</option>
        </select>
      </Field>

      <Field id="couponCode" labelText="Coupon code (optional)">
        <input id="couponCode" style={inp} value={form.couponCode} onChange={set('couponCode')} placeholder="e.g. LAUNCH20" />
      </Field>

      {result !== null && (
        <div style={{ background: '#fef2f2', border: '1px solid #fca5a5', borderRadius: 6, padding: '0.75rem 1rem', marginBottom: '1rem', fontSize: '0.9rem', color: '#991b1b' }}>
          <strong>{result.status === 'invalid' ? 'Validation error' : 'Booking failed'}:</strong>{' '}
          {result.error ?? 'Unknown error'}
        </div>
      )}

      <button
        type="submit"
        disabled={submitting}
        style={{
          padding: '0.55rem 1.75rem',
          background: submitting ? '#93c5fd' : '#3b82f6',
          color: '#fff',
          border: 'none',
          borderRadius: 6,
          cursor: submitting ? 'not-allowed' : 'pointer',
          fontWeight: 600,
          fontSize: '0.95rem',
        }}
      >
        {submitting ? 'Booking…' : 'Book subscription'}
      </button>
    </form>
  );
}
