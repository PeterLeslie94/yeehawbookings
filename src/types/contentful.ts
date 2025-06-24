import type { Asset } from 'contentful'

export interface IEventFields {
  title: string
  eventType: string
  date: string
  city: string  // Note: lowercase 'c' to match Contentful field ID
  skiddleUrl?: string
  image?: Asset
}

export interface IEvent {
  sys: {
    id: string
  }
  fields: IEventFields
}

export interface IGalleryFields {
  title: string
  images: Asset[]
}

export interface IGallery {
  sys: {
    id: string
  }
  fields: IGalleryFields
}