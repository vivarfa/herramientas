
"use client";

import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { useDebounce } from '@/hooks/use-debounce';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar as CalendarIcon, FileDown } from 'lucide-react';
import { Calendar } from '@/components/ui/calendar';
import { format, parse, isValid, differenceInDays } from 'date-fns';
import { es } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';

const ASIGNACION_FAMILIAR_MONTO = 113.00;
const MESES_PERIODO_CTS = 6;
const DIAS_POR_MES_CTS = 30;

const DateInput = ({ value, onChange, disabled }: { value?: Date; onChange: (date?: Date) => void; disabled?: boolean }) => {
    const [stringValue, setStringValue] = useState(value ? format(value, 'dd/MM/yyyy') : '');
    const [popoverOpen, setPopoverOpen] = useState(false);

    React.useEffect(() => {
        if (value) {
            const formattedDate = format(value, 'dd/MM/yyyy');
            if (formattedDate !== stringValue) {
                setStringValue(formattedDate);
            }
        } else {
            setStringValue('');
        }
    }, [value]);

    const handleStringChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setStringValue(e.target.value);
    };

    const handleBlur = () => {
        let parsedDate = parse(stringValue, 'dd/MM/yyyy', new Date());
        if (!isValid(parsedDate)) {
            parsedDate = parse(stringValue, 'dd-MM-yyyy', new Date());
        }

        if (isValid(parsedDate)) {
            onChange(parsedDate);
        } else {
             onChange(undefined);
        }
    };
    
    const handleDateSelect = (date?: Date) => {
        if(date){
            onChange(date);
        } else {
            onChange(undefined);
        }
        setPopoverOpen(false);
    };

    return (
        <Popover open={popoverOpen} onOpenChange={setPopoverOpen}>
            <div className="relative">
                <Input
                    type="text"
                    placeholder="dd/mm/aaaa"
                    value={stringValue}
                    onChange={handleStringChange}
                    onBlur={handleBlur}
                    className="pr-10"
                    disabled={disabled}
                />
                <PopoverTrigger asChild>
                    <Button variant="ghost" size="icon" className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7 text-muted-foreground" disabled={disabled}>
                        <CalendarIcon className="h-4 w-4" />
                        <span className="sr-only">Abrir calendario</span>
                    </Button>
                </PopoverTrigger>
            </div>
            <PopoverContent className="w-auto p-0">
                <Calendar
                    mode="single"
                    selected={value}
                    onSelect={handleDateSelect}
                    initialFocus
                    locale={es}
                    captionLayout="dropdown-buttons"
                    fromYear={1990}
                    toYear={new Date().getFullYear() + 5}
                />
            </PopoverContent>
        </Popover>
    );
};

// --- Funciones de Cálculo de Fechas ---
const getPeriodoCTS = (fechaFin: Date) => {
    const year = fechaFin.getFullYear();
    const month = fechaFin.getMonth(); // 0 = Enero
    if (month >= 4 && month <= 9) { // Periodo Mayo-Octubre para depósito de Noviembre
        return { start: new Date(year, 4, 1), end: new Date(year, 9, 31), tipo: 'Noviembre', nombre: `Mayo ${year} - Oct. ${year}` };
    } else { // Periodo Noviembre-Abril para depósito de Mayo
        const startYear = (month < 4) ? year - 1 : year;
        return { start: new Date(startYear, 10, 1), end: new Date(year, 3, 30), tipo: 'Mayo', nombre: `Nov. ${startYear} - Abr. ${year}` };
    }
};

const calcularTiempoComputableCTS = (fechaInicio: Date, fechaFin: Date, periodo: ReturnType<typeof getPeriodoCTS>) => {
    // Paso B: Determinar la Fecha de Inicio Real del Cómputo
    const inicioComputoTrunco = new Date(Math.max(fechaInicio.getTime(), periodo.start.getTime()));
    const fechaCese = new Date(fechaFin.getTime());

    if(inicioComputoTrunco > fechaCese) {
        return { mesesCompletos: 0, diasFraccion: 0, nombrePeriodo: "Sin periodo computable" };
    }

    // Paso C: Calcular Meses y Días
    const diasTotales = differenceInDays(fechaCese, inicioComputoTrunco) + 1; // Se suma 1 para incluir el último día
    const mesesCompletos = Math.floor(diasTotales / DIAS_POR_MES_CTS);
    const diasFraccion = diasTotales % DIAS_POR_MES_CTS;
    
    return { 
        mesesCompletos, 
        diasFraccion, 
        nombrePeriodo: `${format(inicioComputoTrunco, 'dd/MM/yyyy')} - ${format(fechaCese, 'dd/MM/yyyy')}`
    };
};


