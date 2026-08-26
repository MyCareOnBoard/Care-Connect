/**
 * Care Connect — Marketplace service (products for sale).
 * Thin axios wrappers around the `/careconnectMarketplace` backend function.
 */

import axiosClient from "@/lib/axios"

export type ProductStatus = "active" | "sold" | "archived"

export interface MarketProduct {
  id: string
  sellerId: string
  sellerName: string
  sellerLocation?: string
  name: string
  category: string
  description: string
  price: number
  currency: string
  status?: ProductStatus
  imageUrl?: string
}

export interface NewProductInput {
  name: string
  category: string
  description: string
  price: number
  currency: string
  sellerLocation?: string
  image?: File | null
}

/** Owner edit — any subset of fields; a new `image` is uploaded and sent as imageUrl. */
export interface UpdateProductInput {
  name?: string
  category?: string
  description?: string
  price?: number
  currency?: string
  sellerLocation?: string
  status?: ProductStatus
  image?: File | null
}

export interface ListProductsParams {
  category?: string
  search?: string
  /** Substring match on the listing's seller location, for browsing by area. */
  location?: string
  sellerId?: string
  status?: ProductStatus
  limit?: number
  offset?: number
}

/** Upload a product image, returning its public URL (two-step create). */
export async function uploadProductImage(file: File): Promise<string> {
  const formData = new FormData()
  formData.append("file", file)
  const { data } = await axiosClient.post("/uploads/careconnect-product-image", formData)
  return data.data.url
}

export async function listProducts(params: ListProductsParams = {}): Promise<MarketProduct[]> {
  const { data } = await axiosClient.get("/careconnectMarketplace", { params })
  return data.data
}

/** The caller's own listings (all statuses) — for the "My listings" view. */
export async function listMyProducts(): Promise<MarketProduct[]> {
  return listProducts({ sellerId: "me" })
}

export async function createProduct(input: NewProductInput): Promise<MarketProduct> {
  let imageUrl: string | undefined
  if (input.image) imageUrl = await uploadProductImage(input.image)
  const { data } = await axiosClient.post("/careconnectMarketplace", {
    name: input.name,
    category: input.category,
    description: input.description,
    price: input.price,
    currency: input.currency,
    sellerLocation: input.sellerLocation,
    imageUrl,
  })
  return data.data
}

export async function updateProduct(id: string, patch: UpdateProductInput): Promise<MarketProduct> {
  const { image, ...rest } = patch
  const body: Record<string, unknown> = { ...rest }
  if (image) body.imageUrl = await uploadProductImage(image)
  const { data } = await axiosClient.patch(`/careconnectMarketplace/${id}`, body)
  return data.data
}

export async function deleteProduct(id: string): Promise<void> {
  await axiosClient.delete(`/careconnectMarketplace/${id}`)
}
