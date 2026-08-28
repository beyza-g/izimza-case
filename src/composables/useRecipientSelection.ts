import { computed, type Ref } from 'vue'
import type { Recipient } from '@/data/mockData'

export interface RecipientItem {
  key: string
  name: string
  mail: string
  isSelf: boolean
}

// Getter-style params (not raw values) so this stays reactive to the
// caller's own props/state without needing toRef/toRefs gymnastics at the
// call site — each getter is just re-read on every recompute, exactly like
// accessing props.xxx directly would be.
export function useRecipientSelection(params: {
  recipients: () => Recipient[]
  selfSelected: () => boolean
  email: () => string
  selfLabel: () => string
  search: Ref<string>
}) {
  const selfItem = computed<RecipientItem>(() => ({
    key: '__self__',
    name: params.selfLabel(),
    mail: params.email(),
    isSelf: true,
  }))

  // Selected items (self + registered recipients) pin to one checkmarked
  // section at the top of the single scrollable surface — not chips — so
  // there is exactly one scroll surface for the whole recipient list.
  const selectedItems = computed<RecipientItem[]>(() => {
    const items: RecipientItem[] = []
    if (params.selfSelected()) items.push(selfItem.value)
    items.push(
      ...params
        .recipients()
        .filter((r) => r.selected)
        .map((r) => ({ key: r.mail, name: r.name, mail: r.mail, isSelf: false })),
    )
    return items
  })

  const unselectedItems = computed<RecipientItem[]>(() => {
    const items: RecipientItem[] = []
    if (!params.selfSelected()) items.push(selfItem.value)
    items.push(
      ...params
        .recipients()
        .filter((r) => !r.selected)
        .map((r) => ({ key: r.mail, name: r.name, mail: r.mail, isSelf: false })),
    )
    const q = params.search.value.trim().toLowerCase()
    if (!q) return items
    return items.filter(
      (it) => it.name.toLowerCase().includes(q) || it.mail.toLowerCase().includes(q),
    )
  })

  const recipientCount = computed(
    () => params.recipients().filter((r) => r.selected).length + (params.selfSelected() ? 1 : 0),
  )

  return { selectedItems, unselectedItems, recipientCount }
}
