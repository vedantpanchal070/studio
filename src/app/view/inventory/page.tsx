
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
import { getFinishedGoodsInventory } from "@/lib/actions"

export const dynamic = 'force-dynamic'

export default async function ViewInventoryPage() {
  const initialData = await getFinishedGoodsInventory()

  return (
    <main className="flex min-h-screen flex-col items-center bg-background p-4 sm:p-8">
      <div className="w-full max-w-7xl">
        <Link href="/view" className="mb-6 inline-block">
          <Button variant="outline">
            <ArrowLeft className="mr-2 h-4 w-4" /> Back to View Menu
          </Button>
        </Link>
        <Card className="shadow-lg">
          <CardHeader>
            <CardTitle className="text-2xl">Finished Goods Inventory</CardTitle>
            <CardDescription>
              View and sell your current stock of finished products.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <InventoryClient initialData={initialData} />
          </CardContent>
        </Card>
      </div>
    </main>
  )
}
