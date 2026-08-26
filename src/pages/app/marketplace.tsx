import { useEffect, useState } from "react"
import { useNavigate, useSearchParams } from "react-router"
import { toast } from "sonner"
import { MapPin, Pencil, Plus, Search, ShoppingBag, Trash2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Skeleton } from "@/components/ui/skeleton"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { SidePanel } from "@/components/app/SidePanel"
import { useCareFlow } from "@/components/app/useCareFlow"
import { FileDropzone } from "@/components/auth/FileDropzone"
import { AddressAutocomplete } from "@/components/maps/AddressAutocomplete"
import { Routes } from "@/routes/constants"
import { getAuthErrorMessage } from "@/utils/auth"
import {
  createProduct,
  deleteProduct,
  listMyProducts,
  listProducts,
  updateProduct,
  type MarketProduct,
  type NewProductInput,
  type ProductStatus,
} from "@/utils/careconnect/services/marketplaceService"

// Single source of truth for categories — the add/edit form, the browse filters,
// and the style/gradient maps all derive from this so labels can't drift apart.
const CATEGORIES = ["Course", "Equipment", "Templates", "Uniforms", "Books", "Services", "Consulting"] as const
const FILTERS = ["All", ...CATEGORIES]

const CURRENCY_SYMBOLS: Record<string, string> = { USD: "$", GBP: "£", EUR: "€" }
function priceLabel(price: number, currency: string): string {
  return `${CURRENCY_SYMBOLS[currency] ?? "$"}${price}`
}

const STATUS_LABELS: Record<ProductStatus, string> = { active: "Active", sold: "Out of Stock", archived: "Archived" }
const STATUS_STYLES: Record<ProductStatus, string> = {
  active: "bg-[#e2f7e8] text-[#1f9c4c]",
  sold: "bg-[#ffe9d6] text-[#d97a2b]",
  archived: "bg-[#eceef1] text-[#657080]",
}

const CATEGORY_STYLES: Record<string, string> = {
  Course: "bg-[#f0e6ff] text-[#7a4fd6]",
  Equipment: "bg-[#e0f2ff] text-[#0d8de0]",
  Templates: "bg-[#ffe9d6] text-[#d97a2b]",
  Uniforms: "bg-[#e2f7ef] text-[#1c5a6b]",
  Books: "bg-[#e2f7e8] text-[#1f9c4c]",
  Services: "bg-[#e0f2ff] text-[#0d8de0]",
  Consulting: "bg-[#f0e6ff] text-[#7a4fd6]",
}

const CATEGORY_GRADIENTS: Record<string, string> = {
  Course: "from-[#3b3f48] to-[#6b7280]",
  Equipment: "from-[#1c4e80] to-[#3d9bff]",
  Templates: "from-[#8a5a2b] to-[#c98f4f]",
  Uniforms: "from-[#1c5a6b] to-[#3daac1]",
  Books: "from-[#1f7a4d] to-[#3daa6b]",
  Services: "from-[#1c4e80] to-[#3d9bff]",
  Consulting: "from-[#5a2b8a] to-[#8f4fc9]",
}

type Product = {
  id: string
  name: string
  category: string
  description: string
  price: number
  currency: string
  status: ProductStatus
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
    currency: p.currency || "USD",
    status: p.status ?? "active",
    seller: p.sellerName || "Seller",
    sellerId: p.sellerId,
    sellerLocation: p.sellerLocation || "",
    imageUrl: p.imageUrl,
  }
}

function ProductImage({ category, imageUrl, className = "" }: { category: string; imageUrl?: string; className?: string }) {
  if (imageUrl) {
    return <img src={imageUrl} alt="" loading="lazy" decoding="async" className={`object-cover ${className}`} />
  }
  return <div className={`bg-linear-to-br ${CATEGORY_GRADIENTS[category] ?? "from-[#3b3f48] to-[#6b7280]"} ${className}`} />
}

type OwnerActions = {
  onEdit: () => void
  onDelete: () => void
  onSetStatus: (status: ProductStatus) => void
}

