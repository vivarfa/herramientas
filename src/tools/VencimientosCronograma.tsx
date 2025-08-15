

      
"use client";

import React, { useState, useMemo, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';
import { differenceInDays, parse, parseISO, subDays, isValid } from 'date-fns';
import { Bell, BellOff } from 'lucide-react';
import { useLocalStorage } from '@/hooks/use-local-storage';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import { scheduleNotification, cancelNotification } from '@/lib/notification';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar as CalendarIcon } from 'lucide-react';
import { Calendar } from '@/components/ui/calendar';
import { es } from 'date-fns/locale';

const cronograma2025 = [
  { "periodo": "Ene", "ruc_0": "2025-02-17", "ruc_1": "2025-02-18", "ruc_2_3": "2025-02-19", "ruc_4_5": "2025-02-20", "ruc_6_7": "2025-02-21", "ruc_8_9": "2025-02-24", "buenos_contribuyentes": "2025-02-25" },
  { "periodo": "Feb", "ruc_0": "2025-03-17", "ruc_1": "2025-03-18", "ruc_2_3": "2025-03-19", "ruc_4_5": "2025-03-20", "ruc_6_7": "2025-03-21", "ruc_8_9": "2025-03-24", "buenos_contribuyentes": "2025-03-25" },
  { "periodo": "Mar", "ruc_0": "2025-04-15", "ruc_1": "2025-04-16", "ruc_2_3": "2025-04-21", "ruc_4_5": "2025-04-22", "ruc_6_7": "2025-04-23", "ruc_8_9": "2025-04-24", "buenos_contribuyentes": "2025-04-25" },
  { "periodo": "Abr", "ruc_0": "2025-05-16", "ruc_1": "2025-05-19", "ruc_2_3": "2025-05-20", "ruc_4_5": "2025-05-21", "ruc_6_7": "2025-05-22", "ruc_8_9": "2025-05-23", "buenos_contribuyentes": "2025-05-26" },
  { "periodo": "May", "ruc_0": "2025-06-16", "ruc_1": "2025-06-17", "ruc_2_3": "2025-06-18", "ruc_4_5": "2025-06-19", "ruc_6_7": "2025-06-20", "ruc_8_9": "2025-06-23", "buenos_contribuyentes": "2025-06-24" },
  { "periodo": "Jun", "ruc_0": "2025-07-15", "ruc_1": "2025-07-16", "ruc_2_3": "2025-07-17", "ruc_4_5": "2025-07-18", "ruc_6_7": "2025-07-21", "ruc_8_9": "2025-07-22", "buenos_contribuyentes": "2025-07-24" },
  { "periodo": "Jul", "ruc_0": "2025-08-18", "ruc_1": "2025-08-19", "ruc_2_3": "2025-08-20", "ruc_4_5": "2025-08-21", "ruc_6_7": "2025-08-22", "ruc_8_9": "2025-08-25", "buenos_contribuyentes": "2025-08-26" },
  { "periodo": "Ago", "ruc_0": "2025-09-15", "ruc_1": "2025-09-16", "ruc_2_3": "2025-09-17", "ruc_4_5": "2025-09-18", "ruc_6_7": "2025-09-19", "ruc_8_9": "2025-09-22", "buenos_contribuyentes": "2025-09-23" },
  { "periodo": "Set", "ruc_0": "2025-10-16", "ruc_1": "2025-10-17", "ruc_2_3": "2025-10-20", "ruc_4_5": "2025-10-21", "ruc_6_7": "2025-10-22", "ruc_8_9": "2025-10-23", "buenos_contribuyentes": "2025-10-24" },
  { "periodo": "Oct", "ruc_0": "2025-11-17", "ruc_1": "2025-11-18", "ruc_2_3": "2025-11-19", "ruc_4_5": "2025-11-20", "ruc_6_7": "2025-11-21", "ruc_8_9": "2025-11-24", "buenos_contribuyentes": "2025-11-25" },
  { "periodo": "Nov", "ruc_0": "2025-12-17", "ruc_1": "2025-12-18", "ruc_2_3": "2025-12-19", "ruc_4_5": "2025-12-22", "ruc_6_7": "2025-12-23", "ruc_8_9": "2025-12-24", "buenos_contribuyentes": "2025-12-26" },
  { "periodo": "Dic", "ruc_0": "2026-01-16", "ruc_1": "2026-01-19", "ruc_2_3": "2026-01-20", "ruc_4_5": "2026-01-21", "ruc_6_7": "2026-01-22", "ruc_8_9": "2026-01-23", "buenos_contribuyentes": "2026-01-26" }
];

