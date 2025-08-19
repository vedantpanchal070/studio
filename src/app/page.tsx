
"use client"

import { Card, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { PlusCircle, LayoutList, Warehouse, LogOut, Settings, UserCircle } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { useAuth } from "@/hooks/use-auth";
import { InstallPwaButton } from "@/components/install-pwa-button";
import { Button } from "@/components/ui/button";

export default function Home() {
  const { user, loading, logout } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !user) {
      router.push('/login');
    }
  }, [user, loading, router]);

  if (loading || !user) {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center bg-background p-4 sm:p-8">
        <p>Loading...</p>
      </main>
    );
  }

  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-background p-4 sm:p-8">
      <div className="w-full max-w-5xl">
        <div className="flex justify-between items-center mb-12">
            <h1 className="text-5xl font-bold text-primary tracking-tight">InventoMax</h1>
            <div className="flex items-center gap-2">
               <Button variant="outline">
                <UserCircle className="mr-2 h-4 w-4" />
                {user.username}
              </Button>
              <Link href="/settings">
                <Button variant="outline" size="icon">
                  <Settings className="h-4 w-4" />
                  <span className="sr-only">Settings</span>
                </Button>
              </Link>
              <Button variant="outline" onClick={logout}>
                <LogOut className="mr-2 h-4 w-4" />
                Logout
              </Button>
            </div>
        </div>
         <p className="text-muted-foreground text-center -mt-8 mb-12 text-lg">Your Complete Inventory Management Solution</p>
       
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
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
              description="Browse and manage production and finished goods."
            />
             <MenuCard
              href="/view/inventory"
              icon={<Warehouse className="w-12 h-12 text-primary" />}
              title="Inventory"
              description="View and sell finished goods stock on hand."
            />
        </div>
        <div className="mt-12 text-center">
            <InstallPwaButton />
        </div>
      </div>
    </main>
  )
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
