// src/tools/EstadosFinancieros.tsx

"use client";

import React, { useState, useMemo } from 'react';
import { useLocalStorage } from '@/hooks/use-local-storage';
import { useToast } from '@/hooks/use-toast';
import { ToolCard } from '@/components/ui/ToolCard'; // Usando el componente reutilizable que discutimos
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow, TableFooter } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogClose } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Plus, Trash2, FileDown, AlertCircle, TrendingUp, TrendingDown, Scale, Library } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';

// --- TIPOS DE DATOS ---
type Asiento = {
    id: string;
    fecha: string; // YYYY-MM-DD para fácil ordenamiento
    cuenta: string;
    descripcion: string;
    debe: number;
    haber: number;
};

type CuentaContable = {
    cuenta: string;
    totalDebe: number;
    totalHaber: number;
    saldoDeudor: number;
    saldoAcreedor: number;
};

// --- DATOS DE EJEMPLO PARA INICIAR ---
const sampleAsientos: Asiento[] = [
    { id: '1', fecha: '2025-01-05', cuenta: '1041', descripcion: 'Apertura de cuenta corriente', debe: 10000, haber: 0 },
    { id: '2', fecha: '2025-01-05', cuenta: '5011', descripcion: 'Capital social inicial', debe: 0, haber: 10000 },
    { id: '3', fecha: '2025-01-15', cuenta: '6011', descripcion: 'Compra de mercadería', debe: 3000, haber: 0 },
    { id: '4', fecha: '2025-01-15', cuenta: '40111', descripcion: 'IGV por compras', debe: 540, haber: 0 },
    { id: '5', fecha: '2025-01-15', cuenta: '4212', descripcion: 'Facturas por pagar', debe: 0, haber: 3540 },
    { id: '6', fecha: '2025-01-25', cuenta: '1212', descripcion: 'Venta de mercadería', debe: 5900, haber: 0 },
    { id: '7', fecha: '2025-01-25', cuenta: '40111', descripcion: 'IGV por ventas', debe: 0, haber: 900 },
    { id: '8', fecha: '2025-01-25', cuenta: '7012', descripcion: 'Ingresos por ventas', debe: 0, haber: 5000 },
];

