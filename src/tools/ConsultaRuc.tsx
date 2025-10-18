"use client"

import React, { useMemo, useState, useEffect, useRef } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Loader2, Search, ExternalLink, Upload, FileText, FileDown } from "lucide-react";
import { useLocalStorage } from "@/hooks/use-local-storage";

const API_URL = "/api/ruc";

type Representante = {
  tipo_documento?: string;
  nro_documento?: string;
  nombre?: string;
  cargo?: string;
  fecha_desde?: string;
};

type RucDisplay = {
  numeroDocumento: string;
  razonSocial: string;
  estado: string;
  condicion: string;
  direccion: string;
  tipoContribuyente?: string;
  nombreComercial?: string;
  fechaInscripcion?: string;
  fechaInicioActividades?: string;
  sistemaEmisionComprobante?: string;
  actividadComercioExterior?: string;
  sistemaContabilidad?: string;
  actividadesEconomicas?: string[];
  sistemaEmisionElectronica?: string[];
  emisorElectronicoDesde?: string;
  comprobantesElectronicos?: string;
  afiliadoPLEDesde?: string;
  padrones?: string;
  representantes?: Representante[];
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
  if (data && data.data && Array.isArray(data.data.resultados)) return data.data.resultados;
  if (data && Array.isArray(data.items)) return data.items;
  if (data && (
    data.numeroDocumento || data.numero || data.ruc || data.numero_ruc || data.ruc_consultado ||
    data.razonSocial || data.razon_social || data.nombre_razon_social || data.datos_principales
  )) return [data];
  return [];
}

function toDisplay(record: any): RucDisplay {
  let numeroDocumento = record.numeroDocumento ?? record.numero ?? record.ruc ?? record.numero_ruc ?? record.ruc_consultado ?? record.numeroRuc ?? record.num_ruc ?? "---";
  let razonSocial = record.razonSocial ?? record.razon_social ?? record.nombre_razon_social ?? record.nombreComercial ?? record.name ?? record.razon ?? "No encontrado";
  let estado = record.estado ?? record.estado_del_contribuyente ?? record.estadoContribuyente ?? record.state ?? "---";
  let condicion = record.condicion ?? record.condicion_del_contribuyente ?? record.condicionContribuyente ?? "---";
  let direccion = record.direccion ?? record.domicilio_fiscal ?? record.domicilioFiscal ?? record.address ?? "---";

  const dp = record.datos_principales || record.datos || null;
  let tipoContribuyente = "-";
  let nombreComercial = "-";
  let fechaInscripcion = "-";
  let fechaInicioActividades = "-";
  let sistemaEmisionComprobante = "-";
  let actividadComercioExterior = "-";
  let sistemaContabilidad = "-";
  let actividadesEconomicas: string[] = [];
  let sistemaEmisionElectronica: string[] = [];
  let emisorElectronicoDesde = "-";
  let comprobantesElectronicos = "-";
  let afiliadoPLEDesde = "-";
  let padrones = "-";
  let representantes: Representante[] = Array.isArray(record.representantes_legales) ? record.representantes_legales : [];

  if (dp && typeof dp === "object") {
    const rucField = dp["Número de RUC"] || dp["N° de RUC"] || dp["RUC"];
    if (typeof rucField === "string") {
      const parts = rucField.split(" - ");
      if (parts.length >= 2) {
        numeroDocumento = parts[0].trim();
        razonSocial = parts.slice(1).join(" - ").trim();
      } else {
        numeroDocumento = rucField.trim();
      }
    }
    tipoContribuyente = dp["Tipo Contribuyente"] ?? tipoContribuyente;
    nombreComercial = dp["Nombre Comercial"] ?? nombreComercial;
    fechaInscripcion = dp["Fecha de Inscripción"] ?? fechaInscripcion;
    fechaInicioActividades = dp["Fecha de Inicio de Actividades"] ?? fechaInicioActividades;
    estado = dp["Estado del Contribuyente"] ?? estado;
    condicion = dp["Condición del Contribuyente"] ?? condicion;
    direccion = dp["Domicilio Fiscal"] ?? direccion;
    sistemaEmisionComprobante = dp["Sistema Emisión de Comprobante"] ?? sistemaEmisionComprobante;
    actividadComercioExterior = dp["Actividad Comercio Exterior"] ?? actividadComercioExterior;
    sistemaContabilidad = dp["Sistema Contabilidad"] ?? sistemaContabilidad;

    const act = dp["Actividad(es) Económica(s)"];
    if (Array.isArray(act)) actividadesEconomicas = act; else if (typeof act === "string" && act) actividadesEconomicas = [act];
    const see = dp["Sistema de Emisión Electrónica"];
    if (Array.isArray(see)) sistemaEmisionElectronica = see; else if (typeof see === "string" && see) sistemaEmisionElectronica = [see];

    emisorElectronicoDesde = dp["Emisor electrónico desde"] ?? emisorElectronicoDesde;
    comprobantesElectronicos = dp["Comprobantes Electrónicos"] ?? comprobantesElectronicos;
    afiliadoPLEDesde = dp["Afiliado al PLE desde"] ?? afiliadoPLEDesde;
    padrones = dp["Padrones"] ?? padrones;

    // Representantes pueden venir dentro de datos_principales
    if (Array.isArray(dp["Representante(s) Legal(es)"])) {
      representantes = dp["Representante(s) Legal(es)"] as Representante[];
    }
  }

  return {
    numeroDocumento,
    razonSocial,
    estado,
    condicion,
    direccion,
    tipoContribuyente,
    nombreComercial,
    fechaInscripcion,
    fechaInicioActividades,
    sistemaEmisionComprobante,
    actividadComercioExterior,
    sistemaContabilidad,
    actividadesEconomicas,
    sistemaEmisionElectronica,
    emisorElectronicoDesde,
    comprobantesElectronicos,
    afiliadoPLEDesde,
    padrones,
    representantes,
  };
}