function ProductCard({ product, onOpen, owner }: { product: Product; onOpen: () => void; owner?: OwnerActions }) {
  const isLong = product.description.length > 40
  const excerpt = isLong ? `${product.description.slice(0, 40)}.. ` : product.description

  return (
    <article
      role="button"
      tabIndex={0}
      onClick={onOpen}
      onKeyDown={(event) => event.key === "Enter" && onOpen()}
      className="group cursor-pointer overflow-hidden rounded-2xl border border-[#eef1f3] bg-white shadow-[0_1px_3px_rgba(16,20,26,0.06)] transition-all duration-300 hover:-translate-y-0.5 hover:shadow-[0_12px_28px_rgba(16,20,26,0.1)]"
    >
      <div className="relative">
        <ProductImage category={product.category} imageUrl={product.imageUrl} className="w-full h-40 transition-transform duration-300 group-hover:scale-105" />
        <span className={`absolute right-3 top-3 rounded-full px-3 py-1 text-xs font-semibold ${CATEGORY_STYLES[product.category] ?? "bg-white text-[#141922]"}`}>
          {product.category}
        </span>
        {owner && (
          <span className={`absolute left-3 top-3 rounded-full px-2.5 py-1 text-xs font-semibold ${STATUS_STYLES[product.status]}`}>
            {STATUS_LABELS[product.status]}
          </span>
        )}
      </div>
      <div className="p-4">
        <h3 className="font-bold leading-snug truncate">{product.name}</h3>
        {product.sellerLocation && (
          <p className="mt-1 flex items-center gap-1 truncate text-xs text-[#8a8f98]">
            <MapPin className="size-3 shrink-0" />
            {product.sellerLocation}
          </p>
        )}
        <p className="mt-1 truncate text-sm text-[#657080]">
          {excerpt}
          {isLong && (
            <button
              type="button"
              onClick={(event) => {
                event.stopPropagation()
                onOpen()
              }}
              className="font-semibold text-[#151922] hover:underline"
            >
              Read more
            </button>
          )}
        </p>
        <div className="flex items-center justify-between mt-3">
          <span className="font-bold text-[#00b4b8]">{priceLabel(product.price, product.currency)}</span>
          {!owner && (
            <span className="flex size-8 items-center justify-center rounded-lg border border-[#00b4b8]/30 text-[#00b4b8]">
              <ShoppingBag className="size-4" />
            </span>
          )}
        </div>

        {owner && (
          <div className="mt-4 flex items-center gap-2 border-t border-[#eef1f3] pt-3" onClick={(event) => event.stopPropagation()}>
            <Button type="button" size="sm" variant="outline" className="h-8 gap-1 px-2.5" onClick={owner.onEdit}>
              <Pencil className="size-3.5" />
              Edit
            </Button>
            <Button type="button" size="sm" variant="outline" className="h-8 gap-1 px-2.5 text-[#c0392b]" onClick={owner.onDelete}>
              <Trash2 className="size-3.5" />
              Delete
            </Button>
            <Select value={product.status} onValueChange={(value) => owner.onSetStatus(value as ProductStatus)}>
              <SelectTrigger className="h-8 ml-auto w-28">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="sold">Out of Stock</SelectItem>
                <SelectItem value="archived">Archived</SelectItem>
              </SelectContent>
            </Select>
          </div>
        )}
      </div>
    </article>
  )
}

function ProductDetailsPanel({ product, onClose, onEnquire }: { product: Product | null; onClose: () => void; onEnquire: () => void }) {
  const [expanded, setExpanded] = useState(false)

  if (!product) return null

  const isLong = product.description.length > 70

  return (
    <SidePanel open onClose={onClose} title="Product details">
      <div className="space-y-5">
        <ProductImage category={product.category} imageUrl={product.imageUrl} className="w-full h-48 rounded-xl" />
        <div className="flex items-start justify-between gap-4">
          <h3 className="text-lg font-bold">{product.name}</h3>
          <span className={`shrink-0 rounded-full px-3 py-1 text-xs font-semibold ${CATEGORY_STYLES[product.category] ?? ""}`}>{product.category}</span>
        </div>
        {product.sellerLocation && (
          <p className="flex items-center gap-1.5 text-sm text-[#657080]">
            <MapPin className="size-4 shrink-0" />
            {product.sellerLocation}
          </p>
        )}
        <p className="text-sm leading-6 text-[#565656]">
          {expanded || !isLong ? product.description : `${product.description.slice(0, 70)}.. `}
          {isLong && (
            <button type="button" onClick={() => setExpanded((current) => !current)} className="font-semibold text-[#00b4b8] hover:underline">
              {expanded ? "Show less" : "Read more"}
            </button>
          )}
        </p>
        <p className="text-2xl font-bold text-[#00b4b8]">{priceLabel(product.price, product.currency)}</p>
      </div>

      <Button type="button" className="mt-8 w-full bg-[#00b4b8]" onClick={onEnquire}>
        Enquire
      </Button>
    </SidePanel>
  )
}

