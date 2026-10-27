# ResultsStrip

Сүүлд болсон тоглолтуудын хэвтээ scroll strip.

- Карт 212px, `scroll-snap`, scrollbar нуугдсан, баруун ирмэгт `bg` руу уусах fade.
- Толгой: `огноо · лиг` (лигийн урт нэр '…'-ээр).
- Мөр: 24px багийн тойрог лого, Oswald 3 үсгийн товчлол, оноо. Ялагч `text` + жижиг `accent` гурвалжин, ялагдагч `text-secondary`.
- Desktop-д strip хажуу padding-аас гадагш (bleed) гарна.

Tailwind: `flex gap-3 overflow-x-auto snap-x snap-mandatory [scrollbar-width:none]`.
