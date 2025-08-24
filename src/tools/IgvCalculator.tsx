
"use client"

import React, { useState, useEffect, useCallback, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { Copy, ClipboardPaste } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import { copyToClipboard } from '@/lib/utils'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Switch } from '@/components/ui/switch'

type ActiveField = 'total' | 'igv';
type CalculationMode = 'with_igv' | 'without_igv';

export function IgvCalculator() {
  const { toast } = useToast();
  
  const [totalStr, setTotalStr] = useState("");
  const [igvRateStr, setIgvRateStr] = useState("18");
  const [igvAmountStr, setIgvAmountStr] = useState("");
  const [unitsStr, setUnitsStr] = useState("");
  const [decimals, setDecimals] = useState("4");
  const [activeField, setActiveField] = useState<ActiveField>('total');
  const [calculationMode, setCalculationMode] = useState<CalculationMode>('with_igv');

  const performCalculation = useCallback(() => {
    const total = parseFloat(totalStr) || 0;
    const igvRate = (parseFloat(igvRateStr) || 0) / 100;
    const igvAmount = parseFloat(igvAmountStr) || 0;

    let newBase = 0;
    let newIgv = 0;
    let newTotal = 0;

    if (calculationMode === 'with_igv') {
      if (activeField === 'total') {
        newTotal = total;
        newBase = igvRate > -1 ? newTotal / (1 + igvRate) : 0;
        newIgv = newTotal - newBase;
        if (igvAmountStr !== newIgv.toFixed(2)) {
           setIgvAmountStr(newIgv.toFixed(2));
        }
      } else { // activeField === 'igv'
        newIgv = igvAmount;
        newBase = igvRate > 0 ? newIgv / igvRate : 0;
        newTotal = newBase + newIgv;
        if (totalStr !== newTotal.toFixed(2)) {
            setTotalStr(newTotal.toFixed(2));
        }
      }
    } else { // calculationMode === 'without_igv'
      if (activeField === 'total') {
        newBase = total;
        newIgv = newBase * igvRate;
        newTotal = newBase + newIgv;
        if (igvAmountStr !== newIgv.toFixed(2)) {
           setIgvAmountStr(newIgv.toFixed(2));
        }
      } else { // activeField === 'igv'
        newIgv = igvAmount;
        newBase = igvRate > 0 ? newIgv / igvRate : 0;
        newTotal = newBase + newIgv;
        if (totalStr !== newTotal.toFixed(2)) {
            setTotalStr(newTotal.toFixed(2));
        }
      }
    }
  }, [totalStr, igvRateStr, igvAmountStr, activeField, calculationMode, setIgvAmountStr, setTotalStr]);


  useEffect(() => {
    performCalculation();
  }, [performCalculation]);
  
  const { base, igv, total, units, unitPrice } = useMemo(() => {
    const totalVal = parseFloat(totalStr) || 0;
    const igvRateVal = (parseFloat(igvRateStr) || 0) / 100;
    const unitsVal = parseInt(unitsStr, 10) || 0;
    const igvAmountVal = parseFloat(igvAmountStr) || 0;

    let baseVal = 0;
    let igvVal = 0;
    let finalTotal = 0;

    if (calculationMode === 'with_igv') {
      if (activeField === 'total') {
        finalTotal = totalVal;
        baseVal = igvRateVal > 0 ? finalTotal / (1 + igvRateVal) : finalTotal;
        igvVal = finalTotal - baseVal;
      } else {
        igvVal = igvAmountVal;
        baseVal = igvRateVal > 0 ? igvVal / igvRateVal : 0;
        finalTotal = baseVal + igvVal;
      }
    } else { // without_igv
      if (activeField === 'total') {
        baseVal = totalVal;
        igvVal = baseVal * igvRateVal;
        finalTotal = baseVal + igvVal;
      } else {
        igvVal = igvAmountVal;
        baseVal = igvRateVal > 0 ? igvVal / igvRateVal : 0;
        finalTotal = baseVal + igvVal;
      }
    }
    
    const unitPriceVal = unitsVal > 0 ? baseVal / unitsVal : 0;

    return {
      base: baseVal,
      igv: igvVal,
      total: finalTotal,
      units: unitsVal,
      unitPrice: unitPriceVal,
    }
  }, [totalStr, igvRateStr, unitsStr, igvAmountStr, calculationMode, activeField]);

  const handleCopy = (text: string, fieldName: string) => {
    copyToClipboard(text, () => {
      toast({
        title: "Copiado",
        description: `${fieldName} copiado al portapapeles.`
      })
    })
  }

  const handleCopyAll = () => {
    const dec = parseInt(decimals, 10);
    const textToCopy = `
Base Imponible: ${base.toFixed(dec)}
IGV (${igvRateStr}%): ${igv.toFixed(dec)}
Total con IGV: ${total.toFixed(dec)}
Unidades: ${units}
Precio Unitario: ${unitPrice.toFixed(dec)}
    `.trim();
    handleCopy(textToCopy, "Todos los resultados");
  }
  
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="h-full"
    >
      <Card className="flex flex-col h-full">
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.1 }}
        >
          <CardHeader>
            <CardTitle>Calculadora de IGV</CardTitle>
          </CardHeader>
        </motion.div>
        <CardContent className="space-y-4 flex-grow">
        
        {/* Modo de Cálculo */}
        <motion.div 
          className="space-y-3 p-4 bg-muted/30 rounded-lg border"
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.15 }}
        >
          <div className="flex items-center justify-between">
            <Label className="text-sm font-medium">Modo de Cálculo:</Label>
            <div className="flex items-center space-x-3">
              <Label htmlFor="calculation-mode" className={`text-sm transition-colors ${
                calculationMode === 'with_igv' ? 'text-primary font-medium' : 'text-muted-foreground'
              }`}>
                Con IGV
              </Label>
              <Switch
                id="calculation-mode"
                checked={calculationMode === 'without_igv'}
                onCheckedChange={(checked) => setCalculationMode(checked ? 'without_igv' : 'with_igv')}
              />
              <Label htmlFor="calculation-mode" className={`text-sm transition-colors ${
                calculationMode === 'without_igv' ? 'text-primary font-medium' : 'text-muted-foreground'
              }`}>
                Sin IGV
              </Label>
            </div>
          </div>
          <motion.p 
            className="text-xs text-muted-foreground"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.3, delay: 0.3 }}
          >
            {calculationMode === 'with_igv' 
              ? 'Ingresa el monto que ya incluye IGV para calcular la base imponible'
              : 'Ingresa el monto base (sin IGV) para calcular el total con IGV'
            }
          </motion.p>
        </motion.div>

        <motion.div 
          className="space-y-2"
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.3, delay: 0.2 }}
        >
            <Label htmlFor="montoPrincipal">
              {calculationMode === 'with_igv' ? 'Monto Total con IGV (S/)' : 'Monto Base sin IGV (S/)'}
            </Label>
            <motion.div
              whileFocus={{ scale: 1.02 }}
              transition={{ type: "spring", stiffness: 300 }}
            >
              <Input id="montoPrincipal" type="number" value={totalStr} 
                onChange={(e) => setTotalStr(e.target.value)} 
                onFocus={() => setActiveField('total')}
                placeholder="Ej: 1180.00"
                className={`transition-all duration-200 ${activeField === 'total' ? 'ring-2 ring-primary/50' : ''}`}
              />
            </motion.div>
        </motion.div>
        
        <motion.div 
          className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.3 }}
        >
            <motion.div 
              className="space-y-2"
              whileHover={{ scale: 1.01 }}
              transition={{ type: "spring", stiffness: 300 }}
            >
                <Label htmlFor="igvPercent">% IGV:</Label>
                <Input id="igvPercent" type="number" value={igvRateStr} 
                  onChange={(e) => {
                    setIgvRateStr(e.target.value);
                    setActiveField('total');
                  }}
                  placeholder="18"
                  className="transition-all duration-200"
                />
            </motion.div>
            <motion.div 
              className="space-y-2"
              whileHover={{ scale: 1.01 }}
              transition={{ type: "spring", stiffness: 300 }}
            >
                <Label htmlFor="montoIgv">Monto IGV (S/):</Label>
                <Input id="montoIgv" type="number" value={igvAmountStr}
                  onChange={(e) => setIgvAmountStr(e.target.value)}
                  onFocus={() => setActiveField('igv')}
                  placeholder="Ej: 180.00"
                  className={`transition-all duration-200 ${activeField === 'igv' ? 'ring-2 ring-primary/50' : ''}`}
                />
            </motion.div>
        </motion.div>

        <motion.div 
          className="space-y-2"
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.3, delay: 0.4 }}
        >
            <Label htmlFor="cantidad">Cantidad de Unidades (opcional):</Label>
            <motion.div
              whileHover={{ scale: 1.01 }}
              transition={{ type: "spring", stiffness: 300 }}
            >
              <Input id="cantidad" type="number" value={unitsStr} onChange={e => setUnitsStr(e.target.value)} placeholder="0" className="transition-all duration-200" />
            </motion.div>
        </motion.div>

        {/* Results Box */}
        <motion.div 
          className="bg-muted/50 p-4 rounded-lg space-y-3"
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.4, delay: 0.5 }}
        >
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: 0.6 }}
          >
            <ResultRow label="Base Imponible:" value={base} decimals={decimals} onCopy={handleCopy} />
          </motion.div>
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: 0.7 }}
          >
            <ResultRow label={`IGV (${igvRateStr}%):`} value={igv} decimals={decimals} onCopy={handleCopy} />
          </motion.div>
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: 0.8 }}
          >
            <ResultRow label="Total con IGV:" value={total} decimals={decimals} onCopy={handleCopy} />
          </motion.div>
          <AnimatePresence>
            {units > 0 && (
              <motion.div
                initial={{ opacity: 0, height: 0, y: -10 }}
                animate={{ opacity: 1, height: "auto", y: 0 }}
                exit={{ opacity: 0, height: 0, y: -10 }}
                transition={{ duration: 0.3 }}
              >
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3, delay: 0.1 }}
                >
                  <ResultRow label="Unidades:" value={units} decimals={"0"} onCopy={handleCopy} />
                </motion.div>
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3, delay: 0.2 }}
                >
                  <ResultRow label="Precio Unitario:" value={unitPrice} decimals={decimals} onCopy={handleCopy} />
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>

        {/* Bottom Controls */}
        <motion.div 
          className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-4 pt-2"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.9 }}
        >
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 sm:gap-4">
            <Label className="text-sm">Decimales:</Label>
            <RadioGroup value={decimals} onValueChange={setDecimals} className="flex flex-wrap gap-2">
              <motion.div 
                className="flex items-center space-x-1"
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                <RadioGroupItem value="2" id="d2"/><Label htmlFor="d2">2</Label>
              </motion.div>
              <motion.div 
                className="flex items-center space-x-1"
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                <RadioGroupItem value="4" id="d4"/><Label htmlFor="d4">4</Label>
              </motion.div>
              <motion.div 
                className="flex items-center space-x-1"
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                <RadioGroupItem value="6" id="d6"/><Label htmlFor="d6">6</Label>
              </motion.div>
              <motion.div 
                className="flex items-center space-x-1"
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                <RadioGroupItem value="8" id="d8"/><Label htmlFor="d8">8</Label>
              </motion.div>
            </RadioGroup>
          </div>
          <motion.div
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            transition={{ type: "spring", stiffness: 300 }}
            className="w-full sm:w-auto"
          >
            <Button onClick={handleCopyAll} className="w-full sm:w-auto text-sm px-3 py-2">Copiar Todo</Button>
          </motion.div>
        </motion.div>
        </CardContent>
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.3, delay: 1.0 }}
        >
          <CardFooter>
            <motion.p 
              className="text-xs text-muted-foreground w-full text-center"
              whileHover={{ scale: 1.02 }}
              transition={{ type: "spring", stiffness: 300 }}
            >
            </motion.p>
          </CardFooter>
        </motion.div>
      </Card>
    </motion.div>
  )
}

interface ResultRowProps {
  label: string;
  value: number;
  decimals: string;
  onCopy: (textToCopy: string, label: string) => void;
}

const ResultRow = ({ label, value, decimals, onCopy }: ResultRowProps) => {
  const formattedValue = value.toFixed(parseInt(decimals, 10));
  return (
    <motion.div 
      className="flex items-center justify-between"
      whileHover={{ backgroundColor: "hsl(var(--muted) / 0.3)", scale: 1.01 }}
      transition={{ duration: 0.2 }}
    >
      <span className="text-sm text-muted-foreground">{label}</span>
      <div className="flex items-center gap-2">
        <motion.span 
          className="font-mono font-semibold text-lg text-foreground"
          whileHover={{ scale: 1.05 }}
          transition={{ type: "spring", stiffness: 300 }}
        >
          {formattedValue}
        </motion.span>
        <motion.div
          whileHover={{ scale: 1.1, rotate: 5 }}
          whileTap={{ scale: 0.9 }}
          transition={{ type: "spring", stiffness: 300 }}
        >
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => onCopy(formattedValue, label)}>
            <ClipboardPaste className="h-4 w-4" />
          </Button>
        </motion.div>
      </div>
    </motion.div>
  );
}
