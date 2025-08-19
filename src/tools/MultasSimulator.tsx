
"use client";

import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useDebounce } from '@/hooks/use-debounce';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';

const UIT_VALUES: { [key: string]: number } = {
    '2025': 5350,
    '2024': 5150,
    '2023': 4950,
};

const infraccionesConfig: { [key: string]: any } = {
    '176_1': {
        titulo: 'No presentar DDJJ en los plazos (Art. 176, N°1)',
        requiereTributo: false,
        requiereIngresos: true,
        base: (uit: number, tributoOmitido: number, ingresosNetos: number) => {
            if (ingresosNetos > 150 * uit) {
                 const multaCalculada = 0.006 * ingresosNetos;
                 return Math.max(1 * uit, Math.min(multaCalculada, 12 * uit));
            }
            return 1 * uit;
        },
        gradualidad: { 'Voluntaria': 0.90, 'Inducida': 0.70 }
    },
    '178_1': {
        titulo: 'Declarar cifras o datos falsos (Art. 178, N°1)',
        requiereTributo: true,
        requiereIngresos: false,
        base: (uit: number, tributoOmitido: number) => 0.50 * tributoOmitido,
        gradualidad: { 'Voluntaria': 0.95, 'Inducida': 0.70 }
    },
    '175_1': {
        titulo: 'No llevar libros y/o registros (Art. 175, N°1)',
        requiereTributo: false,
        requiereIngresos: true,
        base: (uit: number, tributoOmitido: number, ingresosNetos: number) => 0.006 * ingresosNetos,
        gradualidad: { 'Voluntaria': 0.90, 'Inducida': 0.80 }
    },
     '177_1': {
        titulo: 'No exhibir libros/registros (Art. 177, N°1)',
        requiereTributo: false,
        requiereIngresos: true,
        base: (uit: number, tributoOmitido: number, ingresosNetos: number) => 0.003 * ingresosNetos,
        gradualidad: { 'Voluntaria': 0.90, 'Inducida': 0.80 }
    }
};

