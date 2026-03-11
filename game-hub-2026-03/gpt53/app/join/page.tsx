import { Suspense } from "react";
import JoinClient from "./JoinClient";

export default function JoinPage(): React.JSX.Element {
  return (
    <Suspense fallback={<p className="mt-8 text-center text-slate-300">Loading room...</p>}>
      <JoinClient />
    </Suspense>
  );
}
