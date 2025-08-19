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
        <div className="flex flex-col h-full relative overflow-hidden">
            {/* Fondo decorativo animado */}
            <div className="absolute inset-0 bg-gradient-to-br from-primary/3 via-background to-accent/3" />
            <div className="absolute top-0 left-1/4 w-96 h-96 bg-primary/5 rounded-full blur-3xl animate-pulse" />
            <div className="absolute bottom-0 right-1/4 w-80 h-80 bg-accent/5 rounded-full blur-3xl animate-pulse" style={{animationDelay: '1s'}} />
            
            <main className="relative flex-grow space-y-8 z-10">
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
                    className="relative"
                >
                    {/* Fondo decorativo para la tarjeta de promoción */}
                    <div className="absolute inset-0 bg-gradient-to-r from-primary/10 via-accent/8 to-primary/10 rounded-2xl blur-2xl -z-10 transform scale-105" />
                    
                    <Card className="border-0 shadow-xl bg-gradient-to-br from-primary/8 via-background/95 to-accent/8 backdrop-blur-sm overflow-hidden">
                        <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/5 to-transparent" />
                        
                        <CardHeader className="text-center relative z-10 pb-6">
                            <CardTitle className="text-xl sm:text-2xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
                                Prueba nuestra Extensión de Chrome
                            </CardTitle>
                            <CardDescription className="text-base mt-3 text-muted-foreground">
                                Lleva todas tus herramientas contables directamente a tu navegador para un acceso más rápido y cómodo.
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="flex justify-center pb-8 relative z-10">
                            <motion.div
                                whileHover={{ scale: 1.05, y: -2 }}
                                whileTap={{ scale: 0.95 }}
                                transition={{ type: "spring", stiffness: 300 }}
                                className="group"
                            >
                                <Button asChild size="lg" className="bg-gradient-to-r from-primary to-accent hover:from-primary/90 hover:to-accent/90 text-white shadow-lg hover:shadow-xl transition-all duration-300 px-8 py-3 rounded-xl">
                                    <a href="https://chromewebstore.google.com/detail/herramientas-contables-bi/ejlloppgdgnapnliehbfehbnejdgbnap?authuser=0&hl=es-419" target="_blank" rel="noopener noreferrer" className="flex items-center gap-3">
                                        <motion.div
                                            className="bg-white/20 p-2 rounded-lg"
                                            animate={{ rotate: [0, 10, -10, 0] }}
                                            transition={{ duration: 2, repeat: Infinity, repeatDelay: 3 }}
                                        >
                                            <DownloadCloud className="h-5 w-5" />
                                        </motion.div>
                                        <span className="font-semibold">Instalar Extensión de Chrome</span>
                                    </a>
                                </Button>
                            </motion.div>
                        </CardContent>
                        
                        {/* Borde brillante */}
                        <div className="absolute inset-0 rounded-2xl border border-primary/30 group-hover:border-primary/50 transition-colors duration-300" />
                    </Card>
                </motion.div>
                
                <motion.div
                    initial={{ opacity: 0, y: 30 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5, delay: 0.8 }}
                    className="relative"
                >
                    {/* Fondo decorativo con gradiente */}
                    <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-accent/5 to-secondary/10 rounded-3xl blur-3xl -z-10 transform scale-110" />
                    
                    <Card className="border-0 shadow-2xl bg-gradient-to-br from-background/95 via-background/98 to-background backdrop-blur-sm">
                        <CardHeader className="text-center pb-8">
                            <CardTitle className="text-2xl sm:text-3xl font-bold bg-gradient-to-r from-primary via-accent to-primary bg-clip-text text-transparent">
                                Nuestras Herramientas
                            </CardTitle>
                            <CardDescription className="text-base sm:text-lg mt-2">
                                Selecciona una herramienta para comenzar a trabajar.
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6 p-6">
                            {toolCards.map((tool, index) => (
                                <motion.div
                                    key={tool.id}
                                    initial={{ opacity: 0, y: 20, scale: 0.9 }}
                                    animate={{ opacity: 1, y: 0, scale: 1 }}
                                    transition={{ 
                                        duration: 0.4, 
                                        delay: 1 + (index * 0.1),
                                        type: "spring",
                                        stiffness: 200
                                    }}
                                    whileHover={{ 
                                        scale: 1.05, 
                                        y: -8,
                                        transition: { duration: 0.3, type: "spring", stiffness: 300 }
                                    }}
                                    whileTap={{ scale: 0.95 }}
                                    className="group"
                                >
                                    <div 
                                        className="relative h-32 sm:h-36 w-full rounded-2xl overflow-hidden cursor-pointer transition-all duration-300 group-hover:shadow-2xl group-hover:shadow-primary/20"
                                        onClick={() => setActiveToolId(tool.id)}
                                    >
                                        {/* Gradiente de fondo dinámico */}
                                        <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-accent/8 to-secondary/12 group-hover:from-primary/20 group-hover:via-accent/15 group-hover:to-secondary/20 transition-all duration-300" />
                                        
                                        {/* Efecto de brillo */}
                                        <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                                        
                                        {/* Contenido */}
                                        <div className="relative h-full flex flex-col items-center justify-center p-4 text-center">
                                            <motion.div 
                                                className="bg-gradient-to-br from-primary/20 to-accent/20 backdrop-blur-sm p-3 sm:p-4 rounded-xl mb-3 group-hover:scale-110 transition-transform duration-300"
                                                whileHover={{ 
                                                    rotate: [0, -5, 5, 0],
                                                    transition: { duration: 0.5 }
                                                }}
                                            >
                                                {React.cloneElement(tool.icon as React.ReactElement, { 
                                                    className: "h-6 w-6 sm:h-8 sm:w-8 text-primary group-hover:text-accent transition-colors duration-300" 
                                                })}
                                            </motion.div>
                                            
                                            <h3 className="font-bold text-sm sm:text-base text-foreground group-hover:text-primary transition-colors duration-300 leading-tight">
                                                {tool.name}
                                            </h3>
                                            
                                            {/* Indicador de acción */}
                                            <motion.div
                                                className="absolute bottom-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity duration-300"
                                                whileHover={{ scale: 1.2 }}
                                            >
                                                <ArrowRight className="h-4 w-4 text-primary" />
                                            </motion.div>
                                        </div>
                                        
                                        {/* Borde brillante */}
                                        <div className="absolute inset-0 rounded-2xl border border-primary/20 group-hover:border-primary/40 transition-colors duration-300" />
                                    </div>
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
                </motion.p>
            </motion.footer>
        </div>
    );
}
