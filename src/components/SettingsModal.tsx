"use client"

import { useState } from "react"
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
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
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
  Users,
  Send,
  Heart,
  CreditCard,
  X
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

  // Estados para el minichat de soporte
  const [showSupportChat, setShowSupportChat] = useState(false)
  const [showSuggestionForm, setShowSuggestionForm] = useState(false)
  const [supportMessage, setSupportMessage] = useState('')
  const [suggestionMessage, setSuggestionMessage] = useState('')
  const [userEmail, setUserEmail] = useState('')
  const [userName, setUserName] = useState('')

  // Función para enviar mensaje de soporte
  const handleSendSupport = () => {
    const subject = encodeURIComponent('Soporte Técnico - Herramientas Contables Biluz')
    const body = encodeURIComponent(`Nombre: ${userName}\nEmail: ${userEmail}\n\nMensaje:\n${supportMessage}`)
    window.open(`mailto:avivarfa@gmail.com?subject=${subject}&body=${body}`)
    setSupportMessage('')
    setUserEmail('')
    setUserName('')
    setShowSupportChat(false)
  }

  // Función para enviar sugerencia
  const handleSendSuggestion = () => {
    const subject = encodeURIComponent('Sugerencia - Herramientas Contables Biluz')
    const body = encodeURIComponent(`Nombre: ${userName}\nEmail: ${userEmail}\n\nSugerencia:\n${suggestionMessage}`)
    window.open(`mailto:avivarfa@gmail.com?subject=${subject}&body=${body}`)
    setSuggestionMessage('')
    setUserEmail('')
    setUserName('')
    setShowSuggestionForm(false)
  }

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
                       <div className="space-y-3">
                         <div className="flex items-center justify-between p-3 border rounded-lg">
                           <div>
                             <p className="font-medium">Soporte Técnico</p>
                             <p className="text-sm text-muted-foreground">¿Tienes problemas técnicos?</p>
                           </div>
                           <Button 
                             variant="outline" 
                             size="sm"
                             onClick={() => setShowSupportChat(!showSupportChat)}
                           >
                             <Mail className="h-4 w-4 mr-2" />
                             Contactar
                           </Button>
                         </div>
                         
                         {showSupportChat && (
                           <div className="p-4 border rounded-lg bg-muted/20 space-y-3">
                             <div className="flex items-center justify-between">
                               <h5 className="font-medium">Formulario de Soporte</h5>
                               <Button 
                                 variant="ghost" 
                                 size="sm"
                                 onClick={() => setShowSupportChat(false)}
                               >
                                 <X className="h-4 w-4" />
                               </Button>
                             </div>
                             <div className="space-y-3">
                               <div>
                                 <Label htmlFor="support-name">Nombre</Label>
                                 <Input
                                   id="support-name"
                                   placeholder="Tu nombre"
                                   value={userName}
                                   onChange={(e) => setUserName(e.target.value)}
                                 />
                               </div>
                               <div>
                                 <Label htmlFor="support-email">Email</Label>
                                 <Input
                                   id="support-email"
                                   type="email"
                                   placeholder="tu@email.com"
                                   value={userEmail}
                                   onChange={(e) => setUserEmail(e.target.value)}
                                 />
                               </div>
                               <div>
                                 <Label htmlFor="support-message">Describe tu problema</Label>
                                 <Textarea
                                   id="support-message"
                                   placeholder="Describe detalladamente el problema que estás experimentando..."
                                   value={supportMessage}
                                   onChange={(e) => setSupportMessage(e.target.value)}
                                   rows={4}
                                 />
                               </div>
                               <Button 
                                 onClick={handleSendSupport}
                                 disabled={!userName || !userEmail || !supportMessage}
                                 className="w-full"
                               >
                                 <Send className="h-4 w-4 mr-2" />
                                 Enviar Mensaje
                               </Button>
                             </div>
                           </div>
                         )}
                       </div>
                       
                       <div className="space-y-3">
                         <div className="flex items-center justify-between p-3 border rounded-lg">
                           <div>
                             <p className="font-medium">Sugerencias</p>
                             <p className="text-sm text-muted-foreground">Comparte tus ideas para mejorar</p>
                           </div>
                           <Button 
                             variant="outline" 
                             size="sm"
                             onClick={() => setShowSuggestionForm(!showSuggestionForm)}
                           >
                             <Lightbulb className="h-4 w-4 mr-2" />
                             Enviar Idea
                           </Button>
                         </div>
                         
                         {showSuggestionForm && (
                           <div className="p-4 border rounded-lg bg-muted/20 space-y-3">
                             <div className="flex items-center justify-between">
                               <h5 className="font-medium">Formulario de Sugerencias</h5>
                               <Button 
                                 variant="ghost" 
                                 size="sm"
                                 onClick={() => setShowSuggestionForm(false)}
                               >
                                 <X className="h-4 w-4" />
                               </Button>
                             </div>
                             <div className="space-y-3">
                               <div>
                                 <Label htmlFor="suggestion-name">Nombre</Label>
                                 <Input
                                   id="suggestion-name"
                                   placeholder="Tu nombre"
                                   value={userName}
                                   onChange={(e) => setUserName(e.target.value)}
                                 />
                               </div>
                               <div>
                                 <Label htmlFor="suggestion-email">Email</Label>
                                 <Input
                                   id="suggestion-email"
                                   type="email"
                                   placeholder="tu@email.com"
                                   value={userEmail}
                                   onChange={(e) => setUserEmail(e.target.value)}
                                 />
                               </div>
                               <div>
                                 <Label htmlFor="suggestion-message">Tu sugerencia</Label>
                                 <Textarea
                                   id="suggestion-message"
                                   placeholder="Comparte tu idea para mejorar nuestras herramientas..."
                                   value={suggestionMessage}
                                   onChange={(e) => setSuggestionMessage(e.target.value)}
                                   rows={4}
                                 />
                               </div>
                               <Button 
                                 onClick={handleSendSuggestion}
                                 disabled={!userName || !userEmail || !suggestionMessage}
                                 className="w-full"
                               >
                                 <Send className="h-4 w-4 mr-2" />
                                 Enviar Sugerencia
                               </Button>
                             </div>
                           </div>
                         )}
                       </div>
                       
                       <div className="space-y-3">
                         <div className="p-3 border rounded-lg">
                           <div className="mb-3">
                             <p className="font-medium flex items-center gap-2">
                               <Heart className="h-4 w-4 text-red-500" />
                               Apoya Nuestro Trabajo
                             </p>
                             <p className="text-sm text-muted-foreground">Tu apoyo nos ayuda a seguir mejorando estas herramientas</p>
                           </div>
                           
                           <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                             <Button 
                               variant="outline" 
                               className="h-auto p-4 flex flex-col items-center gap-2"
                               onClick={() => window.open('https://link.mercadopago.com.pe/vivarfa', '_blank')}
                             >
                               <CreditCard className="h-6 w-6 text-blue-600" />
                               <div className="text-center">
                                 <p className="font-medium">MercadoPago</p>
                                 <p className="text-xs text-muted-foreground">Pago seguro en Perú</p>
                               </div>
                             </Button>
                             
                             <Button 
                               variant="outline" 
                               className="h-auto p-4 flex flex-col items-center gap-2"
                               onClick={() => window.open('https://paypal.me/billcode', '_blank')}
                             >
                               <CreditCard className="h-6 w-6 text-blue-500" />
                               <div className="text-center">
                                 <p className="font-medium">PayPal</p>
                                 <p className="text-xs text-muted-foreground">Pago internacional</p>
                               </div>
                             </Button>
                           </div>
                         </div>
                       </div>
                     </div>
                   </div>
                   
                   <Separator />
                   
                   <div className="bg-muted/50 p-4 rounded-lg">
                       <h4 className="font-semibold mb-2">Información de la Aplicación</h4>
                       <div className="text-sm text-muted-foreground space-y-1">
                         <p>Versión: 2.0</p>
                         <p>Última actualización: {getCurrentDate()}</p>
                         <p>
                           Desarrollado por:{' '}
                           <button
                             onClick={() => window.open('https://www.billcodex.com', '_blank')}
                             className="text-primary hover:underline font-medium cursor-pointer"
                           >
                             BillCodex
                           </button>
                         </p>
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
