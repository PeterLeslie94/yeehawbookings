import { useState } from 'react'
import { useContentfulGallery } from '../hooks/useContentful'
import type { Asset } from 'contentful'

export const Gallery = () => {
  const { gallery, loading, error } = useContentfulGallery()
  const [selectedImage, setSelectedImage] = useState<number | null>(null)

  // Fallback gallery images (for when Contentful is not configured)
  const fallbackImages = [
    '/assets/event-image.jpeg',
    '/assets/event-image.jpeg',
    '/assets/event-image.jpeg',
    '/assets/event-image.jpeg',
    '/assets/event-image.jpeg',
    '/assets/event-image.jpeg'
  ]

  const images: Asset[] = gallery?.fields?.images || []
  const displayImages = images.length > 0 ? images : (!loading && !error ? fallbackImages.map((url, index) => ({
    sys: { id: `fallback-${index}` },
    fields: {
      file: { url },
      title: `Country Days Image ${index + 1}`
    }
  } as any)) : [])

  if (loading) {
    return (
      <section className="py-16">
        <div className="container mx-auto px-4">
          <h2 className="font-western text-3xl md:text-5xl text-center text-country-dark mb-12">
            Gallery
          </h2>
          <p className="text-center text-country-dark font-bebas text-2xl">Loading gallery...</p>
        </div>
      </section>
    )
  }

  if (error) {
    return (
      <section className="py-16">
        <div className="container mx-auto px-4">
          <h2 className="font-western text-3xl md:text-5xl text-center text-country-dark mb-12">
            Gallery
          </h2>
          <p className="text-center text-red-600 font-bebas text-2xl">{error}</p>
        </div>
      </section>
    )
  }

  return (
    <>
      <section className="py-16">
        <div className="container mx-auto px-4">
          <h2 className="font-western text-3xl md:text-5xl text-center text-country-dark mb-12">
            Country Days Gallery
          </h2>
          
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 max-w-7xl mx-auto">
            {displayImages.map((image, index) => {
              const imageUrl = image.fields?.file?.url
              const fullImageUrl = imageUrl ? (imageUrl.startsWith('//') ? `https:${imageUrl}` : imageUrl) : '/assets/event-image.jpeg'
              const imageTitle = image.fields?.title || `Image ${index + 1}`
              const imageDescription = image.fields?.description || ''
              
              return (
                <div
                  key={image.sys?.id || index}
                  className="relative aspect-square overflow-hidden rounded-lg border-4 border-country-brown hover:border-country-orange transition-all cursor-pointer transform hover:scale-105"
                  onClick={() => setSelectedImage(index)}
                >
                  <img
                    src={fullImageUrl}
                    alt={imageTitle}
                    className="w-full h-full object-cover"
                    loading="lazy"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent opacity-0 hover:opacity-100 transition-opacity">
                    <div className="absolute bottom-0 left-0 right-0 p-4">
                      <h3 className="font-bebas text-white text-lg">{imageTitle}</h3>
                      {imageDescription && (
                        <p className="text-white/80 text-sm">{imageDescription}</p>
                      )}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
          
          <div className="text-center mt-8">
            <p className="font-bebas text-2xl text-country-dark">
              Join us for the ultimate country party experience!
            </p>
          </div>
        </div>
      </section>

      {/* Lightbox Modal */}
      {selectedImage !== null && (
        <div
          className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-4"
          onClick={() => setSelectedImage(null)}
        >
          <div className="relative max-w-5xl max-h-[90vh]">
            <button
              className="absolute -top-12 right-0 text-white text-4xl font-bebas hover:text-country-orange transition-colors"
              onClick={() => setSelectedImage(null)}
            >
              ×
            </button>
            {displayImages[selectedImage] && (
              <>
                <img
                  src={displayImages[selectedImage].fields?.file?.url 
                    ? (displayImages[selectedImage].fields.file.url.startsWith('//') 
                      ? `https:${displayImages[selectedImage].fields.file.url}` 
                      : displayImages[selectedImage].fields.file.url)
                    : '/assets/event-image.jpeg'}
                  alt={displayImages[selectedImage].fields?.title || `Image ${selectedImage + 1}`}
                  className="max-w-full max-h-[90vh] object-contain rounded-lg"
                />
                <div className="absolute bottom-0 left-0 right-0 bg-black/60 p-4 rounded-b-lg">
                  <h3 className="font-western text-white text-2xl">
                    {displayImages[selectedImage].fields?.title || `Image ${selectedImage + 1}`}
                  </h3>
                  {displayImages[selectedImage].fields?.description && (
                    <p className="text-white/80 mt-2">
                      {displayImages[selectedImage].fields.description}
                    </p>
                  )}
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </>
  )
}