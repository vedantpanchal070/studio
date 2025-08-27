
"use client"

import { useEffect, useState } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"

import { saleSchema, type Sale, type FinishedGood } from "@/lib/schemas"
import { getInventoryItem, updateSale, getFinishedGoods } from "@/lib/actions"
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
import { Combobox } from "@/components/ui/combobox"

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
  const [finishedGoods, setFinishedGoods] = useState<FinishedGood[]>([])

  const form = useForm<SalesFormValues>({
    resolver: zodResolver(saleSchema),
    defaultValues: {
      ...sale,
      date: new Date(sale.date),
    },
  })
  
  const selectedProduct = form.watch("productName");
  const saleQty = form.watch("saleQty")
  const salePrice = form.watch("salePrice")

  useEffect(() => {
    form.reset({
      ...sale,
      date: new Date(sale.date),
    })
  }, [sale, form])


  useEffect(() => {
    if (!user || !isOpen) return;
    const fetchPrerequisites = async () => {
        // Fetch all possible products for the dropdown
        const goods = await getFinishedGoods(user.username);
        setFinishedGoods(goods);

        // Fetch stock for the currently selected product
        if (selectedProduct) {
            const stock = await getInventoryItem(user.username, selectedProduct);
            // To calculate "available before this sale", we add back the quantity from the original sale,
            // but only if the product being viewed is the same as the one on the original sale record.
            const stockBeforeThisSale = stock.availableStock + (selectedProduct === sale.productName ? sale.saleQty : 0);
            setAvailableQty(stockBeforeThisSale);
        } else {
            setAvailableQty(0);
        }
    }
    fetchPrerequisites();
  }, [selectedProduct, sale, isOpen, user])


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
        description: `Not enough stock. Available before this sale: ${availableQty.toFixed(2)}`,
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
                   <Combobox
                      options={finishedGoods.map(g => ({ value: g.name, label: g.name }))}
                      value={field.value}
                      onChange={field.onChange}
                      placeholder="Select a product"
                    />
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
                      <Input type="number" {...field} onChange={e => field.onChange(e.target.value === '' ? '' : +e.target.value)} />
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
                      <Input type="number" {...field} onChange={e => field.onChange(e.target.value === '' ? '' : +e.target.value)} />
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