const MONTH_NAMES = ["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"];
const MONTH_ABBR = ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Set", "Oct", "Nov", "Dic"];

const RUC_GROUPS = [
    { key: 'ruc_0', label: '0' }, { key: 'ruc_1', label: '1' }, { key: 'ruc_2_3', label: '2 y 3' },
    { key: 'ruc_4_5', label: '4 y 5' }, { key: 'ruc_6_7', label: '6 y 7' }, { key: 'ruc_8_9', label: '8 y 9' },
    { key: 'buenos_contribuyentes', label: 'B.C.' }
];

const getDeclarablePeriodAbbr = () => {
    const today = new Date();
    // El mes de declaración es el mes anterior al actual.
    const declarationMonthIndex = (today.getMonth() - 1 + 12) % 12;
    return MONTH_ABBR[declarationMonthIndex];
};

export function VencimientosCronograma() {
    const [selectedPeriod, setSelectedPeriod] = useState(getDeclarablePeriodAbbr);
    const [ruc, setRuc] = useState("");
    const [reminders, setReminders] = useLocalStorage<Record<string, boolean>>('sunatReminders_v3', {});
    const { toast } = useToast();

    useEffect(() => {
        // Solicitar permiso de notificación en cuanto el componente se monte
        if (Notification.permission === 'default') {
            Notification.requestPermission();
        }
    }, []);

    const lastDigit = useMemo(() => {
        if (ruc && ruc.length === 11) {
            return parseInt(ruc.charAt(ruc.length - 1), 10);
        }
        return null;
    }, [ruc]);
    
    const periodData = cronograma2025.find(row => row.periodo === selectedPeriod);
    const selectedPeriodComplete = MONTH_NAMES[MONTH_ABBR.indexOf(selectedPeriod)];

    const { activatableReminders, activeReminders } = useMemo(() => {
        if (!periodData) return { activatableReminders: [], activeReminders: [] };

        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const futureReminders = RUC_GROUPS.map(group => {
            const vencimientoStr = periodData[group.key as keyof typeof periodData] as string;
            const vencimientoDate = parseISO(vencimientoStr);
            const reminderId = `${selectedPeriod}-${group.key}`;
            const groupLabel = group.label;
            return { vencimientoDate, reminderId, groupLabel };
        }).filter(({ vencimientoDate }) => vencimientoDate >= today);

        return {
            activatableReminders: futureReminders.filter(({ reminderId }) => !reminders[reminderId]),
            activeReminders: futureReminders.filter(({ reminderId }) => reminders[reminderId])
        };
    }, [periodData, selectedPeriod, reminders]);


    const isRucInGroup = (groupKey: string) => {
        if (lastDigit === null) return false;
        if (groupKey.startsWith('ruc_')) {
            const digits = groupKey.split('_').slice(1).map(d => parseInt(d, 10));
            return digits.includes(lastDigit);
        }
        return false;
    };

    const toggleReminder = (reminderId: string, vencimientoStr: string, groupLabel: string) => {
        const vencimientoDate = parseISO(vencimientoStr);
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        if (reminders[reminderId]) {
            cancelNotification(reminderId);
            setReminders(prev => {
                const newReminders = {...prev};
                delete newReminders[reminderId];
                return newReminders;
            });
            toast({ title: "Recordatorio cancelado", description: "Ya no se te notificará para esta fecha." });
        } else {
             if (vencimientoDate < today) {
                toast({ variant: "destructive", title: "Fecha Vencida", description: "No se puede crear un recordatorio para una fecha que ya pasó." });
                return;
            }
             if (Notification.permission !== 'granted') {
                Notification.requestPermission().then(permission => {
                    if(permission === 'granted') {
                        setAndScheduleReminder(reminderId, vencimientoDate, groupLabel);
                    } else {
                         toast({ variant: "destructive", title: "Permiso denegado", description: "No se pueden mostrar notificaciones. Habilítalas en la configuración de tu navegador." });
                    }
                });
             } else {
                 setAndScheduleReminder(reminderId, vencimientoDate, groupLabel);
             }
        }
    };

    const setAndScheduleReminder = (reminderId: string, vencimientoDate: Date, groupLabel: string) => {
        const scheduleDate = subDays(vencimientoDate, 2);
        scheduleDate.setHours(9, 0, 0, 0); // 9 AM
        
        const title = "Recordatorio de Vencimiento SUNAT";
        const body = `El vencimiento para el RUC terminado en ${groupLabel} (periodo ${selectedPeriodComplete}) es en 2 días.`;
        
        scheduleNotification(reminderId, scheduleDate, title, body);

        setReminders(prev => ({...prev, [reminderId]: true }));
        toast({ title: "Recordatorio Activado", description: "Se te recordará 2 días antes del vencimiento." });
    }
    
    const massToggleReminders = (activate: boolean) => {
        const remindersToToggle = activate ? activatableReminders : activeReminders;
        if(remindersToToggle.length === 0) return;

        if (activate && Notification.permission !== 'granted') {
             Notification.requestPermission().then(permission => {
                if(permission === 'granted') {
                    executeMassToggle(activate, remindersToToggle);
                } else {
                    toast({ variant: "destructive", title: "Permiso denegado", description: "No se pueden activar recordatorios. Habilita las notificaciones." });
                }
             });
        } else {
             executeMassToggle(activate, remindersToToggle);
        }
    };
    
    const executeMassToggle = (activate: boolean, remindersToToggle: any[]) => {
         setReminders(prev => {
            const newReminders = { ...prev };
            remindersToToggle.forEach(({ reminderId, vencimientoDate, groupLabel }) => {
                if (activate) {
                    newReminders[reminderId] = true;
                    const scheduleDate = subDays(vencimientoDate, 2);
                    scheduleDate.setHours(9, 0, 0, 0);
                    const title = "Recordatorio de Vencimiento SUNAT";
                    const body = `El vencimiento para el RUC terminado en ${groupLabel} (periodo ${selectedPeriodComplete}) es en 2 días.`;
                    scheduleNotification(reminderId, scheduleDate, title, body);
                } else {
                    delete newReminders[reminderId];
                    cancelNotification(reminderId);
                }
            });
            return newReminders;
        });
        
        toast({ 
            title: `Recordatorios ${activate ? 'Activados' : 'Desactivados'}`, 
            description: `${remindersToToggle.length} recordatorios fueron ${activate ? 'activados' : 'desactivados'} para ${selectedPeriodComplete}.` 
        });
    }

    const canActivateAll = activatableReminders.length > 0;

    return (
        <Card className="flex flex-col h-full">
            <CardHeader>
                <CardTitle>Cronograma de Vencimientos SUNAT 2025</CardTitle>
                <CardDescription>Consulta las fechas de vencimiento y activa recordatorios.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6 flex-grow">
                 <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                        <Label htmlFor="month">Seleccionar Período a Declarar</Label>
                        <Select value={selectedPeriod} onValueChange={setSelectedPeriod}>
                            <SelectTrigger id="month">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                {MONTH_NAMES.map((month, index) => (
                                    <SelectItem key={month} value={MONTH_ABBR[index]}>{month}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                     <div className="space-y-2">
                        <Label htmlFor="ruc">Ingresa tu RUC para resaltar</Label>
                        <Input 
                            id="ruc" 
                            placeholder="Ingresa los 11 dígitos de tu RUC" 
                            value={ruc}
                            onChange={(e) => setRuc(e.target.value.replace(/[^0-9]/g, ''))}
                            maxLength={11}
                        />
                    </div>
                </div>

                {!periodData ? (
                    <p className="info-text">No hay datos para <b>{selectedPeriodComplete}</b>.</p>
                ) : (
                    <>
                        <h4 className="text-lg font-semibold">Vencimientos del Período: {selectedPeriodComplete}</h4>
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 sm:gap-4">
                            {RUC_GROUPS.map(group => {
                                const vencimientoDateStr = periodData[group.key as keyof typeof periodData] as string;
                                const vencimientoDate = parseISO(vencimientoDateStr);
                                const today = new Date();
                                today.setHours(0, 0, 0, 0);

                                const diffDays = differenceInDays(vencimientoDate, today);

                                let statusClass = '';
                                let statusText = '';

                                if (diffDays < 0) {
                                    statusClass = 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400';
                                    statusText = 'Vencido';
                                } else if (diffDays === 0) {
                                    statusClass = 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 animate-pulse';
                                    statusText = '¡Hoy vence!';
                                } else if (diffDays <= 7) {
                                    statusClass = 'bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-400';
                                    statusText = `Vence en ${diffDays} día(s)`;
                                } else {
                                    statusClass = 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400';
                                    statusText = `${diffDays} días restantes`;
                                }

                                const isHighlighted = isRucInGroup(group.key);
                                const reminderId = `${selectedPeriod}-${group.key}`;
                                const isReminderActive = reminders[reminderId];
                                const isPast = vencimientoDate < today;

                                return (
                                    <div key={group.key} className={cn(
                                        "rounded-lg border p-3 sm:p-4 flex flex-col justify-between transition-all relative min-h-[180px]",
                                        isHighlighted ? 'ring-2 ring-primary scale-105 shadow-lg' : 'bg-card'
                                    )}>
                                        <div className="flex justify-between items-center mb-2">
                                            <span className="font-bold text-base sm:text-lg">Dígito(s): {group.label}</span>
                                        </div>
                                        <div className="text-center my-2 flex-1">
                                            <span className="text-xs sm:text-sm text-muted-foreground">Vence el:</span>
                                            <p className="font-semibold text-sm sm:text-base lg:text-lg text-primary leading-tight">
                                                {new Intl.DateTimeFormat('es-PE', { weekday: 'long', day: 'numeric', month: 'long' }).format(vencimientoDate)}
                                            </p>
                                        </div>
                                        <div className="text-center mt-2">
                                            <span className={cn('text-xs font-bold px-2 py-1 rounded-full whitespace-nowrap', statusClass)}>
                                                {statusText}
                                            </span>
                                        </div>
                                        
                                        <AlertDialog>
                                            <AlertDialogTrigger asChild>
                                                <Button variant="ghost" size="icon" disabled={isPast && !isReminderActive} className={cn("absolute top-1 right-1 sm:top-2 sm:right-2 h-6 w-6 sm:h-7 sm:w-7", isReminderActive ? "text-primary" : "text-muted-foreground", (isPast && !isReminderActive) && "opacity-50 cursor-not-allowed")}>
                                                    {isReminderActive ? <BellOff className="h-3 w-3 sm:h-4 sm:w-4" /> : <Bell className="h-3 w-3 sm:h-4 sm:w-4" />}
                                                </Button>
                                            </AlertDialogTrigger>
                                            <AlertDialogContent>
                                                <AlertDialogHeader>
                                                    <AlertDialogTitle>{isReminderActive ? 'Cancelar Recordatorio' : 'Activar Recordatorio'}</AlertDialogTitle>
                                                    <AlertDialogDescription>
                                                        {isReminderActive 
                                                            ? `¿Estás seguro de que quieres cancelar el recordatorio para el vencimiento del dígito ${group.label} del período ${selectedPeriodComplete}?`
                                                            : `Se programará una notificación del sistema para recordarte 2 días antes de la fecha de vencimiento. ¿Deseas continuar?`
                                                        }
                                                    </AlertDialogDescription>
                                                </AlertDialogHeader>
                                                <AlertDialogFooter>
                                                    <AlertDialogCancel>Cerrar</AlertDialogCancel>
                                                    <AlertDialogAction onClick={() => toggleReminder(reminderId, vencimientoDateStr, group.label)}>
                                                        {isReminderActive ? 'Sí, Cancelar' : 'Sí, Activar'}
                                                    </AlertDialogAction>
                                                </AlertDialogFooter>
                                            </AlertDialogContent>
                                        </AlertDialog>
                                    </div>
                                );
                            })}
                        </div>
                        <div className="pt-4 flex justify-center">
                            <AlertDialog>
                                <AlertDialogTrigger asChild>
                                    <Button disabled={activatableReminders.length === 0 && activeReminders.length === 0} className="text-xs sm:text-sm px-3 sm:px-4 py-2 h-auto">
                                        <span className="text-center leading-tight">
                                            {canActivateAll ? 'Activar Todos los Recordatorios del Mes' : 'Desactivar Todos los Recordatorios del Mes'}
                                        </span>
                                    </Button>
                                </AlertDialogTrigger>
                                <AlertDialogContent>
                                    <AlertDialogHeader>
                                        <AlertDialogTitle>{canActivateAll ? 'Activar Múltiples Recordatorios' : 'Desactivar Múltiples Recordatorios'}</AlertDialogTitle>
                                        <AlertDialogDescription>
                                           {canActivateAll 
                                           ? `Se activarán recordatorios para todas las fechas futuras de ${selectedPeriodComplete}. ¿Continuar?`
                                           : `Se desactivarán todos los recordatorios activos para ${selectedPeriodComplete}. ¿Continuar?`}
                                        </AlertDialogDescription>
                                    </AlertDialogHeader>
                                    <AlertDialogFooter>
                                        <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                        <AlertDialogAction onClick={() => massToggleReminders(canActivateAll)}>
                                            {canActivateAll ? 'Sí, Activar Todos' : 'Sí, Desactivar Todos'}
                                        </AlertDialogAction>
                                    </AlertDialogFooter>
                                </AlertDialogContent>
                            </AlertDialog>
                        </div>
                    </>
                )}
            </CardContent>
            <CardFooter>
                <p className="text-xs text-muted-foreground w-full text-center">
                    © BILUZ - Todos los Derechos Reservados
                </p>
            </CardFooter>
        </Card>
    );
}
