# Component Reference

Quick reference for the shared, reusable UI atoms in `src/components/ui/`. Not a full app-flow guide — see `README.md` for that.

## StatusBadge

Renders a document's lifecycle status as a colored pill (dot + label). Color and label are looked up from `statusClasses`/`statusLabels` in `src/data/mockData.ts`, never invented per call site.

| Prop     | Type                                                    | Required |
| -------- | -------------------------------------------------------- | -------- |
| `status` | `'signed' \| 'archived' \| 'pending' \| 'cancelled'`      | yes      |

```vue
<StatusBadge :status="doc.status" />
```

## ConfirmDialog

Thin wrapper around AlertDialog for "are you sure?" prompts. It only forwards open state and the two button clicks — it never decides what confirm/cancel actually *do*, that stays with the caller (a delete, a queue clear, a leave-page guard). Used for: deleting a document (Dashboard), clearing the timestamp queue, and confirming navigation away from unsaved uploads (Timestamp).

| Prop | Type | Required |
| --- | --- | --- |
| `open`, `title`, `description`, `confirmLabel`, `cancelLabel` | `boolean`/`string` | yes |
| `destructive`, `confirmDisabled`, `cancelDisabled` | `boolean` (default `false`) | no |

Emits: `update:open`, `confirm`, `cancel`.

```vue
<ConfirmDialog
  v-model:open="deleteDialogOpen"
  :title="t('dashboard.deleteDialog.title')"
  :description="t('dashboard.deleteDialog.description', { name: deleteTarget?.name ?? '' })"
  :cancel-label="t('common.actions.discard')"
  :confirm-label="t('dashboard.deleteDialog.confirm')"
  destructive
  @confirm="confirmDelete"
/>
```

## Dialog / DialogContent

The base modal primitive (`src/components/ui/dialog/`) — a near-passthrough wrapper around reka-ui's `DialogRoot`/`DialogContent`/`DialogOverlay`/`DialogPortal`, forwarding all their own props/emits (`open`, `@update:open`, `@pointer-down-outside`, etc.) rather than declaring its own. Every prop reka-ui's `DialogContentProps` accepts works here unchanged. Used directly (not through ConfirmDialog) by `ChangePasswordModal.vue` and `TimestampCommitModal.vue`, whichever need custom content instead of the title/description/actions shape AlertDialog imposes.

```vue
<Dialog :open="true" @update:open="onOpenChange">
  <DialogContent class="max-w-[440px] bg-card p-7" @pointer-down-outside="onPointerDownOutside">
    <!-- custom content -->
  </DialogContent>
</Dialog>
```

## AlertDialog

The primitive ConfirmDialog is built on (`src/components/ui/alert-dialog/`) — `AlertDialog`, `AlertDialogContent`, `AlertDialogHeader`/`Footer`/`Title`/`Description`, `AlertDialogAction`/`Cancel`. `AlertDialogAction` takes a `variant: 'default' | 'destructive'` prop that styles it as the app's accent or destructive button. Its only consumer today is `ConfirmDialog.vue` — reach for that instead of these pieces directly unless you need a shape ConfirmDialog can't express.

```vue
<AlertDialogAction variant="destructive" @click="onConfirm">
  {{ confirmLabel }}
</AlertDialogAction>
```

## DropdownMenu

`src/components/ui/dropdown-menu/` — `DropdownMenu`, `DropdownMenuTrigger`, `DropdownMenuContent`, `DropdownMenuItem`, `DropdownMenuSeparator`. Used for the language selector inside `AppUserPopover.vue` and the per-row actions menu (view certificate / send / delete) on the Dashboard's document table.

```vue
<DropdownMenu>
  <DropdownMenuTrigger as-child>
    <button :aria-label="t('dashboard.table.actionsFor', { name: doc.name })">
      <MoreVertical class="w-4 h-4" />
    </button>
  </DropdownMenuTrigger>
  <DropdownMenuContent align="end">
    <DropdownMenuItem @click="openCertificate(doc)">
      <Eye class="w-4 h-4" /> {{ t('dashboard.table.viewCertificate') }}
    </DropdownMenuItem>
  </DropdownMenuContent>
</DropdownMenu>
```

## SkeletonBlock

A shimmer-animated placeholder `<div>` for loading states — no props, sized entirely by the `class` passed in (`h-*`/`w-*`). Used inside `StatCard.vue` while account/document queries are still pending.

```vue
<SkeletonBlock class="h-3 w-20" />
<SkeletonBlock class="h-9 w-24" />
```

## Toast

Not a standalone component — `useToast()` (`src/composables/useToast.ts`) pushes into a shared reactive queue, and `ToastHost.vue` (mounted once, globally) renders it. `Toast['tone']` is `'error' | 'success'` — two tones, not three; network/server failures (`src/lib/http.ts`'s axios interceptor) also use tone `'error'`, they don't get a distinct visual tone of their own.

```ts
// success
pushToast(t('profile.toasts.saved'), { tone: 'success' })

// network error, with retry — still tone: 'error' (the default)
pushToast(i18n.global.t('common.errors.network'), { retry: () => http.request(original) })
```