export function ConsultaRuc() {
  const [singleInput, setSingleInput] = useLocalStorage<string>("rucToolSingle", "");
  const [massInput, setMassInput] = useLocalStorage<string>("rucToolMass", "");
  const [results, setResults] = useLocalStorage<any[]>("rucToolLastResults", []);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [massDisabled, setMassDisabled] = useState(false);
  const [rateInfo, setRateInfo] = useState<{ limit: number; remaining: number; resetAt: string } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const normalized = useMemo(() => (Array.isArray(results) ? results.map(toDisplay) : []), [results]);

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

  const parseMassRucs = (): string[] => {
    return massInput
      .split(/[\s,;]+/)
      .map((r) => r.trim())
      .filter((r) => r.length === 11 && /^\d+$/.test(r));
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

  async function processRucs(rucs: string[]) {
    setIsLoading(true);
    setError(null);
    setResults([]);
    try {
      const response = await fetch(API_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rucs }),
      });
      const data = await response.json();
      if (!response.ok) {
        const title = data.error || "Error en la consulta de RUC";
        const detail = data.detail ? String(data.detail) : "";
        throw new Error(`${title}${detail ? `: ${detail}` : ""}`);
      }
      const res = normalizeResults(data);
      setResults(res);
    } catch (err: any) {
      setError(err.message || "Error desconocido consultando RUC.");
    } finally {
      setIsLoading(false);
    }
  }

  async function handleSingleQuery() {
    const ruc = singleInput.trim();
    if (ruc.length !== 11 || !/^\d+$/.test(ruc)) {
      setError("Ingrese un RUC válido de 11 dígitos.");
      return;
    }
    await processRucs([ruc]);
  }

  async function handleMassQuery() {
    const rucs = parseMassRucs();
    if (rucs.length === 0) {
      setError("No se encontraron RUCs válidos.");
      return;
    }
    if (massDisabled) {
      setError("Has alcanzado el límite diario de consultas masivas. Intenta mañana.");
      return;
    }
    await processRucs(rucs);
    // Actualiza estado de rate limit post-consulta
    checkRateStatus();
  }

  // Carga TXT de RUCs
  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const text = await file.text();
      const rucs = text
        .split(/[\s,;]+/)
        .map((r) => r.trim())
        .filter((r) => r.length === 11 && /^\d+$/.test(r));
      if (rucs.length) {
        setMassInput(rucs.join("\n"));
        setError(null);
      } else {
        setError("El archivo no contiene RUCs válidos.");
      }
      (e.target as HTMLInputElement).value = "";
    } catch {
      setError("No se pudo leer el archivo TXT.");
    }
  }

  function formatRec(rec: RucDisplay): string {
    const reps = Array.isArray(rec.representantes) && rec.representantes.length > 0
      ? rec.representantes.map((r) => `- ${r.nombre ?? '-'} (${r.tipo_documento ?? ''} ${r.nro_documento ?? ''}) ${r.cargo ?? ''} ${r.fecha_desde ? 'desde ' + r.fecha_desde : ''}`).join('\n')
      : '-';
    const act = (rec.actividadesEconomicas || []).length ? rec.actividadesEconomicas!.map(a => `- ${a}`).join('\n') : '-';
    const see = (rec.sistemaEmisionElectronica || []).length ? rec.sistemaEmisionElectronica!.map(a => `- ${a}`).join('\n') : '-';
    return [
      `RUC: ${rec.numeroDocumento}`,
      `Razón Social: ${rec.razonSocial}`,
      `Estado: ${rec.estado}`,
      `Condición: ${rec.condicion}`,
      `Dirección: ${rec.direccion}`,
      `Tipo Contribuyente: ${rec.tipoContribuyente ?? '-'}`,
      `Nombre Comercial: ${rec.nombreComercial ?? '-'}`,
      `Fecha Inscripción: ${rec.fechaInscripcion ?? '-'}`,
      `Inicio Actividades: ${rec.fechaInicioActividades ?? '-'}`,
      `Sistema Emisión de Comprobante: ${rec.sistemaEmisionComprobante ?? '-'}`,
      `Comercio Exterior: ${rec.actividadComercioExterior ?? '-'}`,
      `Sistema Contabilidad: ${rec.sistemaContabilidad ?? '-'}`,
      `Actividad(es) Económica(s):\n${act}`,
      `Sistema de Emisión Electrónica:\n${see}`,
      `Emisor electrónico desde: ${rec.emisorElectronicoDesde ?? '-'}`,
      `Comprobantes Electrónicos: ${rec.comprobantesElectronicos ?? '-'}`,
      `Afiliado al PLE desde: ${rec.afiliadoPLEDesde ?? '-'}`,
      `Padrones: ${rec.padrones ?? '-'}`,
      `Representante(s) Legal(es):\n${reps}`,
    ].join('\n');
  }

  function exportTxt() {
    if (!normalized || normalized.length < 1) return;

    const header = "NumeroRuc|Nombre ó RazonSocial|Tipo de Contribuyente|Profesion u Oficio|Nombre Comercial|Condicion del Contribuyente|Estado del Contribuyente|Fecha de Inscripcion|Fecha de Inicio de Actividades|Departamento|Provincia|Distrito|Direccion|Telefono|Fax|Actividad de Comercio Exterior|Principal- CIIU|Secundario 1- CIIU|Secundario 2- CIIU|Afecto Nuevo RUS|Buen Contribuyente|Agente de Retencion|Agente de Percepcion VtaInt|Agente de Percepcion ComLiq|";

    const pick = (arr: string[] | undefined, label: string) => {
      const v = (arr || []).find((s) => new RegExp(label, "i").test(s));
      return v ? v.replace(/\s+/g, " ").trim() : "-";
    };

    const lines = normalized.map((rec) => {
      const principal = pick(rec.actividadesEconomicas, "Principal");
      const sec1 = pick(rec.actividadesEconomicas, "Secundaria\s*1");
      const sec2 = pick(rec.actividadesEconomicas, "Secundaria\s*2");
      const pad = (rec.padrones || "").toLowerCase();
      const retencion = /retenci[oó]n/.test(pad) ? "SI" : "NO";
      const percVi = /venta interna/.test(pad) || /percepci[oó]n.*venta/.test(pad) ? "SI" : "NO";
      const percCl = /combustible/.test(pad) || /l[ií]quido/.test(pad) ? "SI" : "NO";
      const nuevoRus = /nuevo\s+rus/.test(pad) ? "SI" : "NO";
      const buenContrib = /buen\s+contribuyente/.test(pad) ? "SI" : "NO";

      const f = [
        rec.numeroDocumento ?? "",
        rec.razonSocial ?? "",
        rec.tipoContribuyente ?? "-",
        "-", // Profesión u Oficio
        rec.nombreComercial ?? "-",
        rec.condicion ?? "-",
        rec.estado ?? "-",
        rec.fechaInscripcion ?? "-",
        rec.fechaInicioActividades ?? "-",
        "-", // Departamento
        "-", // Provincia
        "-", // Distrito
        rec.direccion ?? "-",
        "-", // Teléfono(s)
        "-", // Fax
        rec.actividadComercioExterior ?? "-",
        principal,
        sec1,
        sec2,
        nuevoRus,
        buenContrib,
        retencion,
        percVi,
        percCl,
      ];

      return f.map((v) => String(v).replace(/\|/g, " ").trim()).join("|") + "|";
    });

    const content = [header, ...lines].join("\n");
    const blob = new Blob([content], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "consulta_masiva_rucs_BILUZ.txt";
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
    doc.text('Consulta Masiva de RUC', mx, y);
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

    const addList = (label: string, arr?: string[]) => {
      const items = (arr && arr.length) ? arr : ['—'];
      // Encabezado de sección
      ensureSpace(lineHeight + 6);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(11);
      doc.setTextColor(60, 60, 60);
      doc.text(label, mx, y);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(20, 20, 20);
      y += lineHeight;
      // Items
      items.forEach((s) => {
        const lines = doc.splitTextToSize('• ' + s, width);
        const h = lines.length * lineHeight;
        ensureSpace(h);
        doc.text(lines, mx, y);
        y += h;
      });
      y += 6;
    };

    normalized.forEach((rec) => {
      // Encabezado por RUC
      const header = `${rec.razonSocial} — RUC: ${rec.numeroDocumento}`;
      const headerLines = doc.splitTextToSize(header, width);
      const headerH = headerLines.length * (lineHeight + 2);
      ensureSpace(headerH);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(13);
      doc.setTextColor(0, 102, 204);
      doc.text(headerLines, mx, y);
      y += headerH;

      // Bloques
      addColumns('Estado', rec.estado, 'Condición', rec.condicion);
      addField('Dirección', rec.direccion);
      addColumns('Tipo Contribuyente', rec.tipoContribuyente, 'Nombre Comercial', rec.nombreComercial);
      addColumns('Fecha Inscripción', rec.fechaInscripcion, 'Inicio Actividades', rec.fechaInicioActividades);
      addField('Sistema Emisión de Comprobante', rec.sistemaEmisionComprobante);
      addColumns('Comercio Exterior', rec.actividadComercioExterior, 'Sistema Contabilidad', rec.sistemaContabilidad);
      addList('Actividad(es) Económica(s)', rec.actividadesEconomicas);
      addList('Sistema de Emisión Electrónica', rec.sistemaEmisionElectronica);
      addColumns('Emisor electrónico desde', rec.emisorElectronicoDesde, 'Comprobantes Electrónicos', rec.comprobantesElectronicos);
      addColumns('Afiliado al PLE desde', rec.afiliadoPLEDesde, 'Padrones', rec.padrones);

      const repsList = Array.isArray(rec.representantes) && rec.representantes.length
        ? rec.representantes.map((r) => `${r.nombre ?? '-'} (${r.tipo_documento ?? ''} ${r.nro_documento ?? ''}) ${r.cargo ?? ''} ${r.fecha_desde ? 'desde ' + r.fecha_desde : ''}`)
        : [];
      addList('Representante(s) Legal(es)', repsList);

      // Separador
      doc.setDrawColor(220, 220, 220);
      ensureSpace(12);
      doc.line(mx, y, mx + width, y);
      y += 12;
    });

    // Pie de página centrado en la última página
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

    doc.save('consulta_rucs.pdf');
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
      const rec = normalized[0];
      const estadoClass = rec.estado && /ACTIVO/i.test(rec.estado) ? "text-green-600" : "text-red-600";
      const condClass = rec.condicion && /HABIDO/i.test(rec.condicion) ? "text-green-600" : "text-red-600";

      const actividadesHTML = (rec.actividadesEconomicas || []).map((a, i) => (
        <li key={i}>{a}</li>
      ));
      const seeHTML = (rec.sistemaEmisionElectronica || []).map((a, i) => (
        <li key={i}>{a}</li>
      ));

      return (
        <Card className="bg-muted/40">
          <CardHeader>
            <CardTitle>{rec.razonSocial}</CardTitle>
            <CardDescription>RUC: {rec.numeroDocumento}</CardDescription>
          </CardHeader>
          <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <div>
              <p className="font-semibold text-muted-foreground">Estado</p>
              <p className={estadoClass}>{rec.estado}</p>
            </div>
            <div>
              <p className="font-semibold text-muted-foreground">Condición</p>
              <p className={condClass}>{rec.condicion}</p>
            </div>
            <div className="md:col-span-2">
              <p className="font-semibold text-muted-foreground">Dirección</p>
              <p className="font-medium">{rec.direccion}</p>
            </div>
            <div>
              <p className="font-semibold text-muted-foreground">Tipo Contribuyente</p>
              <p className="font-medium">{rec.tipoContribuyente}</p>
            </div>
            <div>
              <p className="font-semibold text-muted-foreground">Nombre Comercial</p>
              <p className="font-medium">{rec.nombreComercial}</p>
            </div>
            <div>
              <p className="font-semibold text-muted-foreground">Fecha Inscripción</p>
              <p className="font-medium">{rec.fechaInscripcion}</p>
            </div>
            <div>
              <p className="font-semibold text-muted-foreground">Inicio Actividades</p>
              <p className="font-medium">{rec.fechaInicioActividades}</p>
            </div>
            <div>
              <p className="font-semibold text-muted-foreground">Sistema Emisión de Comprobante</p>
              <p className="font-medium">{rec.sistemaEmisionComprobante}</p>
            </div>
            <div>
              <p className="font-semibold text-muted-foreground">Comercio Exterior</p>
              <p className="font-medium">{rec.actividadComercioExterior}</p>
            </div>
            <div>
              <p className="font-semibold text-muted-foreground">Sistema Contabilidad</p>
              <p className="font-medium">{rec.sistemaContabilidad}</p>
            </div>
            <div className="md:col-span-2">
              <p className="font-semibold text-muted-foreground">Actividad(es) Económica(s)</p>
              <ul className="ml-4 list-disc">{actividadesHTML.length ? actividadesHTML : <li>—</li>}</ul>
            </div>
            <div className="md:col-span-2">
              <p className="font-semibold text-muted-foreground">Sistema de Emisión Electrónica</p>
              <ul className="ml-4 list-disc">{seeHTML.length ? seeHTML : <li>—</li>}</ul>
            </div>
            <div>
              <p className="font-semibold text-muted-foreground">Emisor electrónico desde</p>
              <p className="font-medium">{rec.emisorElectronicoDesde}</p>
            </div>
            <div>
              <p className="font-semibold text-muted-foreground">Comprobantes Electrónicos</p>
              <p className="font-medium">{rec.comprobantesElectronicos}</p>
            </div>
            <div>
              <p className="font-semibold text-muted-foreground">Afiliado al PLE desde</p>
              <p className="font-medium">{rec.afiliadoPLEDesde}</p>
            </div>
            <div>
              <p className="font-semibold text-muted-foreground">Padrones</p>
              <p className="font-medium">{rec.padrones}</p>
            </div>
            <div className="md:col-span-2">
              <p className="font-semibold text-muted-foreground">Representante(s) Legal(es)</p>
              {Array.isArray(rec.representantes) && rec.representantes.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="min-w-full text-sm mt-2">
                    <thead>
                      <tr className="text-muted-foreground">
                        <th className="text-left p-2">Tipo Doc</th>
                        <th className="text-left p-2">N° Doc</th>
                        <th className="text-left p-2">Nombre</th>
                        <th className="text-left p-2">Cargo</th>
                        <th className="text-left p-2">Desde</th>
                      </tr>
                    </thead>
                    <tbody>
                      {rec.representantes.map((r, i) => (
                        <tr key={i} className="border-t">
                          <td className="p-2">{r.tipo_documento ?? '-'}</td>
                          <td className="p-2">{r.nro_documento ?? '-'}</td>
                          <td className="p-2">{r.nombre ?? '-'}</td>
                          <td className="p-2">{r.cargo ?? '-'}</td>
                          <td className="p-2">{r.fecha_desde ?? '-'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <p className="font-medium">—</p>
              )}
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
              <th className="text-left p-2">RUC</th>
              <th className="text-left p-2">Razón Social</th>
              <th className="text-left p-2">Estado</th>
              <th className="text-left p-2">Condición</th>
              <th className="text-left p-2">Nombre Comercial</th>
            </tr>
          </thead>
          <tbody>
            {normalized.map((res, idx) => (
              <tr key={idx} className="border-t">
                <td className="p-2">{res.numeroDocumento}</td>
                <td className="p-2">{res.razonSocial}</td>
                <td className="p-2">{res.estado}</td>
                <td className="p-2">{res.condicion}</td>
                <td className="p-2">{res.nombreComercial ?? '-'}</td>
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
        <div className="flex items-center justify-between gap-4">
          <div>
            <CardTitle>Consulta de RUC</CardTitle>
            <CardDescription>Consulta individual y masiva de RUCs.</CardDescription>
          </div>
          <Button asChild variant="outline" size="sm" className="shrink-0">
            <a href="https://e-consultaruc.sunat.gob.pe/cl-ti-itmrconsruc/jcrS00Alias" target="_blank" rel="noopener noreferrer">
              <ExternalLink className="h-4 w-4 mr-2" /> Ir Consulta RUC
            </a>
          </Button>
        </div>
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
                placeholder="Ingrese RUC (11 dígitos)"
                maxLength={11}
                className="flex-1"
              />
              <Button onClick={handleSingleQuery} disabled={isLoading || singleInput.length !== 11}>
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
              placeholder="Pegue RUCs separados por espacios, comas o saltos."
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