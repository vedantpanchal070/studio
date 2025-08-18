import * as React from "react"

import { cn } from "@/lib/utils"
import { Input } from "@/components/ui/input"

const UppercaseInput = React.forwardRef<
  HTMLInputElement,
  React.InputHTMLAttributes<HTMLInputElement>
>(({ className, onChange, ...props }, ref) => {
  const handleInputChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    event.target.value = event.target.value.toUpperCase()
    if (onChange) {
      onChange(event)
    }
  }

  return (
    <Input
      className={cn("uppercase", className)}
      ref={ref}
      onChange={handleInputChange}
      {...props}
    />
  )
})
UppercaseInput.displayName = "UppercaseInput"

export { UppercaseInput }
