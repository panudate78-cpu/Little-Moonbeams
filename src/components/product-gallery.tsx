"use client";

import Image from "next/image";
import { useState } from "react";

interface GalleryImage {
  url: string;
  alt: string;
}

export function ProductGallery({ images, name }: { images: GalleryImage[]; name: string }) {
  const list = images;
  const [active, setActive] = useState(0);
  const [zoom, setZoom] = useState(false);
  const [origin, setOrigin] = useState("50% 50%");

  return (
    <div>
      <div
        className="relative aspect-square cursor-zoom-in overflow-hidden rounded-2xl border border-silvermist/40 bg-dustyblue-light"
        onMouseMove={(e) => {
          const rect = e.currentTarget.getBoundingClientRect();
          const x = ((e.clientX - rect.left) / rect.width) * 100;
          const y = ((e.clientY - rect.top) / rect.height) * 100;
          setOrigin(`${x}% ${y}%`);
        }}
        onMouseEnter={() => setZoom(true)}
        onMouseLeave={() => setZoom(false)}
        onClick={() => setZoom((z) => !z)}
      >
        <Image
          src={list[active].url}
          alt={list[active].alt || name}
          fill
          priority
          sizes="(max-width: 1024px) 100vw, 50vw"
          className="object-cover transition-transform duration-200"
          style={{
            transform: zoom ? "scale(1.9)" : "scale(1)",
            transformOrigin: origin,
          }}
        />
        <span className="absolute right-3 bottom-3 rounded-full bg-ivory/80 px-3 py-1 text-xs font-semibold text-inksoft">
          🔍 Hover to zoom
        </span>
      </div>
      {list.length > 1 && (
        <div className="mt-3 grid grid-cols-5 gap-2">
          {list.map((img, i) => (
            <button
              key={i}
              onClick={() => setActive(i)}
              className={`relative aspect-square overflow-hidden rounded-xl border-2 transition ${
                i === active ? "border-lavender" : "border-transparent opacity-70 hover:opacity-100"
              }`}
            >
              <Image src={img.url} alt={img.alt || name} fill sizes="10vw" className="object-cover" />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
