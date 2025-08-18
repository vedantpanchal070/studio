"use client"

import { useEffect, useRef, useState } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import type { z } from "zod"

import { voucherSchema } from "@/lib/schemas"
import { createVoucher } from "@/lib/actions"
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

type VoucherFormValues = z.infer<typeof voucherSchema>

export function CreateVoucherForm() {
  const { toast } = useToast()
  const form = useForm<VoucherFormValues>({
    resolver: zodResolver(voucherSchema),
    defaultValues: {
      date: new Date(),
      voucherNo: "",
      rawMaterial: "",
      quantity: 0,
      pricePerUnit: 0,
      totalPrice: 0,
      remarks: "",
    },
  })

  const [totalPrice, setTotalPrice] = useState(0)
  const quantity = form.watch("quantity")
  const pricePerUnit = form.watch("pricePerUnit")

  useEffect(() => {
    const total = (quantity || 0) * (pricePerUnit || 0)
    setTotalPrice(total)
    form.setValue("totalPrice", total)
  }, [quantity, pricePerUnit, form])

  const onSubmit = async (values: VoucherFormValues) => {
    const result = await createVoucher(values)
    if (result.success) {
      toast({
        title: "Success!",
        description: result.message,
      })
      form.reset()
      setTotalPrice(0)
    } else {
      toast({
        title: "Error",
        description: result.message,
        variant: "destructive",
      })
    }
  }

  // Refs for "Wire Focus On Enter" functionality
  const rawMaterialRef = useRef<HTMLInputElement>(null)
  const quantityRef = useRef<HTMLInputElement>(null)
  const pricePerUnitRef = useRef<HTMLInputElement>(null)
  const remarksRef = useRef<HTMLTextAreaElement>(null)

  const handleKeyDown = (
    e: React.KeyboardEvent,
    nextFieldRef: React.RefObject<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      nextFieldRef.current?.focus()
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
            name="voucherNo"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Voucher No.</FormLabel>
                <FormControl>
                  <UppercaseInput
                    {...field}
                    onKeyDown={(e) => handleKeyDown(e, rawMaterialRef)}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
        <FormField
          control={form.control}
          name="rawMaterial"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Raw Material Name</FormLabel>
              <FormControl>
                <UppercaseInput
                  {...field}
                  ref={rawMaterialRef}
                  onKeyDown={(e) => handleKeyDown(e, quantityRef)}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
          <FormField
            control={form.control}
            name="quantity"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Quantity</FormLabel>
                <FormControl>
                  <Input
                    type="number"
                    {...field}
                    ref={quantityRef}
                    onKeyDown={(e) => handleKeyDown(e, pricePerUnitRef)}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="pricePerUnit"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Price per Unit</FormLabel>
                <FormControl>
                  <Input
                    type="number"
                    {...field}
                    ref={pricePerUnitRef}
                    onKeyDown={(e) => handleKeyDown(e, remarksRef)}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
        <FormItem>
          <FormLabel>Total Price</FormLabel>
          <FormControl>
            <Input readOnly value={totalPrice.toFixed(2)} className="bg-muted font-semibold" />
          </FormControl>
        </FormItem>
        <FormField
          control={form.control}
          name="remarks"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Remarks</FormLabel>
              <FormControl>
                <Textarea {...field} ref={remarksRef} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <Button type="submit" disabled={form.formState.isSubmitting}>
          {form.formState.isSubmitting ? "Saving..." : "Save Voucher"}
        </Button>
      </form>
    </Form>
  )
}