/** Add or edit a listing. When `product` is provided the panel opens in edit mode. */
function ProductFormPanel({
  open,
  product,
  onClose,
  onSubmit,
}: {
  open: boolean
  product?: Product | null
  onClose: () => void
  onSubmit: (input: NewProductInput) => Promise<void>
}) {
  const isEdit = !!product
  const [image, setImage] = useState<File | null>(null)
  const [name, setName] = useState(product?.name ?? "")
  const [category, setCategory] = useState(product?.category ?? "Course")
  const [description, setDescription] = useState(product && product.description !== "No description provided." ? product.description : "")
  const [price, setPrice] = useState(product ? String(product.price) : "")
  const [currency, setCurrency] = useState(product?.currency ?? "USD")
  const [location, setLocation] = useState(product?.sellerLocation ?? "")
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
        sellerLocation: location.trim(),
        image,
      })
      toast.success(isEdit ? "Listing updated!" : "Product uploaded!")
      if (!isEdit) {
        setImage(null)
        setName("")
        setDescription("")
        setPrice("")
        setLocation("")
      }
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
      title={isEdit ? "Edit product" : "Add product"}
      footer={
        <Button type="button" className="w-full bg-[#00b4b8]" disabled={saving} onClick={handleSubmit}>
          {isEdit ? "Save changes" : "Upload product"}
        </Button>
      }
    >
      <div className="space-y-6">
        <div className="space-y-2">
          <p className="text-sm font-semibold">Product picture</p>
          <p className="text-sm text-[#657080]">
            {isEdit ? "Upload a new image to replace the current one (optional)." : "Upload one image for your listing."}
          </p>
          {/* Posts to /uploads/careconnect-product-image — IMAGE_CONFIG: 5 MB, images only. */}
          <FileDropzone file={image} onFileChange={setImage} accept=".png,.jpg,.jpeg,.webp" maxSizeMb={5} />
        </div>

        <div className="space-y-2">
          <label className="text-sm font-semibold">Product name</label>
          <Input value={name} onChange={(event) => setName(event.target.value)} placeholder="Enter product name" />
        </div>

        <div className="space-y-2">
          <label className="text-sm font-semibold">Location</label>
          {/* Places autocomplete so listings settle on one spelling per place — typed
              freehand this produced "Austin, TX", "austin tx" and "Austin, Texas" for the
              same city, which display and search then treat as three places. Degrades to a
              plain text field without a Maps key, so a listing can always be saved. */}
          <AddressAutocomplete
            value={location ? { address: location } : null}
            onChange={(place) => setLocation(place?.address ?? "")}
            placeholder="e.g. Austin, TX"
            className="h-9 w-full rounded-md border border-(--input-border) bg-(--input-bg) px-3 text-sm text-(--input-text) outline-none focus:border-[#00b4b8]"
          />
        </div>

        <div className="space-y-2">
          <label className="text-sm font-semibold">Product category</label>
          <Select value={category} onValueChange={setCategory}>
            <SelectTrigger className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {CATEGORIES.map((option) => (
                <SelectItem key={option} value={option}>
                  {option}
                </SelectItem>
              ))}
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
    <div className="p-5 space-y-6 sm:p-8">
      <Skeleton className="w-full h-10 max-w-md" />
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 8 }).map((_, index) => (
          <Skeleton key={index} className="h-64 rounded-xl" />
        ))}
      </div>
    </div>
  )
}

type View = "browse" | "mine"

