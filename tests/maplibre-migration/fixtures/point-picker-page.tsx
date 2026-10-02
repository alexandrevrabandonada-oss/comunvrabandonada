"use client";

import { useState } from "react";
import { SidewalkRealPointPicker } from "@/components/sidewalk-real-point-picker";

// Copied into app/ only inside the disposable CI build. Never deployed.
export default function PointPickerFixture() {
  const [point, setPoint] = useState<[number, number] | null>(null);
  return (
    <main>
      <h1>Local component regression fixture</h1>
      <SidewalkRealPointPicker
        point={point}
        accuracy={null}
        onChange={setPoint}
      />
      <output aria-label="Selected test coordinate">
        {JSON.stringify(point)}
      </output>
      <button type="button" onClick={() => setPoint(null)}>
        Clear test coordinate
      </button>
    </main>
  );
}
