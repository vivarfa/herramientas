// src/tools/DashboardFinanciero.tsx

"use client";

import React, { useState, useMemo } from 'react';
import { useLocalStorage } from '@/hooks/use-local-storage';
import { ToolCard } from '@/components/ui/ToolCard';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { TrendingUp, TrendingDown, Scale, Percent, Banknote, Landmark } from 'lucide-react';
import { ResponsiveContainer, BarChart, CartesianGrid, XAxis, YAxis, Tooltip, Legend, Bar, LineChart, Line } from 'recharts';
import { motion, AnimatePresence } from 'framer-motion';

// --- TIPOS DE DATOS ---
type FinancialData = {
    // Para Ratios de Liquidez
    activoCorriente: string;
    pasivoCorriente: string;
    // Para Ratios de Endeudamiento
    totalPasivo: string;
    totalActivo: string;
    totalPatrimonio: string;
    // Para Ratios de Rentabilidad
    utilidadNeta: string;
    ventasNetas: string;
    // Para evolución de Ventas (opcional)
    ventasMensuales: { month: string; ventas: number }[];
};

// --- VALORES INICIALES VACÍOS ---
const initialData: FinancialData = {
    activoCorriente: '',
    pasivoCorriente: '',
    totalPasivo: '',
    totalActivo: '',
    totalPatrimonio: '',
    utilidadNeta: '',
    ventasNetas: '',
    ventasMensuales: [],
};

// --- COMPONENTES VISUALES ---
const KpiCard = ({ title, value, interpretation, icon }: { title: string; value: string; interpretation: string; icon: React.ReactNode }) => (
    <motion.div 
        className="bg-card border rounded-lg p-3 sm:p-4 flex flex-col justify-between min-h-[120px] sm:min-h-[140px]"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        whileHover={{ scale: 1.02, y: -2 }}
        transition={{ type: 'spring', stiffness: 300 }}
    >
        <div className="flex items-start justify-between mb-2">
            <p className="text-xs sm:text-sm font-medium text-muted-foreground leading-tight">{title}</p>
            <div className="text-primary flex-shrink-0 ml-2">{icon}</div>
        </div>
        <p className="text-xl sm:text-2xl font-bold mb-1">{value}</p>
        <p className="text-xs text-muted-foreground leading-tight">{interpretation}</p>
    </motion.div>
);

