"use client";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Download, FileDown, RefreshCw, FileSpreadsheet, FileText } from "lucide-react";

interface DownloadButtonProps {
  onExport: (format: "pdf" | "excel" | "csv") => void;
  onRefresh: () => void;
  isLoading: boolean;
}

export function DownloadButton({ onExport, onRefresh, isLoading }: DownloadButtonProps) {
  return (
    <div className="flex gap-2">
      <Button
        onClick={onRefresh}
        variant="outline"
        className="flex items-center gap-2"
        disabled={isLoading}
      >
        <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
        Refresh
      </Button>
      
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button className="bg-pink-600 hover:bg-pink-700 flex items-center gap-2">
            <Download className="h-4 w-4" />
            Export
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onClick={() => onExport("pdf")} className="flex items-center gap-2">
            <FileText className="h-4 w-4" />
            Export as PDF
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => onExport("excel")} className="flex items-center gap-2">
            <FileSpreadsheet className="h-4 w-4" />
            Export as Excel
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => onExport("csv")} className="flex items-center gap-2">
            <FileDown className="h-4 w-4" />
            Export as CSV
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}