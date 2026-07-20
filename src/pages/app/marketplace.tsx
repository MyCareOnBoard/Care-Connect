import { useEffect, useState } from "react"
import { useNavigate, useSearchParams } from "react-router"
import { toast } from "sonner"
import { Plus, Search, ShoppingBag } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Skeleton } from "@/components/ui/skeleton"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { SidePanel } from "@/components/app/SidePanel"
import { useCareFlow } from "@/components/app/useCareFlow"
import { FileDropzone } from "@/components/auth/FileDropzone"
import { Routes } from "@/routes/constants"
import { getAuthErrorMessage } from "@/utils/auth"
import {
  createProduct,
  listProducts,
  type MarketProduct,
  type NewProductInput,
} from "@/utils/careconnect/services/marketplaceService"

const FILTERS = ["All", "Courses", "Equipment", "Template", "Uniforms", "Books", "Services", "Consulting"]

const CATEGORY_STYLES: Record<string, string> = {
  Course: "bg-[#f0e6ff] text-[#7a4fd6]",
  Equipment: "bg-[#e0f2ff] text-[#0d8de0]",
  Templates: "bg-[#ffe9d6] text-[#d97a2b]",
  Uniforms: "bg-[#e2f7e8] text-[#1f9c4c]",
}

const CATEGORY_GRADIENTS: Record<string, string> = {
  Course: "from-[#3b3f48] to-[#6b7280]",
  Equipment: "from-[#1c4e80] to-[#3d9bff]",
  Templates: "from-[#8a5a2b] to-[#c98f4f]",
  Uniforms: "from-[#1c5a6b] to-[#3daac1]",
}

type Product = {
  id: string
  name: string
  category: string
  description: string
  price: number
  seller: string
  sellerId: string
  sellerLocation: string
  imageUrl?: string
}

/** Map a backend marketplace product into the page's display shape. */
function toDisplayProduct(p: MarketProduct): Product {
  return {
    id: p.id,
    name: p.name,
    category: p.category,
    description: p.description || "No description provided.",
    price: p.price,
    seller: p.sellerName || "Seller",
    sellerId: p.sellerId,
    sellerLocation: p.sellerLocation || "",
    imageUrl: p.imageUrl,
  }
}

function normalize(value: string) {
  return value.toLowerCase().replace(/s$/, "")
}

function ProductImage({ category, className = "" }: { category: string; className?: string }) {
  return <div className={`bg-linear-to-br ${CATEGORY_GRADIENTS[category] ?? "from-[#3b3f48] to-[#6b7280]"} ${className}`} />
}

function ProductCard({ product, onOpen }: { product: Product; onOpen: () => void }) {
  return (
    <article
      role="button"
      tabIndex={0}
      onClick={onOpen}
      onKeyDown={(event) => event.key === "Enter" && onOpen()}
      className="group cursor-pointer overflow-hidden rounded-xl border border-white/60 bg-white/80 shadow-[0_4px_16px_rgba(16,20,26,0.05)] backdrop-blur-md transition-all duration-300 hover:-translate-y-0.5 hover:shadow-[0_12px_28px_rgba(16,20,26,0.1)]"
    >
      <div className="relative">
        <ProductImage category={product.category} className="h-36 w-full transition-transform duration-300 group-hover:scale-105" />
        <span className={`absolute right-3 top-3 rounded-full px-3 py-1 text-xs font-semibold ${CATEGORY_STYLES[product.category] ?? "bg-white text-[#141922]"}`}>
          {product.category}
        </span>
      </div>
      <div className="p-4">
        <h3 className="font-bold leading-snug">{product.name}</h3>
        <p className="mt-1 text-sm text-[#657080]">
          Brief description on what the product .. <span className="font-semibold text-[#087fff]">Read more</span>
        </p>
        <div className="mt-3 flex items-center justify-between">
          <span className="font-bold text-[#087fff]">${product.price}</span>
          <span className="flex size-8 items-center justify-center rounded-full border border-[#087fff]/30 text-[#087fff]">
            <ShoppingBag className="size-4" />
          </span>
        </div>
      </div>
    </article>
  )
}

