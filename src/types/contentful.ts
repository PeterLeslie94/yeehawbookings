export interface IEventFields {
  title: string
  eventType: string
  date: string
  City: string  // Note: Capital C to match your field
  skiddleUrl?: string
  image?: {
    fields: {
      file: {
        url: string
      }
    }
  }
}

export interface IEvent {
  sys: {
    id: string
  }
  fields: IEventFields
}