export function EstadosFinancieros() {
    const [asientos, setAsientos] = useLocalStorage<Asiento[]>('estados-financieros-asientos', sampleAsientos);
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const { toast } = useToast();

    // --- LÓGICA DE CÁLCULO PRINCIPAL (MEMOIZADA PARA EFICIENCIA) ---

    const libroMayor = useMemo((): CuentaContable[] => {
        const cuentasMap: { [key: string]: { totalDebe: number; totalHaber: number } } = {};
        asientos.forEach(asiento => {
            if (!cuentasMap[asiento.cuenta]) cuentasMap[asiento.cuenta] = { totalDebe: 0, totalHaber: 0 };
            cuentasMap[asiento.cuenta].totalDebe += asiento.debe;
            cuentasMap[asiento.cuenta].totalHaber += asiento.haber;
        });

        return Object.entries(cuentasMap).map(([cuenta, { totalDebe, totalHaber }]) => {
            const saldo = totalDebe - totalHaber;
            return {
                cuenta,
                totalDebe,
                totalHaber,
                saldoDeudor: saldo > 0 ? saldo : 0,
                saldoAcreedor: saldo < 0 ? Math.abs(saldo) : 0,
            };
        }).sort((a, b) => a.cuenta.localeCompare(b.cuenta));
    }, [asientos]);

    const estadoResultados = useMemo(() => {
        const ingresos = libroMayor
            .filter(c => c.cuenta.startsWith('7'))
            .reduce((sum, c) => sum + c.saldoAcreedor, 0);
        const gastos = libroMayor
            .filter(c => c.cuenta.startsWith('6') || c.cuenta.startsWith('9'))
            .reduce((sum, c) => sum + c.saldoDeudor, 0);
        
        const utilidad = ingresos - gastos;
        return { ingresos, gastos, utilidad };
    }, [libroMayor]);
    
    const balanceGeneral = useMemo(() => {
        const activos = libroMayor
            .filter(c => ['1', '2', '3'].some(p => c.cuenta.startsWith(p)))
            .reduce((sum, c) => sum + c.saldoDeudor, 0);
        const pasivos = libroMayor
            .filter(c => c.cuenta.startsWith('4'))
            .reduce((sum, c) => sum + c.saldoAcreedor, 0);
        const patrimonio = libroMayor
            .filter(c => c.cuenta.startsWith('5'))
            .reduce((sum, c) => sum + c.saldoAcreedor, 0);
            
        const patrimonioNeto = patrimonio + estadoResultados.utilidad;
        const totalPasivoPatrimonio = pasivos + patrimonioNeto;
        const cuadre = Math.abs(activos - totalPasivoPatrimonio);
        
        return { activos, pasivos, patrimonio, patrimonioNeto, totalPasivoPatrimonio, cuadre };
    }, [libroMayor, estadoResultados.utilidad]);
    
    // --- MANEJADORES DE EVENTOS ---
    const handleAddAsiento = (nuevoAsiento: Omit<Asiento, 'id'>) => {
        const asientoConId = { ...nuevoAsiento, id: new Date().toISOString() };
        setAsientos(prev => [...prev, asientoConId].sort((a, b) => a.fecha.localeCompare(b.fecha)));
        toast({ title: "Éxito", description: "Asiento contable añadido correctamente." });
        setIsDialogOpen(false);
    };

    const handleDeleteAsiento = (id: string) => {
        setAsientos(prev => prev.filter(a => a.id !== id));
        toast({ variant: 'destructive', title: "Eliminado", description: "El asiento ha sido eliminado." });
    };

    const handleExport = (format: 'pdf' | 'excel', report: string) => {
        // Lógica de exportación (simplificada para brevedad, puedes expandirla)
        const doc = new jsPDF();
        const title = `Reporte: ${report}`;
        let head: any[] = [];
        let body: any[] = [];
        
        // Adaptar head y body según el reporte seleccionado
        if (report === 'Libro Diario') {
            head = [['Fecha', 'Cuenta', 'Descripción', 'Debe', 'Haber']];
            body = asientos.map(a => [a.fecha, a.cuenta, a.descripcion, a.debe.toFixed(2), a.haber.toFixed(2)]);
        }
        // ... (añadir casos para 'Libro Mayor', 'Estado de Resultados', etc.)

        if (format === 'pdf') {
            doc.text(title, 14, 22);
            autoTable(doc, { startY: 30, head, body, theme: 'striped' });
            doc.save(`reporte_${report.toLowerCase().replace(' ', '_')}.pdf`);
        } else {
            const ws = XLSX.utils.aoa_to_sheet([head[0], ...body]);
            const wb = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(wb, ws, report);
            XLSX.writeFile(wb, `reporte_${report.toLowerCase().replace(' ', '_')}.xlsx`);
        }
    };
    
    return (
        <ToolCard
            title="Generador de Estados Financieros"
            description="Ingresa tus asientos contables y visualiza los reportes financieros principales."
        >
            <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-semibold">Libro Diario</h3>
                <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                    <DialogTrigger asChild>
                        <Button size="sm"><Plus className="mr-2 h-4 w-4" /> Añadir Asiento</Button>
                    </DialogTrigger>
                    <AsientoDialog onSubmit={handleAddAsiento} />
                </Dialog>
            </div>

            <Tabs defaultValue="diario" className="w-full">
                <TabsList className="grid w-full grid-cols-3 md:grid-cols-5">
                    <TabsTrigger value="diario">Diario</TabsTrigger>
                    <TabsTrigger value="mayor">Mayor</TabsTrigger>
                    <TabsTrigger value="comprobacion">Comprobación</TabsTrigger>
                    <TabsTrigger value="resultados">Resultados</TabsTrigger>
                    <TabsTrigger value="balance">Balance G.</TabsTrigger>
                </TabsList>
                
                {/* --- CONTENIDO DE CADA TAB --- */}

                <TabsContent value="diario" className="mt-4">
                    <ReportTable
                        headers={['Fecha', 'Cuenta', 'Descripción', 'Debe', 'Haber', 'Acción']}
                        rows={asientos.map(a => [
                            format(parseISO(a.fecha), 'dd/MM/yyyy', { locale: es }),
                            a.cuenta,
                            a.descripcion,
                            `S/ ${a.debe.toFixed(2)}`,
                            `S/ ${a.haber.toFixed(2)}`,
                            <Button variant="ghost" size="icon" onClick={() => handleDeleteAsiento(a.id)} className="h-8 w-8 text-muted-foreground hover:text-destructive"><Trash2 className="h-4 w-4" /></Button>
                        ])}
                        footers={['', '', 'Totales:', `S/ ${asientos.reduce((s, a) => s + a.debe, 0).toFixed(2)}`, `S/ ${asientos.reduce((s, a) => s + a.haber, 0).toFixed(2)}`, '']}
                    />
                </TabsContent>

                <TabsContent value="mayor" className="mt-4">
                    <ReportTable
                        headers={['Cuenta', 'Total Debe', 'Total Haber', 'Saldo Deudor', 'Saldo Acreedor']}
                        rows={libroMayor.map(c => [
                            c.cuenta, `S/ ${c.totalDebe.toFixed(2)}`, `S/ ${c.totalHaber.toFixed(2)}`, `S/ ${c.saldoDeudor.toFixed(2)}`, `S/ ${c.saldoAcreedor.toFixed(2)}`
                        ])}
                    />
                </TabsContent>

                <TabsContent value="comprobacion" className="mt-4">
                     <ReportTable
                        headers={['Cuenta', 'Saldo Deudor', 'Saldo Acreedor']}
                        rows={libroMayor.map(c => [ c.cuenta, `S/ ${c.saldoDeudor.toFixed(2)}`, `S/ ${c.saldoAcreedor.toFixed(2)}` ])}
                        footers={['Totales:', `S/ ${libroMayor.reduce((s, c) => s + c.saldoDeudor, 0).toFixed(2)}`, `S/ ${libroMayor.reduce((s, c) => s + c.saldoAcreedor, 0).toFixed(2)}`]}
                    />
                </TabsContent>

                <TabsContent value="resultados" className="mt-4">
                     <div className="bg-muted/50 p-6 rounded-lg space-y-4">
                         <ResultItem icon={<TrendingUp className="text-green-500"/>} label="Total Ingresos (Clase 7):" value={estadoResultados.ingresos} />
                         <ResultItem icon={<TrendingDown className="text-red-500"/>} label="Total Gastos (Clase 6 y 9):" value={estadoResultados.gastos} />
                         <hr/>
                         <ResultItem 
                            icon={<Scale className={estadoResultados.utilidad >= 0 ? 'text-primary' : 'text-destructive'}/>} 
                            label={estadoResultados.utilidad >= 0 ? "Utilidad del Ejercicio:" : "Pérdida del Ejercicio:"} 
                            value={Math.abs(estadoResultados.utilidad)} 
                            isPrimary />
                     </div>
                </TabsContent>
                
                <TabsContent value="balance" className="mt-4">
                      <div className="bg-muted/50 p-6 rounded-lg space-y-4">
                         <ResultItem icon={<Library />} label="Total Activos:" value={balanceGeneral.activos} />
                         <ResultItem icon={<Library />} label="Total Pasivos:" value={balanceGeneral.pasivos} />
                         <ResultItem icon={<Library />} label="Total Patrimonio:" value={balanceGeneral.patrimonioNeto} />
                         <hr/>
                         <ResultItem 
                            icon={balanceGeneral.cuadre < 0.01 ? <AlertCircle className="text-green-500" /> : <AlertCircle className="text-destructive" />}
                            label="Total Pasivo + Patrimonio:" 
                            value={balanceGeneral.totalPasivoPatrimonio} 
                            isPrimary />
                        {balanceGeneral.cuadre < 0.01 ? (
                            <p className="text-sm text-green-600 text-center pt-2">El balance cuadra correctamente.</p>
                        ) : (
                            <p className="text-sm text-destructive text-center pt-2">¡Advertencia! El balance está descuadrado por S/ {balanceGeneral.cuadre.toFixed(2)}.</p>
                        )}
                     </div>
                </TabsContent>

            </Tabs>
        </ToolCard>
    );
}


