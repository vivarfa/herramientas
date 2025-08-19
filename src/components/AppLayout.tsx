"use client"

import * as React from "react"
import { motion } from "framer-motion"
import Image from "next/image"
import {
  Sidebar,
  SidebarContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarProvider,
  SidebarTrigger,
  SidebarInset,
  SidebarFooter,
  SidebarRail,
} from "@/components/ui/sidebar"
import { tools } from "@/lib/tools"
import { SettingsModal } from "./SettingsModal"
import { useIsMobile } from "@/hooks/use-mobile"
import { cn } from "@/lib/utils"

interface AppLayoutProps {
  children: React.ReactNode
  activeToolId: string
  onToolSelect: (id: string) => void
}

export function AppLayout({ children, activeToolId, onToolSelect }: AppLayoutProps) {
  const isMobile = useIsMobile()
  
  return (
    <SidebarProvider defaultOpen={true}>
      <Sidebar collapsible="icon" variant="sidebar" className={cn(isMobile && "hidden")}>
        <SidebarHeader>
          <motion.div 
            className="flex items-center justify-between"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5 }}
          >
            <div className="flex items-center gap-2">
              <motion.div
                whileHover={{ scale: 1.1, rotate: 5 }}
                transition={{ type: "spring", stiffness: 300 }}
                className="flex-shrink-0"
              >
                <Image
                  src="/logo.png"
                  alt="BILUZ Logo"
                  width={32}
                  height={32}
                  className="rounded-md"
                />
              </motion.div>
              <motion.h1 
                className="text-xl font-bold text-primary group-data-[collapsible=icon]:hidden"
                whileHover={{ scale: 1.05 }}
                transition={{ type: "spring", stiffness: 300 }}
              >
                BILUZ
              </motion.h1>
            </div>
            <SidebarTrigger />
          </motion.div>
        </SidebarHeader>
        <SidebarContent>
          <SidebarMenu>
            {tools.map((tool, index) => (
              <motion.div
                key={tool.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.3, delay: index * 0.05 }}
              >
                <SidebarMenuItem>
                  <motion.div
                    whileHover={{ scale: 1.02, x: 4 }}
                    whileTap={{ scale: 0.98 }}
                    transition={{ type: "spring", stiffness: 300, damping: 20 }}
                  >
                    <SidebarMenuButton
                      isActive={activeToolId === tool.id}
                      onClick={() => onToolSelect(tool.id)}
                      tooltip={tool.name}
                    >
                      <motion.div
                        whileHover={{ rotate: 5 }}
                        transition={{ type: "spring", stiffness: 300 }}
                      >
                        {tool.icon}
                      </motion.div>
                      <span>{tool.name}</span>
                    </SidebarMenuButton>
                  </motion.div>
                </SidebarMenuItem>
              </motion.div>
            ))}
          </SidebarMenu>
        </SidebarContent>
        <SidebarFooter className="group-data-[collapsible=icon]:justify-center settings-overlay">
            <SettingsModal />
        </SidebarFooter>
        <SidebarRail />
      </Sidebar>
      <SidebarInset>
          <header className="flex h-16 shrink-0 items-center gap-2 transition-[width,height] ease-linear group-has-[[data-collapsible=icon]]/sidebar-wrapper:h-12">
            <div className="flex items-center gap-2 px-4">
              <SidebarTrigger className="-ml-1" />
            </div>
          </header>
          <div className={cn(
            "flex flex-1 flex-col gap-4 p-4 pt-0",
            isMobile && "pb-20"
          )}>
            {children}
          </div>
          
          {/* Pie de página */}
          <footer className="border-t bg-background/95 backdrop-blur-sm px-4 py-3">
            <p className="text-xs text-muted-foreground text-center">
              © {new Date().getFullYear()} BILUZ - Todos los Derechos Reservados
            </p>
          </footer>
        </SidebarInset>
      
      {/* Mobile Bottom Navigation */}
      {isMobile && (
        <div className="fixed bottom-0 left-0 right-0 z-50 bg-background/95 backdrop-blur-sm border-t border-border shadow-lg">
          <div className="overflow-x-auto scrollbar-hide">
            <div className="flex items-center gap-1 py-2 px-2 min-w-max">
              {tools.map((tool) => (
                <motion.button
                  key={tool.id}
                  onClick={() => onToolSelect(tool.id)}
                  className={cn(
                    "flex flex-col items-center justify-center p-2 rounded-xl transition-all duration-200 flex-shrink-0",
                    "min-w-[70px] h-16",
                    activeToolId === tool.id
                      ? "bg-primary text-primary-foreground shadow-md"
                      : "text-muted-foreground hover:text-foreground hover:bg-accent/50"
                  )}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3 }}
                >
                  <motion.div
                    className={cn(
                      "p-1.5 rounded-lg transition-all duration-200",
                      activeToolId === tool.id
                        ? "bg-primary-foreground/20 text-primary-foreground"
                        : "text-muted-foreground"
                    )}
                    animate={{
                      scale: activeToolId === tool.id ? 1.15 : 1,
                      rotate: activeToolId === tool.id ? [0, 5, -5, 0] : 0
                    }}
                    transition={{ duration: 0.3 }}
                  >
                    {React.cloneElement(tool.icon as React.ReactElement, { 
                      className: "h-5 w-5" 
                    })}
                  </motion.div>
                  <span className={cn(
                    "text-[10px] font-medium mt-0.5 text-center leading-tight max-w-[60px] truncate",
                    activeToolId === tool.id ? "text-primary-foreground" : "text-muted-foreground"
                  )}>
                    {tool.name.split(' ')[0]}
                  </span>
                </motion.button>
              ))}
            </div>
          </div>
        </div>
      )}
    </SidebarProvider>
  )
}
