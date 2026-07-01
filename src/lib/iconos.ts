import {
  Users, UserCog, Wallet, Boxes, FileText, ClipboardList, LayoutDashboard, Megaphone,
  ClipboardCheck, FileSignature, Activity, Map, Shirt, ShieldCheck, Gavel, Target,
  LandPlot, HeartHandshake, Mail, Landmark, Bell, CalendarCheck, Wrench, MapPin,
  BarChart3, SearchCheck, Link2, Shield, Cloud, Pencil, CheckCircle2, Eye, Upload, Ban,
  UserX, PowerOff, Search, Trophy, type LucideIcon,
} from "lucide-react";
import type { Nivel } from "@/lib/permissions";

/** Ícono representativo por módulo (MOD-001 … MOD-029) — fuente única para Sidebar/Dashboard/etc. */
export const MODULO_ICONO: Record<string, LucideIcon> = {
  "MOD-001": Users,
  "MOD-002": UserCog,
  "MOD-003": Wallet,
  "MOD-004": Boxes,
  "MOD-005": FileText,
  "MOD-006": ClipboardList,
  "MOD-007": LayoutDashboard,
  "MOD-008": Megaphone,
  "MOD-009": ClipboardCheck,
  "MOD-010": FileSignature,
  "MOD-011": Activity,
  "MOD-012": Map,
  "MOD-013": Shirt,
  "MOD-014": ShieldCheck,
  "MOD-015": Gavel,
  "MOD-016": Target,
  "MOD-017": LandPlot,
  "MOD-018": HeartHandshake,
  "MOD-019": Mail,
  "MOD-020": Landmark,
  "MOD-021": Bell,
  "MOD-022": CalendarCheck,
  "MOD-023": Wrench,
  "MOD-024": MapPin,
  "MOD-025": BarChart3,
  "MOD-026": SearchCheck,
  "MOD-027": Link2,
  "MOD-028": Shield,
  "MOD-029": Cloud,
};

/** Ícono por categoría de módulo (encabezado de grupo en el Sidebar). */
export const CATEGORIA_ICONO: Record<string, LucideIcon> = {
  "Operación base": Megaphone,
  "Base": LayoutDashboard,
  "Gobierno financiero": Landmark,
  "Recursos": Boxes,
  "Control y evaluación": ClipboardCheck,
  "Territorio": Map,
  "Gobernanza": Gavel,
  "Planeación": Target,
  "Escenarios": Trophy,
  "Transversal": Bell,
  "Reportes": BarChart3,
};

/** Ícono por nivel de permiso — refuerza el color existente, no lo reemplaza (RN-015). */
export const NIVEL_ICONO: Record<Nivel, LucideIcon> = {
  E: Pencil,
  A: CheckCircle2,
  L: Eye,
  C: Upload,
  NONE: Ban,
};

/** Ícono por rol (9 roles del catálogo v4). */
export const ROL_ICONO: Record<string, LucideIcon> = {
  Administrador: ShieldCheck,
  Supervisor: Eye,
  Operador: UserCog,
  Revisor: Search,
  "Coord. deportiva": Trophy,
  Entrenador: Activity,
  Infraestructura: Wrench,
  Financiera: Wallet,
  Tecnología: Cloud,
};

const BAJA_RECURSO = new Set(["MOD-004", "MOD-012", "MOD-017", "MOD-022"]); // Inventarios, Territorios, Lotes, Escenarios

/**
 * Ícono para "dar de baja" (RN-002: baja lógica, nunca DELETE físico).
 * Nunca usar un ícono de basura/eliminar — insinuaría un borrado que no ocurre.
 */
export function iconoBaja(moduloCodigo: string): LucideIcon {
  return BAJA_RECURSO.has(moduloCodigo) ? PowerOff : UserX;
}
