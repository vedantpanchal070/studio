
"use client"

import { useForm, useWatch } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import type { z } from "zod"
import { useEffect, useRef, useState } from "react"

import { outputSchema } from "@/lib/schemas"
import { createOutput, getProcessNamesAndDetails } from "@/lib/actions"
import type { ProcessDetails } from "@/lib/actions"
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Combobox } from "@/components/ui/combobox"

type OutputFormValues = z.infer<typeof outputSchema>

export function CreateOutputForm() {
  const { toast } = useToast()
  const { user } = useAuth()
  const [processes, setProcesses] = useState<ProcessDetails[]>([])
  const [selectedProcess, setSelectedProcess] = useState<ProcessDetails | null>(null)
  
  const [finalAvgPrice, setFinalAvgPrice] = useState(0)
  const [netAvailableQty, setNetAvailableQty] = useState(0)

  const processSelectRef = useRef<HTMLButtonElement>(null)


  useEffect(() => {
    if (!user) return;
    const fetchProcesses = async () => {
      const processData = await getProcessNamesAndDetails(user.username)
      setProcesses(processData)
    }
    fetchProcesses()
  }, [user])
  
  const form = useForm<OutputFormValues>({
    resolver: zodResolver(outputSchema),
    defaultValues: {
      date: new Date(),
      productName: "",
      processUsed: "",
      scrape: 0,
      scrapeUnit: "kg",
      reduction: 0,
      processCharge: 0,
      notes: "",
      quantityProduced: 0,
      finalAveragePrice: 0,
    },
  })

  const watchedValues = useWatch({ control: form.control });

  useEffect(() => {
    if (!selectedProcess) {
      setFinalAvgPrice(0);
      setNetAvailableQty(0);
      return;
    }

    const { totalCost, totalProcessOutput } = selectedProcess;
    const { scrape = 0, scrapeUnit = 'kg', reduction = 0 } = watchedValues;
    const processCharge = Number(watchedValues.processCharge) || 0;

    let scrapeQty = 0;
    if (scrapeUnit === '%') {
      scrapeQty = totalProcessOutput * (scrape / 100);
    } else {
      scrapeQty = scrape;
    }

    const currentNetQty = totalProcessOutput - scrapeQty - (reduction || 0);
    setNetAvailableQty(currentNetQty);

    if (currentNetQty > 0) {
      const baseAvgPrice = totalCost / currentNetQty;
      const finalPrice = baseAvgPrice + processCharge;
      setFinalAvgPrice(finalPrice);
    } else {
      setFinalAvgPrice(0);
    }
  }, [watchedValues, selectedProcess]);


  const handleProcessChange = (processName: string) => {
    const process = processes.find(p => p.processName === processName)
    setSelectedProcess(process || null)
    if(process) {
      form.setValue("processUsed", process.processName)
      form.setValue("productName", process.processName)
    }
  }

  const onSubmit = async (values: OutputFormValues) => {
    if (!user) {
      toast({ title: "Error", description: "You must be logged in to create an output.", variant: "destructive" });
      return;
    }
    if (!selectedProcess) {
      toast({
        title: "Error",
        description: "Please select a process.",
        variant: "destructive",
      })
      return
    }
    
    const submissionData = {
      ...values,
      quantityProduced: netAvailableQty,
      finalAveragePrice: finalAvgPrice,
    }
    
    const result = await createOutput(user.username, submissionData)
    if (result.success) {
      toast({
        title: "Success!",
        description: result.message,
      })
      form.reset({
        date: new Date(),
        productName: "",
        processUsed: "",
        scrape: 0,
        scrapeUnit: "kg",
        reduction: 0,
        processCharge: 0,
        notes: "",
        quantityProduced: 0,
        finalAveragePrice: 0,
      })
      setSelectedProcess(null)
    } else {
      toast({
        title: "Error",
        description: result.message,
        variant: "destructive",
      })
    }
  }

  return (
    <>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          <FormField
            control={form.control}
            name="date"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Date</FormLabel>
                <FormControl>
                  <DatePicker value={field.value} onChange={field.onChange} nextFocusRef={processSelectRef} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          
          <FormField
            control={form.control}
            name="processUsed"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Process Name</FormLabel>
                 <Combobox
                    options={processes.map(p => ({ value: p.processName, label: p.processName }))}
                    value={field.value}
                    onChange={handleProcessChange}
                    placeholder="Select a process"
                    searchPlaceholder="Search processes..."
                  />
                <FormMessage />
              </FormItem>
            )}
          />
          
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
              <div className="flex items-end gap-2">
                  <FormField
                      control={form.control}
                      name="scrape"
                      render={({ field }) => (
                      <FormItem className="flex-grow">
                          <FormLabel>Scrape</FormLabel>
                          <FormControl>
                          <Input type="number" {...field} />
                          </FormControl>
                      </FormItem>
                      )}
                  />
                  <FormField
                      control={form.control}
                      name="scrapeUnit"
                      render={({ field }) => (
                      <FormItem>
                          <Select onValueChange={field.onChange} defaultValue={field.value}>
                              <FormControl>
                              <SelectTrigger className="w-[80px]">
                                  <SelectValue />
                              </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                  <SelectItem value="kg">kg</SelectItem>
                                  <SelectItem value="%">%</SelectItem>
                              </SelectContent>
                          </Select>
                      </FormItem>
                      )}
                  />
              </div>
              <FormField
                  control={form.control}
                  name="reduction"
                  render={({ field }) => (
                  <FormItem>
                      <FormLabel>Reduction (optional)</FormLabel>
                      <FormControl>
                      <Input type="number" {...field} />
                      </FormControl>
                  </FormItem>
                  )}
              />
          </div>

          <FormField
            control={form.control}
            name="processCharge"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Process Charge (per kg)</FormLabel>
                <FormControl>
                  <Input type="number" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <Card>
              <CardContent className="p-4 grid grid-cols-2 gap-4 text-center">
                  <div>
                      <p className="text-sm text-muted-foreground">Final Average Price</p>
                      <p className="text-2xl font-bold">{finalAvgPrice.toFixed(2)}</p>
                  </div>
                  <div>
                      <p className="text-sm text-muted-foreground">Net Available Qty</p>
                      <p className="text-2xl font-bold">{netAvailableQty.toFixed(2)}</p>
                  </div>
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
          <div className="flex gap-4">
              <Button type="submit" disabled={form.formState.isSubmitting || !selectedProcess || !user}>
              {form.formState.isSubmitting ? "Saving..." : "Save Output"}
              </Button>
          </div>
        </form>
      </Form>
    </>
  )
}

    