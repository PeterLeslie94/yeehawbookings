import { useState, useEffect } from 'react'
import contentfulClient from '../lib/contentful'
import { IEvent } from '../types/contentful'

export const useContentfulEvents = () => {
  const [events, setEvents] = useState<IEvent[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchEvents = async () => {
      try {
        const response = await contentfulClient.getEntries({
          content_type: 'event',
          'fields.eventType': 'country-days', // Filter for country-days events only
          order: 'fields.date',
        })
        
        setEvents(response.items as IEvent[])
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