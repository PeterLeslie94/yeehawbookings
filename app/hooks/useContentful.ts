'use client'

import { useState, useEffect } from 'react'
import contentfulClient from '../lib/contentful'
import type { IEvent, IGallery } from '../types/contentful'

export const useContentfulEvents = () => {
  const [events, setEvents] = useState<IEvent[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchEvents = async () => {
      try {
        // Check if environment variables are set
        if (!process.env.NEXT_PUBLIC_CONTENTFUL_SPACE_ID || !process.env.NEXT_PUBLIC_CONTENTFUL_ACCESS_TOKEN) {
          console.warn('Contentful credentials not configured')
          setEvents([])
          setLoading(false)
          return
        }

        const response = await contentfulClient.getEntries({
          content_type: 'event',
          'fields.eventType': 'country-days',
          order: ['fields.date'],
        })
        
        console.log('Contentful response:', response.items.length, 'events found')
        
        // Type assertion since we know the structure
        const mappedEvents = response.items as unknown as IEvent[]
        
        setEvents(mappedEvents)
        setLoading(false)
      } catch (err) {
        console.error('Error fetching events from Contentful:', err)
        setError('Failed to load events. Please check your connection.')
        setLoading(false)
      }
    }

    fetchEvents()
  }, [])

  return { events, loading, error }
}

export const useContentfulGallery = () => {
  const [gallery, setGallery] = useState<IGallery | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchGallery = async () => {
      try {
        // Check if environment variables are set
        if (!process.env.NEXT_PUBLIC_CONTENTFUL_SPACE_ID || !process.env.NEXT_PUBLIC_CONTENTFUL_ACCESS_TOKEN) {
          console.warn('Contentful credentials not configured')
          setGallery(null)
          setLoading(false)
          return
        }

        const response = await contentfulClient.getEntries({
          content_type: 'gallery',
          limit: 1,
        })
        
        console.log('Contentful gallery response:', response.items.length, 'galleries found')
        
        if (response.items.length > 0) {
          // Type assertion since we know the structure
          const galleryData = response.items[0] as unknown as IGallery
          setGallery(galleryData)
        } else {
          setGallery(null)
        }
        
        setLoading(false)
      } catch (err) {
        console.error('Error fetching gallery from Contentful:', err)
        setError('Failed to load gallery. Please check your connection.')
        setLoading(false)
      }
    }

    fetchGallery()
  }, [])

  return { gallery, loading, error }
}