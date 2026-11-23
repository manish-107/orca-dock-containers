// Images, panel side: the IMAGES section (repos -> tags) and its right-click menu.
import type { MenuItem } from '../../ui/context-menu'
import { confirmDialog } from '../../ui/confirm'
import { showDetails } from '../../ui/details'
import { attempt, showError } from '../../ui/notice'
import type { SectionContext, SectionSpec } from '../../ui/section'
import type { TreeNode } from '../../ui/tree'
import { groupByRepo, timeAgo, type ImageRepo, type ImageTag } from './model'

export function imagesSection(): SectionSpec {
  return {
    id: 'images',
    title: 'Images',
    defaultOpen: false,
    emptyText: 'No images.',
    changedEvent: 'images.changed',
    async load(context) {
      const { images } = await orca.plugin.request('images.list')
      const now = Date.now() / 1000
      return groupByRepo(images).map((repo) => ({
        key: repo.key,
        label: repo.label,
        icon: 'image' as const,
        menu: () => repoMenu(repo, context),
        children: repo.tags.map((tag) => tagNode(tag, now, context))
      }))
    }
  }
}

function tagNode(tag: ImageTag, now: number, context: SectionContext): TreeNode {
  return {
    key: tag.key,
    label: tag.label,
    description: timeAgo(tag.created, now),
    tooltip: tag.ref,
    icon: 'tag',
    menu: () => tagMenu(tag, context)
  }
}

function tagMenu(tag: ImageTag, context: SectionContext): MenuItem[] {
  return [
    {
      label: 'Inspect',
      run: () =>
        attempt(async () => {
          const { json } = await orca.plugin.request('images.inspect', { ref: tag.ref })
          showDetails(`Inspect: ${tag.ref}`, json)
        })
    },
    'separator',
    {
      label: 'Remove…',
      danger: true,
      run: () =>
        attempt(async () => {
          if (!(await confirmDialog(`Remove image "${tag.ref}"?`, 'Remove'))) return
          await orca.plugin.request('images.remove', { ref: tag.ref })
          context.reload()
        })
    }
  ]
}

function repoMenu(repo: ImageRepo, context: SectionContext): MenuItem[] {
  const count = repo.tags.length
  return [
    {
      label: 'Remove…',
      danger: true,
      run: () =>
        attempt(async () => {
          const what = count === 1 ? `"${repo.label}"` : `all ${count} tags of "${repo.label}"`
          if (!(await confirmDialog(`Remove ${what}?`, 'Remove'))) return
          // One by one, so a tag in use (Docker refuses it) does not stop the others.
          for (const tag of repo.tags) {
            await orca.plugin.request('images.remove', { ref: tag.ref }).catch(showError)
          }
          context.reload()
        })
    }
  ]
}
