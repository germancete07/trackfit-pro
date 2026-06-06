"use client";

import { useEffect } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";

export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="px-4 py-12 flex flex-col items-center gap-4">
      <Card padding="lg" className="w-full max-w-sm flex flex-col items-center gap-4 text-center">
        <div className="text-5xl">😕</div>
        <div>
          <h2 className="text-lg font-bold text-gray-900 mb-1">Algo falló</h2>
          <p className="text-sm text-gray-500">
            No se pudo cargar esta sección. Si el problema persiste, intentá cerrar y abrir la app.
          </p>
        </div>
        <div className="flex flex-col gap-2 w-full">
          <Button className="w-full" onClick={reset}>Reintentar</Button>
          <Link href="/dashboard">
            <Button variant="secondary" className="w-full">Volver al inicio</Button>
          </Link>
        </div>
      </Card>
    </div>
  );
}
