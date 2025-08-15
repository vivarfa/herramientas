// src/tools/EstadosFinancieros.tsx

"use client";

import React, { useState, useMemo } from 'react';
import { useLocalStorage } from '@/hooks/use-local-storage';
import { useToast } from '@/hooks/use-toast';
import { ToolCard } from '@/components/ui/ToolCard';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow, TableFooter } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogClose } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, Trash2, Settings, AlertCircle, Edit, FileDown } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

// --- ESTRUCTURAS DE DATOS PROFESIONALES ---

type TipoCuenta = 'Activo' | 'Pasivo' | 'Patrimonio' | 'Ingreso' | 'Costo' | 'Gasto';
type SubtipoCuenta = 
    | 'Activo Corriente' | 'Activo No Corriente'
    | 'Pasivo Corriente' | 'Pasivo No Corriente'
    | 'Capital' | 'Resultados Acumulados'
    | 'Ingresos Operacionales' | 'Otros Ingresos'
    | 'Costo de Ventas'
    | 'Gasto de Administración' | 'Gasto de Venta' | 'Gastos Financieros';

type CuentaPC = {
    cuenta: string;
    nombre: string;
    tipo: TipoCuenta;
    subtipo: SubtipoCuenta;
};

type Asiento = {
    id: string;
    fecha: string; 
    cuenta: string;
    descripcion: string;
    debe: number;
    haber: number;
};

type CuentaContable = {
    cuenta: string;
    nombre: string;
    tipo: TipoCuenta;
    subtipo: SubtipoCuenta;
    totalDebe: number;
    totalHaber: number;
    saldoDeudor: number;
    saldoAcreedor: number;
};

// --- DATOS INICIALES (PLAN DE CUENTAS Y ASIENTOS) ---

const defaultPlanDeCuentas: CuentaPC[] = [
    { cuenta: "1041", nombre: "Cuentas corrientes operativas", tipo: "Activo", subtipo: "Activo Corriente" },
    { cuenta: "1212", nombre: "Emitidas en cartera", tipo: "Activo", subtipo: "Activo Corriente" },
    { cuenta: "40111", nombre: "IGV - Cuenta propia", tipo: "Pasivo", subtipo: "Pasivo Corriente" },
    { cuenta: "4212", nombre: "Emitidas", tipo: "Pasivo", subtipo: "Pasivo Corriente" },
    { cuenta: "5011", nombre: "Capital social", tipo: "Patrimonio", subtipo: "Capital" },
    { cuenta: "6011", nombre: "Mercaderías", tipo: "Gasto", subtipo: "Gasto de Administración" },
    { cuenta: "6911", nombre: "Costo de Ventas - Mercaderías", tipo: "Costo", subtipo: "Costo de Ventas" },
    { cuenta: "7012", nombre: "Venta de mercadería", tipo: "Ingreso", subtipo: "Ingresos Operacionales" },
];

const sampleAsientos: Asiento[] = [
    { id: '1', fecha: '2025-01-05', cuenta: '1041', descripcion: 'Apertura de cuenta corriente', debe: 10000, haber: 0 },
    { id: '2', fecha: '2025-01-05', cuenta: '5011', descripcion: 'Capital social inicial', debe: 0, haber: 10000 },
    { id: '3', fecha: '2025-01-15', cuenta: '6011', descripcion: 'Compra de mercadería', debe: 3000, haber: 0 },
    { id: '4', fecha: '2025-01-15', cuenta: '40111', descripcion: 'IGV por compras', debe: 540, haber: 0 },
    { id: '5', fecha: '2025-01-15', cuenta: '4212', descripcion: 'Facturas por pagar', debe: 0, haber: 3540 },
    { id: '6', fecha: '2025-01-25', cuenta: '1212', descripcion: 'Venta de mercadería', debe: 5900, haber: 0 },
    { id: '7', fecha: '2025-01-25', cuenta: '40111', descripcion: 'IGV por ventas', debe: 0, haber: 900 },
    { id: '8', fecha: '2025-01-25', cuenta: '7012', descripcion: 'Ingresos por ventas', debe: 0, haber: 5000 },
    { id: '9', fecha: '2025-01-31', cuenta: '6911', descripcion: 'Costo de la mercadería vendida', debe: 2500, haber: 0 },
];

// --- COMPONENTE PRINCIPAL ---

