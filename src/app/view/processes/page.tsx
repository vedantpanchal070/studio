
import Link from "next/link"
import { ArrowLeft } from "lucide-react"

import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { ViewProcessesClient } from "./view-processes-client"
import { getProcesses, getUniqueProcessNames } from "@/lib/actions"

export const dynamic = 'force-dynamic'

export default async function ViewProcessesPage() {
  const initialData = await getProcesses({})
  const processNames = await getUniqueProcessNames()

  return (
    <main className="flex min-h-screen flex-col items-center bg-background p-4 sm:p-8">
      <div className="w-full max-w-7xl">
        <Link href="/" className="mb-6 inline-block">
          <Button variant="outline">
            <ArrowLeft className="mr-2 h-4 w-4" /> Back to Home
          </Button>
        </Link>
        <Card className="shadow-lg">
          <CardHeader>
            <CardTitle className="text-2xl">View Processes</CardTitle>
            <CardDescription>
              Review the history of all production runs and their recipes.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ViewProcessesClient 
              initialData={initialData}
              processNames={processNames} 
            />
          </CardContent>
        </Card>
      </div>
    </main>
  )
}