function ProductDetailsPanel({ product, onClose, onEnquire }: { product: Product | null; onClose: () => void; onEnquire: () => void }) {
  const [expanded, setExpanded] = useState(false)

  if (!product) return null

  return (
    <SidePanel open onClose={onClose} title="Product details">
      <div className="space-y-5">
        <ProductImage category={product.category} className="h-48 w-full rounded-xl" />
        <div className="flex items-start justify-between gap-4">
          <h3 className="text-lg font-bold">{product.name}</h3>
          <span className={`shrink-0 rounded-full px-3 py-1 text-xs font-semibold ${CATEGORY_STYLES[product.category] ?? ""}`}>{product.category}</span>
        </div>
        <p className="text-sm leading-6 text-[#565656]">
          {expanded ? product.description : `${product.description.slice(0, 70)}.. `}
          <button type="button" onClick={() => setExpanded((current) => !current)} className="font-semibold text-[#087fff] hover:underline">
            {expanded ? "Show less" : "Read more"}
          </button>
        </p>
        <p className="text-2xl font-bold text-[#087fff]">${product.price}</p>
      </div>

      <Button type="button" className="mt-8 w-full bg-[#087fff]" onClick={onEnquire}>
        Enquire
      </Button>
    </SidePanel>
  )
}

function AddProductPanel({ open, onClose, onSubmit }: { open: boolean; onClose: () => void; onSubmit: (input: NewProductInput) => Promise<void> }) {
  const [image, setImage] = useState<File | null>(null)
  const [name, setName] = useState("")
  const [category, setCategory] = useState("Course")
  const [description, setDescription] = useState("")
  const [price, setPrice] = useState("")
  const [currency, setCurrency] = useState("USD")
  const [saving, setSaving] = useState(false)

  const handleSubmit = async () => {
    if (!name.trim()) {
      toast.error("Please enter a product name")
      return
    }
    setSaving(true)
    try {
      await onSubmit({
        name: name.trim(),
        category,
        description: description.trim(),
        price: Number(price) || 0,
        currency,
        image,
      })
      toast.success("Product uploaded!")
      setImage(null)
      setName("")
      setDescription("")
      setPrice("")
      onClose()
    } catch (error) {
      toast.error(getAuthErrorMessage(error))
    } finally {
      setSaving(false)
    }
  }

  return (
    <SidePanel
      open={open}
      onClose={onClose}
      title="Add product"
      footer={
        <Button type="button" className="w-full bg-[#087fff]" disabled={saving} onClick={handleSubmit}>
          Upload product
        </Button>
      }
    >
      <div className="space-y-6">
        <div className="space-y-2">
          <p className="text-sm font-semibold">Upload product picture</p>
          <p className="text-sm text-[#657080]">
            Upload your assets of choice to me, at most <span className="font-semibold">3</span>
          </p>
          <FileDropzone file={image} onFileChange={setImage} accept=".pdf,.png,.jpg,.jpeg" hint="PDF, PNG, or JPEG (Max. 50 MB)" />
        </div>

        <div className="space-y-2">
          <label className="text-sm font-semibold">Product name</label>
          <Input value={name} onChange={(event) => setName(event.target.value)} placeholder="Enter product name" />
        </div>

        <div className="space-y-2">
          <label className="text-sm font-semibold">Product category</label>
          <Select value={category} onValueChange={setCategory}>
            <SelectTrigger className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="Course">Course</SelectItem>
              <SelectItem value="Equipment">Equipment</SelectItem>
              <SelectItem value="Templates">Templates</SelectItem>
              <SelectItem value="Uniforms">Uniforms</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <label className="text-sm font-semibold">Product description</label>
          <Textarea value={description} onChange={(event) => setDescription(event.target.value)} placeholder="Enter product description here" className="min-h-30" />
        </div>

        <div className="space-y-2">
          <label className="text-sm font-semibold">Price</label>
          <div className="flex gap-3">
            <Select value={currency} onValueChange={setCurrency}>
              <SelectTrigger className="w-28 shrink-0">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="USD">USD</SelectItem>
                <SelectItem value="GBP">GBP</SelectItem>
                <SelectItem value="EUR">EUR</SelectItem>
              </SelectContent>
            </Select>
            <Input type="number" value={price} onChange={(event) => setPrice(event.target.value)} placeholder="0.00" />
          </div>
        </div>
      </div>
    </SidePanel>
  )
}