export function MultasSimulator() {
    const [year, setYear] = useState(new Date().getFullYear().toString());
    const [regimen, setRegimen] = useState("General");
    const [infraccionKey, setInfraccionKey] = useState("176_1");
    const [subsanacionType, setSubsanacionType] = useState("Voluntaria");
    const [tributoOmitidoStr, setTributoOmitidoStr] = useState("");
    const [ingresosNetosStr, setIngresosNetosStr] = useState("");

    const debouncedTributo = useDebounce(tributoOmitidoStr, 300);
    const debouncedIngresos = useDebounce(ingresosNetosStr, 300);

    const calculation = useMemo(() => {
        const uit = UIT_VALUES[year] || 5150;
        const config = infraccionesConfig[infraccionKey];
        if (!config) return { uit, multaBase: 0, rebaja: 0, multaFinal: 0, baseCalculoTexto: 'N/A' };

        const tributoOmitido = parseFloat(debouncedTributo) || 0;
        const ingresosNetos = parseFloat(debouncedIngresos) || 0;

        let multaBase = config.base(uit, tributoOmitido, ingresosNetos);
        
        let baseCalculoTexto = '';
        if (config.titulo.includes('176')) {
             if (ingresosNetos > 150 * uit) {
                baseCalculoTexto = `0.6% de S/ ${ingresosNetos.toFixed(2)}`;
            } else {
                baseCalculoTexto = `1 UIT`;
            }
        }
        else if (config.titulo.includes('178')) baseCalculoTexto = `50% de S/ ${tributoOmitido.toFixed(2)}`;
        else if (config.titulo.includes('175')) baseCalculoTexto = `0.6% de S/ ${ingresosNetos.toFixed(2)}`;
        else if (config.titulo.includes('177')) baseCalculoTexto = `0.3% de S/ ${ingresosNetos.toFixed(2)}`;

        const factorRebaja = config.gradualidad[subsanacionType];
        const rebaja = multaBase * factorRebaja;
        const multaFinal = multaBase - rebaja;
        
        return { uit, multaBase, rebaja, multaFinal, baseCalculoTexto, factorRebaja };
    }, [year, regimen, infraccionKey, subsanacionType, debouncedTributo, debouncedIngresos]);
    
    const configSeleccionada = infraccionesConfig[infraccionKey];

    return (
        <Card className="flex flex-col h-full">
            <CardHeader>
                <CardTitle>Simulador de Multas Tributarias</CardTitle>
                <CardDescription>Estima el monto de una multa y su posible rebaja por gradualidad.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6 flex-grow">
                 <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                    <div className="space-y-2">
                        <Label htmlFor="uitYear">Año de la UIT:</Label>
                        <Select value={year} onValueChange={setYear}>
                            <SelectTrigger id="uitYear"><SelectValue /></SelectTrigger>
                            <SelectContent>
                                {Object.keys(UIT_VALUES).sort((a, b) => parseInt(b) - parseInt(a)).map(y => (
                                    <SelectItem key={y} value={y}>{y} (S/ {UIT_VALUES[y]})</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                     <div className="space-y-2">
                        <Label htmlFor="regimen">Régimen Tributario:</Label>
                        <Select value={regimen} onValueChange={setRegimen}>
                            <SelectTrigger id="regimen"><SelectValue /></SelectTrigger>
                            <SelectContent>
                                <SelectItem value="General">General</SelectItem>
                                <SelectItem value="MYPE">MYPE Tributario</SelectItem>
                                <SelectItem value="Especial (RER)">Especial (RER)</SelectItem>
                                <SelectItem value="Nuevo RUS (NRUS)">Nuevo RUS (NRUS)</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                </div>

                <div className="space-y-2">
                    <Label htmlFor="infraccion">Infracción Cometida:</Label>
                    <Select value={infraccionKey} onValueChange={setInfraccionKey}>
                        <SelectTrigger id="infraccion"><SelectValue /></SelectTrigger>
                        <SelectContent>
                            {Object.keys(infraccionesConfig).map(key => (
                                <SelectItem key={key} value={key}>{infraccionesConfig[key].titulo}</SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>
                
                {configSeleccionada?.requiereIngresos && (
                    <div className="space-y-2">
                        <Label htmlFor="ingresosNetos">Ingresos Netos Anuales (S/):</Label>
                        <Input id="ingresosNetos" type="number" value={ingresosNetosStr} onChange={(e) => setIngresosNetosStr(e.target.value)} placeholder="Ej: 120000.00" />
                    </div>
                )}
                {configSeleccionada?.requiereTributo && (
                    <div className="space-y-2">
                        <Label htmlFor="tributoOmitido">Tributo Omitido (S/):</Label>
                        <Input id="tributoOmitido" type="number" value={tributoOmitidoStr} onChange={(e) => setTributoOmitidoStr(e.target.value)} placeholder="Ej: 5000.00" />
                    </div>
                )}

                <div className="space-y-2">
                    <Label>Tipo de Subsanación:</Label>
                     <RadioGroup value={subsanacionType} onValueChange={setSubsanacionType} className="flex flex-col sm:flex-row gap-2 sm:gap-4 pt-1">
                        <div className="flex items-center space-x-2"><RadioGroupItem value="Voluntaria" id="voluntaria" /><Label htmlFor="voluntaria" className="text-sm">Voluntaria</Label></div>
                        <div className="flex items-center space-x-2"><RadioGroupItem value="Inducida" id="inducida" /><Label htmlFor="inducida" className="text-sm">Inducida</Label></div>
                    </RadioGroup>
                </div>

                <div className="bg-muted/50 p-4 sm:p-6 rounded-lg space-y-2 sm:space-y-3">
                     <ResultItem label="UIT Aplicable:" value={`S/ ${calculation.uit.toFixed(2)}`} />
                     <ResultItem label="Base de Cálculo:" value={calculation.baseCalculoTexto} />
                     <ResultItem label="Multa Original:" value={`S/ ${calculation.multaBase.toFixed(2)}`} />
                     <ResultItem label={`Rebaja (${(calculation.factorRebaja * 100).toFixed(0)}%):`} value={`- S/ ${calculation.rebaja.toFixed(2)}`} />
                     <hr/>
                     <ResultItem label="MULTA CON REBAJA:" value={`S/ ${calculation.multaFinal.toFixed(2)}`} isPrimary />
                </div>
                 <p className="text-xs text-muted-foreground pt-4">
                    Cálculo referencial que no incluye intereses. La rebaja por gradualidad está sujeta al cumplimiento de condiciones de la Res. 063-2007-SUNAT.
                </p>
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
