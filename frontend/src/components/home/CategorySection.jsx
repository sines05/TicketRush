import { useLocation, useNavigate } from 'react-router-dom';
import { CATEGORY_ALL, CATEGORY_ALL_LABEL, CATEGORY_OPTIONS } from '../../constants/categories.js';
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export default function CategorySection() {
  const location = useLocation();
  const navigate = useNavigate();

  const params = new URLSearchParams(location.search);
  const active = params.get('category') || CATEGORY_ALL;

  function go(next) {
    const p = new URLSearchParams();
    if (next && next !== CATEGORY_ALL) p.set('category', next);
    const nextSearch = p.toString();
    navigate({ pathname: '/search', search: nextSearch ? `?${nextSearch}` : '' });
  }

  return (
    <div className="w-full px-4 md:px-8">
      <nav className="flex items-center gap-3 overflow-x-auto py-6 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
        <Button
          variant={active === CATEGORY_ALL ? "default" : "outline"}
          onClick={() => go(CATEGORY_ALL)}
          className={cn(
            "rounded-full whitespace-nowrap px-6 h-10 transition-all font-medium",
            active === CATEGORY_ALL 
              ? "bg-primary text-white hover:bg-primary/90 border-primary shadow-sm" 
              : "bg-transparent border-gray-200 text-gray-600 hover:bg-gray-50 hover:border-gray-300"
          )}
        >
          {CATEGORY_ALL_LABEL}
        </Button>

        {CATEGORY_OPTIONS.map((c) => (
          <Button
            key={c.key}
            variant={active === c.key ? "default" : "outline"}
            onClick={() => go(c.key)}
            className={cn(
              "rounded-full whitespace-nowrap px-6 h-10 transition-all font-medium",
              active === c.key 
                ? "bg-primary text-white hover:bg-primary/90 border-primary shadow-sm" 
                : "bg-transparent border-gray-200 text-gray-600 hover:bg-gray-50 hover:border-gray-300"
            )}
          >
            {c.label}
          </Button>
        ))}
      </nav>
    </div>
  );
}
