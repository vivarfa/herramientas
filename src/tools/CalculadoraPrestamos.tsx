'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Calculator, TrendingUp, PieChart, Download } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, BarChart, Bar } from 'recharts';

interface LoanCalculation {
  monthlyPayment: number;
  totalInterest: number;
  totalAmount: number;
  amortizationSchedule: AmortizationRow[];
}

interface AmortizationRow {
  month: number;
  payment: number;
  principal: number;
  interest: number;
  balance: number;
}

interface ComparisonData {
  scenario: string;
  monthlyPayment: number;
  totalInterest: number;
  totalAmount: number;
}

export default function CalculadoraPrestamos() {
  const [loanAmount, setLoanAmount] = useState<string>('');
  const [interestRate, setInterestRate] = useState<string>('');
  const [loanTerm, setLoanTerm] = useState<string>('');
  const [loanType, setLoanType] = useState<string>('fixed');
  const [paymentFrequency, setPaymentFrequency] = useState<string>('monthly');
  const [extraPayment, setExtraPayment] = useState<string>('');
  
  const [calculation, setCalculation] = useState<LoanCalculation | null>(null);
  const [comparisons, setComparisons] = useState<ComparisonData[]>([]);
  const [activeTab, setActiveTab] = useState('calculator');

  const calculateLoan = () => {
    const principal = parseFloat(loanAmount);
    const annualRate = parseFloat(interestRate) / 100;
    const years = parseFloat(loanTerm);
    const extra = parseFloat(extraPayment) || 0;
    
    if (!principal || !annualRate || !years) return;

    const monthlyRate = annualRate / 12;
    const totalPayments = years * 12;
    
    // Cálculo de cuota mensual (fórmula estándar)
    const monthlyPayment = principal * 
      (monthlyRate * Math.pow(1 + monthlyRate, totalPayments)) / 
      (Math.pow(1 + monthlyRate, totalPayments) - 1);

    // Generar tabla de amortización
    const amortizationSchedule: AmortizationRow[] = [];
    let remainingBalance = principal;
    let totalInterestPaid = 0;
    let month = 1;

    while (remainingBalance > 0.01 && month <= totalPayments) {
      const interestPayment = remainingBalance * monthlyRate;
      let principalPayment = monthlyPayment - interestPayment + extra;
      
      if (principalPayment > remainingBalance) {
        principalPayment = remainingBalance;
      }
      
      remainingBalance -= principalPayment;
      totalInterestPaid += interestPayment;
      
      amortizationSchedule.push({
        month,
        payment: monthlyPayment + extra,
        principal: principalPayment,
        interest: interestPayment,
        balance: Math.max(0, remainingBalance)
      });
      
      month++;
    }

    setCalculation({
      monthlyPayment: monthlyPayment + extra,
      totalInterest: totalInterestPaid,
      totalAmount: principal + totalInterestPaid,
      amortizationSchedule
    });
  };

  const generateComparisons = () => {
    const principal = parseFloat(loanAmount);
    const baseRate = parseFloat(interestRate) / 100;
    const years = parseFloat(loanTerm);
    
    if (!principal || !baseRate || !years) return;

    const scenarios = [
      { name: 'Tasa Actual', rate: baseRate },
      { name: 'Tasa -1%', rate: baseRate - 0.01 },
      { name: 'Tasa +1%', rate: baseRate + 0.01 },
      { name: '15 años', rate: baseRate, term: 15 },
      { name: '25 años', rate: baseRate, term: 25 }
    ];

    const newComparisons: ComparisonData[] = scenarios.map(scenario => {
      const monthlyRate = scenario.rate / 12;
      const totalPayments = (scenario.term || years) * 12;
      
      const monthlyPayment = principal * 
        (monthlyRate * Math.pow(1 + monthlyRate, totalPayments)) / 
        (Math.pow(1 + monthlyRate, totalPayments) - 1);
      
      const totalAmount = monthlyPayment * totalPayments;
      const totalInterest = totalAmount - principal;
      
      return {
        scenario: scenario.name,
        monthlyPayment,
        totalInterest,
        totalAmount
      };
    });

    setComparisons(newComparisons);
  };

  const exportToCSV = () => {
    if (!calculation) return;
    
    const csvContent = [
      ['Mes', 'Cuota', 'Capital', 'Interés', 'Saldo'],
      ...calculation.amortizationSchedule.map(row => [
        row.month.toString(),
        row.payment.toFixed(2),
        row.principal.toFixed(2),
        row.interest.toFixed(2),
        row.balance.toFixed(2)
      ])
    ].map(row => row.join(',')).join('\n');
    
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'tabla_amortizacion.csv';
    a.click();
    window.URL.revokeObjectURL(url);
  };

  useEffect(() => {
    calculateLoan();
  }, [loanAmount, interestRate, loanTerm, extraPayment]);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('es-PE', {
      style: 'currency',
      currency: 'PEN'
    }).format(amount);
  };

  const chartData = calculation?.amortizationSchedule.slice(0, 60).map(row => ({
    mes: row.month,
    capital: row.principal,
    interes: row.interest,
    saldo: row.balance
  })) || [];

  return (
    <div className="space-y-4 sm:space-y-6 p-2 sm:p-4">
      <div className="flex items-center gap-2 mb-4 sm:mb-6">
        <Calculator className="h-5 w-5 sm:h-6 sm:w-6 text-blue-600" />
        <h1 className="text-xl sm:text-2xl font-bold">Calculadora de Préstamos Profesional</h1>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-2 sm:grid-cols-4 mb-4 sm:mb-6">
          <TabsTrigger value="calculator" className="text-xs sm:text-sm py-2 sm:py-3">Calculadora</TabsTrigger>
          <TabsTrigger value="amortization" className="text-xs sm:text-sm py-2 sm:py-3">Amortización</TabsTrigger>
          <TabsTrigger value="comparison" className="text-xs sm:text-sm py-2 sm:py-3">Comparación</TabsTrigger>
          <TabsTrigger value="charts" className="text-xs sm:text-sm py-2 sm:py-3">Gráficos</TabsTrigger>
        </TabsList>

        <TabsContent value="calculator" className="space-y-4 sm:space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
            <Card>
              <CardHeader className="pb-3 sm:pb-6">
                <CardTitle className="text-lg sm:text-xl">Datos del Préstamo</CardTitle>
                <CardDescription className="text-sm sm:text-base">Ingrese los detalles de su préstamo</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4 sm:space-y-6 pt-0">
                <div className="space-y-3">
                  <Label htmlFor="loanAmount" className="text-sm sm:text-base font-medium">Monto del Préstamo (S/)</Label>
                  <Input
                    id="loanAmount"
                    type="number"
                    value={loanAmount}
                    onChange={(e) => setLoanAmount(e.target.value)}
                    placeholder="100,000"
                    className="h-10 sm:h-12 text-base"
                  />
                </div>
                
                <div className="space-y-3">
                  <Label htmlFor="interestRate" className="text-sm sm:text-base font-medium">Tasa de Interés Anual (%)</Label>
                  <Input
                    id="interestRate"
                    type="number"
                    step="0.1"
                    value={interestRate}
                    onChange={(e) => setInterestRate(e.target.value)}
                    placeholder="8.5"
                    className="h-10 sm:h-12 text-base"
                  />
                </div>
                
                <div className="space-y-3">
                  <Label htmlFor="loanTerm" className="text-sm sm:text-base font-medium">Plazo (años)</Label>
                  <Input
                    id="loanTerm"
                    type="number"
                    value={loanTerm}
                    onChange={(e) => setLoanTerm(e.target.value)}
                    placeholder="20"
                    className="h-10 sm:h-12 text-base"
                  />
                </div>
                
                <div className="space-y-3">
                  <Label htmlFor="loanType" className="text-sm sm:text-base font-medium">Tipo de Préstamo</Label>
                  <Select value={loanType} onValueChange={setLoanType}>
                    <SelectTrigger className="h-10 sm:h-12 text-base">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="fixed">Tasa Fija</SelectItem>
                      <SelectItem value="variable">Tasa Variable</SelectItem>
                      <SelectItem value="mortgage">Hipotecario</SelectItem>
                      <SelectItem value="personal">Personal</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="space-y-3">
                  <Label htmlFor="extraPayment" className="text-sm sm:text-base font-medium">Pago Extra Mensual (S/)</Label>
                  <Input
                    id="extraPayment"
                    type="number"
                    value={extraPayment}
                    onChange={(e) => setExtraPayment(e.target.value)}
                    placeholder="0"
                    className="h-10 sm:h-12 text-base"
                  />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3 sm:pb-6">
                <CardTitle className="text-lg sm:text-xl">Resultados del Cálculo</CardTitle>
                <CardDescription className="text-sm sm:text-base">Resumen de su préstamo</CardDescription>
              </CardHeader>
              <CardContent className="pt-0">
                {calculation ? (
                  <div className="space-y-4 sm:space-y-6">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
                      <div className="text-center p-4 sm:p-6 bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800/50 rounded-lg">
                        <div className="text-xl sm:text-2xl font-bold text-blue-600 dark:text-blue-400 mb-2">
                          {formatCurrency(calculation.monthlyPayment)}
                        </div>
                        <div className="text-sm sm:text-base text-gray-600 dark:text-gray-400">Cuota Mensual</div>
                      </div>
                      
                      <div className="text-center p-4 sm:p-6 bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-800/50 rounded-lg">
                        <div className="text-xl sm:text-2xl font-bold text-green-600 dark:text-green-400 mb-2">
                          {formatCurrency(calculation.totalInterest)}
                        </div>
                        <div className="text-sm sm:text-base text-gray-600 dark:text-gray-400">Total Intereses</div>
                      </div>
                    </div>
                    
                    <div className="text-center p-4 sm:p-6 bg-purple-50 dark:bg-purple-950/30 border border-purple-200 dark:border-purple-800/50 rounded-lg">
                      <div className="text-2xl sm:text-3xl font-bold text-purple-600 dark:text-purple-400 mb-2">
                        {formatCurrency(calculation.totalAmount)}
                      </div>
                      <div className="text-sm sm:text-base text-gray-600 dark:text-gray-400">Monto Total a Pagar</div>
                    </div>
                    
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6 text-sm sm:text-base bg-gray-50 dark:bg-gray-900/50 p-4 rounded-lg">
                      <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2">
                        <span className="font-medium">Plazo efectivo:</span>
                        <span className="text-blue-600 dark:text-blue-400">{calculation.amortizationSchedule.length} meses</span>
                      </div>
                      <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2">
                        <span className="font-medium">Ahorro con pago extra:</span>
                        <span className="text-green-600 dark:text-green-400">
                          {extraPayment !== '0' ? `${(parseFloat(loanTerm) * 12 - calculation.amortizationSchedule.length)} meses` : 'N/A'}
                        </span>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="text-center text-gray-500 py-12">
                    <Calculator className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                    <p>Complete los datos para ver los resultados</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="amortization" className="space-y-4 sm:space-y-6">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 p-1">
            <h3 className="text-lg sm:text-xl font-semibold">Tabla de Amortización</h3>
            <Button onClick={exportToCSV} variant="outline" size="sm" className="w-full sm:w-auto h-10 sm:h-12">
              <Download className="h-4 w-4 mr-2" />
              Exportar CSV
            </Button>
          </div>
          
          {calculation && (
            <Card className="border rounded-lg">
              <CardContent className="p-0">
                <div className="max-h-96 overflow-auto rounded-lg">
                  <table className="w-full text-xs sm:text-sm">
                    <thead className="bg-muted/50 dark:bg-muted/20 sticky top-0 border-b border-border">
                      <tr>
                        <th className="p-3 sm:p-4 text-left font-semibold">Mes</th>
                        <th className="p-3 sm:p-4 text-right font-semibold hidden sm:table-cell">Cuota</th>
                        <th className="p-3 sm:p-4 text-right font-semibold">Capital</th>
                        <th className="p-3 sm:p-4 text-right font-semibold">Interés</th>
                        <th className="p-3 sm:p-4 text-right font-semibold">Saldo</th>
                      </tr>
                    </thead>
                    <tbody>
                      {calculation.amortizationSchedule.map((row, index) => (
                        <tr key={index} className={index % 2 === 0 ? 'bg-muted/30 dark:bg-muted/10' : 'bg-background hover:bg-muted/20 dark:hover:bg-muted/10 transition-colors'}>
                          <td className="p-3 sm:p-4 border-b border-border/50 font-medium">{row.month}</td>
                          <td className="p-3 sm:p-4 text-right border-b border-border/50 hidden sm:table-cell">{formatCurrency(row.payment)}</td>
                          <td className="p-3 sm:p-4 text-right border-b border-border/50">{formatCurrency(row.principal)}</td>
                          <td className="p-3 sm:p-4 text-right border-b border-border/50">{formatCurrency(row.interest)}</td>
                          <td className="p-3 sm:p-4 text-right border-b border-border/50 font-medium">{formatCurrency(row.balance)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="comparison" className="space-y-3 sm:space-y-4">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
            <h3 className="text-base sm:text-lg font-semibold">Comparación de Escenarios</h3>
            <Button onClick={generateComparisons} variant="outline" className="w-full sm:w-auto">
              <TrendingUp className="h-4 w-4 mr-2" />
              Generar Comparación
            </Button>
          </div>
          
          {comparisons.length > 0 && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
              {comparisons.map((comparison, index) => (
                <Card key={index} className="border rounded-lg">
                  <CardHeader className="pb-3 sm:pb-4">
                    <CardTitle className="text-base sm:text-lg text-center">{comparison.scenario}</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3 sm:space-y-4 pt-0">
                    <div className="text-center p-3 bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800/50 rounded-lg">
                      <div className="text-xs sm:text-sm text-gray-600 dark:text-gray-400 mb-1">Cuota Mensual</div>
                      <div className="font-bold text-blue-600 dark:text-blue-400">{formatCurrency(comparison.monthlyPayment)}</div>
                    </div>
                    <div className="text-center p-3 bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-800/50 rounded-lg">
                      <div className="text-xs sm:text-sm text-gray-600 dark:text-gray-400 mb-1">Total Intereses</div>
                      <div className="font-bold text-green-600 dark:text-green-400">{formatCurrency(comparison.totalInterest)}</div>
                    </div>
                    <div className="text-center p-3 bg-purple-50 dark:bg-purple-950/30 border border-purple-200 dark:border-purple-800/50 rounded-lg">
                      <div className="text-xs sm:text-sm text-gray-600 dark:text-gray-400 mb-1">Monto Total</div>
                      <div className="font-bold text-purple-600 dark:text-purple-400">{formatCurrency(comparison.totalAmount)}</div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="charts" className="space-y-3 sm:space-y-4">
          {calculation ? (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 sm:gap-4">
              <Card className="bg-card border rounded-lg">
                <CardHeader className="p-3 sm:p-4">
                  <CardTitle className="text-base sm:text-lg">Evolución del Saldo</CardTitle>
                  <CardDescription className="text-xs sm:text-sm">Progreso del pago del préstamo a lo largo del tiempo</CardDescription>
                </CardHeader>
                <CardContent className="p-3 sm:p-4">
                  <div className="h-[250px] sm:h-[300px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={chartData} margin={{ top: 5, right: 5, left: 5, bottom: 5 }}>
                        <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                        <XAxis dataKey="mes" fontSize={12} />
                        <YAxis fontSize={12} />
                        <Tooltip formatter={(value) => formatCurrency(Number(value))} />
                        <Legend />
                        <Line type="monotone" dataKey="saldo" stroke="#8884d8" strokeWidth={2} name="Saldo Pendiente" activeDot={{ r: 4 }} />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>
              
              <Card className="bg-card border rounded-lg">
                <CardHeader className="p-3 sm:p-4">
                  <CardTitle className="text-base sm:text-lg">Composición de Pagos</CardTitle>
                  <CardDescription className="text-xs sm:text-sm">Distribución entre capital e intereses por mes</CardDescription>
                </CardHeader>
                <CardContent className="p-3 sm:p-4">
                  <div className="h-[250px] sm:h-[300px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={chartData} margin={{ top: 5, right: 5, left: 5, bottom: 5 }}>
                        <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                        <XAxis dataKey="mes" fontSize={12} />
                        <YAxis fontSize={12} />
                        <Tooltip formatter={(value) => formatCurrency(Number(value))} />
                        <Legend />
                        <Bar dataKey="capital" stackId="a" fill="#82ca9d" name="Capital" />
                        <Bar dataKey="interes" stackId="a" fill="#8884d8" name="Interés" />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>
            </div>
          ) : (
            <Card className="bg-card border rounded-lg">
              <CardContent className="p-6 text-center">
                <PieChart className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                <p className="text-muted-foreground">Ingresa los datos del préstamo para ver los gráficos</p>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}