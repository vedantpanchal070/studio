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
import { CreateProcessForm } from "./create-process-form"

export default function CreateProcessPage() {
  return (
    <main className="flex min-h-screen flex-col items-center bg-background p-4 sm:p-8">
      <div className="w-full max-w-5xl">
        <Link href="/create" className="mb-6 inline-block">
          <Button variant="outline">
            <ArrowLeft className="mr-2 h-4 w-4" /> Back to Create Menu
          </Button>
        </Link>
        <Card className="shadow-lg">
          <CardHeader>
            <CardTitle className="text-2xl">Create New Process</CardTitle>
            <CardDescription>
              Define the recipe for manufacturing a new product from raw materials.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <CreateProcessForm />
          </CardContent>
        </Card>
      </div>
    </main>
  )
}