export function DashboardFinanciero() {
    const [data, setData] = useLocalStorage<FinancialData>('dashboard-financiero-data', initialData);
    const [isEditing, setIsEditing] = useState(false);

    const handleInputChange = (field: keyof Omit<FinancialData, 'ventasMensuales'>, value: string) => {
        setData(prev => ({ ...prev, [field]: value.replace(/[^0-9.]/g, '') }));
    };

    // --- CÁLCULO DE KPIs ---
    const kpis = useMemo(() => {
        const ac = parseFloat(data.activoCorriente) || 0;
        const pc = parseFloat(data.pasivoCorriente) || 0;
        const tp = parseFloat(data.totalPasivo) || 0;
        const ta = parseFloat(data.totalActivo) || 0;
        const pat = parseFloat(data.totalPatrimonio) || 0;
        const un = parseFloat(data.utilidadNeta) || 0;
        const vn = parseFloat(data.ventasNetas) || 0;

        // Ratio de Liquidez Corriente
        const liquidezCorriente = pc > 0 ? ac / pc : 0;
        let liquidezInterp = "Por cada S/ 1 de deuda a corto plazo, la empresa tiene S/ " + liquidezCorriente.toFixed(2) + " para pagar.";
        if (liquidezCorriente < 1) liquidezInterp += " ⚠️ Posible riesgo de liquidez.";
        if (liquidezCorriente > 2) liquidezInterp += " ✅ Fuerte capacidad de pago.";

        // Ratio de Endeudamiento
        const endeudamiento = ta > 0 ? tp / ta : 0;
        let endeudamientoInterp = `El ${(endeudamiento * 100).toFixed(1)}% de los activos está financiado por deuda.`;
        if (endeudamiento > 0.6) endeudamientoInterp += " ⚠️ Alto nivel de endeudamiento.";
        if (endeudamiento < 0.4) endeudamientoInterp += " ✅ Bajo nivel de endeudamiento.";
        
        // Margen de Utilidad Neta
        const margenNeto = vn > 0 ? un / vn : 0;
        let margenInterp = `Por cada S/ 100 de venta, la empresa genera S/ ${(margenNeto * 100).toFixed(1)} de ganancia neta.`;

        return { liquidezCorriente, endeudamiento, margenNeto, liquidezInterp, endeudamientoInterp, margenInterp };
    }, [data]);
    
    return (
        <ToolCard
            title="Dashboard de Ratios Financieros"
            description="Visualiza la salud de tu negocio a través de indicadores clave (KPIs)."
        >
            <AnimatePresence>
            {isEditing && (
                <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    transition={{ duration: 0.3 }}
                    className="overflow-hidden"
                >
                    <div className="p-4 border rounded-lg mb-6 space-y-4 bg-muted/30">
                        <h3 className="text-lg font-semibold">Ingresar Datos del Balance y EERR</h3>
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
                            <InputField label="Activo Corriente" value={data.activoCorriente} onChange={v => handleInputChange('activoCorriente', v)} />
                            <InputField label="Pasivo Corriente" value={data.pasivoCorriente} onChange={v => handleInputChange('pasivoCorriente', v)} />
                            <InputField label="Total Activo" value={data.totalActivo} onChange={v => handleInputChange('totalActivo', v)} />
                            <InputField label="Total Pasivo" value={data.totalPasivo} onChange={v => handleInputChange('totalPasivo', v)} />
                            <InputField label="Patrimonio" value={data.totalPatrimonio} onChange={v => handleInputChange('totalPatrimonio', v)} />
                            <InputField label="Ventas Netas Anuales" value={data.ventasNetas} onChange={v => handleInputChange('ventasNetas', v)} />
                            <InputField label="Utilidad Neta Anual" value={data.utilidadNeta} onChange={v => handleInputChange('utilidadNeta', v)} />
                        </div>
                    </div>
                </motion.div>
            )}
            </AnimatePresence>

            <div className="flex justify-end mb-4">
                <Button onClick={() => setIsEditing(!isEditing)} variant="outline">
                    {isEditing ? 'Ocultar Entradas' : 'Editar Datos'}
                </Button>
            </div>
            
            <Alert className="mb-6">
                <Banknote className="h-4 w-4" />
                <AlertTitle>¡Bienvenido a tu Dashboard!</AlertTitle>
                <AlertDescription>
                    {isEditing ? "Modifica los valores para actualizar los gráficos y KPIs." : "Usa el botón 'Editar Datos' para ingresar tus propios números."} Los datos se guardan en tu navegador.
                </AlertDescription>
            </Alert>
            
            {/* --- Sección de KPIs Principales --- */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4 mb-6 sm:mb-8">
                <KpiCard title="Liquidez Corriente" value={kpis.liquidezCorriente.toFixed(2)} interpretation={kpis.liquidezInterp} icon={<Scale />} />
                <KpiCard title="Nivel de Endeudamiento" value={`${(kpis.endeudamiento * 100).toFixed(1)}%`} interpretation={kpis.endeudamientoInterp} icon={<Landmark />} />
                <KpiCard title="Margen de Utilidad Neta" value={`${(kpis.margenNeto * 100).toFixed(1)}%`} interpretation={kpis.margenInterp} icon={<Percent />} />
            </div>

            {/* --- Sección de Gráficos --- */}
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 sm:gap-8">
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.2 }} className="bg-card border rounded-lg p-3 sm:p-4">
                    <h3 className="text-base sm:text-lg font-semibold text-center mb-3 sm:mb-4">Evolución de Ventas Mensuales</h3>
                    {data.ventasMensuales.length > 0 ? (
                        <div className="w-full h-[250px] sm:h-[300px]">
                            <ResponsiveContainer>
                                <LineChart data={data.ventasMensuales} margin={{ top: 5, right: 10, left: -20, bottom: 5 }}>
                                    <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                                    <XAxis dataKey="month" fontSize={12} />
                                    <YAxis fontSize={12} />
                                    <Tooltip />
                                    <Legend />
                                    <Line type="monotone" dataKey="ventas" stroke="#8884d8" strokeWidth={2} activeDot={{ r: 6 }} />
                                </LineChart>
                            </ResponsiveContainer>
                        </div>
                    ) : (
                        <div className="h-[250px] sm:h-[300px] flex items-center justify-center text-muted-foreground">
                            <p className="text-sm text-center">No hay datos de ventas mensuales para mostrar</p>
                        </div>
                    )}
                </motion.div>

                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.4 }} className="bg-card border rounded-lg p-3 sm:p-4">
                    <h3 className="text-base sm:text-lg font-semibold text-center mb-3 sm:mb-4">Composición del Financiamiento</h3>
                    {(parseFloat(data.totalPasivo) > 0 || parseFloat(data.totalPatrimonio) > 0) ? (
                        <div className="w-full h-[250px] sm:h-[300px]">
                            <ResponsiveContainer>
                                <BarChart layout="vertical" data={[{ name: 'Financiamiento', pasivos: parseFloat(data.totalPasivo) || 0, patrimonio: parseFloat(data.totalPatrimonio) || 0 }]} margin={{ top: 5, right: 10, left: 10, bottom: 5 }}>
                                    <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                                    <XAxis type="number" fontSize={12} />
                                    <YAxis type="category" dataKey="name" hide />
                                    <Tooltip />
                                    <Legend />
                                    <Bar dataKey="pasivos" stackId="a" fill="#ef4444" name="Pasivos (Deuda)" />
                                    <Bar dataKey="patrimonio" stackId="a" fill="#3b82f6" name="Patrimonio (Propio)" />
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    ) : (
                        <div className="h-[250px] sm:h-[300px] flex items-center justify-center text-muted-foreground">
                            <p className="text-sm text-center">No hay datos financieros para mostrar</p>
                        </div>
                    )}
                </motion.div>
            </div>
        </ToolCard>
    );
}

// --- Componente de Campo de Entrada Reutilizable ---
const InputField = ({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) => (
    <div className="space-y-2">
        <Label htmlFor={label}>{label} (S/)</Label>
        <Input id={label} type="text" value={value} onChange={e => onChange(e.target.value)} placeholder="0.00" />
    </div>
);