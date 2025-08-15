// src/components/ui/ToolCard.tsx
import React from 'react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';

interface ToolCardProps {
  title: string;
  description: string;
  children: React.ReactNode; // Aquí irá el contenido específico de cada herramienta
  footerText?: string;
}

export function ToolCard({ title, description, children, footerText }: ToolCardProps) {
  return (
    <Card className="flex flex-col h-full">
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6 flex-grow">
        {children}
      </CardContent>
      <CardFooter>
        <p className="text-xs text-muted-foreground w-full text-center">
          {footerText || '© BILUZ - Todos los Derechos Reservados'}
        </p>
      </CardFooter>
    </Card>
  );
}