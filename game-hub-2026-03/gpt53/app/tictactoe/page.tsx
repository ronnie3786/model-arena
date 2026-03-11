import { Suspense } from "react";
import TttClient from "./TttClient";

export default function TicTacToePage(): React.JSX.Element {
  return (
    <Suspense fallback={<p className="mt-8 text-center text-slate-300">Loading game...</p>}>
      <TttClient />
    </Suspense>
  );
}
