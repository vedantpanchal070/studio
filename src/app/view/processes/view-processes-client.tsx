
"use client"

import React, { useState } from "react"
import { useForm } from "react-hook-form"
import { z } from "zod"
import { zodResolver } from "@hookform/resolvers/zod"
import { Search, Trash2, ChevronDown } from "lucide-react"
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
import { cn } from "@/lib/utils"

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

function ProcessEntry({ process, onDelete }: { process: Process, onDelete: (process: Process) => void }) {
    const [isOpen, setIsOpen] = useState(false)

    const totalAmount = process.rawMaterials.reduce((sum, mat) => sum + ((mat.rate ?? 0) * mat.quantity), 0);
    const totalIngredients = process.rawMaterials.reduce((sum, mat) => sum + mat.quantity, 0);
    const costPerUnit = process.totalProcessOutput > 0 ? totalAmount / process.totalProcessOutput : 0;
    
    return (
        <React.Fragment>
            <TableRow className="hover:bg-muted/50" data-state={isOpen ? 'open' : 'closed'}>
                <TableCell>{format(new Date(process.date), 'dd/MM/yyyy')}</TableCell>
                <TableCell>{process.processName}</TableCell>
                <TableCell>{costPerUnit.toFixed(2)}</TableCell>
                <TableCell>{totalIngredients.toFixed(2)}</TableCell>
                <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-2">
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
                                    <AlertDialogAction onClick={() => onDelete(process)}>Delete</AlertDialogAction>
                                </AlertDialogFooter>
                            </AlertDialogContent>
                        </AlertDialog>
                        <Button variant="ghost" size="icon" onClick={() => setIsOpen(!isOpen)}>
                            <ChevronDown className={cn("h-4 w-4 transition-transform", isOpen && "rotate-180")} />
                            <span className="sr-only">{isOpen ? "Collapse" : "Expand"}</span>
                        </Button>
                    </div>
                </TableCell>
            </TableRow>
            {isOpen && (
                <TableRow>
                    <TableCell colSpan={5} className="p-0">
                        <div className="p-4 bg-background">
                            <h4 className="font-semibold mb-2">Recipe Details:</h4>
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
                                    {process.rawMaterials.map((material, index) => (
                                        <TableRow key={index}>
                                            <TableCell>{material.name}</TableCell>
                                            <TableCell>{material.quantity.toFixed(2)} {material.quantityType}</TableCell>
                                            <TableCell>{(material.rate ?? 0).toFixed(2)}</TableCell>
                                            <TableCell>{((material.rate ?? 0) * material.quantity).toFixed(2)}</TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                            {process.notes && <p className="mt-4 text-sm text-muted-foreground">Notes: {process.notes}</p>}
                        </div>
                    </TableCell>
                </TableRow>
            )}
        </React.Fragment>
    )
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
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 items-end">
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
             <div className="flex justify-end gap-2">
                <Button type="button" variant="outline" onClick={handleClear} className="w-full">
                Clear
                </Button>
                <Button type="submit" disabled={isLoading} className="w-full">
                <Search className="mr-2 h-4 w-4" />
                {isLoading ? "Searching..." : "Search"}
                </Button>
            </div>
          </div>
        </form>
      </Form>

      <div className="rounded-md border">
        <div className="max-h-96 overflow-auto">
            <Table>
                <TableHeader className="sticky top-0 bg-background">
                    <TableRow>
                        <TableHead className="w-[150px]">Date</TableHead>
                        <TableHead className="min-w-[250px]">Process Name</TableHead>
                        <TableHead className="w-[150px]">Cost/Unit</TableHead>
                        <TableHead className="w-[150px]">Ingred. Qty</TableHead>
                        <TableHead className="text-right w-[100px]">Actions</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                  {processes.length > 0 ? processes.map((process, pIndex) => (
                      <ProcessEntry key={pIndex} process={process} onDelete={handleDelete} />
                  )) : (
                    <TableRow>
                        <TableCell colSpan={5} className="h-24 text-center">
                            No process history found for the selected criteria.
                        </TableCell>
                    </TableRow>
                  )}
                </TableBody>
            </Table>
        </div>
      </div>
    </div>
  )
}
