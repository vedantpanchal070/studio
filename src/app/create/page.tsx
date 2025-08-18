import { Card, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { FilePlus, Cpu, PackagePlus, ArrowLeft } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function CreatePage() {
  return (
    <main className="flex min-h-screen flex-col items-center p-4 sm:p-8 bg-background">
      <div className="w-full max-w-5xl">
        <Link href="/" className="mb-8 inline-block">
          <Button variant="outline"><ArrowLeft className="mr-2 h-4 w-4" /> Back to Home</Button>
        </Link>
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold tracking-tight">Create New Entry</h1>
          <p className="text-muted-foreground mt-2 text-lg">What would you like to create?</p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <MenuCard
            href="/create/voucher"
            icon={<FilePlus className="w-12 h-12 text-primary" />}
            title="New Voucher"
            description="Record a new raw material purchase."
          />
          <MenuCard
            href="/create/process"
            icon={<Cpu className="w-12 h-12 text-primary" />}
            title="New Process"
            description="Define a production process or recipe."
          />
          <MenuCard
            href="/create/output"
            icon={<PackagePlus className="w-12 h-12 text-primary" />}
            title="New Output"
            description="Finalize and record finished goods."
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
