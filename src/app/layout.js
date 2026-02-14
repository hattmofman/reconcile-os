import './globals.css';

export const metadata = {
  title: 'ReconcileOS — 3PL Invoice Reconciliation',
  description: 'Find billing errors, overcharges, and optimization opportunities in your 3PL invoices.',
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
