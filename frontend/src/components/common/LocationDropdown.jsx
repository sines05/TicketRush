import * as React from "react"
import { MapPin, ChevronDown, Check, Globe } from "lucide-react"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { CITY_OPTIONS } from "@/constants/locations"

export function LocationDropdown({
  onSelect,
  selectedLocation,
  className,
}) {
  const [isOpen, setIsOpen] = React.useState(false)

  const locations = [
    { key: "all", label: "Toàn quốc", icon: Globe },
    ...CITY_OPTIONS,
    { key: "other", label: "Vị trí khác", icon: MapPin },
  ]

  const handleSelect = (location) => {
    onSelect(location)
    setIsOpen(false)
  }

  const currentLabel = locations.find(l => l.key === selectedLocation)?.label || "Chọn địa điểm"

  return (
    <div className={cn("grid gap-2", className)}>
      <Popover open={isOpen} onOpenChange={setIsOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            className={cn(
              "w-full justify-between text-left font-normal h-11 px-4 rounded-xl border-border/50 bg-background/50 backdrop-blur-sm hover:bg-background/80 transition-all",
              !selectedLocation && "text-muted-foreground"
            )}
          >
            <div className="flex items-center">
              <MapPin className="mr-2 h-4 w-4 text-primary" />
              <span>{currentLabel}</span>
            </div>
            <ChevronDown className={cn("ml-2 h-4 w-4 transition-transform duration-200", isOpen && "rotate-180")} />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[240px] p-2 rounded-2xl border-border/50 shadow-2xl" align="start">
          <div className="space-y-1">
            {locations.map((location) => {
              const Icon = location.icon || MapPin
              const isSelected = selectedLocation === location.key
              
              return (
                <Button
                  key={location.key}
                  variant="ghost"
                  className={cn(
                    "w-full justify-start font-normal h-10 px-3 rounded-lg transition-colors",
                    isSelected ? "bg-primary/10 text-primary font-medium" : "hover:bg-accent"
                  )}
                  onClick={() => handleSelect(location.key)}
                >
                  <Icon className={cn("mr-2 h-4 w-4", isSelected ? "text-primary" : "text-muted-foreground")} />
                  <span className="flex-1 text-left">{location.label}</span>
                  {isSelected && <Check className="h-4 w-4 text-primary" />}
                </Button>
              )
            })}
          </div>
        </PopoverContent>
      </Popover>
    </div>
  )
}
