import "@/app/globals.css";
export const metadata = {
  title: "COMUN — laboratório sintético SOC-D09",
  robots: { index: false, follow: false },
};
export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR">
      <body>{children}</body>
    </html>
  );
}
