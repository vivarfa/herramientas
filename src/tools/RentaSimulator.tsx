
"use client";

import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useDebounce } from '@/hooks/use-debounce';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { FileDown } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

const UIT_VALUES: { [key: number]: number } = {
    2026: 5500,
    2025: 5350,
    2024: 5150,
    2023: 4950,
    2022: 4600
};

const tramosRenta = [
    { limitePorcentaje: 5, tasa: 0.08, nombre: "Hasta 5 UIT" },
    { limitePorcentaje: 20, tasa: 0.14, nombre: "Más de 5 a 20 UIT" },
    { limitePorcentaje: 35, tasa: 0.17, nombre: "Más de 20 a 35 UIT" },
    { limitePorcentaje: 45, tasa: 0.20, nombre: "Más de 35 a 45 UIT" },
    { limitePorcentaje: Infinity, tasa: 0.30, nombre: "Más de 45 UIT" }
];


export function RentaSimulator() {
    const [calcType, setCalcType] = useState('5ta');
    const [year, setYear] = useState(String(new Date().getFullYear()));
    const [manualUitStr, setManualUitStr] = useState("");
    const [remuneracionMensualStr, setRemuneracionMensualStr] = useState("");
    const [otrosIngresos5taStr, setOtrosIngresos5taStr] = useState("");
    const [ingresos4taStr, setIngresos4taStr] = useState("");
    const [gratiOption, setGratiOption] = useState('auto');
    
    const debouncedRemMensual = useDebounce(remuneracionMensualStr, 300);
    const debouncedOtrosIngresos5ta = useDebounce(otrosIngresos5taStr, 300);
    const debouncedIngresos4ta = useDebounce(ingresos4taStr, 300);
    const debouncedManualUit = useDebounce(manualUitStr, 300);
    
    const calculation = useMemo(() => {
        const yearInt = parseInt(year, 10);
        const manualUit = parseFloat(debouncedManualUit) || 0;
        const uit = manualUit > 0 ? manualUit : (UIT_VALUES[yearInt] || 0);
        
        const remMensual = parseFloat(debouncedRemMensual) || 0;
        const otrosIngresosAnuales = parseFloat(debouncedOtrosIngresos5ta) || 0;
        const ingresos4ta = parseFloat(debouncedIngresos4ta) || 0;
        
        let rentaBruta5ta = 0, rentaBruta4ta = 0, deduccion20 = 0;
        
        if (calcType === '5ta' || calcType === '4ta_5ta') {
            const sueldoAnual = remMensual * 12;
            let gratificaciones = 0, bonoLey = 0;
            if (gratiOption === 'auto') {
                gratificaciones = remMensual * 2;
                bonoLey = gratificaciones * 0.09;
            }
            rentaBruta5ta = sueldoAnual + gratificaciones + bonoLey + otrosIngresosAnuales;
        }

        if (calcType === '4ta' || calcType === '4ta_5ta') {
            rentaBruta4ta = ingresos4ta;
            const deduccion20_tope = 24 * uit;
            deduccion20 = Math.min(rentaBruta4ta * 0.20, deduccion20_tope);
        }

        const rentaBrutaTotal = rentaBruta5ta + rentaBruta4ta;
        const rentaNetaTrabajo = rentaBrutaTotal - deduccion20;
        const deduccion7UIT = 7 * uit;
        const rentaNetaImponible = Math.max(0, rentaNetaTrabajo - deduccion7UIT);
        
        let impuestoAnual = 0, remanente = rentaNetaImponible;
        let limiteAnterior = 0;

        for (const tramo of tramosRenta) {
            if (remanente <= 0) break;
            const limiteAbsoluto = tramo.limitePorcentaje * uit;
            const baseTramo = Math.min(remanente, limiteAbsoluto - limiteAnterior);
            if (baseTramo <= 0) continue;
            impuestoAnual += baseTramo * tramo.tasa;
            remanente -= baseTramo;
            limiteAnterior = limiteAbsoluto;
        }

        const retencionMensual = (rentaBrutaTotal > 0) ? impuestoAnual / 12 : 0;

        return {
            uit,
            rentaBruta5ta,
            rentaBruta4ta,
            deduccion20,
            rentaBrutaTotal,
            deduccion7UIT,
            rentaNetaImponible,
            impuestoAnual,
            retencionMensual
        };
    }, [calcType, year, debouncedManualUit, debouncedRemMensual, debouncedOtrosIngresos5ta, debouncedIngresos4ta, gratiOption]);

    const handleExportPDF = () => {
        const doc = new jsPDF();
        
        doc.setFontSize(18);
        doc.text(`Reporte de Cálculo de Renta ${year}`, 14, 22);
        doc.setFontSize(11);
        doc.setTextColor(100);
        doc.text(`UIT de Cálculo: S/ ${calculation.uit.toFixed(2)}`, 14, 28);
    
        const tableBody = [];
        if (calcType === '5ta' || calcType === '4ta_5ta') {
            tableBody.push(['(+) Renta Bruta 5ta Categoría', `S/ ${calculation.rentaBruta5ta.toFixed(2)}`]);
        }
        if (calcType === '4ta' || calcType === '4ta_5ta') {
            tableBody.push(['(+) Renta Bruta 4ta Categoría', `S/ ${calculation.rentaBruta4ta.toFixed(2)}`]);
        }
        if (calcType === '4ta' || calcType === '4ta_5ta') {
            tableBody.push(['(-) Deducción 20% (Tope S/ '+(24 * calculation.uit).toFixed(2)+')', `S/ ${calculation.deduccion20.toFixed(2)}`]);
        }
         tableBody.push(['(-) Deducción 7 UIT', `S/ ${calculation.deduccion7UIT.toFixed(2)}`]);
         tableBody.push(['(=) Renta Neta Imponible', `S/ ${calculation.rentaNetaImponible.toFixed(2)}`]);


        autoTable(doc, {
            startY: 35,
            head: [['Concepto', 'Valor']],
            body: tableBody,
            foot: [
                [{ content: 'Impuesto Anual Proyectado', styles: { halign: 'left', fontStyle: 'bold' } }, { content: `S/ ${calculation.impuestoAnual.toFixed(2)}`, styles: { halign: 'right', fontStyle: 'bold' } }],
                [{ content: 'Retención Mensual Estimada', styles: { halign: 'left', fontStyle: 'bold' } }, { content: `S/ ${calculation.retencionMensual.toFixed(2)}`, styles: { halign: 'right', fontStyle: 'bold' } }]
            ],
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
                 doc.text("Generado por BILUZ Herramientas Contables", pageSize.width / 2, pageHeight - 10, { align: 'center' });
            }
        });
    
        doc.save(`Reporte_Renta_${year}.pdf`);
    };

    const handleExportExcel = () => {
        const data = [
            { Concepto: "Año de Cálculo", Valor: year },
            { Concepto: "UIT de Cálculo", Valor: `S/ ${calculation.uit.toFixed(2)}`},
        ];

        if (calcType === '5ta' || calcType === '4ta_5ta') {
            data.push({ Concepto: '(+) Renta Bruta 5ta Categoría', Valor: `S/ ${calculation.rentaBruta5ta.toFixed(2)}` });
        }
        if (calcType === '4ta' || calcType === '4ta_5ta') {
            data.push({ Concepto: '(+) Renta Bruta 4ta Categoría', Valor: `S/ ${calculation.rentaBruta4ta.toFixed(2)}` });
        }
        if (calcType === '4ta' || calcType === '4ta_5ta') {
            data.push({ Concepto: '(-) Deducción 20% (Tope S/ '+(24 * calculation.uit).toFixed(2)+')', Valor: `S/ ${calculation.deduccion20.toFixed(2)}` });
        }
        data.push({ Concepto: "(-) Deducción 7 UIT", Valor: `S/ ${calculation.deduccion7UIT.toFixed(2)}` });
        data.push({ Concepto: "(=) Renta Neta Imponible", Valor: `S/ ${calculation.rentaNetaImponible.toFixed(2)}` });
        data.push({ Concepto: "Impuesto Anual Proyectado", Valor: `S/ ${calculation.impuestoAnual.toFixed(2)}` });
        data.push({ Concepto: "Retención Mensual Estimada", Valor: `S/ ${calculation.retencionMensual.toFixed(2)}` });
        

        const worksheet = XLSX.utils.json_to_sheet(data);
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, 'Cálculo Renta');
        const note = [["Generado por BILUZ Herramientas Contables"]];
        XLSX.utils.sheet_add_aoa(worksheet, note, { origin: -1 });

        XLSX.writeFile(workbook, `Reporte_Renta_${year}.xlsx`);
    };

    return (
        <Card className="flex flex-col h-full">
            <CardHeader>
                <CardTitle>Cálculo de Renta de Trabajo</CardTitle>
                <CardDescription>Estima tu impuesto a la renta anual proyectado.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6 flex-grow">
                <Tabs defaultValue="5ta" onValueChange={setCalcType} className="w-full">
                    <TabsList className="grid w-full grid-cols-3">
                        <TabsTrigger value="5ta">5ta Cat.</TabsTrigger>
                        <TabsTrigger value="4ta">4ta Cat.</TabsTrigger>
                        <TabsTrigger value="4ta_5ta">4ta + 5ta</TabsTrigger>
                    </TabsList>
                </Tabs>
                
                <p className="text-center text-sm text-muted-foreground">Cálculo basado en la UIT de {year}: S/ {calculation.uit.toFixed(2)}</p>
                {year === '2026' && (
                    <Alert variant="destructive">
                        <AlertTitle>¡Atención!</AlertTitle>
                        <AlertDescription>El valor de la UIT para 2026 (S/ 5,500) es una proyección.</AlertDescription>
                    </Alert>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                    <div className="space-y-2">
                        <Label>Año del Cálculo:</Label>
                        <Select value={year} onValueChange={setYear}>
                            <SelectTrigger><SelectValue /></SelectTrigger>
                            <SelectContent>
                                {Object.keys(UIT_VALUES).sort((a,b) => parseInt(b) - parseInt(a)).map(y => <SelectItem key={y} value={y}>{y}</SelectItem>)}
                            </SelectContent>
                        </Select>
                    </div>
                    <div className="space-y-2">
                        <Label>UIT Manual (S/):</Label>
                        <Input type="number" placeholder="Opcional" value={manualUitStr} onChange={e => setManualUitStr(e.target.value)} />
                    </div>
                </div>

                {(calcType === '5ta' || calcType === '4ta_5ta') && (
                    <div className="space-y-4 p-4 border rounded-lg">
                        <h4 className="font-semibold text-primary">Renta de 5ta Categoría</h4>
                        <div className="space-y-2">
                            <Label>Remuneración Mensual (S/):</Label>
                            <Input type="number" value={remuneracionMensualStr} onChange={e => setRemuneracionMensualStr(e.target.value)} placeholder="Ej: 3000.00" />
                        </div>
                        <div className="space-y-2">
                            <Label>Proyección de Gratificaciones:</Label>
                            <RadioGroup defaultValue="auto" onValueChange={setGratiOption} className="flex gap-4 pt-1">
                                <div className="flex items-center space-x-2"><RadioGroupItem value="auto" id="grati_auto" /><Label htmlFor="grati_auto">Automático (14 sueldos + Bono)</Label></div>
                                <div className="flex items-center space-x-2"><RadioGroupItem value="none" id="grati_none" /><Label htmlFor="grati_none">Sin Grati (12 sueldos)</Label></div>
                            </RadioGroup>
                        </div>
                        <div className="space-y-2">
                            <Label>Otros Ingresos Anuales (Ej: bonos):</Label>
                            <Input type="number" placeholder="Opcional" value={otrosIngresos5taStr} onChange={e => setOtrosIngresos5taStr(e.target.value)} />
                        </div>
                    </div>
                )}
                
                {(calcType === '4ta' || calcType === '4ta_5ta') && (
                     <div className="space-y-4 p-4 border rounded-lg">
                        <h4 className="font-semibold text-primary">Renta de 4ta Categoría</h4>
                        <div className="space-y-2">
                            <Label>Total Ingresos Anuales (R.H.):</Label>
                            <Input type="number" value={ingresos4taStr} onChange={e => setIngresos4taStr(e.target.value)} placeholder="Ej: 50000.00" />
                        </div>
                    </div>
                )}

                <div className="bg-muted/50 p-6 rounded-lg space-y-3">
                    <ResultItem label="Remuneración Bruta Anual Proyectada:" value={`S/ ${calculation.rentaBrutaTotal.toFixed(2)}`} />
                    <ResultItem label="(-) Deducción de 7 UIT:" value={`S/ ${calculation.deduccion7UIT.toFixed(2)}`} />
                    <ResultItem label="(=) Renta Neta Anual Imponible:" value={`S/ ${calculation.rentaNetaImponible.toFixed(2)}`} />
                    <hr className="my-2" />
                    <ResultItem label="Impuesto Anual Proyectado:" value={`S/ ${calculation.impuestoAnual.toFixed(2)}`} isPrimary />
                    <ResultItem label="Retención Mensual Estimada:" value={`S/ ${calculation.retencionMensual.toFixed(2)}`} isAccent />
                </div>

                <div className="flex justify-end gap-2">
                    <Button variant="outline" onClick={handleExportPDF}><FileDown className="mr-2 h-4 w-4" /> PDF</Button>
                    <Button variant="outline" onClick={handleExportExcel}><FileDown className="mr-2 h-4 w-4" /> Excel</Button>
                </div>
            </CardContent>
            <CardFooter>
                <p className="text-xs text-muted-foreground w-full text-center">
                </p>
            </CardFooter>
        </Card>
    );
}

const ResultItem = ({ label, value, isPrimary = false, isAccent = false }: { label: string; value: string; isPrimary?: boolean; isAccent?: boolean }) => (
    <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">{label}</p>
        <p className={`font-bold ${isPrimary ? 'text-lg text-primary' : isAccent ? 'text-lg text-accent' : 'text-md'}`}>{value}</p>
    </div>
);
