
"use client"

import { useEffect, useRef, useState } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import type { z } from "zod"

import { voucherSchema } from "@/lib/schemas"
import { createVoucher } from "@/lib/actions"
import { useToast } from "@/hooks/use-toast"
import { useAuth } from "@/hooks/use-auth"
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
  const { user } = useAuth()

  // Refs for "Wire Focus On Enter" functionality
  const nameRef = useRef<HTMLInputElement>(null)
  const codeRef = useRef<HTMLInputElement>(null)
  const quantitiesRef = useRef<HTMLInputElement>(null)
  const quantityTypeRef = useRef<HTMLInputElement>(null)
  const pricePerNoRef = useRef<HTMLInputElement>(null)
  const remarksRef = useRef<HTMLTextAreaElement>(null)
  const saveButtonRef = useRef<HTMLButtonElement>(null)

  const form = useForm<VoucherFormValues>({
    resolver: zodResolver(voucherSchema),
    defaultValues: {
      date: new Date(),
      name: "",
      code: "",
      quantities: 0,
      quantityType: "",
      pricePerNo: 0,
      totalPrice: 0,
      remarks: "",
    },
  })

  const [totalPrice, setTotalPrice] = useState(0)
  const quantities = form.watch("quantities")
  const pricePerNo = form.watch("pricePerNo")

  useEffect(() => {
    const total = (quantities || 0) * (pricePerNo || 0)
    setTotalPrice(total)
    form.setValue("totalPrice", total)
  }, [quantities, pricePerNo, form])

  const onSubmit = async (values: VoucherFormValues) => {
    if (!user) {
      toast({ title: "Error", description: "You must be logged in to create a voucher.", variant: "destructive" });
      return;
    }
    const result = await createVoucher(user.username, values)
    if (result.success) {
      toast({
        title: "Success!",
        description: "Voucher has been saved.",
      })
      form.reset({
        date: form.getValues().date, // Keep the date
        name: "",
        code: "",
        quantities: 0,
        quantityType: "",
        pricePerNo: 0,
        totalPrice: 0,
        remarks: "",
      })
      setTotalPrice(0)
      nameRef.current?.focus() // Set focus back to the name field
    } else {
      toast({
        title: "Error",
        description: result.message,
        variant: "destructive",
      })
    }
  }


  const handleKeyDown = (
    e: React.KeyboardEvent,
    nextFieldRef: React.RefObject<HTMLElement>
  ) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      nextFieldRef.current?.focus()
    }
  }
  
  // A ref for the date picker is not directly possible, but we can focus the next element
  // when the component mounts or resets.
  useEffect(() => {
    if (form.formState.isSubmitSuccessful) {
        nameRef.current?.focus();
    }
  }, [form.formState.isSubmitSuccessful]);


  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <FormField
          control={form.control}
          name="date"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Date</FormLabel>
              <FormControl>
                <DatePicker value={field.value} onChange={field.onChange} nextFocusRef={nameRef} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Name</FormLabel>
              <FormControl>
                <UppercaseInput
                  {...field}
                  ref={nameRef}
                  onKeyDown={(e) => handleKeyDown(e, codeRef)}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="code"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Code</FormLabel>
              <FormControl>
                <UppercaseInput
                  {...field}
                  ref={codeRef}
                  onKeyDown={(e) => handleKeyDown(e, quantitiesRef)}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
          <FormField
            control={form.control}
            name="quantities"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Quantities</FormLabel>
                <FormControl>
                  <Input
                    type="number"
                    {...field}
                    onChange={e => field.onChange(e.target.value === '' ? '' : +e.target.value)}
                    ref={quantitiesRef}
                    onKeyDown={(e) => handleKeyDown(e, quantityTypeRef)}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="quantityType"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Quantities Type</FormLabel>
                <FormControl>
                  <UppercaseInput
                    {...field}
                    ref={quantityTypeRef}
                    onKeyDown={(e) => handleKeyDown(e, pricePerNoRef)}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
         <FormField
            control={form.control}
            name="pricePerNo"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Price Per No.</FormLabel>
                <FormControl>
                  <Input
                    type="number"
                    {...field}
                    onChange={e => field.onChange(e.target.value === '' ? '' : +e.target.value)}
                    ref={pricePerNoRef}
                    onKeyDown={(e) => handleKeyDown(e, remarksRef)}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
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
                <Textarea {...field} ref={remarksRef} onKeyDown={(e) => handleKeyDown(e, saveButtonRef)} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <Button type="submit" disabled={form.formState.isSubmitting || !user} ref={saveButtonRef}>
          {form.formState.isSubmitting ? "Saving..." : "Save All Entries"}
        </Button>
      </form>
    </Form>
  )
}
