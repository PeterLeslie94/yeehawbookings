import logo from './assets/logo.png'
import cowboy from './assets/cowboy.png'

function App() {
  const artists = [
    "Johnny Cash", "Dolly Parton", "Luke Combs", "Morgan Wallen", 
    "Garth Brooks", "Willie Nelson", "Shania Twain", "Chris Stapleton",
    "Lainey Wilson", "Billy Ray Cyrus", "Faith Hill", "Kacey Musgraves", 
    "Zach Bryan"
  ]

  return (
    <div className="min-h-screen bg-gradient-to-b from-country-cream via-country-tan to-country-orange">
      {/* Hero Section */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 opacity-10">
          <img src="/icons/046-tumbleweed.png" className="absolute top-10 left-10 w-16 animate-bounce" alt="" />
          <img src="/icons/001-cactus.png" className="absolute bottom-10 right-10 w-20" alt="" />
          <img src="/icons/013-horseshoe.png" className="absolute top-20 right-20 w-16 animate-pulse" alt="" />
        </div>
        
        <div className="container mx-auto px-4 pt-12 pb-20 text-center relative z-10">
          <img src={logo} alt="Country Days" className="mx-auto mb-8 w-48 md:w-64" />
          
          <h1 className="font-western text-4xl md:text-6xl lg:text-7xl text-country-dark mb-4">
            🤠 COUNTRY DAYS 🌵
          </h1>
          
          <p className="text-xl md:text-2xl font-bebas text-country-brown mb-6">
            The Ultimate Daytime Country Party!
          </p>
          
          <p className="text-lg md:text-xl text-country-dark font-bold mb-8">
            Get your boots on, hats ready, and voices warmed up – it's time to party country-style!
          </p>
          
          <div className="bg-white/80 backdrop-blur rounded-lg shadow-xl p-6 md:p-8 max-w-4xl mx-auto border-4 border-country-brown">
            <p className="text-gray-800 mb-6">
              Join us for <span className="font-bold text-country-orange">Country Days</span>, a one-of-a-kind daytime celebration 
              of modern and classic country music – where Nashville meets nightclub! From <span className="font-bold">live singers</span> and 
              <span className="font-bold"> line dance instructors</span> to <span className="font-bold">top country DJs</span>, 
              themed decor, and exclusive <span className="font-bold">country merch</span>, this is the full Wild West party experience!
            </p>
          </div>
        </div>
      </section>

      {/* What to Expect Section */}
      <section className="py-16 bg-country-dark/10">
        <div className="container mx-auto px-4">
          <h2 className="font-western text-3xl md:text-5xl text-center text-country-dark mb-12">
            🎤 What to Expect
          </h2>
          
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-6xl mx-auto">
            {[
              { icon: "🎶", title: "Nonstop Country Hits", desc: "from Morgan Wallen to Dolly Parton, Luke Combs to Shania Twain" },
              { icon: "👢", title: "Boot Scootin' Line Dancing", desc: "led by pro instructors to keep the floor moving" },
              { icon: "🎧", title: "Top Country DJs", desc: "spinning the biggest anthems from the heart of Tennessee to today's hottest hits" },
              { icon: "🛍️", title: "Country-Themed Merch", desc: "grab your gear and dress the part" },
              { icon: "🌵", title: "Immersive Club Decor", desc: "bringing Southern charm to the dancefloor" },
              { icon: "🎉", title: "Perfect for Parties", desc: "hen dos, birthdays, stag celebrations or just a wild day out with friends" }
            ].map((item, idx) => (
              <div key={idx} className="bg-white rounded-lg shadow-lg p-6 transform hover:scale-105 transition-transform border-2 border-country-orange">
                <div className="text-4xl mb-3">{item.icon}</div>
                <h3 className="font-bebas text-2xl text-country-brown mb-2">{item.title}</h3>
                <p className="text-gray-700">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Artists Section */}
      <section className="py-16 relative">
        <div className="absolute inset-0 opacity-5">
          <img src="/icons/007-hat.png" className="absolute top-10 left-1/4 w-24" alt="" />
          <img src="/icons/020-boot.png" className="absolute bottom-10 right-1/4 w-20" alt="" />
        </div>
        
        <div className="container mx-auto px-4 relative z-10">
          <h2 className="font-western text-3xl md:text-5xl text-center text-country-dark mb-12">
            🎵 Expect to Hear Music From
          </h2>
          
          <div className="bg-white/90 backdrop-blur rounded-xl shadow-2xl p-8 max-w-4xl mx-auto border-4 border-country-brown">
            <div className="flex flex-wrap justify-center gap-3">
              {artists.map((artist, idx) => (
                <span key={idx} className="bg-country-orange text-white px-4 py-2 rounded-full font-bebas text-lg hover:bg-country-brown transition-colors">
                  ⭐ {artist}
                </span>
              ))}
              <span className="bg-country-dark text-white px-4 py-2 rounded-full font-bebas text-lg">
                & many more!
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* Cowboy Section */}
      <section className="py-16 bg-country-dark/10">
        <div className="container mx-auto px-4">
          <div className="flex flex-col md:flex-row items-center justify-center gap-8">
            <img src={cowboy} alt="Cowboy" className="w-48 md:w-64" />
            <div className="text-center md:text-left">
              <p className="text-2xl md:text-3xl font-western text-country-dark mb-4">
                🔞 Ages 18+ Only
              </p>
              <div className="bg-white/80 backdrop-blur rounded-lg p-6 shadow-xl border-4 border-country-orange">
                <p className="text-lg text-gray-800 font-bold">
                  ✨ Country Days is where the drinks flow, the dancefloor fills, and the songs never end. 
                  Whether you're a die-hard country fan or just in it for the good times – 
                  saddle up for the ultimate daytime hoedown!
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-country-dark text-white py-8 text-center">
        <div className="container mx-auto px-4">
          <img src="/icons/050-saloon.png" className="w-16 mx-auto mb-4" alt="" />
          <p className="font-western text-2xl mb-2">COUNTRY DAYS</p>
          <p className="text-country-tan">The Ultimate Daytime Country Party Experience</p>
        </div>
      </footer>
    </div>
  )
}

export default App