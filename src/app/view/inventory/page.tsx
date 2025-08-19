
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
import { InventoryClient } from "./inventory-client"
import { SalesDialogWrapper } from "./sales-dialog-wrapper"

// This page must be client-rendered to get the user from the auth context
// to fetch the correct data. We pass an empty array as initialData.
export default function ViewInventoryPage() {
  return (
    <main className="flex min-h-screen flex-col items-center bg-background p-4 sm:p-8">
      <div className="w-full max-w-5xl">
        <div className="flex justify-between items-center mb-6">
            <Link href="/" className="inline-block">
            <Button variant="outline">
                <ArrowLeft className="mr-2 h-4 w-4" /> Back to Home
            </Button>
            </Link>
            <SalesDialogWrapper />
        </div>
        <Card className="shadow-lg">
          <CardHeader>
              <CardTitle className="text-2xl">Finished Goods Inventory</CardTitle>
              <CardDescription>
                View and sell your current stock of finished products.
              </CardDescription>
          </CardHeader>
          <CardContent>
            <InventoryClient initialData={[]} />
          </CardContent>
        </Card>
      </div>
    </main>
  )
}

    