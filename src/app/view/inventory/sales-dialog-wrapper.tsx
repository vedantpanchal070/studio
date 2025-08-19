
"use client"

import React, { useState } from "react";
import { ShoppingCart } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SalesDialog } from "@/components/sales-dialog";
import { getFinishedGoods } from "@/lib/actions";

export function SalesDialogWrapper() {
    const [isSalesModalOpen, setIsSalesModalOpen] = useState(false);
    const [finishedGoods, setFinishedGoods] = useState<any[]>([]);

    const handleOpen = async () => {
        // Fetch the latest finished goods list only when the user clicks the button
        const data = await getFinishedGoods();
        setFinishedGoods(data);
        setIsSalesModalOpen(true);
    };

    return (
        <>
            <Button
                variant="outline"
                size="sm"
                onClick={handleOpen}
            >
                <ShoppingCart className="mr-2 h-4 w-4" />
                Sell
            </Button>
            <SalesDialog 
                isOpen={isSalesModalOpen} 
                onOpenChange={setIsSalesModalOpen} 
                finishedGoods={finishedGoods}
            />
        </>
    );
}
