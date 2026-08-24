import * as React from "react"
import { Slot, Tooltip as TooltipPrimitive } from "radix-ui"
import { PanelLeft } from "lucide-react"

import { cn } from "@flaner/shared/utils";
import { useIsMobile } from "@flaner/shared/hooks";
import { Sheet, SheetContent } from "./sheet"
import { Button } from "./button"

const SIDEBAR_COOKIE_NAME = "sidebar:state"
const SIDEBAR_COOKIE_MAX_AGE = 60 * 60 * 24 * 7
const SIDEBAR_KEYBOARD_SHORTCUT = "b"

interface SidebarContext {
  state: "expanded" | "collapsed"
  open: boolean
  setOpen: (open: boolean) => void
  openMobile: boolean
  setOpenMobile: (open: boolean) => void
  isMobile: boolean
  toggleSidebar: () => void
}

const SidebarContext = React.createContext<SidebarContext | null>(null)

function useSidebar() {
  const context = React.useContext(SidebarContext)
  if (!context) {
    throw new Error("useSidebar must be used within a SidebarProvider.")
  }
  return context
}

interface SidebarProviderProps extends React.ComponentProps<"div"> {
  defaultOpen?: boolean
  open?: boolean
  onOpenChange?: (open: boolean) => void
}

const SidebarProvider = React.forwardRef<HTMLDivElement, SidebarProviderProps>(
  (
    {
      defaultOpen = true,
      open: openProp,
      onOpenChange: setOpenProp,
      className,
      style,
      children,
      ...props
    },
    ref
  ) => {
    const isMobile = useIsMobile()
    const [openMobile, setOpenMobile] = React.useState(false)

    // Internal open state if not controlled
    const [_open, _setOpen] = React.useState(defaultOpen)
    const open = openProp !== undefined ? openProp : _open
    const setOpen = React.useCallback(
      (value: boolean | ((value: boolean) => boolean)) => {
        const nextOpen = typeof value === "function" ? value(open) : value
        if (setOpenProp) {
          setOpenProp(nextOpen)
        } else {
          _setOpen(nextOpen)
        }

        // Save state to cookie
        document.cookie = `${SIDEBAR_COOKIE_NAME}=${nextOpen}; path=/; max-age=${SIDEBAR_COOKIE_MAX_AGE}`
      },
      [open, setOpenProp]
    )

    const toggleSidebar = React.useCallback(() => {
      return isMobile ? setOpenMobile((prev) => !prev) : setOpen((prev) => !prev)
    }, [isMobile, setOpen])

    // Keyboard shortcut (Ctrl+B)
    React.useEffect(() => {
      const handleKeyDown = (event: KeyboardEvent) => {
        if (
          event.key === SIDEBAR_KEYBOARD_SHORTCUT &&
          (event.metaKey || event.ctrlKey)
        ) {
          event.preventDefault()
          toggleSidebar()
        }
      }

      window.addEventListener("keydown", handleKeyDown)
      return () => window.removeEventListener("keydown", handleKeyDown)
    }, [toggleSidebar])

    const state = open ? "expanded" : "collapsed"

    const contextValue = React.useMemo<SidebarContext>(
      () => ({
        state,
        open,
        setOpen,
        isMobile,
        openMobile,
        setOpenMobile,
        toggleSidebar,
      }),
      [state, open, setOpen, isMobile, openMobile, setOpenMobile, toggleSidebar]
    )

    return (
      <SidebarContext.Provider value={contextValue}>
        <TooltipPrimitive.Provider delayDuration={0}>
          <div
            style={
              {
                "--sidebar-width": "16rem",
                "--sidebar-width-icon": "3.5rem",
                ...style,
              } as React.CSSProperties
            }
            className={cn(
              "group/sidebar-wrapper flex min-h-screen w-full text-sidebar-foreground has-[[data-state=collapsed]]:bg-background",
              className
            )}
            ref={ref}
            {...props}
          >
            {children}
          </div>
        </TooltipPrimitive.Provider>
      </SidebarContext.Provider>
    )
  }
)
SidebarProvider.displayName = "SidebarProvider"

interface SidebarProps extends React.ComponentProps<"div"> {
  side?: "left" | "right"
  variant?: "sidebar" | "floating" | "inset"
  collapsible?: "offcanvas" | "icon" | "none"
}