export function EstadosFinancieros() {
    const [planDeCuentas, setPlanDeCuentas] = useLocalStorage<CuentaPC[]>('estados-financieros-pc', defaultPlanDeCuentas);
    const [asientos, setAsientos] = useLocalStorage<Asiento[]>('estados-financieros-asientos', sampleAsientos);
    const [isAsientoDialogOpen, setIsAsientoDialogOpen] = useState(false);
    const { toast } = useToast();

    // --- LÓGICA DE CÁLCULO REFACTORIZADA ---

    const libroMayor = useMemo((): CuentaContable[] => {
        const cuentasMap: { [key: string]: { totalDebe: number; totalHaber: number } } = {};
        asientos.forEach(asiento => {
            if (!cuentasMap[asiento.cuenta]) cuentasMap[asiento.cuenta] = { totalDebe: 0, totalHaber: 0 };
            cuentasMap[asiento.cuenta].totalDebe += asiento.debe;
            cuentasMap[asiento.cuenta].totalHaber += asiento.haber;
        });

        return Object.entries(cuentasMap).map(([cuenta, { totalDebe, totalHaber }]) => {
            const saldo = totalDebe - totalHaber;
            const definicionCuenta = planDeCuentas.find(pc => pc.cuenta === cuenta) || { nombre: 'NO DEFINIDA', tipo: 'Gasto', subtipo: 'Gasto de Administración' };
            return {
                cuenta,
                nombre: definicionCuenta.nombre,
                tipo: definicionCuenta.tipo,
                subtipo: definicionCuenta.subtipo,
                totalDebe,
                totalHaber,
                saldoDeudor: saldo > 0 ? saldo : 0,
                saldoAcreedor: saldo < 0 ? Math.abs(saldo) : 0,
            };
        }).sort((a, b) => a.cuenta.localeCompare(b.cuenta));
    }, [asientos, planDeCuentas]);

    const structuredReports = useMemo(() => {
        const agruparPorSubtipo = (cuentas: CuentaContable[]) => 
            cuentas.reduce((acc, c) => {
                const saldoFinal = c.tipo === 'Activo' || c.tipo === 'Gasto' || c.tipo === 'Costo' ? c.saldoDeudor : c.saldoAcreedor;
                if (!acc[c.subtipo]) acc[c.subtipo] = { items: [], total: 0 };
                acc[c.subtipo].items.push({ cuenta: c.cuenta, nombre: c.nombre, saldo: saldoFinal });
                acc[c.subtipo].total += saldoFinal;
                return acc;
            }, {} as Record<SubtipoCuenta, { items: { cuenta: string; nombre: string; saldo: number }[], total: number }>);
            
        // Estado de Resultados
        const ingresos = agruparPorSubtipo(libroMayor.filter(c => c.tipo === 'Ingreso'));
        const costos = agruparPorSubtipo(libroMayor.filter(c => c.tipo === 'Costo'));
        const gastos = agruparPorSubtipo(libroMayor.filter(c => c.tipo === 'Gasto'));
        
        const totalIngresos = Object.values(ingresos).reduce((s, g) => s + g.total, 0);
        const totalCostos = Object.values(costos).reduce((s, g) => s + g.total, 0);
        const utilidadBruta = totalIngresos - totalCostos;
        const totalGastos = Object.values(gastos).reduce((s, g) => s + g.total, 0);
        const utilidadNeta = utilidadBruta - totalGastos;
        
        // Balance General
        const activos = agruparPorSubtipo(libroMayor.filter(c => c.tipo === 'Activo'));
        const pasivos = agruparPorSubtipo(libroMayor.filter(c => c.tipo === 'Pasivo'));
        const patrimonio = agruparPorSubtipo(libroMayor.filter(c => c.tipo === 'Patrimonio'));

        const totalActivos = Object.values(activos).reduce((s, g) => s + g.total, 0);
        const totalPasivos = Object.values(pasivos).reduce((s, g) => s + g.total, 0);
        const totalPatrimonioBase = Object.values(patrimonio).reduce((s, g) => s + g.total, 0);
        const totalPatrimonioNeto = totalPatrimonioBase + utilidadNeta;
        const totalPasivoPatrimonio = totalPasivos + totalPatrimonioNeto;
        const cuadre = Math.abs(totalActivos - totalPasivoPatrimonio);
        
        return {
            eerr: { ingresos, costos, gastos, totalIngresos, totalCostos, utilidadBruta, totalGastos, utilidadNeta },
            bg: { activos, pasivos, patrimonio, totalActivos, totalPasivos, totalPatrimonioNeto, totalPasivoPatrimonio, cuadre }
        };
    }, [libroMayor]);
    
    // --- MANEJADORES ---
    const handleAddAsiento = (asiento: Omit<Asiento, 'id'>) => {
        if (!planDeCuentas.some(pc => pc.cuenta === asiento.cuenta)) {
            toast({ variant: 'destructive', title: 'Error', description: `La cuenta ${asiento.cuenta} no existe en tu Plan de Cuentas. Por favor, añádela primero.` });
            return;
        }
        setAsientos(prev => [...prev, { ...asiento, id: new Date().toISOString() }].sort((a, b) => a.fecha.localeCompare(b.fecha)));
        toast({ title: "Éxito", description: "Asiento contable añadido." });
        setIsAsientoDialogOpen(false);
    };

    const handleDeleteAsiento = (id: string) => {
        setAsientos(prev => prev.filter(a => a.id !== id));
        toast({ variant: 'destructive', title: "Eliminado", description: "El asiento ha sido eliminado." });
    };
    
    return (
        <ToolCard
            title="Generador de Estados Financieros"
            description="Ingresa tus asientos contables y visualiza los reportes financieros principales."
        >
            <Alert className="mb-6">
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>¡Herramienta 100% Personalizable!</AlertTitle>
                <AlertDescription>
                    La precisión de los reportes depende de tu Plan de Cuentas. Haz clic en <strong>Configurar Plan de Cuentas</strong> para definir cómo se clasifica cada cuenta.
                </AlertDescription>
            </Alert>
            
            <div className="flex justify-between items-center mb-4">
                <PlanDeCuentasManager plan={planDeCuentas} setPlan={setPlanDeCuentas} toast={toast} />
                <Dialog open={isAsientoDialogOpen} onOpenChange={setIsAsientoDialogOpen}>
                    <DialogTrigger asChild><Button size="sm"><Plus className="mr-2 h-4 w-4" /> Añadir Asiento</Button></DialogTrigger>
                    <AsientoDialog onSubmit={handleAddAsiento} planDeCuentas={planDeCuentas} />
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
                        headers={['Cuenta', 'Nombre', 'Total Debe', 'Total Haber', 'Saldo Deudor', 'Saldo Acreedor']}
                        rows={libroMayor.map(c => [ c.cuenta, c.nombre, `S/ ${c.totalDebe.toFixed(2)}`, `S/ ${c.totalHaber.toFixed(2)}`, `S/ ${c.saldoDeudor.toFixed(2)}`, `S/ ${c.saldoAcreedor.toFixed(2)}` ])}
                    />
                </TabsContent>

                <TabsContent value="comprobacion" className="mt-4">
                     <ReportTable
                        headers={['Cuenta', 'Nombre', 'Saldo Deudor', 'Saldo Acreedor']}
                        rows={libroMayor.map(c => [ c.cuenta, c.nombre, `S/ ${c.saldoDeudor.toFixed(2)}`, `S/ ${c.saldoAcreedor.toFixed(2)}` ])}
                        footers={['', 'Totales:', `S/ ${libroMayor.reduce((s, c) => s + c.saldoDeudor, 0).toFixed(2)}`, `S/ ${libroMayor.reduce((s, c) => s + c.saldoAcreedor, 0).toFixed(2)}`]}
                    />
                </TabsContent>

                 <TabsContent value="resultados" className="mt-4">
                    <StructuredReport title="Estado de Resultados" sections={[
                        { title: 'Ingresos', data: structuredReports.eerr.ingresos, total: structuredReports.eerr.totalIngresos },
                        { title: 'Costo de Ventas', data: structuredReports.eerr.costos, total: structuredReports.eerr.totalCostos, isSubtraction: true },
                        { title: 'Utilidad Bruta', total: structuredReports.eerr.utilidadBruta, isBold: true },
                        { title: 'Gastos', data: structuredReports.eerr.gastos, total: structuredReports.eerr.totalGastos, isSubtraction: true },
                        { title: 'Utilidad Neta del Ejercicio', total: structuredReports.eerr.utilidadNeta, isBold: true, isFinal: true },
                    ]}/>
                </TabsContent>
                
                <TabsContent value="balance" className="mt-4">
                    <StructuredReport title="Balance General" sections={[
                        { title: 'Activos', data: structuredReports.bg.activos, total: structuredReports.bg.totalActivos, isBold: true },
                        { title: 'Pasivos', data: structuredReports.bg.pasivos, total: structuredReports.bg.totalPasivos },
                        { title: 'Patrimonio', data: structuredReports.bg.patrimonio, total: structuredReports.bg.totalPatrimonioNeto, isBold: true, note: 'Incluye Utilidad/Pérdida del Ejercicio' },
                        { title: 'Total Pasivo y Patrimonio', total: structuredReports.bg.totalPasivoPatrimonio, isBold: true, isFinal: true },
                    ]}/>
                    <div className="text-center mt-4">
                        {structuredReports.bg.cuadre < 0.01 ? (
                            <p className="text-sm text-green-600">✅ El balance cuadra correctamente.</p>
                        ) : (
                            <p className="text-sm text-destructive">⚠️ ¡Advertencia! El balance está descuadrado por S/ {structuredReports.bg.cuadre.toFixed(2)}.</p>
                        )}
                    </div>
                </TabsContent>

            </Tabs>
        </ToolCard>
    );
}

