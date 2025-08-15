
"use client";

import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow, TableFooter as UiTableFooter } from '@/components/ui/table';
import { Settings, Plus, Trash2, Info, FileDown } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useLocalStorage } from '@/hooks/use-local-storage';
import { useDebounce } from '@/hooks/use-debounce';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogClose } from '@/components/ui/dialog';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';

type TemplateEntry = {
    account: string;
    description: string;
    debit: string; // Formula
    credit: string; // Formula
};

type Template = {
    name: string;
    value: string;
    entries: TemplateEntry[];
};

type CalculatedEntry = {
    account: string;
    description: string;
    debit: number;
    credit: number;
};

const defaultTemplates: Template[] = [
    {
        name: "Venta de Mercadería",
        value: "venta_mercaderia",
        entries: [
            { account: "1212", description: "Emitidas en cartera", debit: "{{total}}", credit: "0" },
            { account: "40111", description: "IGV - Cuenta propia", debit: "0", credit: "{{igv}}" },
            { account: "7012", description: "Mercaderías manufacturadas", debit: "0", credit: "{{base}}" },
            { account: "6911", description: "Mercaderías", debit: "{{costo}}", credit: "0" },
            { account: "20111", description: "Mercaderías manufacturadas", debit: "0", credit: "{{costo}}" },
        ]
    },
    {
        name: "Compra de Mercadería",
        value: "compra_mercaderia",
        entries: [
            { account: "6011", description: "Mercaderías", debit: "{{base}}", credit: "0" },
            { account: "40111", description: "IGV - Cuenta propia", debit: "{{igv}}", credit: "0" },
            { account: "4212", description: "Emitidas", debit: "0", credit: "{{total}}" },
            { account: "20111", description: "Mercaderías manufacturadas", debit: "{{base}}", credit: "0" },
            { account: "6111", description: "Mercaderías", debit: "0", credit: "{{base}}" },
        ]
    },
];

