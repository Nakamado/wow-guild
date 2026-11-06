// Typen der Session (nuxt-auth-utils). `user` ist auch im Browser lesbar, `secure` nur auf dem Server.
declare module '#auth-utils' {
  interface User {
    /** Discord-User-ID = Mitglieds-ID */
    id: string
    displayName: string
    avatarUrl: string | null
  }

  interface SecureSessionData {
    /** Discord-Rollen-IDs auf dem Gilden-Server; null = nicht auf dem Server */
    roles: string[] | null
    /** Zeitpunkt der letzten erfolgreichen Rollenprüfung (ms) */
    rolesCheckedAt: number
    /**
     * Discord-Zugriffstoken (nur Scopes identify + guilds.members.read), damit die Rollen
     * auch ohne Bot nachgeprüft werden können. Liegt nur im verschlüsselten Session-Cookie.
     */
    accessToken?: string
    accessTokenExpiresAt?: number
  }
}

export {}
