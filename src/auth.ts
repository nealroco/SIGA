import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import "@/lib/env";
import { prisma } from "@/lib/db";
import { writeAudit } from "@/lib/audit";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      name?: string | null;
      email?: string | null;
      rol: string;
      rolId: number;
    };
  }
  interface User {
    rol: string;
    rolId: number;
  }
}

declare module "@auth/core/jwt" {
  interface JWT {
    rol: string;
    rolId: number;
  }
}

const MAX_INTENTOS_FALLIDOS = 5;
const BLOQUEO_MINUTOS = 15;

export const { handlers, auth, signIn, signOut } = NextAuth({
  session: { strategy: "jwt", maxAge: 8 * 60 * 60 }, // 8h — jornada laboral institucional
  cookies: {
    sessionToken: {
      name: `${process.env.NODE_ENV === "production" ? "__Secure-" : ""}authjs.session-token`,
      options: {
        httpOnly: true,
        sameSite: "lax",
        path: "/",
        secure: process.env.NODE_ENV === "production",
      },
    },
  },
  pages: { signIn: "/login" },
  trustHost: true,
  providers: [
    Credentials({
      credentials: {
        correo: { label: "Correo", type: "email" },
        password: { label: "Contraseña", type: "password" },
      },
      authorize: async (creds) => {
        const correo = String(creds?.correo ?? "").trim().toLowerCase();
        const password = String(creds?.password ?? "");
        if (!correo || !password) return null;

        const u = await prisma.usuario.findUnique({
          where: { correo },
          include: { rol: true },
        });
        if (!u || u.estado !== "Activo") return null;

        if (u.bloqueadoHasta && u.bloqueadoHasta > new Date()) return null;

        const ok = await bcrypt.compare(password, u.passwordHash);
        if (!ok) {
          const intentos = u.intentosFallidos + 1;
          const bloquear = intentos >= MAX_INTENTOS_FALLIDOS;
          await prisma.usuario.update({
            where: { id: u.id },
            data: {
              intentosFallidos: bloquear ? 0 : intentos,
              bloqueadoHasta: bloquear ? new Date(Date.now() + BLOQUEO_MINUTOS * 60 * 1000) : null,
            },
          });
          await writeAudit({
            usuarioId: u.id,
            accion: bloquear ? "login_bloqueado" : "login_fallido",
            modulo: "MOD-028",
            valorNuevo: bloquear ? { bloqueadoPorMinutos: BLOQUEO_MINUTOS } : { intentosFallidos: intentos },
          });
          return null;
        }

        await prisma.usuario.update({
          where: { id: u.id },
          data: { ultimoAcceso: new Date(), intentosFallidos: 0, bloqueadoHasta: null },
        });
        await writeAudit({ usuarioId: u.id, accion: "login", modulo: "MOD-028" });

        return {
          id: String(u.id),
          name: u.nombre,
          email: u.correo,
          rol: u.rol.nombre,
          rolId: u.rolId,
        };
      },
    }),
  ],
  callbacks: {
    jwt({ token, user }) {
      if (user) {
        token.rol = user.rol;
        token.rolId = user.rolId;
      }
      return token;
    },
    session({ session, token }) {
      if (session.user) {
        if (token.sub) session.user.id = token.sub;
        session.user.rol = token.rol;
        session.user.rolId = token.rolId;
      }
      return session;
    },
  },
});
