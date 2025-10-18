"use client"

import React, { useEffect, useMemo, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useLocalStorage } from "@/hooks/use-local-storage";
import { Calculator } from "lucide-react";

function sanitize(expr: string): string {
  return expr
    .replace(/×/g, "*")
    .replace(/÷/g, "/")
    .replace(/−/g, "-")
    .replace(/\s+/g, "");
}

function tokenize(str: string): (number | string)[] {
  const tokens: (number | string)[] = [];
  let i = 0;
  while (i < str.length) {
    const ch = str[i];
    if (/[0-9.]/.test(ch)) {
      let j = i + 1;
      while (j < str.length && /[0-9.]/.test(str[j])) j++;
      tokens.push(parseFloat(str.slice(i, j)));
      i = j;
      continue;
    }
    if (ch === '-') {
      const prev = tokens[tokens.length - 1];
      const unary = prev === undefined || (typeof prev !== 'number' && prev !== ')');
      if (unary) {
        let j = i + 1;
        while (j < str.length && /[0-9.]/.test(str[j])) j++;
        const numStr = str.slice(i + 1, j);
        if (!numStr) { tokens.push('-'); i++; continue; }
        tokens.push(-parseFloat(numStr));
        i = j;
        continue;
      } else {
        tokens.push('-'); i++; continue;
      }
    }
    if (ch === '+' || ch === '*' || ch === '/' || ch === '(' || ch === ')') { tokens.push(ch); i++; continue; }
    i++;
  }
  return tokens;
}

function toRPN(tokens: (number | string)[]): (number | string)[] {
  const out: (number | string)[] = [];
  const ops: string[] = [];
  const prec: Record<string, number> = { '+': 1, '-': 1, '*': 2, '/': 2 };
  tokens.forEach(tok => {
    if (typeof tok === 'number') out.push(tok);
    else if (tok in prec) {
      while (ops.length && ops[ops.length - 1] in prec && prec[ops[ops.length - 1]] >= prec[tok as string]) {
        out.push(ops.pop() as string);
      }
      ops.push(tok as string);
    } else if (tok === '(') ops.push(tok as string);
    else if (tok === ')') {
      while (ops.length && ops[ops.length - 1] !== '(') out.push(ops.pop() as string);
      if (ops.length && ops[ops.length - 1] === '(') ops.pop();
    }
  });
  while (ops.length) out.push(ops.pop() as string);
  return out;
}

function evalRPN(rpn: (number | string)[]): number | undefined {
  const st: number[] = [];
  for (const tok of rpn) {
    if (typeof tok === 'number') st.push(tok);
    else {
      const b = st.pop();
      const a = st.pop();
      switch (tok) {
        case '+': st.push((a ?? 0) + (b ?? 0)); break;
        case '-': st.push((a ?? 0) - (b ?? 0)); break;
        case '*': st.push((a ?? 0) * (b ?? 0)); break;
        case '/': st.push((a ?? 0) / (b ?? 1)); break;
      }
    }
  }
  return st.pop();
}

function evaluate(expr: string): number | null {
  const clean = sanitize(expr);
  if (!clean) return null;
  const percentHandled = clean.replace(/(\d+(?:\.\d+)?)%/g, '($1/100)');
  try {
    const tokens = tokenize(percentHandled);
    if (!tokens.length) return null;
    const rpn = toRPN(tokens);
    const value = evalRPN(rpn);
    if (typeof value === 'number' && isFinite(value)) return value;
    return null;
  } catch {
    return null;
  }
}

function formatNumber(n: number | string): string {
  try {
    const num = typeof n === 'number' ? n : Number(n);
    return num.toLocaleString('es-PE', { maximumFractionDigits: 10, useGrouping: true });
  } catch { return String(n); }
}

