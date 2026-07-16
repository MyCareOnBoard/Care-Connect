/**
 * Care Connect — Marketplace service (products for sale).
 * Thin axios wrappers around the `/careconnectMarketplace` backend function.
 */

import axiosClient from "@/lib/axios"

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
  imageUrl?: string
}

export interface NewProductInput {
  name: string
  category: string
  description: string
  price: number
  currency: string
  image?: File | null
}

export interface ListProductsParams {
  category?: string
  search?: string
  sellerId?: string
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

export async function createProduct(input: NewProductInput): Promise<MarketProduct> {
  let imageUrl: string | undefined
  if (input.image) imageUrl = await uploadProductImage(input.image)
  const { data } = await axiosClient.post("/careconnectMarketplace", {
    name: input.name,
    category: input.category,
    description: input.description,
    price: input.price,
    currency: input.currency,
    imageUrl,
  })
  return data.data
}

export async function deleteProduct(id: string): Promise<void> {
  await axiosClient.delete(`/careconnectMarketplace/${id}`)
}
