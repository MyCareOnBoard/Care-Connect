import { useState } from "react"
import { toast } from "sonner"
import { Plus, Search, ShoppingBag } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Skeleton } from "@/components/ui/skeleton"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { SidePanel } from "@/components/app/SidePanel"
import { ChatThread, type ChatMessage } from "@/components/app/ChatThread"
import { FileDropzone } from "@/components/auth/FileDropzone"
import { useDelayedLoading } from "@/hooks/useDelayedLoading"

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
  sellerLocation: string
}

const initialProducts: Product[] = [
  { id: "p1", name: "NCLEX-RN Prep Master Course", category: "Course", description: "Comprehensive NCLEX-RN prep with 2,000+ practice questions, detailed rationales, and adaptive quizzes designed to build confidence and mastery before exam day.", price: 89, seller: "Riverside General Hospital", sellerLocation: "Austin, TX" },
  { id: "p2", name: "Medical-Grade Pulse Oximeter", category: "Equipment", description: "Clinically accurate fingertip pulse oximeter with fast readings, ideal for home health visits and bedside monitoring.", price: 34, seller: "HHC Bellevue Hospital", sellerLocation: "Austin, TX" },
  { id: "p3", name: "Clinical Documentation Templates", category: "Templates", description: "A ready-to-use pack of clinical documentation and care-plan templates that keep charting consistent and compliant.", price: 19, seller: "Harlem Hospital Center", sellerLocation: "Pasadena, OK" },
  { id: "p4", name: "Compression Nursing Scrubs Set", category: "Uniforms", description: "Breathable, compression-fit scrub set built for long shifts, with reinforced stitching and multiple utility pockets.", price: 68, seller: "NYU Langone Medical Center", sellerLocation: "Great Falls, MD" },
  { id: "p5", name: "Clinical Documentation Templates", category: "Templates", description: "A ready-to-use pack of clinical documentation and care-plan templates that keep charting consistent and compliant.", price: 70, seller: "Gracie Square Hospital", sellerLocation: "Kent, UT" },
  { id: "p6", name: "NCLEX-RN Prep Master Course", category: "Course", description: "Comprehensive NCLEX-RN prep with 2,000+ practice questions, detailed rationales, and adaptive quizzes designed to build confidence and mastery before exam day.", price: 49, seller: "Riverside General Hospital", sellerLocation: "Austin, TX" },
  { id: "p7", name: "Compression Nursing Scrubs Set", category: "Uniforms", description: "Breathable, compression-fit scrub set built for long shifts, with reinforced stitching and multiple utility pockets.", price: 65, seller: "NYU Langone Medical Center", sellerLocation: "Great Falls, MD" },
  { id: "p8", name: "Medical-Grade Pulse Oximeter", category: "Equipment", description: "Clinically accurate fingertip pulse oximeter with fast readings, ideal for home health visits and bedside monitoring.", price: 108, seller: "HHC Bellevue Hospital", sellerLocation: "Austin, TX" },
]

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

function EnquirePanel({ product, onClose }: { product: Product | null; onClose: () => void }) {
  const [messages, setMessages] = useState<ChatMessage[]>([])

  if (!product) return null

  const seedMessages: ChatMessage[] = [
    { id: "seed-1", from: "them", text: "Yes this is available", time: "12:23 Pm" },
    { id: "seed-2", from: "me", text: "Yes, absolutely! That works perfectly for me.", time: "12:24 Pm" },
    { id: "seed-3", from: "me", text: "How can I pay and get this", time: "12:24 Pm" },
    { id: "seed-4", from: "them", text: "Text me on +1 223 435 7675", time: "12:23 Pm" },
    { id: "seed-5", from: "me", text: "Okay check your messages", time: "12:24 Pm" },
  ]

  return (
    <SidePanel open onClose={onClose} title={product.seller} widthClassName="max-w-[480px]">
      <div className="flex h-full flex-col -mx-6 -my-5">
        <div className="mx-6 mt-2 flex items-center gap-3 rounded-xl border border-[#e2e2e2] p-3">
          <ProductImage category={product.category} className="size-14 shrink-0 rounded-lg" />
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-bold">{product.name}</p>
            <p className="font-bold text-[#087fff]">${product.price}</p>
          </div>
        </div>

        <ChatThread
          messages={[...seedMessages, ...messages]}
          onSend={(text) =>
            setMessages((current) => [...current, { id: `${Date.now()}`, from: "me", text, time: "Now" }])
          }
          className="flex-1"
        />
      </div>
    </SidePanel>
  )
}

function AddProductPanel({ open, onClose, onCreate }: { open: boolean; onClose: () => void; onCreate: (product: Product) => void }) {
  const [image, setImage] = useState<File | null>(null)
  const [name, setName] = useState("")
  const [category, setCategory] = useState("Course")
  const [description, setDescription] = useState("")
  const [price, setPrice] = useState("")

  const handleSubmit = () => {
    if (!name.trim()) {
      toast.error("Please enter a product name")
      return
    }
    onCreate({
      id: `p-${Date.now()}`,
      name,
      category,
      description: description || "No description provided.",
      price: Number(price) || 0,
      seller: "You",
      sellerLocation: "",
    })
    toast.success("Product uploaded!")
    setImage(null)
    setName("")
    setDescription("")
    setPrice("")
    onClose()
  }

  return (
    <SidePanel
      open={open}
      onClose={onClose}
      title="Add product"
      footer={
        <Button type="button" className="w-full bg-[#087fff]" onClick={handleSubmit}>
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
            <Select defaultValue="USD">
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
  const isLoading = useDelayedLoading()
  const [products, setProducts] = useState(initialProducts)
  const [activeFilter, setActiveFilter] = useState("All")
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null)
  const [enquiryProduct, setEnquiryProduct] = useState<Product | null>(null)
  const [isAddOpen, setIsAddOpen] = useState(false)

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

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {filteredProducts.map((product) => (
          <ProductCard key={product.id} product={product} onOpen={() => setSelectedProduct(product)} />
        ))}
      </div>

      <ProductDetailsPanel
        product={selectedProduct}
        onClose={() => setSelectedProduct(null)}
        onEnquire={() => {
          setEnquiryProduct(selectedProduct)
          setSelectedProduct(null)
        }}
      />
      <EnquirePanel product={enquiryProduct} onClose={() => setEnquiryProduct(null)} />
      <AddProductPanel open={isAddOpen} onClose={() => setIsAddOpen(false)} onCreate={(product) => setProducts((current) => [product, ...current])} />
    </div>
  )
}
