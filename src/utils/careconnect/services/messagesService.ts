/**
 * Care Connect — Messaging service (1:1 direct messages).
 * Thin axios wrappers around the `/careconnectMessaging` backend function.
 */

import axiosClient from "@/lib/axios"

export interface MessageAttachment {
  type: "image" | "file"
  url: string
  name?: string
}

export interface ConversationParticipant {
  uid: string
  name: string
  photo?: string | null
  subtitle?: string | null
}

export interface CareConnectConversation {
  id: string
  participantIds: string[]
  participant: ConversationParticipant | null
  lastMessage?: string | null
  lastMessageAt?: unknown
  lastMessageSenderId?: string | null
  messageCount?: number
  unread: number
}

export interface CareConnectMessage {
  id: string
  conversationId: string
  senderId: string
  senderName?: string
  senderAvatar?: string | null
  content: string
  attachments?: MessageAttachment[]
  createdAt?: unknown
}

export async function listConversations(): Promise<CareConnectConversation[]> {
  const { data } = await axiosClient.get("/careconnectMessaging")
  return data.data
}

export async function getUnreadCount(): Promise<number> {
  const { data } = await axiosClient.get("/careconnectMessaging/unread-count")
  return data.data?.count ?? 0
}

/** Create-or-resolve a 1:1 conversation with another user. */
export async function startConversation(participantId: string): Promise<CareConnectConversation> {
  const { data } = await axiosClient.post("/careconnectMessaging", { participantId })
  return data.data
}

export async function getConversation(id: string): Promise<CareConnectConversation> {
  const { data } = await axiosClient.get(`/careconnectMessaging/${id}`)
  return data.data
}

export async function listMessages(
  id: string,
  params: { before?: string; limit?: number } = {},
): Promise<CareConnectMessage[]> {
  const { data } = await axiosClient.get(`/careconnectMessaging/${id}/messages`, { params })
  return data.data
}

export async function sendMessage(
  id: string,
  payload: { content?: string; attachments?: MessageAttachment[] },
): Promise<CareConnectMessage> {
  const { data } = await axiosClient.post(`/careconnectMessaging/${id}/messages`, payload)
  return data.data
}

export async function markRead(id: string): Promise<void> {
  await axiosClient.post(`/careconnectMessaging/${id}/read`)
}

/** Upload a message attachment, returning its public URL. */
export async function uploadMessageAttachment(file: File): Promise<string> {
  const formData = new FormData()
  formData.append("file", file)
  const { data } = await axiosClient.post("/uploads/careconnect-message-attachment", formData)
  return data.data.url
}
