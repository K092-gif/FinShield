import PageSkeleton from '@/components/simulator/PageSkeleton';

export default function RootLoading() {
  return (
    <div className='min-h-screen bg-[var(--bg-main)] p-4 sm:p-8 pt-24'>
      <PageSkeleton />
    </div>
  );
}
