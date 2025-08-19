
"use client";

import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Button } from '@/components/ui/button';
import { useDebounce } from '@/hooks/use-debounce';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar as CalendarIcon, FileDown } from 'lucide-react';
import { Calendar } from '@/components/ui/calendar';
import { format, parse, isValid, getYear, getMonth } from 'date-fns';
import { es } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';

const ASIGNACION_FAMILIAR_MONTO = 113.00;
const PORCENTAJE_BONIFICACION_ESSALUD = 0.09;
const PORCENTAJE_BONIFICACION_EPS = 0.0675;
const MESES_GRATIFICACION = 6;
const DIAS_POR_MES_PARA_CALCULO = 30;

// --- Funciones de Cálculo de Fechas ---
const getPeriodoComputable = (fechaFin: Date) => {
    const year = fechaFin.getFullYear();
    const month = fechaFin.getMonth(); // 0-11
    if (month <= 5) { // Semestre Enero-Junio (Gratificación de Julio)
        return { 
            start: new Date(year, 0, 1), 
            end: new Date(year, 5, 30), 
            name: `Ene-Jun ${year}` 
        };
    } else { // Semestre Julio-Diciembre (Gratificación de Diciembre)
        return { 
            start: new Date(year, 6, 1), 
            end: new Date(year, 11, 31), 
            name: `Jul-Dic ${year}` 
        };
    }
};

const calcularMesesYDiasLaborados = (fechaInicio: Date, fechaFin: Date, periodo: {start: Date, end: Date}) => { 
    const s = new Date(Math.max(fechaInicio.getTime(), periodo.start.getTime()));
    const e = new Date(Math.min(fechaFin.getTime(), periodo.end.getTime()));

    if (s > e) return { mesesCompletos: 0, diasFraccion: 0 };
    
    let mesesCompletos = 0;
    let diasAcumulados = 0;
    let fechaIteracion = new Date(s.getTime());
    fechaIteracion.setDate(1);

    while(fechaIteracion <= e) {
        const anioActual = fechaIteracion.getFullYear();
        const mesActual = fechaIteracion.getMonth();
        
        const inicioMes = new Date(anioActual, mesActual, 1);
        const finMes = new Date(anioActual, mesActual + 1, 0);

        const fechaInicioCalculo = new Date(Math.max(s.getTime(), inicioMes.getTime()));
        const fechaFinCalculo = new Date(Math.min(e.getTime(), finMes.getTime()));

        if (fechaInicioCalculo <= fechaFinCalculo) {
            const diasEnPeriodo = fechaFinCalculo.getDate() - fechaInicioCalculo.getDate() + 1;
            if(fechaInicioCalculo.getDate() === 1 && fechaFinCalculo.getDate() === finMes.getDate()) {
                mesesCompletos++;
            } else {
                diasAcumulados += diasEnPeriodo;
            }
        }
        fechaIteracion.setMonth(fechaIteracion.getMonth() + 1);
    }
    
    mesesCompletos += Math.floor(diasAcumulados / DIAS_POR_MES_PARA_CALCULO);
    const diasFraccion = diasAcumulados % DIAS_POR_MES_PARA_CALCULO;

    return { mesesCompletos, diasFraccion };
}

const DateInput = ({ value, onChange }: { value?: Date; onChange: (date?: Date) => void }) => {
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
                />
                <PopoverTrigger asChild>
                    <Button variant="ghost" size="icon" className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7 text-muted-foreground">
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
                    toYear={new Date().getFullYear()}
                />
            </PopoverContent>
        </Popover>
    );
};


