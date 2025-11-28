import React from 'react';

const testimonials = [
  {
    name: 'Sarah Johnson',
    role: 'Homeowner',
    content: 'The process was incredibly smooth. I got my home loan approved in record time!',
    image: 'https://via.placeholder.com/100?text=Sarah',
  },
  {
    name: 'Michael Chen',
    role: 'Small Business Owner',
    content: 'Their business loan helped me expand my operations when I needed it most.',
    image: 'https://via.placeholder.com/100?text=Michael',
  },
  {
    name: 'Emily Davis',
    role: 'Freelancer',
    content: 'Friendly staff and great rates. I highly recommend them for personal loans.',
    image: 'https://via.placeholder.com/100?text=Emily',
  },
];

const Testimonials: React.FC = () => {
  return (
    <section className="py-16 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-extrabold text-gray-900 sm:text-4xl">
            What Our Clients Say
          </h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {testimonials.map((testimonial, index) => (
            <div key={index} className="bg-gray-50 p-8 rounded-xl shadow-sm border border-gray-100">
              <div className="flex items-center mb-4">
                <img
                  className="h-12 w-12 rounded-full object-cover mr-4"
                  src={testimonial.image}
                  alt={testimonial.name}
                />
                <div>
                  <h4 className="text-lg font-bold text-gray-900">{testimonial.name}</h4>
                  <p className="text-sm text-gray-500">{testimonial.role}</p>
                </div>
              </div>
              <p className="text-gray-600 italic">"{testimonial.content}"</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default Testimonials;
