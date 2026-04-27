import { useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Eye, EyeOff, LogIn, Loader2, Heart } from "lucide-react";
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
                title: "¡Hola de nuevo!",
                description: "Sesión iniciada correctamente",
            });
            navigate(from, { replace: true });
        }
    };

    return (
        <div className="min-h-screen bg-background flex items-center justify-center p-4 relative overflow-hidden">
            {/* Soft rose wash — same hue family as app, no glass, no cyber */}
            <div
                aria-hidden="true"
                className="absolute -top-32 -left-32 w-[28rem] h-[28rem] rounded-full bg-primary/15 blur-3xl"
            />
            <div
                aria-hidden="true"
                className="absolute -bottom-40 -right-32 w-[32rem] h-[32rem] rounded-full bg-secondary/40 blur-3xl"
            />

            <div className="relative w-full max-w-md">
                <div className="bg-card rounded-3xl border border-border shadow-soft-lg p-8 md:p-10 space-y-8">
                    {/* Header — personal, not template */}
                    <div className="space-y-3">
                        <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-primary/10 ring-1 ring-primary/20">
                            <Heart className="w-6 h-6 text-primary" fill="currentColor" />
                        </div>
                        <h1 className="font-heading text-3xl font-bold tracking-tight text-text-emphasis">
                            Cattia Gastos
                        </h1>
                        <p className="text-sm text-text-secondary">
                            Tus finanzas, tu ritmo. Bienvenida de vuelta.
                        </p>
                    </div>

                    <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
                        <div className="space-y-2">
                            <Label htmlFor="email" className="text-sm font-medium text-text-primary">
                                Email
                            </Label>
                            <Input
                                id="email"
                                type="email"
                                placeholder="tu@email.com"
                                autoComplete="email"
                                className="h-12 rounded-xl"
                                {...register("email")}
                            />
                            {errors.email && (
                                <p className="text-destructive text-xs">{errors.email.message}</p>
                            )}
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="password" className="text-sm font-medium text-text-primary">
                                Contraseña
                            </Label>
                            <div className="relative">
                                <Input
                                    id="password"
                                    type={showPassword ? "text" : "password"}
                                    placeholder="Tu contraseña"
                                    autoComplete="current-password"
                                    className="h-12 rounded-xl pr-12"
                                    {...register("password")}
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPassword(!showPassword)}
                                    aria-label={showPassword ? "Ocultar contraseña" : "Mostrar contraseña"}
                                    className="absolute right-1 top-1/2 -translate-y-1/2 h-11 w-11 rounded-lg flex items-center justify-center text-text-muted hover:text-primary hover:bg-primary/5 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                                >
                                    {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                                </button>
                            </div>
                            {errors.password && (
                                <p className="text-destructive text-xs">{errors.password.message}</p>
                            )}
                        </div>

                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <Checkbox
                                    id="remember"
                                    checked={rememberMe}
                                    onCheckedChange={(checked) => setRememberMe(checked as boolean)}
                                />
                                <label
                                    htmlFor="remember"
                                    className="text-sm text-text-secondary cursor-pointer select-none"
                                >
                                    Recordarme
                                </label>
                            </div>
                            <button
                                type="button"
                                className="text-sm font-medium text-primary hover:text-primary/80 transition-colors"
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

                        <Button
                            type="submit"
                            disabled={isLoading}
                            className="w-full h-12 rounded-xl bg-primary text-primary-foreground hover:bg-primary/90 font-semibold shadow-[0_8px_24px_-8px_hsl(var(--primary)/0.5)] transition-shadow"
                        >
                            {isLoading ? (
                                <Loader2 className="h-5 w-5 animate-spin" />
                            ) : (
                                <>
                                    <LogIn className="h-5 w-5 mr-2" />
                                    Iniciar sesión
                                </>
                            )}
                        </Button>
                    </form>

                    <p className="text-center text-xs text-text-muted">
                        Hecho para ti, con calma.
                    </p>
                </div>
            </div>
        </div>
    );
}