export function GlobalCalculator() {
  const [open, setOpen] = useState(false);
  const [expression, setExpression] = useState<string>('');
  const [justCalculated, setJustCalculated] = useState(false);
  const [lastResult, setLastResult] = useLocalStorage<number | null>('globalCalculatorLastResult', null);

  const displayResult = useMemo(() => {
    const val = evaluate(expression);
    if (val === null || expression === '') return '0';
    return formatNumber(val);
  }, [expression]);

  const isOperator = (ch: string) => ['+', '-', '*', '/'].includes(ch);

  const pressKey = (key: string) => {
    switch (key) {
      case 'C':
        setExpression('');
        setJustCalculated(false);
        setLastResult(null);
        break;
      case 'Backspace':
      case 'Delete':
      case 'BACK':
        setExpression(prev => {
          if (justCalculated) { setJustCalculated(false); return ''; }
          return prev.slice(0, -1);
        });
        break;
      case '=':
      case 'Enter': {
        const val = evaluate(expression);
        if (val !== null) {
          setLastResult(val);
          setExpression(String(val));
          setJustCalculated(true);
        }
        break;
      }
      case '%': {
        setExpression(prev => {
          if (!prev || /[%)]$/.test(prev)) return prev;
          const match = prev.match(/(\d+(?:\.\d+)?)(?!.*\d)/);
          if (!match) return prev;
          const num = match[1];
          const start = prev.lastIndexOf(num);
          return prev.slice(0, start) + `(${num}/100)` + prev.slice(start + num.length);
        });
        setJustCalculated(false);
        break;
      }
      case '.': {
        setExpression(prev => {
          if (justCalculated) { setJustCalculated(false); return '0.'; }
          const parts = prev.split(/[-+*/()]/);
          const lastNum = parts[parts.length - 1];
          if (lastNum.includes('.')) return prev;
          if (!prev || isOperator(prev.slice(-1))) return prev + '0.';
          return prev + '.';
        });
        break;
      }
      case '00': {
        setExpression(prev => {
          if (justCalculated) { setJustCalculated(false); return '00'; }
          return prev + '00';
        });
        break;
      }
      case '+':
      case '-':
      case '*':
      case '/': {
        setExpression(prev => {
          if (!prev) { if (key === '-') return '-'; return prev; }
          const last = prev.slice(-1);
          if (isOperator(last)) return prev.slice(0, -1) + key;
          setJustCalculated(false);
          return prev + key;
        });
        break;
      }
      default: {
        if (/^[0-9]$/.test(key)) {
          setExpression(prev => {
            if (justCalculated) { setJustCalculated(false); return key; }
            return prev + key;
          });
        }
      }
    }
  };

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (e: KeyboardEvent) => {
      const tag = (document.activeElement as HTMLElement | null)?.tagName?.toLowerCase();
      if (tag === 'input' || tag === 'textarea') return;
      const key = e.key;
      if (/^[0-9]$/.test(key) || ['+', '-', '*', '/'].includes(key)) { pressKey(key); e.preventDefault(); return; }
      if (key === '.' || key === ',') { pressKey('.'); e.preventDefault(); return; }
      if (key === '%') { pressKey('%'); e.preventDefault(); return; }
      if (key === 'Backspace') { pressKey('Backspace'); e.preventDefault(); return; }
      if (key === 'Delete') { pressKey('Delete'); e.preventDefault(); return; }
      if (key === 'Enter' || key === '=') { pressKey('='); e.preventDefault(); return; }
      if (key === 'Escape') { setOpen(false); e.preventDefault(); return; }
      if (key.toLowerCase() === 'c') { pressKey('C'); e.preventDefault(); return; }
    };
    const onKeyPress = (e: KeyboardEvent) => {
      const tag = (document.activeElement as HTMLElement | null)?.tagName?.toLowerCase();
      if (tag === 'input' || tag === 'textarea') return;
      if (/^[0-9+\-*/.=%]$/.test(e.key) || e.key === 'Enter') e.preventDefault();
    };
    document.addEventListener('keydown', onKeyDown);
    document.addEventListener('keypress', onKeyPress);
    return () => {
      document.removeEventListener('keydown', onKeyDown);
      document.removeEventListener('keypress', onKeyPress);
    };
  }, [open, expression, justCalculated]);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2">
          <Calculator className="h-4 w-4" /> Calculadora
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[420px]">
        <DialogHeader>
          <DialogTitle>Calculadora Profesional</DialogTitle>
        </DialogHeader>
        <Card className="p-4 space-y-3">
          <div className="flex items-end justify-between">
            <div className="text-xs text-muted-foreground">Expresión</div>
            <div className="text-xs text-muted-foreground">Resultado</div>
          </div>
          <div className="flex items-center justify-between rounded-md border bg-muted/40 p-3">
            <div className="text-foreground font-mono text-sm" aria-label="Expresión">{expression || '0'}</div>
            <div className="text-primary font-semibold text-lg" aria-label="Resultado">{displayResult}</div>
          </div>
          <div className="grid grid-cols-4 gap-2">
            {['C','Backspace','%','/','7','8','9','*','4','5','6','-','1','2','3','+','00','0','.','='].map((k) => (
              <Button key={k} variant={k==='='? 'default' : 'secondary'} onClick={() => pressKey(k)} className="h-10">
                {k === 'Backspace' ? '⌫' : k}
              </Button>
            ))}
          </div>
          <div className="flex justify-end">
            <Button
              variant="ghost"
              onClick={async () => {
                const val = evaluate(expression);
                const text = val !== null ? String(val) : displayResult;
                try {
                  await navigator.clipboard.writeText(text);
                } catch {}
              }}
            >
              Copiar resultado
            </Button>
          </div>
        </Card>
      </DialogContent>
    </Dialog>
  );
}