const evaluateFormula = (formula: string, variables: { base: number; igv: number; total: number; costo: number; }): number => {
    try {
        if (!formula || formula.trim() === '0') return 0;
        
        const sanitizedFormula = formula
            .replace(/{{base}}/g, String(variables.base))
            .replace(/{{igv}}/g, String(variables.igv))
            .replace(/{{total}}/g, String(variables.total))
            .replace(/{{costo}}/g, String(variables.costo))
            .replace(/[^0-9.+-/*()\s]/g, '');

        if (!sanitizedFormula.trim()) return 0;
        
        const result = new Function(`return ${sanitizedFormula}`)();
        return isNaN(result) ? 0 : parseFloat(result.toFixed(2));
    } catch (error) {
        console.error("Error evaluating formula:", formula, error);
        return 0;
    }
};

const TemplateManager = ({ templates, setTemplates, toast, onDialogClose }: {
    templates: Template[];
    setTemplates: (templates: Template[]) => void;
    toast: (options: { title: string, description: string, variant?: 'default' | 'destructive' }) => void;
    onDialogClose: () => void;
}) => {
    const [customTemplates, setCustomTemplates] = useLocalStorage<Template[]>('contabilidad-templates-custom', []);
    
    const addTemplate = (newTemplate: Template) => {
        const allTemplates = [...defaultTemplates, ...customTemplates];
        if (allTemplates.some(t => t.name.toLowerCase() === newTemplate.name.toLowerCase() || t.value === newTemplate.value)) {
            toast({ variant: 'destructive', title: "Error", description: "Ya existe una plantilla con ese nombre o valor." });
            return false;
        }
        setCustomTemplates([...customTemplates, newTemplate]);
        setTemplates([...defaultTemplates, ...customTemplates, newTemplate]);
        toast({ title: "Éxito", description: "Plantilla añadida correctamente." });
        return true;
    };

    const deleteTemplate = (value: string) => {
        const updatedCustom = customTemplates.filter(t => t.value !== value);
        setCustomTemplates(updatedCustom);
        setTemplates([...defaultTemplates, ...updatedCustom]);
        toast({ title: "Éxito", description: "Plantilla eliminada." });
    };
    
    const allTemplates = [...defaultTemplates, ...customTemplates];

    return (
        <Dialog onOpenChange={(open) => !open && onDialogClose()}>
            <DialogTrigger asChild>
                <Button variant="outline" size="sm"><Settings className="mr-2 h-4 w-4" /> Administrar Plantillas</Button>
            </DialogTrigger>
            <DialogContent className="max-w-3xl h-auto">
                <DialogHeader>
                    <DialogTitle>Gestor de Plantillas</DialogTitle>
                    <DialogDescription>
                        Visualiza, elimina o añade nuevas plantillas de asientos contables. Las plantillas personalizadas se guardan en tu navegador.
                    </DialogDescription>
                </DialogHeader>
                <div className="grid md:grid-cols-2 gap-8 py-4">
                    <div className="space-y-4">
                        <h4 className="font-semibold text-lg">Plantillas Existentes</h4>
                        <div className="space-y-3">
                            {allTemplates.map(template => (
                                <Card key={template.value} className="flex items-center justify-between p-3 bg-muted/50">
                                    <span className="font-medium">{template.name}</span>
                                    {!defaultTemplates.some(dt => dt.value === template.value) && (
                                        <Button variant="ghost" size="icon" onClick={() => deleteTemplate(template.value)} className="text-muted-foreground hover:text-destructive h-8 w-8">
                                            <Trash2 className="h-4 w-4" />
                                        </Button>
                                    )}
                                </Card>
                            ))}
                        </div>
                    </div>
                    <AddTemplateForm onSubmit={addTemplate} />
                </div>
            </DialogContent>
        </Dialog>
    );
};


export function AsientosContables() {
    const [customTemplates, setCustomTemplates] = useLocalStorage<Template[]>('contabilidad-templates-custom', []);
    const [allTemplates, setAllTemplates] = useState(() => [...defaultTemplates, ...customTemplates]);
    const [selectedTemplateValue, setSelectedTemplateValue] = useState(defaultTemplates[0].value);
    const [montoStr, setMontoStr] = useState("");
    const [tipoMonto, setTipoMonto] = useState<'Con IGV' | 'Sin IGV'>('Con IGV');
    const [calculatedEntries, setCalculatedEntries] = useState<CalculatedEntry[]>([]);
    
    const debouncedMonto = useDebounce(montoStr, 300);
    const { toast } = useToast();

    useEffect(() => {
        setAllTemplates([...defaultTemplates, ...customTemplates]);
    }, [customTemplates]);


    useEffect(() => {
        const monto = parseFloat(debouncedMonto);

        if (isNaN(monto) || monto <= 0) {
            setCalculatedEntries([]);
            return;
        }

        const template = allTemplates.find(t => t.value === selectedTemplateValue);
        if (!template) return;

        let base = 0, igv = 0, total = 0;

        if (tipoMonto === 'Sin IGV') {
            base = monto;
            igv = monto * 0.18;
            total = base + igv;
        } else {
            total = monto;
            base = monto / 1.18;
            igv = total - base;
        }

        const costo = base * 0.5; // Definición del costo para la plantilla de venta

        const variables = { base, igv, total, costo };

        const newEntries = template.entries.map(entry => ({
            account: entry.account,
            description: entry.description,
            debit: evaluateFormula(entry.debit, variables) || 0,
            credit: evaluateFormula(entry.credit, variables) || 0,
        }));
        
        setCalculatedEntries(newEntries);
    }, [debouncedMonto, tipoMonto, selectedTemplateValue, allTemplates]);

    const totals = useMemo(() => {
        return calculatedEntries.reduce((acc, entry) => {
            acc.debit += entry.debit;
            acc.credit += entry.credit;
            return acc;
        }, { debit: 0, credit: 0 });
    }, [calculatedEntries]);

    const handleExportPDF = () => {
        if (calculatedEntries.length === 0) return;
        const doc = new jsPDF();
        const templateName = allTemplates.find(t => t.value === selectedTemplateValue)?.name || "Asiento Contable";

        doc.setFontSize(18);
        doc.text(`Asiento Contable: ${templateName}`, 14, 22);
        doc.setFontSize(11);
        doc.setTextColor(100);

        autoTable(doc, {
            startY: 30,
            head: [['Cuenta', 'Descripción', 'Debe (S/)', 'Haber (S/)']],
            body: calculatedEntries.map(e => [
                e.account,
                e.description,
                e.debit > 0 ? e.debit.toFixed(2) : '',
                e.credit > 0 ? e.credit.toFixed(2) : ''
            ]),
            foot: [[
                { content: 'Totales', colSpan: 2, styles: { halign: 'right', fontStyle: 'bold' } },
                { content: totals.debit.toFixed(2), styles: { halign: 'right', fontStyle: 'bold' } },
                { content: totals.credit.toFixed(2), styles: { halign: 'right', fontStyle: 'bold' } }
            ]],
            theme: 'striped',
            headStyles: { fillColor: [63, 81, 181] }, // Primary color
            didDrawPage: (data) => {
                const pageSize = doc.internal.pageSize;
                const pageWidth = pageSize.width;
                const pageHeight = pageSize.height;
                
                // Watermark
                doc.saveGraphicsState();
                doc.setFontSize(50);
                doc.setTextColor(150);
                doc.setGState(new (doc as any).GState({ opacity: 0.1 }));
                doc.text('BILUZ', pageWidth / 2, pageHeight / 2, {
                    align: 'center',
                    angle: 45
                });
                doc.restoreGraphicsState();
                
                // Footer
                doc.setFontSize(8);
                doc.setTextColor(120);
                const footerText = "Generado por BILUZ Herramientas Contables";
                doc.text(footerText, pageWidth / 2, pageHeight - 10, { align: 'center' });
            }
        });

        doc.save(`asiento_${selectedTemplateValue}_${Date.now()}.pdf`);
    };

    const handleExportExcel = () => {
        if (calculatedEntries.length === 0) return;
        
        const dataToExport = calculatedEntries.map(e => ({
            'Cuenta': e.account,
            'Descripción': e.description,
            'Debe (S/)': e.debit > 0 ? e.debit : '',
            'Haber (S/)': e.credit > 0 ? e.credit : ''
        }));
        
        dataToExport.push({
            'Cuenta': '',
            'Descripción': 'Totales',
            'Debe (S/)': totals.debit,
            'Haber (S/)': totals.credit
        });
        
        const ws = XLSX.utils.json_to_sheet(dataToExport);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "Asiento Contable");
        
        const note = [["Generado por BILUZ Herramientas Contables"]];
        XLSX.utils.sheet_add_aoa(ws, note, { origin: -1 });

        XLSX.writeFile(wb, `asiento_${selectedTemplateValue}_${Date.now()}.xlsx`);
    };

    return (
        <Card className="flex flex-col h-full">
            <CardHeader className="flex flex-row items-center justify-between">
                <div>
                    <CardTitle>Generador de Asientos Contables</CardTitle>
                    <CardDescription>Genera asientos contables automáticamente a partir de plantillas.</CardDescription>
                </div>
                <TemplateManager 
                    templates={allTemplates} 
                    setTemplates={setAllTemplates} 
                    toast={toast}
                    onDialogClose={() => {
                        const templateExists = allTemplates.some(t => t.value === selectedTemplateValue);
                        if (!templateExists) {
                            setSelectedTemplateValue(defaultTemplates[0].value);
                        }
                    }}
                />
            </CardHeader>
            <CardContent className="space-y-6 flex-grow">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6 items-end">
                    <div className="space-y-2">
                        <Label htmlFor="template">Plantilla de Asiento</Label>
                        <Select value={selectedTemplateValue} onValueChange={setSelectedTemplateValue}>
                            <SelectTrigger id="template">
                                <SelectValue placeholder="Selecciona una plantilla" />
                            </SelectTrigger>
                            <SelectContent>
                                {allTemplates.map(template => (
                                    <SelectItem key={template.value} value={template.value}>
                                        {template.name}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                     <div className="space-y-2">
                        <Label htmlFor="amount">Monto (S/)</Label>
                        <Input
                            id="amount"
                            type="number"
                            value={montoStr}
                            onChange={e => setMontoStr(e.target.value)}
                            placeholder="0.00"
                        />
                    </div>
                    <div className="space-y-2">
                        <Label>Tipo de Monto</Label>
                        <RadioGroup
                            value={tipoMonto}
                            onValueChange={(value: 'Con IGV' | 'Sin IGV') => setTipoMonto(value)}
                            className="flex pt-2 space-x-4"
                        >
                            <div className="flex items-center space-x-2">
                                <RadioGroupItem value="Con IGV" id="con-igv" />
                                <Label htmlFor="con-igv">Con IGV</Label>
                            </div>
                            <div className="flex items-center space-x-2">
                                <RadioGroupItem value="Sin IGV" id="sin-igv" />
                                <Label htmlFor="sin-igv">Sin IGV</Label>
                            </div>
                        </RadioGroup>
                    </div>
                </div>

                {calculatedEntries.length > 0 && (
                    <div className="space-y-4 pt-4">
                        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3">
                            <h3 className="text-lg font-semibold">Asiento Contable Generado</h3>
                            <div className="flex gap-2 flex-wrap">
                                <Button variant="outline" size="sm" onClick={handleExportPDF} className="flex-1 sm:flex-none">
                                    <FileDown className="mr-2 h-4 w-4" /> PDF
                                </Button>
                                <Button variant="outline" size="sm" onClick={handleExportExcel} className="flex-1 sm:flex-none">
                                    <FileDown className="mr-2 h-4 w-4" /> Excel
                                </Button>
                            </div>
                        </div>
                        <div className="rounded-md border overflow-x-auto">
                            <Table className="min-w-[600px]">
                                <TableHeader>
                                    <TableRow>
                                        <TableHead className="w-[100px]">Cuenta</TableHead>
                                        <TableHead>Descripción</TableHead>
                                        <TableHead className="text-right">Debe (S/)</TableHead>
                                        <TableHead className="text-right">Haber (S/)</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {calculatedEntries.map((entry, index) => (
                                        <TableRow key={index}>
                                            <TableCell className="font-medium">{entry.account}</TableCell>
                                            <TableCell>{entry.description}</TableCell>
                                            <TableCell className="text-right font-mono">{entry.debit > 0 ? entry.debit.toFixed(2) : '-'}</TableCell>
                                            <TableCell className="text-right font-mono">{entry.credit > 0 ? entry.credit.toFixed(2) : '-'}</TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                                <UiTableFooter>
                                    <TableRow className="font-bold bg-muted hover:bg-muted">
                                        <TableCell colSpan={2} className="text-right">Totales</TableCell>
                                        <TableCell className="text-right font-mono">{totals.debit.toFixed(2)}</TableCell>
                                        <TableCell className="text-right font-mono">{totals.credit.toFixed(2)}</TableCell>
                                    </TableRow>
                                </UiTableFooter>
                            </Table>
                        </div>
                         {Math.abs(totals.debit - totals.credit) > 0.01 && (
                            <p className="text-sm text-destructive text-center pt-2">Advertencia: El asiento está descuadrado. Revisa las fórmulas de la plantilla.</p>
                        )}
                    </div>
                )}
                 <p className="text-xs text-muted-foreground pt-4">
                    Herramienta de simulación basada en el PCGE 2020. Los cálculos son genéricos. Consultar siempre con un profesional contable.
                 </p>
            </CardContent>
            <CardFooter>
                 <p className="text-xs text-muted-foreground w-full text-center">
                    © BILUZ - Todos los Derechos Reservados
                 </p>
            </CardFooter>
        </Card>
    );
}

interface AddTemplateFormProps {
    onSubmit: (template: Template) => boolean;
}

const formulaOptions = [
    { value: "0", label: "Ninguno" },
    { value: "{{base}}", label: "Base Imponible" },
    { value: "{{igv}}", label: "IGV" },
    { value: "{{total}}", label: "Total" },
    { value: "{{costo}}", label: "Costo (50% Base)" },
]

function AddTemplateForm({ onSubmit }: AddTemplateFormProps) {
    const initialEntryState = { account: "", description: "", debit: "0", credit: "0" };
    const [name, setName] = useState("");
    const [entries, setEntries] = useState<TemplateEntry[]>([initialEntryState]);

    const handleEntryChange = (index: number, field: keyof TemplateEntry, value: string) => {
        const newEntries = [...entries];
        newEntries[index][field] = value;
        
        // Ensure only one of debit/credit has a value other than "0"
        if (field === 'debit' && value !== '0') {
            newEntries[index]['credit'] = '0';
        } else if (field === 'credit' && value !== '0') {
            newEntries[index]['debit'] = '0';
        }

        setEntries(newEntries);
    };

    const addEntryRow = () => {
        setEntries([...entries, initialEntryState]);
    };

    const removeEntryRow = (index: number) => {
        if (entries.length > 1) {
            setEntries(entries.filter((_, i) => i !== index));
        }
    };

    const handleSubmit = () => {
        if (!name.trim()) {
            alert("El nombre de la plantilla es obligatorio.");
            return;
        }
        if (entries.some(e => !e.account.trim() || !e.description.trim() || (e.debit === '0' && e.credit === '0'))) {
            alert("Todas las filas deben tener cuenta, descripción y una selección en Debe o Haber.");
            return;
        }

        const newTemplate = {
            name,
            value: name.trim().toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, ''),
            entries
        };
        
        const success = onSubmit(newTemplate);
        
        if (success) {
            setName("");
            setEntries([initialEntryState]);
        }
    };
    
    return (
        <div className="space-y-4">
            <h4 className="font-semibold text-lg">Añadir Nueva Plantilla</h4>
            <div className="space-y-2">
                <Label htmlFor="template-name">Nombre de la Plantilla</Label>
                <Input id="template-name" value={name} onChange={e => setName(e.target.value)} placeholder="Ej: Venta con Detracción"/>
            </div>
            
            <div className="space-y-3">
                 <div className="flex items-center justify-between">
                    <Label>Líneas del Asiento</Label>
                    <Button variant="ghost" size="icon" onClick={addEntryRow} className="h-9 w-9 text-muted-foreground hover:text-primary shrink-0"><Plus className="h-4 w-4"/></Button>
                </div>
                <div className="space-y-2">
                    <div className="grid grid-cols-[minmax(0,1fr)_minmax(0,2fr)_minmax(0,1fr)_minmax(0,1fr)_auto] gap-2 mb-1 text-xs text-muted-foreground">
                        <Label>Cuenta</Label>
                        <Label>Descripción</Label>
                        <Label className="text-right">Debe</Label>
                        <Label className="text-right">Haber</Label>
                    </div>
                    {entries.map((entry, index) => (
                        <div key={index} className="grid grid-cols-[minmax(0,1fr)_minmax(0,2fr)_minmax(0,1fr)_minmax(0,1fr)_auto] gap-2 items-center">
                            <Input placeholder="Cuenta" value={entry.account} onChange={e => handleEntryChange(index, 'account', e.target.value)} className="text-xs h-9"/>
                            <Input placeholder="Descripción" value={entry.description} onChange={e => handleEntryChange(index, 'description', e.target.value)} className="text-xs h-9"/>
                            
                            <Select value={entry.debit} onValueChange={value => handleEntryChange(index, 'debit', value)}>
                                <SelectTrigger className="text-xs h-9"><SelectValue /></SelectTrigger>
                                <SelectContent>
                                    {formulaOptions.map(opt => <SelectItem key={`d-${opt.value}`} value={opt.value}>{opt.label}</SelectItem>)}
                                </SelectContent>
                            </Select>

                            <Select value={entry.credit} onValueChange={value => handleEntryChange(index, 'credit', value)}>
                                <SelectTrigger className="text-xs h-9"><SelectValue /></SelectTrigger>
                                <SelectContent>
                                    {formulaOptions.map(opt => <SelectItem key={`c-${opt.value}`} value={opt.value}>{opt.label}</SelectItem>)}
                                </SelectContent>
                            </Select>

                            <Button variant="ghost" size="icon" onClick={() => removeEntryRow(index)} disabled={entries.length === 1} className="h-9 w-9 text-muted-foreground hover:text-destructive shrink-0"><Trash2 className="h-4 w-4"/></Button>
                        </div>
                    ))}
                </div>
            </div>
             <DialogFooter className="pt-4">
                <Button onClick={handleSubmit} className="w-full">Guardar Plantilla</Button>
             </DialogFooter>
        </div>
    )
}

    
