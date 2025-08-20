
"use client"

import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { useAuth } from "@/hooks/use-auth"
import { useToast } from "@/hooks/use-toast"
import { Button } from "@/components/ui/button"
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form"
import { Input } from "@/components/ui/input"

const changeUsernameSchema = z.object({
  newUsername: z.string().min(3, "Username must be at least 3 characters."),
  currentPassword: z.string().min(1, "Password is required to confirm change."),
});

type ChangeUsernameFormValues = z.infer<typeof changeUsernameSchema>

export function ChangeUsernameForm() {
  const { toast } = useToast()
  const { user, changeUsername } = useAuth()

  const form = useForm<ChangeUsernameFormValues>({
    resolver: zodResolver(changeUsernameSchema),
    defaultValues: {
      newUsername: "",
      currentPassword: "",
    },
  })

  const onSubmit = async (values: ChangeUsernameFormValues) => {
    if (!user) return;

    const result = await changeUsername(values.newUsername, values.currentPassword);

    if (result.success) {
      toast({
        title: "Success!",
        description: "Your username has been changed. You will be logged out.",
      })
      // The logout is handled by the auth hook after a successful username change.
    } else {
      toast({
        title: "Error",
        description: result.message || "An unknown error occurred.",
        variant: "destructive",
      })
      if (result.field) {
         form.setError(result.field as keyof ChangeUsernameFormValues, {
          type: "manual",
          message: result.message,
        });
      }
    }
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <h3 className="text-lg font-medium">Change Username</h3>
        <FormField
          control={form.control}
          name="newUsername"
          render={({ field }) => (
            <FormItem>
              <FormLabel>New Username</FormLabel>
              <FormControl>
                <Input type="text" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="currentPassword"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Current Password (for verification)</FormLabel>
              <FormControl>
                <Input type="password" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <Button type="submit" disabled={form.formState.isSubmitting}>
          {form.formState.isSubmitting ? "Saving..." : "Change Username"}
        </Button>
      </form>
    </Form>
  )
}
