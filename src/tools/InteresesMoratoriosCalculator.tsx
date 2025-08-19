
"use client";

import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { useDebounce } from '@/hooks/use-debounce';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar as CalendarIcon } from 'lucide-react';
import { Calendar } from '@/components/ui/calendar';
import { format, differenceInDays, parse, isValid } from 'date-fns';
import { es } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

// Tasa de Interés Moratorio (TIM) Mensual y Diaria
const TIM_MENSUAL = 0.009; // 0.9%
const TIM_DIARIA = TIM_MENSUAL / 30;

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
                    toYear={new Date().getFullYear() + 5}
                />
            </PopoverContent>
        </Popover>
    );
};


export function InteresesMoratoriosCalculator() {
    const [tributoInsolutoStr, setTributoInsolutoStr] = useState("");
    const [fechaVencimiento, setFechaVencimiento] = useState<Date | undefined>();
    const [fechaPago, setFechaPago] = useState<Date | undefined>();

    const debouncedTributo = useDebounce(tributoInsolutoStr, 300);

    const { calculation, error } = useMemo(() => {
        const tributo = parseFloat(debouncedTributo) || 0;
        if (!fechaVencimiento || !fechaPago) {
            return { calculation: { diasAtraso: 0, interesCalculado: 0 }, error: null };
        }

        if (fechaPago < fechaVencimiento) {
             return { 
                calculation: { diasAtraso: 0, interesCalculado: 0 },
                error: 'La fecha de pago no puede ser anterior a la fecha de vencimiento.' 
            };
        }

        const diasAtraso = differenceInDays(fechaPago, fechaVencimiento);
        const interesCalculado = tributo * TIM_DIARIA * diasAtraso;
        
        return { 
            calculation: { diasAtraso, interesCalculado }, 
            error: null 
        };
    }, [debouncedTributo, fechaVencimiento, fechaPago]);

    const totalAPagar = (parseFloat(debouncedTributo) || 0) + calculation.interesCalculado;
    const inputsFilled = debouncedTributo && parseFloat(debouncedTributo) > 0 && fechaVencimiento && fechaPago;

    return (
        <Card className="flex flex-col h-full">
            <CardHeader>
                <CardTitle>Calculadora de Intereses Moratorios</CardTitle>
                <CardDescription>Calcula el interés moratorio (TIM) de una deuda tributaria.</CardDescription>
            </CardHeader>
            <CardContent className="grid grid-cols-1 lg:grid-cols-2 gap-4 lg:gap-8 flex-grow">
                <div className="space-y-4">
                    <h4 className="text-md font-semibold text-primary">Parámetros del Cálculo</h4>
                    <div className="space-y-2">
                        <Label htmlFor="tributo">Monto de la Deuda o Multa (S/)</Label>
                        <Input id="tributo" type="number" value={tributoInsolutoStr} onChange={e => setTributoInsolutoStr(e.target.value)} placeholder="Ej: 1000.00" />
                    </div>
                     <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                        <div className="space-y-2">
                            <Label htmlFor="fecha-vencimiento">Fecha de Vencimiento</Label>
                             <DateInput value={fechaVencimiento} onChange={setFechaVencimiento} />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="fecha-pago">Fecha de Pago (o actual)</Label>
                             <DateInput value={fechaPago} onChange={setFechaPago} />
                        </div>
                    </div>
                    <p className="text-xs text-muted-foreground pt-4">
                       Este cálculo es referencial y se basa en las Tasas de Interés Moratorio (TIM) publicadas por SUNAT. Verifique siempre la normativa vigente y consulte a un profesional.
                    </p>
                </div>
                <div className="bg-muted/50 p-4 sm:p-6 rounded-lg space-y-3 sm:space-y-4 flex flex-col justify-center h-full">
                    <h3 className="text-lg font-semibold text-center">Resultado</h3>
                     {!inputsFilled ? (
                        <p className="text-center text-muted-foreground">Ingrese todos los datos para ver el cálculo.</p>
                     ) : error ? (
                         <Alert variant="destructive">
                            <AlertTitle>Error de Validación</AlertTitle>
                            <AlertDescription>{error}</AlertDescription>
                        </Alert>
                     ) : (
                        <>
                            <ResultItem label="Días de Atraso" value={`${calculation.diasAtraso} días`} />
                            <ResultItem label="Tasa de Interés Moratorio (TIM) Diaria" value={`${(TIM_DIARIA * 100).toFixed(4)}%`} />
                           <ResultItem label="Interés Moratorio Calculado" value={`S/ ${calculation.interesCalculado.toFixed(2)}`} />
                           <hr/>
                           <ResultItem label="Total a Pagar" value={`S/ ${totalAPagar.toFixed(2)}`} isPrimary />
                        </>
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

  
