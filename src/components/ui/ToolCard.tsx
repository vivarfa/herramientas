// src/components/ui/ToolCard.tsx
import React from 'react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';

interface ToolCardProps {
  title: string;
  description: string;
  children: React.ReactNode; // Aquí irá el contenido específico de cada herramienta
}

export function ToolCard({ title, description, children }: ToolCardProps) {
  return (
    <Card className="flex flex-col h-full">
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6 flex-grow">
        {children}
      </CardContent>
    </Card>
  );
}