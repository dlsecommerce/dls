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
  {
    name: "Bernardo Prado",
    role: "Vendedor Ecommerce",
    image: "/avatars/b.svg",
    content: "Otimização de anúncios para maximizar resultados.",
  },
];

const TestimonialsSection = () => {
  return (
    <section className="overflow-hidden py-14 sm:py-20">
      <div className="container mx-auto px-4 text-center">
        {/* Título */}
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-100px" }}
          transition={{ duration: 0.8, ease: "easeOut" }}
          className="mb-12 sm:mb-16"
        >
          <h2 className="mb-3 text-2xl font-bold sm:mb-4 sm:text-4xl md:text-5xl">
            Nossa Equipe
          </h2>

          <p className="text-sm text-muted-foreground sm:text-lg">
            Pessoas que fazem a diferença todos os dias
          </p>
        </motion.div>

        {/* Cards */}
        <motion.div
          className="grid grid-cols-1 gap-5 justify-items-center sm:grid-cols-2 sm:gap-8 lg:grid-cols-3"
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
              className="w-full max-w-[320px] p-5 border border-neutral-700 rounded-xl shadow-md text-left bg-neutral-900 sm:max-w-sm md:max-w-md sm:p-6"
            >
              <div className="mb-4 flex items-center gap-3 sm:gap-4">
                <Avatar className="h-14 w-14 sm:h-16 sm:w-16">
                  <AvatarImage src={testimonial.image} alt={testimonial.name} />
                  <AvatarFallback>{testimonial.name[0]}</AvatarFallback>
                </Avatar>

                <div>
                  <h4 className="text-base font-semibold text-white sm:text-lg">
                    {testimonial.name}
                  </h4>

                  <p className="text-xs text-neutral-400 sm:text-sm">
                    {testimonial.role}
                  </p>
                </div>
              </div>

              <p className="text-sm leading-6 text-neutral-300 break-words sm:text-base">
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