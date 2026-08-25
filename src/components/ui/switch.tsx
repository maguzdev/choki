"use client"

import { Switch as SwitchPrimitive } from "@base-ui/react/switch"

import { cn } from "@/lib/utils"

function Switch({ className, children, ...props }: SwitchPrimitive.Root.Props) {
  return (
    <SwitchPrimitive.Root
      data-slot="switch"
      className={cn(
        "relative inline-flex h-8 w-14 shrink-0 cursor-pointer items-center rounded-full bg-cream-200 transition-colors outline-none data-checked:bg-success-500 data-disabled:cursor-not-allowed data-disabled:opacity-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-success-500",
        className,
      )}
      {...props}
    >
      <SwitchPrimitive.Thumb
        data-slot="switch-thumb"
        className="block size-6 translate-x-1 rounded-full bg-white shadow-sm transition-transform data-checked:translate-x-7 motion-reduce:transition-none"
      />
      {children}
    </SwitchPrimitive.Root>
  )
}

export { Switch }
