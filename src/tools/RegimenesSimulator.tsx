
"use client";

import React, { useState, useMemo, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useDebounce } from '@/hooks/use-debounce';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { cn } from '@/lib/utils';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { FileDown, CheckCircle, XCircle } from 'lucide-react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';


const UIT_VALUES: { [key: number]: number } = {
    2026: 5500, 2025: 5350, 2024: 5150,
    2023: 4950, 2022: 4600, 2021: 4400
};

interface Regimen {
    name: string;
    ir: number;
    igv: number;
    itan: number;
    total: number;
    valid: boolean;
    reasons: string[];
}

export function RegimenesSimulator() {
    const [year, setYear] = useState(String(new Date().getFullYear()));
    const [ingresosMensuales, setIngresosMensuales] = useState('');
    const [comprasMensuales, setComprasMensuales] = useState('');
    const [ingresosAnuales, setIngresosAnuales] = useState('');
    const [comprasAnuales, setComprasAnuales] = useState('');
    const [gastosDeducibles, setGastosDeducibles] = useState('');
    const [valorActivos, setValorActivos] = useState('');
    const [necesitaFactura, setNecesitaFactura] = useState(true);
    const [masDe10Trabajadores, setMasDe10Trabajadores] = useState(false);
    const [isUpdating, setIsUpdating] = useState(false);

    const debouncedIngresosAnuales = useDebounce(ingresosAnuales, 300);
    const debouncedComprasAnuales = useDebounce(comprasAnuales, 300);
    const debouncedGastos = useDebounce(gastosDeducibles, 300);
    const debouncedActivos = useDebounce(valorActivos, 300);

    useEffect(() => {
        if (!isUpdating) {
            const ingMensual = parseFloat(ingresosMensuales) || 0;
            const newAnual = (ingMensual * 12).toFixed(2);
            if(String(ingMensual) === ingresosMensuales && newAnual !== ingresosAnuales) {
              setIngresosAnuales(newAnual);
            }
        }
    }, [ingresosMensuales, isUpdating]);

    useEffect(() => {
        if (!isUpdating) {
            const compMensual = parseFloat(comprasMensuales) || 0;
            const newAnual = (compMensual * 12).toFixed(2);
             if(String(compMensual) === comprasMensuales && newAnual !== comprasAnuales) {
                setComprasAnuales(newAnual);
            }
        }
    }, [comprasMensuales, isUpdating]);

    useEffect(() => {
        if (!isUpdating) {
            const ingAnual = parseFloat(ingresosAnuales) || 0;
            const newMensual = (ingAnual / 12).toFixed(2);
            if(String(ingAnual) === ingresosAnuales && newMensual !== ingresosMensuales) {
                setIngresosMensuales(newMensual);
            }
        }
    }, [ingresosAnuales, isUpdating]);

     useEffect(() => {
        if (!isUpdating) {
            const compAnual = parseFloat(comprasAnuales) || 0;
            const newMensual = (compAnual / 12).toFixed(2);
             if(String(compAnual) === comprasAnuales && newMensual !== comprasMensuales) {
                setComprasMensuales(newMensual);
            }
        }
    }, [comprasAnuales, isUpdating]);


    interface SimulationResult {
        recommendations: Regimen[];
        bestOption: Regimen | null;
        UIT: number;
    }

    const simulation: SimulationResult | null = useMemo(() => {
        const UIT = UIT_VALUES[parseInt(year, 10)] || 5150;
        const ingresos = parseFloat(debouncedIngresosAnuales) || 0;
        const compras = parseFloat(debouncedComprasAnuales) || 0;
        const gastos = parseFloat(debouncedGastos) || 0;
        const activos = parseFloat(debouncedActivos) || 0;
        
        if (ingresos <= 0) return null;

        const utilidad = Math.max(0, ingresos - compras - gastos);
        const igvPorPagar = Math.max(0, (ingresos * 0.18) - (compras * 0.18));
        let recommendations: Regimen[] = [];

        // Nuevo RUS
        let nrus = { name: 'Nuevo RUS', ir: 0, igv: 0, itan: 0, total: 0, valid: true, reasons: [] };
        if (ingresos > 96000 || compras > 96000) { nrus.valid = false; nrus.reasons.push('Supera S/ 96,000 en ingresos o compras.'); }
        if (activos > 70000) { nrus.valid = false; nrus.reasons.push('Supera S/ 70,000 en activos.'); }
        if (necesitaFactura) { nrus.valid = false; nrus.reasons.push('Requiere emitir facturas.'); }
        if (nrus.valid) { const promedioMensual = Math.max(ingresos, compras) / 12; nrus.total = (promedioMensual <= 5000) ? 20 * 12 : 50 * 12; nrus.ir = nrus.total; }
        recommendations.push(nrus);

        // RER
        let rer = { name: 'Régimen Especial (RER)', ir: 0, igv: igvPorPagar, itan: 0, total: 0, valid: true, reasons: [] };
        if (ingresos > 525000 || compras > 525000) { rer.valid = false; rer.reasons.push('Supera S/ 525,000 en ingresos o compras.'); }
        if (activos > 126000) { rer.valid = false; rer.reasons.push('Supera S/ 126,000 en activos.'); }
        if (masDe10Trabajadores) { rer.valid = false; rer.reasons.push('Supera los 10 trabajadores por turno.'); }
        if (rer.valid) { rer.ir = ingresos * 0.015; rer.total = rer.ir; }
        recommendations.push(rer);

        // MYPE
        let rmt = { name: 'Régimen MYPE (RMT)', ir: 0, igv: igvPorPagar, itan: 0, total: 0, valid: true, reasons: [] };
        if (ingresos > 1700 * UIT) { rmt.valid = false; rmt.reasons.push(`Supera 1,700 UIT (S/ ${(1700*UIT).toLocaleString()}) en ingresos.`); }
        if (rmt.valid) { if (utilidad <= 15 * UIT) { rmt.ir = utilidad * 0.10; } else { rmt.ir = (15 * UIT * 0.10) + ((utilidad - (15 * UIT)) * 0.295); } rmt.total = rmt.ir; }
        recommendations.push(rmt);

        // General
        let rg = { name: 'Régimen General (RG)', ir: 0, igv: igvPorPagar, itan: 0, total: 0, valid: true, reasons: [] };
        rg.ir = utilidad * 0.295;
        if (activos > 1000000) { rg.itan = (activos - 1000000) * 0.004; }
        rg.total = rg.ir + rg.itan;
        recommendations.push(rg);
        
        const validOptions = recommendations.filter(r => r.valid);
        const bestOption = validOptions.length > 0 ? validOptions.reduce((min, p) => p.total < min.total ? p : min, validOptions[0]) : null;

        return { recommendations, bestOption, UIT };
    }, [year, debouncedIngresosAnuales, debouncedComprasAnuales, debouncedGastos, debouncedActivos, necesitaFactura, masDe10Trabajadores]);

    const handleExportPDF = () => {
        if (!simulation) return;
        const { recommendations, bestOption, UIT } = simulation;
        const doc = new jsPDF();
        
        doc.setFontSize(18);
        doc.text(`Simulación de Regímenes Tributarios - ${year}`, 14, 22);
        doc.setFontSize(11);
        doc.setTextColor(100);
        doc.text(`UIT de Cálculo: S/ ${UIT.toLocaleString('es-PE')}`, 14, 28);
    
        const body = recommendations.map(r => {
            const isBest = bestOption && r.name === bestOption.name;
            if (!r.valid) {
                return [
                    { content: `${r.name}`, styles: { fontStyle: 'bold' } },
                    { content: 'No Aplica', colSpan: 2, styles: { textColor: [200, 0, 0] } },
                    { content: r.reasons.join(' '), colSpan: 2 }
                ] as any;
            }
            return [
                { content: `${r.name}${isBest ? ' (Recomendado)' : ''}`, styles: { fontStyle: 'bold' } },
                { content: r.ir.toFixed(2), styles: { halign: 'right' } },
                { content: r.igv.toFixed(2), styles: { halign: 'right' } },
                { content: r.itan.toFixed(2), styles: { halign: 'right' } },
                { content: r.total.toFixed(2), styles: { halign: 'right', fontStyle: 'bold', fillColor: isBest ? [232, 232, 255] : undefined } },
            ] as any;
        });

        autoTable(doc, {
            startY: 35,
            head: [['Régimen', 'Imp. Renta (S/)', 'IGV Neto (S/)', 'ITAN (S/)', 'Costo Anual (S/)']],
            body: body,
            theme: 'striped',
            headStyles: { fillColor: [63, 81, 181] },
            didDrawPage: (data) => {
                const pageSize = doc.internal.pageSize;
                const pageHeight = pageSize.height;
                doc.saveGraphicsState();
                doc.setFontSize(50);
                doc.setTextColor(150);
                doc.setGState(new (doc as any).GState({ opacity: 0.1 }));
                doc.text('BILUZ', pageSize.width / 2, pageHeight / 2, { align: 'center', angle: 45 });
                doc.restoreGraphicsState();
                doc.setFontSize(8);
                doc.setTextColor(120);
                doc.text("Generado por BILUZ", pageSize.width / 2, pageHeight - 10, { align: 'center' });
            }
        });
    
        doc.save(`Simulacion_Regimenes_${year}.pdf`);
    };
    
    const handleExportExcel = () => {
        if (!simulation) return;
        const { recommendations, bestOption, UIT } = simulation;
         const data = recommendations.map(r => {
            const isBest = bestOption && r.name === bestOption.name;
            return {
                'Régimen': r.name,
                'Recomendado': isBest ? 'Sí' : 'No',
                'Aplica': r.valid ? 'Sí' : 'No',
                'Motivo No Aplicación': r.valid ? '' : r.reasons.join(', '),
                'Impuesto a la Renta (S/)': r.valid ? r.ir.toFixed(2) : 'N/A',
                'IGV Neto (S/)': r.valid ? r.igv.toFixed(2) : 'N/A',
                'ITAN (S/)': r.valid ? r.itan.toFixed(2) : 'N/A',
                'Costo Anual Aprox. (S/)': r.valid ? r.total.toFixed(2) : 'N/A'
            }
        });
        
        const ws = XLSX.utils.json_to_sheet(data);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "Simulación");
        
        const note = [["Generado por BILUZ"]];
        XLSX.utils.sheet_add_aoa(ws, note, { origin: -1 });
        
        XLSX.writeFile(wb, `Simulacion_Regimenes_${year}.xlsx`);
    };

    return (
        <Card className="flex flex-col h-full">
            <CardHeader>
                <CardTitle>Simulador de Regímenes Tributarios</CardTitle>
                <CardDescription>Ingresa tus proyecciones para encontrar el régimen más conveniente.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6 flex-grow">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                    <div className="space-y-2">
                        <Label>Año de Cálculo (para la UIT):</Label>
                        <Select value={year} onValueChange={setYear}>
                            <SelectTrigger><SelectValue /></SelectTrigger>
                            <SelectContent>
                                {Object.keys(UIT_VALUES).sort((a,b) => parseInt(b) - parseInt(a)).map(y => <SelectItem key={y} value={y}>{y}</SelectItem>)}
                            </SelectContent>
                        </Select>
                    </div>
                </div>
                 {year === '2026' && (
                    <Alert variant="destructive">
                        <AlertTitle>¡Atención!</AlertTitle>
                        <AlertDescription>El valor de la UIT para 2026 (S/ {UIT_VALUES[2026]}) es una proyección.</AlertDescription>
                    </Alert>
                )}
                
                <div className="space-y-4 p-4 border rounded-md">
                     <h4 className="font-semibold text-primary">Proyecciones</h4>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                         <div className="space-y-2">
                            <Label>Ingresos Mensuales:</Label>
                            <Input type="number" placeholder="Ej: 8000" value={ingresosMensuales} onChange={e => setIngresosMensuales(e.target.value)} />
                        </div>
                         <div className="space-y-2">
                            <Label>Compras Mensuales:</Label>
                            <Input type="number" placeholder="Ej: 4000" value={comprasMensuales} onChange={e => setComprasMensuales(e.target.value)} />
                        </div>
                         <div className="space-y-2">
                            <Label>Ingresos Brutos Anuales:</Label>
                            <Input type="number" placeholder="Calculado" value={ingresosAnuales} onChange={e => setIngresosAnuales(e.target.value)} />
                        </div>
                         <div className="space-y-2">
                            <Label>Compras Anuales:</Label>
                            <Input type="number" placeholder="Calculado" value={comprasAnuales} onChange={e => setComprasAnuales(e.target.value)} />
                        </div>
                    </div>
                </div>

                <div className="space-y-4 p-4 border rounded-md">
                    <h4 className="font-semibold text-primary">Otros Datos (Opcional)</h4>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                        <div className="space-y-2">
                            <Label>Otros Gastos Deducibles:</Label>
                            <Input type="number" placeholder="Ej: 15000" value={gastosDeducibles} onChange={e => setGastosDeducibles(e.target.value)} />
                        </div>
                        <div className="space-y-2">
                            <Label>Valor Activos Fijos Netos:</Label>
                            <Input type="number" placeholder="Ej: 50000" value={valorActivos} onChange={e => setValorActivos(e.target.value)} />
                        </div>
                    </div>
                </div>
                
                 <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 pt-2">
                    <div className="flex items-center space-x-2">
                        <Switch id="necesitaFactura" checked={necesitaFactura} onCheckedChange={setNecesitaFactura} />
                        <Label htmlFor="necesitaFactura">¿Necesita emitir facturas?</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                        <Switch id="masDe10Trabajadores" checked={masDe10Trabajadores} onCheckedChange={setMasDe10Trabajadores} />
                        <Label htmlFor="masDe10Trabajadores">¿Tiene más de 10 trabajadores por turno?</Label>
                    </div>
                 </div>
                
                <div className="space-y-4 pt-4">
                    <h3 className="text-xl font-semibold text-center">Resultados de la Simulación</h3>
                    {simulation ? (
                        <div className="grid md:grid-cols-2 xl:grid-cols-4 gap-4">
                            {simulation.recommendations.map(r => (
                                <RegimenCard key={r.name} regimen={r} isBest={simulation.bestOption?.name === r.name} />
                            ))}
                        </div>
                    ) : (
                        <div className="text-center text-muted-foreground p-8 bg-muted/50 rounded-lg">
                            <p>Ingrese una proyección de ingresos para empezar la simulación.</p>
                        </div>
                    )}
                </div>

                 <div className="flex justify-end gap-2">
                    <Button variant="outline" onClick={handleExportPDF} disabled={!simulation}><FileDown className="mr-2 h-4 w-4" /> PDF</Button>
                    <Button variant="outline" onClick={handleExportExcel} disabled={!simulation}><FileDown className="mr-2 h-4 w-4" /> Excel</Button>
                </div>

            </CardContent>
            <CardFooter>
                 <p className="text-xs text-muted-foreground w-full text-center">
                    © BILUZ - Todos los Derechos Reservados
                 </p>
            </CardFooter>
        </Card>
    );
}