export function CtsCalculator() {
    const [sueldoStr, setSueldoStr] = useState("");
    const [asignacionFamiliar, setAsignacionFamiliar] = useState(false);
    const [promedioHorasExtrasStr, setPromedioHorasExtrasStr] = useState("");
    const [montoGratificacionAnteriorStr, setMontoGratificacionAnteriorStr] = useState("");
    const [fechaInicio, setFechaInicio] = useState<Date | undefined>();
    const [fechaFin, setFechaFin] = useState<Date | undefined>();
    const [regimen, setRegimen] = useState('general');

    const debouncedSueldo = useDebounce(sueldoStr, 300);
    const debouncedPromedioHorasExtras = useDebounce(promedioHorasExtrasStr, 300);
    const debouncedMontoGratificacionAnterior = useDebounce(montoGratificacionAnteriorStr, 300);
    
    const areInputsValid = useMemo(() => {
        const remuneracion = parseFloat(debouncedSueldo) || 0;
        return fechaInicio && fechaFin && remuneracion > 0 && fechaInicio <= fechaFin;
    }, [debouncedSueldo, fechaInicio, fechaFin]);

    const calculation = useMemo(() => {
        if (!areInputsValid) {
            return { remuneracionComputable: 0, periodo: '', mesesCompletos: 0, diasFraccion: 0, montoTotal: 0, mensajeInformativo: null };
        }
        
        // 1. Lógica de Cálculo de la Remuneración Computable (RC)
        const remuneracion = parseFloat(debouncedSueldo) || 0;
        const asignacion = asignacionFamiliar ? ASIGNACION_FAMILIAR_MONTO : 0;
        const promedioHorasExtras = parseFloat(debouncedPromedioHorasExtras) || 0;
        
        // Paso A: Identificar el Periodo de Cómputo Semestral
        const periodoCTS = getPeriodoCTS(fechaFin!);
        
        let remuneracionComputable = remuneracion + asignacion + promedioHorasExtras;
        if (periodoCTS.tipo === 'Noviembre') { // Depósito de Noviembre (Semestre Mayo-Oct)
             const gratificacionAnterior = parseFloat(debouncedMontoGratificacionAnterior) || 0;
             remuneracionComputable += gratificacionAnterior / MESES_PERIODO_CTS;
        }
        
        // 2. Determinación Correcta del Período y Tiempo de Servicio
        const { mesesCompletos, diasFraccion, nombrePeriodo } = calcularTiempoComputableCTS(fechaInicio!, fechaFin!, periodoCTS);
        
        // 3. Lógica de Cálculo del Monto Final por Régimen
        let montoCtsBruta = 0;
        let mensajeInformativo: string | null = null;
        
        if (regimen === 'general' || regimen === 'hogar') {
            montoCtsBruta = (remuneracionComputable / 12) * mesesCompletos + (remuneracionComputable / 12 / DIAS_POR_MES_CTS) * diasFraccion;
        } else if (regimen === 'mype_pequena') {
            const ctsGeneral = (remuneracionComputable / 12) * mesesCompletos + (remuneracionComputable / 12 / DIAS_POR_MES_CTS) * diasFraccion;
            montoCtsBruta = ctsGeneral / 2;
        } else if (regimen === 'agrario') {
            montoCtsBruta = 0;
            mensajeInformativo = "La CTS se encuentra incluida en la remuneración diaria del trabajador agrario (Ley N° 31110) y no requiere cálculo adicional.";
        }
        
        return {
            remuneracionComputable,
            periodo: nombrePeriodo,
            mesesCompletos,
            diasFraccion,
            montoTotal: montoCtsBruta,
            mensajeInformativo
        };

    }, [
        areInputsValid,
        debouncedSueldo, 
        asignacionFamiliar, 
        debouncedPromedioHorasExtras, 
        debouncedMontoGratificacionAnterior, 
        fechaInicio, 
        fechaFin, 
        regimen
    ]);

    const showGratificacionAnterior = useMemo(() => {
        if (!fechaFin) return false;
        const periodo = getPeriodoCTS(fechaFin);
        return periodo.tipo === 'Noviembre';
    }, [fechaFin]);

    const handleExportPDF = () => {
        if (!areInputsValid) return;
        const doc = new jsPDF();
        
        doc.setFontSize(18);
        doc.text(`Reporte de CTS`, 14, 22);
        doc.setFontSize(11);
        doc.setTextColor(100);
        doc.text(`Fecha de Emisión: ${new Date().toLocaleDateString('es-PE')}`, 14, 28);
    
        autoTable(doc, {
            startY: 35,
            head: [['Concepto', 'Valor']],
            body: [
                ['Remuneración Básica', `S/ ${parseFloat(sueldoStr).toFixed(2)}`],
                ['Asignación Familiar', asignacionFamiliar ? `S/ ${ASIGNACION_FAMILIAR_MONTO.toFixed(2)}` : 'No aplica'],
                ['Promedio Horas Extras/Comisiones', `S/ ${parseFloat(promedioHorasExtrasStr || '0').toFixed(2)}`],
                ['Régimen Laboral', `${regimen.charAt(0).toUpperCase() + regimen.slice(1)}`],
                ['Periodo Laborado', `${format(fechaInicio!, 'dd/MM/yyyy')} al ${format(fechaFin!, 'dd/MM/yyyy')}`],
                ['---', '---'],
                ['Remuneración Computable CTS', `S/ ${calculation.remuneracionComputable.toFixed(2)}`],
                ['Periodo de Cómputo', calculation.periodo],
                ['Tiempo Computable', `${calculation.mesesCompletos} meses y ${calculation.diasFraccion} días`],
            ],
            foot: [[
                { content: 'MONTO CTS A DEPOSITAR', styles: { halign: 'left', fontStyle: 'bold' } },
                { content: `S/ ${calculation.montoTotal.toFixed(2)}`, styles: { halign: 'right', fontStyle: 'bold' } }
            ]],
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
    
        doc.save(`Reporte_CTS_${Date.now()}.pdf`);
    };
    
    const handleExportExcel = () => {
        if (!areInputsValid) return;
        
        const dataForExcel = [
            { Concepto: 'Remuneración Básica', Valor: `S/ ${parseFloat(sueldoStr).toFixed(2)}` },
            { Concepto: 'Asignación Familiar', Valor: asignacionFamiliar ? `S/ ${ASIGNACION_FAMILIAR_MONTO.toFixed(2)}` : 'No aplica' },
            { Concepto: 'Promedio Horas Extras/Comisiones', Valor: `S/ ${parseFloat(promedioHorasExtrasStr || '0').toFixed(2)}`},
            { Concepto: 'Régimen Laboral', Valor: `${regimen.charAt(0).toUpperCase() + regimen.slice(1)}` },
            { Concepto: 'Periodo Laborado', Valor: `${format(fechaInicio!, 'dd/MM/yyyy')} al ${format(fechaFin!, 'dd/MM/yyyy')}` },
            { Concepto: '---', Valor: '---' },
            { Concepto: 'Remuneración Computable CTS', Valor: `S/ ${calculation.remuneracionComputable.toFixed(2)}` },
            { Concepto: 'Periodo de Cómputo', Valor: calculation.periodo },
            { Concepto: 'Tiempo Computable', Valor: `${calculation.mesesCompletos} meses y ${calculation.diasFraccion} días` },
            { Concepto: 'MONTO CTS A DEPOSITAR', Valor: `S/ ${calculation.montoTotal.toFixed(2)}` }
        ];

        const worksheet = XLSX.utils.json_to_sheet(dataForExcel);
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, "CTS");
        
        const note = [["Generado por BILUZ Herramientas Contables"]];
        XLSX.utils.sheet_add_aoa(worksheet, note, { origin: -1 });

        XLSX.writeFile(workbook, `Reporte_CTS_${Date.now()}.xlsx`);
    };

    return (
        <Card className="flex flex-col h-full">
            <CardHeader>
                <CardTitle>Calculadora de CTS</CardTitle>
                <CardDescription>Estima el monto de tu Compensación por Tiempo de Servicios (CTS) a depositar o liquidar.</CardDescription>
            </CardHeader>
            <CardContent className="grid grid-cols-1 lg:grid-cols-2 gap-4 lg:gap-8 flex-grow">
                {/* Input Column */}
                <div className="space-y-4">
                    <div className="space-y-2">
                        <Label htmlFor="sueldo">Remuneración Básica (Sueldo Mensual)</Label>
                        <Input id="sueldo" type="number" value={sueldoStr} onChange={(e) => setSueldoStr(e.target.value)} placeholder="Ej: 1800.00" />
                    </div>
                     <div className="flex items-start space-x-2 py-1">
                        <Checkbox id="asignacion" checked={asignacionFamiliar} onCheckedChange={(checked) => setAsignacionFamiliar(!!checked)} className="mt-1" />
                        <Label htmlFor="asignacion" className="text-sm leading-tight">Aplica Asignación Familiar (S/ {ASIGNACION_FAMILIAR_MONTO.toFixed(2)})</Label>
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="promedio-extras">Promedio Horas Extras/Comisiones (últimos 6 meses)</Label>
                        <Input id="promedio-extras" type="number" value={promedioHorasExtrasStr} onChange={(e) => setPromedioHorasExtrasStr(e.target.value)} placeholder="Ej: 250.00" />
                    </div>
                     {showGratificacionAnterior && (
                        <div className="space-y-2">
                            <Label htmlFor="gratificacion-anterior">Gratificación de Julio (para CTS de Nov.)</Label>
                            <Input id="gratificacion-anterior" type="number" value={montoGratificacionAnteriorStr} onChange={(e) => setMontoGratificacionAnteriorStr(e.target.value)} placeholder="Ej: 1800.00" />
                        </div>
                     )}
                     <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                        <div className="space-y-2">
                            <Label htmlFor="fecha-inicio">Fecha de Inicio Laboral</Label>
                            <DateInput value={fechaInicio} onChange={setFechaInicio} />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="fecha-fin">Fecha de Cese o Fin de Periodo</Label>
                             <DateInput value={fechaFin} onChange={setFechaFin} />
                        </div>
                    </div>
                     <div className="space-y-2">
                        <Label htmlFor="regimen">Régimen Laboral</Label>
                        <Select value={regimen} onValueChange={setRegimen}>
                            <SelectTrigger id="regimen"><SelectValue /></SelectTrigger>
                            <SelectContent>
                                <SelectItem value="general">Régimen General (Privado)</SelectItem>
                                <SelectItem value="mype_pequena">MYPE - Pequeña Empresa</SelectItem>
                                <SelectItem value="hogar">Trabajadores del Hogar</SelectItem>
                                <SelectItem value="agrario">Régimen Agrario (Ley 31110)</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                </div>
                {/* Results Column */}
                <div className='space-y-4'>
                    {areInputsValid && (
                        <div className="bg-muted/50 p-4 sm:p-6 rounded-lg space-y-3 sm:space-y-4 flex flex-col justify-center h-full">
                            <h3 className="text-lg font-semibold text-center">Resultado del Cálculo</h3>
                            <ResultItem label="Remuneración Computable CTS:" value={`S/ ${calculation.remuneracionComputable.toFixed(2)}`} />
                            <ResultItem label="Periodo de Cómputo:" value={calculation.periodo} />
                            <ResultItem label="Meses Computables:" value={`${calculation.mesesCompletos}`} />
                            <ResultItem label="Días Adicionales:" value={`${calculation.diasFraccion}`} />
                            <hr />
                            <ResultItem label="MONTO CTS A DEPOSITAR:" value={`S/ ${calculation.montoTotal.toFixed(2)}`} isPrimary />

                             {calculation.mensajeInformativo && (
                                <Alert className="mt-2">
                                    <AlertTitle>Nota del Régimen</AlertTitle>
                                    <AlertDescription>{calculation.mensajeInformativo}</AlertDescription>
                                </Alert>
                            )}

                             <div className="flex gap-2 pt-4">
                                <Button variant="outline" size="sm" onClick={handleExportPDF} className="w-full"><FileDown className="mr-2 h-4 w-4" /> PDF</Button>
                                <Button variant="outline" size="sm" onClick={handleExportExcel} className="w-full"><FileDown className="mr-2 h-4 w-4" /> Excel</Button>
                            </div>
                        </div>
                    )}
                     {!areInputsValid && (
                         <div className="bg-muted/50 p-6 rounded-lg space-y-4 flex flex-col justify-center h-full items-center">
                            <p className="text-muted-foreground text-center">Ingrese los datos para ver el resultado.</p>
                         </div>
                     )}
                </div>
            </CardContent>
            <CardFooter>
                 <p className="text-xs text-muted-foreground w-full text-center">
                </p>
            </CardFooter>
        </Card>
    );
}

const ResultItem = ({ label, value, isPrimary = false }: { label: string; value: string; isPrimary?: boolean }) => (
    <div className="flex items-center justify-between">
        <p className={`text-sm ${isPrimary ? 'font-semibold' : 'text-muted-foreground'}`}>{label}</p>
        <p className={`text-lg font-bold ${isPrimary ? 'text-primary' : ''}`}>{value}</p>
    </div>
);

  
