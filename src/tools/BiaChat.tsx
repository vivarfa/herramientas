"use client"

import React, { useState, useRef, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Textarea } from '@/components/ui/textarea'
import { Button } from '@/components/ui/button'
import { Send, Bot, User, AlertTriangle, RotateCw } from 'lucide-react'
import { useLocalStorage } from '@/hooks/use-local-storage'
import { accountingQA, type AccountingQAInput } from '@/ai/flows/accounting-qa'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Skeleton } from '@/components/ui/skeleton'
import { cn } from '@/lib/utils'

type Message = {
  role: 'user' | 'assistant'
  content: string
}

const DAILY_LIMIT = 100

export function BiaChat() {
  const [messages, setMessages] = useLocalStorage<Message[]>('biaChatHistory', [])
  const [input, setInput] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [usage, setUsage] = useLocalStorage('biaUsage', { count: 0, date: new Date().toISOString().split('T')[0] })
  
  const scrollAreaRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (scrollAreaRef.current) {
      scrollAreaRef.current.scrollTo({
        top: scrollAreaRef.current.scrollHeight,
        behavior: 'smooth',
      });
    }
  }, [messages])

  useEffect(() => {
    const today = new Date().toISOString().split('T')[0];
    if (usage.date !== today) {
      setUsage({ count: 0, date: today });
    }
  }, [usage.date, setUsage]);

  const canQuery = usage.count < DAILY_LIMIT;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!input.trim() || isLoading || !canQuery) return

    const userMessage: Message = { role: 'user', content: input }
    setMessages(prev => [...prev, userMessage])
    setInput('')
    setIsLoading(true)

    try {
      const history = messages.slice(-6)
      const aiInput: AccountingQAInput = { query: input, history }
      const result = await accountingQA(aiInput)
      
      const assistantMessage: Message = { role: 'assistant', content: result.answer }
      setMessages(prev => [...prev, assistantMessage])
      
      const today = new Date().toISOString().split('T')[0];
      setUsage(prev => ({
        count: prev.date === today ? prev.count + 1 : 1,
        date: today
      }));

    } catch (error) {
      console.error(error)
      const errorMessage: Message = { role: 'assistant', content: 'Lo siento, ha ocurrido un error al procesar tu pregunta.' }
      setMessages(prev => [...prev, errorMessage])
    } finally {
      setIsLoading(false)
    }
  }

  const handleNewChat = () => {
    setMessages([]);
  }

  return (
    <Card className="h-full flex flex-col">
      <CardHeader className="flex-shrink-0">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>B-IA: Tu Aliado Inteligente</CardTitle>
            <CardDescription>Experto en contabilidad peruana, finanzas y tributación.</CardDescription>
          </div>
          <Button variant="outline" size="sm" onClick={handleNewChat}>
            <RotateCw className="w-4 h-4 mr-2"/>
            Nuevo Chat
          </Button>
        </div>
      </CardHeader>
      <CardContent className="flex-grow overflow-hidden flex flex-col p-0">
        <ScrollArea className="h-full flex-grow p-4" ref={scrollAreaRef}>
          <div className="space-y-4">
            {messages.map((message, index) => (
              <div
                key={index}
                className={cn(
                  "flex items-start gap-4",
                  message.role === 'user' ? 'justify-end' : 'justify-start'
                )}
              >
                {message.role === 'assistant' && (
                  <Avatar>
                    <AvatarFallback><Bot /></AvatarFallback>
                  </Avatar>
                )}
                <div className={cn(
                  "max-w-prose rounded-lg p-3",
                  message.role === 'user' ? 'bg-primary text-primary-foreground' : 'bg-muted'
                )}>
                  <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                </div>
                {message.role === 'user' && (
                  <Avatar>
                    <AvatarFallback><User /></AvatarFallback>
                  </Avatar>
                )}
              </div>
            ))}
            {isLoading && (
               <div className="flex items-start gap-4 justify-start">
                  <Avatar>
                    <AvatarFallback><Bot /></AvatarFallback>
                  </Avatar>
                  <div className="bg-muted rounded-lg p-3 space-y-2">
                    <Skeleton className="h-4 w-[250px]" />
                    <Skeleton className="h-4 w-[200px]" />
                  </div>
              </div>
            )}
          </div>
        </ScrollArea>
      </CardContent>
      <CardFooter className="flex-shrink-0 border-t pt-6 flex-col items-start gap-4">
         {!canQuery && (
          <div className="w-full text-center text-sm text-destructive p-2 rounded-md bg-destructive/10">
            Has alcanzado el límite de {DAILY_LIMIT} consultas diarias. Vuelve mañana.
          </div>
        )}
        <form onSubmit={handleSubmit} className="flex w-full items-start space-x-2">
          <Textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Escribe tu consulta contable aquí..."
            className="flex-grow resize-none"
            rows={1}
            disabled={isLoading || !canQuery}
          />
          <Button type="submit" disabled={isLoading || !canQuery}>
            <Send className="h-4 w-4" />
            <span className="sr-only">Enviar</span>
          </Button>
        </form>
        <p className="text-xs text-muted-foreground flex items-center gap-1">
          <AlertTriangle className="h-3 w-3" />
          B-IA puede cometer errores. Considera verificar la información importante. Límite: {usage.count}/{DAILY_LIMIT} consultas diarias.
        </p>
      </CardFooter>
    </Card>
  )
}
