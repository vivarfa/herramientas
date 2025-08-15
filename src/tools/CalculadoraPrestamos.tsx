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
  const [loanAmount, setLoanAmount] = useState<string>('100000');
  const [interestRate, setInterestRate] = useState<string>('8.5');
  const [loanTerm, setLoanTerm] = useState<string>('20');
  const [loanType, setLoanType] = useState<string>('fixed');
  const [paymentFrequency, setPaymentFrequency] = useState<string>('monthly');
  const [extraPayment, setExtraPayment] = useState<string>('0');
  
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
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <Calculator className="h-6 w-6 text-blue-600" />
        <h1 className="text-2xl font-bold">Calculadora de Préstamos Profesional</h1>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="calculator">Calculadora</TabsTrigger>
          <TabsTrigger value="amortization">Amortización</TabsTrigger>
          <TabsTrigger value="comparison">Comparación</TabsTrigger>
          <TabsTrigger value="charts">Gráficos</TabsTrigger>
        </TabsList>

        <TabsContent value="calculator" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Datos del Préstamo</CardTitle>
                <CardDescription>Ingrese los detalles de su préstamo</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="loanAmount">Monto del Préstamo (S/)</Label>
                  <Input
                    id="loanAmount"
                    type="number"
                    value={loanAmount}
                    onChange={(e) => setLoanAmount(e.target.value)}
                    placeholder="100,000"
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="interestRate">Tasa de Interés Anual (%)</Label>
                  <Input
                    id="interestRate"
                    type="number"
                    step="0.1"
                    value={interestRate}
                    onChange={(e) => setInterestRate(e.target.value)}
                    placeholder="8.5"
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="loanTerm">Plazo (años)</Label>
                  <Input
                    id="loanTerm"
                    type="number"
                    value={loanTerm}
                    onChange={(e) => setLoanTerm(e.target.value)}
                    placeholder="20"
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="loanType">Tipo de Préstamo</Label>
                  <Select value={loanType} onValueChange={setLoanType}>
                    <SelectTrigger>
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
                
                <div className="space-y-2">
                  <Label htmlFor="extraPayment">Pago Extra Mensual (S/)</Label>
                  <Input
                    id="extraPayment"
                    type="number"
                    value={extraPayment}
                    onChange={(e) => setExtraPayment(e.target.value)}
                    placeholder="0"
                  />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Resultados del Cálculo</CardTitle>
                <CardDescription>Resumen de su préstamo</CardDescription>
              </CardHeader>
              <CardContent>
                {calculation ? (
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="text-center p-4 bg-blue-50 rounded-lg">
                        <div className="text-2xl font-bold text-blue-600">
                          {formatCurrency(calculation.monthlyPayment)}
                        </div>
                        <div className="text-sm text-gray-600">Cuota Mensual</div>
                      </div>
                      
                      <div className="text-center p-4 bg-green-50 rounded-lg">
                        <div className="text-2xl font-bold text-green-600">
                          {formatCurrency(calculation.totalInterest)}
                        </div>
                        <div className="text-sm text-gray-600">Total Intereses</div>
                      </div>
                    </div>
                    
                    <div className="text-center p-4 bg-purple-50 rounded-lg">
                      <div className="text-3xl font-bold text-purple-600">
                        {formatCurrency(calculation.totalAmount)}
                      </div>
                      <div className="text-sm text-gray-600">Monto Total a Pagar</div>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <span className="font-medium">Plazo efectivo:</span>
                        <span className="ml-2">{calculation.amortizationSchedule.length} meses</span>
                      </div>
                      <div>
                        <span className="font-medium">Ahorro con pago extra:</span>
                        <span className="ml-2 text-green-600">
                          {extraPayment !== '0' ? `${(parseFloat(loanTerm) * 12 - calculation.amortizationSchedule.length)} meses` : 'N/A'}
                        </span>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="text-center text-gray-500 py-8">
                    Complete los datos para ver los resultados
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="amortization" className="space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-semibold">Tabla de Amortización</h3>
            <Button onClick={exportToCSV} variant="outline" size="sm">
              <Download className="h-4 w-4 mr-2" />
              Exportar CSV
            </Button>
          </div>
          
          {calculation && (
            <Card>
              <CardContent className="p-0">
                <div className="max-h-96 overflow-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50 sticky top-0">
                      <tr>
                        <th className="p-3 text-left">Mes</th>
                        <th className="p-3 text-right">Cuota</th>
                        <th className="p-3 text-right">Capital</th>
                        <th className="p-3 text-right">Interés</th>
                        <th className="p-3 text-right">Saldo</th>
                      </tr>
                    </thead>
                    <tbody>
                      {calculation.amortizationSchedule.map((row, index) => (
                        <tr key={index} className={index % 2 === 0 ? 'bg-gray-50' : 'bg-white'}>
                          <td className="p-3">{row.month}</td>
                          <td className="p-3 text-right">{formatCurrency(row.payment)}</td>
                          <td className="p-3 text-right">{formatCurrency(row.principal)}</td>
                          <td className="p-3 text-right">{formatCurrency(row.interest)}</td>
                          <td className="p-3 text-right">{formatCurrency(row.balance)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="comparison" className="space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-semibold">Comparación de Escenarios</h3>
            <Button onClick={generateComparisons} variant="outline">
              <TrendingUp className="h-4 w-4 mr-2" />
              Generar Comparación
            </Button>
          </div>
          
          {comparisons.length > 0 && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {comparisons.map((comparison, index) => (
                <Card key={index}>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base">{comparison.scenario}</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    <div>
                      <div className="text-sm text-gray-600">Cuota Mensual</div>
                      <div className="font-semibold">{formatCurrency(comparison.monthlyPayment)}</div>
                    </div>
                    <div>
                      <div className="text-sm text-gray-600">Total Intereses</div>
                      <div className="font-semibold">{formatCurrency(comparison.totalInterest)}</div>
                    </div>
                    <div>
                      <div className="text-sm text-gray-600">Monto Total</div>
                      <div className="font-semibold">{formatCurrency(comparison.totalAmount)}</div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="charts" className="space-y-6">
          {calculation && (
            <>
              <Card>
                <CardHeader>
                  <CardTitle>Evolución del Saldo</CardTitle>
                  <CardDescription>Progreso del pago del préstamo en el tiempo</CardDescription>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <LineChart data={chartData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="mes" />
                      <YAxis />
                      <Tooltip formatter={(value) => formatCurrency(Number(value))} />
                      <Legend />
                      <Line type="monotone" dataKey="saldo" stroke="#8884d8" name="Saldo Pendiente" />
                    </LineChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader>
                  <CardTitle>Composición de Pagos</CardTitle>
                  <CardDescription>Distribución entre capital e intereses por mes</CardDescription>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={chartData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="mes" />
                      <YAxis />
                      <Tooltip formatter={(value) => formatCurrency(Number(value))} />
                      <Legend />
                      <Bar dataKey="capital" stackId="a" fill="#82ca9d" name="Capital" />
                      <Bar dataKey="interes" stackId="a" fill="#8884d8" name="Interés" />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}