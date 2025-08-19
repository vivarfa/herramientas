import React from 'react';

interface CopyrightProps {
  className?: string;
}

export const Copyright: React.FC<CopyrightProps> = ({ className = '' }) => {
  const currentYear = new Date().getFullYear();
  
  return (
    <div className={`text-center text-sm text-muted-foreground mt-8 ${className}`}>
      © BILUZ {currentYear} - Todos los Derechos Reservados
    </div>
  );
};

export default Copyright;