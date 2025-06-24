export const Testimonials = () => {
  const testimonials = [
    {
      id: 1,
      text: "Had a Rootin' Tootin' hoot of a day!",
      rating: 5
    },
    {
      id: 2,
      text: "Great day out with friends, met loads of lovely people too! Music and atmosphere was brilliant",
      rating: 5
    },
    {
      id: 3,
      text: "I Had a great day and met some really nice people",
      rating: 5
    },
    {
      id: 4,
      text: "Love every little thing about this venture so much so that ive bought tickets for the next two up and coming events in August nd September",
      rating: 5
    },
    {
      id: 5,
      text: "Fab fab day. Had the best time in a long time. Going to book again.",
      rating: 5
    },
    {
      id: 6,
      text: "The live singer was brilliant!!",
      rating: 5
    },
    {
      id: 7,
      text: "It was brilliant",
      rating: 5
    },
    {
      id: 8,
      text: "The line dancing staff were fabulous!!!",
      rating: 5
    }
  ]

  return (
    <section className="py-16">
      <div className="container mx-auto px-4">
        <h2 className="font-western text-3xl md:text-5xl text-center text-country-dark mb-12">
          What Our Partners Say
        </h2>
        
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 max-w-7xl mx-auto">
          {testimonials.map((testimonial) => (
            <div 
              key={testimonial.id} 
              className="bg-white/90 backdrop-blur rounded-lg shadow-xl p-6 border-4 border-country-orange hover:transform hover:scale-105 transition-all relative"
            >
              <div className="absolute -top-3 -left-3">
                <img 
                  src="/icons/013-horseshoe.png" 
                  alt="" 
                  className="w-8 h-8 transform -rotate-12"
                />
              </div>
              
              <div className="mb-3">
                {[...Array(testimonial.rating)].map((_, i) => (
                  <span key={i} className="text-2xl">⭐</span>
                ))}
              </div>
              
              <p className="text-gray-700 italic mb-4">
                "{testimonial.text}"
              </p>
              
              <div className="text-right">
                <span className="font-bebas text-country-orange text-lg">
                  - Happy Partner
                </span>
              </div>
            </div>
          ))}
        </div>
        
        <div className="text-center mt-12">
          <p className="font-bebas text-2xl text-country-dark">
            Join thousands of country music lovers at our next event!
          </p>
        </div>
      </div>
    </section>
  )
}