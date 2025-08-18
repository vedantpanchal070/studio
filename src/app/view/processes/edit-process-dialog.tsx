
"use client"

import { useEffect, useRef } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"

import { processSchema, type Process } from "@/lib/schemas"
import { updateProcess } from "@/lib/actions"
import { useToast } from "@/hooks/use-toast"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog"
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { DatePicker } from "@/components/date-picker"
import { UppercaseInput } from "@/components/ui/uppercase-input"

const editableProcessSchema = processSchema.extend({
  // The editable fields. For process, we allow editing descriptive data.
  // Raw materials and total output are not editable as they affect inventory calculations.
});


type ProcessFormValues = z.infer<typeof editableProcessSchema>

interface EditProcessDialogProps {
  isOpen: boolean
  onOpenChange: (open: boolean) => void
  process: Process
  onProcessUpdated: () => void
}

export function EditProcessDialog({ isOpen, onOpenChange, process, onProcessUpdated }: EditProcessDialogProps) {
  const { toast } = useToast()
  const processNameRef = useRef<HTMLInputElement>(null)

  const form = useForm<ProcessFormValues>({
    resolver: zodResolver(editableProcessSchema),
    defaultValues: process,
  })

  useEffect(() => {
    form.reset({
        ...process,
        date: new Date(process.date)
    }) 
  }, [process, form])


  const onSubmit = async (values: ProcessFormValues) => {
    // Only send editable fields to the update function
    const result = await updateProcess(process, values);
    if (result.success) {
      toast({
        title: "Success!",
        description: "Process has been updated.",
      })
      onProcessUpdated()
      onOpenChange(false)
    } else {
      toast({
        title: "Error",
        description: result.message,
        variant: "destructive",
      })
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Edit Process</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
             <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                <FormField
                    control={form.control}
                    name="date"
                    render={({ field }) => (
                    <FormItem>
                        <FormLabel>Date</FormLabel>
                        <FormControl>
                        <DatePicker value={field.value} onChange={field.onChange} nextFocusRef={processNameRef} />
                        </FormControl>
                        <FormMessage />
                    </FormItem>
                    )}
                />
                <FormField
                    control={form.control}
                    name="processName"
                    render={({ field }) => (
                    <FormItem>
                        <FormLabel>Process Name</FormLabel>
                        <FormControl>
                        <UppercaseInput {...field} ref={processNameRef} />
                        </FormControl>
                        <FormMessage />
                    </FormItem>
                    )}
                />
            </div>

            <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                <FormField
                    control={form.control}
                    name="totalProcessOutput"
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel>Total Process Output</FormLabel>
                            <FormControl>
                                <Input type="number" {...field} readOnly className="bg-muted"/>
                            </FormControl>
                            <FormMessage />
                        </FormItem>
                    )}
                />
                <FormField
                    control={form.control}
                    name="outputUnit"
                    render={({ field }) => (
                    <FormItem>
                        <FormLabel>Output Unit</FormLabel>
                        <FormControl>
                            <UppercaseInput {...field} />
                        </FormControl>
                        <FormMessage />
                    </FormItem>
                    )}
                />
            </div>
            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Notes</FormLabel>
                  <FormControl>
                    <Textarea {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <DialogFooter>
              <DialogClose asChild><Button type="button" variant="secondary">Cancel</Button></DialogClose>
              <Button type="submit" disabled={form.formState.isSubmitting}>
                {form.formState.isSubmitting ? "Saving..." : "Save Changes"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}
