
"use client";

import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { useDebounce } from '@/hooks/use-debounce';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar as CalendarIcon, FileDown } from 'lucide-react';
import { Calendar } from '@/components/ui/calendar';
import { format, parse, isValid, differenceInDays } from 'date-fns';
import { es } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';

const ASIGNACION_FAMILIAR_MONTO = 113.00;
const DIAS_POR_ANIO_BASE = 360;

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


export function VacacionesCalculator() {
    const [sueldoStr, setSueldoStr] = useState("");
    const [asignacionFamiliar, setAsignacionFamiliar] = useState(false);
    const [fechaInicio, setFechaInicio] = useState<Date | undefined>();
    const [fechaCese, setFechaCese] = useState<Date | undefined>();
    const [haGozadoVacaciones, setHaGozadoVacaciones] = useState(false);
    const [fechaFinVacacionesGozadas, setFechaFinVacacionesGozadas] = useState<Date | undefined>();
    const [regimen, setRegimen] = useState('general');
    
    const debouncedSueldo = useDebounce(sueldoStr, 300);

    const areInputsValid = useMemo(() => {
        const remuneracion = parseFloat(debouncedSueldo) || 0;
        if (!fechaInicio || !fechaCese || remuneracion <= 0) return false;
        if (fechaInicio > fechaCese) return false;
        if (haGozadoVacaciones && !fechaFinVacacionesGozadas) return false;
        if (haGozadoVacaciones && fechaFinVacacionesGozadas && fechaFinVacacionesGozadas > fechaCese) return false;
        return true;
    }, [debouncedSueldo, fechaInicio, fechaCese, haGozadoVacaciones, fechaFinVacacionesGozadas]);

    const calculation = useMemo(() => {
        if (!areInputsValid) {
            return { remuneracionComputable: 0, periodoComputo: '', mesesCompletos: 0, diasAdicionales: 0, montoTotal: 0, mensajeInformativo: null, error: null };
        }

        let fechaInicioComputo = new Date(fechaInicio!);
        if (haGozadoVacaciones && fechaFinVacacionesGozadas) {
            const finVacasDate = new Date(fechaFinVacacionesGozadas);
            finVacasDate.setDate(finVacasDate.getDate() + 1); // El cómputo empieza el día siguiente
            fechaInicioComputo = new Date(Math.max(fechaInicio!.getTime(), finVacasDate.getTime()));
        }

        if (fechaInicioComputo > fechaCese!) {
             return { remuneracionComputable: 0, periodoComputo: '', mesesCompletos: 0, diasAdicionales: 0, montoTotal: 0, mensajeInformativo: null, error: "La fecha de fin de vacaciones gozadas no puede ser posterior a la fecha de cese." };
        }

        const sueldo = parseFloat(debouncedSueldo) || 0;
        const asignacion = asignacionFamiliar ? ASIGNACION_FAMILIAR_MONTO : 0;
        const remuneracionComputable = sueldo + asignacion;
        
        const totalDiasComputables = differenceInDays(fechaCese!, fechaInicioComputo) + 1;
        const mesesCompletos = Math.floor(totalDiasComputables / 30);
        const diasAdicionales = totalDiasComputables % 30;

        let montoVacaTruncaBruta = 0;
        let mensajeInformativo = null;

        if (regimen === 'general' || regimen === 'hogar') {
            montoVacaTruncaBruta = (remuneracionComputable / 12 * mesesCompletos) + (remuneracionComputable / 12 / 30 * diasAdicionales);
        } else if (regimen === 'mype_pequena') {
            montoVacaTruncaBruta = ((remuneracionComputable / 12 * mesesCompletos) + (remuneracionComputable / 12 / 30 * diasAdicionales)) / 2;
        } else if (regimen === 'agrario') {
            montoVacaTruncaBruta = 0;
            mensajeInformativo = "El derecho a vacaciones del trabajador agrario se incluye en la remuneración diaria (Ley N° 31110) y no requiere cálculo adicional.";
        }
        
        return {
            remuneracionComputable,
            periodoComputo: `${format(fechaInicioComputo, 'dd/MM/yyyy')} al ${format(fechaCese!, 'dd/MM/yyyy')}`,
            mesesCompletos,
            diasAdicionales,
            montoTotal: montoVacaTruncaBruta,
            mensajeInformativo,
            error: null
        };
    }, [areInputsValid, debouncedSueldo, asignacionFamiliar, fechaInicio, fechaCese, haGozadoVacaciones, fechaFinVacacionesGozadas, regimen]);

    const handleExportPDF = () => {
        if (!areInputsValid || calculation.error) return;
        const doc = new jsPDF();
        
        doc.setFontSize(18);
        doc.text(`Reporte de Vacaciones Truncas`, 14, 22);
        doc.setFontSize(11);
        doc.setTextColor(100);
        doc.text(`Fecha de Emisión: ${new Date().toLocaleDateString('es-PE')}`, 14, 28);
    
        autoTable(doc, {
            startY: 35,
            head: [['Concepto', 'Valor']],
            body: [
                ['Remuneración Computable Base', `S/ ${parseFloat(sueldoStr).toFixed(2)}`],
                ['Régimen Laboral', `${regimen.charAt(0).toUpperCase() + regimen.slice(1)}`],
                ['Periodo de Cese', `${format(fechaInicio!, 'dd/MM/yyyy')} al ${format(fechaCese!, 'dd/MM/yyyy')}`],
                ['---', '---'],
                ['Periodo Computado Efectivo', calculation.periodoComputo],
                ['Tiempo Computable', `${calculation.mesesCompletos} meses y ${calculation.diasAdicionales} días`],
            ],
            foot: [[
                { content: 'MONTO A PAGAR POR VACACIONES TRUNCAS', styles: { halign: 'left', fontStyle: 'bold' } },
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
    
        doc.save(`Reporte_Vacaciones_Truncas_${Date.now()}.pdf`);
    };
    
    const handleExportExcel = () => {
        if (!areInputsValid || calculation.error) return;
        
        const dataForExcel = [
            { Concepto: 'Remuneración Computable Base', Valor: `S/ ${parseFloat(sueldoStr).toFixed(2)}` },
            { Concepto: 'Régimen Laboral', Valor: `${regimen.charAt(0).toUpperCase() + regimen.slice(1)}` },
            { Concepto: 'Periodo de Cese', Valor: `${format(fechaInicio!, 'dd/MM/yyyy')} al ${format(fechaCese!, 'dd/MM/yyyy')}` },
            { Concepto: '---', Valor: '---' },
            { Concepto: 'Periodo Computado Efectivo', Valor: calculation.periodoComputo },
            { Concepto: 'Tiempo Computable', Valor: `${calculation.mesesCompletos} meses y ${calculation.diasAdicionales} días` },
            { Concepto: 'MONTO A PAGAR POR VACACIONES TRUNCAS', Valor: `S/ ${calculation.montoTotal.toFixed(2)}` }
        ];

        const worksheet = XLSX.utils.json_to_sheet(dataForExcel);
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, "Vacaciones Truncas");
        
        const note = [["Generado por BILUZ Herramientas Contables"]];
        XLSX.utils.sheet_add_aoa(worksheet, note, { origin: -1 });

        XLSX.writeFile(workbook, `Reporte_Vacaciones_Truncas_${Date.now()}.xlsx`);
    };

    return (
        <Card className="flex flex-col h-full">
            <CardHeader>
                <CardTitle>Calculadora de Vacaciones Truncas</CardTitle>
                <CardDescription>Estima el pago por vacaciones no gozadas al cese del vínculo laboral.</CardDescription>
            </CardHeader>
            <CardContent className="grid grid-cols-1 lg:grid-cols-2 gap-4 lg:gap-8 flex-grow">
                {/* Input Column */}
                <div className="space-y-4">
                    <div className="space-y-2">
                        <Label htmlFor="sueldo">Sueldo Básico (Remuneración Computable)</Label>
                        <Input id="sueldo" type="number" value={sueldoStr} onChange={(e) => setSueldoStr(e.target.value)} placeholder="Ej: 1800.00" />
                    </div>
                     <div className="flex items-start space-x-2 py-1">
                        <Checkbox id="asignacion" checked={asignacionFamiliar} onCheckedChange={(checked) => setAsignacionFamiliar(!!checked)} className="mt-1" />
                        <Label htmlFor="asignacion" className="text-sm leading-tight">Aplica Asignación Familiar (S/ {ASIGNACION_FAMILIAR_MONTO.toFixed(2)})</Label>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                        <div className="space-y-2">
                            <Label htmlFor="fecha-inicio">Fecha de Inicio Laboral</Label>
                            <DateInput value={fechaInicio} onChange={setFechaInicio} />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="fecha-cese">Fecha de Cese</Label>
                             <DateInput value={fechaCese} onChange={setFechaCese} />
                        </div>
                    </div>

                    <div className="space-y-2 pt-2">
                        <div className="flex items-start space-x-2">
                            <Checkbox id="gozado-vacaciones" checked={haGozadoVacaciones} onCheckedChange={(checked) => setHaGozadoVacaciones(!!checked)} className="mt-1" />
                            <Label htmlFor="gozado-vacaciones" className="text-sm leading-tight">¿El trabajador gozó vacaciones previamente?</Label>
                        </div>
                        {haGozadoVacaciones && (
                             <div className="space-y-2 pl-6 pt-2">
                                <Label htmlFor="fecha-fin-gozadas">Fecha de FIN del último periodo de vacaciones gozadas</Label>
                                <DateInput value={fechaFinVacacionesGozadas} onChange={setFechaFinVacacionesGozadas} />
                            </div>
                        )}
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
                <div className="bg-muted/50 p-4 sm:p-6 rounded-lg space-y-3 sm:space-y-4 flex flex-col justify-center h-full">
                     {areInputsValid ? (
                        <>
                            <h3 className="text-lg font-semibold text-center">Resultado del Cálculo</h3>
                             {calculation.error ? (
                                <Alert variant="destructive">
                                    <AlertTitle>Error en Fechas</AlertTitle>
                                    <AlertDescription>{calculation.error}</AlertDescription>
                                </Alert>
                            ) : (
                                <>
                                    <ResultItem label="Remuneración Computable:" value={`S/ ${calculation.remuneracionComputable.toFixed(2)}`} />
                                    <ResultItem label="Periodo Computado:" value={calculation.periodoComputo} />
                                    <ResultItem label="Meses Completos:" value={`${calculation.mesesCompletos}`} />
                                    <ResultItem label="Días Adicionales:" value={`${calculation.diasAdicionales}`} />
                                    <hr />
                                    <ResultItem label="PAGO POR VACACIONES TRUNCAS:" value={`S/ ${calculation.montoTotal.toFixed(2)}`} isPrimary />

                                    {calculation.mensajeInformativo && (
                                        <Alert className="mt-2">
                                            <AlertTitle>Nota del Régimen</AlertTitle>
                                            <AlertDescription>{calculation.mensajeInformativo}</AlertDescription>
                                        </Alert>
                                    )}

                                    <div className="flex gap-2 pt-4">
                                        <Button variant="outline" size="sm" onClick={handleExportPDF} className="w-full" disabled={!!calculation.error}><FileDown className="mr-2 h-4 w-4" /> PDF</Button>
                                        <Button variant="outline" size="sm" onClick={handleExportExcel} className="w-full" disabled={!!calculation.error}><FileDown className="mr-2 h-4 w-4" /> Excel</Button>
                                    </div>
                                </>
                            )}
                        </>
                    ) : (
                        <div className="text-center text-muted-foreground">
                            <p>Ingrese los datos para ver el resultado.</p>
                        </div>
                    )}
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

const ResultItem = ({ label, value, isPrimary = false }: { label: string; value: string; isPrimary?: boolean }) => (
    <div className="flex items-center justify-between">
        <p className={`text-sm ${isPrimary ? 'font-semibold' : 'text-muted-foreground'}`}>{label}</p>
        <p className={`text-lg font-bold ${isPrimary ? 'text-primary' : ''}`}>{value}</p>
    </div>
);

  
