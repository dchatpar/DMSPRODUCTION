"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
    ArrowLeft,
    ArrowRight,
    Camera,
    Check,
    ChevronDown,
    GripVertical,
    Image as ImageIcon,
    Loader2,
    Save,
    Search,
    Star,
    Trash2,
    Upload,
    X,
} from "lucide-react";
import {
    DndContext,
    closestCenter,
    PointerSensor,
    TouchSensor,
    useSensor,
    useSensors,
    type DragEndEvent,
} from "@dnd-kit/core";
import {
    SortableContext,
    arrayMove,
    rectSortingStrategy,
    useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import {
    vehicleMakes,
    getModelsForMake,
    yearRange,
} from "@/src/data/vehicle-makes-models";
import {
    parseGallery,
    serializeGallery,
    IMAGE_ROLES,
    type VehicleImage,
    type VehicleImageRole,
} from "@/src/lib/vehicle-image";
import VINLookupModal from "@/src/components/VINLookupModal";
import { Input } from "@/src/components/ui/Input";
import { Select } from "@/src/components/ui/Select";
import { Textarea } from "@/src/components/ui/Textarea";
import { Button } from "@/src/components/ui/Button";
import { toast } from "@/src/lib/toast";
import { cn } from "@/src/lib/utils";
import { PENDING_VIN_SPECS_KEY } from "@/src/lib/pending-vin-specs";
import {
    calcEstimatedIncome,
    DEFAULT_FIXED_COSTS,
} from "@/src/lib/estimated-income";
import {
    clearIntakeDraft,
    loadIntakeDraft,
    saveIntakeDraft,
    suggestStockNumber,
} from "@/src/lib/intake-draft";
import {
    assertDamageDisclosureForPublish,
    MVDA_DAMAGE_NOTES_REQUIRED,
} from "@/src/lib/mvda-damage";

/** Master Guide 5-step: Basic → Specs → Pricing → Images → Review */
const STEPS = [
    { id: "basic", label: "Basic" },
    { id: "specs", label: "Specs" },
    { id: "pricing", label: "Pricing" },
    { id: "images", label: "Images" },
    { id: "review", label: "Review" },
] as const;

const MAX_IMAGES = 20;
const KM_PER_MILE = 1.60934;

const FEATURE_SUGGESTIONS = [
    "Backup Camera",
    "Bluetooth",
    "Apple CarPlay",
    "Android Auto",
    "Heated Seats",
    "Sunroof",
    "Navigation",
    "Leather Seats",
    "Cruise Control",
    "AWD",
    "Keyless Entry",
    "Remote Start",
    "Parking Sensors",
    "Lane Assist",
];

const SHOT_CHECKLIST = [
    { id: "hero", label: "Hero / 3/4 front", role: "exterior" as VehicleImageRole },
    { id: "sides", label: "Driver & passenger sides", role: "exterior" as VehicleImageRole },
    { id: "interior", label: "Interior / dash", role: "interior" as VehicleImageRole },
    { id: "odo", label: "Odometer", role: "odometer" as VehicleImageRole },
];

const DESC_TEMPLATES = [
    "Well-maintained {year} {make} {model}. Clean history, ready for the road.",
    "Sharp {year} {make} {model}{trim}. Low km for the year — come see it in person.",
    "Feature-packed {year} {make} {model}. Inspected and lot-ready.",
];

export interface VehicleIntakeData {
    id?: string;
    vin: string;
    year: number;
    make: string;
    model: string;
    trim: string;
    odometer: number;
    stock_number: string;
    condition: string;
    status: string;
    purchase_price: number;
    retail_price: number;
    extra_costs: number;
    taxes: number;
    image_gallery: string[];
    carfax_report_url: string;
    engine: string;
    body_style: string;
    fuel_type: string;
    transmission: string;
    drivetrain: string;
    exterior_color: string;
    interior_color: string;
    description: string;
    features: string[];
    purchased_from: string;
    fuel_capacity: string;
    city_fuel: string;
    highway_fuel: string;
    doors: number | null;
    passengers: number | null;
    msrp: number | null;
    title_status: string;
    special_price: number | null;
    warranty: string;
    disclosure: string;
    known_damage: boolean;
    internal_notes: string;
    youtube_url: string;
    inspection_report_url: string;
}

function emptyForm(partial?: Partial<VehicleIntakeData>): VehicleIntakeData {
    return {
        vin: "",
        year: new Date().getFullYear(),
        make: "",
        model: "",
        trim: "",
        odometer: 0,
        stock_number: "",
        condition: "Used",
        status: "Coming Soon",
        purchase_price: 0,
        retail_price: 0,
        extra_costs: 0,
        taxes: 0,
        image_gallery: [],
        carfax_report_url: "",
        engine: "",
        body_style: "",
        fuel_type: "",
        transmission: "",
        drivetrain: "",
        exterior_color: "",
        interior_color: "",
        description: "",
        features: [],
        purchased_from: "",
        fuel_capacity: "",
        city_fuel: "",
        highway_fuel: "",
        doors: null,
        passengers: null,
        msrp: null,
        title_status: "",
        special_price: null,
        warranty: "",
        disclosure: "",
        known_damage: false,
        internal_notes: "",
        youtube_url: "",
        inspection_report_url: "",
        ...partial,
    };
}

function fromApiVehicle(v: Record<string, unknown>): VehicleIntakeData {
    const featuresRaw = v.features;
    let features: string[] = [];
    if (Array.isArray(featuresRaw)) {
        features = featuresRaw.map(String).filter(Boolean);
    } else if (typeof featuresRaw === "string") {
        features = featuresRaw.split(",").map((f) => f.trim()).filter(Boolean);
    }
    return emptyForm({
        id: String(v.id ?? ""),
        vin: String(v.vin ?? ""),
        year: Number(v.year) || new Date().getFullYear(),
        make: String(v.make ?? ""),
        model: String(v.model ?? ""),
        trim: String(v.trim ?? ""),
        odometer: Number(v.odometer) || 0,
        stock_number: String(v.stock_number ?? ""),
        condition: String(v.condition ?? "Used"),
        status: String(v.status ?? "Active"),
        purchase_price: Number(v.purchase_price) || 0,
        retail_price: Number(v.retail_price) || 0,
        extra_costs: Number(v.extra_costs) || 0,
        taxes: Number(v.taxes) || 0,
        image_gallery: Array.isArray(v.image_gallery) ? (v.image_gallery as string[]) : [],
        carfax_report_url: String(v.carfax_report_url ?? ""),
        engine: String(v.engine ?? ""),
        body_style: String(v.body_style ?? ""),
        fuel_type: String(v.fuel_type ?? ""),
        transmission: String(v.transmission ?? ""),
        drivetrain: String(v.drivetrain ?? ""),
        exterior_color: String(v.exterior_color ?? ""),
        interior_color: String(v.interior_color ?? ""),
        description: String(v.description ?? ""),
        features,
        purchased_from: String(v.purchased_from ?? ""),
        fuel_capacity: String(v.fuel_capacity ?? ""),
        city_fuel: String(v.city_fuel ?? ""),
        highway_fuel: String(v.highway_fuel ?? ""),
        doors: v.doors == null || v.doors === "" ? null : Number(v.doors),
        passengers: v.passengers == null || v.passengers === "" ? null : Number(v.passengers),
        msrp: v.msrp == null || v.msrp === "" ? null : Number(v.msrp),
        title_status: String(v.title_status ?? ""),
        special_price: v.special_price == null || v.special_price === "" ? null : Number(v.special_price),
        warranty: String(v.warranty ?? ""),
        disclosure: String(v.disclosure ?? ""),
        known_damage: Boolean(v.known_damage),
        internal_notes: String(v.internal_notes ?? ""),
        youtube_url: String(v.youtube_url ?? ""),
        inspection_report_url: String(v.inspection_report_url ?? ""),
    });
}

function buildPayload(form: VehicleIntakeData, includeVin: boolean) {
    const payload: Record<string, unknown> = {
        year: form.year,
        make: form.make.trim(),
        model: form.model.trim(),
        trim: form.trim.trim() || null,
        odometer: form.odometer || 0,
        stock_number: form.stock_number.trim() || null,
        condition: form.condition,
        status: form.status,
        purchase_price: form.purchase_price || 0,
        retail_price: form.retail_price || 0,
        extra_costs: form.extra_costs || 0,
        taxes: form.taxes || 0,
        image_gallery: form.image_gallery,
        carfax_report_url: form.carfax_report_url.trim() || null,
        engine: form.engine.trim() || null,
        body_style: form.body_style.trim() || null,
        fuel_type: form.fuel_type.trim() || null,
        transmission: form.transmission.trim() || null,
        drivetrain: form.drivetrain.trim() || null,
        exterior_color: form.exterior_color.trim() || null,
        interior_color: form.interior_color.trim() || null,
        description: form.description.trim() || null,
        features: form.features,
        purchased_from: form.purchased_from.trim() || null,
        fuel_capacity: form.fuel_capacity.trim() || null,
        city_fuel: form.city_fuel.trim() || null,
        highway_fuel: form.highway_fuel.trim() || null,
        doors: form.doors,
        passengers: form.passengers,
        msrp: form.msrp,
        title_status: form.title_status.trim() || null,
        special_price: form.special_price,
        warranty: form.warranty.trim() || null,
        disclosure: form.disclosure.trim() || null,
        known_damage: Boolean(form.known_damage),
        internal_notes: form.internal_notes.trim() || null,
        youtube_url: form.youtube_url.trim() || null,
        inspection_report_url: form.inspection_report_url.trim() || null,
    };
    if (includeVin) payload.vin = form.vin.trim().toUpperCase();
    return payload;
}

interface VehicleIntakeWizardProps {
    mode: "add" | "edit";
    vin?: string;
}

function SortableThumb({
    image,
    onSetCover,
    onRemove,
    onRoleChange,
}: {
    image: VehicleImage;
    onSetCover: () => void;
    onRemove: () => void;
    onRoleChange: (role: VehicleImageRole | "") => void;
}) {
    const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
        id: image.url,
    });
    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.7 : 1,
    };
    return (
        <div
            ref={setNodeRef}
            style={style}
            className="group relative overflow-hidden rounded-lg border border-border bg-card"
        >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={image.url} alt="" className="aspect-[4/3] w-full object-cover" />
            <div className="absolute inset-x-0 top-0 flex items-start justify-between gap-1 p-1.5">
                <button
                    type="button"
                    className="flex h-9 w-9 items-center justify-center rounded-md bg-background/90 text-foreground shadow touch-manipulation"
                    aria-label="Drag to reorder"
                    {...attributes}
                    {...listeners}
                >
                    <GripVertical className="h-4 w-4" />
                </button>
                <div className="flex gap-1">
                    <button
                        type="button"
                        onClick={onSetCover}
                        className={cn(
                            "flex h-9 w-9 items-center justify-center rounded-md shadow touch-manipulation",
                            image.is_cover
                                ? "bg-primary text-primary-foreground"
                                : "bg-background/90 text-foreground"
                        )}
                        aria-label="Set as cover"
                    >
                        <Star className={cn("h-4 w-4", image.is_cover && "fill-current")} />
                    </button>
                    <button
                        type="button"
                        onClick={onRemove}
                        className="flex h-9 w-9 items-center justify-center rounded-md bg-destructive text-destructive-foreground shadow touch-manipulation"
                        aria-label="Delete photo"
                    >
                        <Trash2 className="h-4 w-4" />
                    </button>
                </div>
            </div>
            <div className="p-1.5">
                <select
                    value={image.role ?? ""}
                    onChange={(e) => onRoleChange(e.target.value as VehicleImageRole | "")}
                    className="h-8 w-full rounded-md border border-input bg-background px-2 text-xs"
                >
                    <option value="">Role…</option>
                    {IMAGE_ROLES.map((r) => (
                        <option key={r.value} value={r.value}>
                            {r.label}
                        </option>
                    ))}
                </select>
            </div>
        </div>
    );
}

