// types/supabase.ts
export interface Profile {
  id: string
  full_name: string | null
  language: string | null
  avatar_url: string | null
  created_at?: string
  updated_at?: string
  status?: 'active' | 'deleted'
  deleted_at?: string | null
}

export interface Document {
  id: string
  user_id: string
  title: string
  type?: string
  file_url?: string
  provider?: string
  signature_date?: string
  expiration_date?: string
  status?: string
  tags?: string[]
  created_at?: string
}

export interface Fournisseur {
  id: string
  name: string
  type?: string
  website?: string
  contact_email?: string
}

export interface Alert {
  id: string
  user_id: string
  document_id?: string
  title: string
  message?: string
  type?: string
  is_read?: boolean
  created_at?: string
}

export interface Analysis {
  id: string
  document_id: string
  user_id: string
  summary?: string
  risk_score?: number
  clauses?: Record<string, any>
  created_at?: string
}
