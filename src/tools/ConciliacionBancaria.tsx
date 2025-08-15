// src/tools/ConciliacionBancaria.tsx

"use client";

import React, { useState, useMemo } from 'react';
import { ToolCard } from '@/components/ui/ToolCard';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Upload, X, Check, ArrowRight, Banknote, BookOpen } from 'lucide-react';
import Papa from 'papaparse';

// --- TIPOS DE DATOS ---
type Movimiento = {
    fecha: string;
    descripcion: string;
    monto: number;
    tipo: 'cargo' | 'abono';
    source: 'banco' | 'libros';
    id: string; // Para identificar unívocamente cada fila
    matchId?: string; // Para enlazar con su contraparte
};

export function ConciliacionBancaria() {
    const [movimientosBanco, setMovimientosBanco] = useState<Movimiento[]>([]);
    const [movimientosLibros, setMovimientosLibros] = useState<Movimiento[]>([]);
    const [fileNameBanco, setFileNameBanco] = useState<string>('');
    const [fileNameLibros, setFileNameLibros] = useState<string>('');

    const handleFileUpload = (
        event: React.ChangeEvent<HTMLInputElement>,
        type: 'banco' | 'libros'
    ) => {
        const file = event.target.files?.[0];
        if (!file) return;

        (type === 'banco' ? setFileNameBanco : setFileNameLibros)(file.name);

        Papa.parse(file, {
            header: true,
            skipEmptyLines: true,
            complete: (results) => {
                const parsedData = results.data
                    .map((row: any, index: number) => {
                        const monto = parseFloat(row.Monto) || parseFloat(row.Cargo) || parseFloat(row.Abono) || 0;
                        const tipo = (row.Tipo && row.Tipo.toLowerCase() === 'cargo') || row.Cargo ? 'cargo' : 'abono';
                        return {
                            id: `${type}-${index}`,
                            fecha: row.Fecha,
                            descripcion: row.Descripcion,
                            monto: Math.abs(monto),
                            tipo,
                            source: type
                        };
                    })
                    .filter(item => item.monto > 0 && item.fecha && item.descripcion);

                (type === 'banco' ? setMovimientosBanco : setMovimientosLibros)(parsedData);
            }
        });
    };

    const conciliacion = useMemo(() => {
        const bancoPendiente = [...movimientosBanco];
        const librosPendiente = [...movimientosLibros];
        const conciliados: { banco: Movimiento; libros: Movimiento }[] = [];

        for (let i = bancoPendiente.length - 1; i >= 0; i--) {
            const movBanco = bancoPendiente[i];
            const matchIndex = librosPendiente.findIndex(
                movLibros => movLibros.monto === movBanco.monto && movLibros.tipo === movBanco.tipo
            );

            if (matchIndex !== -1) {
                const movLibros = librosPendiente[matchIndex];
                conciliados.push({ banco: movBanco, libros: movLibros });
                bancoPendiente.splice(i, 1);
                librosPendiente.splice(matchIndex, 1);
            }
        }
        
        return { conciliados, bancoPendiente, librosPendiente };
    }, [movimientosBanco, movimientosLibros]);

    const resetFiles = () => {
        setMovimientosBanco([]);
        setMovimientosLibros([]);
        setFileNameBanco('');
        setFileNameLibros('');
    };
    
    return (
        <ToolCard
            title="Conciliación Bancaria"
            description="Compara tu extracto bancario con tu libro de bancos para encontrar diferencias."
        >
            <Alert className="mb-6">
                <Banknote className="h-4 w-4" />
                <AlertTitle>¿Cómo funciona?</AlertTitle>
                <AlertDescription>
                    Sube tu extracto bancario y tu reporte de libro de bancos en formato CSV. Los archivos deben tener columnas llamadas 'Fecha', 'Descripcion' y 'Monto' (o 'Cargo'/'Abono'). La herramienta los comparará.
                </AlertDescription>
            </Alert>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                <FileUploadBox
                    title="1. Subir Extracto Bancario"
                    icon={<Banknote className="h-8 w-8 text-primary" />}
                    fileName={fileNameBanco}
                    onUpload={(e) => handleFileUpload(e, 'banco')}
                />
                <FileUploadBox
                    title="2. Subir Libro de Bancos"
                    icon={<BookOpen className="h-8 w-8 text-primary" />}
                    fileName={fileNameLibros}
                    onUpload={(e) => handleFileUpload(e, 'libros')}
                />
            </div>
            
            {(movimientosBanco.length > 0 || movimientosLibros.length > 0) && (
                <>
                    <div className="text-center mb-6">
                        <Button onClick={resetFiles} variant="destructive">
                            <X className="mr-2 h-4 w-4" />
                            Limpiar y Empezar de Nuevo
                        </Button>
                    </div>

                    <ConciliacionResultado title="✅ Movimientos Conciliados" data={conciliacion.conciliados.map(c => ({...c.banco, ...c.libros, monto: c.banco.monto}))} />
                    <ConciliacionResultado title="⚠️ Pendientes en Banco (No registrados en libros)" data={conciliacion.bancoPendiente} />
                    <ConciliacionResultado title="⚠️ Pendientes en Libros (No registrados en banco)" data={conciliacion.librosPendiente} />
                </>
            )}

        </ToolCard>
    );
}


// --- SUB-COMPONENTES ---
const FileUploadBox = ({ title, icon, fileName, onUpload }: { title: string; icon: React.ReactNode; fileName: string; onUpload: (e: React.ChangeEvent<HTMLInputElement>) => void; }) => (
    <div className="relative border-2 border-dashed rounded-lg p-6 text-center">
        <div className="flex justify-center items-center mb-2">{icon}</div>
        <h3 className="text-lg font-semibold mb-2">{title}</h3>
        <Label htmlFor={title.replace(/\s+/g, '-')} className="cursor-pointer text-primary hover:underline">
            {fileName ? 'Cambiar archivo' : 'Seleccionar archivo CSV'}
        </Label>
        <Input id={title.replace(/\s+/g, '-')} type="file" className="hidden" accept=".csv" onChange={onUpload} />
        {fileName && <p className="text-xs text-muted-foreground mt-2 truncate">Archivo: {fileName}</p>}
    </div>
);

const ConciliacionResultado = ({ title, data }: { title: string; data: any[] }) => {
    if (data.length === 0) return null;
    return (
        <div className="mb-8">
            <h3 className="text-xl font-semibold mb-4">{title}</h3>
            <div className="rounded-md border">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Fecha</TableHead>
                            <TableHead>Descripción</TableHead>
                            <TableHead className="text-right">Monto</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {data.map((item, index) => (
                            <TableRow key={index}>
                                <TableCell>{item.fecha}</TableCell>
                                <TableCell>{item.descripcion}</TableCell>
                                <TableCell className="text-right font-mono">S/ {item.monto.toFixed(2)}</TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </div>
        </div>
    );
};