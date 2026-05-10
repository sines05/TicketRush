import * as React from "react"
import { SlidersHorizontal } from "lucide-react"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Label } from "@/components/ui/label"
import { Slider } from "@/components/ui/slider"
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet"
import { CATEGORY_OPTIONS } from "@/constants/categories"

export function AdvancedFiltersSheet({
  onApply,
  onReset,
  initialFilters = {
    priceRange: [0, 10000000],
    categories: [],
  },
}) {
  const [priceRange, setPriceRange] = React.useState(initialFilters.priceRange)
  const [selectedCategories, setSelectedCategories] = React.useState(initialFilters.categories)

  React.useEffect(() => {
    setPriceRange(initialFilters.priceRange)
    setSelectedCategories(initialFilters.categories)
  }, [initialFilters.priceRange, initialFilters.categories])

  const handleCategoryChange = (categoryKey) => {
    setSelectedCategories((prev) =>
      prev.includes(categoryKey)
        ? prev.filter((k) => k !== categoryKey)
        : [...prev, categoryKey]
    )
  }

  const handleApply = () => {
    onApply({
      priceRange,
      categories: selectedCategories,
    })
  }

  const handleReset = () => {
    const defaultPriceRange = [0, 10000000]
    const defaultCategories = []
    setPriceRange(defaultPriceRange)
    setSelectedCategories(defaultCategories)
    if (onReset) {
      onReset()
    } else {
      onApply({
        priceRange: defaultPriceRange,
        categories: defaultCategories,
      })
    }
  }

  const formatPrice = (value) => {
    return new Intl.NumberFormat("vi-VN", {
      style: "currency",
      currency: "VND",
      maximumFractionDigits: 0,
    }).format(value)
  }

  return (
    <Sheet>
      <SheetTrigger asChild>
        <Button variant="outline" className="h-11 px-4 rounded-xl border-border/50 bg-background/50 backdrop-blur-sm hover:bg-background/80 transition-all">
          <SlidersHorizontal className="mr-2 h-4 w-4 text-primary" />
          Bộ lọc nâng cao
        </Button>
      </SheetTrigger>
      <SheetContent className="w-full sm:max-w-md flex flex-col h-full p-0 border-l-border/50">
        <SheetHeader className="p-6 border-b border-border/50">
          <SheetTitle className="text-2xl font-bold">Bộ lọc</SheetTitle>
          <SheetDescription>
            Tùy chỉnh tìm kiếm của bạn để tìm sự kiện phù hợp nhất.
          </SheetDescription>
        </SheetHeader>
        
        <div className="flex-1 overflow-y-auto p-6 space-y-8">
          {/* Price Range Section */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold">Khoảng giá</h3>
              <span className="text-sm text-primary font-medium bg-primary/10 px-2 py-1 rounded-md">
                {formatPrice(priceRange[0])} - {formatPrice(priceRange[1])}
              </span>
            </div>
            <div className="pt-4 px-2">
              <Slider
                defaultValue={priceRange}
                max={10000000}
                step={100000}
                onValueChange={setPriceRange}
                className="py-4"
              />
              <div className="flex justify-between mt-2 text-xs text-muted-foreground">
                <span>0đ</span>
                <span>10.000.000đ+</span>
              </div>
            </div>
          </div>

          {/* Categories Section */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Danh mục</h3>
            <div className="grid grid-cols-1 gap-3">
              {CATEGORY_OPTIONS.map((category) => (
                <div
                  key={category.key}
                  className={cn(
                    "flex items-center space-x-3 p-3 rounded-xl border border-border/50 transition-all cursor-pointer hover:bg-accent/50",
                    selectedCategories.includes(category.key) && "border-primary bg-primary/5"
                  )}
                  onClick={() => handleCategoryChange(category.key)}
                >
                  <Checkbox
                    id={category.key}
                    checked={selectedCategories.includes(category.key)}
                    onCheckedChange={() => handleCategoryChange(category.key)}
                  />
                  <Label
                    htmlFor={category.key}
                    className="flex-1 text-sm font-medium leading-none cursor-pointer"
                  >
                    {category.label}
                  </Label>
                </div>
              ))}
            </div>
          </div>
        </div>

        <SheetFooter className="p-6 border-t border-border/50 bg-background/80 backdrop-blur-md">
          <div className="flex w-full gap-3">
            <Button variant="outline" onClick={handleReset} className="flex-1 h-12 rounded-xl">
              Thiết lập lại
            </Button>
            <SheetClose asChild>
              <Button onClick={handleApply} className="flex-[2] h-12 rounded-xl bg-primary text-primary-foreground hover:bg-primary/90">
                Áp dụng bộ lọc
              </Button>
            </SheetClose>
          </div>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  )
}
