import Link from 'next/link';
import Image from 'next/image';
import { getActiveCategories } from '@/lib/articles';
import NewsMenu from '@/components/NewsMenu';

export default async function SiteHeader() {
  const categories = await getActiveCategories();

  return (
    <header className="sticky top-0 z-40 border-b border-line bg-paper/95 backdrop-blur">
      <div className="mx-auto max-w-site px-4 sm:px-6">
        <div className="flex items-center justify-between py-4">
          <Link href="/" className="shrink-0">
            <Image
              src="/linelogo.png"
              alt="Live Laugh Local"
              width={800}
              height={144}
              priority
              className="h-8 w-auto sm:h-9"
            />
          </Link>
          <Link
            href="/submit"
            className="rounded-full bg-coral px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-coral-deep"
          >
            Submit a story
          </Link>
        </div>
        <NewsMenu categories={categories} />
      </div>
    </header>
  );
}
