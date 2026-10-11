import React, { type ReactNode } from 'react';
import {
  useDocById,
  findFirstSidebarItemLink,
} from '@docusaurus/plugin-content-docs/client';
import {
  extractLeadingEmoji,
  useDocCardDescriptionCategoryItemsPlural,
} from '@docusaurus/theme-common/internal';
import isInternalUrl from '@docusaurus/isInternalUrl';
import Layout from '@theme/DocCard/Layout';
import { ModuleIcon, isModuleIconName } from '@site/src/components/ModuleIcon';

import type { Props } from '@theme/DocCard';
import type {
  PropSidebarItemCategory,
  PropSidebarItemLink,
} from '@docusaurus/plugin-content-docs';

import styles from './styles.module.css';

/*
 * Ejected from @docusaurus/theme-classic to show the engine's module icons on
 * the docs overview: a category whose `_category_.json` sets
 * `customProps.icon` to a ModuleIcon name gets that icon instead of an emoji.
 */

function getFallbackEmojiIcon(
  item: PropSidebarItemLink | PropSidebarItemCategory,
): string {
  if (item.type === 'category') {
    return '🗃';
  }
  return isInternalUrl(item.href) ? '📄️' : '🔗';
}

function getIconTitleProps(
  item: PropSidebarItemLink | PropSidebarItemCategory,
): { icon: ReactNode; title: string } {
  const extracted = extractLeadingEmoji(item.label);
  const moduleIcon = item.customProps?.icon;

  if (isModuleIconName(moduleIcon)) {
    return {
      icon: <ModuleIcon name={moduleIcon} className={styles.moduleIcon} />,
      title: extracted.rest.trim(),
    };
  }

  const emoji = extracted.emoji ?? getFallbackEmojiIcon(item);
  return {
    icon: emoji,
    title: extracted.rest.trim(),
  };
}

function CardCategory({ item }: { item: PropSidebarItemCategory }): ReactNode {
  const href = findFirstSidebarItemLink(item);
  const categoryItemsPlural = useDocCardDescriptionCategoryItemsPlural();

  // Unexpected: categories that don't have a link have been filtered upfront
  if (!href) {
    return null;
  }
  return (
    <Layout
      item={item}
      className={item.className}
      href={href}
      description={item.description ?? categoryItemsPlural(item.items.length)}
      {...getIconTitleProps(item)}
    />
  );
}

function CardLink({ item }: { item: PropSidebarItemLink }): ReactNode {
  const doc = useDocById(item.docId ?? undefined);
  return (
    <Layout
      item={item}
      className={item.className}
      href={item.href}
      description={item.description ?? doc?.description}
      {...getIconTitleProps(item)}
    />
  );
}

export default function DocCard({ item }: Props): ReactNode {
  if (item.type === 'link') {
    return <CardLink item={item} />;
  }

  if (item.type === 'category') {
    return <CardCategory item={item} />;
  }

  throw new Error(`unknown item type ${JSON.stringify(item)}`);
}
