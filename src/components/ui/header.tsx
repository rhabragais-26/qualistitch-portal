"use client"

import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { VariantProps, cva } from "class-variance-authority"
import { PanelLeft } from "lucide-react"

import { useIsMobile } from "@/hooks/use-mobile"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Separator } from "@/components/ui/separator"
import { Sheet, SheetContent } from "@/components/ui/sheet"
import { Skeleton } from "@/components/ui/skeleton"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"

type HeaderContext = {
  isMobile: boolean
  open: boolean
  setOpen: (open: boolean) => void
}

const HeaderContext = React.createContext<HeaderContext | null>(null)

function useHeader() {
  const context = React.useContext(HeaderContext)
  if (!context) {
    throw new Error("useHeader must be used within a HeaderProvider.")
  }

  return context
}

const HeaderProvider = React.forwardRef<
  HTMLDivElement,
  React.ComponentProps<"div">
>(({ className, ...props }, ref) => {
  const [open, setOpen] = React.useState(false)
  const isMobile = useIsMobile()

  return (
    <HeaderContext.Provider
      value={{
        isMobile,
        open,
        setOpen,
      }}
    >
      <div ref={ref} className={cn(className)} {...props} />
    </HeaderContext.Provider>
  )
})
HeaderProvider.displayName = "HeaderProvider"

const Header = React.forwardRef<HTMLDivElement, React.ComponentProps<"div">>(
  ({ className, ...props }, ref) => {
    return (
      <HeaderProvider>
        <header
          ref={ref}
          data-header="header"
          className={cn("sticky top-0 z-10 w-full", className)}
          {...props}
        />
      </HeaderProvider>
    )
  }
)
Header.displayName = "Header"

const HeaderSection = React.forwardRef<
  HTMLDivElement,
  React.ComponentProps<"div"> & {
    side?: "left" | "right" | "center"
  }
>(({ className, side = "center", ...props }, ref) => {
  return (
    <div
      ref={ref}
      data-header="section"
      data-side={side}
      className={cn("flex items-center gap-2", className)}
      {...props}
    />
  )
})
HeaderSection.displayName = "HeaderSection"

const HeaderSeparator = React.forwardRef<
  React.ElementRef<typeof Separator>,
  React.ComponentProps<typeof Separator>
>(({ className, ...props }, ref) => {
  return (
    <Separator
      ref={ref}
      data-header="separator"
      orientation="vertical"
      className={cn("mx-2 h-5", className)}
      {...props}
    />
  )
})
HeaderSeparator.displayName = "HeaderSeparator"

const HeaderMenu = React.forwardRef<
  HTMLDivElement,
  React.ComponentProps<"div">
>(({ className, children, ...props }, ref) => {
  const { isMobile, open, setOpen } = useHeader()

  if (isMobile) {
    return (
      <>
        <Button
          data-header="menu-trigger"
          variant="ghost"
          size="icon"
          onClick={() => setOpen(true)}
        >
          <PanelLeft />
          <span className="sr-only">Toggle Menu</span>
        </Button>
        <Sheet open={open} onOpenChange={setOpen}>
          <SheetContent side="left" className="bg-background">
            <div className="flex flex-col gap-4 pr-6">{children}</div>
          </SheetContent>
        </Sheet>
      </>
    )
  }

  return (
    <nav
      ref={ref}
      data-header="menu"
      className={cn(
        "hidden items-center gap-2 text-sm font-medium md:flex",
        className
      )}
      {...props}
    >
      {children}
    </nav>
  )
})
HeaderMenu.displayName = "HeaderMenu"

const HeaderMenuItem = React.forwardRef<
  HTMLAnchorElement,
  React.ComponentProps<"a"> & {
    isActive?: boolean
    asChild?: boolean
  }
>(({ className, isActive = false, asChild = false, ...props }, ref) => {
  const Comp = asChild ? Slot : "a"

  return (
    <Comp
      ref={ref}
      data-header="menu-item"
      data-active={isActive}
      className={cn(
        "flex select-none items-center gap-2 rounded-md px-3 py-2 text-foreground/80 outline-none ring-ring transition-colors hover:bg-accent hover:text-white focus-visible:ring-2 data-[active=true]:bg-accent data-[active=true]:text-white",
        className
      )}
      {...props}
    />
  )
})
HeaderMenuItem.displayName = "HeaderMenuItem"

const HeaderMenuSkeleton = React.forwardRef<
  HTMLDivElement,
  React.ComponentProps<"div"> & {
    items?: number
  }
>(({ className, items = 3, ...props }, ref) => (
  <div
    ref={ref}
    data-header="menu-skeleton"
    className={cn(
      "hidden items-center gap-2 text-sm font-medium md:flex",
      className
    )}
    {...props}
  >
    {Array.from({ length: items }).map((_, i) => (
      <Skeleton key={i} className="h-8 w-24" />
    ))}
  </div>
))
HeaderMenuSkeleton.displayName = "HeaderMenuSkeleton"

const HeaderInput = React.forwardRef<
  React.ElementRef<typeof Input>,
  React.ComponentProps<typeof Input>
>(({ className, ...props }, ref) => {
  return (
    <Input
      ref={ref}
      data-header="input"
      className={cn(
        "h-8 w-40 bg-transparent shadow-none focus-visible:w-60 focus-visible:bg-background focus-visible:ring-2",
        className
      )}
      {...props}
    />
  )
})
HeaderInput.displayName = "HeaderInput"

export {
  Header,
  HeaderInput,
  HeaderMenu,
  HeaderMenuItem,
  HeaderMenuSkeleton,
  HeaderProvider,
  HeaderSection,
  HeaderSeparator,
  useHeader,
}
