"use client"

import React, { useEffect, useMemo, useState, useRef } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Loader2, Search, Upload, FileText, FileDown } from "lucide-react";
import { useLocalStorage } from "@/hooks/use-local-storage";
import { cn } from "@/lib/utils";

// API endpoint
const API_URL = "/api/dni";

// Types
type DniDisplay = {
  numero_dni: string;
  nombres: string;
  apellido_paterno: string;
  apellido_materno: string;
  codigo_verificacion: string;
  fecha_nacimiento: string;
  timestamp?: string;
};

type ApiRaw = any;

function normalizeResults(data: ApiRaw): any[] {
  if (typeof data === "string") { try { data = JSON.parse(data); } catch { return []; } }
  if (data && typeof data === "object" && typeof data.raw === "string") {
    try { data = JSON.parse(data.raw); } catch { /* noop */ }
  }
  if (Array.isArray(data)) return data;
  if (data && Array.isArray(data.resultados)) return data.resultados;
  if (data && Array.isArray(data.data)) return data.data;
  if (data && (data.numero_dni || data.dni_consultado || data.nombres)) return [data];
  return [];
}

function toDisplay(rec: any): DniDisplay {
  return {
    numero_dni: rec.numero_dni || rec.dni_consultado || "---",
    nombres: rec.nombres || "---",
    apellido_paterno: rec.apellido_paterno || "",
    apellido_materno: rec.apellido_materno || "",
    codigo_verificacion: rec.codigo_verificacion || "---",
    fecha_nacimiento: rec.fecha_nacimiento || "---",
    timestamp: rec.timestamp || undefined,
  };
}

