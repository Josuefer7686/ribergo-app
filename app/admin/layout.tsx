import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'RiberGO · Panel de administración',
  robots: { index: false, follow: false },
};

// El panel es de uso en computadora: ocupa toda la ventana y se desplaza solo.
export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 overflow-y-auto bg-background text-white select-text">
      {children}
    </div>
  );
}
