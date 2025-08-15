"use client"

import React, { useState } from 'react'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Search, Loader2 } from 'lucide-react'
import { useLocalStorage } from '@/hooks/use-local-storage'
import { queryRucDni } from '@/app/actions'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { cn } from '@/lib/utils'

type ResultData = {
  // Common
  numeroDocumento: string;
  tipo?: 'RUC' | 'DNI';
  error?: boolean;
  nombre?: string; // for DNI name
  // RUC specific
  razonSocial?: string;
  estado?: string;
  condicion?: string;
  direccion?: string;
  departamento?: string;
  provincia?: string;
  distrito?: string;
  // DNI specific
  nombres?: string;
  apellidoPaterno?: string;
  apellidoMaterno?: string;
  [key: string]: any;
};

const MONTHLY_LIMIT = 100;

export function ConsultaRucDni() {
  const [numero, setNumero] = useState('');
  const [lastQuery, setLastQuery] = useLocalStorage('lastRucDniQuery', '');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<ResultData | null>(null);
  
  const [usage, setUsage] = useLocalStorage('rucDniUsage', { count: 0, month: new Date().toISOString().slice(0, 7) });

  React.useEffect(() => {
    const currentMonth = new Date().toISOString().slice(0, 7);
    if (usage.month !== currentMonth) {
      setUsage({ count: 0, month: currentMonth });
    }
  }, [usage.month, setUsage]);

  const canQuery = usage.count < MONTHLY_LIMIT;

  const handleConsultar = async () => {
    if (!numero.trim() || isLoading || !canQuery) return;
    
    setIsLoading(true);
    setError(null);
    setResult(null);

    const response = await queryRucDni(numero);

    if (response.success) {
      setResult(response.data);
      setLastQuery(numero);
      const currentMonth = new Date().toISOString().slice(0, 7);
      setUsage(prev => ({
        count: prev.month === currentMonth ? prev.count + 1 : 1,
        month: currentMonth
      }));
    } else {
      setError(response.error ?? 'Ocurrió un error desconocido.');
    }

    setIsLoading(false);
  };

  return (
    <Card className="flex flex-col h-full">
      <CardHeader>
        <CardTitle>Consulta RUC / DNI</CardTitle>
        <CardDescription>Consulta datos de contribuyentes (RUC) o ciudadanos (DNI) directamente.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4 flex-grow">
        <div className="flex flex-col sm:flex-row w-full gap-2 sm:gap-2 sm:max-w-md">
          <Input
            type="text"
            placeholder="Ingresa 8 (DNI) o 11 (RUC) dígitos"
            value={numero}
            onChange={(e) => setNumero(e.target.value.replace(/[^0-9]/g, ''))}
            onKeyDown={(e) => { if (e.key === 'Enter') handleConsultar(); }}
            maxLength={11}
            disabled={isLoading}
            className="flex-1"
          />
          <Button onClick={handleConsultar} disabled={isLoading || !numero.trim() || !canQuery} className="w-full sm:w-auto">
            {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Search className="mr-2 h-4 w-4" />}
            Consultar
          </Button>
        </div>

        {!canQuery && (
          <Alert variant="destructive">
            <AlertTitle>Límite Alcanzado</AlertTitle>
            <AlertDescription>
              Has alcanzado el límite de {MONTHLY_LIMIT} consultas mensuales.
            </AlertDescription>
          </Alert>
        )}

        {error && (
          <Alert variant="destructive">
            <AlertTitle>Error en la Consulta</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {result && (
          <Card className="bg-muted/50">
             {result.tipo === 'RUC' && (
                <RucResultCard data={result} />
             )}
             {result.tipo === 'DNI' && (
                <DniResultCard data={result} />
             )}
          </Card>
        )}
         <p className="text-xs text-muted-foreground pt-4">
            Consultas este mes: {usage.count}/{MONTHLY_LIMIT}.
        </p>
      </CardContent>
       <CardFooter>
        <p className="text-xs text-muted-foreground w-full text-center">
            © BILUZ - Todos los Derechos Reservados
        </p>
      </CardFooter>
    </Card>
  )
}

const RucResultCard = ({ data }: { data: ResultData }) => {
    const estadoClass = (data.estado || '').includes('ACTIVO') ? 'text-green-600' : 'text-red-600';
    const condicionClass = (data.condicion || '').includes('HABIDO') ? 'text-green-600' : 'text-red-600';
    return (
        <>
            <CardHeader>
                <CardTitle>{data.razonSocial || 'Razón Social no encontrada'}</CardTitle>
                <CardDescription>RUC: {data.numeroDocumento}</CardDescription>
            </CardHeader>
            <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                <InfoItem label="Estado" value={data.estado} valueClassName={estadoClass} />
                <InfoItem label="Condición" value={data.condicion} valueClassName={condicionClass} />
                <InfoItem label="Dirección" value={data.direccion} className="md:col-span-2" />
                <InfoItem label="Ubigeo" value={data.ubigeo ? `${data.departamento} - ${data.provincia} - ${data.distrito}` : undefined} />
            </CardContent>
        </>
    );
};

const DniResultCard = ({ data }: { data: ResultData }) => {
     const fullName = [data.nombres, data.apellidoPaterno, data.apellidoMaterno].filter(Boolean).join(' ');
     return (
        <>
            <CardHeader>
                <CardTitle>{fullName || 'Nombre no encontrado'}</CardTitle>
                <CardDescription>DNI: {data.numeroDocumento}</CardDescription>
            </CardHeader>
        </>
    );
};

const InfoItem = ({ label, value, className, valueClassName }: { label: string; value?: string; className?: string, valueClassName?: string }) => {
    if(!value) return null;
    return (
        <div className={className}>
            <p className="font-semibold text-muted-foreground">{label}</p>
            <p className={cn("font-medium", valueClassName)}>{value}</p>
        </div>
    )
}