// --- SUB-COMPONENTES PARA ORGANIZACIÓN Y PROFESIONALISMO ---

function AsientoDialog({ onSubmit, planDeCuentas }: { onSubmit: (asiento: Omit<Asiento, 'id'>) => void; planDeCuentas: CuentaPC[] }) {
    // ... (El código de AsientoDialog de la versión anterior puede ir aquí, sin cambios)
}

function ReportTable({ headers, rows, footers }: { headers: string[], rows: (string | JSX.Element)[][], footers?: (string | JSX.Element)[] }) {
    // ... (El código de ReportTable de la versión anterior puede ir aquí, sin cambios)
}

// --- NUEVOS COMPONENTES PARA PLAN DE CUENTAS Y REPORTES ESTRUCTURADOS ---

const tiposDeCuenta: TipoCuenta[] = ['Activo', 'Pasivo', 'Patrimonio', 'Ingreso', 'Costo', 'Gasto'];
const subtiposPorTipo: Record<TipoCuenta, SubtipoCuenta[]> = {
    'Activo': ['Activo Corriente', 'Activo No Corriente'],
    'Pasivo': ['Pasivo Corriente', 'Pasivo No Corriente'],
    'Patrimonio': ['Capital', 'Resultados Acumulados'],
    'Ingreso': ['Ingresos Operacionales', 'Otros Ingresos'],
    'Costo': ['Costo de Ventas'],
    'Gasto': ['Gasto de Administración', 'Gasto de Venta', 'Gastos Financieros'],
};