export default function VehicleIntakeWizard({ mode, vin: vinParam }: VehicleIntakeWizardProps) {
    const router = useRouter();
    const [stepIndex, setStepIndex] = useState(0);
    const [form, setForm] = useState<VehicleIntakeData>(() => emptyForm());
    const [loading, setLoading] = useState(mode === "edit");
    const [saving, setSaving] = useState(false);
    const [draftSaved, setDraftSaved] = useState(mode === "edit");
    const [error, setError] = useState<string | null>(null);
    const [showVinLookup, setShowVinLookup] = useState(false);
    const [makeQuery, setMakeQuery] = useState("");
    const [modelQuery, setModelQuery] = useState("");
    const [showMakeList, setShowMakeList] = useState(false);
    const [showModelList, setShowModelList] = useState(false);
    const [fuelOpen, setFuelOpen] = useState(false);
    const [featureInput, setFeatureInput] = useState("");
    const [uploading, setUploading] = useState(false);
    const [uploadingCarfax, setUploadingCarfax] = useState(false);
    const [duplicateHint, setDuplicateHint] = useState<string | null>(null);
    const [odometerUnit, setOdometerUnit] = useState<"km" | "mi">("km");
    const [fixedCosts, setFixedCosts] = useState(DEFAULT_FIXED_COSTS);
    const [resumeBanner, setResumeBanner] = useState<{ savedAt: number } | null>(null);
    const [localDraftHint, setLocalDraftHint] = useState<string | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const carfaxInputRef = useRef<HTMLInputElement>(null);
    const skipNextLocalSave = useRef(false);

    const step = STEPS[stepIndex];
    const availableModels = useMemo(() => getModelsForMake(form.make), [form.make]);
    const gallery = useMemo(() => parseGallery(form.image_gallery), [form.image_gallery]);
    const estimatedIncome = useMemo(
        () =>
            calcEstimatedIncome({
                retail: form.retail_price,
                purchase: form.purchase_price,
                extraCosts: form.extra_costs,
                taxes: form.taxes,
                fixedCosts,
            }),
        [form.retail_price, form.purchase_price, form.extra_costs, form.taxes, fixedCosts]
    );
    const odometerDisplay = useMemo(() => {
        if (!form.odometer) return "";
        if (odometerUnit === "km") return String(form.odometer);
        return String(Math.round(form.odometer / KM_PER_MILE));
    }, [form.odometer, odometerUnit]);

    const filteredMakes = useMemo(() => {
        const q = makeQuery.trim().toLowerCase();
        if (!q) return vehicleMakes.map((m) => m.name);
        return vehicleMakes.map((m) => m.name).filter((n) => n.toLowerCase().includes(q));
    }, [makeQuery]);

    const filteredModels = useMemo(() => {
        const q = modelQuery.trim().toLowerCase();
        if (!q) return availableModels;
        return availableModels.filter((n) => n.toLowerCase().includes(q));
    }, [modelQuery, availableModels]);

    const sensors = useSensors(
        useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
        useSensor(TouchSensor, { activationConstraint: { delay: 150, tolerance: 8 } })
    );

    const patchField = useCallback(<K extends keyof VehicleIntakeData>(key: K, value: VehicleIntakeData[K]) => {
        setForm((prev) => ({ ...prev, [key]: value }));
    }, []);

    // Load edit vehicle or pending VIN specs
    useEffect(() => {
        let cancelled = false;
        async function boot() {
            if (mode === "edit" && vinParam) {
                setLoading(true);
                try {
                    const res = await fetch(`/api/vehicles?vin=${encodeURIComponent(vinParam)}&limit=1`, {
                        credentials: "include",
                    });
                    if (!res.ok) throw new Error("Failed to load vehicle");
                    const json = await res.json();
                    const row = json.data?.[0];
                    if (!row) throw new Error("Vehicle not found");
                    if (!cancelled) {
                        setForm(fromApiVehicle(row));
                        setDraftSaved(true);
                        setMakeQuery(String(row.make ?? ""));
                        setModelQuery(String(row.model ?? ""));
                    }
                } catch (err) {
                    if (!cancelled) {
                        setError(err instanceof Error ? err.message : "Failed to load");
                        toast.error("Could not load vehicle");
                    }
                } finally {
                    if (!cancelled) setLoading(false);
                }
                return;
            }

            try {
                const raw = sessionStorage.getItem(PENDING_VIN_SPECS_KEY);
                if (raw) {
                    sessionStorage.removeItem(PENDING_VIN_SPECS_KEY);
                    const specs = JSON.parse(raw) as Record<string, unknown>;
                    if (!cancelled) {
                        setForm((prev) =>
                            emptyForm({
                                ...prev,
                                vin: String(specs.vin ?? prev.vin),
                                year: Number(specs.year) || prev.year,
                                make: String(specs.make ?? prev.make),
                                model: String(specs.model ?? prev.model),
                                trim: String(specs.trim ?? prev.trim),
                                engine: String(specs.engine ?? prev.engine),
                                body_style: String(specs.body_style ?? prev.body_style),
                                fuel_type: String(specs.fuel_type ?? prev.fuel_type),
                                transmission: String(specs.transmission ?? prev.transmission),
                                drivetrain: String(specs.drivetrain ?? prev.drivetrain),
                                exterior_color: String(specs.exterior_color ?? prev.exterior_color),
                                interior_color: String(specs.interior_color ?? prev.interior_color),
                            })
                        );
                        if (specs.make) setMakeQuery(String(specs.make));
                        if (specs.model) setModelQuery(String(specs.model));
                    }
                    return;
                }
            } catch {
                // ignore bad session payload
            }

            // Offer local draft resume (add mode only)
            if (!cancelled && mode === "add") {
                const draft = loadIntakeDraft();
                if (draft?.form && Object.keys(draft.form).length > 0) {
                    setResumeBanner({ savedAt: draft.savedAt });
                }
            }
        }
        void boot();
        return () => {
            cancelled = true;
        };
    }, [mode, vinParam]);

    // Debounced localStorage auto-save (add mode)
    useEffect(() => {
        if (mode !== "add") return;
        if (skipNextLocalSave.current) {
            skipNextLocalSave.current = false;
            return;
        }
        const t = setTimeout(() => {
            const hasContent =
                form.vin.trim().length > 0 ||
                form.make.trim().length > 0 ||
                form.model.trim().length > 0 ||
                form.retail_price > 0;
            if (!hasContent) return;
            saveIntakeDraft(stepIndex, { ...form } as unknown as Record<string, unknown>);
            setLocalDraftHint("Draft auto-saved locally");
        }, 600);
        return () => clearTimeout(t);
    }, [form, stepIndex, mode]);

    // Duplicate VIN check (add mode only)
    useEffect(() => {
        if (mode !== "add") return;
        const vin = form.vin.trim().toUpperCase();
        if (vin.length < 11) {
            setDuplicateHint(null);
            return;
        }
        const t = setTimeout(async () => {
            try {
                const res = await fetch(`/api/vehicles?vin=${encodeURIComponent(vin)}&limit=1`, {
                    credentials: "include",
                });
                if (!res.ok) return;
                const json = await res.json();
                if (json.data?.length) {
                    setDuplicateHint(`VIN already in inventory (${json.data[0].year} ${json.data[0].make} ${json.data[0].model})`);
                } else {
                    setDuplicateHint(null);
                }
            } catch {
                // ignore
            }
        }, 400);
        return () => clearTimeout(t);
    }, [form.vin, mode]);

    const validateIdentity = (): string | null => {
        const vin = form.vin.trim().toUpperCase();
        if (vin.length < 11) return "Enter a valid VIN (at least 11 characters)";
        if (!form.make.trim()) return "Select a make";
        if (!form.model.trim()) return "Select a model";
        if (!form.year) return "Enter a year";
        if (mode === "add" && duplicateHint) return "This VIN already exists — open it to edit instead";
        return null;
    };

    const persistGallery = async (images: VehicleImage[]) => {
        const serialized = serializeGallery(
            images.map((img, i) => ({ ...img, sort_order: i }))
        );
        setForm((prev) => ({ ...prev, image_gallery: serialized }));
        if (!form.id && !draftSaved) return;
        const idOrVin = form.id || form.vin;
        await fetch(`/api/vehicles/${encodeURIComponent(idOrVin)}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            credentials: "include",
            body: JSON.stringify({ image_gallery: serialized }),
        });
    };

    const saveDraft = async (): Promise<boolean> => {
        const identityError = validateIdentity();
        if (identityError) {
            toast.error(identityError);
            setError(identityError);
            return false;
        }
        const formToSave =
            !form.stock_number.trim() && form.vin.trim().length >= 4
                ? { ...form, stock_number: suggestStockNumber(form.year, form.vin) }
                : form;
        if (formToSave.stock_number !== form.stock_number) {
            setForm(formToSave);
        }
        setSaving(true);
        setError(null);
        try {
            if (draftSaved && formToSave.id) {
                const res = await fetch(`/api/vehicles/${encodeURIComponent(formToSave.id)}`, {
                    method: "PATCH",
                    headers: { "Content-Type": "application/json" },
                    credentials: "include",
                    body: JSON.stringify(buildPayload(formToSave, false)),
                });
                if (!res.ok) {
                    const body = await res.json().catch(() => ({}));
                    throw new Error(body.error || "Failed to update draft");
                }
                toast.success("Draft updated");
                return true;
            }

            const res = await fetch("/api/vehicles", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                credentials: "include",
                body: JSON.stringify(buildPayload(formToSave, true)),
            });
            if (!res.ok) {
                const body = await res.json().catch(() => ({}));
                throw new Error(body.error || "Failed to create draft");
            }
            const json = await res.json();
            const created = json.data;
            setForm((prev) => ({
                ...prev,
                ...formToSave,
                id: created.id,
                vin: created.vin,
                stock_number: created.stock_number || formToSave.stock_number,
                image_gallery: created.image_gallery || prev.image_gallery,
            }));
            setDraftSaved(true);
            toast.success("Draft saved — you can upload photos now");
            // Switch URL to edit path so refresh keeps context
            if (mode === "add" && created.vin) {
                window.history.replaceState(null, "", `/inventory/${encodeURIComponent(created.vin)}/edit`);
            }
            return true;
        } catch (err) {
            const msg = err instanceof Error ? err.message : "Save failed";
            setError(msg);
            toast.error(msg);
            return false;
        } finally {
            setSaving(false);
        }
    };

    const saveFull = async (andExit: boolean) => {
        try {
            assertDamageDisclosureForPublish({
                status: form.status,
                known_damage: form.known_damage,
                disclosure: form.disclosure,
            });
        } catch (e) {
            const msg = e instanceof Error ? e.message : MVDA_DAMAGE_NOTES_REQUIRED;
            setError(msg);
            toast.error(msg);
            return;
        }

        if (
            form.status === "Active" &&
            !(Number(form.purchase_price) > 0)
        ) {
            const proceed = window.confirm(
                "Purchase price is $0 — gross profit reports will show zero cost. Continue publishing as Active?"
            );
            if (!proceed) return;
        }
        if (!draftSaved || !form.id) {
            const ok = await saveDraft();
            if (!ok) return;
        }
        setSaving(true);
        setError(null);
        try {
            const id = form.id!;
            const res = await fetch(`/api/vehicles/${encodeURIComponent(id)}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                credentials: "include",
                body: JSON.stringify(buildPayload(form, false)),
            });
            if (!res.ok) {
                const body = await res.json().catch(() => ({}));
                throw new Error(body.error || "Failed to save vehicle");
            }
            toast.success(form.status === "Active" ? "Vehicle published" : "Vehicle saved");
            clearIntakeDraft();
            setLocalDraftHint(null);
            setResumeBanner(null);
            if (andExit) {
                router.push(`/inventory/${encodeURIComponent(form.vin)}`);
            }
        } catch (err) {
            const msg = err instanceof Error ? err.message : "Save failed";
            setError(msg);
            toast.error(msg);
        } finally {
            setSaving(false);
        }
    };

    const goNext = async () => {
        if (step.id === "basic") {
            const ok = await saveDraft();
            if (!ok) return;
        } else if (draftSaved && form.id) {
            // Persist progress between steps
            setSaving(true);
            try {
                await fetch(`/api/vehicles/${encodeURIComponent(form.id)}`, {
                    method: "PATCH",
                    headers: { "Content-Type": "application/json" },
                    credentials: "include",
                    body: JSON.stringify(buildPayload(form, false)),
                });
            } catch {
                // non-blocking
            } finally {
                setSaving(false);
            }
        }
        if (stepIndex < STEPS.length - 1) {
            setStepIndex((i) => i + 1);
            window.scrollTo({ top: 0, behavior: "smooth" });
        } else {
            await saveFull(true);
        }
    };

    const goBack = () => {
        if (stepIndex === 0) {
            router.push(mode === "edit" && form.vin ? `/inventory/${encodeURIComponent(form.vin)}` : "/inventory");
            return;
        }
        setStepIndex((i) => i - 1);
    };

    const handleUpload = async (files: FileList | null) => {
        if (!files?.length) return;
        if (!draftSaved || !form.vin) {
            toast.error("Save the draft first so photos can attach to this VIN");
            return;
        }
        const allowed = ["image/jpeg", "image/png", "image/webp", "image/gif"];
        const list = Array.from(files);
        for (const f of list) {
            if (!allowed.includes(f.type)) {
                toast.error(`"${f.name}" is not a supported image type`);
                return;
            }
            if (f.size > 5 * 1024 * 1024) {
                toast.error(`"${f.name}" exceeds 5MB`);
                return;
            }
        }
        setUploading(true);
        try {
            const existingCount = parseGallery(form.image_gallery).length;
            const remaining = MAX_IMAGES - existingCount;
            if (remaining <= 0) {
                toast.error(`Maximum ${MAX_IMAGES} images`);
                return;
            }
            const capped = list.slice(0, remaining);
            if (capped.length < list.length) {
                toast.error(`Only ${remaining} more image(s) allowed (max ${MAX_IMAGES})`);
            }
            const body = new FormData();
            for (const f of capped) body.append("file", f);
            const res = await fetch(`/api/vehicles/${encodeURIComponent(form.vin)}/images`, {
                method: "POST",
                body,
                credentials: "include",
            });
            if (!res.ok) {
                const errBody = await res.json().catch(() => ({}));
                throw new Error(errBody.error || `Upload failed (${res.status})`);
            }
            const data = await res.json();
            const added: string[] = data.added_urls || [];
            if (added.length === 0) throw new Error("Upload succeeded but no images returned");

            const existing = parseGallery(form.image_gallery);
            const existingUrls = new Set(existing.map((g) => g.url));
            const merged = [
                ...existing,
                ...added
                    .filter((u) => !existingUrls.has(u))
                    .map((url, i) => ({
                        url,
                        role: null as VehicleImageRole | null,
                        is_cover: existing.length === 0 && i === 0,
                        sort_order: existing.length + i,
                    })),
            ];
            await persistGallery(merged);
            toast.success(added.length === 1 ? "Photo uploaded" : `${added.length} photos uploaded`);
        } catch (err) {
            toast.error(err instanceof Error ? err.message : "Upload failed");
        } finally {
            setUploading(false);
            if (fileInputRef.current) fileInputRef.current.value = "";
        }
    };

    const handleDragEnd = async (event: DragEndEvent) => {
        const { active, over } = event;
        if (!over || active.id === over.id) return;
        const images = [...gallery];
        const oldIndex = images.findIndex((i) => i.url === active.id);
        const newIndex = images.findIndex((i) => i.url === over.id);
        if (oldIndex < 0 || newIndex < 0) return;
        const next = arrayMove(images, oldIndex, newIndex).map((img, i) => ({
            ...img,
            sort_order: i,
        }));
        await persistGallery(next);
    };

    const setCover = async (url: string) => {
        const next = gallery.map((img) => ({
            ...img,
            is_cover: img.url === url,
        }));
        await persistGallery(next);
    };

    const removeImage = async (url: string) => {
        try {
            const remaining = gallery.filter((g) => g.url !== url);
            const cleaned = remaining.map((img, i) => ({
                ...img,
                sort_order: i,
                is_cover: remaining.some((n) => n.is_cover) ? img.is_cover : i === 0,
            }));
            // Prefer PATCH with serialized gallery — DELETE only matches exact
            // text[] entries and misses JSON-encoded rich objects.
            await persistGallery(cleaned);
            void fetch(`/api/vehicles/${encodeURIComponent(form.vin)}/images`, {
                method: "DELETE",
                headers: { "Content-Type": "application/json" },
                credentials: "include",
                body: JSON.stringify({ url }),
            }).catch(() => undefined);
            toast.success("Photo removed");
        } catch (err) {
            toast.error(err instanceof Error ? err.message : "Could not remove photo");
        }
    };

    const setRole = async (url: string, role: VehicleImageRole | "") => {
        const next = gallery.map((img) =>
            img.url === url ? { ...img, role: role || null } : img
        );
        await persistGallery(next);
    };

    const toggleFeature = (feat: string) => {
        setForm((prev) => {
            const has = prev.features.includes(feat);
            return {
                ...prev,
                features: has ? prev.features.filter((f) => f !== feat) : [...prev.features, feat],
            };
        });
    };

    const addCustomFeature = () => {
        const f = featureInput.trim();
        if (!f) return;
        if (!form.features.includes(f)) {
            setForm((prev) => ({ ...prev, features: [...prev.features, f] }));
        }
        setFeatureInput("");
    };

    const applyDescriptionTemplate = (tpl: string) => {
        const text = tpl
            .replace("{year}", String(form.year))
            .replace("{make}", form.make)
            .replace("{model}", form.model)
            .replace("{trim}", form.trim ? ` ${form.trim}` : "");
        patchField("description", text);
    };

    const handleCarfaxUpload = async (file: File | undefined) => {
        if (!file) return;
        if (file.type !== "application/pdf") {
            toast.error("CARFAX must be a PDF");
            return;
        }
        if (file.size > 10 * 1024 * 1024) {
            toast.error("File must be under 10MB");
            return;
        }
        setUploadingCarfax(true);
        try {
            const fd = new FormData();
            fd.append("file", file);
            fd.append("vin", form.vin);
            const res = await fetch("/api/carfax/upload", { method: "POST", body: fd, credentials: "include" });
            if (!res.ok) {
                const body = await res.json().catch(() => ({}));
                throw new Error(body.error || "CARFAX upload failed");
            }
            const { url } = await res.json();
            patchField("carfax_report_url", url);
            toast.success("CARFAX uploaded");
        } catch (err) {
            toast.error(err instanceof Error ? err.message : "CARFAX upload failed");
        } finally {
            setUploadingCarfax(false);
            if (carfaxInputRef.current) carfaxInputRef.current.value = "";
        }
    };

    const rolesPresent = new Set(gallery.map((g) => g.role).filter(Boolean));

    if (loading) {
        return (
            <div className="flex min-h-[50vh] items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
        );
    }

    return (
        <div className="mx-auto flex min-h-[100dvh] max-w-3xl flex-col px-4 pb-[calc(5.5rem+env(safe-area-inset-bottom))] pt-4 sm:px-6 lg:pb-8">
            {/* Sticky header + steps */}
            <div className="sticky top-0 z-20 -mx-4 border-b border-border bg-background/95 px-4 pb-3 pt-2 backdrop-blur-sm sm:-mx-6 sm:px-6">
                <div className="mb-3 flex items-center gap-2">
                    <Button variant="ghost" size="icon" onClick={goBack} aria-label="Back">
                        <ArrowLeft className="h-5 w-5" />
                    </Button>
                    <div className="min-w-0 flex-1">
                        <h1 className="truncate text-lg font-semibold text-foreground">
                            {mode === "add" && !draftSaved ? "Add New Car" : "Edit Vehicle"}
                        </h1>
                        <p className="truncate text-xs text-muted-foreground">
                            {form.vin
                                ? `${form.year} ${form.make} ${form.model} · ${form.vin}`
                                : "VIN-first intake · photos after draft save"}
                        </p>
                    </div>
                    {draftSaved && (
                        <span className="hidden shrink-0 rounded-md bg-success/15 px-2 py-1 text-[11px] font-semibold text-success sm:inline">
                            Draft saved
                        </span>
                    )}
                    {localDraftHint && !draftSaved && (
                        <span className="hidden shrink-0 rounded-md bg-muted px-2 py-1 text-[11px] font-medium text-muted-foreground sm:inline">
                            {localDraftHint}
                        </span>
                    )}
                </div>
                <nav aria-label="Intake steps" className="flex gap-1 overflow-x-auto pb-1">
                    {STEPS.map((s, i) => {
                        const active = i === stepIndex;
                        const done = i < stepIndex;
                        return (
                            <button
                                key={s.id}
                                type="button"
                                onClick={() => {
                                    if (i <= stepIndex || draftSaved) setStepIndex(i);
                                }}
                                className={cn(
                                    "flex shrink-0 items-center gap-1.5 rounded-lg px-2.5 py-2 text-xs font-medium touch-manipulation",
                                    active && "bg-primary text-primary-foreground",
                                    done && !active && "bg-primary/10 text-primary",
                                    !active && !done && "bg-muted text-muted-foreground"
                                )}
                            >
                                {done ? <Check className="h-3.5 w-3.5" /> : <span>{i + 1}</span>}
                                <span className="hidden sm:inline">{s.label}</span>
                            </button>
                        );
                    })}
                </nav>
            </div>

            {resumeBanner && mode === "add" && (
                <div className="mt-3 flex flex-col gap-2 rounded-lg border border-primary/30 bg-primary/5 px-3 py-2.5 sm:flex-row sm:items-center sm:justify-between">
                    <p className="text-sm text-foreground">
                        Resume draft from{" "}
                        {new Date(resumeBanner.savedAt).toLocaleString(undefined, {
                            month: "short",
                            day: "numeric",
                            hour: "numeric",
                            minute: "2-digit",
                        })}
                        ?
                    </p>
                    <div className="flex gap-2">
                        <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                                clearIntakeDraft();
                                setResumeBanner(null);
                                setLocalDraftHint(null);
                            }}
                        >
                            Discard
                        </Button>
                        <Button
                            size="sm"
                            onClick={() => {
                                const draft = loadIntakeDraft();
                                if (!draft?.form) {
                                    setResumeBanner(null);
                                    return;
                                }
                                skipNextLocalSave.current = true;
                                const restored = emptyForm(draft.form as Partial<VehicleIntakeData>);
                                setForm(restored);
                                setMakeQuery(restored.make);
                                setModelQuery(restored.model);
                                setStepIndex(
                                    Math.min(
                                        Math.max(0, draft.stepIndex || 0),
                                        STEPS.length - 1
                                    )
                                );
                                setResumeBanner(null);
                                toast.success("Draft restored");
                            }}
                        >
                            Resume
                        </Button>
                    </div>
                </div>
            )}

            {error && (
                <div className="mt-3 rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive" role="alert">
                    {error}
                </div>
            )}

            <div className="mt-4 flex-1 space-y-5">
                {step.id === "basic" && (
                    <>
                        <div className="space-y-4">
                            <div className="flex flex-col gap-2 sm:flex-row sm:items-end">
                                <Input
                                    label="VIN"
                                    required
                                    value={form.vin}
                                    onChange={(e) =>
                                        patchField(
                                            "vin",
                                            e.target.value.toUpperCase().replace(/[^A-HJ-NPR-Z0-9]/gi, "").slice(0, 17)
                                        )
                                    }
                                    placeholder="17-character VIN"
                                    maxLength={17}
                                    disabled={draftSaved && mode === "edit"}
                                    containerClassName="flex-1"
                                    helper={
                                        duplicateHint
                                            ? duplicateHint
                                            : `${form.vin.length}/17 · no I, O, Q`
                                    }
                                    error={duplicateHint ? duplicateHint : undefined}
                                />
                                <Button
                                    type="button"
                                    variant="outline"
                                    className="shrink-0"
                                    leftIcon={<Search className="h-4 w-4" />}
                                    onClick={() => setShowVinLookup(true)}
                                    disabled={draftSaved && mode === "edit"}
                                >
                                    Decode VIN
                                </Button>
                            </div>
                            {duplicateHint && mode === "add" && form.vin.length >= 11 && (
                                <Button
                                    variant="link"
                                    size="sm"
                                    onClick={() =>
                                        router.push(`/inventory/${encodeURIComponent(form.vin.trim().toUpperCase())}/edit`)
                                    }
                                >
                                    Open existing vehicle →
                                </Button>
                            )}
                        </div>

                        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                            <Select
                                label="Year"
                                required
                                value={String(form.year)}
                                onChange={(e) => patchField("year", Number(e.target.value))}
                                options={yearRange.map((y) => ({ value: String(y), label: String(y) }))}
                            />
                            <div className="relative sm:col-span-1">
                                <Input
                                    label="Make"
                                    required
                                    value={makeQuery || form.make}
                                    onChange={(e) => {
                                        setMakeQuery(e.target.value);
                                        setShowMakeList(true);
                                        patchField("make", e.target.value);
                                        patchField("model", "");
                                        setModelQuery("");
                                    }}
                                    onFocus={() => setShowMakeList(true)}
                                    placeholder="Search make…"
                                    autoComplete="off"
                                />
                                {showMakeList && (
                                    <div className="absolute z-30 mt-1 max-h-48 w-full overflow-auto rounded-lg border border-border bg-card shadow-lg">
                                        {filteredMakes.slice(0, 40).map((name) => (
                                            <button
                                                key={name}
                                                type="button"
                                                className="block w-full px-3 py-2.5 text-left text-sm hover:bg-muted touch-manipulation"
                                                onClick={() => {
                                                    patchField("make", name);
                                                    setMakeQuery(name);
                                                    patchField("model", "");
                                                    setModelQuery("");
                                                    setShowMakeList(false);
                                                }}
                                            >
                                                {name}
                                            </button>
                                        ))}
                                    </div>
                                )}
                            </div>
                            <div className="relative">
                                <Input
                                    label="Model"
                                    required
                                    value={modelQuery || form.model}
                                    onChange={(e) => {
                                        setModelQuery(e.target.value);
                                        setShowModelList(true);
                                        patchField("model", e.target.value);
                                    }}
                                    onFocus={() => setShowModelList(true)}
                                    placeholder={form.make ? "Search model…" : "Select make first"}
                                    disabled={!form.make}
                                    autoComplete="off"
                                />
                                {showModelList && form.make && (
                                    <div className="absolute z-30 mt-1 max-h-48 w-full overflow-auto rounded-lg border border-border bg-card shadow-lg">
                                        {filteredModels.slice(0, 40).map((name) => (
                                            <button
                                                key={name}
                                                type="button"
                                                className="block w-full px-3 py-2.5 text-left text-sm hover:bg-muted touch-manipulation"
                                                onClick={() => {
                                                    patchField("model", name);
                                                    setModelQuery(name);
                                                    setShowModelList(false);
                                                }}
                                            >
                                                {name}
                                            </button>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>

                        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                            <Input
                                label="Trim"
                                value={form.trim}
                                onChange={(e) => patchField("trim", e.target.value)}
                            />
                            <Input
                                label="Stock #"
                                value={form.stock_number}
                                onChange={(e) => patchField("stock_number", e.target.value)}
                                helper="Auto-fills on continue if empty"
                            />
                            <Select
                                label="Condition"
                                required
                                value={form.condition}
                                onChange={(e) => patchField("condition", e.target.value)}
                                options={[
                                    { value: "New", label: "New" },
                                    { value: "Used", label: "Used" },
                                    { value: "Certified Pre-Owned", label: "Certified Pre-Owned" },
                                ]}
                            />
                            <Select
                                label="Status"
                                required
                                value={form.status}
                                onChange={(e) => patchField("status", e.target.value)}
                                options={[
                                    { value: "Coming Soon", label: "Coming Soon (draft)" },
                                    { value: "Active", label: "Active (on lot)" },
                                    { value: "Inactive", label: "Inactive" },
                                    { value: "Sold", label: "Sold" },
                                ]}
                            />
                        </div>
                        <p className="text-xs text-muted-foreground">
                            Continue saves a server draft so photo upload works. Local auto-save runs as you type.
                        </p>
                    </>
                )}

                {step.id === "images" && (
                    <>
                        {!draftSaved ? (
                            <div className="rounded-xl border border-border bg-card p-6 text-center">
                                <ImageIcon className="mx-auto mb-2 h-8 w-8 text-muted-foreground" />
                                <p className="text-sm text-muted-foreground">Save the VIN draft first to unlock photos.</p>
                                <Button className="mt-3" onClick={() => void saveDraft()} loading={saving}>
                                    Save draft
                                </Button>
                            </div>
                        ) : (
                            <>
                                <div className="flex flex-wrap gap-2">
                                    {SHOT_CHECKLIST.map((shot) => {
                                        const done =
                                            shot.role === "exterior"
                                                ? gallery.some((g) => g.role === "exterior" || g.is_cover)
                                                : rolesPresent.has(shot.role);
                                        return (
                                            <span
                                                key={shot.id}
                                                className={cn(
                                                    "inline-flex items-center gap-1 rounded-md px-2.5 py-1.5 text-xs font-medium",
                                                    done
                                                        ? "bg-success/15 text-success"
                                                        : "bg-muted text-muted-foreground"
                                                )}
                                            >
                                                {done ? <Check className="h-3 w-3" /> : <Camera className="h-3 w-3" />}
                                                {shot.label}
                                            </span>
                                        );
                                    })}
                                </div>

                                <input
                                    ref={fileInputRef}
                                    type="file"
                                    accept="image/jpeg,image/png,image/webp,image/gif"
                                    multiple
                                    className="hidden"
                                    onChange={(e) => void handleUpload(e.target.files)}
                                />
                                <button
                                    type="button"
                                    onClick={() => fileInputRef.current?.click()}
                                    disabled={uploading}
                                    className="flex w-full flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-border bg-card px-4 py-10 text-sm text-muted-foreground transition-colors hover:border-primary hover:text-foreground touch-manipulation"
                                >
                                    {uploading ? (
                                        <Loader2 className="h-8 w-8 animate-spin text-primary" />
                                    ) : (
                                        <Upload className="h-8 w-8 text-primary" />
                                    )}
                                    <span className="font-medium text-foreground">
                                        {uploading ? "Uploading…" : "Tap to upload photos"}
                                    </span>
                                    <span className="text-xs">JPG, PNG, WebP, GIF · max 5MB · up to {MAX_IMAGES}</span>
                                </button>

                                {gallery.length > 0 && (
                                    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={(e) => void handleDragEnd(e)}>
                                        <SortableContext items={gallery.map((g) => g.url)} strategy={rectSortingStrategy}>
                                            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                                                {gallery.map((img) => (
                                                    <SortableThumb
                                                        key={img.url}
                                                        image={img}
                                                        onSetCover={() => void setCover(img.url)}
                                                        onRemove={() => void removeImage(img.url)}
                                                        onRoleChange={(role) => void setRole(img.url, role)}
                                                    />
                                                ))}
                                            </div>
                                        </SortableContext>
                                    </DndContext>
                                )}

                                <div>
                                    <div className="mb-2 flex flex-wrap gap-2">
                                        <span className="text-sm font-medium text-foreground">Description</span>
                                        {DESC_TEMPLATES.map((tpl, i) => (
                                            <button
                                                key={i}
                                                type="button"
                                                onClick={() => applyDescriptionTemplate(tpl)}
                                                className="rounded-md bg-muted px-2 py-1 text-[11px] font-medium text-muted-foreground hover:text-foreground touch-manipulation"
                                            >
                                                Auto {i + 1}
                                            </button>
                                        ))}
                                    </div>
                                    <Textarea
                                        rows={4}
                                        value={form.description}
                                        onChange={(e) => patchField("description", e.target.value)}
                                        placeholder="Merchandising description for the lot / VDP…"
                                    />
                                </div>
                            </>
                        )}
                    </>
                )}

                {step.id === "pricing" && (
                    <div className="space-y-4">
                        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                            <Input
                                label="Purchase price"
                                type="number"
                                min={0}
                                step="0.01"
                                value={form.purchase_price || ""}
                                onChange={(e) =>
                                    patchField("purchase_price", e.target.value === "" ? 0 : Number(e.target.value))
                                }
                                helper={
                                    form.status === "Active" && !(Number(form.purchase_price) > 0)
                                        ? "Required for accurate GP — enter cost before publishing when known."
                                        : "Acquisition cost used for gross profit reports"
                                }
                            />
                            <Input
                                label="Retail price"
                                type="number"
                                min={0}
                                step="0.01"
                                value={form.retail_price || ""}
                                onChange={(e) =>
                                    patchField("retail_price", e.target.value === "" ? 0 : Number(e.target.value))
                                }
                            />
                            <Input
                                label="Extra costs"
                                type="number"
                                min={0}
                                step="0.01"
                                value={form.extra_costs || ""}
                                onChange={(e) =>
                                    patchField("extra_costs", e.target.value === "" ? 0 : Number(e.target.value))
                                }
                            />
                            <Input
                                label="Taxes (on cost)"
                                type="number"
                                min={0}
                                step="0.01"
                                value={form.taxes || ""}
                                onChange={(e) =>
                                    patchField("taxes", e.target.value === "" ? 0 : Number(e.target.value))
                                }
                            />
                            <Input
                                label="Fixed / pack costs"
                                type="number"
                                min={0}
                                step="0.01"
                                value={fixedCosts || ""}
                                onChange={(e) =>
                                    setFixedCosts(e.target.value === "" ? 0 : Number(e.target.value))
                                }
                                helper="Recon / pack — not persisted until settings exist"
                            />
                            <Input
                                label="Special price"
                                type="number"
                                min={0}
                                step="0.01"
                                value={form.special_price ?? ""}
                                onChange={(e) =>
                                    patchField(
                                        "special_price",
                                        e.target.value === "" ? null : Number(e.target.value)
                                    )
                                }
                            />
                            <Input
                                label="MSRP"
                                type="number"
                                min={0}
                                step="0.01"
                                value={form.msrp ?? ""}
                                onChange={(e) =>
                                    patchField("msrp", e.target.value === "" ? null : Number(e.target.value))
                                }
                            />
                        </div>
                        <div
                            className={cn(
                                "rounded-xl border px-4 py-3",
                                estimatedIncome >= 0
                                    ? "border-success/30 bg-success/10"
                                    : "border-destructive/30 bg-destructive/10"
                            )}
                        >
                            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                                Estimated income
                            </p>
                            <p
                                className={cn(
                                    "mt-1 text-2xl font-semibold tabular-nums",
                                    estimatedIncome >= 0 ? "text-success" : "text-destructive"
                                )}
                            >
                                {new Intl.NumberFormat("en-CA", {
                                    style: "currency",
                                    currency: "CAD",
                                    maximumFractionDigits: 0,
                                }).format(estimatedIncome)}
                            </p>
                            <p className="mt-1 text-xs text-muted-foreground">
                                Retail − purchase − extras − taxes − pack
                            </p>
                        </div>
                    </div>
                )}

                {step.id === "specs" && (
                    <>
                        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                            <div className="sm:col-span-2">
                                <div className="mb-1.5 flex items-center justify-between gap-2">
                                    <span className="text-sm font-medium text-foreground">Odometer</span>
                                    <div className="inline-flex rounded-md border border-border p-0.5 text-xs">
                                        <button
                                            type="button"
                                            className={cn(
                                                "rounded px-2.5 py-1 font-medium touch-manipulation",
                                                odometerUnit === "km"
                                                    ? "bg-primary text-primary-foreground"
                                                    : "text-muted-foreground"
                                            )}
                                            onClick={() => setOdometerUnit("km")}
                                        >
                                            km
                                        </button>
                                        <button
                                            type="button"
                                            className={cn(
                                                "rounded px-2.5 py-1 font-medium touch-manipulation",
                                                odometerUnit === "mi"
                                                    ? "bg-primary text-primary-foreground"
                                                    : "text-muted-foreground"
                                            )}
                                            onClick={() => setOdometerUnit("mi")}
                                        >
                                            mi
                                        </button>
                                    </div>
                                </div>
                                <Input
                                    type="number"
                                    min={0}
                                    value={odometerDisplay}
                                    onChange={(e) => {
                                        const raw = e.target.value;
                                        if (raw === "") {
                                            patchField("odometer", 0);
                                            return;
                                        }
                                        const n = Number(raw);
                                        if (!Number.isFinite(n)) return;
                                        patchField(
                                            "odometer",
                                            odometerUnit === "km" ? Math.round(n) : Math.round(n * KM_PER_MILE)
                                        );
                                    }}
                                    helper="Stored as kilometers"
                                />
                            </div>
                            <Input label="Engine" value={form.engine} onChange={(e) => patchField("engine", e.target.value)} />
                            <Input
                                label="Transmission"
                                value={form.transmission}
                                onChange={(e) => patchField("transmission", e.target.value)}
                            />
                            <Input
                                label="Drivetrain"
                                value={form.drivetrain}
                                onChange={(e) => patchField("drivetrain", e.target.value)}
                            />
                            <Input
                                label="Fuel type"
                                value={form.fuel_type}
                                onChange={(e) => patchField("fuel_type", e.target.value)}
                            />
                            <Input
                                label="Body style"
                                value={form.body_style}
                                onChange={(e) => patchField("body_style", e.target.value)}
                            />
                            <Input
                                label="Exterior color"
                                value={form.exterior_color}
                                onChange={(e) => patchField("exterior_color", e.target.value)}
                            />
                            <Input
                                label="Interior color"
                                value={form.interior_color}
                                onChange={(e) => patchField("interior_color", e.target.value)}
                            />
                            <Input
                                label="Doors"
                                type="number"
                                value={form.doors ?? ""}
                                onChange={(e) =>
                                    patchField("doors", e.target.value === "" ? null : Number(e.target.value))
                                }
                            />
                            <Input
                                label="Passengers"
                                type="number"
                                value={form.passengers ?? ""}
                                onChange={(e) =>
                                    patchField(
                                        "passengers",
                                        e.target.value === "" ? null : Number(e.target.value)
                                    )
                                }
                            />
                        </div>

                        <button
                            type="button"
                            onClick={() => setFuelOpen((o) => !o)}
                            className="flex w-full items-center justify-between rounded-lg border border-border bg-card px-3 py-3 text-sm font-medium touch-manipulation"
                        >
                            Fuel economy
                            <ChevronDown className={cn("h-4 w-4 transition-transform", fuelOpen && "rotate-180")} />
                        </button>
                        {fuelOpen && (
                            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                                <Input
                                    label="Fuel capacity"
                                    value={form.fuel_capacity}
                                    onChange={(e) => patchField("fuel_capacity", e.target.value)}
                                />
                                <Input
                                    label="City"
                                    value={form.city_fuel}
                                    onChange={(e) => patchField("city_fuel", e.target.value)}
                                />
                                <Input
                                    label="Highway"
                                    value={form.highway_fuel}
                                    onChange={(e) => patchField("highway_fuel", e.target.value)}
                                />
                            </div>
                        )}

                        <div>
                            <p className="mb-2 text-sm font-medium text-foreground">Features</p>
                            <div className="flex flex-wrap gap-2">
                                {FEATURE_SUGGESTIONS.map((feat) => {
                                    const on = form.features.includes(feat);
                                    return (
                                        <button
                                            key={feat}
                                            type="button"
                                            onClick={() => toggleFeature(feat)}
                                            className={cn(
                                                "rounded-md px-3 py-2 text-xs font-medium touch-manipulation",
                                                on
                                                    ? "bg-primary text-primary-foreground"
                                                    : "bg-muted text-muted-foreground hover:text-foreground"
                                            )}
                                        >
                                            {feat}
                                        </button>
                                    );
                                })}
                                {form.features
                                    .filter((f) => !FEATURE_SUGGESTIONS.includes(f))
                                    .map((feat) => (
                                        <button
                                            key={feat}
                                            type="button"
                                            onClick={() => toggleFeature(feat)}
                                            className="rounded-md bg-primary px-3 py-2 text-xs font-medium text-primary-foreground touch-manipulation"
                                        >
                                            {feat} ×
                                        </button>
                                    ))}
                            </div>
                            <div className="mt-2 flex gap-2">
                                <Input
                                    placeholder="Add custom feature"
                                    value={featureInput}
                                    onChange={(e) => setFeatureInput(e.target.value)}
                                    onKeyDown={(e) => {
                                        if (e.key === "Enter") {
                                            e.preventDefault();
                                            addCustomFeature();
                                        }
                                    }}
                                    containerClassName="flex-1"
                                />
                                <Button type="button" variant="outline" onClick={addCustomFeature}>
                                    Add
                                </Button>
                            </div>
                        </div>
                    </>
                )}

                {step.id === "review" && (
                    <div className="space-y-4">
                        <div className="rounded-xl border border-border bg-card p-4">
                            <p className="text-sm font-semibold text-foreground">
                                {form.year} {form.make} {form.model}
                                {form.trim ? ` ${form.trim}` : ""}
                            </p>
                            <dl className="mt-3 grid grid-cols-2 gap-x-3 gap-y-2 text-sm">
                                <div>
                                    <dt className="text-muted-foreground">VIN</dt>
                                    <dd className="font-mono text-xs">{form.vin || "—"}</dd>
                                </div>
                                <div>
                                    <dt className="text-muted-foreground">Stock</dt>
                                    <dd>{form.stock_number || "—"}</dd>
                                </div>
                                <div>
                                    <dt className="text-muted-foreground">Odometer</dt>
                                    <dd>{form.odometer ? `${form.odometer.toLocaleString()} km` : "—"}</dd>
                                </div>
                                <div>
                                    <dt className="text-muted-foreground">Photos</dt>
                                    <dd>{gallery.length} / {MAX_IMAGES}</dd>
                                </div>
                                <div>
                                    <dt className="text-muted-foreground">Retail</dt>
                                    <dd className="tabular-nums">
                                        {new Intl.NumberFormat("en-CA", {
                                            style: "currency",
                                            currency: "CAD",
                                            maximumFractionDigits: 0,
                                        }).format(form.retail_price || 0)}
                                    </dd>
                                </div>
                                <div>
                                    <dt className="text-muted-foreground">Est. income</dt>
                                    <dd
                                        className={cn(
                                            "tabular-nums font-medium",
                                            estimatedIncome >= 0 ? "text-success" : "text-destructive"
                                        )}
                                    >
                                        {new Intl.NumberFormat("en-CA", {
                                            style: "currency",
                                            currency: "CAD",
                                            maximumFractionDigits: 0,
                                        }).format(estimatedIncome)}
                                    </dd>
                                </div>
                            </dl>
                        </div>

                        <Select
                            label="Purchased from"
                            value={form.purchased_from}
                            onChange={(e) => patchField("purchased_from", e.target.value)}
                            placeholder="—"
                            options={[
                                { value: "Direct", label: "Direct" },
                                { value: "EBlock", label: "EBlock" },
                                { value: "TradeRev", label: "TradeRev" },
                                { value: "ADESA", label: "ADESA" },
                                { value: "Copart", label: "Copart" },
                                { value: "Manheim", label: "Manheim" },
                                { value: "Other", label: "Other" },
                            ]}
                        />
                        <Input
                            label="Title status"
                            value={form.title_status}
                            onChange={(e) => patchField("title_status", e.target.value)}
                        />
                        <Textarea
                            label="Warranty"
                            rows={2}
                            value={form.warranty}
                            onChange={(e) => patchField("warranty", e.target.value)}
                        />
                        <label className="flex items-start gap-3 rounded-lg border border-border bg-card px-3 py-3 cursor-pointer">
                            <input
                                type="checkbox"
                                checked={form.known_damage}
                                onChange={(e) => patchField("known_damage", e.target.checked)}
                                className="mt-0.5 h-4 w-4 rounded border-border text-primary focus:ring-primary"
                            />
                            <span className="text-sm text-foreground">
                                Known damage / disclosure required (MVDA)
                                <span className="mt-0.5 block text-xs text-muted-foreground">
                                    If checked, disclosure notes are required before publishing as Active.
                                </span>
                            </span>
                        </label>
                        <Textarea
                            label="Disclosure"
                            rows={2}
                            value={form.disclosure}
                            onChange={(e) => patchField("disclosure", e.target.value)}
                            helper={
                                form.known_damage && form.status === "Active" && !form.disclosure.trim()
                                    ? MVDA_DAMAGE_NOTES_REQUIRED
                                    : undefined
                            }
                        />
                        <Textarea
                            label="Internal notes"
                            rows={2}
                            value={form.internal_notes}
                            onChange={(e) => patchField("internal_notes", e.target.value)}
                        />
                        <Input
                            label="YouTube URL"
                            value={form.youtube_url}
                            onChange={(e) => patchField("youtube_url", e.target.value)}
                            placeholder="https://…"
                        />
                        <Input
                            label="Inspection report URL"
                            value={form.inspection_report_url}
                            onChange={(e) => patchField("inspection_report_url", e.target.value)}
                        />

                        <div>
                            <p className="mb-1.5 text-sm font-medium text-foreground">CARFAX report (PDF)</p>
                            <p className="mb-2 text-xs text-muted-foreground">
                                Upload a PDF here. On the vehicle page you can also fetch/attach when CARFAX_PARTNER_ID or CARFAX_API_KEY is set.
                            </p>
                            {form.carfax_report_url ? (
                                <div className="flex items-center gap-2 rounded-lg border border-border bg-card px-3 py-2">
                                    <a
                                        href={form.carfax_report_url}
                                        target="_blank"
                                        rel="noreferrer"
                                        className="flex-1 truncate text-sm text-primary underline"
                                    >
                                        View uploaded report
                                    </a>
                                    <Button
                                        type="button"
                                        variant="ghost"
                                        size="icon"
                                        onClick={() => patchField("carfax_report_url", "")}
                                        aria-label="Remove CARFAX"
                                    >
                                        <X className="h-4 w-4" />
                                    </Button>
                                </div>
                            ) : (
                                <>
                                    <input
                                        ref={carfaxInputRef}
                                        type="file"
                                        accept="application/pdf"
                                        className="hidden"
                                        onChange={(e) => void handleCarfaxUpload(e.target.files?.[0])}
                                    />
                                    <Button
                                        type="button"
                                        variant="outline"
                                        loading={uploadingCarfax}
                                        leftIcon={<Upload className="h-4 w-4" />}
                                        onClick={() => carfaxInputRef.current?.click()}
                                        disabled={!form.vin}
                                    >
                                        Upload CARFAX PDF
                                    </Button>
                                </>
                            )}
                        </div>

                        <Select
                            label="Publish as"
                            value={form.status}
                            onChange={(e) => patchField("status", e.target.value)}
                            helper="Coming Soon = draft · Active = on lot"
                            options={[
                                { value: "Coming Soon", label: "Save as Draft (Coming Soon)" },
                                { value: "Active", label: "Publish (Active)" },
                                { value: "Inactive", label: "Inactive" },
                                { value: "Sold", label: "Sold" },
                            ]}
                        />
                    </div>
                )}
            </div>

            {/* Sticky footer CTAs */}
            <div className="fixed inset-x-0 bottom-0 z-30 border-t border-border bg-background/95 px-4 py-3 backdrop-blur-sm lg:static lg:mt-6 lg:border-0 lg:bg-transparent lg:p-0 lg:backdrop-blur-none safe-area-footer">
                <div className="mx-auto flex max-w-3xl gap-2 pb-[env(safe-area-inset-bottom)] lg:pb-0">
                    <Button variant="outline" className="flex-1" onClick={goBack} disabled={saving}>
                        {stepIndex === 0 ? "Cancel" : "Back"}
                    </Button>
                    {step.id !== "basic" && (
                        <Button
                            variant="secondary"
                            className="hidden flex-1 sm:inline-flex"
                            leftIcon={<Save className="h-4 w-4" />}
                            loading={saving}
                            onClick={() => void saveFull(false)}
                        >
                            Save
                        </Button>
                    )}
                    <Button
                        className="flex-[1.4]"
                        rightIcon={
                            stepIndex === STEPS.length - 1 ? (
                                <Check className="h-4 w-4" />
                            ) : (
                                <ArrowRight className="h-4 w-4" />
                            )
                        }
                        loading={saving}
                        onClick={() => void goNext()}
                    >
                        {step.id === "basic"
                            ? "Save draft & continue"
                            : stepIndex === STEPS.length - 1
                              ? form.status === "Active"
                                  ? "Publish"
                                  : "Save draft"
                              : "Continue"}
                    </Button>
                </div>
            </div>

            {showVinLookup && (
                <VINLookupModal
                    existingVin={form.vin}
                    onClose={() => setShowVinLookup(false)}
                    onVinFound={(specs) => {
                        setForm((prev) => ({
                            ...prev,
                            vin: specs.vin || prev.vin,
                            year: specs.year || prev.year,
                            make: specs.make || prev.make,
                            model: specs.model || prev.model,
                            trim: specs.trim || prev.trim,
                            engine: specs.engine || prev.engine,
                            body_style: specs.body_style || prev.body_style,
                            fuel_type: specs.fuel_type || prev.fuel_type,
                            transmission: specs.transmission || prev.transmission,
                            drivetrain: specs.drivetrain || prev.drivetrain,
                            exterior_color: specs.exterior_color || prev.exterior_color,
                            interior_color: specs.interior_color || prev.interior_color,
                            stock_number:
                                prev.stock_number ||
                                suggestStockNumber(specs.year || prev.year, specs.vin || prev.vin),
                        }));
                        if (specs.make) setMakeQuery(specs.make);
                        if (specs.model) setModelQuery(specs.model);
                        setShowVinLookup(false);
                        toast.success("VIN decoded");
                    }}
                />
            )}

            {/* Click-away for comboboxes */}
            {(showMakeList || showModelList) && (
                <button
                    type="button"
                    aria-label="Close lists"
                    className="fixed inset-0 z-20 cursor-default"
                    onClick={() => {
                        setShowMakeList(false);
                        setShowModelList(false);
                    }}
                />
            )}
        </div>
    );
}

