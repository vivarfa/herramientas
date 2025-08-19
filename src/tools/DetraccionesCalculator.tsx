
"use client";

import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { useDebounce } from '@/hooks/use-debounce';
import { Button } from '@/components/ui/button';
import { ClipboardPaste } from 'lucide-react';
import { copyToClipboard } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import { Switch } from '@/components/ui/switch';

const detraccionesData = [
    { value: 1.5, label: "1.5% (Bienes/Oro exonerados IGV)" },
    { value: 4, label: "4% (Recursos hidrobiológicos, Carnes, Construcción, etc.)" },
    { value: 10, label: "10% (Bienes/Servicios, Oro, Alquiler, etc.)" },
    { value: 12, label: "12% (Intermediación laboral, Mantenimiento, Servicios, etc.)" },
    { value: 15, label: "15% (Residuos, subproductos, Plomo)" }
];

export function DetraccionesCalculator() {
    const [montoStr, setMontoStr] = useState("");
    const [selectedRate, setSelectedRate] = useState("1.5");
    const [customRateStr, setCustomRateStr] = useState("");
    const [redondear, setRedondear] = useState(true);
    const { toast } = useToast();

    const debouncedMonto = useDebounce(montoStr, 300);
    const debouncedCustomRate = useDebounce(customRateStr, 300);

    const calculation = useMemo(() => {
        const monto = parseFloat(debouncedMonto) || 0;
        const rateValue = selectedRate === 'custom' ? parseFloat(debouncedCustomRate) : parseFloat(selectedRate);
        
        if (isNaN(monto) || isNaN(rateValue) || monto <= 0 || rateValue <= 0) {
            return { montoDetraccion: 0, netoAPagar: monto, needsDetraccion: false, showWarning: false };
        }
        
        const needsDetraccion = monto > 700;
        let montoDetraccion = needsDetraccion ? monto * (rateValue / 100) : 0;
        
        if (redondear && needsDetraccion) {
            montoDetraccion = Math.round(montoDetraccion);
        }

        const netoAPagar = monto - montoDetraccion;

        return {
            montoDetraccion,
            netoAPagar,
            needsDetraccion,
            showWarning: monto > 0 && !needsDetraccion
        };
    }, [debouncedMonto, selectedRate, debouncedCustomRate, redondear]);

    const handleCopy = (text: string, fieldName: string) => {
        copyToClipboard(text, () => {
            toast({
                title: "Copiado",
                description: `${fieldName} copiado al portapapeles.`
            })
        })
    }

    return (
        <Card className="flex flex-col h-full">
            <CardHeader>
                <CardTitle>Calculadora de Detracciones</CardTitle>
                <CardDescription>Calcula el monto de la detracción para bienes y servicios sujetos al sistema.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6 flex-grow">
                <div className="space-y-4">
                    <div className="space-y-2">
                        <Label htmlFor="monto-operacion">Monto de la Operación (S/)</Label>
                        <Input
                            id="monto-operacion"
                            type="number"
                            value={montoStr}
                            onChange={e => setMontoStr(e.target.value)}
                            placeholder="Ej: 1000.00"
                        />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="tipo-servicio">Porcentaje Detracción (%)</Label>
                        <div className="flex gap-2">
                            <Select value={selectedRate} onValueChange={setSelectedRate}>
                                <SelectTrigger id="tipo-servicio">
                                    <SelectValue placeholder="Seleccione o ingrese manual" />
                                </SelectTrigger>
                                <SelectContent>
                                    {detraccionesData.map(item => (
                                        <SelectItem key={item.value} value={String(item.value)}>
                                            {item.label}
                                        </SelectItem>
                                    ))}
                                    <SelectItem value="custom">Otro %</SelectItem>
                                </SelectContent>
                            </Select>
                             {selectedRate === 'custom' && (
                                <Input
                                    type="number"
                                    placeholder="Otro %"
                                    value={customRateStr}
                                    onChange={e => setCustomRateStr(e.target.value)}
                                    className="w-28"
                                />
                            )}
                        </div>
                    </div>
                     <div className="flex items-start space-x-2 py-1">
                        <Switch id="redondear" checked={redondear} onCheckedChange={setRedondear} className="mt-1" />
                        <Label htmlFor="redondear" className="text-sm leading-tight">Redondear resultado al entero más cercano</Label>
                    </div>
                </div>

                {calculation.showWarning && (
                    <Alert>
                        <AlertTitle>Operación no sujeta a Detracción</AlertTitle>
                        <AlertDescription>
                            El monto de la operación no supera los S/ 700.00, por lo tanto no está sujeta al sistema de detracciones.
                        </AlertDescription>
                    </Alert>
                )}
                 
                 <div className="bg-muted/50 p-3 sm:p-4 rounded-lg space-y-2 sm:space-y-3">
                    <ResultRow 
                        label="Monto Detracción:"
                        value={calculation.montoDetraccion}
                        decimals={redondear ? "0" : "2"}
                        onCopy={handleCopy}
                    />
                    <ResultRow
                        label="Neto a Pagar:"
                        value={calculation.netoAPagar}
                        decimals="2"
                        onCopy={handleCopy}
                    />
                 </div>
                 <p className="text-xs text-muted-foreground pt-4">
                    Información referencial. Consulta la normativa vigente de SUNAT. El monto mínimo para la detracción es de S/ 700.00.
                </p>

            </CardContent>
             <CardFooter className='flex-col items-start gap-2'>
                <p className="text-xs text-muted-foreground w-full text-center">
                </p>
            </CardFooter>
        </Card>
    );
}

interface ResultRowProps {
  label: string;
  value: number;
  decimals: string;
  onCopy: (textToCopy: string, label: string) => void;
}

const ResultRow = ({ label, value, decimals, onCopy }: ResultRowProps) => {
  const formattedValue = value.toFixed(parseInt(decimals, 10));
  return (
    <div className="flex items-center justify-between">
      <span className="text-sm text-muted-foreground">{label}</span>
      <div className="flex items-center gap-2">
        <span className="font-mono font-semibold text-lg text-foreground">{formattedValue}</span>
        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => onCopy(formattedValue, label)}>
          <ClipboardPaste className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
