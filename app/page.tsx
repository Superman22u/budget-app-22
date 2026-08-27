import { TransactionBoard } from "@/components/TransactionBoard";

export default function HomePage() {
  return (
    <>
      <h1 className="text-3xl tracking-tight mb-1">Bookings</h1>
      <p className="muted mb-4">Sorted by booking date. Click a column to reorder. Change a category anytime.</p>
      <TransactionBoard />
    </>
  );
}
