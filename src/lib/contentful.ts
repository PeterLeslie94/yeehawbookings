import { createClient } from 'contentful'

const spaceId = import.meta.env.VITE_CONTENTFUL_SPACE_ID
const accessToken = import.meta.env.VITE_CONTENTFUL_ACCESS_TOKEN

// Log environment variables (without exposing sensitive data)
console.log('Contentful Config:', {
  spaceId: spaceId ? `${spaceId.substring(0, 4)}...` : 'NOT SET',
  accessToken: accessToken ? 'SET' : 'NOT SET'
})

if (!spaceId || !accessToken) {
  console.warn('Contentful environment variables are not set. The app will show fallback content.')
}

const contentfulClient = createClient({
  space: spaceId || '',
  accessToken: accessToken || '',
})

export default contentfulClient