export function ConsultaDni() {
  const [mode, setMode] = useLocalStorage<"single" | "mass">("dniToolMode", "single");
  const [singleInput, setSingleInput] = useLocalStorage<string>("dniToolSingle", "");
  const [massInput, setMassInput] = useLocalStorage<string>("dniToolMass", "");
  const [results, setResults] = useLocalStorage<any[]>("dniToolLastResults", []);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [massDisabled, setMassDisabled] = useState(false);
  const [rateInfo, setRateInfo] = useState<{ limit: number; remaining: number; resetAt: string } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Derived
  const normalized = useMemo(() => (Array.isArray(results) ? results.map(toDisplay) : []), [results]);

  // Keyboard: restrict to digits in single input
  const onSingleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handleSingleQuery();
      return;
    }
    if (["e", "E", "+", "-", "/", "*"] .includes(e.key)) {
      e.preventDefault();
    }
  };

  const parseMassDnis = (): string[] => {
    return massInput
      .split(/[\s,;]+/)
      .map((d) => d.trim())
      .filter((d) => d.length === 8 && /^\d+$/.test(d));
  };

  async function checkRateStatus() {
    try {
      const res = await fetch(API_URL, { method: "GET" });
      const data = await res.json();
      setRateInfo({ limit: Number(data.limit), remaining: Number(data.remaining), resetAt: String(data.resetAt) });
      setMassDisabled(!data.allowed);
    } catch {
      // noop
    }
  }

  useEffect(() => {
    checkRateStatus();
  }, []);

  async function processDnis(dnis: string[]) {
    setIsLoading(true);
    setError(null);
    setResults([]);
    try {
      const response = await fetch(API_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ dnis }),
      });
      const data = await response.json();
      if (!response.ok) {
        const title = data.error || "La API de consulta de DNI falló.";
        const detail = data.detail ? String(data.detail) : "";
        throw new Error(`${title}${detail ? `: ${detail}` : ""}`);
      }
      const res = normalizeResults(data);
      setResults(res);
    } catch (err: any) {
      setError(err.message || "Error desconocido consultando DNI.");
    } finally {
      setIsLoading(false);
    }
  }

  async function handleSingleQuery() {
    const dni = singleInput.trim();
    if (dni.length !== 8 || !/^\d+$/.test(dni)) {
      setError("Ingrese un DNI válido de 8 dígitos.");
      return;
    }
    await processDnis([dni]);
  }

  async function handleMassQuery() {
    const dnis = parseMassDnis();
    if (dnis.length === 0) {
      setError("No se encontraron DNIs válidos.");
      return;
    }
    if (massDisabled) {
      setError("Has alcanzado el límite diario de consultas masivas. Intenta mañana.");
      return;
    }
    await processDnis(dnis);
    checkRateStatus();
  }

  // Carga TXT de DNIs
  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const text = await file.text();
      const dnis = text
        .split(/[\s,;]+/)
        .map((r) => r.trim())
        .filter((r) => r.length === 8 && /^\d+$/.test(r));
      if (dnis.length) {
        setMassInput(dnis.join("\n"));
        setError(null);
      } else {
        setError("El archivo no contiene DNIs válidos.");
      }
      (e.target as HTMLInputElement).value = "";
    } catch {
      setError("No se pudo leer el archivo TXT.");
    }
  }

  function exportTxt() {
    if (!normalized || normalized.length < 1) return;

    const header = "NumeroDni|Nombres|ApellidoPaterno|ApellidoMaterno|CodigoVerificacion|FechaNacimiento|";

    const lines = normalized.map((rec) => {
      const f = [
        rec.numero_dni ?? "",
        rec.nombres ?? "",
        rec.apellido_paterno ?? "",
        rec.apellido_materno ?? "",
        rec.codigo_verificacion ?? "-",
        rec.fecha_nacimiento ?? "-",
      ];
      return f.map((v) => String(v).replace(/\|/g, " ").trim()).join("|") + "|";
    });

    const content = [header, ...lines].join("\n");
    const blob = new Blob([content], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "consulta_masiva_dnis_BILUZ.txt";
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  }

  async function exportPdf() {
    if (!normalized || normalized.length < 1) return;
    const { jsPDF } = await import('jspdf');

    const doc = new jsPDF({ unit: 'pt', format: 'a4' });
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const mx = 40; // margen izquierdo
    const my = 40; // margen superior
    const width = pageWidth - mx * 2; // ancho útil
    const gap = 10; // separación entre columnas
    const colWidth = (width - gap) / 2; // ancho de columna
    const lineHeight = 14;
    let y = my;

    const ensureSpace = (h: number) => {
      if (y + h > pageHeight - my) {
        doc.addPage();
        y = my;
      }
    };

    // Título
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(16);
    doc.setTextColor(30, 30, 30);
    doc.text('Consulta Masiva de DNI', mx, y);
    y += 20;
    doc.setDrawColor(200, 200, 200);
    doc.line(mx, y, mx + width, y);
    y += 12;

    const computeInlineHeight = (value?: string, w: number = colWidth) => {
      const val = value && value.trim() !== '' ? value : '—';
      const lines = doc.splitTextToSize(val, w);
      return lineHeight + lines.length * lineHeight + 6;
    };

    const renderInline = (label: string, value: string | undefined, x: number, w: number = colWidth) => {
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(11);
      doc.setTextColor(60, 60, 60);
      doc.text(label, x, y);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(20, 20, 20);
      const val = value && value.trim() !== '' ? value : '—';
      const lines = doc.splitTextToSize(val, w);
      doc.text(lines, x, y + lineHeight);
    };

    const addColumns = (leftLabel: string, leftValue?: string, rightLabel?: string, rightValue?: string) => {
      const leftH = computeInlineHeight(leftValue);
      const rightH = computeInlineHeight(rightValue);
      const blockH = Math.max(leftH, rightH);
      ensureSpace(blockH);
      renderInline(leftLabel, leftValue, mx, colWidth);
      renderInline(rightLabel || '', rightValue, mx + colWidth + gap, colWidth);
      y += blockH;
    };

    const addField = (label: string, value?: string) => {
      const val = value && value.trim() !== '' ? value : '—';
      const lines = doc.splitTextToSize(val, width);
      const h = lineHeight + lines.length * lineHeight + 6;
      ensureSpace(h);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(11);
      doc.setTextColor(60, 60, 60);
      doc.text(label, mx, y);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(20, 20, 20);
      doc.text(lines, mx, y + lineHeight);
      y += h;
    };

    normalized.forEach((rec) => {
      const header = `${rec.nombres} ${rec.apellido_paterno} ${rec.apellido_materno}`.trim() + ` — DNI: ${rec.numero_dni}`;
      const headerLines = doc.splitTextToSize(header, width);
      const headerH = headerLines.length * (lineHeight + 2);
      ensureSpace(headerH);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(13);
      doc.setTextColor(0, 102, 204);
      doc.text(headerLines, mx, y);
      y += headerH;

      addColumns('Nombres', rec.nombres, 'Apellidos', `${rec.apellido_paterno} ${rec.apellido_materno}`.trim());
      addColumns('Fecha de Nacimiento', rec.fecha_nacimiento, 'Código de verificación', rec.codigo_verificacion);

      // Separador
      doc.setDrawColor(220, 220, 220);
      ensureSpace(12);
      doc.line(mx, y, mx + width, y);
      y += 12;
    });

    // Pie de página centrado en la última página con enlace en BILUZ
    doc.setPage(doc.getNumberOfPages());
    const footY = pageHeight - 30;
    const pre = 'Generado por ';
    const biluz = 'BILUZ';
    const tail = ' - Herramientas Contables';
    doc.setFont('helvetica', 'italic');
    doc.setFontSize(10);
    const preW = doc.getTextWidth(pre);
    const biluzW = doc.getTextWidth(biluz);
    const tailW = doc.getTextWidth(tail);
    const totalW = preW + biluzW + tailW;
    const startX = (pageWidth - totalW) / 2;

    doc.setTextColor(100, 100, 100);
    doc.text(pre, startX, footY);
    doc.setTextColor(0, 102, 204);
    doc.text(biluz, startX + preW, footY);
    doc.link(startX + preW, footY - 9, biluzW, 12, { url: 'https://tools.ebiluz.com/' });
    doc.setTextColor(100, 100, 100);
    doc.text(tail, startX + preW + biluzW, footY);

    doc.save('consulta_masiva_dnis_BILUZ.pdf');
  }

  function renderResults() {
    if (error) {
      return (
        <Alert variant="destructive">
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      );
    }
    if (isLoading) {
      return (
        <div className="flex items-center gap-2 text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" /> Procesando...
        </div>
      );
    }

    if (!normalized || normalized.length === 0) {
      return (
        <Card className="bg-muted/40">
          <CardContent className="p-4 text-sm text-muted-foreground">Sin resultados</CardContent>
        </Card>
      );
    }

    if (normalized.length === 1) {
      const res = normalized[0];
      const nombreCompleto = `${res.nombres} ${res.apellido_paterno} ${res.apellido_materno}`.trim();
      return (
        <Card className="bg-muted/40">
          <CardHeader>
            <CardTitle>{nombreCompleto || "No encontrado"}</CardTitle>
            <CardDescription>DNI: {res.numero_dni}</CardDescription>
          </CardHeader>
          <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <div>
              <p className="font-semibold text-muted-foreground">Nombres</p>
              <p className="font-medium">{res.nombres}</p>
            </div>
            <div>
              <p className="font-semibold text-muted-foreground">Apellidos</p>
              <p className="font-medium">{res.apellido_paterno} {res.apellido_materno}</p>
            </div>
            <div>
              <p className="font-semibold text-muted-foreground">Fecha de Nacimiento</p>
              <p className="font-medium">{res.fecha_nacimiento}</p>
            </div>
            <div>
              <p className="font-semibold text-muted-foreground">Código de verificación</p>
              <p className="font-medium">{res.codigo_verificacion}</p>
            </div>
          </CardContent>
        </Card>
      );
    }

    return (
      <div className="table-container overflow-x-auto">
        <table className="w-full min-w-[640px] text-sm">
          <thead>
            <tr className="text-muted-foreground">
              <th className="text-left p-2">DNI</th>
              <th className="text-left p-2">Nombres y Apellidos</th>
              <th className="text-left p-2">Fecha de Nacimiento</th>
              <th className="text-left p-2">Código verificación</th>
            </tr>
          </thead>
          <tbody>
            {normalized.map((res, idx) => (
              <tr key={idx} className="border-t">
                <td className="p-2">{res.numero_dni}</td>
                <td className="p-2">{res.nombres} {res.apellido_paterno} {res.apellido_materno}</td>
                <td className="p-2">{res.fecha_nacimiento}</td>
                <td className="p-2">{res.codigo_verificacion}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  }

  return (
    <Card className="flex flex-col h-full">
      <CardHeader>
        <CardTitle>Consulta de DNI</CardTitle>
        <CardDescription>Consulta individual y masiva de DNIs.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-3">
            <p className="text-sm font-semibold">Consulta Individual</p>
            <div className="flex gap-2">
              <Input
                value={singleInput}
                onChange={(e) => setSingleInput(e.target.value.replace(/[^0-9]/g, ""))}
                onKeyDown={onSingleKeyDown}
                placeholder="Ingrese DNI (8 dígitos)"
                maxLength={8}
                className="flex-1"
              />
              <Button onClick={handleSingleQuery} disabled={isLoading || singleInput.length !== 8}>
                {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Search className="mr-2 h-4 w-4" />}
                Consultar
              </Button>
            </div>
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <p className="text-sm font-semibold">Consulta Masiva</p>
              <div className="flex items-center gap-2">
                {/* Input oculto para cargar TXT */}
                <input ref={fileInputRef} type="file" accept=".txt" className="hidden" onChange={handleFileChange} />
                <Button variant="outline" onClick={() => fileInputRef.current?.click()} disabled={isLoading}>
                  <Upload className="mr-2 h-4 w-4" /> Cargar TXT
                </Button>
              </div>
            </div>
            <Textarea
              value={massInput}
              onChange={(e) => setMassInput(e.target.value)}
              placeholder="Pegue DNIs separados por espacios, comas o saltos."
              rows={4}
            />
            <div className="flex items-center gap-2 flex-wrap">
              <Button variant="secondary" onClick={handleMassQuery} disabled={isLoading || massDisabled}>
                {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Search className="mr-2 h-4 w-4" />}
                Consultar Masiva
              </Button>
              <Button variant="outline" onClick={exportPdf} disabled={normalized.length < 2}>
                <FileDown className="mr-2 h-4 w-4" /> Exportar PDF
              </Button>
              <Button variant="outline" onClick={exportTxt} disabled={normalized.length < 2}>
                <FileText className="mr-2 h-4 w-4" /> Exportar TXT
              </Button>
            </div>
            {massDisabled && (
              <p className="text-xs text-red-500">
                Límite diario alcanzado {rateInfo ? `(restantes: ${rateInfo.remaining}, reinicia: ${new Date(rateInfo.resetAt).toLocaleString()})` : ''}
              </p>
            )}
          </div>
        </div>

        {renderResults()}
      </CardContent>
    </Card>
  );
}