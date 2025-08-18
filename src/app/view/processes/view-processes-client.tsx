
"use client"

import React, { useState } from "react"
import { useForm } from "react-hook-form"
import { z } from "zod"
import { zodResolver } from "@hookform/resolvers/zod"
import { Search, Trash2 } from "lucide-react"
import { format } from 'date-fns'

import type { Process } from "@/lib/schemas"
import { getProcesses, deleteProcess } from "@/lib/actions"
import { Button } from "@/components/ui/button"
import { DatePicker } from "@/components/date-picker"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
} from "@/components/ui/form"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion"
import { Badge } from "@/components/ui/badge"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import { useToast } from "@/hooks/use-toast"

const searchSchema = z.object({
  name: z.string().optional(),
  startDate: z.date().optional(),
  endDate: z.date().optional(),
})

type SearchFormValues = z.infer<typeof searchSchema>

interface ViewProcessesClientProps {
  initialData: Process[];
  processNames: string[];
}

export function ViewProcessesClient({ initialData, processNames }: ViewProcessesClientProps) {
  const { toast } = useToast()
  const [processes, setProcesses] = useState<Process[]>(initialData)
  const [isLoading, setIsLoading] = useState(false)

  const form = useForm<SearchFormValues>({
    resolver: zodResolver(searchSchema),
  })

  const fetchProcesses = async (filters: SearchFormValues = {}) => {
    setIsLoading(true)
    const results = await getProcesses(filters)
    setProcesses(results)
    setIsLoading(false)
  }

  const onSubmit = (values: SearchFormValues) => {
    fetchProcesses(values)
  }

  const handleClear = () => {
    form.reset({ name: "", startDate: undefined, endDate: undefined })
    fetchProcesses()
  }
  
  const handleDelete = async (process: Process) => {
    const result = await deleteProcess(process);
    if (result.success) {
      toast({ title: "Success", description: result.message });
      fetchProcesses(form.getValues());
    } else {
      toast({ title: "Error", description: result.message, variant: "destructive" });
    }
  };


  return (
    <div className="space-y-6">
      <Form {...form}>
        <form
          onSubmit={form.handleSubmit(onSubmit)}
          className="rounded-lg border p-4 space-y-4"
        >
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
             <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Process Name</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select a process" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {processNames.map(name => (
                        <SelectItem key={name} value={name}>{name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="startDate"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Start Date</FormLabel>
                  <FormControl>
                    <DatePicker value={field.value} onChange={field.onChange} />
                  </FormControl>
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="endDate"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>End Date</FormLabel>
                  <FormControl>
                    <DatePicker value={field.value} onChange={field.onChange} />
                  </FormControl>
                </FormItem>
              )}
            />
          </div>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={handleClear}>
              Clear
            </Button>
            <Button type="submit" disabled={isLoading}>
              <Search className="mr-2 h-4 w-4" />
              {isLoading ? "Searching..." : "Search"}
            </Button>
          </div>
        </form>
      </Form>

      <Accordion type="multiple" className="w-full">
        {processes.length > 0 ? processes.map((process, index) => {
          const totalIngredientCost = process.rawMaterials.reduce((sum, mat) => sum + (mat.rate ?? 0) * mat.quantity, 0);
          const costPerUnit = process.totalProcessOutput > 0 ? totalIngredientCost / process.totalProcessOutput : 0;
          const totalIngredientQty = process.rawMaterials.reduce((sum, mat) => sum + mat.quantity, 0);

          return (
            <AccordionItem value={`item-${index}`} key={index}>
                <div className="flex items-center w-full">
                    <AccordionTrigger className="flex-grow">
                        <div className="flex justify-between items-center w-full pr-4">
                        <div className="flex gap-4 items-center">
                            <Badge variant="outline">{format(new Date(process.date), 'yyyy-MM-dd')}</Badge>
                            <span className="font-semibold text-primary">{process.processName}</span>
                        </div>
                        <div className="text-right">
                            <p className="text-sm">Cost/Unit: <span className="font-semibold">{costPerUnit.toFixed(2)}</span></p>
                            <p className="text-xs text-muted-foreground">Total Qty: {totalIngredientQty.toFixed(2)} {process.outputUnit}</p>
                        </div>
                        </div>
                    </AccordionTrigger>
                    <div className="flex items-center gap-2 pl-2">
                        <AlertDialog>
                            <AlertDialogTrigger asChild>
                            <Button variant="ghost" size="icon">
                                <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                            <AlertDialogHeader>
                                <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                                <AlertDialogDescription>
                                    This will delete the process and add all consumed raw materials back to your inventory. This action cannot be undone.
                                </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction onClick={() => handleDelete(process)}>Delete</AlertDialogAction>
                            </AlertDialogFooter>
                            </AlertDialogContent>
                        </AlertDialog>
                    </div>
                </div>
              <AccordionContent>
                <div className="p-4 bg-muted/50 rounded-md">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Ingredient</TableHead>
                                <TableHead>Qty Used</TableHead>
                                <TableHead>Rate</TableHead>
                                <TableHead>Amount</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {process.rawMaterials.map((mat, matIndex) => (
                                <TableRow key={matIndex}>
                                    <TableCell>{mat.name}</TableCell>
                                    <TableCell>{mat.quantity.toFixed(2)} {mat.quantityType}</TableCell>
                                    <TableCell>{(mat.rate ?? 0).toFixed(2)}</TableCell>
                                    <TableCell>{((mat.rate ?? 0) * mat.quantity).toFixed(2)}</TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                    {process.notes && <p className="text-sm text-muted-foreground mt-4">Notes: {process.notes}</p>}
                </div>
              </AccordionContent>
            </AccordionItem>
          )
        }) : (
          <div className="text-center py-10 text-muted-foreground">
            No process history found for the selected criteria.
          </div>
        )}
      </Accordion>
    </div>
  )
}
