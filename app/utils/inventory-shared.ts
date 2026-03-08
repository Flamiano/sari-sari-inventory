// ─── inventory-shared.ts ─────────────────────────────────────────────────────
// Shared types, constants, and export helpers for Meals + Sari-Sari views.
// Import from "@/app/utils/inventory-shared" (adjust path to your project).

export type MealCategory = "Almusal" | "Meryenda";

export const SARI_SARI_CATEGORIES = [
    "Canned Goods",
    "Instant Noodles",
    "Rice & Grains",
    "Snacks",
    "Biscuits",
    "Bread",
    "Condiments",
    "Spreads",
    "Cooking Essentials",
    "Soft Drinks",
    "Bottled Water",
    "Juice Drinks",
    "Coffee",
    "Milk & Dairy",
    "Energy Drinks",
    "Powdered Drinks",
    "Candies",
    "Chocolates",
    "Ice Cream",
    "Laundry Detergent",
    "Dishwashing Liquid",
    "Bath Soap",
    "Shampoo",
    "Toothpaste",
    "Tissue & Wipes",
    "Cleaning Supplies",
    "Vitamins",
    "Basic Medicines",
    "Feminine Care",
    "Baby Products",
    "Cigarettes",
    "School Supplies",
    "Kitchenware",
    "Frozen Goods",
] as const;

export type SariSariCategory = (typeof SARI_SARI_CATEGORIES)[number];

export interface BaseProduct {
    id: string;
    name: string;
    image_url: string;
    price: number;
    market_price: number;
    stock_quantity: number;
}

export interface Meal extends BaseProduct {
    category: MealCategory;
}

export interface SariSariProduct extends BaseProduct {
    sub_category: SariSariCategory;
}

// ─── Sari-Sari sub-category styles (color map) ───────────────────────────────

export const SARISARI_STYLE: Record<SariSariCategory, string> = {
    "Canned Goods":        "bg-orange-100 text-orange-700",
    "Instant Noodles":     "bg-yellow-100 text-yellow-700",
    "Rice & Grains":       "bg-amber-100 text-amber-700",
    "Snacks":              "bg-lime-100 text-lime-700",
    "Biscuits":            "bg-green-100 text-green-700",
    "Bread":               "bg-emerald-100 text-emerald-700",
    "Condiments":          "bg-teal-100 text-teal-700",
    "Spreads":             "bg-cyan-100 text-cyan-700",
    "Cooking Essentials":  "bg-sky-100 text-sky-700",
    "Soft Drinks":         "bg-blue-100 text-blue-700",
    "Bottled Water":       "bg-indigo-100 text-indigo-700",
    "Juice Drinks":        "bg-violet-100 text-violet-700",
    "Coffee":              "bg-purple-100 text-purple-700",
    "Milk & Dairy":        "bg-pink-100 text-pink-700",
    "Energy Drinks":       "bg-rose-100 text-rose-700",
    "Powdered Drinks":     "bg-red-100 text-red-700",
    "Candies":             "bg-fuchsia-100 text-fuchsia-700",
    "Chocolates":          "bg-amber-200 text-amber-800",
    "Ice Cream":           "bg-sky-100 text-sky-600",
    "Laundry Detergent":   "bg-blue-100 text-blue-600",
    "Dishwashing Liquid":  "bg-teal-100 text-teal-600",
    "Bath Soap":           "bg-green-100 text-green-600",
    "Shampoo":             "bg-lime-100 text-lime-600",
    "Toothpaste":          "bg-cyan-100 text-cyan-600",
    "Tissue & Wipes":      "bg-slate-100 text-slate-500",
    "Cleaning Supplies":   "bg-gray-100 text-gray-600",
    "Vitamins":            "bg-green-100 text-green-700",
    "Basic Medicines":     "bg-red-100 text-red-600",
    "Feminine Care":       "bg-pink-100 text-pink-600",
    "Baby Products":       "bg-yellow-100 text-yellow-600",
    "Cigarettes":          "bg-stone-100 text-stone-600",
    "School Supplies":     "bg-indigo-100 text-indigo-600",
    "Kitchenware":         "bg-orange-100 text-orange-600",
    "Frozen Goods":        "bg-blue-50 text-blue-500",
};