export function GratificacionesCalculator() {
    const [sueldoStr, setSueldoStr] = useState("");
    const [asignacionFamiliar, setAsignacionFamiliar] = useState(false);
    const [aportacionSalud, setAportacionSalud] = useState<'essalud' | 'eps'>('essalud');
    const [fechaInicio, setFechaInicio] = useState<Date | undefined>();
    const [fechaFin, setFechaFin] = useState<Date | undefined>();
    const [regimen, setRegimen] = useState('general');
    const [modalidadAgrario, setModalidadAgrario] = useState('incluida');
    
    const debouncedSueldo = useDebounce(sueldoStr, 300);

    const areInputsValid = useMemo(() => {
        const remuneracion = parseFloat(debouncedSueldo);
        if (!fechaInicio || !fechaFin || isNaN(remuneracion) || remuneracion <= 0) {
            return { valid: false, error: null };
        }
        if (fechaInicio > fechaFin) {
            return { valid: false, error: "La fecha de inicio no puede ser posterior a la de fin." };
        }
        return { valid: true, error: null };
    }, [debouncedSueldo, fechaInicio, fechaFin]);

    const calculation = useMemo(() => {
        if (!areInputsValid.valid) {
           return { remuneracionComputable: 0, periodo: '', mesesCompletos: 0, diasFraccion: 0, montoGratificacionBruta: 0, porcentajeBonificacion: 0, bonificacionExtraordinaria: 0, montoTotal: 0, mensajeInformativo: null };
        }
        
        const sueldo = parseFloat(debouncedSueldo) || 0;
        
        const asignacion = asignacionFamiliar ? ASIGNACION_FAMILIAR_MONTO : 0;
        const remuneracionComputable = sueldo + asignacion;
        
        const ceseYear = getYear(fechaFin!);
        const ceseMonth = getMonth(fechaFin!);
        const semestreInicio = ceseMonth < 6 ? new Date(ceseYear, 0, 1) : new Date(ceseYear, 6, 1);
        
        const inicioComputo = fechaInicio! > semestreInicio ? fechaInicio! : semestreInicio;

        const mesesCompletos = (getYear(fechaFin!) - getYear(inicioComputo)) * 12 + getMonth(fechaFin!) - getMonth(inicioComputo);

        let gratificacionBruta = (remuneracionComputable / 6) * mesesCompletos;

        let montoGratificacionBruta = 0;
        let mensajeInformativo = null;

        if (regimen === 'general' || (regimen === 'agrario' && modalidadAgrario === 'general')) {
             montoGratificacionBruta = gratificacionBruta;
        } else if (regimen === 'mype_pequena' || regimen === 'hogar') {
            montoGratificacionBruta = gratificacionBruta / 2;
        } else if (regimen === 'agrario' && modalidadAgrario === 'incluida') {
            montoGratificacionBruta = 0;
            mensajeInformativo = "La gratificación se encuentra incluida en la remuneración diaria y no requiere cálculo adicional.";
        }
        
        const porcentajeBonificacion = aportacionSalud === 'essalud' ? PORCENTAJE_BONIFICACION_ESSALUD : PORCENTAJE_BONIFICACION_EPS;
        const bonificacionExtraordinaria = montoGratificacionBruta * porcentajeBonificacion;
        const montoTotal = montoGratificacionBruta + bonificacionExtraordinaria;
        
        return {
            remuneracionComputable,
            periodo: getPeriodoComputable(fechaFin!).name,
            mesesCompletos,
            diasFraccion: 0, // Simplified to full months
            montoGratificacionBruta,
            porcentajeBonificacion,
            bonificacionExtraordinaria,
            montoTotal,
            mensajeInformativo
        };

    }, [areInputsValid.valid, debouncedSueldo, asignacionFamiliar, fechaInicio, fechaFin, aportacionSalud, regimen, modalidadAgrario]);


    const handleExportPDF = () => {
        if (!areInputsValid.valid) return;
        const doc = new jsPDF();
        
        doc.setFontSize(18);
        doc.text(`Reporte de Gratificación`, 14, 22);
        doc.setFontSize(11);
        doc.setTextColor(100);
        doc.text(`Fecha de Emisión: ${new Date().toLocaleDateString('es-PE')}`, 14, 28);
    
        autoTable(doc, {
            startY: 35,
            head: [['Concepto', 'Valor']],
            body: [
                ['Remuneración Básica', `S/ ${parseFloat(sueldoStr).toFixed(2)}`],
                ['Asignación Familiar', asignacionFamiliar ? `S/ ${ASIGNACION_FAMILIAR_MONTO.toFixed(2)}` : 'No aplica'],
                ['Régimen Laboral', `${regimen.charAt(0).toUpperCase() + regimen.slice(1)}`],
                ['Periodo Laborado', `${format(fechaInicio!, 'dd/MM/yyyy')} al ${format(fechaFin!, 'dd/MM/yyyy')}`],
                ['---', '---'],
                ['Remuneración Computable', `S/ ${calculation.remuneracionComputable.toFixed(2)}`],
                ['Periodo de Cómputo', calculation.periodo],
                ['Tiempo Computable', `${calculation.mesesCompletos} meses y ${calculation.diasFraccion} días`],
                ['Gratificación Bruta', `S/ ${calculation.montoGratificacionBruta.toFixed(2)}`],
                [`Bonificación (${(calculation.porcentajeBonificacion * 100).toFixed(2)}%)`, `S/ ${calculation.bonificacionExtraordinaria.toFixed(2)}`],
            ],
            foot: [[
                { content: 'MONTO TOTAL A RECIBIR', styles: { halign: 'left', fontStyle: 'bold' } },
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
    
        doc.save(`Reporte_Gratificacion_${Date.now()}.pdf`);
    };

    const handleExportExcel = () => {
        if (!areInputsValid.valid) return;
        
        const dataForExcel = [
            { Concepto: 'Remuneración Básica', Valor: `S/ ${parseFloat(sueldoStr).toFixed(2)}` },
            { Concepto: 'Asignación Familiar', Valor: asignacionFamiliar ? `S/ ${ASIGNACION_FAMILIAR_MONTO.toFixed(2)}` : 'No aplica' },
            { Concepto: 'Régimen Laboral', Valor: `${regimen.charAt(0).toUpperCase() + regimen.slice(1)}` },
            { Concepto: 'Periodo Laborado', Valor: `${format(fechaInicio!, 'dd/MM/yyyy')} al ${format(fechaFin!, 'dd/MM/yyyy')}` },
            { Concepto: '---', Valor: '---' },
            { Concepto: 'Remuneración Computable', Valor: `S/ ${calculation.remuneracionComputable.toFixed(2)}` },
            { Concepto: 'Periodo de Cómputo', Valor: calculation.periodo },
            { Concepto: 'Tiempo Computable', Valor: `${calculation.mesesCompletos} meses y ${calculation.diasFraccion} días` },
            { Concepto: 'Gratificación Bruta', Valor: `S/ ${calculation.montoGratificacionBruta.toFixed(2)}` },
            { Concepto: `Bonificación (${(calculation.porcentajeBonificacion * 100).toFixed(2)}%)`, Valor: `S/ ${calculation.bonificacionExtraordinaria.toFixed(2)}` },
            { Concepto: 'MONTO TOTAL A RECIBIR', Valor: `S/ ${calculation.montoTotal.toFixed(2)}` }
        ];

        const worksheet = XLSX.utils.json_to_sheet(dataForExcel);
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, "Gratificacion");
        
        const note = [["Generado por BILUZ Herramientas Contables"]];
        XLSX.utils.sheet_add_aoa(worksheet, note, { origin: -1 });

        XLSX.writeFile(workbook, `Reporte_Gratificacion_${Date.now()}.xlsx`);
    };
    
    return (
        <Card className="flex flex-col h-full">
            <CardHeader>
                <CardTitle>Calculadora de Gratificaciones</CardTitle>
                <CardDescription>Estima el monto de tu gratificación de forma precisa.</CardDescription>
            </CardHeader>
            <CardContent className="grid grid-cols-1 lg:grid-cols-2 gap-4 lg:gap-8 flex-grow">
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
                        <Label>Aportación de Salud (para Bonificación)</Label>
                        <RadioGroup value={aportacionSalud} onValueChange={(value: 'essalud' | 'eps') => setAportacionSalud(value)} className="flex flex-col sm:flex-row gap-2 sm:gap-4 pt-1">
                            <div className="flex items-center space-x-2"><RadioGroupItem value="essalud" id="essalud" /><Label htmlFor="essalud" className="text-sm">EsSalud (9%)</Label></div>
                            <div className="flex items-center space-x-2"><RadioGroupItem value="eps" id="eps" /><Label htmlFor="eps" className="text-sm">EPS (6.75%)</Label></div>
                        </RadioGroup>
                    </div>
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
                    {regimen === 'agrario' && (
                        <div className="space-y-2">
                            <Label htmlFor="modalidadAgrario">Modalidad (Régimen Agrario)</Label>
                            <Select value={modalidadAgrario} onValueChange={setModalidadAgrario}>
                                <SelectTrigger id="modalidadAgrario"><SelectValue /></SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="incluida">Incluida en remuneración diaria</SelectItem>
                                    <SelectItem value="general">Según régimen general (opcional)</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    )}
                </div>

                <div className='space-y-4'>
                    {!areInputsValid.valid ? (
                        <div className="bg-muted/50 p-6 rounded-lg space-y-4 flex flex-col justify-center h-full items-center">
                            {areInputsValid.error ? (
                                 <Alert variant="destructive">
                                    <AlertTitle>Error de Validación</AlertTitle>
                                    <AlertDescription>{areInputsValid.error}</AlertDescription>
                                </Alert>
                            ) : (
                                <p className="text-muted-foreground">Ingrese los datos para ver el resultado.</p>
                            )}
                        </div>
                    ) : (
                        <div className="bg-muted/50 p-6 rounded-lg space-y-4 flex flex-col justify-center">
                            <h3 className="text-lg font-semibold text-center">Resultados del Cálculo</h3>
                            <ResultItem label="Remuneración Computable:" value={`S/ ${calculation.remuneracionComputable.toFixed(2)}`} />
                            <ResultItem label="Periodo de Cómputo:" value={calculation.periodo} />
                            <ResultItem label="Meses Completos:" value={`${calculation.mesesCompletos}`} />
                            <ResultItem label="Gratificación Bruta:" value={`S/ ${calculation.montoGratificacionBruta.toFixed(2)}`} />
                            <ResultItem label={`Bonificación (${(calculation.porcentajeBonificacion * 100).toFixed(2)}%):`} value={`S/ ${calculation.bonificacionExtraordinaria.toFixed(2)}`} />
                            <hr />
                            <ResultItem label="MONTO TOTAL A RECIBIR:" value={`S/ ${calculation.montoTotal.toFixed(2)}`} isPrimary />

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
    <div className="flex items-center justify-between text-sm">
        <p className={`${isPrimary ? 'font-semibold' : 'text-muted-foreground'}`}>{label}</p>
        <p className={`font-semibold ${isPrimary ? 'text-primary text-lg' : ''}`}>{value}</p>
    </div>
);

  
