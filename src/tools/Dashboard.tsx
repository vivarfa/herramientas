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
    
    const toolCards = React.useMemo(() => tools.filter(tool => tool.id !== 'dashboard'), []);

    return (
        <div className="flex flex-col h-full relative overflow-hidden">
            {/* Fondo decorativo optimizado */}
            <div className="absolute inset-0 bg-gradient-to-br from-primary/3 via-background to-accent/3 pointer-events-none" />
            <div className="absolute top-0 left-1/4 w-96 h-96 bg-primary/5 rounded-full blur-3xl pointer-events-none" />
            <div className="absolute bottom-0 right-1/4 w-80 h-80 bg-accent/5 rounded-full blur-3xl pointer-events-none" />
            
            <main className="relative flex-grow space-y-6 z-10">
                <motion.div 
            className="text-center pt-6 pb-2"
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, ease: "easeOut" }}
        >
            <motion.h1 
                className="text-2xl sm:text-3xl lg:text-4xl font-bold tracking-tight text-primary"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.3, delay: 0.1 }}
            >
                BILUZ Herramientas Contables
            </motion.h1>
            <motion.p 
                className="text-sm sm:text-base text-muted-foreground mt-1 px-4"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.3, delay: 0.2 }}
            >
                Tu suite de herramientas contables, fiscales y financieras.
            </motion.p>
        </motion.div>

                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.4, delay: 0.3 }}
                    className="relative"
                >
                    {/* Fondo decorativo simplificado para móvil */}
                    <div className="absolute inset-0 bg-gradient-to-r from-primary/10 via-accent/8 to-primary/10 rounded-2xl blur-xl -z-10 transform scale-105 opacity-50" />
                    
                    <Card className="border-0 shadow-lg bg-gradient-to-br from-primary/5 via-background/98 to-accent/5 backdrop-blur-md overflow-hidden">
                        <CardHeader className="text-center relative z-10 pb-4">
                            <CardTitle className="text-lg sm:text-xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
                                Prueba nuestra Extensión de Chrome
                            </CardTitle>
                            <CardDescription className="text-sm mt-2 text-muted-foreground">
                                Acceso rápido y cómodo directamente en tu navegador.
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="flex justify-center pb-6 relative z-10">
                            <motion.div
                                whileHover={{ scale: 1.02 }}
                                whileTap={{ scale: 0.98 }}
                                className="group"
                            >
                                <Button asChild size="default" className="bg-gradient-to-r from-primary to-accent hover:from-primary/90 hover:to-accent/90 text-white shadow-md hover:shadow-lg transition-all duration-300 px-6 py-2 rounded-lg">
                                    <a href="https://chromewebstore.google.com/detail/herramientas-contables-bi/ejlloppgdgnapnliehbfehbnejdgbnap?authuser=0&hl=es-419" target="_blank" rel="noopener noreferrer" className="flex items-center gap-2">
                                        <DownloadCloud className="h-4 w-4" />
                                        <span className="font-semibold text-sm">Instalar Extensión</span>
                                    </a>
                                </Button>
                            </motion.div>
                        </CardContent>
                    </Card>
                </motion.div>
                
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.4, delay: 0.4 }}
                    className="relative"
                >
                    <Card className="border-0 shadow-xl bg-background/98 backdrop-blur-md rounded-2xl sm:rounded-3xl">
                        <CardHeader className="text-center pb-4 pt-6">
                            <CardTitle className="text-xl sm:text-2xl font-bold bg-gradient-to-r from-primary via-accent to-primary bg-clip-text text-transparent">
                                Nuestras Herramientas
                            </CardTitle>
                            <CardDescription className="text-sm sm:text-base mt-1">
                                Selecciona una herramienta para comenzar.
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-6 p-4 sm:p-6">
                            {toolCards.map((tool, index) => (
                                <motion.div
                                    key={tool.id}
                                    initial={{ opacity: 0, y: 15 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ 
                                        duration: 0.3, 
                                        delay: 0.4 + (index * 0.03),
                                        ease: "easeOut"
                                    }}
                                    whileHover={{ 
                                        scale: 1.03, 
                                        y: -4,
                                        transition: { duration: 0.2 }
                                    }}
                                    whileTap={{ scale: 0.97 }}
                                    className="group"
                                >
                                    <div 
                                        className="relative h-28 sm:h-36 w-full rounded-xl sm:rounded-2xl overflow-hidden cursor-pointer transition-all duration-300 bg-muted/30 hover:bg-muted/50 border border-primary/10 hover:border-primary/30"
                                        onClick={() => setActiveToolId(tool.id)}
                                        style={{ willChange: 'transform, opacity' }}
                                    >
                                        {/* Contenido */}
                                        <div className="relative h-full flex flex-col items-center justify-center p-3 text-center">
                                            <div className="bg-primary/10 p-2 sm:p-4 rounded-lg sm:rounded-xl mb-2 group-hover:scale-110 transition-transform duration-300">
                                                {React.cloneElement(tool.icon as React.ReactElement, { 
                                                    className: "h-5 w-5 sm:h-8 sm:w-8 text-primary group-hover:text-accent transition-colors duration-300" 
                                                })}
                                            </div>
                                            
                                            <h3 className="font-bold text-xs sm:text-sm text-foreground group-hover:text-primary transition-colors duration-300 leading-tight line-clamp-2">
                                                {tool.name}
                                            </h3>
                                            
                                            {/* Indicador de acción oculto en móvil para velocidad */}
                                            <div className="hidden sm:block absolute bottom-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                                                <ArrowRight className="h-4 w-4 text-primary" />
                                            </div>
                                        </div>
                                    </div>
                                </motion.div>
                            ))}
                        </CardContent>
                    </Card>
                </motion.div>
            </main>
        </div>
    );
}
