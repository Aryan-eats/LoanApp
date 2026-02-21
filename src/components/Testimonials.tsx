import React from 'react';
import { Star, Quote } from 'lucide-react';
import { motion } from 'framer-motion';

const testimonials = [
  {
    name: 'Sarah Johnson',
    role: 'Homeowner',
    content: 'The process was incredibly smooth. I got my home loan approved in record time with zero hidden charges!',
    image: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?ixlib=rb-1.2.1&auto=format&fit=facearea&facepad=2&w=256&h=256&q=80',
    rating: 5,
  },
  {
    name: 'Michael Chen',
    role: 'Small Business Owner',
    content: 'Their business loan helped me expand my operations when I needed it most. The DSA agent was very transparent.',
    image: 'https://images.unsplash.com/photo-1519244703995-f4e0f30006d5?ixlib=rb-1.2.1&auto=format&fit=facearea&facepad=2&w=256&h=256&q=80',
    rating: 5,
  },
  {
    name: 'Emily Davis',
    role: 'Freelancer',
    content: 'Friendly staff and great rates. I highly recommend them for personal loans over other aggressive apps.',
    image: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?ixlib=rb-1.2.1&auto=format&fit=facearea&facepad=2&w=256&h=256&q=80',
    rating: 4,
  },
];

const Testimonials: React.FC = () => {
  return (
    <section className="py-24 bg-white relative overflow-hidden">
       {/* Decorative Elements */}
       <div className="absolute top-0 right-0 -mt-20 -mr-20 w-80 h-80 bg-emerald-50 rounded-full blur-3xl opacity-50 pointer-events-none" />
       
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-50px" }}
          transition={{ duration: 0.6 }}
          className="text-center mb-16"
        >
          <h2 className="text-3xl font-extrabold text-[#0A2540] sm:text-4xl tracking-tight">
            Trusted by Thousands of Indians
          </h2>
          <p className="mt-4 text-xl text-gray-600 max-w-2xl mx-auto">
             Don't just take our word for it. Here's what our customers have to say about their financing journey.
          </p>
        </motion.div>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {testimonials.map((testimonial, index) => (
            <div key={index} className="bg-white p-8 rounded-2xl shadow-[0_4px_20px_-4px_rgba(0,0,0,0.05)] border border-gray-100 hover:shadow-[0_8px_30px_-4px_rgba(0,0,0,0.1)] transition-all duration-300 relative">
              <Quote className="absolute top-6 right-6 w-10 h-10 text-emerald-100" />
              
              <div className="flex gap-1 mb-6">
                {[...Array(testimonial.rating)].map((_, i) => (
                  <Star key={i} className="w-5 h-5 fill-amber-400 text-amber-400" />
                ))}
                {[...Array(5 - testimonial.rating)].map((_, i) => (
                  <Star key={i + testimonial.rating} className="w-5 h-5 text-gray-200 fill-gray-200" />
                ))}
              </div>
              
              <p className="text-gray-700 leading-relaxed mb-8 relative z-10 font-medium whitespace-pre-line">
                "{testimonial.content}"
              </p>
              
              <div className="flex items-center gap-4 mt-auto">
                <img
                  className="h-14 w-14 rounded-full object-cover border-2 border-emerald-50"
                  src={testimonial.image}
                  alt={testimonial.name}
                  loading="lazy"
                />
                <div>
                  <h4 className="text-base font-bold text-[#0A2540]">{testimonial.name}</h4>
                  <p className="text-sm text-emerald-600 font-medium">{testimonial.role}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default Testimonials;
