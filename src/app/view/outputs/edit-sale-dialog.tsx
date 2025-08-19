
"use client"

import { useEffect, useState } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"

import { saleSchema, type Sale } from "@/lib/schemas"
import { getInventoryItem, updateSale } from "@/lib/actions"
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
import { DatePicker } from "@/components/date-picker"
import { UppercaseInput } from "@/components/ui/uppercase-input"

type SalesFormValues = z.infer<typeof saleSchema>

interface EditSaleDialogProps {
  isOpen: boolean
  onOpenChange: (open: boolean) => void
  sale: Sale
  onSaleUpdated: () => void
}

export function EditSaleDialog({ isOpen, onOpenChange, sale, onSaleUpdated }: EditSaleDialogProps) {
  const { toast } = useToast()
  const { user } = useAuth()
  const [availableQty, setAvailableQty] = useState(0)
  const [totalAmount, setTotalAmount] = useState(0)

  const form = useForm<SalesFormValues>({
    resolver: zodResolver(saleSchema),
    defaultValues: {
      ...sale,
      date: new Date(sale.date),
    },
  })

  useEffect(() => {
    form.reset({
      ...sale,
      date: new Date(sale.date),
    })
  }, [sale, form])

  const saleQty = form.watch("saleQty")
  const salePrice = form.watch("salePrice")

  useEffect(() => {
    if (!user) return;
    const fetchStock = async () => {
      if (sale.productName) {
        // We add back the original quantity of this specific sale to calculate the "available before this sale" stock
        const stock = await getInventoryItem(user.username, sale.productName)
        setAvailableQty(stock.availableStock + sale.saleQty)
      } else {
        setAvailableQty(0)
      }
    }
    if (isOpen) {
        fetchStock()
    }
  }, [sale, isOpen, user])

  useEffect(() => {
    const amount = (saleQty || 0) * (salePrice || 0)
    setTotalAmount(amount)
    form.setValue("totalAmount", amount)
  }, [saleQty, salePrice, form])

  const onSubmit = async (values: SalesFormValues) => {
    if (!user) {
      toast({ title: "Error", description: "You must be logged in.", variant: "destructive" });
      return;
    }
    if (values.saleQty > availableQty) {
      toast({
        title: "Error",
        description: `Not enough stock. Available before this sale: ${availableQty}`,
        variant: "destructive",
      })
      return
    }

    const result = await updateSale(user.username, values)
    if (result.success) {
      toast({
        title: "Success!",
        description: "Sale has been updated.",
      })
      onSaleUpdated()
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
          <DialogTitle>Edit Sale</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="productName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Product</FormLabel>
                  <FormControl>
                    <Input {...field} readOnly className="bg-muted" />
                  </FormControl>
                  <p className="text-sm text-muted-foreground mt-1">Available (before this sale): {availableQty.toFixed(2)}</p>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="date"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Date of Sale</FormLabel>
                  <FormControl>
                    <DatePicker value={field.value} onChange={field.onChange} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="clientCode"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Client Code</FormLabel>
                  <FormControl>
                    <UppercaseInput {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="saleQty"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Sale Qty</FormLabel>
                    <FormControl>
                      <Input type="number" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="salePrice"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Sale Price</FormLabel>
                    <FormControl>
                      <Input type="number" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            <FormItem>
              <FormLabel>Total Amount</FormLabel>
              <FormControl>
                <Input readOnly value={totalAmount.toFixed(2)} className="bg-muted font-semibold" />
              </FormControl>
            </FormItem>

            <DialogFooter>
              <DialogClose asChild>
                <Button type="button" variant="secondary">Cancel</Button>
              </DialogClose>
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

    