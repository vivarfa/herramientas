"use client"

import React from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { tools } from '@/lib/tools';
import { ArrowRight, DownloadCloud } from 'lucide-react';

interface DashboardProps {
    setActiveToolId: (id: string) => void;
}

export function Dashboard({ setActiveToolId }: DashboardProps) {
    
    const toolCards = tools.filter(tool => tool.id !== 'dashboard');

    return (
        <div className="flex flex-col h-full">
            <main className="flex-grow space-y-8">
                <motion.div 
            className="text-center pt-8 pb-4"
            initial={{ opacity: 0, y: -30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease: "easeOut" }}
        >
            <motion.h1 
                className="text-2xl sm:text-3xl lg:text-4xl font-bold tracking-tight text-primary"
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.5, delay: 0.2 }}
            >
                BILUZ Herramientas Contables
            </motion.h1>
            <motion.p 
                className="text-base sm:text-lg text-muted-foreground mt-2 px-4"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.5, delay: 0.4 }}
            >
                Tu suite de herramientas contables, fiscales y financieras.
            </motion.p>
        </motion.div>

                <motion.div
                    initial={{ opacity: 0, y: 30 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5, delay: 0.6 }}
                >
                    <Card className="bg-primary/5 border-primary/20">
                        <CardHeader className="text-center">
                            <CardTitle>Prueba nuestra Extensión de Chrome</CardTitle>
                            <CardDescription>Lleva todas tus herramientas contables directamente a tu navegador para un acceso más rápido y cómodo.</CardDescription>
                        </CardHeader>
                        <CardContent className="flex justify-center">
                            <motion.div
                                whileHover={{ scale: 1.05 }}
                                whileTap={{ scale: 0.95 }}
                                transition={{ type: "spring", stiffness: 300 }}
                            >
                                <Button asChild size="lg">
                                    <a href="https://chromewebstore.google.com/detail/herramientas-contables-bi/ejlloppgdgnapnliehbfehbnejdgbnap?authuser=0&hl=es-419" target="_blank" rel="noopener noreferrer">
                                        <motion.div
                                            className="mr-2"
                                            animate={{ rotate: [0, 10, -10, 0] }}
                                            transition={{ duration: 2, repeat: Infinity, repeatDelay: 3 }}
                                        >
                                            <DownloadCloud className="h-5 w-5" />
                                        </motion.div>
                                        Instalar Extensión de Chrome
                                    </a>
                                </Button>
                            </motion.div>
                        </CardContent>
                    </Card>
                </motion.div>
                
                <motion.div
                    initial={{ opacity: 0, y: 30 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5, delay: 0.8 }}
                >
                    <Card>
                        <CardHeader>
                            <CardTitle>Nuestras Herramientas</CardTitle>
                            <CardDescription>Selecciona una herramienta para comenzar a trabajar.</CardDescription>
                        </CardHeader>
                        <CardContent className="responsive-grid">
                            {toolCards.map((tool, index) => (
                                <motion.div
                                    key={tool.id}
                                    initial={{ opacity: 0, y: 20, scale: 0.9 }}
                                    animate={{ opacity: 1, y: 0, scale: 1 }}
                                    transition={{ 
                                        duration: 0.3, 
                                        delay: 1 + (index * 0.1),
                                        type: "spring",
                                        stiffness: 200
                                    }}
                                    whileHover={{ 
                                        scale: 1.02, 
                                        y: -2,
                                        transition: { duration: 0.2 }
                                    }}
                                    whileTap={{ scale: 0.98 }}
                                >
                                    <Button 
                                        variant="outline" 
                                        className="h-16 sm:h-20 w-full flex justify-between items-center p-3 sm:p-4 transition-all duration-200 hover:shadow-lg hover:border-primary/30" 
                                        onClick={() => setActiveToolId(tool.id)}
                                    >
                                        <div className="flex items-center gap-2 sm:gap-4 flex-1 min-w-0">
                                            <motion.div 
                                                className="bg-primary/10 text-primary p-2 sm:p-3 rounded-lg flex-shrink-0"
                                                whileHover={{ 
                                                    scale: 1.1, 
                                                    rotate: 5,
                                                    backgroundColor: "hsl(var(--primary) / 0.15)"
                                                }}
                                                transition={{ type: "spring", stiffness: 300 }}
                                            >
                                                {React.cloneElement(tool.icon as React.ReactElement, { className: "h-5 w-5 sm:h-6 sm:w-6" })}
                                            </motion.div>
                                            <span className="font-semibold text-sm sm:text-md truncate">{tool.name}</span>
                                        </div>
                                        <motion.div
                                            whileHover={{ x: 4 }}
                                            transition={{ type: "spring", stiffness: 300 }}
                                            className="flex-shrink-0"
                                        >
                                            <ArrowRight className="h-4 w-4 sm:h-5 sm:w-5 text-muted-foreground" />
                                        </motion.div>
                                    </Button>
                                </motion.div>
                            ))}
                        </CardContent>
                    </Card>
                </motion.div>
            </main>
            <motion.footer 
                className="text-center py-4 mt-8"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.5, delay: 2 }}
            >
                <motion.p 
                    className="text-xs text-muted-foreground"
                    whileHover={{ scale: 1.05 }}
                    transition={{ type: "spring", stiffness: 300 }}
                >
                    © BILUZ - Todos los Derechos Reservados
                </motion.p>
            </motion.footer>
        </div>
    );
}
