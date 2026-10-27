import * as React from "react";

export interface Team { abbr: string; name?: string; score: number; color?: string; }

/** Sticky дээд навигаци; <900px дээр menu товч болно. */
export interface NavBarProps { current?: string; items?: string[]; }
export function NavBar(props: NavBarProps): JSX.Element;

/** Гар утасны доод 5 таб (Нүүр, Мэдээ, Тоглолт, Лигүүд, Холбоо). */
export interface BottomTabBarProps { current?: "Нүүр" | "Мэдээ" | "Тоглолт" | "Лигүүд" | "Холбоо"; static?: boolean; }
export function BottomTabBar(props: BottomTabBarProps): JSX.Element;

/** Oswald том үсгийн хэсгийн гарчиг + баруун талын холбоос. */
export interface SectionHeaderProps { title: string; linkLabel?: string; href?: string; as?: "h1" | "h2" | "h3"; }
export function SectionHeader(props: SectionHeaderProps): JSX.Element;

/** Нэг тоглолтын үр дүн: огноо · лиг, хоёр баг; ялагч тод. */
export interface ResultCardProps { date: string; league: string; home: Team; away: Team; href?: string; }
export function ResultCard(props: ResultCardProps): JSX.Element;
/** "Сүүлд болсон тоглолтууд" хэвтээ scroll strip. */
export interface ResultsStripProps { results: ResultCardProps[]; }
export function ResultsStrip(props: ResultsStripProps): JSX.Element;

/** 16:9 cover: огнооны pill, номын икон; image байхгүй бол newspaper placeholder. */
export interface NewsImageProps { image?: string | null; alt?: string; date?: string; book?: boolean; }
export function NewsImage(props: NewsImageProps): JSX.Element;

export interface NewsItem { league: string; date: string; title: string; excerpt?: string; image?: string | null; href?: string; }
/** Онцлох мэдээ: том cover, tag, 2 мөр гарчиг, 2 мөр excerpt, "Дэлгэрэнгүй ›". */
export function NewsFeatured(props: NewsItem): JSX.Element;
/** Жижиг мэдээний карт (хоёроороо зэрэгцэнэ). */
export function NewsCard(props: NewsItem): JSX.Element;
/** Жагсаалтын мөр: 96×56 thumbnail, гарчиг, "огноо · лиг", chevron. */
export function NewsRow(props: NewsItem): JSX.Element;
/** Мэдээний мөрүүдтэй карт; хоосон бол "Мэдээ байхгүй байна". */
export interface NewsListProps { items: NewsItem[]; title?: string; linkLabel?: string | false; }
export function NewsList(props: NewsListProps): JSX.Element;

/** Лигийн мөр: өнгөт tile, нэр, улирал, progress, "12/30 · 8 баг". color = CSS өнгө эсвэл var(--league-*). */
export interface LeagueRowProps { name: string; season: string; abbr: string; logo?: string; color?: string; finished: number; total: number; teams: number; href?: string; }
export function LeagueRow(props: LeagueRowProps): JSX.Element;
/** "Явагдаж буй лигүүд" sidebar карт; хоосон бол "Одоогоор явагдаж буй лиг алга". */
export interface LeaguesPanelProps { leagues: LeagueRowProps[]; }
export function LeaguesPanel(props: LeaguesPanelProps): JSX.Element;

/** "Удахгүй болох тоглолтууд" мөр: огноо/цаг блок, "ABC vs XYZ", лиг. */
export interface UpcomingRowProps { day: string; time: string; home: string; away: string; league: string; href?: string; }
export function UpcomingRow(props: UpcomingRowProps): JSX.Element;
export interface UpcomingPanelProps { games: UpcomingRowProps[]; }
export function UpcomingPanel(props: UpcomingPanelProps): JSX.Element;

/** Хоосон төлөв: Material икон, гарчиг, тайлбар. */
export interface EmptyStateProps { icon?: string; title: string; text?: string; compact?: boolean; action?: React.ReactNode; }
export function EmptyState(props: EmptyStateProps): JSX.Element;

export function Footer(): JSX.Element;
export function Logo(props?: { href?: string }): JSX.Element;
export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> { icon?: string; iconOnly?: boolean; }
export function Button(props: ButtonProps): JSX.Element;
