import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
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
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  session: { strategy: "jwt" },
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

        const ok = await bcrypt.compare(password, u.passwordHash);
        if (!ok) return null;

        await prisma.usuario.update({ where: { id: u.id }, data: { ultimoAcceso: new Date() } });
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
        // @ts-expect-error campos propios
        token.rol = user.rol;
        // @ts-expect-error campos propios
        token.rolId = user.rolId;
      }
      return token;
    },
    session({ session, token }) {
      if (session.user) {
        if (token.sub) session.user.id = token.sub;
        session.user.rol = token.rol as string;
        session.user.rolId = token.rolId as number;
      }
      return session;
    },
  },
});
