import Link from "next/link";
import { ArrowLeft } from "lucide-react";

/** "← Volver" unificado — usado en las páginas de detalle de cada módulo (Fase 2). */
export default function BackLink({ href }: { href: string }) {
  return (
    <Link href={href} className="btn">
      <ArrowLeft size={16} /> Volver
    </Link>
  );
}
