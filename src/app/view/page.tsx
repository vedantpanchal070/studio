
import { Card, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { ScrollText, ClipboardList, Package, ArrowLeft, Warehouse } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function ViewPage() {
  return (
    <main className="flex min-h-screen flex-col items-center p-4 sm:p-8 bg-background">
      <div className="w-full max-w-5xl">
        <Link href="/" className="mb-8 inline-block">
          <Button variant="outline"><ArrowLeft className="mr-2 h-4 w-4" /> Back to Home</Button>
        </Link>
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold tracking-tight">View Data</h1>
          <p className="text-muted-foreground mt-2 text-lg">Browse ledgers and historical records.</p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          <MenuCard
            href="/view/vouchers"
            icon={<ScrollText className="w-12 h-12 text-primary" />}
            title="View Vouchers"
            description="See the inventory ledger for raw materials."
          />
           <MenuCard
            href="/view/inventory"
            icon={<Warehouse className="w-12 h-12 text-primary" />}
            title="Inventory"
            description="View and sell finished goods stock on hand."
          />
          <MenuCard
            href="/view/processes"
            icon={<ClipboardList className="w-12 h-12 text-primary" />}
            title="View Processes"
            description="Review past production runs and recipes."
          />
          <MenuCard
            href="/view/outputs"
            icon={<Package className="w-12 h-12 text-primary" />}
            title="View Outputs"
            description="Check the ledger for finished goods."
          />
        </div>
      </div>
    </main>
  );
}

function MenuCard({ href, icon, title, description }: { href: string; icon: React.ReactNode; title: string; description: string }) {
  return (
    <Link href={href} className="group">
      <Card className="h-full hover:shadow-lg hover:border-primary transition-all duration-300 transform hover:-translate-y-1">
        <CardHeader className="flex flex-col items-center text-center gap-4 p-6">
          {icon}
          <CardTitle>{title}</CardTitle>
          <CardDescription>{description}</CardDescription>
        </CardHeader>
      </Card>
    </Link>
  );
}
