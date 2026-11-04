import { useState, type CSSProperties } from "react"
import {
  Armchair,
  Brain,
  Droplets,
  Footprints,
  Moon,
  Salad,
  Sparkles,
  type LucideIcon,
} from "lucide-react"

type Topic = { text: string; icon?: LucideIcon }
type Category = { name: string; icon: LucideIcon; topics: Topic[] }

/** Ready-made searches, grouped so someone who doesn't know what to type can browse. */
const TOPIC_CATEGORIES: Category[] = [
  {
    name: "Popular",
    icon: Sparkles,
    topics: [
      { text: "Sleeping better", icon: Moon },
      { text: "Staying hydrated in hot weather", icon: Droplets },
      { text: "Managing stress", icon: Brain },
      { text: "Healthy eating on a budget", icon: Salad },
      { text: "Getting started with walking", icon: Footprints },
      { text: "Protecting my back at a desk", icon: Armchair },
    ],
  },
  {
    name: "Sleep",
    icon: Moon,
    topics: [
      { text: "Sleeping better" },
      { text: "Winding down before bed" },
      { text: "Napping without feeling groggy" },
      { text: "Sleeping well on shift work" },
    ],
  },
  {
    name: "Movement",
    icon: Footprints,
    topics: [
      { text: "Getting started with walking" },
      { text: "Stretching at my desk" },
      { text: "Staying active at home" },
      { text: "Protecting my back at a desk" },
    ],
  },
  {
    name: "Food",
    icon: Salad,
    topics: [
      { text: "Healthy eating on a budget" },
      { text: "Staying hydrated in hot weather" },
      { text: "Eating more vegetables" },
      { text: "Cutting down on sugar" },
    ],
  },
  {
    name: "Mind",
    icon: Brain,
    topics: [
      { text: "Managing stress" },
      { text: "Taking screen breaks" },
      { text: "Staying connected with others" },
      { text: "Building a calming routine" },
    ],
  },
]

type Props = {
  /** The current search text, so the matching topic shows as picked. */
  selected: string
  disabled?: boolean
  onPick: (text: string) => void
}

const rowClass =
  // One swipeable row on a phone (long chips wrap into a ragged block otherwise); wraps from sm up.
  "scrollbar-hide -mx-5 flex snap-x gap-2 overflow-x-auto px-5 pb-1 sm:mx-0 sm:flex-wrap sm:overflow-visible sm:px-0 sm:pb-0"

export function TopicPicker({ selected, disabled = false, onPick }: Props) {
  const [categoryName, setCategoryName] = useState(TOPIC_CATEGORIES[0].name)
  const category = TOPIC_CATEGORIES.find((item) => item.name === categoryName) ?? TOPIC_CATEGORIES[0]

  return (
    <div className="space-y-2">
      <div className={rowClass} role="group" aria-label="Topic categories">
        {TOPIC_CATEGORIES.map(({ name, icon: Icon }) => {
          const active = name === category.name
          return (
            <button
              key={name}
              type="button"
              aria-pressed={active}
              onClick={() => setCategoryName(name)}
              className={`inline-flex shrink-0 snap-start items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold transition active:scale-95 ${
                active ? "bg-[#00b4b8] text-white shadow-sm shadow-[#00b4b8]/30" : "text-[#657080] hover:bg-[#e3f8f8] hover:text-[#00898c]"
              }`}
            >
              <Icon className="size-3.5" aria-hidden="true" />
              {name}
            </button>
          )
        })}
      </div>

      {/* Keyed by category so the new set rises in rather than swapping in place. */}
      <div key={category.name} className={rowClass} role="group" aria-label="Suggested topics">
        {category.topics.map(({ text, icon }, index) => {
          const Icon = icon ?? category.icon
          return (
            <button
              key={text}
              type="button"
              onClick={() => onPick(text)}
              disabled={disabled}
              style={{ "--ht-delay": `${index * 50}ms` } as CSSProperties}
              className={`ht-rise group inline-flex shrink-0 snap-start items-center gap-1.5 whitespace-nowrap rounded-full px-3 py-1.5 text-xs font-medium ring-1 transition hover:-translate-y-0.5 hover:bg-[#e3f8f8] hover:text-[#00898c] hover:shadow-sm hover:ring-[#b3e8e9] active:translate-y-0 active:scale-95 disabled:translate-y-0 disabled:opacity-60 ${
                selected === text ? "bg-[#e3f8f8] text-[#00898c] ring-[#b3e8e9]" : "bg-white text-[#4a5260] ring-[#e2e6ea]"
              }`}
            >
              <Icon
                className="size-3.5 text-[#00b4b8] transition-transform group-hover:-rotate-6 group-hover:scale-110"
                aria-hidden="true"
              />
              {text}
            </button>
          )
        })}
      </div>
    </div>
  )
}
