# NavBar

Sticky дээд навигаци: лого, 6 холбоос, гэрэл/харанхуй toggle.

- 64px өндөр, `card` 88% + blur, доод hairline.
- Идэвхтэй холбоос: `accent-text` + `accent-soft` pill, `aria-current="page"`.
- <900px: холбоосууд нуугдаж `menu` товч гарна; үндсэн навигацийг `BottomTabBar` хариуцна.
- Лого: League (`text`) + MN (`accent`) + 7px `accent` цэг.

Tailwind: `sticky top-0 z-20 h-16 border-b border-line bg-card/90 backdrop-blur`.
