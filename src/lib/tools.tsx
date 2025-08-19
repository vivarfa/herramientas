"use client";

import React from 'react';
import { 
    Home, Percent, Briefcase, Calculator, Gift, Landmark, CalendarClock, AreaChart, 
    BookCopy, Search, Plane, ShieldAlert, Clock, SpellCheck, Link, Wallet, 
    FileText, TrendingUp, Scale, DollarSign
} from 'lucide-react';
import { Dashboard } from '@/tools/Dashboard';
import { IgvCalculator } from '@/tools/IgvCalculator';
import { ConsultaRucDni } from '@/tools/ConsultaRucDni';
import { AsientosContables } from '@/tools/AsientosContables';
import { DetraccionesCalculator } from '@/tools/DetraccionesCalculator';
import { GratificacionesCalculator } from '@/tools/GratificacionesCalculator';
import { CtsCalculator } from '@/tools/CtsCalculator';
import { VencimientosCronograma } from '@/tools/VencimientosCronograma';
import { RentaSimulator } from '@/tools/RentaSimulator';
import { VacacionesCalculator } from '@/tools/VacacionesCalculator';
import { RegimenesSimulator } from '@/tools/RegimenesSimulator';
import { MultasSimulator } from '@/tools/MultasSimulator';
import { InteresesMoratoriosCalculator } from '@/tools/InteresesMoratoriosCalculator';
import { LiquidacionBeneficiosCalculator } from '@/tools/LiquidacionBeneficiosCalculator';
import { NumeroALetrasConverter } from '@/tools/NumeroALetrasConverter';
import { AccesosRapidos } from '@/tools/AccesosRapidos';
import { DashboardFinanciero } from '@/tools/DashboardFinanciero';
import CalculadoraPrestamos from '@/tools/CalculadoraPrestamos';

export interface Tool {
  id: string;
  name: string;
  icon: React.ReactNode;
  component: React.ComponentType<any>;
}

export const tools: Tool[] = [
  { id: 'dashboard', name: 'Dashboard', icon: <Home className="w-4 h-4" />, component: Dashboard },
  { id: 'igv', name: 'Calculadora IGV', icon: <Percent className="w-4 h-4" />, component: IgvCalculator },
  { id: 'consulta', name: 'Consulta RUC/DNI', icon: <Search className="w-4 h-4" />, component: ConsultaRucDni },
  { id: 'asientos', name: 'Asientos Contables', icon: <BookCopy className="w-4 h-4" />, component: AsientosContables },
  { id: 'detracciones', name: 'Detracciones', icon: <Wallet className="w-4 h-4" />, component: DetraccionesCalculator },
  { id: 'gratificaciones', name: 'Gratificaciones', icon: <Gift className="w-4 h-4" />, component: GratificacionesCalculator },
  { id: 'cts', name: 'CTS', icon: <Landmark className="w-4 h-4" />, component: CtsCalculator },
  { id: 'vencimientos', name: 'Vencimientos', icon: <CalendarClock className="w-4 h-4" />, component: VencimientosCronograma },
  { id: 'renta', name: 'Simulador Renta', icon: <AreaChart className="w-4 h-4" />, component: RentaSimulator },
  { id: 'vacaciones', name: 'Vacaciones Truncas', icon: <Plane className="w-4 h-4" />, component: VacacionesCalculator },
  { id: 'regimenes', name: 'Regímenes', icon: <Briefcase className="w-4 h-4" />, component: RegimenesSimulator },
  { id: 'multas', name: 'Multas', icon: <ShieldAlert className="w-4 h-4" />, component: MultasSimulator },
  { id: 'intereses', name: 'Intereses', icon: <Clock className="w-4 h-4" />, component: InteresesMoratoriosCalculator },
  { id: 'liquidacion', name: 'Liquidación', icon: <Calculator className="w-4 h-4" />, component: LiquidacionBeneficiosCalculator },
  { id: 'conversor', name: 'Nº a Letras', icon: <SpellCheck className="w-4 h-4" />, component: NumeroALetrasConverter },
  { id: 'accesos', name: 'Accesos Rápidos', icon: <Link className="w-4 h-4" />, component: AccesosRapidos },
  { id: 'dashboard-financiero', name: 'Ratios Financieros', icon: <TrendingUp className="w-4 h-4" />, component: DashboardFinanciero },
  { id: 'calculadora-prestamos', name: 'Calculadora de Préstamos', icon: <DollarSign className="w-4 h-4" />, component: CalculadoraPrestamos },
];
