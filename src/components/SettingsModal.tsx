"use client"

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { 
  Settings, 
  Info, 
  Calculator, 
  TrendingUp, 
  FileText, 
  Search, 
  Keyboard, 
  Mail, 
  ExternalLink,
  Lightbulb,
  BookOpen,
  Zap,
  Shield,
  Clock,
  Users
} from "lucide-react"
import { ThemeToggle } from "./ThemeToggle"
import { Label } from "./ui/label"

export function SettingsModal() {
  const tools = [
    {
      name: "Dashboard Financiero",
      description: "Visualiza y analiza tus métricas financieras con gráficos interactivos y reportes detallados.",
      icon: TrendingUp,
      category: "Análisis"
    },
    {
      name: "Calculadora de Préstamos",
      description: "Calcula cuotas, intereses y genera tablas de amortización para diferentes tipos de préstamos.",
      icon: Calculator,
      category: "Calculadoras"
    },
    {
      name: "Asientos Contables",
      description: "Genera y gestiona asientos contables automáticamente con validaciones integradas.",
      icon: FileText,
      category: "Contabilidad"
    },
    {
      name: "Consulta RUC/DNI",
      description: "Verifica información de contribuyentes mediante consultas a bases de datos oficiales.",
      icon: Search,
      category: "Consultas"
    }
  ]



  const tips = [
    {
      title: "Modo Oscuro",
      description: "Cambia entre tema claro y oscuro para reducir la fatiga visual durante sesiones largas.",
      icon: Shield
    },
    {
      title: "Datos Persistentes",
      description: "Tus cálculos y configuraciones se guardan automáticamente en tu navegador.",
      icon: Clock
    },
    {
      title: "Responsive Design",
      description: "Todas las herramientas están optimizadas para funcionar en móviles y tablets.",
      icon: Zap
    },
    {
      title: "Extensión Chrome",
      description: "Instala nuestra extensión para acceso rápido desde cualquier página web.",
      icon: ExternalLink
    }
  ]

  const getCurrentDate = () => {
    const now = new Date();
    const months = [
      'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
      'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
    ];
    return `${months[now.getMonth()]} ${now.getFullYear()}`;
  };

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="ghost" size="icon">
          <Settings className="h-5 w-5" />
          <span className="sr-only">Abrir información y ayuda</span>
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[800px] max-h-[90vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Info className="h-5 w-5" />
            Centro de Ayuda e Información
          </DialogTitle>
          <DialogDescription>
            Descubre todas las funcionalidades y aprende a sacar el máximo provecho de nuestras herramientas contables.
          </DialogDescription>
        </DialogHeader>
        
        <Tabs defaultValue="overview" className="w-full">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="overview">Resumen</TabsTrigger>
            <TabsTrigger value="tools">Herramientas</TabsTrigger>
            <TabsTrigger value="tips">Consejos</TabsTrigger>
            <TabsTrigger value="settings">Ajustes</TabsTrigger>
          </TabsList>
          
          <ScrollArea className="h-[500px] w-full">
            <TabsContent value="overview" className="space-y-4 mt-4">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <BookOpen className="h-5 w-5" />
                    Bienvenido a Herramientas Contables Biluz
                  </CardTitle>
                  <CardDescription>
                    Tu suite completa de herramientas financieras y contables
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <h4 className="font-semibold flex items-center gap-2">
                        <Zap className="h-4 w-4" />
                        Características Principales
                      </h4>
                      <ul className="text-sm space-y-1 text-muted-foreground">
                        <li>• Calculadoras financieras avanzadas</li>
                        <li>• Dashboard con métricas en tiempo real</li>
                        <li>• Generación automática de reportes</li>
                        <li>• Consultas a bases de datos oficiales</li>
                        <li>• Interfaz responsive y moderna</li>
                      </ul>
                    </div>
                    <div className="space-y-2">
                      <h4 className="font-semibold flex items-center gap-2">
                        <Users className="h-4 w-4" />
                        Ideal Para
                      </h4>
                      <ul className="text-sm space-y-1 text-muted-foreground">
                        <li>• Contadores y asesores fiscales</li>
                        <li>• Empresarios y emprendedores</li>
                        <li>• Estudiantes de contabilidad</li>
                        <li>• Profesionales financieros</li>
                        <li>• Cualquier persona que maneje finanzas</li>
                      </ul>
                    </div>
                  </div>
                  
                  <Separator />
                  
                  <div className="bg-gradient-to-r from-primary/10 to-accent/10 p-4 rounded-lg">
                    <h4 className="font-semibold mb-2 flex items-center gap-2">
                      <Lightbulb className="h-4 w-4" />
                      ¿Sabías que?
                    </h4>
                    <p className="text-sm text-muted-foreground">
                      Puedes usar nuestra extensión de Chrome para acceder rápidamente a todas las herramientas 
                      desde cualquier página web. ¡Instálala desde el dashboard principal!
                    </p>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
             
             <TabsContent value="tools" className="space-y-4 mt-4">
               <Card>
                 <CardHeader>
                   <CardTitle className="flex items-center gap-2">
                     <Calculator className="h-5 w-5" />
                     Guía de Herramientas
                   </CardTitle>
                   <CardDescription>
                     Conoce en detalle cada una de nuestras herramientas y sus funcionalidades
                   </CardDescription>
                 </CardHeader>
                 <CardContent>
                   <div className="grid gap-4">
                     {tools.map((tool, index) => {
                       const IconComponent = tool.icon
                       return (
                         <div key={index} className="flex items-start gap-4 p-4 border rounded-lg hover:bg-muted/50 transition-colors">
                           <div className="bg-primary/10 p-2 rounded-lg">
                             <IconComponent className="h-5 w-5 text-primary" />
                           </div>
                           <div className="flex-1 space-y-1">
                             <div className="flex items-center gap-2">
                               <h4 className="font-semibold">{tool.name}</h4>
                               <Badge variant="secondary" className="text-xs">{tool.category}</Badge>
                             </div>
                             <p className="text-sm text-muted-foreground">{tool.description}</p>
                           </div>
                         </div>
                       )
                     })}
                   </div>
                 </CardContent>
               </Card>
             </TabsContent>
             

             
             <TabsContent value="tips" className="space-y-4 mt-4">
               <Card>
                 <CardHeader>
                   <CardTitle className="flex items-center gap-2">
                     <Lightbulb className="h-5 w-5" />
                     Consejos y Trucos
                   </CardTitle>
                   <CardDescription>
                     Maximiza tu productividad con estos consejos útiles
                   </CardDescription>
                 </CardHeader>
                 <CardContent>
                   <div className="grid gap-4">
                     {tips.map((tip, index) => {
                       const IconComponent = tip.icon
                       return (
                         <div key={index} className="flex items-start gap-4 p-4 border rounded-lg">
                           <div className="bg-accent/10 p-2 rounded-lg">
                             <IconComponent className="h-5 w-5 text-accent" />
                           </div>
                           <div className="flex-1 space-y-1">
                             <h4 className="font-semibold">{tip.title}</h4>
                             <p className="text-sm text-muted-foreground">{tip.description}</p>
                           </div>
                         </div>
                       )
                     })}
                   </div>
                   

                 </CardContent>
               </Card>
             </TabsContent>
             
             <TabsContent value="settings" className="space-y-4 mt-4">
               <Card>
                 <CardHeader>
                   <CardTitle className="flex items-center gap-2">
                     <Settings className="h-5 w-5" />
                     Configuración y Soporte
                   </CardTitle>
                   <CardDescription>
                     Personaliza tu experiencia y encuentra ayuda cuando la necesites
                   </CardDescription>
                 </CardHeader>
                 <CardContent className="space-y-6">
                   <div className="grid grid-cols-4 items-center gap-4">
                     <Label htmlFor="theme" className="text-right font-semibold">
                       Apariencia
                     </Label>
                     <div id="theme" className="col-span-3">
                       <div className="relative">
                         <ThemeToggle />
                       </div>
                     </div>
                   </div>
                   
                   <Separator />
                   
                   <div className="space-y-4">
                     <h4 className="font-semibold flex items-center gap-2">
                       <Mail className="h-4 w-4" />
                       Contacto y Soporte
                     </h4>
                     
                     <div className="grid gap-3">
                       <div className="flex items-center justify-between p-3 border rounded-lg">
                         <div>
                           <p className="font-medium">Soporte Técnico</p>
                           <p className="text-sm text-muted-foreground">¿Tienes problemas técnicos?</p>
                         </div>
                         <Button variant="outline" size="sm">
                           <Mail className="h-4 w-4 mr-2" />
                           Contactar
                         </Button>
                       </div>
                       
                       <div className="flex items-center justify-between p-3 border rounded-lg">
                         <div>
                           <p className="font-medium">Sugerencias</p>
                           <p className="text-sm text-muted-foreground">Comparte tus ideas para mejorar</p>
                         </div>
                         <Button variant="outline" size="sm">
                           <Lightbulb className="h-4 w-4 mr-2" />
                           Enviar Idea
                         </Button>
                       </div>
                       
                       <div className="flex items-center justify-between p-3 border rounded-lg">
                         <div>
                           <p className="font-medium">Documentación</p>
                           <p className="text-sm text-muted-foreground">Guías completas y tutoriales</p>
                         </div>
                         <Button variant="outline" size="sm">
                           <BookOpen className="h-4 w-4 mr-2" />
                           Ver Docs
                         </Button>
                       </div>
                     </div>
                   </div>
                   
                   <Separator />
                   
                   <div className="bg-muted/50 p-4 rounded-lg">
                     <h4 className="font-semibold mb-2">Información de la Aplicación</h4>
                     <div className="text-sm text-muted-foreground space-y-1">
                       <p>Versión: 1.9</p>
                       <p>Última actualización: {getCurrentDate()}</p>
                       <p>Desarrollado por: BillCode</p>
                     </div>
                   </div>
                 </CardContent>
               </Card>
             </TabsContent>
           </ScrollArea>
         </Tabs>
       </DialogContent>
     </Dialog>
   )
 }
