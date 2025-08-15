
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
import { Calendar as CalendarIcon } from 'lucide-react';
import { Calendar } from '@/components/ui/calendar';
import { format, parse, isValid, differenceInDays, getYear, getMonth, getDate, addYears, startOfMonth, lastDayOfMonth } from 'date-fns';
import { es } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';

const ASIGNACION_FAMILIAR_MONTO = 113.00;
const ESSALUD_BONUS_PERCENTAGE = 0.09;
const EPS_BONUS_PERCENTAGE = 0.0675;

const REGIMES_CONFIG = {
    general: { name: 'Régimen General', gratiFactor: 1, ctsFactor: 1, vacationsFactor: 1 },
    pequena: { name: 'Pequeña Empresa', gratiFactor: 0.5, ctsFactor: 0.5, vacationsFactor: 0.5 },
    micro: { name: 'Microempresa', gratiFactor: 0, ctsFactor: 0, vacationsFactor: 0 },
};

const DateInput = ({ value, onChange, label }: { value?: Date; onChange: (date?: Date) => void; label: string; }) => {
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
                    aria-label={label}
                />
                <PopoverTrigger asChild>
                    <Button variant="ghost" size="icon" className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7 text-muted-foreground">
                        <CalendarIcon className="h-4 w-4" />
                        <span className="sr-only">Abrir calendario para {label}</span>
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


// --- Funciones de Cálculo ---
const calculateGratificacion = (fechaInicio: Date, fechaCese: Date, remComputable: number, regimen: string, seguro: string) => {
    const config = REGIMES_CONFIG[regimen as keyof typeof REGIMES_CONFIG];
    if (config.gratiFactor === 0) return { total: 0, gratificacionBase: 0, details: "No corresponde para Microempresa." };

    const ceseMonth = getMonth(fechaCese);
    const ceseYear = getYear(fechaCese);
    const isPrimerSemestre = ceseMonth < 6; // Ene-Jun
    
    const inicioSemestre = isPrimerSemestre ? new Date(ceseYear, 0, 1) : new Date(ceseYear, 6, 1);
    const periodName = isPrimerSemestre ? "Ene-Jun" : "Jul-Dic";

    const inicioComputo = fechaInicio > inicioSemestre ? fechaInicio : inicioSemestre;
    if (inicioComputo > fechaCese) {
        return { total: 0, gratificacionBase: 0, details: "Sin tiempo computable en el semestre." };
    }

    const mesesCompletos = (getYear(fechaCese) - getYear(inicioComputo)) * 12 + (getMonth(fechaCese) - getMonth(inicioComputo));
    
    const gratiCalculada = ((remComputable / 6) * mesesCompletos) * config.gratiFactor;
    const bonusRate = seguro === 'essalud' ? ESSALUD_BONUS_PERCENTAGE : EPS_BONUS_PERCENTAGE;
    const bonificacion = gratiCalculada * bonusRate;
    
    return {
        gratificacionBase: gratiCalculada,
        total: gratiCalculada + bonificacion,
        details: `Por ${mesesCompletos}m en ${periodName}`,
    };
};

const calculateCTS = (fechaInicio: Date, fechaCese: Date, remComputable: number, gratiBase: number, regimen: string) => {
    const config = REGIMES_CONFIG[regimen as keyof typeof REGIMES_CONFIG];
    if (config.ctsFactor === 0) return { total: 0, details: "No corresponde para Microempresa." };
    
    const remComputableCTS = remComputable + (gratiBase / 6);
    
    const ceseMonth = getMonth(fechaCese);
    let inicioSemestre, periodName;

    if (ceseMonth >= 4 && ceseMonth <= 9) { // Periodo Mayo-Oct
        inicioSemestre = new Date(getYear(fechaCese), 4, 1);
        periodName = "May-Oct";
    } else { // Periodo Nov-Abr
        const startYear = ceseMonth < 4 ? getYear(fechaCese) - 1 : getYear(fechaCese);
        inicioSemestre = new Date(startYear, 10, 1);
        periodName = "Nov-Abr";
    }

    const inicioComputo = fechaInicio > inicioSemestre ? fechaInicio : inicioSemestre;

    if (inicioComputo >= fechaCese) {
        return { total: 0, details: "Sin tiempo computable en el período." };
    }
    
    const totalDias = differenceInDays(fechaCese, inicioComputo) + 1;
    const meses = Math.floor(totalDias / 30);
    const dias = totalDias % 30;

    const ctsTotal = ((remComputableCTS / 12 * meses) + (remComputableCTS / 360 * dias)) * config.ctsFactor;
    
    return {
        total: ctsTotal,
        details: `Por ${meses}m y ${dias}d (Per. ${periodName})`
    };
};

const calculateVacations = (fechaInicio: Date, fechaCese: Date, remComputable: number, regimen: string) => {
    const config = REGIMES_CONFIG[regimen as keyof typeof REGIMES_CONFIG];
    if (config.vacationsFactor === 0) return { total: 0, details: "No corresponde para Microempresa." };
    
    let totalDias = differenceInDays(fechaCese, fechaInicio);
    if(totalDias < 0) totalDias = 0;

    const aniosCompletos = Math.floor(totalDias / 365);
    const ultimoAniversario = addYears(fechaInicio, aniosCompletos);
    
    if (ultimoAniversario > fechaCese) {
        return { total: 0, details: "Sin récord trunco." };
    }

    const diasTruncos = differenceInDays(fechaCese, ultimoAniversario);
    const meses = Math.floor(diasTruncos / 30);
    const dias = diasTruncos % 30;

    const vacacionesTotal = ((remComputable / 12 * meses) + (remComputable / 360 * dias)) * config.vacationsFactor;
    
    return {
        total: vacacionesTotal,
        details: `Por ${meses}m y ${dias}d de récord trunco.`
    };
};

export function LiquidacionBeneficiosCalculator() {
    const [sueldoStr, setSueldoStr] = useState("");
    const [asignacionFamiliar, setAsignacionFamiliar] = useState(false);
    const [promedioVariablesStr, setPromedioVariablesStr] = useState("");
    const [fechaInicio, setFechaInicio] = useState<Date | undefined>();
    const [fechaCese, setFechaCese] = useState<Date | undefined>();
    const [regimen, setRegimen] = useState('general');
    const [seguro, setSeguro] = useState('essalud');

    const debouncedSueldo = useDebounce(sueldoStr, 300);
    const debouncedPromedioVariables = useDebounce(promedioVariablesStr, 300);

    const areInputsValid = useMemo(() => {
        return fechaInicio && fechaCese && fechaInicio <= fechaCese && parseFloat(debouncedSueldo) > 0;
    }, [fechaInicio, fechaCese, debouncedSueldo]);

    const calculation = useMemo(() => {
        if (!areInputsValid) return null;

        const sueldo = parseFloat(debouncedSueldo) || 0;
        const asignacion = asignacionFamiliar ? ASIGNACION_FAMILIAR_MONTO : 0;
        const promedioVariables = parseFloat(debouncedPromedioVariables) || 0;
        const remComputableBase = sueldo + asignacion + promedioVariables;

        const gratificacionResult = calculateGratificacion(fechaInicio!, fechaCese!, remComputableBase, regimen, seguro);
        const ctsResult = calculateCTS(fechaInicio!, fechaCese!, remComputableBase, gratificacionResult.gratificacionBase, regimen);
        const vacacionesResult = calculateVacations(fechaInicio!, fechaCese!, remComputableBase, regimen);

        const liquidacionTotal = gratificacionResult.total + ctsResult.total + vacacionesResult.total;

        return { 
            cts: ctsResult,
            gratificacion: gratificacionResult,
            vacaciones: vacacionesResult,
            liquidacionTotal 
        };
    }, [areInputsValid, debouncedSueldo, asignacionFamiliar, debouncedPromedioVariables, fechaInicio, fechaCese, regimen, seguro]);
    
    return (
        <Card className="flex flex-col h-full">
            <CardHeader>
                <CardTitle>Liquidación de Beneficios Sociales</CardTitle>
                <CardDescription>Calcula la liquidación por cese laboral (CTS, gratificaciones y vacaciones truncas).</CardDescription>
            </CardHeader>
            <CardContent className="grid grid-cols-1 lg:grid-cols-2 gap-4 lg:gap-8 flex-grow">
                <div className="space-y-4">
                     <div className="space-y-2">
                        <Label htmlFor="regimen">Régimen Laboral</Label>
                        <Select value={regimen} onValueChange={setRegimen}>
                             <SelectTrigger id="regimen"><SelectValue /></SelectTrigger>
                             <SelectContent>
                                <SelectItem value="general">Régimen General</SelectItem>
                                <SelectItem value="pequena">Pequeña Empresa</SelectItem>
                                <SelectItem value="micro">Microempresa</SelectItem>
                             </SelectContent>
                        </Select>
                    </div>
                     <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                         <div className="space-y-2">
                            <Label htmlFor="fechaInicio">Fecha de Inicio</Label>
                            <DateInput value={fechaInicio} onChange={setFechaInicio} label="Fecha de Inicio Laboral" />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="fechaCese">Fecha de Cese</Label>
                            <DateInput value={fechaCese} onChange={setFechaCese} label="Fecha de Cese" />
                        </div>
                    </div>
                    {(fechaInicio && fechaCese && fechaCese < fechaInicio) && (
                        <Alert variant="destructive">
                            <AlertDescription>La fecha de cese no puede ser anterior a la fecha de inicio.</AlertDescription>
                        </Alert>
                    )}

                     <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                        <div className="space-y-2">
                            <Label htmlFor="sueldo">Sueldo Básico (S/)</Label>
                            <Input id="sueldo" type="number" value={sueldoStr} onChange={(e) => setSueldoStr(e.target.value)} placeholder="Ej: 1800.00" />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="promedioVariables">Promedio Variables (S/)</Label>
                            <Input id="promedioVariables" type="number" value={promedioVariablesStr} onChange={(e) => setPromedioVariablesStr(e.target.value)} placeholder="Ej: 250.00" />
                        </div>
                    </div>
                    
                    <div className="flex items-start space-x-2 py-1">
                        <Checkbox id="asignacionFamiliar" checked={asignacionFamiliar} onCheckedChange={(checked) => setAsignacionFamiliar(!!checked)} className="mt-1" />
                        <Label htmlFor="asignacionFamiliar" className="text-sm leading-tight">Recibe Asignación Familiar</Label>
                    </div>
                    <div className="space-y-2">
                         <Label>Seguro de Salud (Bono Grati.)</Label>
                         <RadioGroup value={seguro} onValueChange={(value) => setSeguro(value as 'essalud' | 'eps')} className="flex flex-col sm:flex-row gap-2 sm:gap-4 pt-1">
                            <div className="flex items-center space-x-2"><RadioGroupItem value="essalud" id="essalud" /><Label htmlFor="essalud" className="text-sm">EsSalud (9%)</Label></div>
                            <div className="flex items-center space-x-2"><RadioGroupItem value="eps" id="eps" /><Label htmlFor="eps" className="text-sm">EPS (6.75%)</Label></div>
                        </RadioGroup>
                    </div>
                </div>
                
                <div className="bg-muted/50 p-4 sm:p-6 rounded-lg space-y-3 sm:space-y-4 flex flex-col justify-center">
                    <h3 className="text-lg font-semibold text-center">Resultado de la Liquidación</h3>
                    {calculation ? (
                        <>
                            <ResultItem label="Gratificación Trunca + Bono:" value={`S/ ${calculation.gratificacion.total.toFixed(2)}`} details={calculation.gratificacion.details} />
                            <ResultItem label="CTS Trunca:" value={`S/ ${calculation.cts.total.toFixed(2)}`} details={calculation.cts.details} />
                            <ResultItem label="Vacaciones Truncas:" value={`S/ ${calculation.vacaciones.total.toFixed(2)}`} details={calculation.vacaciones.details} />
                            <hr className="border-border" />
                            <ResultItem label="Total Liquidación" value={`S/ ${calculation.liquidacionTotal.toFixed(2)}`} isPrimary />
                        </>
                    ) : (
                        <p className="text-center text-muted-foreground">Ingrese los datos para ver el cálculo.</p>
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

const ResultItem = ({ label, value, isPrimary = false, details }: { label: string; value: string; isPrimary?: boolean; details?: string }) => (
    <div className="flex flex-col">
        <div className="flex items-center justify-between">
            <p className={`text-sm ${isPrimary ? 'font-semibold' : 'text-muted-foreground'}`}>{label}</p>
            <p className={`font-bold ${isPrimary ? 'text-xl text-primary' : 'text-lg'}`}>{value}</p>
        </div>
        {details && <p className="text-xs text-muted-foreground text-right">{details}</p>}
    </div>
);

  
