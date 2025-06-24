import logo from './assets/logo-optimized.png'
import backgroundTexture from './assets/background-paper.webp'
import pinkHat from './assets/cowboyhat-optimized.png'
import sheriffBadge from './assets/sheriff-optimized.png'
import eventImage from './assets/event-image.jpeg'
import { useState, useMemo } from 'react'
import { useContentfulEvents } from './hooks/useContentful'
import { toZonedTime } from 'date-fns-tz'
import { endOfDay, isAfter } from 'date-fns'
import { Testimonials } from './components/Testimonials'
import { Gallery } from './components/Gallery'

function App() {
  const [selectedCity, setSelectedCity] = useState('All Cities')
  
  const artists = [
    "Johnny Cash", "Dolly Parton", "Luke Combs", "Morgan Wallen", 
    "Garth Brooks", "Willie Nelson", "Shania Twain", "Chris Stapleton",
    "Lainey Wilson", "Billy Ray Cyrus", "Faith Hill", "Kacey Musgraves", 
    "Zach Bryan"
  ]

  const cities = ['All Cities', 'Aberdeen', 'Dundee', 'Edinburgh', 'Glasgow', 'Paisley']
  
  const cityColors: Record<string, string> = {
    'Aberdeen': 'bg-red-600',
    'Dundee': 'bg-blue-600',
    'Edinburgh': 'bg-purple-600',
    'Glasgow': 'bg-green-600',
    'Paisley': 'bg-yellow-600'
  }
  
  // Fetch events from Contentful
  const { events: contentfulEvents, loading, error } = useContentfulEvents()
  
  // Map of cities to their venues
  // Map cities to venues - handle case variations
  const cityVenueMap: Record<string, string> = {
    'aberdeen': 'Aura, Aberdeen',
    'dundee': 'Fat Sams, Dundee',
    'edinburgh': 'Club Tropicana, Edinburgh',
    'glasgow': 'Club Tropicana, Glasgow',
    'paisley': 'Viennas, Paisley'
  }
  
  // Fallback events for when Contentful is not available
  const fallbackEvents = [
    {
      id: '1',
      title: 'Country Days Glasgow',
      date: new Date('2025-02-15T14:30:00'),
      city: 'Glasgow',
      venue: 'Club Tropicana, Glasgow',
      skiddleUrl: '',
      image: eventImage
    },
    {
      id: '2',
      title: 'Country Days Edinburgh',
      date: new Date('2025-02-22T14:30:00'),
      city: 'Edinburgh',
      venue: 'Club Tropicana, Edinburgh',
      skiddleUrl: '',
      image: eventImage
    },
    {
      id: '3',
      title: 'Country Days Aberdeen',
      date: new Date('2025-03-01T14:30:00'),
      city: 'Aberdeen',
      venue: 'Aura, Aberdeen',
      skiddleUrl: '',
      image: eventImage
    },
    {
      id: '4',
      title: 'Country Days Dundee',
      date: new Date('2025-03-08T14:30:00'),
      city: 'Dundee',
      venue: 'Fat Sams, Dundee',
      skiddleUrl: '',
      image: eventImage
    }
  ]
  
  // Transform Contentful data to match our component structure
  const allEvents = contentfulEvents.length > 0 ? contentfulEvents.map(event => {
    // Normalize city name - handle case sensitivity and whitespace
    const rawCity = event.fields.city || ''
    const city = rawCity.trim()
    // Look up venue using lowercase city name
    const venue = city ? (cityVenueMap[city.toLowerCase()] || 'Venue TBA') : 'Venue TBA'
    
    return {
      id: event.sys.id,
      title: event.fields.title || 'Country Days Event',
      date: new Date(event.fields.date),
      city: city, // Keep original case for display
      venue: venue,
      skiddleUrl: event.fields.skiddleUrl || '',
      image: event.fields.image?.fields?.file?.url 
        ? `https:${event.fields.image.fields.file.url}` 
        : eventImage // Fallback to default image
    }
  }) : (!loading && !error ? fallbackEvents : [])

  // Filter out past events based on UK timezone
  const events = useMemo(() => {
    const ukTimeZone = 'Europe/London'
    const now = new Date()
    const nowInUK = toZonedTime(now, ukTimeZone)
    
    return allEvents.filter(event => {
      // Convert event date to UK timezone
      const eventDateInUK = toZonedTime(event.date, ukTimeZone)
      // Get end of day for the event in UK timezone
      const eventEndOfDayInUK = endOfDay(eventDateInUK)
      // Check if current UK time is after the end of the event day
      return !isAfter(nowInUK, eventEndOfDayInUK)
    })
  }, [allEvents])

  const filteredEvents = selectedCity === 'All Cities' 
    ? events 
    : events.filter(event => {
      // Case-insensitive comparison for filtering
      return event.city && event.city.toLowerCase() === selectedCity.toLowerCase()
    })

  return (
    <div className="min-h-screen relative">
      {/* Background with texture and gradient overlay */}
      <div 
        className="absolute inset-0 z-0"
        style={{
          backgroundImage: `url(${backgroundTexture})`,
          backgroundSize: 'cover',
          backgroundPosition: 'center'
        }}
      />
      <div className="absolute inset-0 z-0 bg-gradient-to-b from-country-cream/75 via-country-tan/70 via-country-orange/75 to-country-brown/80" />
      
      <div className="relative z-10">
      {/* Hero Section */}
      <section className="relative overflow-hidden">
        
        <div className="container mx-auto px-4 pt-12 pb-8 text-center relative z-10">
          <img src={logo} alt="Country Days" className="mx-auto mb-1 w-64 md:w-80 lg:w-96" />
          
          <div className="relative inline-block mb-4">
            <h1 className="font-western text-4xl md:text-6xl lg:text-7xl text-country-dark">
              COUNTRY DAYS
            </h1>
            <img 
              src={pinkHat} 
              alt="" 
              className="absolute w-10 md:w-16 lg:w-20 -top-3 md:-top-4 lg:-top-5 -left-[5%] md:-left-[4%] animate-cowboy-nod"
            />
          </div>
          
          <p className="text-xl md:text-2xl font-bebas text-country-brown mb-3">
            The Ultimate Daytime Country Party!
          </p>
          
          <p className="text-lg md:text-xl text-country-dark font-bold mb-6">
            Get your boots on, hats ready, and voices warmed up – it's time to party country-style!
          </p>
        </div>
      </section>

      {/* Events Section */}
      <section className="py-8">
        <div className="container mx-auto px-4">
          <h2 className="font-western text-3xl md:text-5xl text-center text-country-dark mb-12">
            Upcoming Events
          </h2>
          
          {/* City Filter */}
          <div className="flex flex-wrap justify-center gap-3 mb-12">
            <span className="text-country-dark font-bebas text-xl mr-4 self-center">City:</span>
            {cities.map((city) => (
              <button
                key={city}
                onClick={() => setSelectedCity(city)}
                className={`px-6 py-3 rounded-full font-bebas text-lg transition-all ${
                  selectedCity === city
                    ? 'bg-country-orange text-white'
                    : 'bg-white/20 text-country-dark border-2 border-country-dark/30 hover:bg-white/30'
                }`}
              >
                {city}
              </button>
            ))}
          </div>

          {/* Events Grid */}
          {loading && (
            <div className="text-center py-12">
              <p className="text-country-dark font-bebas text-2xl">Loading events...</p>
            </div>
          )}
          
          {error && (
            <div className="text-center py-12">
              <p className="text-red-600 font-bebas text-2xl">{error}</p>
            </div>
          )}
          
          {!loading && !error && filteredEvents.length === 0 && (
            <div className="text-center py-12">
              <p className="text-country-dark font-bebas text-2xl">No events found</p>
            </div>
          )}
          
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-6xl mx-auto">
            {filteredEvents.map((event) => (
              <div key={event.id} className="bg-white/90 backdrop-blur rounded-lg overflow-hidden shadow-xl border-4 border-country-brown hover:transform hover:scale-105 transition-transform">
                <div className="relative aspect-square">
                  <img src={event.image} alt={event.title} className="w-full h-full object-cover" loading="lazy" />
                  {event.city && (
                    <div className={`absolute top-4 right-4 ${cityColors[event.city] || 'bg-gray-600'} text-white px-3 py-1 rounded-full font-bebas text-sm`}>
                      {event.city.toUpperCase()}
                    </div>
                  )}
                </div>
                <div className="p-6">
                  <h3 className="font-western text-xl text-country-dark mb-3">
                    {event.title}
                  </h3>
                  <div className="space-y-2 text-gray-700 mb-4">
                    <p className="flex items-center gap-2">
                      <img src="/icons/013-horseshoe.png" className="w-4 h-4" alt="" />
                      {event.date.toLocaleDateString('en-GB', { 
                        weekday: 'long', 
                        day: 'numeric', 
                        month: 'long', 
                        year: 'numeric' 
                      })}
                    </p>
                    <p className="flex items-center gap-2">
                      <img src="/icons/050-saloon.png" className="w-4 h-4" alt="" />
                      {event.venue}
                    </p>
                    <p className="flex items-center gap-2">
                      <img src={sheriffBadge} className="w-4 h-4" alt="" />
                      2:30 PM - 7:30 PM
                    </p>
                  </div>
                  <button 
                    onClick={() => event.skiddleUrl && window.open(event.skiddleUrl, '_blank')}
                    className="w-full bg-country-orange hover:bg-country-brown text-white font-western py-3 px-4 rounded transition-colors text-lg disabled:opacity-50 disabled:cursor-not-allowed"
                    disabled={!event.skiddleUrl}
                  >
                    {event.skiddleUrl ? 'Get Tickets' : 'Coming Soon'}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Gallery Section */}
      <Gallery />

      {/* What to Expect Section */}
      <section className="py-16">
        <div className="container mx-auto px-4">
          <h2 className="font-western text-3xl md:text-5xl text-center text-country-dark mb-12">
            What to Expect
          </h2>
          
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-6xl mx-auto">
            {[
              { icon: "/icons/007-hat.png", title: "Nonstop Country Hits", desc: "From Morgan Wallen to Dolly Parton, Luke Combs to Shania Twain" },
              { icon: "/icons/020-boot.png", title: "Boot Scootin' Line Dancing", desc: "Led by pro instructors to keep the floor moving" },
              { icon: "/icons/033-whiskey.png", title: "Top Country DJs", desc: "Spinning the biggest anthems from the heart of Tennessee to today's hottest hits" },
              { icon: "/icons/044-poncho.png", title: "Country-Themed Merch", desc: "Grab your gear and dress the part" },
              { icon: "/icons/001-cactus.png", title: "Immersive Club Decor", desc: "Bringing Southern charm to the dancefloor" },
              { icon: "/icons/013-horseshoe.png", title: "Perfect for Parties", desc: "Hen dos, birthdays, stag celebrations or just a wild day out with friends" }
            ].map((item, idx) => (
              <div key={idx} className="bg-white rounded-lg shadow-lg p-6 transform hover:scale-105 transition-transform border-2 border-country-orange">
                <img src={item.icon} alt="" className="w-12 h-12 mb-3" />
                <h3 className="font-bebas text-2xl text-country-brown mb-2">{item.title}</h3>
                <p className="text-gray-700">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Artists Section */}
      <section className="py-16">
        <div className="container mx-auto px-4">
          <h2 className="font-western text-3xl md:text-5xl text-center text-country-dark mb-12">
            Expect to Hear Music From
          </h2>
          
          <div className="bg-white/90 backdrop-blur rounded-xl shadow-2xl p-8 max-w-4xl mx-auto border-4 border-country-brown">
            <div className="flex flex-wrap justify-center gap-3">
              {artists.map((artist, idx) => (
                <span key={idx} className="bg-country-orange text-white px-4 py-2 rounded-full font-bebas text-lg hover:bg-country-brown transition-colors flex items-center gap-2 inline-flex">
                  <img src={sheriffBadge} alt="" className="w-4 h-4" />
                  {artist}
                </span>
              ))}
              <span className="bg-country-dark text-white px-4 py-2 rounded-full font-bebas text-lg">
                & many more!
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* Testimonials Section */}
      <Testimonials />

      {/* FAQ Section */}
      <section className="py-16">
        <div className="container mx-auto px-4">
          <h2 className="font-western text-3xl md:text-5xl text-center text-country-dark mb-12">
            FAQ'S
          </h2>
          
          <div className="bg-white/90 backdrop-blur rounded-xl shadow-2xl p-8 max-w-4xl mx-auto border-4 border-country-brown">
            <div className="space-y-6">
              {[
                {
                  question: "Why do the tickets come in different price tiers?",
                  answer: "Whilst there is no physical difference. There is only a limited amount of tickets we can sell. Therefore we operate a festival style ticketing model. The earlier you buy your ticket the cheaper it will be."
                },
                {
                  question: "Do you do group discount? Stag/Hen etc",
                  answer: "Yes, we offer a discounted ticket price for groups of 10 or more. These tickets can be found listed as the \"Big Group Package!\" above, orders for these tickets are restricted to a minimum of 10."
                },
                {
                  question: "Will there be more tickets available if the event is sold out?",
                  answer: "Once this event is sold out, there will not be any additional tickets released. In addition to this we will be unable to sell them at the door due to maximum capacity and health and safety regulations."
                },
                {
                  question: "Is the venue accessible?",
                  answer: "Our events take place at a variety of locations across the UK and Ireland. As each varies please ensure to check the specific venue's website for accessibility information."
                },
                {
                  question: "Can I resell my tickets?",
                  answer: "Yes, if you are unable to attend an event you are welcome to sell your tickets on. We do not use names on tickets as a condition for entry."
                },
                {
                  question: "Are your events 18+?",
                  answer: "All of our events are strictly 18+. A valid photographic ID may be requested on entry."
                },
                {
                  question: "What do I do if I cant find my tickets or confirmation email?",
                  answer: "You can email us at info@daytimediscoevents.co.uk with the full name you used when purchasing the tickets and proof of payment. We will then send you a copy of your tickets"
                },
                {
                  question: "Are there tickets available on the door?",
                  answer: "We always recommend booking in advance as we cannot guarantee on the door entry. However, in certain instances there will be a limited number of tickets on a first come first served basis for sale on the door."
                },
                {
                  question: "I have more questions?",
                  answer: "If you have additional questions and wish to contact us directly, don't hesitate to drop us a DM on either Facebook (Daytime Disco) or Instagram (@daytimediscoevents)"
                }
              ].map((faq, idx) => (
                <div key={idx} className="border-b border-country-tan/30 last:border-b-0 pb-4 last:pb-0">
                  <h3 className="font-bebas text-xl text-country-dark mb-2 flex items-start gap-2">
                    <span className="text-2xl">🗣️</span>
                    <span>{faq.question}</span>
                  </h3>
                  <p className="text-gray-700 ml-8">{faq.answer}</p>
                </div>
              ))}
              
              <div className="mt-8 pt-6 border-t border-country-tan/30">
                <h3 className="font-bebas text-xl text-country-dark mb-2">Refund Policy:</h3>
                <p className="text-gray-700">
                  In-line with normal consumer standards for ticket purchases, tickets for Daytime Disco events are non-refundable, on the condition that we not moved the event or canceled it. If you are no longer be able to attend the event, you are of course welcome to gift or sell your tickets onwards as we do not use names on the tickets as a condition of entry.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Bottom Section */}
      <section className="py-16">
        <div className="container mx-auto px-4 text-center">
          <img src={logo} alt="Country Days" className="w-48 md:w-64 mx-auto mb-6" loading="lazy" />
          <p className="text-lg text-white font-bold max-w-3xl mx-auto mb-6">
            Country Days is where the drinks flow, the dancefloor fills, and the songs never end. 
            Whether you're a die-hard country fan or just in it for the good times – 
            saddle up for the ultimate daytime hoedown!
          </p>
          <p className="text-2xl md:text-3xl font-western text-white">
            Ages 18+ Only
          </p>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-8 text-center">
        <div className="container mx-auto px-4">
          <p className="font-western text-2xl mb-2 text-white">COUNTRY DAYS</p>
          <p className="text-country-cream mb-4">The Ultimate Daytime Country Party Experience</p>
          <p className="text-country-cream mb-4">Part Of Discoday Events</p>
          <div className="space-y-2 mb-6">
            <p className="text-country-cream">
              Visit us at{' '}
              <a href="https://www.discodaysevents.co.uk/" target="_blank" rel="noopener noreferrer" className="text-country-orange hover:text-white transition-colors underline">
                www.discodaysevents.co.uk
              </a>
            </p>
            <p className="text-country-cream">
              For more information on Disco Days events, contact us through our website
            </p>
          </div>
          <p className="text-country-cream/60 text-sm">
            Copyright © 2025 discodaysevents.co.uk
          </p>
        </div>
      </footer>
      </div>
    </div>
  )
}

export default App