import { useLocation } from '@docusaurus/router';
import { demoCategories } from '@site/src/data/demo-categories';

interface DemoBackLink {
  to: string;
  label: string;
}

/**
 * Where a demo page's back link goes. The category page a demo was opened
 * from is passed as a `from` query param (see `DemoCard`), so the link
 * returns to that category instead of the full demo catalogue.
 */
export const useDemoBackLink = (): DemoBackLink => {
  const location = useLocation();
  const fromCategory = demoCategories.find(
    (category) =>
      category.slug === new URLSearchParams(location.search).get('from'),
  );

  if (fromCategory) {
    return {
      to: `/demos/category/${fromCategory.slug}`,
      label: `← Back to ${fromCategory.title}`,
    };
  }

  return { to: '/demos', label: '← All demos' };
};