const Sidebar = React.forwardRef<HTMLDivElement, SidebarProps>(
  (
    {
      side = "left",
      variant = "sidebar",
      collapsible = "icon",
      className,
      style,
      children,
      ...props
    },
    ref
  ) => {
    const { isMobile, state, openMobile, setOpenMobile } = useSidebar()

    if (collapsible === "none") {
      return (
        <div
          className={cn(
            "flex h-full w-[var(--sidebar-width)] flex-col bg-sidebar text-sidebar-foreground border-r border-sidebar-border",
            className
          )}
          ref={ref}
          {...props}
        >
          {children}
        </div>
      )
    }

    if (isMobile) {
      return (
        <Sheet open={openMobile} onOpenChange={setOpenMobile} {...props}>
          <SheetContent
            data-sidebar="sidebar"
            data-mobile="true"
            side={side}
            className="w-[var(--sidebar-width)] bg-sidebar p-0 text-sidebar-foreground border-r border-sidebar-border"
            showCloseButton={false}
          >
            <div className="flex h-full w-full flex-col">{children}</div>
          </SheetContent>
        </Sheet>
      )
    }

    return (
      <div
        ref={ref}
        className="group peer hidden md:block text-sidebar-foreground"
        data-state={state}
        data-collapsible={state === "collapsed" ? collapsible : ""}
        data-variant={variant}
        data-side={side}
      >
        {/* Sidebar spacer */}
        <div
          className={cn(
            "relative h-screen w-[var(--sidebar-width)] bg-transparent",
            "group-data-[state=collapsed]:w-[var(--sidebar-width-icon)]",
            variant === "floating" || variant === "inset"
              ? "group-data-[state=collapsed]:w-[calc(var(--sidebar-width-icon)+theme(spacing.4))]"
              : ""
          )}
          style={{ transition: "width 200ms ease-in-out" }}
        />
        {/* Actual floating sidebar */}
        <div
          className={cn(
            "fixed inset-y-0 z-10 flex h-screen w-[var(--sidebar-width)] flex-col bg-sidebar border-sidebar-border shadow-xs dark:shadow-none select-none",
            side === "left"
              ? "left-0 border-r"
              : "right-0 border-l",
            "group-data-[state=collapsed]:w-[var(--sidebar-width-icon)]",
            variant === "floating"
              ? "p-2 group-data-[state=collapsed]:w-[calc(var(--sidebar-width-icon)+12px)]"
              : "",
            className
          )}
          style={{ transition: "width 200ms ease-in-out, padding 200ms ease-in-out", ...style }}
          {...props}
        >
          <div
            data-sidebar="sidebar"
            className="flex h-full w-full flex-col bg-sidebar group-data-[variant=floating]:rounded-md group-data-[variant=floating]:border group-data-[variant=floating]:shadow"
          >
            {children}
          </div>
        </div>
      </div>
    )
  }
)
Sidebar.displayName = "Sidebar"

const SidebarTrigger = React.forwardRef<
  HTMLButtonElement,
  React.ComponentProps<typeof Button>
>(({ className, onClick, ...props }, ref) => {
  const { toggleSidebar } = useSidebar()

  return (
    <Button
      ref={ref}
      variant="ghost"
      size="icon-sm"
      className={cn("h-8 w-8 text-muted-foreground hover:text-foreground", className)}
      onClick={(event) => {
        onClick?.(event)
        toggleSidebar()
      }}
      {...props}
    >
      <PanelLeft className="size-4" />
      <span className="sr-only">Toggle Sidebar</span>
    </Button>
  )
})
SidebarTrigger.displayName = "SidebarTrigger"

const SidebarHeader = React.forwardRef<
  HTMLDivElement,
  React.ComponentProps<"div">
>(({ className, ...props }, ref) => {
  return (
    <div
      ref={ref}
      data-sidebar="header"
      className={cn("flex flex-col gap-2 px-3 py-2", className)}
      {...props}
    />
  )
})
SidebarHeader.displayName = "SidebarHeader"

const SidebarFooter = React.forwardRef<
  HTMLDivElement,
  React.ComponentProps<"div">
>(({ className, ...props }, ref) => {
  return (
    <div
      ref={ref}
      data-sidebar="footer"
      className={cn("flex flex-col gap-2 p-2 mt-auto border-t border-sidebar-border/50", className)}
      {...props}
    />
  )
})
SidebarFooter.displayName = "SidebarFooter"

const SidebarContent = React.forwardRef<
  HTMLDivElement,
  React.ComponentProps<"div">
