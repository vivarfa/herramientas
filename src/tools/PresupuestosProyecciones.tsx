// src/tools/PresupuestosProyecciones.tsx

"use client";

import React, { useState } from 'react';
import { useLocalStorage } from '@/hooks/use-local-storage';
import { ToolCard } from '@/components/ui/ToolCard';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Plus, Trash2, Edit } from 'lucide-react';
import { ResponsiveContainer, BarChart, CartesianGrid, XAxis, YAxis, Tooltip, Legend, Bar, ReferenceLine } from 'recharts';
import { Progress } from "@/components/ui/progress";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";

// --- TIPOS DE DATOS ---
type BudgetItem = {
    id: string;
    category: string;
    budgeted: number;
    actual: number;
    type: 'ingreso' | 'gasto';
};

const initialBudget: BudgetItem[] = [
    { id: '1', category: 'Ventas de Servicios', budgeted: 15000, actual: 16500, type: 'ingreso' },
    { id: '2', category: 'Alquiler de Oficina', budgeted: 2500, actual: 2500, type: 'gasto' },
    { id: '3', category: 'Sueldos y Salarios', budgeted: 6000, actual: 6200, type: 'gasto' },
    { id: '4', category: 'Marketing y Publicidad', budgeted: 1000, actual: 850, type: 'gasto' },
];