function PlanDeCuentasManager({ plan, setPlan, toast }: { plan: CuentaPC[], setPlan: (p: CuentaPC[]) => void, toast: any }) {
    const [isManagerOpen, setIsManagerOpen] = useState(false);
    const [isEditorOpen, setIsEditorOpen] = useState(false);
    const [editingCuenta, setEditingCuenta] = useState<CuentaPC | null>(null);

    const handleSave = (cuenta: CuentaPC) => {
        const existe = plan.some(p => p.cuenta === cuenta.cuenta && (!editingCuenta || p.cuenta !== editingCuenta.cuenta));
        if (existe) {
            toast({ variant: 'destructive', title: 'Error', description: 'El código de cuenta ya existe.' });
            return;
        }
        if (editingCuenta) {
            setPlan(plan.map(p => p.cuenta === editingCuenta.cuenta ? cuenta : p));
            toast({ title: 'Éxito', description: 'Cuenta actualizada.' });
        } else {
            setPlan([...plan, cuenta].sort((a,b) => a.cuenta.localeCompare(b.cuenta)));
            toast({ title: 'Éxito', description: 'Cuenta añadida.' });
        }
        setIsEditorOpen(false);
        setEditingCuenta(null);
    };

    const handleDelete = (cuenta: string) => {
        setPlan(plan.filter(p => p.cuenta !== cuenta));
        toast({ variant: 'destructive', title: 'Eliminado', description: `Cuenta ${cuenta} eliminada.` });
    };

    return (
        <Dialog open={isManagerOpen} onOpenChange={setIsManagerOpen}>
            <DialogTrigger asChild><Button variant="outline" size="sm"><Settings className="mr-2 h-4 w-4" /> Configurar Plan de Cuentas</Button></DialogTrigger>
            <DialogContent className="max-w-4xl">
                <DialogHeader><DialogTitle>Gestor del Plan de Cuentas</DialogTitle></DialogHeader>
                <div className="flex justify-end">
                    <Button size="sm" onClick={() => { setEditingCuenta(null); setIsEditorOpen(true); }}><Plus className="mr-2 h-4 w-4" /> Añadir Cuenta</Button>
                </div>
                <div className="max-h-[60vh] overflow-y-auto">
                    <ReportTable
                        headers={['Cuenta', 'Nombre', 'Tipo', 'Subtipo', 'Acciones']}
                        rows={plan.map(p => [
                            p.cuenta, p.nombre, p.tipo, p.subtipo,
                            <div className="flex gap-1">
                                <Button variant="ghost" size="icon" onClick={() => { setEditingCuenta(p); setIsEditorOpen(true); }} className="h-8 w-8"><Edit className="h-4 w-4"/></Button>
                                <Button variant="ghost" size="icon" onClick={() => handleDelete(p.cuenta)} className="h-8 w-8 text-destructive"><Trash2 className="h-4 w-4"/></Button>
                            </div>
                        ])}
                    />
                </div>
                {isEditorOpen && <CuentaEditorDialog open={isEditorOpen} onOpenChange={setIsEditorOpen} onSave={handleSave} cuenta={editingCuenta} />}
            </DialogContent>
        </Dialog>
    );
}