>(({ className, ...props }, ref) => {
  return (
    <div
      ref={ref}
      data-sidebar="content"
      className={cn(
        "flex flex-1 flex-col gap-2 overflow-y-auto overflow-x-hidden",
        className
      )}
      {...props}
    />
  )
})
SidebarContent.displayName = "SidebarContent"

const SidebarGroup = React.forwardRef<
  HTMLDivElement,
  React.ComponentProps<"div">
>(({ className, ...props }, ref) => {
  return (
    <div
      ref={ref}
      data-sidebar="group"
      className={cn("flex flex-col gap-1.5 p-2", className)}
      {...props}
    />
  )
})
SidebarGroup.displayName = "SidebarGroup"

const SidebarGroupLabel = React.forwardRef<
  HTMLDivElement,
  React.ComponentProps<"div">
>(({ className, ...props }, ref) => {
  return (
    <div
      ref={ref}
      data-sidebar="group-label"
      className={cn(
        "px-2 py-1 text-xs font-semibold uppercase tracking-wider text-sidebar-foreground/45 transition-all duration-200 ease-in-out",
        "group-data-[state=collapsed]:opacity-0 group-data-[state=collapsed]:pointer-events-none",
        className
      )}
      {...props}
    />
  )
})
SidebarGroupLabel.displayName = "SidebarGroupLabel"

const SidebarGroupContent = React.forwardRef<
  HTMLDivElement,
  React.ComponentProps<"div">
>(({ className, ...props }, ref) => {
  return (
    <div
      ref={ref}
      data-sidebar="group-content"
      className={cn("flex flex-col gap-0.5", className)}
      {...props}
    />
  )
})
SidebarGroupContent.displayName = "SidebarGroupContent"

const SidebarMenu = React.forwardRef<
  HTMLUListElement,
  React.ComponentProps<"ul">
>(({ className, ...props }, ref) => {
  return (
    <ul
      ref={ref}
      data-sidebar="menu"
      className={cn("flex flex-col gap-1.5 md:gap-1 list-none p-0 m-0", className)}
      {...props}
    />
  )
})
SidebarMenu.displayName = "SidebarMenu"

const SidebarMenuItem = React.forwardRef<
  HTMLLIElement,
  React.ComponentProps<"li">
>(({ className, ...props }, ref) => {
  return (
    <li
      ref={ref}
      data-sidebar="menu-item"
      className={cn("relative", className)}
      {...props}
    />
  )
})
SidebarMenuItem.displayName = "SidebarMenuItem"

const SidebarMenuButton = React.forwardRef<
  HTMLButtonElement,
  React.ComponentProps<"button"> & {
    asChild?: boolean
    isActive?: boolean
    tooltip?: string
  }
>(({ className, asChild = false, isActive = false, tooltip, ...props }, ref) => {
  const { state, isMobile } = useSidebar()
  const Comp = asChild ? Slot.Root : "button"

  const button = (
    <Comp
      ref={ref}
      data-sidebar="menu-button"
      data-active={isActive}
      className={cn(
        "flex w-full items-center gap-3 md:gap-2.5 rounded-lg md:rounded-md px-3 py-2.5 md:px-2.5 md:py-1 min-h-[44px] md:min-h-0 text-base md:text-sm font-medium text-sidebar-foreground transition-all duration-150 cursor-pointer outline-none border border-transparent select-none overflow-hidden",
        "hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
        "data-[active=true]:bg-brand data-[active=true]:text-zinc-950 data-[active=true]:font-bold data-[active=true]:shadow-md data-[active=true]:shadow-brand/5",
        "[&_svg]:size-5 md:[&_svg]:size-[18px] [&_svg]:shrink-0 [&_svg]:transition-transform [&_svg]:duration-200",
        className
      )}
      {...props}
    />
  )

  if (!tooltip) {
    return button
  }

  const showTooltip = !isMobile && state === "collapsed"

  return (
    <TooltipPrimitive.Root open={showTooltip ? undefined : false}>
      <TooltipPrimitive.Trigger asChild>{button}</TooltipPrimitive.Trigger>
      {showTooltip && (
        <TooltipPrimitive.Portal>
          <TooltipPrimitive.Content
            side="right"
            align="center"
            sideOffset={8}
            className="z-50 overflow-hidden rounded-md bg-zinc-900 px-3 py-1.5 text-xs font-medium text-zinc-50 shadow-md animate-in fade-in-0 zoom-in-95"
          >
            {tooltip}
          </TooltipPrimitive.Content>
        </TooltipPrimitive.Portal>
      )}
    </TooltipPrimitive.Root>
  )
})
SidebarMenuButton.displayName = "SidebarMenuButton"

