
"use client"

import * as React from "react"
import { cn } from "@/lib/utils"
import { Input } from "@/components/ui/input"

const ReadOnlyInput = React.forwardRef<
  HTMLInputElement,
  Omit<React.InputHTMLAttributes<HTMLInputElement>, "readOnly">
>(({ className, ...props }, ref) => {
  return (
    <Input
      ref={ref}
      readOnly
      className={cn("bg-muted font-semibold", className)}
      {...props}
    />
  )
})
ReadOnlyInput.displayName = "ReadOnlyInput"

export { ReadOnlyInput }
