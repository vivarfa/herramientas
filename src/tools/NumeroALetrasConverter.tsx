
"use client";

import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { useDebounce } from '@/hooks/use-debounce';
import { Copy } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { copyToClipboard } from '@/lib/utils';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

const CURRENCIES: { [key: string]: { singular: string, plural: string, symbol: string } } = {
    'PEN': { singular: 'SOL', plural: 'SOLES', symbol: 'S/' },
    'USD': { singular: 'DÓLAR AMERICANO', plural: 'DÓLARES AMERICANOS', symbol: '$' },
    'EUR': { singular: 'EURO', plural: 'EUROS', symbol: '€' },
    'BRL': { singular: 'REAL BRASILEÑO', plural: 'REALES BRASILEÑOS', symbol: 'R$' },
    'MXN': { singular: 'PESO MEXICANO', plural: 'PESOS MEXICANOS', symbol: 'MXN$' },
    'CLP': { singular: 'PESO CHILENO', plural: 'PESOS CHILENOS', symbol: 'CLP$' },
    'COP': { singular: 'PESO COLOMBIANO', plural: 'PESOS COLOMBIANOS', symbol: 'COP$' },
    'ARS': { singular: 'PESO ARGENTINO', plural: 'PESOS ARGENTINOS', symbol: 'ARS$' },
};


// --- Funciones de Conversión Mejoradas ---
function Unidades(num: number): string {
    switch (num) {
        case 1: return "UN";
        case 2: return "DOS";
        case 3: return "TRES";
        case 4: return "CUATRO";
        case 5: return "CINCO";
        case 6: return "SEIS";
        case 7: return "SIETE";
        case 8: return "OCHO";
        case 9: return "NUEVE";
        default: return "";
    }
}

function Decenas(num: number): string {
    let decena = Math.floor(num / 10);
    let unidad = num % 10;
    switch (decena) {
        case 0: return Unidades(unidad);
        case 1:
            switch (unidad) {
                case 0: return "DIEZ";
                case 1: return "ONCE";
                case 2: return "DOCE";
                case 3: return "TRECE";
                case 4: return "CATORCE";
                case 5: return "QUINCE";
                default: return "DIECI" + Unidades(unidad);
            }
        case 2: return unidad === 0 ? "VEINTE" : "VEINTI" + Unidades(unidad);
        case 3: return "TREINTA" + (unidad > 0 ? " Y " + Unidades(unidad) : "");
        case 4: return "CUARENTA" + (unidad > 0 ? " Y " + Unidades(unidad) : "");
        case 5: return "CINCUENTA" + (unidad > 0 ? " Y " + Unidades(unidad) : "");
        case 6: return "SESENTA" + (unidad > 0 ? " Y " + Unidades(unidad) : "");
        case 7: return "SETENTA" + (unidad > 0 ? " Y " + Unidades(unidad) : "");
        case 8: return "OCHENTA" + (unidad > 0 ? " Y " + Unidades(unidad) : "");
        case 9: return "NOVENTA" + (unidad > 0 ? " Y " + Unidades(unidad) : "");
        default: return Unidades(unidad);
    }
}

function Centenas(num: number): string {
    let centenas = Math.floor(num / 100);
    let decenas = num % 100;
    let textoCentenas = "";

    switch (centenas) {
        case 1: textoCentenas = (decenas > 0) ? "CIENTO " : "CIEN"; break;
        case 2: textoCentenas = "DOSCIENTOS "; break; case 3: textoCentenas = "TRESCIENTOS "; break;
        case 4: textoCentenas = "CUATROCIENTOS "; break; case 5: textoCentenas = "QUINIENTOS "; break;
        case 6: textoCentenas = "SEISCIENTOS "; break; case 7: textoCentenas = "SETECIENTOS "; break;
        case 8: textoCentenas = "OCHOCIENTOS "; break; case 9: textoCentenas = "NOVECIENTOS "; break;
        default: return Decenas(decenas);
    }
    return textoCentenas + Decenas(decenas);
}

