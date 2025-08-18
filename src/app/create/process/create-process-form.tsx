"use client"

import { useForm, useFieldArray } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import type { z } from "zod"
import { PlusCircle, Trash2 } from "lucide-react"

import { processSchema } from "@/lib/schemas"
import { createProcess } from "@/lib/actions"
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
import { Textarea } from "@/components/ui/textarea"
import { DatePicker } from "@/components/date-picker"
import { UppercaseInput } from "@/components/ui/uppercase-input"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"

type ProcessFormValues = z.infer<typeof processSchema>

export function CreateProcessForm() {
  const { toast } = useToast()
  const form = useForm<ProcessFormValues>({
    resolver: zodResolver(processSchema),
    defaultValues: {
      date: new Date(),
      processName: "",
      outputProduct: "",
      rawMaterials: [{ name: "", quantity: 0 }],
      notes: "",
    },
  })

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "rawMaterials",
  })

  const onSubmit = async (values: ProcessFormValues) => {
    const result = await createProcess(values)
    if (result.success) {
      toast({
        title: "Success!",
        description: result.message,
      })
      form.reset()
    } else {
      toast({
        title: "Error",
        description: result.message,
        variant: "destructive",
      })
    }
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
          <FormField
            control={form.control}
            name="date"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Date</FormLabel>
                <FormControl>
                  <DatePicker value={field.value} onChange={field.onChange} />
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
                  <UppercaseInput {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <FormField
          control={form.control}
          name="outputProduct"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Output Product Name</FormLabel>
              <FormControl>
                <UppercaseInput {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        
        <Card>
          <CardHeader>
            <CardTitle>Raw Materials</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {fields.map((field, index) => (
                <div key={field.id} className="flex items-end gap-4">
                  <FormField
                    control={form.control}
                    name={`rawMaterials.${index}.name`}
                    render={({ field }) => (
                      <FormItem className="flex-grow">
                        <FormLabel>Material Name</FormLabel>
                        <FormControl>
                          <UppercaseInput {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name={`rawMaterials.${index}.quantity`}
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Quantity</FormLabel>
                        <FormControl>
                          <Input type="number" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <Button
                    type="button"
                    variant="destructive"
                    size="icon"
                    onClick={() => remove(index)}
                    disabled={fields.length === 1}
                  >
                    <Trash2 />
                  </Button>
                </div>
              ))}
            </div>
            <Separator className="my-4" />
            <Button
              type="button"
              variant="outline"
              onClick={() => append({ name: "", quantity: 0 })}
            >
              <PlusCircle className="mr-2" />
              Add Raw Material
            </Button>
          </CardContent>
        </Card>

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
        <Button type="submit" disabled={form.formState.isSubmitting}>
          {form.formState.isSubmitting ? "Saving..." : "Save Process"}
        </Button>
      </form>
    </Form>
  )
}
