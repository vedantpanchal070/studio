
"use client"

import { useState, type ReactNode } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { verifyPassword } from "@/lib/actions"
import { Button } from "./ui/button"
import { Input } from "./ui/input"
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "./ui/form"
import { useToast } from "@/hooks/use-toast"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./ui/card"

const passwordSchema = z.object({
  password: z.string().min(1, "Password is required."),
})

export function PasswordProtect({ children }: { children: ReactNode }) {
  const { toast } = useToast()
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  
  const form = useForm<z.infer<typeof passwordSchema>>({
    resolver: zodResolver(passwordSchema),
    defaultValues: { password: "" },
  })

  async function onSubmit(values: z.infer<typeof passwordSchema>) {
    const isCorrect = await verifyPassword(values.password)
    if (isCorrect) {
      setIsAuthenticated(true)
    } else {
      toast({
        title: "Error",
        description: "Incorrect password.",
        variant: "destructive",
      })
      form.reset()
    }
  }

  if (isAuthenticated) {
    return <>{children}</>
  }

  return (
    <Card className="max-w-md mx-auto">
        <CardHeader>
            <CardTitle>Authentication Required</CardTitle>
            <CardDescription>Please enter the password to view this content.</CardDescription>
        </CardHeader>
        <CardContent>
            <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField
                control={form.control}
                name="password"
                render={({ field }) => (
                    <FormItem>
                    <FormLabel>Password</FormLabel>
                    <FormControl>
                        <Input type="password" {...field} />
                    </FormControl>
                    <FormMessage />
                    </FormItem>
                )}
                />
                <Button type="submit" disabled={form.formState.isSubmitting}>
                {form.formState.isSubmitting ? "Verifying..." : "Submit"}
                </Button>
            </form>
            </Form>>
        </CardContent>
    </Card>
  )
}