function SeccionMiles(num: number): string {
    if (num < 1000) return Centenas(num);
    let miles = Math.floor(num / 1000);
    let resto = num % 1000;
    let strMiles = (miles === 1) ? "MIL " : Centenas(miles) + " MIL ";
    let strResto = Centenas(resto);
    return (strMiles + strResto).trim();
}

function Millones(num: number): string {
    if (num < 1000000) return SeccionMiles(num);
    let millones = Math.floor(num / 1000000);
    let resto = num % 1000000;
    let strMillones = (millones === 1) ? "UN MILLON " : Centenas(millones) + " MILLONES ";
    let strRestoEnMiles = SeccionMiles(resto);
    return (strMillones + strRestoEnMiles).trim();
}

export const numeroALetras = (num: number, currencyKey: string) => {
    const currency = CURRENCIES[currencyKey] || CURRENCIES['PEN'];
    let data = {
        numero: num,
        enteros: Math.floor(num),
        centavos: Math.round((num - Math.floor(num)) * 100),
    };

    if (data.centavos >= 100) {
        data.enteros++;
        data.centavos = 0;
    }

    const letrasCentavos = `CON ${data.centavos.toString().padStart(2, '0')}/100`;
    
    let letrasEnteros;
    if (data.enteros === 0) {
        letrasEnteros = "CERO";
    } else {
        letrasEnteros = Millones(data.enteros);
    }
    
    const monedaPrincipal = (data.enteros === 1) ? currency.singular : currency.plural;
    
    return `${letrasEnteros} ${letrasCentavos} ${monedaPrincipal}`.replace(/\s+/g, ' ').trim().toUpperCase();
};


export function NumeroALetrasConverter() {
    const [numeroStr, setNumeroStr] = useState("");
    const [moneda, setMoneda] = useState('PEN');
    const { toast } = useToast();
    const debouncedNumero = useDebounce(numeroStr, 300);

    const textoResultado = useMemo(() => {
        const numero = parseFloat(debouncedNumero);
        if (isNaN(numero) || numero < 0) {
            return "INGRESE UN MONTO VÁLIDO.";
        }
         if (numero > 999999999999.99) { 
            return "MONTO DEMASIADO GRANDE.";
        }
        return numeroALetras(numero, moneda);
    }, [debouncedNumero, moneda]);
    
    const handleCopy = () => {
        copyToClipboard(textoResultado, () => {
          toast({ title: "Copiado", description: "Texto copiado al portapapeles." })
        })
      }

    return (
        <Card className="flex flex-col h-full">
            <CardHeader>
                <CardTitle>Conversor de Número a Letras</CardTitle>
                <CardDescription>Convierte un monto numérico a su representación en texto para documentos.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4 flex-grow">
                 <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                    <div className="space-y-2">
                        <Label htmlFor="moneda">Moneda:</Label>
                        <Select value={moneda} onValueChange={setMoneda}>
                            <SelectTrigger id="moneda"><SelectValue /></SelectTrigger>
                            <SelectContent>
                                {Object.keys(CURRENCIES).map(key => (
                                    <SelectItem key={key} value={key}>{key} - {CURRENCIES[key].plural}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                     <div className="space-y-2">
                        <Label htmlFor="numero">Monto Numérico ({CURRENCIES[moneda].symbol})</Label>
                        <Input id="numero" type="number" value={numeroStr} onChange={e => setNumeroStr(e.target.value)} placeholder="0.00" />
                    </div>
                 </div>
                <div className="bg-muted/50 p-6 rounded-lg space-y-4">
                     <h3 className="text-lg font-semibold">Resultado en Texto</h3>
                     <div className="bg-background p-4 rounded-md min-h-[80px] flex items-center justify-between">
                         <p className="font-mono text-primary flex-grow break-words pr-4">{textoResultado}</p>
                         <Button variant="ghost" size="icon" onClick={handleCopy} className="shrink-0">
                            <Copy className="h-4 w-4" />
                        </Button>
                     </div>
                </div>
            </CardContent>
             <CardFooter>
                 <p className="text-xs text-muted-foreground w-full text-center">
                </p>
            </CardFooter>
        </Card>
    );
}
