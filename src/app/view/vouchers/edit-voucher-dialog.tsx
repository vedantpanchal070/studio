
"use client"

import { useEffect, useRef, useState } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"

import { voucherSchema, type Voucher } from "@/lib/schemas"
import { updateVoucher } from "@/lib/actions"
import { useToast } from "@/hooks/use-toast"
import { useAuth } from "@/hooks/use-auth"
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
import { ReadOnlyInput } from "@/components/ui/read-only-input"


type VoucherFormValues = z.infer<typeof voucherSchema>

interface EditVoucherDialogProps {
  isOpen: boolean
  onOpenChange: (open: boolean) => void
  voucher: Voucher
  onVoucherUpdated: () => void
}

export function EditVoucherDialog({ isOpen, onOpenChange, voucher, onVoucherUpdated }: EditVoucherDialogProps) {
  const { toast } = useToast()
  const { user } = useAuth()
  const nameRef = useRef<HTMLInputElement>(null)
  const [totalPrice, setTotalPrice] = useState(0)

  
  const form = useForm<VoucherFormValues>({
    resolver: zodResolver(voucherSchema),
    defaultValues: voucher,
  })
  
  const quantities = form.watch("quantities")
  const pricePerNo = form.watch("pricePerNo")

  useEffect(() => {
    form.reset({
      ...voucher,
      date: new Date(voucher.date),
    }) // Reset form when a new voucher is selected
    setTotalPrice(voucher.totalPrice || 0)
  }, [voucher, form])

  useEffect(() => {
    const total = (quantities || 0) * (pricePerNo || 0)
    setTotalPrice(total)
    form.setValue("totalPrice", total)
  }, [quantities, pricePerNo, form])


  const onSubmit = async (values: VoucherFormValues) => {
    if (!user) {
      toast({ title: "Error", description: "You must be logged in.", variant: "destructive" });
      return;
    }
    const result = await updateVoucher(user.username, values)
    if (result.success) {
      toast({
        title: "Success!",
        description: "Voucher has been updated.",
      })
      onVoucherUpdated()
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
          <DialogTitle>Edit Voucher</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
                control={form.control}
                name="date"
                render={({ field }) => (
                    <FormItem><FormLabel>Date</FormLabel><FormControl><DatePicker value={field.value} onChange={field.onChange} nextFocusRef={nameRef} /></FormControl><FormMessage /></FormItem>
                )}
            />
             <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                    <FormItem><FormLabel>Name</FormLabel><FormControl><UppercaseInput {...field} ref={nameRef} /></FormControl><FormMessage /></FormItem>
                )}
            />
             <FormField
                control={form.control}
                name="code"
                render={({ field }) => (
                    <FormItem><FormLabel>Code</FormLabel><FormControl><UppercaseInput {...field} /></FormControl><FormMessage /></FormItem>
                )}
            />
            <div className="grid grid-cols-2 gap-4">
                <FormField
                    control={form.control}
                    name="quantities"
                    render={({ field }) => (
                        <FormItem><FormLabel>Quantities</FormLabel><FormControl><Input type="number" {...field} /></FormControl><FormMessage /></FormItem>
                    )}
                />
                 <FormField
                    control={form.control}
                    name="quantityType"
                    render={({ field }) => (
                        <FormItem><FormLabel>Unit</FormLabel><FormControl><UppercaseInput {...field} /></FormControl><FormMessage /></FormItem>
                    )}
                />
            </div>
             <FormField
                control={form.control}
                name="pricePerNo"
                render={({ field }) => (
                    <FormItem><FormLabel>Price Per No.</FormLabel><FormControl><Input type="number" {...field} /></FormControl><FormMessage /></FormItem>
                )}
            />
            <FormItem>
                <FormLabel>Total Price</FormLabel>
                <FormControl><ReadOnlyInput value={totalPrice.toFixed(2)} /></FormControl>
            </FormItem>
            <FormField
                control={form.control}
                name="remarks"
                render={({ field }) => (
                    <FormItem><FormLabel>Remarks</FormLabel><FormControl><Textarea {...field} /></FormControl><FormMessage /></FormItem>
                )}
            />
            <DialogFooter>
              <DialogClose asChild><Button type="button" variant="secondary">Cancel</Button></DialogClose>
              <Button type="submit" disabled={form.formState.isSubmitting || !user}>
                {form.formState.isSubmitting ? "Saving..." : "Save Changes"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}
