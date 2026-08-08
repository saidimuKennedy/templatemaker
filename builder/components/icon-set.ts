/**
 * The curated icon vocabulary the builder exposes — a deliberate subset of
 * lucide, not the whole library.
 *
 * Three reasons it is a fixed map with static named imports:
 *
 * 1. The `select` options flow into the AI prompt via `formatPropertySchema`,
 *    so a bounded list is the only way the model picks icons that exist.
 * 2. A bounded set is what keeps a generated page visually coherent.
 * 3. Static named imports let the bundler drop what isn't referenced;
 *    a dynamic or wildcard import would pull all 1,500+ icons into the
 *    bundle. Note that every icon named here does ship once `Icon` is
 *    registered — the cost of the set is the set, so keep it curated.
 *
 * Keys are semantic where the meaning is the point (`listen`, not `ear`).
 */
import {
  ArrowDown,
  ArrowLeft,
  ArrowRight,
  ArrowUp,
  Award,
  Badge,
  Bookmark,
  Box,
  Briefcase,
  Calendar,
  Camera,
  Check,
  ChevronRight,
  Circle,
  Clock,
  Code,
  Compass,
  Download,
  Ear,
  ExternalLink,
  Eye,
  FileText,
  Filter,
  Github,
  Globe,
  Heart,
  Image as ImageIcon,
  Layers,
  LayoutTemplate,
  Leaf,
  Lightbulb,
  Linkedin,
  Link,
  Mail,
  MapPin,
  MessageCircle,
  Minus,
  MoveRight,
  Palette,
  PenTool,
  Phone,
  PlayCircle,
  Plus,
  Quote,
  Ruler,
  Search,
  Send,
  Settings,
  Share2,
  Shield,
  Sparkles,
  Star,
  Target,
  Users,
  Wrench,
  X,
  Zap,
  type LucideIcon,
} from "lucide-react";

export const ICON_SET = {
  listen: Ear,
  send: Send,
  minus: Minus,
  box: Box,
  window: LayoutTemplate,
  badge: Badge,
  leaf: Leaf,
  arrowUp: ArrowUp,
  arrowDown: ArrowDown,
  arrowLeft: ArrowLeft,
  arrowRight: ArrowRight,
  check: Check,
  x: X,
  mail: Mail,
  link: Link,
  star: Star,
  calendar: Calendar,
  clock: Clock,
  mapPin: MapPin,
  phone: Phone,
  download: Download,
  externalLink: ExternalLink,
  search: Search,
  plus: Plus,
  heart: Heart,
  quote: Quote,
  sparkles: Sparkles,

  // Craft and process — the vocabulary a studio/portfolio page reaches for.
  design: PenTool,
  palette: Palette,
  code: Code,
  layers: Layers,
  ruler: Ruler,
  tools: Wrench,
  settings: Settings,
  idea: Lightbulb,
  target: Target,
  compass: Compass,
  award: Award,
  shield: Shield,
  zap: Zap,

  // People, work, and contact.
  team: Users,
  work: Briefcase,
  message: MessageCircle,
  share: Share2,
  github: Github,
  linkedin: Linkedin,
  globe: Globe,

  // Media and documents.
  image: ImageIcon,
  camera: Camera,
  document: FileText,
  play: PlayCircle,
  view: Eye,
  bookmark: Bookmark,

  // Navigation and structure.
  chevronRight: ChevronRight,
  moveRight: MoveRight,
  filter: Filter,
  dot: Circle,
} as const satisfies Record<string, LucideIcon>;

export type IconName = keyof typeof ICON_SET;

export const ICON_NAMES = Object.keys(ICON_SET) as IconName[];

export function resolveIcon(name: unknown): LucideIcon | null {
  if (typeof name !== "string") {
    return null;
  }
  return ICON_SET[name as IconName] ?? null;
}
