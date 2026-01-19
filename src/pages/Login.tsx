import { useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Eye, EyeOff, LogIn, Loader2, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";

const loginSchema = z.object({
    email: z.string().email("Ingresa un email válido"),
    password: z.string().min(1, "La contraseña es requerida"),
});

type LoginFormData = z.infer<typeof loginSchema>;

export default function Login() {
    const [showPassword, setShowPassword] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [rememberMe, setRememberMe] = useState(false);

    const { signIn, user } = useAuth();
    const navigate = useNavigate();
    const location = useLocation();
    const { toast } = useToast();

    const from = location.state?.from?.pathname || "/";

    // Redirect if already logged in
    if (user) {
        navigate(from, { replace: true });
        return null;
    }

    const {
        register,
        handleSubmit,
        formState: { errors },
    } = useForm<LoginFormData>({
        resolver: zodResolver(loginSchema),
    });

    const onSubmit = async (data: LoginFormData) => {
        setIsLoading(true);
        const { error } = await signIn(data.email, data.password);

        if (error) {
            toast({
                variant: "destructive",
                title: "Error al iniciar sesión",
                description: error.message === "Invalid login credentials"
                    ? "Email o contraseña incorrectos"
                    : error.message,
            });
            setIsLoading(false);
        } else {
            toast({
                title: "¡Bienvenido! 🎉",
                description: "Has iniciado sesión correctamente",
            });
            navigate(from, { replace: true });
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden">
            {/* Animated gradient background */}
            <div className="absolute inset-0 bg-gradient-to-br from-slate-900 via-purple-950 to-slate-900" />

            {/* Floating orbs */}
            <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-pink-500/20 rounded-full blur-3xl animate-pulse" />
            <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-emerald-500/20 rounded-full blur-3xl animate-pulse delay-1000" />
            <div className="absolute top-1/2 right-1/3 w-64 h-64 bg-violet-500/20 rounded-full blur-3xl animate-pulse delay-500" />

            {/* Glass card */}
            <div className="relative w-full max-w-md">
                <div className="backdrop-blur-xl bg-white/10 rounded-3xl border border-white/20 shadow-2xl p-8 space-y-8">
                    {/* Header */}
                    <div className="text-center space-y-3">
                        <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-pink-500 to-violet-600 shadow-lg shadow-pink-500/30 mb-2">
                            <Sparkles className="w-8 h-8 text-white" />
                        </div>
                        <h1 className="text-3xl font-bold text-white tracking-tight">
                            Cattia Gastos
                        </h1>
                        <p className="text-white/60 text-sm">
                            Inicia sesión para continuar
                        </p>
                    </div>

                    {/* Form */}
                    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
                        {/* Email field */}
                        <div className="space-y-2">
                            <Label htmlFor="email" className="text-white/80 text-sm font-medium">
                                Email
                            </Label>
                            <div className="relative">
                                <Input
                                    id="email"
                                    type="email"
                                    placeholder="tu@email.com"
                                    autoComplete="email"
                                    className="h-12 bg-white/10 border-white/20 text-white placeholder:text-white/40 rounded-xl focus:border-pink-400 focus:ring-pink-400/30 transition-all"
                                    {...register("email")}
                                />
                            </div>
                            {errors.email && (
                                <p className="text-red-400 text-xs mt-1">{errors.email.message}</p>
                            )}
                        </div>

                        {/* Password field */}
                        <div className="space-y-2">
                            <Label htmlFor="password" className="text-white/80 text-sm font-medium">
                                Contraseña
                            </Label>
                            <div className="relative">
                                <Input
                                    id="password"
                                    type={showPassword ? "text" : "password"}
                                    placeholder="••••••••"
                                    autoComplete="current-password"
                                    className="h-12 bg-white/10 border-white/20 text-white placeholder:text-white/40 rounded-xl pr-12 focus:border-pink-400 focus:ring-pink-400/30 transition-all"
                                    {...register("password")}
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPassword(!showPassword)}
                                    className="absolute right-4 top-1/2 -translate-y-1/2 text-white/50 hover:text-white transition-colors"
                                >
                                    {showPassword ? (
                                        <EyeOff className="h-5 w-5" />
                                    ) : (
                                        <Eye className="h-5 w-5" />
                                    )}
                                </button>
                            </div>
                            {errors.password && (
                                <p className="text-red-400 text-xs mt-1">{errors.password.message}</p>
                            )}
                        </div>

                        {/* Remember me & Forgot password */}
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <Checkbox
                                    id="remember"
                                    checked={rememberMe}
                                    onCheckedChange={(checked) => setRememberMe(checked as boolean)}
                                    className="border-white/30 data-[state=checked]:bg-pink-500 data-[state=checked]:border-pink-500"
                                />
                                <label
                                    htmlFor="remember"
                                    className="text-sm text-white/60 cursor-pointer select-none"
                                >
                                    Recordarme
                                </label>
                            </div>
                            <button
                                type="button"
                                className="text-sm text-pink-400 hover:text-pink-300 transition-colors"
                                onClick={() => {
                                    toast({
                                        title: "Próximamente",
                                        description: "Esta función estará disponible pronto",
                                    });
                                }}
                            >
                                ¿Olvidaste tu contraseña?
                            </button>
                        </div>

                        {/* Submit button */}
                        <Button
                            type="submit"
                            disabled={isLoading}
                            className="w-full h-12 rounded-xl bg-gradient-to-r from-pink-500 to-violet-600 hover:from-pink-600 hover:to-violet-700 text-white font-semibold shadow-lg shadow-pink-500/30 hover:shadow-pink-500/40 transition-all duration-300 disabled:opacity-70"
                        >
                            {isLoading ? (
                                <Loader2 className="h-5 w-5 animate-spin" />
                            ) : (
                                <>
                                    <LogIn className="h-5 w-5 mr-2" />
                                    Iniciar Sesión
                                </>
                            )}
                        </Button>
                    </form>

                    {/* Footer */}
                    <div className="text-center">
                        <p className="text-white/40 text-xs">
                            Hecho con 💚 para ti
                        </p>
                    </div>
                </div>

                {/* Decorative glow */}
                <div className="absolute -inset-1 bg-gradient-to-r from-pink-500/20 via-violet-500/20 to-emerald-500/20 rounded-3xl blur-xl -z-10" />
            </div>
        </div>
    );
}
