
"use client"

import React, { useEffect, useState } from "react"
import { useForm, useFieldArray, useWatch } from "react-hook-form"
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
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow, TableFooter } from "@/components/ui/table"

type ProcessFormValues = z.infer<typeof processSchema>

// Mock function to fetch inventory data
// In a real app, this would be a server action calling the database
async function getInventoryData(name: string) {
  console.log(`Fetching mock data for ${name}`);
  // Returning mock data for demonstration
  return {
    availableStock: Math.floor(Math.random() * 200) + 50, // Random stock between 50 and 250
    averagePrice: Math.random() * 10 + 5, // Random price between 5 and 15
  };
}

interface MaterialData {
  availableStock: number;
  rate: number;
}

export function CreateProcessForm() {
  const { toast } = useToast()
  const form = useForm<ProcessFormValues>({
    resolver: zodResolver(processSchema),
    defaultValues: {
      date: new Date(),
      processName: "",
      totalProcessOutput: 100,
      outputUnit: "KG",
      rawMaterials: [{ name: "", quantity: 0, ratio: 0 }],
      notes: "",
    },
  })

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "rawMaterials",
  })

  const totalProcessOutput = useWatch({ control: form.control, name: "totalProcessOutput" });
  const rawMaterials = useWatch({ control: form.control, name: "rawMaterials" });

  const [materialsData, setMaterialsData] = useState<Record<string, MaterialData>>({});

  useEffect(() => {
    const fetchAllMaterialsData = async () => {
      const newMaterialsData: Record<string, MaterialData> = {};
      for (const material of rawMaterials) {
        if (material.name && !materialsData[material.name]) {
          try {
            const data = await getInventoryData(material.name);
            newMaterialsData[material.name] = { availableStock: data.availableStock, rate: data.averagePrice };
          } catch (error) {
            console.error(`Failed to fetch data for ${material.name}`, error);
          }
        }
      }
      if (Object.keys(newMaterialsData).length > 0) {
        setMaterialsData(prev => ({ ...prev, ...newMaterialsData }));
      }
    };
    fetchAllMaterialsData();
  }, [rawMaterials, materialsData]);
  
  // Moved the calculation logic into a separate top-level useEffect hook
  // to avoid calling hooks inside a loop.
  useEffect(() => {
    rawMaterials.forEach((material, index) => {
        const output = (material.ratio ?? 0) * (totalProcessOutput ?? 0) / 100;
        // Only set value if it has changed to avoid infinite loops
        if (form.getValues(`rawMaterials.${index}.quantity`) !== output) {
            form.setValue(`rawMaterials.${index}.quantity`, output, { shouldValidate: true });
        }
    });
  }, [rawMaterials, totalProcessOutput, form]);
  
  const calculatedMaterials = fields.map((field, index) => {
    const material = rawMaterials[index] || {};
    const data = material.name ? materialsData[material.name] : { availableStock: 0, rate: 0 };
    const quantity = material.quantity ?? 0;
    const amount = quantity * (data?.rate || 0);
    const stockIsInsufficient = quantity > (data?.availableStock || 0);

    return { 
        ...material, 
        output: quantity,
        availableStock: data?.availableStock || 0,
        rate: data?.rate || 0,
        amount, 
        stockIsInsufficient 
    };
  });

  const totalRatio = calculatedMaterials.reduce((sum, mat) => sum + (mat.ratio ?? 0), 0);
  const totalAmount = calculatedMaterials.reduce((sum, mat) => sum + mat.amount, 0);


  const onSubmit = async (values: ProcessFormValues) => {
    // Check for insufficient stock before submitting
    if (calculatedMaterials.some(m => m.stockIsInsufficient)) {
      toast({
        title: "Error",
        description: "Insufficient stock for one or more materials. Please check quantities.",
        variant: "destructive",
      })
      return;
    }

    const result = await createProcess(values)
    if (result.success) {
      toast({
        title: "Success!",
        description: result.message,
      })
      form.reset()
      setMaterialsData({})
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

        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
            <FormField
                control={form.control}
                name="totalProcessOutput"
                render={({ field }) => (
                <FormItem>
                    <FormLabel>Total Process Output</FormLabel>
                    <FormControl>
                    <Input type="number" {...field} onChange={e => field.onChange(parseFloat(e.target.value) || 0)} />
                    </FormControl>
                    <FormMessage />
                </FormItem>
                )}
            />
            <FormField
                control={form.control}
                name="outputUnit"
                render={({ field }) => (
                <FormItem>
                    <FormLabel>Output Unit</FormLabel>
                    <FormControl>
                    <UppercaseInput {...field} />
                    </FormControl>
                    <FormMessage />
                </FormItem>
                )}
            />
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Recipe Ingredients</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[200px]">Ingredient</TableHead>
                    <TableHead>Avail. Stock</TableHead>
                    <TableHead>% Ratio</TableHead>
                    <TableHead>Output</TableHead>
                    <TableHead>Rate</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {fields.map((field, index) => {
                    const material = calculatedMaterials[index];
                    return (
                    <TableRow key={field.id}>
                      <TableCell>
                        <FormField
                          control={form.control}
                          name={`rawMaterials.${index}.name`}
                          render={({ field }) => <UppercaseInput {...field} />}
                        />
                      </TableCell>
                      <TableCell>
                         <span className={material?.stockIsInsufficient ? "text-destructive" : ""}>
                            {material?.availableStock?.toFixed(2) || '0.00'}
                         </span>
                      </TableCell>
                      <TableCell>
                        <FormField
                            control={form.control}
                            name={`rawMaterials.${index}.ratio`}
                            render={({ field }) => <Input type="number" {...field} onChange={e => field.onChange(parseFloat(e.target.value) || 0)} />}
                        />
                      </TableCell>
                      <TableCell>{material?.output?.toFixed(2) || '0.00'}</TableCell>
                      <TableCell>{material?.rate?.toFixed(2) || '0.00'}</TableCell>
                      <TableCell>{material?.amount?.toFixed(2) || '0.00'}</TableCell>
                      <TableCell>
                        <Button
                          type="button"
                          variant="destructive"
                          size="icon"
                          onClick={() => remove(index)}
                          disabled={fields.length === 1}
                        >
                          <Trash2 />
                        </Button>
                      </TableCell>
                    </TableRow>
                  )})}
                </TableBody>
                <TableFooter>
                    <TableRow>
                        <TableCell colSpan={2}>Total</TableCell>
                        <TableCell>{totalRatio.toFixed(2)}%</TableCell>
                        <TableCell></TableCell>
                        <TableCell></TableCell>
                        <TableCell>{totalAmount.toFixed(2)}</TableCell>
                        <TableCell></TableCell>
                    </TableRow>
                </TableFooter>
              </Table>
            </div>
            <Separator className="my-4" />
            <Button
              type="button"
              variant="outline"
              onClick={() => append({ name: "", quantity: 0, ratio: 0 })}
            >
              <PlusCircle className="mr-2" />
              Add Ingredient
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
          {form.formState.isSubmitting ? "Saving..." : "Save and Close"}
        </Button>
      </form>
    </Form>
  )
}

    