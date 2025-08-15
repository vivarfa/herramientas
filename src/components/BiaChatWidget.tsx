"use client"

import React, { useState, useRef, useEffect } from 'react'
import Image from 'next/image'
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Button } from "@/components/ui/button"
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Send, Bot, User, AlertTriangle, RotateCw, MessageCircle, Loader2 } from 'lucide-react'
import { useLocalStorage } from '@/hooks/use-local-storage'
import { accountingQA, type AccountingQAInput } from '@/ai/flows/accounting-qa'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Skeleton } from '@/components/ui/skeleton'
import { cn } from '@/lib/utils'
import { useIsMobile } from '@/hooks/use-mobile'
import { motion } from 'framer-motion'

type Message = {
  role: 'user' | 'assistant'
  content: string
}

const DAILY_LIMIT = 100;

export function BiaChatWidget() {
  const isMobile = useIsMobile();
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useLocalStorage<Message[]>('biaChatHistory', []);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [usage, setUsage] = useLocalStorage('biaUsage', { count: 0, date: new Date().toISOString().split('T')[0] });
  
  const scrollAreaRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollAreaRef.current) {
      scrollAreaRef.current.scrollTo({
        top: scrollAreaRef.current.scrollHeight,
        behavior: 'smooth',
      });
    }
  }, [messages, isOpen]);

  useEffect(() => {
    const today = new Date().toISOString().split('T')[0];
    if (usage.date !== today) {
      setUsage({ count: 0, date: today });
    }
  }, [usage.date, setUsage]);

  const canQuery = usage.count < DAILY_LIMIT;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading || !canQuery) return;

    const userMessage: Message = { role: 'user', content: input };
    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    try {
      const history = messages.slice(-6);
      const aiInput: AccountingQAInput = { query: input, history };
      const result = await accountingQA(aiInput);
      
      const assistantMessage: Message = { role: 'assistant', content: result.answer };
      setMessages(prev => [...prev, assistantMessage]);
      
      const today = new Date().toISOString().split('T')[0];
      setUsage(prev => ({
        count: prev.date === today ? prev.count + 1 : 1,
        date: today
      }));

    } catch (error) {
      console.error('Error en BiaChatWidget:', error);
      let errorContent = 'Lo siento, ha ocurrido un error al procesar tu pregunta.';
      
      if (error instanceof Error) {
        if (error.message.includes('API key') || error.message.includes('GOOGLE_GENAI_API_KEY')) {
          errorContent = '🔑 La API key de Google AI no está configurada. Por favor, configura GOOGLE_GENAI_API_KEY en el archivo .env.local para que pueda funcionar correctamente.';
        } else if (error.message.includes('network') || error.message.includes('fetch')) {
          errorContent = '🌐 Error de conexión. Verifica tu conexión a internet e inténtalo de nuevo.';
        } else {
          errorContent = `❌ Error: ${error.message}. Inténtalo de nuevo más tarde.`;
        }
      }
      
      const errorMessage: Message = { role: 'assistant', content: errorContent };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  }

  const handleNewChat = () => {
    setMessages([]);
  }

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          size="icon"
          className={cn(
            "fixed z-50 h-16 w-16 rounded-full shadow-xl bg-white hover:bg-gray-50 transition-all duration-300 border-2 border-blue-200 p-1",
            isMobile ? "bottom-20 right-4" : "bottom-6 right-6"
          )}
          aria-label="Abrir chat de B-IA"
        >
          <motion.div
            animate={{
              scale: [1, 1.05, 1],
              rotate: [0, 2, -2, 0]
            }}
            transition={{
              duration: 3,
              repeat: Infinity,
              repeatType: "reverse"
            }}
            className="w-full h-full flex items-center justify-center"
          >
            <Image
              src="/biluz-robot.png"
              alt="B-IA Robot"
              width={48}
              height={48}
              className="rounded-full"
            />
          </motion.div>
        </Button>
      </PopoverTrigger>
      <PopoverContent
        side="top"
        align="end"
        className="w-[400px] h-[600px] p-0 border-none rounded-lg shadow-2xl mr-2 mb-2"
        onOpenAutoFocus={(e) => e.preventDefault()}
      >
        <Card className="h-full flex flex-col border-none">
          <CardHeader className="flex-shrink-0 bg-primary text-primary-foreground rounded-t-lg">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>B-IA: Tu Aliado Inteligente</CardTitle>
                <CardDescription className="text-primary-foreground/80">Respondo tus preguntas de contabilidad.</CardDescription>
              </div>
              <Button variant="ghost" size="icon" onClick={handleNewChat} className="text-primary-foreground hover:bg-primary-foreground/10 hover:text-primary-foreground">
                <RotateCw className="w-4 h-4"/>
                <span className="sr-only">Nuevo Chat</span>
              </Button>
            </div>
          </CardHeader>
          <CardContent className="flex-grow overflow-hidden flex flex-col p-0">
            <ScrollArea className="h-full flex-grow p-4" ref={scrollAreaRef}>
              <div className="space-y-4">
                 {messages.length === 0 && (
                  <div className="text-center text-muted-foreground p-8 flex flex-col items-center">
                    <div className="mb-4">
                      <Image
                        src="/biluz-robot.png"
                        alt="B-IA Robot"
                        width={48}
                        height={48}
                        className="rounded-full"
                      />
                    </div>
                    <p>¡Hola! Soy B-IA, tu asistente contable.</p>
                    <p>¿En qué puedo ayudarte hoy?</p>
                  </div>
                 )}
                {messages.map((message, index) => (
                  <div key={index} className={cn("flex items-start gap-3", message.role === 'user' ? 'justify-end' : 'justify-start')}>
                    {message.role === 'assistant' && (
                      <div className="w-8 h-8 rounded-full overflow-hidden flex-shrink-0">
                        <Image
                          src="/biluz-robot.png"
                          alt="B-IA Robot"
                          width={32}
                          height={32}
                          className="w-full h-full object-cover"
                        />
                      </div>
                    )}
                    <div className={cn("max-w-[80%] rounded-lg p-3 text-sm", message.role === 'user' ? 'bg-primary text-primary-foreground' : 'bg-muted')}>
                      <p className="whitespace-pre-wrap">{message.content}</p>
                    </div>
                    {message.role === 'user' && (
                      <Avatar className="w-8 h-8"><AvatarFallback><User className="w-5 h-5"/></AvatarFallback></Avatar>
                    )}
                  </div>
                ))}
                {isLoading && (
                  <div className="flex items-start gap-3 justify-start">
                    <div className="w-8 h-8 rounded-full overflow-hidden flex-shrink-0">
                      <Image
                        src="/biluz-robot.png"
                        alt="B-IA Robot"
                        width={32}
                        height={32}
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <div className="bg-muted rounded-lg p-3 space-y-2">
                      <Skeleton className="h-4 w-[180px]" />
                      <Skeleton className="h-4 w-[150px]" />
                    </div>
                  </div>
                )}
              </div>
            </ScrollArea>
          </CardContent>
          <CardFooter className="flex-shrink-0 border-t pt-4 flex-col items-start gap-2">
            {!canQuery && (
              <div className="w-full text-center text-xs text-destructive p-1 rounded-md bg-destructive/10">
                Límite de {DAILY_LIMIT} consultas diarias alcanzado.
              </div>
            )}
            <form onSubmit={handleSubmit} className="flex w-full items-start space-x-2">
              <Textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Escribe tu pregunta..."
                className="flex-grow resize-none"
                rows={1}
                disabled={isLoading || !canQuery}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleSubmit(e);
                  }
                }}
              />
              <Button type="submit" disabled={isLoading || !canQuery || !input.trim()} size="icon">
                <Send className="h-4 w-4" />
                <span className="sr-only">Enviar</span>
              </Button>
            </form>
            <p className="text-xs text-muted-foreground text-center w-full">
              Límite: {usage.count}/{DAILY_LIMIT} consultas. B-IA puede cometer errores.
            </p>
          </CardFooter>
        </Card>
      </PopoverContent>
    </Popover>
  )
}