const RegimenCard = ({ regimen, isBest }: { regimen: Regimen, isBest: boolean }) => {
    const toSoles = (val: number) => `S/ ${val.toLocaleString('es-PE', {minimumFractionDigits: 2, maximumFractionDigits: 2})}`;

    if (!regimen.valid) {
        return (
            <Card className="bg-muted/30 border-dashed flex flex-col">
                <CardHeader>
                    <CardTitle className="text-muted-foreground">{regimen.name}</CardTitle>
                </CardHeader>
                <CardContent className="flex-grow flex flex-col items-center justify-center text-center">
                     <XCircle className="w-10 h-10 text-destructive mb-2"/>
                    <p className="text-sm font-semibold text-destructive">No Aplica</p>
                    <p className="text-xs text-muted-foreground mt-1">{regimen.reasons.join(' ')}</p>
                </CardContent>
            </Card>
        );
    }
    
    return (
        <Card className={cn("flex flex-col transition-all", isBest && "ring-2 ring-primary animate-glow shadow-primary/20 shadow-lg")}>
            <CardHeader>
                 <CardTitle className={cn(isBest && "text-primary")}>{regimen.name}</CardTitle>
                 {isBest && <CardDescription className="text-primary font-semibold">Opción Recomendada</CardDescription>}
            </CardHeader>
            <CardContent className="flex-grow space-y-2 text-sm">
                {regimen.name !== 'Nuevo RUS' ? (
                    <>
                        <div className="flex justify-between"><span>Imp. Renta:</span> <strong>{toSoles(regimen.ir)}</strong></div>
                        <div className="flex justify-between"><span>IGV (Neto):</span> <strong>{toSoles(regimen.igv)}</strong></div>
                         {regimen.itan > 0 && <div className="flex justify-between"><span>ITAN:</span> <strong>{toSoles(regimen.itan)}</strong></div>}
                         {regimen.name === 'Régimen Especial (RER)' && (
                            <div className="text-orange-600 dark:text-orange-400 text-xs pt-1">(Tope: 10 trabajadores por turno)</div>
                         )}
                    </>
                ) : (
                    <div className="flex justify-between"><span>Cuota Única Anual:</span> <strong>{toSoles(regimen.total)}</strong></div>
                )}
            </CardContent>
            <CardFooter className="flex-col items-start bg-muted/50 p-4 rounded-b-lg mt-4">
                <span className="text-xs text-muted-foreground">Costo Anual Aprox.</span>
                <p className="text-xl font-bold text-accent">{toSoles(regimen.total)}</p>
            </CardFooter>
        </Card>
    )
}
