export function getDeviceId(): string {
  if (typeof window === 'undefined') return ''
  let id = localStorage.getItem('shishi_device_id')
  if (!id) {
    id = crypto.randomUUID()
    localStorage.setItem('shishi_device_id', id)
  }
  return id
}
