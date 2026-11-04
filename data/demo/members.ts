import type { CommunityMember } from '../../shared/types'

/**
 * EINDEUTIG FIKTIVE Community-Mitglieder für den Demo-Modus.
 * Namen sind erfunden und gehören zu keinen echten Discord-Nutzern.
 */
type MemberInput = Pick<CommunityMember, 'id' | 'displayName' | 'preferredRoles'>
  & Partial<Pick<CommunityMember, 'isGuildMember' | 'isAdmin'>>

const inputs: MemberInput[] = [
  { id: 'demo-member-01', displayName: 'Frostblüte', preferredRoles: ['healer'], isAdmin: true },
  { id: 'demo-member-02', displayName: 'Brummbart', preferredRoles: ['tank'] },
  { id: 'demo-member-03', displayName: 'Laternchen', preferredRoles: ['dps', 'healer'] },
  { id: 'demo-member-04', displayName: 'Nebelpfote', preferredRoles: ['dps'] },
  { id: 'demo-member-05', displayName: 'Sternenstaub', preferredRoles: ['healer', 'dps'] },
  { id: 'demo-member-06', displayName: 'Kupferkessel', preferredRoles: ['dps'] },
  { id: 'demo-member-07', displayName: 'Mondsichel', preferredRoles: ['tank', 'dps'] },
  { id: 'demo-member-08', displayName: 'Wolkenwirbel', preferredRoles: ['dps'] },
  { id: 'demo-member-09', displayName: 'Teepause', preferredRoles: ['healer'] },
  { id: 'demo-member-10', displayName: 'Glimmerfee', preferredRoles: ['dps'] },
  { id: 'demo-member-11', displayName: 'Funkelzahn', preferredRoles: ['tank'] },
  // Auf dem Discord-Server, aber (noch) ohne Gildenrolle – erscheint nicht in der Mitgliederliste
  { id: 'demo-member-12', displayName: 'Zaungast', preferredRoles: [], isGuildMember: false },
]

export const demoMembers: CommunityMember[] = inputs.map((input, index) => ({
  id: input.id,
  discordId: `demo-discord-user-${String(index + 1).padStart(2, '0')}`,
  displayName: input.displayName,
  avatarUrl: null,
  profileUrl: null,
  preferredRoles: input.preferredRoles,
  isGuildMember: input.isGuildMember ?? true,
  isAdmin: input.isAdmin ?? false,
  source: 'demo',
}))
