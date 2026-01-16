import React from "react";
import { useLocation, Link } from "react-router-dom";
import { ChevronRight, Home } from "lucide-react";
import { cn } from "@/lib/utils";

// Route name mappings
const ROUTE_NAMES: Record<string, string> = {
    "/": "Dashboard",
    "/transacciones": "Transacciones",
    "/administracion": "Administración",
    "/admin": "Administración",
};

const Breadcrumb: React.FC<{ className?: string }> = ({ className }) => {
    const location = useLocation();
    const pathSegments = location.pathname.split("/").filter(Boolean);

    // Build breadcrumb items
    const breadcrumbs = [
        { path: "/", name: "Inicio", icon: Home },
        ...pathSegments.map((segment, index) => {
            const path = "/" + pathSegments.slice(0, index + 1).join("/");
            const name = ROUTE_NAMES[path] || segment.charAt(0).toUpperCase() + segment.slice(1);
            return { path, name };
        }),
    ];

    // Don't show breadcrumb on home page
    if (location.pathname === "/") {
        return null;
    }

    return (
        <nav
            aria-label="Breadcrumb"
            className={cn(
                "flex items-center gap-1.5 text-sm text-muted-foreground mb-4",
                className
            )}
        >
            {breadcrumbs.map((crumb, index) => {
                const isLast = index === breadcrumbs.length - 1;
                const Icon = 'icon' in crumb ? crumb.icon : null;

                return (
                    <React.Fragment key={crumb.path}>
                        {index > 0 && (
                            <ChevronRight className="w-3.5 h-3.5 text-muted-foreground/50" />
                        )}
                        {isLast ? (
                            <span className="font-medium text-text-primary flex items-center gap-1.5">
                                {Icon && <Icon className="w-3.5 h-3.5" />}
                                {crumb.name}
                            </span>
                        ) : (
                            <Link
                                to={crumb.path}
                                className="flex items-center gap-1.5 hover:text-primary transition-colors"
                            >
                                {Icon && <Icon className="w-3.5 h-3.5" />}
                                {crumb.name}
                            </Link>
                        )}
                    </React.Fragment>
                );
            })}
        </nav>
    );
};

export default Breadcrumb;
