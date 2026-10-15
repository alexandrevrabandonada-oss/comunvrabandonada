import "@/app/globals.css";
import "@/app/comun-app-v2.css";
export const metadata = {
  title: "COMUN — laboratório sintético busca contextual",
  robots: { index: false, follow: false },
};
export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR">
      <body>{children}</body>
    </html>
  );
}
