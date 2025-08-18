import { Card, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { PlusCircle, LayoutList } from "lucide-react";
import Link from "next/link";

export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-br from-background to-secondary p-4 sm:p-8">
      <div className="text-center mb-12">
        <h1 className="text-5xl font-bold text-primary tracking-tight">InventoMax</h1>
        <p className="text-muted-foreground mt-2 text-lg">Your Complete Inventory Management Solution</p>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl w-full">
        <MenuCard
          href="/create"
          icon={<PlusCircle className="w-12 h-12 text-primary" />}
          title="Create"
          description="Add new vouchers, production processes, and outputs."
        />
        <MenuCard
          href="/view"
          icon={<LayoutList className="w-12 h-12 text-primary" />}
          title="View"
          description="Browse and manage inventory, production, and finished goods."
        />
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
          <CardTitle className="text-2xl">{title}</CardTitle>
          <CardDescription className="text-base">{description}</CardDescription>
        </CardHeader>
      </Card>
    </Link>
  );
}
