import React from 'react';
import { Star } from 'lucide-react';

const STARS = [
  { id: 1, name: 'SS Label', image: 'https://images.unsplash.com/photo-1501281668745-f7f57925c3b4?w=200&h=200&fit=crop' },
  { id: 2, name: 'Subicha', image: 'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?w=200&h=200&fit=crop' },
  { id: 3, name: 'Tăng Phúc', image: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=200&h=200&fit=crop' },
  { id: 4, name: 'Nhà Hát Kịch Thanh Niên', image: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=200&h=200&fit=crop' },
  { id: 5, name: 'Mỹ Tâm', image: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200&h=200&fit=crop' },
  { id: 6, name: 'Sơn Tùng M-TP', image: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=200&h=200&fit=crop' },
  { id: 7, name: 'Đen Vâu', image: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=200&h=200&fit=crop' },
  { id: 8, name: 'Hoàng Thùy Linh', image: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=200&h=200&fit=crop' },
];

export default function FeaturedStars() {
  return (
    <section className="container mx-auto px-4">
      <div className="flex items-center gap-2 mb-8">
        <div className="bg-yellow-400 p-1.5 rounded-lg">
          <Star className="w-5 h-5 text-white fill-current" />
        </div>
        <h2 className="text-2xl font-bold">Featured Stars</h2>
      </div>

      <div className="flex overflow-x-auto pb-4 gap-8 no-scrollbar scroll-smooth">
        {STARS.map((star) => (
          <div key={star.id} className="flex-shrink-0 flex flex-col items-center gap-3 group cursor-pointer">
            <div className="relative">
              <div className="w-24 h-24 md:w-28 md:h-28 rounded-full overflow-hidden border-2 border-transparent group-hover:border-primary transition-all duration-300">
                <img 
                  src={star.image} 
                  alt={star.name} 
                  className="w-full h-full object-cover grayscale group-hover:grayscale-0 transition-all duration-500"
                />
              </div>
              <div className="absolute bottom-0 right-0 bg-blue-500 rounded-full p-1 border-2 border-white">
                <svg className="w-3 h-3 text-white fill-current" viewBox="0 0 20 20">
                  <path d="M6.293 9.293a1 1 0 011.414 0L10 11.586l2.293-2.293a1 1 0 111.414 1.414l-3 3a1 1 0 01-1.414 0l-3-3a1 1 0 010-1.414z" />
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
              </div>
            </div>
            <span className="text-sm font-medium text-center group-hover:text-primary transition-colors line-clamp-1 max-w-[100px]">
              {star.name}
            </span>
          </div>
        ))}
      </div>
    </section>
  );
}