export function PresupuestosProyecciones() {
    const [budgetItems, setBudgetItems] = useLocalStorage<BudgetItem[]>('presupuestos-data', initialBudget);
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [editingItem, setEditingItem] = useState<BudgetItem | null>(null);

    const handleSaveItem = (item: Omit<BudgetItem, 'id'> & { id?: string }) => {
        if (item.id) { // Editando
            setBudgetItems(prev => prev.map(i => i.id === item.id ? { ...i, ...item } : i));
        } else { // Creando
            setBudgetItems(prev => [...prev, { ...item, id: new Date().toISOString() }]);
        }
        setIsDialogOpen(false);
        setEditingItem(null);
    };

    const handleDeleteItem = (id: string) => {
        setBudgetItems(prev => prev.filter(i => i.id !== id));
    };

    const openEditDialog = (item: BudgetItem) => {
        setEditingItem(item);
        setIsDialogOpen(true);
    };

    const openNewDialog = () => {
        setEditingItem(null);
        setIsDialogOpen(true);
    };

    const totals = React.useMemo(() => {
        const totalIngresosB = budgetItems.filter(i => i.type === 'ingreso').reduce((sum, i) => sum + i.budgeted, 0);
        const totalIngresosA = budgetItems.filter(i => i.type === 'ingreso').reduce((sum, i) => sum + i.actual, 0);
        const totalGastosB = budgetItems.filter(i => i.type === 'gasto').reduce((sum, i) => sum + i.budgeted, 0);
        const totalGastosA = budgetItems.filter(i => i.type === 'gasto').reduce((sum, i) => sum + i.actual, 0);
        
        return {
            ingresos: { budgeted: totalIngresosB, actual: totalIngresosA, diff: totalIngresosA - totalIngresosB },
            gastos: { budgeted: totalGastosB, actual: totalGastosA, diff: totalGastosA - totalGastosB },
            resultado: { budgeted: totalIngresosB - totalGastosB, actual: totalIngresosA - totalGastosA, diff: (totalIngresosA - totalGastosA) - (totalIngresosB - totalGastosB) }
        };
    }, [budgetItems]);

    return (
        <ToolCard
            title="Control de Presupuestos"
            description="Define tus metas de ingresos y gastos, registra los montos reales y analiza las desviaciones."
        >
            <div className="flex justify-end mb-4">
                 <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                    <DialogTrigger asChild>
                        <Button onClick={openNewDialog}><Plus className="mr-2 h-4 w-4" /> Nueva Partida</Button>
                    </DialogTrigger>
                    <BudgetItemDialog key={editingItem?.id} item={editingItem} onSave={handleSaveItem} />
                </Dialog>
            </div>

            {/* --- Resumen y Gráfico --- */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
                <div className="space-y-4">
                     <SummaryCard title="Ingresos" data={totals.ingresos} />
                     <SummaryCard title="Gastos" data={totals.gastos} isGasto />
                     <SummaryCard title="Resultado (Utilidad/Pérdida)" data={totals.resultado} isResultado />
                </div>
                <div style={{ width: '100%', height: 300 }}>
                     <ResponsiveContainer>
                         <BarChart data={[totals.ingresos, totals.gastos, totals.resultado].map(d => ({...d, name: ''}))} layout="vertical" barGap={10} margin={{top:5, right:20, left:-20, bottom:5}}>
                             <CartesianGrid strokeDasharray="3 3" />
                             <XAxis type="number" />
                             <YAxis type="category" dataKey="name" />
                             <Tooltip />
                             <Legend />
                             <Bar dataKey="budgeted" fill="#8884d8" name="Presupuestado" />
                             <Bar dataKey="actual" fill="#82ca9d" name="Real" />
                         </BarChart>
                    </ResponsiveContainer>
                </div>
            </div>

            {/* --- Tabla de Detalles --- */}
            <div className="rounded-md border">
                 <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Categoría</TableHead>
                            <TableHead className="text-right">Presupuestado (S/)</TableHead>
                            <TableHead className="text-right">Real (S/)</TableHead>
                            <TableHead className="text-right">Desviación (S/)</TableHead>
                            <TableHead>Cumplimiento</TableHead>
                            <TableHead className="text-right">Acciones</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {budgetItems.map(item => <BudgetItemRow key={item.id} item={item} onEdit={openEditDialog} onDelete={handleDeleteItem} />)}
                    </TableBody>
                </Table>
            </div>

        </ToolCard>
    );
}

// --- SUB-COMPONENTES ---
const BudgetItemRow = ({ item, onEdit, onDelete }: { item: BudgetItem, onEdit: (item: BudgetItem) => void, onDelete: (id: string) => void }) => {
    const deviation = item.actual - item.budgeted;
    const progress = item.budgeted > 0 ? (item.actual / item.budgeted) * 100 : 0;
    
    let deviationClass = "text-yellow-500";
    if (item.type === 'ingreso') {
        if (deviation > 0) deviationClass = "text-green-500";
        if (deviation < 0) deviationClass = "text-red-500";
    } else { // gasto
        if (deviation > 0) deviationClass = "text-red-500";
        if (deviation < 0) deviationClass = "text-green-500";
    }

    return (
        <TableRow>
            <TableCell className="font-medium">{item.category} <span className={item.type === 'ingreso' ? 'text-green-500' : 'text-red-500'}>({item.type})</span></TableCell>
            <TableCell className="text-right font-mono">{item.budgeted.toFixed(2)}</TableCell>
            <TableCell className="text-right font-mono">{item.actual.toFixed(2)}</TableCell>
            <TableCell className={`text-right font-mono ${deviationClass}`}>{deviation.toFixed(2)}</TableCell>
            <TableCell><Progress value={progress} className="w-[80%]" /></TableCell>
            <TableCell className="text-right">
                <Button variant="ghost" size="icon" onClick={() => onEdit(item)}><Edit className="h-4 w-4" /></Button>
                <Button variant="ghost" size="icon" onClick={() => onDelete(item.id)} className="text-red-500"><Trash2 className="h-4 w-4" /></Button>
            </TableCell>
        </TableRow>
    );
};

const SummaryCard = ({ title, data, isGasto=false, isResultado=false }: { title: string; data: { budgeted: number; actual: number; diff: number }; isGasto?: boolean; isResultado?: boolean }) => {
     let diffClass = "text-yellow-500";
     if(data.diff > 0) diffClass = isGasto ? "text-red-500" : "text-green-500";
     if(data.diff < 0) diffClass = isGasto ? "text-green-500" : "text-red-500";

    return(
    <div className="bg-muted/50 p-4 rounded-lg">
        <h4 className="font-semibold">{title}</h4>
        <div className="flex justify-between items-baseline mt-2">
            <span className="text-xs">Presupuestado:</span><span className="font-mono">S/ {data.budgeted.toFixed(2)}</span>
        </div>
        <div className="flex justify-between items-baseline">
            <span className="text-xs">Real:</span><span className="font-mono">S/ {data.actual.toFixed(2)}</span>
        </div>
        <div className={`flex justify-between items-baseline mt-1 pt-1 border-t ${diffClass}`}>
            <span className="text-sm font-bold">Desviación:</span><span className="text-lg font-bold font-mono">S/ {data.diff.toFixed(2)}</span>
        </div>
    </div>
)};

const BudgetItemDialog = ({ item, onSave }: { item: BudgetItem | null, onSave: (item: any) => void }) => {
    const [category, setCategory] = useState(item?.category || '');
    const [budgeted, setBudgeted] = useState(item?.budgeted?.toString() || '');
    const [actual, setActual] = useState(item?.actual?.toString() || '');
    const [type, setType] = useState(item?.type || 'gasto');

    const handleSave = () => {
        onSave({
            id: item?.id,
            category,
            budgeted: parseFloat(budgeted) || 0,
            actual: parseFloat(actual) || 0,
            type
        });
    };

    return(
        <DialogContent>
            <DialogHeader>
                <DialogTitle>{item ? 'Editar' : 'Nueva'} Partida Presupuestaria</DialogTitle>
            </DialogHeader>
            <div className="grid gap-4 py-4">
                <InputField id="category" label="Categoría" value={category} onChange={setCategory} />
                <InputField id="budgeted" label="Monto Presupuestado (S/)" value={budgeted} onChange={setBudgeted} type="number" />
                <InputField id="actual" label="Monto Real (S/)" value={actual} onChange={setActual} type="number" />
                 <div>
                    <Label>Tipo de Partida</Label>
                    <div className="flex gap-4 mt-2">
                        <Button variant={type === 'ingreso' ? 'default' : 'outline'} onClick={() => setType('ingreso')}>Ingreso</Button>
                        <Button variant={type === 'gasto' ? 'default' : 'outline'} onClick={() => setType('gasto')}>Gasto</Button>
                    </div>
                 </div>
            </div>
            <DialogFooter>
                <DialogClose asChild><Button type="button" variant="secondary">Cancelar</Button></DialogClose>
                <Button type="submit" onClick={handleSave}>Guardar</Button>
            </DialogFooter>
        </DialogContent>
    );
};

const InputField = ({ id, label, value, onChange, type = 'text' }: {id:string, label: string, value: string, onChange: (v: string) => void, type?: string}) => (
    <div className="grid grid-cols-4 items-center gap-4">
        <Label htmlFor={id} className="text-right">{label}</Label>
        <Input id={id} value={value} onChange={e => onChange(e.target.value)} type={type} className="col-span-3"/>
    </div>
);