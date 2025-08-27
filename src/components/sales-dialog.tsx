
"use client"

import { useEffect, useRef, useState } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { useRouter } from "next/navigation"

import { saleSchema, type FinishedGood } from "@/lib/schemas"
import { getInventoryItem, recordSale } from "@/lib/actions"
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
import { DatePicker } from "./date-picker"
import { UppercaseInput } from "./ui/uppercase-input"
import { ReadOnlyInput } from "@/components/ui/read-only-input"
import { Combobox } from "@/components/ui/combobox"

type SalesFormValues = z.infer<typeof saleSchema>

interface SalesDialogProps {
  isOpen: boolean
  onOpenChange: (open: boolean) => void;
  finishedGoods: FinishedGood[];
}

export function SalesDialog({ isOpen, onOpenChange, finishedGoods }: SalesDialogProps) {
  const { toast } = useToast()
  const { user } = useAuth()
  const router = useRouter()
  const [availableQty, setAvailableQty] = useState(0)
  const [totalAmount, setTotalAmount] = useState(0)
  const dateOfSaleRef = useRef<HTMLButtonElement>(null)


  const form = useForm<SalesFormValues>({
    resolver: zodResolver(saleSchema),
    defaultValues: {
      date: new Date(),
      productName: "",
      clientCode: "",
      saleQty: 0,
      salePrice: 0,
      totalAmount: 0,
    },
  })
  
  const saleQty = form.watch("saleQty")
  const salePrice = form.watch("salePrice")
  const selectedProduct = form.watch("productName")

  useEffect(() => {
    if (!user) return;
    const fetchStock = async () => {
      if (selectedProduct) {
        const stock = await getInventoryItem(user.username, selectedProduct)
        setAvailableQty(stock.availableStock)
      } else {
        setAvailableQty(0)
      }
    }
    fetchStock()
  }, [selectedProduct, user])

  useEffect(() => {
    const amount = (saleQty || 0) * (salePrice || 0)
    setTotalAmount(amount)
    form.setValue("totalAmount", amount)
  }, [saleQty, salePrice, form])

  const handleOpenChange = (open: boolean) => {
    if (!open) {
      form.reset({
          date: new Date(),
          productName: "",
          clientCode: "",
          saleQty: 0,
          salePrice: 0,
          totalAmount: 0,
      })
      setAvailableQty(0)
      setTotalAmount(0)
    }
    onOpenChange(open)
  }

  const onSubmit = async (values: SalesFormValues) => {
    if (!user) {
        toast({ title: "Error", description: "You must be logged in to record a sale.", variant: "destructive" });
        return;
    }
    if (values.saleQty > availableQty) {
        toast({
            title: "Error",
            description: `Not enough stock. Available: ${availableQty}`,
            variant: "destructive"
        })
        return;
    }
    
    const result = await recordSale(user.username, values)
    if (result.success) {
      toast({
        title: "Success!",
        description: "Sale has been recorded.",
      })
      handleOpenChange(false)
      router.refresh() 
    } else {
      toast({
        title: "Error",
        description: result.message,
        variant: "destructive",
      })
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Sell Finished Product</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
             <FormField
              control={form.control}
              name="productName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Product to Sell</FormLabel>
                   <Combobox
                      options={finishedGoods.map((good) => ({ value: good.name, label: good.name }))}
                      value={field.value}
                      onChange={(value) => {
                        field.onChange(value);
                        dateOfSaleRef.current?.focus();
                      }}
                      placeholder="Select a product"
                      searchPlaceholder="Search products..."
                    />
                   {selectedProduct && <p className="text-sm text-muted-foreground mt-1">Available: {availableQty.toFixed(2)}</p>}
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
                    <DatePicker value={field.value} onChange={field.onChange} ref={dateOfSaleRef} />
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
                        <FormLabel>Sale Qty (kg)</FormLabel>
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
                        <FormLabel>Sale Price (Rs/kg)</FormLabel>
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
                    <ReadOnlyInput value={totalAmount.toFixed(2)} />
                </FormControl>
            </FormItem>

            <DialogFooter>
              <DialogClose asChild>
                <Button type="button" variant="secondary">Cancel</Button>
              </DialogClose>
              <Button type="submit" disabled={form.formState.isSubmitting || !user}>
                {form.formState.isSubmitting ? "Saving..." : "Confirm Sale"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}