function CuentaEditorDialog({ open, onOpenChange, onSave, cuenta }: { open: boolean, onOpenChange: (o: boolean) => void, onSave: (c: CuentaPC) => void, cuenta: CuentaPC | null }) {
    const [current, setCurrent] = useState<Partial<CuentaPC>>(cuenta || {});
    const handleSave = () => onSave(current as CuentaPC);
    
    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent>
                <DialogHeader><DialogTitle>{cuenta ? 'Editar' : 'Añadir'} Cuenta</DialogTitle></DialogHeader>
                <div className="grid gap-4 py-4">
                    <InputField id="cuenta-code" label="Código" value={current.cuenta || ''} onChange={v => setCurrent(c => ({...c, cuenta: v}))} disabled={!!cuenta} />
                    <InputField id="cuenta-nombre" label="Nombre" value={current.nombre || ''} onChange={v => setCurrent(c => ({...c, nombre: v}))} />
                    <SelectField id="cuenta-tipo" label="Tipo" value={current.tipo} onValueChange={v => setCurrent(c => ({...c, tipo: v as TipoCuenta, subtipo: undefined}))} options={tiposDeCuenta} />
                    {current.tipo && <SelectField id="cuenta-subtipo" label="Subtipo" value={current.subtipo} onValueChange={v => setCurrent(c => ({...c, subtipo: v as SubtipoCuenta}))} options={subtiposPorTipo[current.tipo]} />}
                </div>
                <DialogFooter><Button onClick={handleSave}>Guardar</Button></DialogFooter>
            </DialogContent>
        </Dialog>
    )
}

const InputField = ({ id, label, ...props }: any) => (
    <div className="grid grid-cols-4 items-center gap-4"><Label htmlFor={id} className="text-right">{label}</Label><Input id={id} className="col-span-3" {...props}/></div>
);
const SelectField = ({ id, label, options, ...props }: any) => (
    <div className="grid grid-cols-4 items-center gap-4"><Label htmlFor={id} className="text-right">{label}</Label><div className="col-span-3"><Select {...props}><SelectTrigger><SelectValue/></SelectTrigger><SelectContent>{options.map((o: string) => <SelectItem key={o} value={o}>{o}</SelectItem>)}</SelectContent></Select></div></div>
);


// Componente para renderizar reportes con estructura
function StructuredReport({ title, sections }: { title: string, sections: any[] }) {
    return (
        <div className="bg-muted/50 p-4 sm:p-6 rounded-lg space-y-2">
            <h3 className="text-xl font-bold text-center mb-4">{title}</h3>
            {sections.map((section, idx) => (
                <div key={idx} className={section.isBold ? "py-2 border-y font-semibold" : ""}>
                    {section.data && (
                        <div className="pl-4">
                            {Object.entries(section.data).map(([subtipo, data]: any) => (
                                <div key={subtipo} className="mb-2">
                                    <p className="text-sm font-semibold text-muted-foreground">{subtipo}</p>
                                    {data.items.map((item: any) => (
                                        <div key={item.cuenta} className="flex justify-between items-center text-sm ml-4">
                                            <span>{item.cuenta} - {item.nombre}</span>
                                            <span className="font-mono">S/ {item.saldo.toLocaleString('es-PE', {minimumFractionDigits: 2})}</span>
                                        </div>
                                    ))}
                                </div>
                            ))}
                        </div>
                    )}
                    <div className={`flex justify-between items-center ${section.isFinal ? "text-xl text-primary font-bold" : "text-md"}`}>
                        <span>{section.isSubtraction && '(-)'} {section.title} {section.note && <span className="text-xs text-muted-foreground">({section.note})</span>}</span>
                        <span className="font-mono">S/ {section.total.toLocaleString('es-PE', {minimumFractionDigits: 2})}</span>
                    </div>
                </div>
            ))}
        </div>
    );
}