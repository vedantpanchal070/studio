
import { InventoryClient } from "./inventory-client"
import { getFinishedGoodsInventory } from "@/lib/actions"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

export const dynamic = 'force-dynamic'

export default async function Home() {
  const initialData = await getFinishedGoodsInventory()

  return (
    <main className="flex min-h-screen flex-col items-center bg-background p-4 sm:p-8">
      <div className="w-full max-w-7xl">
        <div className="text-center mb-8">
            <h1 className="text-5xl font-bold text-primary tracking-tight">InventoMax</h1>
            <p className="text-muted-foreground mt-2 text-lg">Finished Goods Inventory</p>
        </div>
        <Card className="shadow-lg">
          <CardHeader>
            <CardTitle className="text-2xl">Stock On Hand</CardTitle>
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
