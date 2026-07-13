"use client";

import { useState } from "react";
import Head from "next/head";
import {
    Scan,
    Car,
    Calculator,
    Search,
    ArrowRight,
    Plus,
} from "lucide-react";
import OCRScannerModal from "@/src/components/OCRScannerModal";
import VINLookupModal from "@/src/components/VINLookupModal";
import FinanceCalculatorModal from "@/src/components/FinanceCalculatorModal";
import VehicleFormModal from "@/src/components/VehicleFormModal";

interface VehicleSpec {
    vin: string;
    year?: number;
    make?: string;
    model?: string;
    trim?: string;
    engine?: string;
    body_style?: string;
    fuel_type?: string;
    transmission?: string;
    drivetrain?: string;
    exterior_color?: string;
    interior_color?: string;
}

interface Tool {
    id: string;
    name: string;
    description: string;
    icon: React.ElementType;
    gradient: string;
    onClick: () => void;
}

export default function ToolsPage() {
    const [activeModal, setActiveModal] = useState<string | null>(null);
    const [showAddVehicle, setShowAddVehicle] = useState(false);
    const [pendingVinSpecs, setPendingVinSpecs] = useState<VehicleSpec | null>(null);

    const tools: Tool[] = [
        {
            id: "ocr",
            name: "OCR Scanner",
            description: "Scan driver's license or ID to auto-fill customer information",
            icon: Scan,
            gradient: "from-emerald-500 to-teal-600",
            onClick: () => setActiveModal("ocr"),
        },
        {
            id: "vin",
            name: "VIN Lookup",
            description: "Enter VIN to auto-populate vehicle specs and get Carfax report",
            icon: Search,
            gradient: "from-violet-500 to-purple-600",
            onClick: () => setActiveModal("vin"),
        },
        {
            id: "finance",
            name: "Finance Calculator",
            description: "Calculate monthly or bi-weekly payments with tax and fees",
            icon: Calculator,
            gradient: "from-amber-500 to-orange-600",
            onClick: () => setActiveModal("finance"),
        },
    ];

    return (
        <>
            <Head>
                <title>Tools | DMS</title>
            </Head>

            <div className="p-6">
                {/* Header */}
                <div className="mb-8">
                    <h1 className="text-2xl font-bold text-gray-900">Dealership Tools</h1>
                    <p className="text-sm text-gray-500 mt-1">
                        Access automation tools to streamline your workflow
                    </p>
                </div>

                {/* Tools Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {tools.map((tool) => {
                        const Icon = tool.icon;
                        return (
                            <button
                                key={tool.id}
                                onClick={tool.onClick}
                                className="group relative bg-white rounded-2xl border border-gray-200 p-6 hover:shadow-xl hover:border-transparent transition-all duration-300 text-left"
                            >
                                <div className={`absolute inset-0 bg-gradient-to-br ${tool.gradient} rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-300`} />

                                <div className="relative z-10">
                                    <div className={`inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-br ${tool.gradient} mb-4 group-hover:bg-white/20 transition-colors`}>
                                        <Icon className="w-7 h-7 text-white" />
                                    </div>

                                    <h3 className="text-lg font-semibold text-gray-900 group-hover:text-white mb-2 transition-colors">
                                        {tool.name}
                                    </h3>

                                    <p className="text-sm text-gray-500 group-hover:text-white/80 transition-colors">
                                        {tool.description}
                                    </p>

                                    <div className="mt-4 flex items-center gap-1 text-sm font-medium text-gray-400 group-hover:text-white transition-colors">
                                        <span>Open tool</span>
                                        <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                                    </div>
                                </div>
                            </button>
                        );
                    })}
                </div>

                {/* Pending VIN Specs Banner */}
                {pendingVinSpecs && (
                    <div className="mt-8 p-6 bg-gradient-to-r from-violet-500 to-purple-600 rounded-2xl shadow-xl">
                        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                            <div className="text-white">
                                <h3 className="text-lg font-semibold mb-1">
                                    {pendingVinSpecs.year} {pendingVinSpecs.make} {pendingVinSpecs.model}
                                </h3>
                                <p className="text-violet-200 text-sm">
                                    VIN: {pendingVinSpecs.vin}
                                    {pendingVinSpecs.trim && ` • ${pendingVinSpecs.trim}`}
                                    {pendingVinSpecs.engine && ` • ${pendingVinSpecs.engine}`}
                                </p>
                            </div>
                            <div className="flex gap-3">
                                <button
                                    onClick={() => {
                                        setPendingVinSpecs(null);
                                        setActiveModal("vin");
                                    }}
                                    className="px-4 py-2 bg-white/20 hover:bg-white/30 text-white rounded-lg transition-colors flex items-center gap-2"
                                >
                                    <Search className="w-4 h-4" />
                                    Search Another
                                </button>
                                <button
                                    onClick={() => setShowAddVehicle(true)}
                                    className="px-4 py-2 bg-white text-violet-700 rounded-lg hover:bg-violet-50 transition-colors flex items-center gap-2 font-medium"
                                >
                                    <Plus className="w-4 h-4" />
                                    Add to Inventory
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* Add Vehicle Modal */}
            {showAddVehicle && (
                <VehicleFormModal
                    mode="add"
                    onClose={() => setShowAddVehicle(false)}
                    onSuccess={() => {
                        setShowAddVehicle(false);
                        setPendingVinSpecs(null);
                    }}
                    pendingVinSpecs={pendingVinSpecs}
                />
            )}

            {/* Modals */}
            {activeModal === "ocr" && (
                <OCRScannerModal
                    onClose={() => setActiveModal(null)}
                    onScanComplete={(data) => console.log("OCR Data:", data)}
                    onCustomerCreated={(data) => console.log("Create customer with:", data)}
                />
            )}

            {activeModal === "vin" && (
                <VINLookupModal
                    onClose={() => setActiveModal(null)}
                    onVinFound={(specs) => {
                        console.log("Tools page received VIN specs:", specs);
                        setPendingVinSpecs(specs);
                        setShowAddVehicle(true);
                    }}
                    onCarfaxRetrieved={(report) => console.log("Carfax Report:", report)}
                />
            )}

            {activeModal === "finance" && (
                <FinanceCalculatorModal
                    onClose={() => setActiveModal(null)}
                    onSave={(calculation) => console.log("Saved calculation:", calculation)}
                />
            )}
        </>
    );
}
