import { Suspense } from "react";
import RpsClient from "./RpsClient";

export default function RpsPage(): React.JSX.Element {
  return (
    <Suspense fallback={<p className="mt-8 text-center text-slate-300">Loading game...</p>}>
      <RpsClient />
    </Suspense>
  );
}
