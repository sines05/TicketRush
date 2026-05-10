import * as React from "react"
import { format, addDays, startOfWeek, endOfWeek, startOfMonth, endOfMonth, isSameDay } from "date-fns"
import { vi } from "date-fns/locale"
import { Calendar as CalendarIcon, ChevronDown } from "lucide-react"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"

export function DatePickerDropdown({
  onApply,
  onReset,
  initialRange,
  className,
}) {
  const [date, setDate] = React.useState(initialRange)
  const [isOpen, setIsOpen] = React.useState(false)
  const [isDesktop, setIsDesktop] = React.useState(true)

  React.useEffect(() => {
    setDate(initialRange)
  }, [initialRange])

  React.useEffect(() => {
    const checkIsDesktop = () => {
      setIsDesktop(window.innerWidth >= 768)
    }
    checkIsDesktop()
    window.addEventListener("resize", checkIsDesktop)
    return () => window.removeEventListener("resize", checkIsDesktop)
  }, [])

  const quickSelections = [
    { label: "Tất cả các ngày", getValue: () => undefined },
    { label: "Hôm nay", getValue: () => ({ from: new Date(), to: new Date() }) },
    { label: "Ngày mai", getValue: () => ({ from: addDays(new Date(), 1), to: addDays(new Date(), 1) }) },
    { label: "Cuối tuần này", getValue: () => ({ from: startOfWeek(addDays(new Date(), 5)), to: endOfWeek(addDays(new Date(), 5)) }) },
    { label: "Tháng này", getValue: () => ({ from: startOfMonth(new Date()), to: endOfMonth(new Date()) }) },
  ]

  const handleQuickSelect = (selection) => {
    const newRange = selection.getValue()
    setDate(newRange)
  }

  const handleApply = () => {
    onApply(date)
    setIsOpen(false)
  }

  const handleReset = () => {
    setDate(undefined)
    onReset()
    setIsOpen(false)
  }

  const isSelected = (selection) => {
    const val = selection.getValue()
    if (!val && !date) return true
    if (!val || !date) return false
    return isSameDay(val.from, date.from) && isSameDay(val.to, date.to)
  }

  return (
    <div className={cn("grid gap-2", className)}>
      <Popover open={isOpen} onOpenChange={setIsOpen}>
        <PopoverTrigger asChild>
          <Button
            id="date"
            variant={"outline"}
            className={cn(
              "w-full justify-between text-left font-normal h-11 px-4 rounded-xl border-border/50 bg-background/50 backdrop-blur-sm hover:bg-background/80 transition-all",
              !date && "text-muted-foreground"
            )}
          >
            <div className="flex items-center">
              <CalendarIcon className="mr-2 h-4 w-4 text-primary" />
              {date?.from ? (
                date.to ? (
                  <>
                    {format(date.from, "dd/MM/yyyy")} -{" "}
                    {format(date.to, "dd/MM/yyyy")}
                  </>
                ) : (
                  format(date.from, "dd/MM/yyyy")
                )
              ) : (
                <span>Chọn thời gian</span>
              )}
            </div>
            <ChevronDown className={cn("ml-2 h-4 w-4 transition-transform duration-200", isOpen && "rotate-180")} />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0 rounded-2xl overflow-hidden border-border/50 shadow-2xl" align="start">
          <div className="flex flex-col">
            <div className="flex flex-wrap gap-1 border-b border-border/50 p-2 bg-muted/20">
              {quickSelections.map((selection) => (
                <Button
                  key={selection.label}
                  variant="ghost"
                  size="sm"
                  className={cn(
                    "font-normal hover:bg-primary/10 hover:text-primary transition-colors rounded-lg",
                    isSelected(selection) && "bg-primary/10 text-primary font-medium"
                  )}
                  onClick={() => handleQuickSelect(selection)}
                >
                  {selection.label}
                </Button>
              ))}
            </div>
            <div className="p-2">
              <Calendar
                initialFocus
                mode="range"
                defaultMonth={date?.from}
                selected={date}
                onSelect={setDate}
                numberOfMonths={isDesktop ? 2 : 1}
                locale={vi}
                className="rounded-md"
              />
              <div className="flex items-center justify-end gap-2 p-2 border-t border-border/50 mt-2">
                <Button variant="ghost" onClick={handleReset} className="text-muted-foreground hover:text-foreground">
                  Thiết lập lại
                </Button>
                <Button onClick={handleApply} className="bg-primary text-primary-foreground hover:bg-primary/90 px-6 rounded-lg">
                  Áp dụng
                </Button>
              </div>
            </div>
          </div>
        </PopoverContent>
      </Popover>
    </div>
  )
}