function MarketplaceSkeleton() {
  return (
    <div className="space-y-6 p-5 sm:p-8">
      <Skeleton className="h-10 w-full max-w-md" />
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 8 }).map((_, index) => (
          <Skeleton key={index} className="h-64 rounded-xl" />
        ))}
      </div>
    </div>
  )
}

export default function MarketplacePage() {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const { flow } = useCareFlow()
  const messagesPath = flow === "agency" ? Routes.app.agency.messages : Routes.app.user.messages
  const [products, setProducts] = useState<Product[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [activeFilter, setActiveFilter] = useState("All")
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null)
  // Deep-link: /market-place?add=1 (e.g. the dashboard "Sell an Item" promo) opens the panel.
  const [isAddOpen, setIsAddOpen] = useState(searchParams.get("add") === "1")

  useEffect(() => {
    let active = true
    ;(async () => {
      setIsLoading(true)
      try {
        const list = await listProducts()
        if (active) setProducts(list.map(toDisplayProduct))
      } catch (error) {
        if (active) toast.error(getAuthErrorMessage(error))
      } finally {
        if (active) setIsLoading(false)
      }
    })()
    return () => {
      active = false
    }
  }, [])

  const handleCreate = async (input: NewProductInput) => {
    const created = await createProduct(input)
    setProducts((current) => [toDisplayProduct(created), ...current])
  }

  if (isLoading) return <MarketplaceSkeleton />

  const filteredProducts =
    activeFilter === "All" ? products : products.filter((product) => normalize(product.category) === normalize(activeFilter))

  return (
    <div className="animate-fade-in-up space-y-6 p-5 sm:p-8">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="text-xl font-bold">Healthcare marketplace</h1>
        <Button type="button" className="bg-[#087fff]" onClick={() => setIsAddOpen(true)}>
          <Plus className="size-4" />
          Add product
        </Button>
      </div>

      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative w-full max-w-sm">
          <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-[#8a8f98]" />
          <Input placeholder="Price, keywords, item name" className="pl-9" />
        </div>
        <div className="flex flex-wrap gap-2">
          {FILTERS.map((filter) => (
            <button
              key={filter}
              type="button"
              onClick={() => setActiveFilter(filter)}
              className={`rounded-full border px-4 py-2 text-sm font-medium transition-colors ${
                activeFilter === filter ? "border-[#087fff] bg-[#087fff] text-white" : "border-[#e2e2e2] text-[#141922] hover:border-[#087fff]"
              }`}
            >
              {filter}
            </button>
          ))}
        </div>
      </div>

      {filteredProducts.length === 0 ? (
        <p className="rounded-xl border border-dashed border-[#e2e2e2] p-10 text-center text-sm text-[#657080]">
          No products listed yet. Click &quot;Add product&quot; to list the first one.
        </p>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {filteredProducts.map((product) => (
            <ProductCard key={product.id} product={product} onOpen={() => setSelectedProduct(product)} />
          ))}
        </div>
      )}

      <ProductDetailsPanel
        product={selectedProduct}
        onClose={() => setSelectedProduct(null)}
        onEnquire={() => {
          const sellerId = selectedProduct?.sellerId
          setSelectedProduct(null)
          if (sellerId) navigate(`${messagesPath}?to=${sellerId}`)
        }}
      />
      <AddProductPanel open={isAddOpen} onClose={() => setIsAddOpen(false)} onSubmit={handleCreate} />
    </div>
  )
}
