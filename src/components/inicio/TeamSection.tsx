"use client";

import { motion } from "framer-motion";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

const testimonials = [
  {
    name: "Edison Stein",
    role: "CEO & Founder",
    image: "/avatars/e.svg",
    content: "Liderando a visão e o crescimento do negócio.",
  },
  {
    name: "Cezar Augusto",
    role: "Vendedor Ecommerce",
    image: "/avatars/c.svg",
    content: "Foco total na performance de vendas online.",
  },
  {
    name: "Giovanni Motta",
    role: "Vendedor Ecommerce",
    image: "/avatars/g.svg",
    content: "Compromisso na agilização da logística.",
  },
];

const TestimonialsSection = () => {
  return (
    <section className="py-20 overflow-hidden">
      <div className="container mx-auto px-4 text-center">
        {/* Título */}
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-100px" }}
          transition={{ duration: 0.8, ease: "easeOut" }}
          className="mb-16"
        >
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold mb-4">
            Nossa Equipe
          </h2>
          <p className="text-base sm:text-lg text-muted-foreground">
            Pessoas que fazem a diferença todos os dias
          </p>
        </motion.div>

        {/* Cards */}
        <motion.div
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8 justify-items-center"
          initial={{ opacity: 0, x: 100 }}
          whileInView={{ opacity: 1, x: 0 }}
          viewport={{ once: true, margin: "-100px" }}
          transition={{ duration: 1.2, ease: "easeOut" }}
        >
          {testimonials.map((testimonial, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 40 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{
                duration: 0.8,
                ease: "easeOut",
                delay: index * 0.2,
              }}
              className="w-full max-w-xs sm:max-w-sm md:max-w-md p-6 border border-neutral-700 rounded-xl shadow-md text-left bg-neutral-900"
            >
              <div className="flex items-center gap-4 mb-4">
                <Avatar className="h-16 w-16">
                  <AvatarImage src={testimonial.image} alt={testimonial.name} />
                  <AvatarFallback>{testimonial.name[0]}</AvatarFallback>
                </Avatar>
                <div>
                  <h4 className="font-semibold text-white text-base sm:text-lg">
                    {testimonial.name}
                  </h4>
                  <p className="text-sm text-neutral-400">{testimonial.role}</p>
                </div>
              </div>
              <p className="text-sm sm:text-base text-neutral-300 leading-relaxed break-words">
                {testimonial.content}
              </p>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  );
};

export default TestimonialsSection;
