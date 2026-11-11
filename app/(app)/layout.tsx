export default function AppFrameLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="mx-auto w-full max-w-[430px] h-full h-[100dvh] relative overflow-hidden bg-background shadow-2xl sm:border-x sm:border-border-custom flex flex-col">
      {children}
    </div>
  );
}
