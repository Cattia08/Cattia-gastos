
import type { Config } from "tailwindcss";

export default {
	darkMode: "class",
	content: [
		"./pages/**/*.{ts,tsx}",
		"./components/**/*.{ts,tsx}",
		"./app/**/*.{ts,tsx}",
		"./src/**/*.{ts,tsx}",
	],
	prefix: "",
	theme: {
		container: {
			center: true,
			padding: '2rem',
			screens: {
				'2xl': '1400px'
			}
		},
		extend: {
			fontFamily: {
				sans: ['Outfit', 'sans-serif'],
				heading: ['Nunito', 'sans-serif'],
			},
			colors: {
				border: 'hsl(var(--border))',
				input: 'hsl(var(--input))',
				ring: 'hsl(var(--ring))',
				background: 'hsl(var(--background))',
				foreground: 'hsl(var(--foreground))',
				
				// Primary - Rose suave equilibrado
				primary: {
					DEFAULT: 'hsl(var(--primary))',
					hover: '#D66894',
					light: '#F8D7E3',
					foreground: 'hsl(var(--primary-foreground))'
				},
				
				// Secondary - Lavender moderno
				secondary: {
					DEFAULT: 'hsl(var(--secondary))',
					foreground: 'hsl(var(--secondary-foreground))'
				},
				
				// Accent - Verde sage (favorito!)
				accent: {
					DEFAULT: 'hsl(var(--accent))',
					foreground: 'hsl(var(--accent-foreground))'
				},
				
				// Surface
				surface: '#FFFFFF',
				
				// Text
				text: {
					main: '#3D3D3D',
					muted: '#8B8B8B',
				},
				
				// Status
				status: {
					success: '#5DBE8A',
					error: '#E57373',
					warning: '#F5C869',
				},
				
				// Pastel palette - equilibrada con más verde
				pastel: {
					rose: '#F4E0E6',
					green: '#D4EDE1',
					mint: '#E0F2ED',
					sage: '#C8E6D4',
					lavender: '#E8E0F0',
					sky: '#E0EFF7',
					peach: '#FAE8E0',
					cream: '#FDF8F3',
				},
				
				// Theme accents
				theme: {
					rose: '#E879A8',
					green: '#5DBE8A',
					lavender: '#B8A9E8',
					sage: '#7CB899',
				},
				
				destructive: {
					DEFAULT: 'hsl(var(--destructive))',
					foreground: 'hsl(var(--destructive-foreground))'
				},
				muted: {
					DEFAULT: 'hsl(var(--muted))',
					foreground: 'hsl(var(--muted-foreground))'
				},
				popover: {
					DEFAULT: 'hsl(var(--popover))',
					foreground: 'hsl(var(--popover-foreground))'
				},
				card: {
					DEFAULT: 'hsl(var(--card))',
					foreground: 'hsl(var(--card-foreground))'
				},
				sidebar: {
					DEFAULT: 'hsl(var(--sidebar-background))',
					foreground: 'hsl(var(--sidebar-foreground))',
					primary: 'hsl(var(--sidebar-primary))',
					'primary-foreground': 'hsl(var(--sidebar-primary-foreground))',
					accent: 'hsl(var(--sidebar-accent))',
					'accent-foreground': 'hsl(var(--sidebar-accent-foreground))',
					border: 'hsl(var(--sidebar-border))',
					ring: 'hsl(var(--sidebar-ring))'
				}
			},
			borderRadius: {
				lg: 'var(--radius)',
				md: 'calc(var(--radius) - 2px)',
				sm: 'calc(var(--radius) - 4px)',
				xl: '1rem',
				'2xl': '1.5rem',
				'3xl': '2rem'
			},
			boxShadow: {
				'soft': '0 2px 15px -3px rgba(0, 0, 0, 0.04), 0 4px 6px -2px rgba(0, 0, 0, 0.02)',
				'soft-md': '0 4px 25px -5px rgba(0, 0, 0, 0.06), 0 10px 10px -5px rgba(0, 0, 0, 0.02)',
				'soft-lg': '0 10px 40px -10px rgba(0, 0, 0, 0.08)',
				'glow-rose': '0 4px 20px -5px rgba(232, 121, 168, 0.25)',
				'glow-green': '0 4px 20px -5px rgba(93, 190, 138, 0.25)',
				'glow-lavender': '0 4px 20px -5px rgba(184, 169, 232, 0.25)',
				'card': '0 1px 3px rgba(0, 0, 0, 0.04), 0 1px 2px rgba(0, 0, 0, 0.02)',
			},
			backgroundImage: {
				'gradient-rose': 'linear-gradient(135deg, #F8D7E3 0%, #FFFFFF 100%)',
				'gradient-green': 'linear-gradient(135deg, #D4EDE1 0%, #FFFFFF 100%)',
				'gradient-lavender': 'linear-gradient(135deg, #E8E0F0 0%, #FFFFFF 100%)',
				'gradient-soft': 'linear-gradient(180deg, rgba(255,255,255,0) 0%, rgba(255,255,255,0.8) 100%)',
			},
			keyframes: {
				'accordion-down': {
					from: { height: '0' },
					to: { height: 'var(--radix-accordion-content-height)' },
				},
				'accordion-up': {
					from: { height: 'var(--radix-accordion-content-height)' },
					to: { height: '0' },
				},
				'fade-in': {
					'0%': { opacity: '0', transform: 'translateY(8px)' },
					'100%': { opacity: '1', transform: 'translateY(0)' },
				},
				'fade-in-up': {
					'0%': { opacity: '0', transform: 'translateY(16px)' },
					'100%': { opacity: '1', transform: 'translateY(0)' },
				},
				'scale-in': {
					'0%': { opacity: '0', transform: 'scale(0.95)' },
					'100%': { opacity: '1', transform: 'scale(1)' },
				},
				'pulse-soft': {
					'0%, 100%': { opacity: '1' },
					'50%': { opacity: '0.7' },
				},
				'float': {
					'0%, 100%': { transform: 'translateY(0)' },
					'50%': { transform: 'translateY(-6px)' },
				},
				'shimmer': {
					'0%': { backgroundPosition: '-200% 0' },
					'100%': { backgroundPosition: '200% 0' },
				},
			},
			animation: {
				'accordion-down': 'accordion-down 0.2s ease-out',
				'accordion-up': 'accordion-up 0.2s ease-out',
				'fade-in': 'fade-in 0.3s ease-out',
				'fade-in-up': 'fade-in-up 0.4s ease-out',
				'scale-in': 'scale-in 0.2s ease-out',
				'pulse-soft': 'pulse-soft 2s infinite',
				'float': 'float 3s ease-in-out infinite',
				'shimmer': 'shimmer 2s linear infinite',
			}
		}
	},
	plugins: [require("tailwindcss-animate")],
} satisfies Config;
