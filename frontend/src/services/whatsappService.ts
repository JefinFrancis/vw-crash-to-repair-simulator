import { apiClient } from './api'

interface SendWppCollisionPayload {
  phone: string
  repairPrice: string
  dealerName: string
  dealerAddress: string
  dealerPhone: string
}

export const whatsappService = {
  async sendCollisionWhatsApp(payload: SendWppCollisionPayload): Promise<void> {
    await apiClient.post('/whatsapp/send-collision', payload)
  },
}
