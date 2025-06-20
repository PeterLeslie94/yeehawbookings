import type { Asset } from 'contentful'

export interface IEventFields {
  title: string
  eventType: string
  date: string
  City: string  // Note: Capital C to match your field
  skiddleUrl?: string
  image?: Asset
}

export interface IEvent {
  sys: {
    id: string
  }
  fields: IEventFields
}