import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Construction } from 'lucide-react';

interface PlaceholderProps {
  toolName: string;
}

export function Placeholder({ toolName }: PlaceholderProps) {
  return (
    <Card className="h-full">
      <CardHeader>
        <CardTitle>{toolName}</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col items-center justify-center text-center h-full pt-16">
        <Construction className="w-16 h-16 mb-4 text-muted-foreground" />
        <h2 className="text-2xl font-semibold mb-2">Herramienta en Construcción</h2>
        <p className="text-muted-foreground">La funcionalidad para "{toolName}" estará disponible próximamente.</p>
      </CardContent>
    </Card>
  );
}