// --- SUB-COMPONENTES PARA ORGANIZACIÓN ---

function AsientoDialog({ onSubmit }: { onSubmit: (asiento: Omit<Asiento, 'id'>) => void; }) {
    const [fecha, setFecha] = useState(new Date().toISOString().split('T')[0]);
    const [cuenta, setCuenta] = useState('');
    const [descripcion, setDescripcion] = useState('');
    const [debe, setDebe] = useState('');
    const [haber, setHaber] = useState('');

    const handleSubmit = () => {
        const debeNum = parseFloat(debe) || 0;
        const haberNum = parseFloat(haber) || 0;
        if (!cuenta || !descripcion || (debeNum === 0 && haberNum === 0) || (debeNum > 0 && haberNum > 0)) {
            alert("Por favor, complete los campos correctamente. Debe o Haber debe tener un valor, pero no ambos.");
            return;
        }
        onSubmit({ fecha, cuenta, descripcion, debe: debeNum, haber: haberNum });
    };

    return (
        <DialogContent>
            <DialogHeader>
                <DialogTitle>Nuevo Asiento Contable</DialogTitle>
                <DialogDescription>Añade una nueva entrada a tu libro diario.</DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
                <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="fecha" className="text-right">Fecha</Label>
                    <Input id="fecha" type="date" value={fecha} onChange={e => setFecha(e.target.value)} className="col-span-3" />
                </div>
                 <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="cuenta" className="text-right">Cuenta</Label>
                    <Input id="cuenta" value={cuenta} onChange={e => setCuenta(e.target.value)} className="col-span-3" placeholder="Ej: 1041" />
                </div>
                 <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="descripcion" className="text-right">Descripción</Label>
                    <Input id="descripcion" value={descripcion} onChange={e => setDescripcion(e.target.value)} className="col-span-3" placeholder="Detalle de la operación"/>
                </div>
                 <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="debe" className="text-right">Debe (S/)</Label>
                    <Input id="debe" type="number" value={debe} onChange={e => setDebe(e.target.value)} className="col-span-3" disabled={!!haber} placeholder="0.00"/>
                </div>
                 <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="haber" className="text-right">Haber (S/)</Label>
                    <Input id="haber" type="number" value={haber} onChange={e => setHaber(e.target.value)} className="col-span-3" disabled={!!debe} placeholder="0.00"/>
                </div>
            </div>
            <DialogFooter>
                <DialogClose asChild>
                    <Button type="button" variant="secondary">Cancelar</Button>
                </DialogClose>
                <Button type="submit" onClick={handleSubmit}>Guardar Asiento</Button>
            </DialogFooter>
        </DialogContent>
    );
}

