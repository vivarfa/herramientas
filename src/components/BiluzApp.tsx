"use client";

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { tools } from '@/lib/tools';
import { useLocalStorage } from '@/hooks/use-local-storage';
import { AppLayout } from './AppLayout';
import { Skeleton } from './ui/skeleton';
import { Dashboard } from '@/tools/Dashboard';

export function BiluzApp() {
  const [activeToolId, setActiveToolId] = useLocalStorage('activeToolId', 'dashboard');
  const [ActiveComponent, setActiveComponent] = useState<React.ComponentType | null>(null);
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  useEffect(() => {
    if (isClient) {
      const toolExists = tools.some(tool => tool.id === activeToolId);
      const currentToolId = toolExists ? activeToolId : 'dashboard';
      if (!toolExists) {
          setActiveToolId('dashboard');
      }

      const currentTool = tools.find(tool => tool.id === currentToolId);
      if (currentToolId === 'dashboard') {
        setActiveComponent(() => () => <Dashboard setActiveToolId={setActiveToolId} />);
      } else {
        setActiveComponent(() => currentTool?.component || null);
      }
    }
  }, [activeToolId, setActiveToolId, isClient]);

  if (!isClient) {
    return (
        <div className="flex h-screen">
             <Skeleton className="w-16 md:w-64 h-full" />
             <div className="flex-1 p-4 space-y-4">
                <Skeleton className="h-12 w-1/4" />
                <Skeleton className="h-64 w-full" />
             </div>
        </div>
    )
  }

  return (
    <AppLayout
      activeToolId={activeToolId}
      onToolSelect={setActiveToolId}
    >
      <main className="flex-grow bg-background p-2 sm:p-4 lg:p-6 overflow-y-auto hide-floating-elements">
        <div className="responsive-container h-full">
          <AnimatePresence mode="wait">
            <motion.div
              key={activeToolId}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.3, ease: "easeInOut" }}
              className="h-full"
            >
              {ActiveComponent ? <ActiveComponent /> : <div>Herramienta no encontrada</div>}
            </motion.div>
          </AnimatePresence>
        </div>
      </main>
    </AppLayout>
  );
}

