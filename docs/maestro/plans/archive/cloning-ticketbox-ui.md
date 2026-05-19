# Design Document: Cloning TicketBox.vn Landing Page

## 1. Overview
The goal is to transform the TicketRush landing page to match the look and feel of ticketbox.vn while maintaining the existing React structure and backend integration.

## 2. Visual Identity
- **Primary Color:** `#2dc275` (TicketBox Green)
- **Backgrounds:** 
  - Header: `#2dc275`
  - Sub-navigation: `#000000`
  - Page Content: Dark theme (consistent with TicketRush current dark mode but refined)
- **Typography:** Modern sans-serif (Inter or similar).

## 3. Component Mapping

### 3.1. Header (App.jsx)
- **Current:** Transparent/Blurry glass effect.
- **New:** Solid `#2dc275` background.
- **Elements:**
  - Logo (TicketRush logo, but styled like TicketBox).
  - Search Bar: Rounded, white background, "Bạn tìm gì hôm nay?" placeholder.
  - Action Links: "Tạo sự kiện", "Vé của tôi", "Đăng nhập | Đăng ký" (or user profile).

### 3.2. Sub-Navigation (App.jsx)
- **Current:** Simple buttons in a row.
- **New:** Black background bar below the header.
- **Items:** Nhạc sống, Sân khấu & Nghệ thuật, Thể Thao, Hội thảo & Workshop, Tham quan & Trải nghiệm, Khác, Vé bán lại, Blog.

### 3.3. Hero Carousel (HeroCarousel.jsx)
- **Update:** Match transition effects and button styles.
- **Assets:** Scraped banners from TicketBox (placeholders for now).

### 3.4. Featured Stars (New Component)
- **Component:** `src/components/home/FeaturedStars.jsx`
- **Design:** Horizontal scroll/carousel of artist circles with verified badges.

### 3.5. Event Sections (Home.jsx)
- **Refactor:** Standardize sections into "Sự kiện mới", "Sự kiện bán lại", and Category-specific sections.
- **Card Style (`EventCard.jsx`):**
  - Aspect ratio: ~16:9 for images.
  - Info: Title (max 2 lines), Price ("Từ ...đ"), Date (with calendar icon).

### 3.6. Destinations (LocationCards.jsx)
- **Design:** 4 grid cards.
- **Labels:** Bottom-centered white text on semi-transparent background.

### 3.7. Footer (App.jsx)
- **Structure:**
  - Column 1: Hotline, Email, Office address.
  - Column 2: Customer/Organizer terms.
  - Column 3: Company info.
  - Row below: App links, Social links, Language.

## 4. Asset Strategy
- **Logo:** Use existing logo but adapt color if needed.
- **Images:** Scrape high-quality banners and event posters from TicketBox for the "mockup" phase.
- **Icons:** Use Lucide-react (already in project) but match TicketBox icons where possible.

## 5. Implementation Plan
1. **Phase 1:** Update `App.jsx` (Header, Sub-nav, Footer).
2. **Phase 2:** Implement `FeaturedStars.jsx` and update `Home.jsx` layout.
3. **Phase 3:** Update `HeroCarousel.jsx` and `EventCard.jsx` styling.
4. **Phase 4:** Update `LocationCards.jsx`.
5. **Phase 5:** Final CSS polish and asset integration.