export const MEAL_STYLE: Record<MealCategory, string> = {
    Almusal:  "bg-amber-100 text-amber-700",
    Meryenda: "bg-orange-100 text-orange-700",
};

// ─── Export: Excel ────────────────────────────────────────────────────────────

export async function exportExcel<T extends BaseProduct & { category?: string; sub_category?: string }>(
    products: T[],
    filename: string
) {
    const XLSX = await import("xlsx");
    const totalExpense = products.reduce((s, p) => s + Number(p.market_price) * p.stock_quantity, 0);
    const totalEarn = products.reduce((s, p) => s + (Number(p.price) - Number(p.market_price)) * p.stock_quantity, 0);
    const lowStock = products.filter(p => p.stock_quantity < 10).length;

    const wb = XLSX.utils.book_new();
    const rows = [
        ["#", "Product Name", "Category", "Market Price (PHP)", "Selling Price (PHP)", "Stock Qty", "Profit/Unit (PHP)", "Total Profit (PHP)"],
        ...products.map((p, i) => [
            i + 1,
            p.name,
            p.category ?? p.sub_category ?? "",
            Number(p.market_price).toFixed(2),
            Number(p.price).toFixed(2),
            p.stock_quantity,
            (Number(p.price) - Number(p.market_price)).toFixed(2),
            ((Number(p.price) - Number(p.market_price)) * p.stock_quantity).toFixed(2),
        ]),
        [],
        ["", "SUMMARY"],
        ["", "Total Items",         "", products.length],
        ["", "Total Expense",       "", totalExpense.toFixed(2)],
        ["", "Possible Earnings",   "", totalEarn.toFixed(2)],
        ["", "Low Stock Items",     "", lowStock],
    ];
    const ws = XLSX.utils.aoa_to_sheet(rows);
    ws["!cols"] = [{ wch: 5 }, { wch: 32 }, { wch: 20 }, { wch: 22 }, { wch: 22 }, { wch: 12 }, { wch: 20 }, { wch: 22 }];
    XLSX.utils.book_append_sheet(wb, ws, "Inventory");
    XLSX.writeFile(wb, filename);
}

// ─── Export: PDF ──────────────────────────────────────────────────────────────

