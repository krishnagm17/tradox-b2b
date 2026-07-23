import React from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../components/ui/Card";
import { Input } from "../components/ui/Input";
import { Button } from "../components/ui/Button";

export default function TradeTools() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background text-foreground p-4 sm:p-6 font-sans">
      <div className="max-w-5xl mx-auto w-full">
        <div className="flex items-center gap-4 mb-6 sm:mb-8">
          <Button variant="outline" size="sm" onClick={() => navigate("/live-board")}>← Back to Board</Button>
          <h1 className="text-xl sm:text-3xl font-heading font-bold">Trade Utility Tools</h1>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* HSN Finder */}
          <Card>
            <CardHeader>
              <CardTitle>HSN Code Finder</CardTitle>
              <CardDescription>Search the Harmonized System nomenclature database.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex gap-2">
                <Input placeholder="Enter commodity name (e.g., 'Rice')" className="flex-1" />
                <Button>Search</Button>
              </div>
              <div className="mt-4 p-4 border border-border rounded-md bg-muted/20 space-y-3">
                <div className="flex justify-between border-b border-border/50 pb-2">
                  <span className="font-medium text-muted-foreground">Semi-milled or wholly milled rice</span>
                  <span className="font-mono text-primary font-bold">1006.30</span>
                </div>
                <div className="flex justify-between border-b border-border/50 pb-2">
                  <span className="font-medium text-muted-foreground">Broken rice</span>
                  <span className="font-mono text-primary font-bold">1006.40</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Import Duty Calculator */}
          <Card>
            <CardHeader>
              <CardTitle>Import Duty Calculator</CardTitle>
              <CardDescription>Compute percentage-based duties on global routes.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-xs font-mono tracking-widest text-muted-foreground uppercase">HSN Code</label>
                  <Input placeholder="1006.30" />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-mono tracking-widest text-muted-foreground uppercase">Value (USD)</label>
                  <Input type="number" placeholder="50000" />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-mono tracking-widest text-muted-foreground uppercase">Origin</label>
                  <Input placeholder="India (IN)" />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-mono tracking-widest text-muted-foreground uppercase">Destination</label>
                  <Input placeholder="UAE (AE)" />
                </div>
              </div>
              <Button className="w-full">Calculate Duty</Button>
              
              <div className="mt-4 p-4 bg-primary/10 border border-primary/20 rounded-md">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-sm font-medium">Estimated Basic Duty:</span>
                  <span className="font-mono font-bold">5%</span>
                </div>
                <div className="flex justify-between items-center text-primary">
                  <span className="font-semibold">Estimated Total Tax:</span>
                  <span className="font-mono font-bold text-lg">$2,500.00</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
