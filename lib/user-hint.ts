export interface UserProfileHint {
  caffeineSensitivity?: number
  giSensitivity?: number
  feedbackCount?: number
}

export function buildUserHint(
  profile: UserProfileHint | null | undefined,
  type: 'sleep' | 'digest'
): string | null {
  if (!profile) return null

  const count = profile.feedbackCount ?? 0
  const countNote = count >= 2 ? `（已通过${count}次反馈校准）` : ''

  if (type === 'sleep') {
    const s = profile.caffeineSensitivity ?? 50
    if (s > 60) {
      return `用户对咖啡因较为敏感${countNote}，请在标准评估基础上适当上调失眠风险10-15分。`
    }
    if (s < 40) {
      return `用户咖啡因耐受性较强${countNote}，请在标准评估基础上适当下调失眠风险10-15分。`
    }
  }

  if (type === 'digest') {
    const s = profile.giSensitivity ?? 50
    if (s > 60) {
      return `用户肠胃较为敏感${countNote}，请在标准评估基础上适当上调腹泻/不适风险10-15分。`
    }
    if (s < 40) {
      return `用户肠胃耐受性较强${countNote}，请在标准评估基础上适当下调腹泻风险10-15分。`
    }
  }

  return null
}
