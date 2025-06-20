import { useState, useEffect } from 'react'
import contentfulClient from '../lib/contentful'
import type { IEvent } from '../types/contentful'

export const useContentfulEvents = () => {
  const [events, setEvents] = useState<IEvent[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchEvents = async () => {
      try {
        const response = await contentfulClient.getEntries({
          content_type: 'event',
          'fields.eventType': 'country-days',
          order: ['fields.date'],
        })
        
        // Type assertion since we know the structure
        const mappedEvents = response.items as unknown as IEvent[]
        
        setEvents(mappedEvents)
        setLoading(false)
      } catch (err) {
        console.error('Error fetching events from Contentful:', err)
        setError('Failed to load events')
        setLoading(false)
      }
    }

    fetchEvents()
  }, [])

  return { events, loading, error }
}