/** @type {import('tailwindcss').Config} */
const config = {
  darkMode: ["class"],
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./content/**/*.{md,mdx}",
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        background: "var(--background)",
        foreground: "var(--foreground)",

        muted: "var(--muted)",
        "muted-foreground": "var(--muted-foreground)",

        card: "var(--card)",
        popover: "var(--popover)",

        border: "var(--border)",
        input: "var(--input)",
        ring: "var(--ring)",

        primary: "var(--primary)",
        "primary-foreground": "var(--primary-foreground)",

        secondary: "var(--secondary)",
        "secondary-foreground": "var(--secondary-foreground)",

        accent: "var(--accent)",
        "accent-foreground": "var(--accent-foreground)",

        destructive: "var(--destructive)",
        "destructive-foreground": "var(--destructive-foreground)",
      },
      borderRadius: {
        lg: "var(--radius)",
        xl: "calc(var(--radius) + 4px)",
        "2xl": "calc(var(--radius) + 10px)",
      },
      boxShadow: {
        glow: "0 10px 30px -12px rgba(0,0,0,0.6), 0 0 40px -10px color-mix(in srgb, var(--primary) 35%, transparent)",
      },
      container: {
        center: true,
        padding: {
          DEFAULT: "1.5rem",
          lg: "2rem",
        },
      },
      keyframes: {
        // Fade suave
        "fade-in": {
          "0%": { opacity: "0", transform: "translateY(6px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        "slide-up": {
          "0%": { opacity: "0", transform: "translateY(14px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        "fade-in-down": {
          "0%": { opacity: "0", transform: "translateY(-12px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },

        // 🔹 Entrar → ArrowRight desliza lateral
        "fade-out-in-x": {
          "0%, 100%": { opacity: "1", transform: "translateX(0)" },
          "50%": { opacity: "0", transform: "translateX(8px)" },
        },

        // 🔹 Criar conta → ArrowUpRight sobe e some
        "fade-out-in-y": {
          "0%, 100%": { opacity: "1", transform: "translateY(0)" },
          "50%": { opacity: "0", transform: "translateY(-8px)" },
        },

        // 🔹 Brilho dos pontinhos
        twinkle: {
          "0%, 100%": { opacity: "0.2", transform: "scale(1)" },
          "50%": { opacity: "1", transform: "scale(1.3)" },
        },

        // 🔹 Movimento leve (parallax/flutuação)
        floaty: {
          "0%": { transform: "translate(0,0)" },
          "25%": { transform: "translate(5px,-10px)" },
          "50%": { transform: "translate(-8px,5px)" },
          "75%": { transform: "translate(6px,10px)" },
          "100%": { transform: "translate(0,0)" },
        },
      },
      animation: {
        "fade-in": "fade-in .5s ease-out both",
        "slide-up": "slide-up .6s cubic-bezier(.2,.7,.2,1) both",
        "fade-in-down": "fade-in-down .6s ease-out both",

        // Ícones
        "fade-out-in-x": "fade-out-in-x 1.5s ease-in-out",
        "fade-out-in-y": "fade-out-in-y 1.5s ease-in-out",

        // Partículas
        twinkle: "twinkle 4s infinite ease-in-out",
        floaty: "floaty 12s infinite ease-in-out",
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
};

export default config;