export async function exportPDF<T extends BaseProduct & { category?: string; sub_category?: string }>(
    products: T[],
    title: string,
    filename: string
) {
    const { default: jsPDF } = await import("jspdf");
    const autoTable = (await import("jspdf-autotable")).default;
    const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });

    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const totalExpense = products.reduce((s, p) => s + Number(p.market_price) * p.stock_quantity, 0);
    const totalEarn = products.reduce((s, p) => s + (Number(p.price) - Number(p.market_price)) * p.stock_quantity, 0);
    const lowCount = products.filter(p => p.stock_quantity < 10).length;

    doc.setFillColor(15, 23, 42);
    doc.rect(0, 0, pageWidth, 38, "F");
    doc.setFillColor(37, 99, 235);
    doc.rect(0, 35, pageWidth, 3, "F");

    doc.setFont("helvetica", "bold");
    doc.setFontSize(22);
    doc.setTextColor(255, 255, 255);
    doc.text("SARI-STORE", 14, 17);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.setTextColor(148, 163, 184);
    doc.text(title.toUpperCase(), 14, 25);

    const dateStr = new Date().toLocaleDateString("en-PH", { year: "numeric", month: "long", day: "numeric" });
    doc.setFontSize(8);
    doc.setTextColor(203, 213, 225);
    doc.text(`Generated: ${dateStr}`, pageWidth - 14, 17, { align: "right" });
    doc.setFont("helvetica", "bold");
    doc.setTextColor(96, 165, 250);
    doc.text(`${products.length} ITEMS`, pageWidth - 14, 25, { align: "right" });

    const cardY = 45, cardH = 18;
    const cardW = (pageWidth - 28 - 9) / 4;
    const cards = [
        { label: "Total Products",   value: String(products.length),                                                               color: [37, 99, 235]  as [number,number,number] },
        { label: "Total Expense",    value: `PHP ${totalExpense.toLocaleString("en-PH", { minimumFractionDigits: 2 })}`,           color: [239, 68, 68]  as [number,number,number] },
        { label: "Possible Earnings",value: `PHP ${totalEarn.toLocaleString("en-PH", { minimumFractionDigits: 2 })}`,             color: [34, 197, 94]  as [number,number,number] },
        { label: "Low Stock Items",  value: String(lowCount), color: lowCount > 0 ? [245, 158, 11] as [number,number,number] : [100, 116, 139] as [number,number,number] },
    ];
    cards.forEach((card, i) => {
        const x = 14 + i * (cardW + 3);
        doc.setFillColor(248, 250, 252);
        doc.setDrawColor(226, 232, 240);
        doc.roundedRect(x, cardY, cardW, cardH, 2, 2, "FD");
        doc.setFillColor(...card.color);
        doc.roundedRect(x, cardY, 3, cardH, 1, 1, "F");
        doc.setFont("helvetica", "normal");
        doc.setFontSize(7);
        doc.setTextColor(100, 116, 139);
        doc.text(card.label.toUpperCase(), x + 6, cardY + 6);
        doc.setFont("helvetica", "bold");
        doc.setFontSize(9);
        doc.setTextColor(...card.color);
        doc.text(card.value, x + 6, cardY + 13);
    });

    autoTable(doc, {
        startY: cardY + cardH + 6,
        head: [["#", "Product Name", "Category", "Market Price", "Selling Price", "Stock", "Profit/Unit", "Total Profit"]],
        body: products.map((p, i) => [
            String(i + 1), p.name,
            p.category ?? p.sub_category ?? "",
            Number(p.market_price).toFixed(2),
            Number(p.price).toFixed(2),
            String(p.stock_quantity),
            (Number(p.price) - Number(p.market_price)).toFixed(2),
            ((Number(p.price) - Number(p.market_price)) * p.stock_quantity).toFixed(2),
        ]),
        styles: { font: "helvetica", fontSize: 8.5, cellPadding: { top: 4, bottom: 4, left: 5, right: 5 }, textColor: [30, 41, 59], lineColor: [226, 232, 240], lineWidth: 0.1 },
        headStyles: { fillColor: [15, 23, 42], textColor: [255, 255, 255], fontStyle: "bold", fontSize: 7.5, cellPadding: { top: 5, bottom: 5, left: 5, right: 5 } },
        alternateRowStyles: { fillColor: [248, 250, 252] },
        columnStyles: {
            0: { halign: "center", cellWidth: 10, textColor: [100, 116, 139] },
            1: { cellWidth: "auto", fontStyle: "bold" },
            2: { halign: "center", cellWidth: 28 },
            3: { halign: "right", cellWidth: 26 },
            4: { halign: "right", cellWidth: 26 },
            5: { halign: "center", cellWidth: 18 },
            6: { halign: "right", cellWidth: 24 },
            7: { halign: "right", cellWidth: 26 },
        },
        didParseCell: (data: any) => {
            if (data.section === "body") {
                if (data.column.index === 5 && Number(data.cell.raw) < 10) {
                    data.cell.styles.textColor = [239, 68, 68];
                    data.cell.styles.fontStyle = "bold";
                }
                if (data.column.index === 6 || data.column.index === 7) {
                    data.cell.styles.textColor = [22, 163, 74];
                }
            }
        },
        didDrawPage: (data: any) => {
            const pageCount = (doc as any).internal.getNumberOfPages();
            doc.setFont("helvetica", "normal");
            doc.setFontSize(7.5);
            doc.setTextColor(148, 163, 184);
            doc.text(`Page ${data.pageNumber} of ${pageCount}   |   Sari-Store Inventory Report`, pageWidth / 2, pageHeight - 8, { align: "center" });
        },
    });

    doc.save(filename);
}