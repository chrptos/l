"use client";
import { useState } from "react";

export function RatingInput({ defaultValue = 5, name = "rating" }: { defaultValue?: number; name?: string }) {
  const [value, setValue] = useState(defaultValue);
  const [hover, setHover] = useState(0);
  return (
    <div className="flex items-center gap-1" onMouseLeave={() => setHover(0)}>
      <input type="hidden" name={name} value={value} />
      {[1, 2, 3, 4, 5].map((i) => (
        <button key={i} type="button" aria-label={`${i}つ星`} onMouseEnter={() => setHover(i)} onClick={() => setValue(i)}
          className={`text-2xl ${(hover || value) >= i ? "text-amber-500" : "text-gray-300"}`}>★</button>
      ))}
      <span className="ml-2 text-sm text-gray-600">{value} / 5</span>
    </div>
  );
}