export default function MarketplacePage() {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const { flow } = useCareFlow()
  const messagesPath = flow === "agency" ? Routes.app.agency.messages : Routes.app.user.messages

  const [view, setView] = useState<View>("browse")
  const [products, setProducts] = useState<Product[]>([])
  const [myProducts, setMyProducts] = useState<Product[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [myLoading, setMyLoading] = useState(false)
  const [myLoaded, setMyLoaded] = useState(false)

  const [activeFilter, setActiveFilter] = useState("All")
  const [search, setSearch] = useState("")
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null)
  const [editingProduct, setEditingProduct] = useState<Product | null>(null)
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

  // Lazy-load the seller's own listings the first time they open "My listings".
  useEffect(() => {
    if (view !== "mine" || myLoaded) return
    let active = true
    ;(async () => {
      setMyLoading(true)
      try {
        const list = await listMyProducts()
        if (active) {
          setMyProducts(list.map(toDisplayProduct))
          setMyLoaded(true)
        }
      } catch (error) {
        if (active) toast.error(getAuthErrorMessage(error))
      } finally {
        if (active) setMyLoading(false)
      }
    })()
    return () => {
      active = false
    }
  }, [view, myLoaded])

  /** Reflect an edited/status-changed listing in both lists without a refetch. */
  const applyLocalUpdate = (updated: Product) => {
    setMyProducts((current) => current.map((item) => (item.id === updated.id ? updated : item)))
    setProducts((current) => {
      const exists = current.some((item) => item.id === updated.id)
      if (updated.status === "active") {
        return exists ? current.map((item) => (item.id === updated.id ? updated : item)) : current
      }
      // Non-active listings drop out of the public browse list.
      return current.filter((item) => item.id !== updated.id)
    })
  }

  const handleCreate = async (input: NewProductInput) => {
    const created = toDisplayProduct(await createProduct(input))
    setProducts((current) => [created, ...current])
    if (myLoaded) setMyProducts((current) => [created, ...current])
  }

  const handleUpdate = async (input: NewProductInput) => {
    if (!editingProduct) return
    const updated = toDisplayProduct(
      await updateProduct(editingProduct.id, {
        name: input.name,
        category: input.category,
        description: input.description,
        price: input.price,
        currency: input.currency,
        sellerLocation: input.sellerLocation,
        image: input.image,
      }),
    )
    applyLocalUpdate(updated)
  }

  const handleSetStatus = async (product: Product, status: ProductStatus) => {
    if (product.status === status) return
    try {
      const updated = toDisplayProduct(await updateProduct(product.id, { status }))
      applyLocalUpdate(updated)
      toast.success(`Marked as ${STATUS_LABELS[status].toLowerCase()}`)
    } catch (error) {
      toast.error(getAuthErrorMessage(error))
    }
  }

  const handleDelete = async (product: Product) => {
    if (!window.confirm(`Remove "${product.name}"? This can't be undone.`)) return
    try {
      await deleteProduct(product.id)
      setMyProducts((current) => current.filter((item) => item.id !== product.id))
      setProducts((current) => current.filter((item) => item.id !== product.id))
      toast.success("Listing removed")
    } catch (error) {
      toast.error(getAuthErrorMessage(error))
    }
  }

  if (isLoading) return <MarketplaceSkeleton />

  const source = view === "mine" ? myProducts : products
  const term = search.trim().toLowerCase()
  const visibleProducts = source.filter((product) => {
    const matchesCategory = activeFilter === "All" || product.category === activeFilter
    // Location is shown on every card, so the search box has to match it — otherwise
    // typing a city returns nothing. Seller name too, for the same reason.
    const matchesSearch =
      !term ||
      [product.name, product.description, product.seller, product.sellerLocation].some((value) =>
        String(value ?? "").toLowerCase().includes(term),
      )
    return matchesCategory && matchesSearch
  })

  const emptyMessage =
    view === "mine"
      ? "Your inventory is empty. Click “Add product” to create your first listing."
      : "No products listed yet. Click “Add product” to list the first one."

  return (
    <div className="p-5 space-y-6 animate-fade-in-up sm:p-8">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="text-2xl font-bold">Healthcare marketplace</h1>
        <Button type="button" className="bg-[#00b4b8]" onClick={() => setIsAddOpen(true)}>
          <Plus className="size-4" />
          Add product
        </Button>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2 border border-[#5f6061]/30 rounded-full p-1.5">
          {(["browse", "mine"] as View[]).map((option) => (
            <button
              key={option}
              type="button"
              onClick={() => setView(option)}
              className={`rounded-full px-5 py-2 text-sm font-semibold transition-colors cursor-pointer ${
                view === option
                  ? "bg-[#00b4b8] text-white"
                  : "border border-[#e2e2e2] text-[#141922] hover:border-[#00b4b8]"
              }`}
            >
              {option === "browse" ? "Marketplace" : "My inventory"}
            </button>
          ))}
        </div>

        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="relative w-full max-w-md">
            <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-[#8a8f98]" />
            <Input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search products, sellers, or location"
              className="pl-9"
            />
          </div>
          <div className="flex items-center gap-2 text-sm shrink-0">
            <span className="font-semibold whitespace-nowrap">Filter by:</span>
            <Select value={activeFilter} onValueChange={setActiveFilter}>
              <SelectTrigger className="w-36">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {FILTERS.map((filter) => (
                  <SelectItem key={filter} value={filter}>
                    {filter}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      {view === "mine" && myLoading ? (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {Array.from({ length: 4 }).map((_, index) => (
            <Skeleton key={index} className="h-72 rounded-xl" />
          ))}
        </div>
      ) : visibleProducts.length === 0 ? (
        <p className="rounded-xl border border-dashed border-[#e2e2e2] p-10 text-center text-sm text-[#657080]">{emptyMessage}</p>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {visibleProducts.map((product) => (
            <ProductCard
              key={product.id}
              product={product}
              onOpen={() => setSelectedProduct(product)}
              owner={
                view === "mine"
                  ? {
                      onEdit: () => setEditingProduct(product),
                      onDelete: () => handleDelete(product),
                      onSetStatus: (status) => handleSetStatus(product, status),
                    }
                  : undefined
              }
            />
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

      <ProductFormPanel open={isAddOpen} onClose={() => setIsAddOpen(false)} onSubmit={handleCreate} />

      <ProductFormPanel
        key={editingProduct?.id ?? "edit"}
        open={!!editingProduct}
        product={editingProduct}
        onClose={() => setEditingProduct(null)}
        onSubmit={handleUpdate}
      />
    </div>
  )
}