function ReportTable({ headers, rows, footers }: { headers: string[], rows: (string | JSX.Element)[][], footers?: (string | JSX.Element)[] }) {
    return (
        <div className="rounded-md border overflow-x-auto">
            <Table>
                <TableHeader>
                    <TableRow>
                        {headers.map((h, i) => <TableHead key={i}>{h}</TableHead>)}
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {rows.length > 0 ? rows.map((row, i) => (
                        <TableRow key={i}>
                            {row.map((cell, j) => <TableCell key={j} className={typeof cell === 'string' && cell.startsWith('S/') ? 'font-mono text-right' : ''}>{cell}</TableCell>)}
                        </TableRow>
                    )) : (
                        <TableRow>
                            <TableCell colSpan={headers.length} className="text-center h-24">No hay datos para mostrar.</TableCell>
                        </TableRow>
                    )}
                </TableBody>
                {footers && (
                    <TableFooter>
                        <TableRow className="font-bold bg-muted hover:bg-muted">
                            {footers.map((f, i) => <TableCell key={i} className={typeof f === 'string' && f.startsWith('S/') ? 'font-mono text-right' : ''}>{f}</TableCell>)}
                        </TableRow>
                    </TableFooter>
                )}
            </Table>
        </div>
    );
}

const ResultItem = ({ label, value, isPrimary = false, icon }: { label: string; value: number; isPrimary?: boolean; icon?: JSX.Element }) => (
    <div className="flex items-center justify-between">
        <p className={`text-sm flex items-center gap-2 ${isPrimary ? 'font-semibold' : 'text-muted-foreground'}`}>
            {icon}
            {label}
        </p>
        <p className={`text-lg font-bold font-mono ${isPrimary ? 'text-primary' : ''}`}>S/ {value.toLocaleString('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
    </div>
);