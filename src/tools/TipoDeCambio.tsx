"use client"

import React, { useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Loader2, CalendarDays, RefreshCcw, DollarSign, ExternalLink } from "lucide-react";
import { useLocalStorage } from "@/hooks/use-local-storage";

const API_URL = "https://biluz-apiocr.vercel.app/api/tc";

function getLocalDateString() {
  const date = new Date();
  const offset = date.getTimezoneOffset() * 60000;
  const localDate = new Date(date.getTime() - offset);
  return localDate.toISOString().split('T')[0];
}

export function TipoDeCambio() {
  const [date, setDate] = useLocalStorage<string>("tcSelectedDate", getLocalDateString());
  const [rate, setRate] = useLocalStorage<{ compra: number; venta: number; fetchDate?: string } | null>("tcLastRate", null);
  const [cacheByDate, setCacheByDate] = useLocalStorage<Record<string, { compra: number; venta: number; fetchedAt: string }>>("tcCacheByDate", {});
  const [soles, setSoles] = useLocalStorage<string>("tcSoles", "");
  const [dolares, setDolares] = useLocalStorage<string>("tcDolares", "");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const compra = rate?.compra ?? 0;
  const venta = rate?.venta ?? 0;

  const solesToDolares = useMemo(() => {
    const s = parseFloat(soles) || 0;
    return venta > 0 ? (s / venta) : 0;
  }, [soles, venta]);

  const dolaresToSoles = useMemo(() => {
    const d = parseFloat(dolares) || 0;
    return compra > 0 ? (d * compra) : 0;
  }, [dolares, compra]);

  async function fetchRate(forDate?: string) {
    setIsLoading(true);
    setError(null);
    try {
      const targetDate = forDate ?? date;
      const url = targetDate ? `${API_URL}?fecha=${targetDate}` : API_URL;
      const response = await fetch(url);
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "No se pudo obtener T/C");
      const compraVal = parseFloat(data.compra) || 0;
      const ventaVal = parseFloat(data.venta) || 0;
      const fetchedAt = new Date().toISOString();
      setRate({ compra: compraVal, venta: ventaVal, fetchDate: fetchedAt });
      setCacheByDate(prev => ({ ...prev, [targetDate]: { compra: compraVal, venta: ventaVal, fetchedAt } }));
    } catch (e: any) {
      setError(e.message || "Error desconocido consultando tipo de cambio.");
    } finally {
      setIsLoading(false);
    }
  }

  async function ensureRate(forDate?: string) {
    const targetDate = forDate ?? date;
    const cached = cacheByDate[targetDate];
    if (cached) {
      setRate({ compra: cached.compra, venta: cached.venta, fetchDate: cached.fetchedAt });
      return;
    }
    await fetchRate(targetDate);
  }

  useEffect(() => {
    // Primera visita: consulta solo si no hay datos para la fecha seleccionada.
    // Visitas siguientes: usa caché sin nuevas solicitudes.
    ensureRate(date);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [date]);

  const onNumberKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") { e.preventDefault(); /* recalcula por memo */ return; }
    if (["e", "E", "+", "-", "/", "*"] .includes(e.key)) { e.preventDefault(); }
  };

  return (
    <Card className="flex flex-col h-full">
      <CardHeader>
        <div className="flex items-center justify-between gap-4">
          <div>
            <CardTitle>Tipo de Cambio y Calculadora</CardTitle>
            <CardDescription>Consulta por fecha y conversión profesional.</CardDescription>
          </div>
          <Button asChild variant="outline" size="sm" className="shrink-0">
            <a href="https://e-consulta.sunat.gob.pe/cl-at-ittipcam/tcS01Alias" target="_blank" rel="noopener noreferrer">
              <ExternalLink className="h-4 w-4 mr-2" /> Ver Tipo de Cambio
            </a>
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 items-end">
           <div className="space-y-2">
             <p className="text-sm font-semibold flex items-center gap-2"><CalendarDays className="h-4 w-4" /> Seleccionar Fecha</p>
            <Input className="w-full" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
           </div>
           <div className="space-y-2">
             <p className="text-sm font-semibold">Compra</p>
            <div className="rounded-md border bg-muted/40 p-3 text-lg font-mono min-w-[160px]">{isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : compra ? compra.toFixed(3) : "---"}</div>
           </div>
           <div className="space-y-2">
             <p className="text-sm font-semibold">Venta</p>
            <div className="rounded-md border bg-muted/40 p-3 text-lg font-mono min-w-[160px]">{isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : venta ? venta.toFixed(3) : "---"}</div>
           </div>
         </div>

         {error && (
           <Alert>
             <AlertDescription>{error}</AlertDescription>
           </Alert>
         )}

        <div className="space-y-3">
           <p className="text-sm font-semibold flex items-center gap-2"><DollarSign className="h-4 w-4" /> Calculadora de Conversión</p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
             <div className="space-y-2">
               <p className="text-xs text-muted-foreground">Monto en Soles (S/)</p>
               <Input
                 type="number"
                 value={soles}
                 onChange={(e) => setSoles(e.target.value)}
                 onKeyDown={onNumberKeyDown}
                 placeholder="0.00"
               />
               <div className="text-sm"><span className="text-muted-foreground">Recibe (Venta):</span> <span className="font-semibold">$ {solesToDolares.toFixed(2)}</span></div>
             </div>
             <div className="space-y-2">
               <p className="text-xs text-muted-foreground">Monto en Dólares ($)</p>
               <Input
                 type="number"
                 value={dolares}
                 onChange={(e) => setDolares(e.target.value)}
                 onKeyDown={onNumberKeyDown}
                 placeholder="0.00"
               />
               <div className="text-sm"><span className="text-muted-foreground">Recibe (Compra):</span> <span className="font-semibold">S/ {dolaresToSoles.toFixed(2)}</span></div>
             </div>
           </div>
          <div className="flex items-center justify-end gap-2 flex-wrap">
             <Button variant="secondary" onClick={() => fetchRate(date)} disabled={isLoading}>
               <RefreshCcw className="h-4 w-4 mr-2" /> Actualizar T/C
             </Button>
           </div>
         </div>
      </CardContent>

    </Card>
  );
}