const SidebarMenuAction = React.forwardRef<
  HTMLButtonElement,
  React.ComponentProps<"button"> & {
    asChild?: boolean
  }
>(({ className, asChild = false, ...props }, ref) => {
  const Comp = asChild ? Slot.Root : "button"

  return (
    <Comp
      ref={ref}
      data-sidebar="menu-action"
      className={cn(
        "absolute right-2 top-1/2 flex h-9 w-9 md:h-7 md:w-7 -translate-y-1/2 items-center justify-center rounded-md p-0 text-sidebar-foreground/70 hover:text-sidebar-foreground transition-all outline-none focus-visible:ring-2 focus-visible:ring-sidebar-ring cursor-pointer hover:bg-sidebar-accent/50 [&_svg]:size-5 md:[&_svg]:size-4",
        "transition-all duration-200 opacity-100 group-data-[state=collapsed]:opacity-0 group-data-[state=collapsed]:pointer-events-none",
        className
      )}
      {...props}
    />
  )
})
SidebarMenuAction.displayName = "SidebarMenuAction"

const SidebarMenuSub = React.forwardRef<
  HTMLUListElement,
  React.ComponentProps<"ul">
>(({ className, style, ...props }, ref) => {
  return (
    <ul
      ref={ref}
      data-sidebar="menu-sub"
      className={cn(
        "my-1 md:my-0.5 flex flex-col gap-1 md:gap-0.5 border-l border-sidebar-border/50 pl-3.5 md:pl-3 list-none m-0",
        "group-data-[state=collapsed]:hidden",
        className
      )}
      style={{ marginLeft: "19px", ...style }}
      {...props}
    />
  )
})
SidebarMenuSub.displayName = "SidebarMenuSub"

const SidebarMenuSubItem = React.forwardRef<
  HTMLLIElement,
  React.ComponentProps<"li">
>(({ className, ...props }, ref) => {
  return (
    <li
      ref={ref}
      data-sidebar="menu-sub-item"
      className={cn("relative", className)}
      {...props}
    />
  )
})
SidebarMenuSubItem.displayName = "SidebarMenuSubItem"

const SidebarMenuSubButton = React.forwardRef<
  HTMLButtonElement,
  React.ComponentProps<"button"> & {
    asChild?: boolean
    isActive?: boolean
  }
>(({ className, asChild = false, isActive = false, ...props }, ref) => {
  const Comp = asChild ? Slot.Root : "button"

  return (
    <Comp
      ref={ref}
      data-sidebar="menu-sub-button"
      data-active={isActive}
      className={cn(
        "flex w-full items-center gap-2.5 md:gap-2 rounded-lg md:rounded-md px-3 py-2 md:px-2 md:py-1 min-h-[38px] md:min-h-0 text-sm md:text-[13px] font-medium text-sidebar-foreground/75 hover:text-sidebar-foreground transition-all cursor-pointer outline-none border border-transparent select-none",
        "hover:bg-sidebar-accent/80",
        "data-[active=true]:text-brand data-[active=true]:font-semibold",
        className
      )}
      {...props}
    />
  )
})
SidebarMenuSubButton.displayName = "SidebarMenuSubButton"

const SidebarRail = React.forwardRef<
  HTMLButtonElement,
  React.ComponentProps<"button">
>(({ className, onClick, ...props }, ref) => {
  const { toggleSidebar } = useSidebar()

  return (
    <button
      ref={ref}
      data-sidebar="rail"
      aria-label="Toggle Sidebar"
      tabIndex={-1}
      onClick={(event) => {
        onClick?.(event)
        toggleSidebar()
      }}
      className={cn(
        "absolute inset-y-0 z-20 hidden w-1.5 -translate-x-1/2 cursor-w-resize bg-transparent transition-all md:block hover:bg-sidebar-border",
        "group-data-[side=left]:right-0 group-data-[side=left]:translate-x-1/2",
        "group-data-[side=right]:left-0 group-data-[side=right]:-translate-x-1/2",
        "group-data-[state=collapsed]:cursor-e-resize",
        className
      )}
      {...props}
    />
  )
})
SidebarRail.displayName = "SidebarRail"

export {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuAction,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
  SidebarProvider,
  SidebarRail,
  SidebarTrigger,
  useSidebar,
}
