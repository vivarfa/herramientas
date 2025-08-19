"use client";

import React from 'react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowUpRight } from 'lucide-react';

const links = [
    {
        title: "Consulta de RUC",
        description: "Verifica el estado y datos de un RUC en el padrón de SUNAT.",
        url: "https://e-consultaruc.sunat.gob.pe/cl-ti-itmenu/MenuInternet.jsp",
        category: "SUNAT"
    },
    {
        title: "Consulta de Validez de Comprobantes",
        description: "Comprueba si una factura o boleta electrónica es válida.",
        url: "https://www.sunat.gob.pe/ol-ti-itconsvalicpe/ConsValiCpe.htm",
        category: "SUNAT"
    },
    {
        title: "AFPnet",
        description: "Plataforma para la declaración y pago de aportes a las AFP.",
        url: "https://www.afpnet.com.pe/",
        category: "Laboral"
    },
    {
        title: "PLAME (PDT)",
        description: "Descarga el Programa de Declaración Telemática para la planilla electrónica.",
        url: "https://www.sunat.gob.pe/descarga-plame/index.html",
        category: "SUNAT"
    },
    {
        title: "Consulta de Trabajadores en T-Registro",
        description: "Verifica si un trabajador está registrado en la planilla electrónica.",
        url: "https://www.sunat.gob.pe/ol-ti-itconsvalitreg/ConsValiTReg.htm",
        category: "Laboral"
    },
    {
        title: "Tipo de Cambio SBS",
        description: "Consulta el tipo de cambio oficial de la Superintendencia de Banca y Seguros.",
        url: "https://www.sbs.gob.pe/app/pp/sistip_portal/paginas/publicacion/tipocambiopromedio.aspx",
        category: "Financiero"
    },
    {
        title: "Normas Legales - El Peruano",
        description: "Accede al diario oficial para consultar las últimas normativas publicadas.",
        url: "https://busquedas.elperuano.pe/normaslegales/",
        category: "Legal"
    },
    {
        title: "INDECOPI - Búsqueda de Marcas",
        description: "Busca si una marca ya se encuentra registrada en el Perú.",
        url: "https://www.indecopi.gob.pe/es/busca-tu-marca",
        category: "Legal"
    }
];

const categories = [...new Set(links.map(link => link.category))];

export function AccesosRapidos() {
    return (
        <Card className="flex flex-col h-full">
            <CardHeader>
                <CardTitle>Accesos Rápidos</CardTitle>
                <CardDescription>Una colección de enlaces útiles para profesionales y estudiantes de contabilidad en Perú.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6 flex-grow">
                {categories.map(category => (
                    <div key={category}>
                        <h3 className="text-xl font-semibold mb-4 text-primary">{category}</h3>
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
                            {links.filter(link => link.category === category).map(link => (
                                <LinkCard key={link.title} {...link} />
                            ))}
                        </div>
                    </div>
                ))}
            </CardContent>
            <CardFooter>
                 <p className="text-xs text-muted-foreground w-full text-center">
                </p>
            </CardFooter>
        </Card>
    );
}

interface LinkCardProps {
    title: string;
    description: string;
    url: string;
}

const LinkCard = ({ title, description, url }: LinkCardProps) => (
    <Card className="flex flex-col h-full">
        <CardHeader className="pb-3">
            <CardTitle className="text-base sm:text-lg leading-tight">{title}</CardTitle>
        </CardHeader>
        <CardContent className="flex-grow pb-3">
            <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">{description}</p>
        </CardContent>
        <CardContent className="pt-0">
             <Button asChild className="w-full text-xs sm:text-sm h-8 sm:h-9">
                <a href={url} target="_blank" rel="noopener noreferrer">
                    Ir al sitio <ArrowUpRight className="ml-1 sm:ml-2 h-3 w-3 sm:h-4 sm:w-4" />
                </a>
            </Button>
        </CardContent>
    </Card>
);
