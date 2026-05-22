package main

import (
	"fmt"
	"log"
	"math/rand"
	"time"

	"golang.org/x/crypto/bcrypt"
	"gorm.io/driver/postgres"
	"gorm.io/gorm"
	"ticketrush/internal/config"
	"ticketrush/internal/models"
	"ticketrush/internal/repository"
	"ticketrush/internal/utils"
)

func floatPtr(f float64) *float64 { return &f }

type CityCoord struct {
	Lat float64
	Lon float64
}

var cityCoords = map[string]CityCoord{
	"Hồ Chí Minh": {Lat: 10.762622, Lon: 106.660172},
	"Hà Nội":      {Lat: 21.028511, Lon: 105.804817},
	"Đà Nẵng":     {Lat: 16.054407, Lon: 108.202167},
	"Cần Thơ":     {Lat: 10.045162, Lon: 105.746857},
	"Đà Lạt":      {Lat: 11.940419, Lon: 108.458313},
	"Nha Trang":   {Lat: 12.238791, Lon: 109.196749},
	"Hải Phòng":   {Lat: 20.844912, Lon: 106.688084},
	"Huế":         {Lat: 16.463713, Lon: 107.590866},
}

func main() {
	rand.Seed(time.Now().UnixNano())
	cfg := config.LoadConfig()
	dsn := fmt.Sprintf("host=%s user=%s password=%s dbname=%s port=%s sslmode=disable",
		cfg.DBHost, cfg.DBUser, cfg.DBPassword, cfg.DBName, cfg.DBPort)

	db, err := gorm.Open(postgres.Open(dsn), &gorm.Config{})
	if err != nil {
		log.Fatalf("Failed to connect to database: %v", err)
	}

	fmt.Println("🗑️ Cleaning database...")
	if err := db.Exec("DROP SCHEMA public CASCADE; CREATE SCHEMA public;").Error; err != nil {
		log.Fatalf("Failed to clean database: %v", err)
	}

	fmt.Println("🔄 Running migrations...")
	repository.RunMigrations(cfg)

	fmt.Println("🌱 Seeding fresh data...")

	hashedPassword, _ := bcrypt.GenerateFromPassword([]byte("password"), bcrypt.DefaultCost)

	// ============================================================
	// 1. USERS
	// ============================================================
	fmt.Println("👤 Creating users...")

	admin := models.User{
		Email:        "admin@ticketrush.com",
		PasswordHash: string(hashedPassword),
		FullName:     "Nguyễn Quản Trị",
		Role:         models.RoleAdmin,
		Gender:       models.GenderMale,
		DateOfBirth:  time.Date(1990, 5, 15, 0, 0, 0, 0, time.UTC),
		TwoFactorEnabled: false,
	}
	db.Create(&admin)

	customers := []models.User{
		{
			Email:        "customer@ticketrush.com",
			PasswordHash: string(hashedPassword),
			FullName:     "Trần Văn Khách",
			Role:         models.RoleCustomer,
			Gender:       models.GenderMale,
			DateOfBirth:  time.Date(2000, 3, 20, 0, 0, 0, 0, time.UTC),
		},
		{
			Email:        "linhchi@gmail.com",
			PasswordHash: string(hashedPassword),
			FullName:     "Nguyễn Linh Chi",
			Role:         models.RoleCustomer,
			Gender:       models.GenderFemale,
			DateOfBirth:  time.Date(2001, 7, 12, 0, 0, 0, 0, time.UTC),
		},
		{
			Email:        "minhduc@gmail.com",
			PasswordHash: string(hashedPassword),
			FullName:     "Phạm Minh Đức",
			Role:         models.RoleCustomer,
			Gender:       models.GenderMale,
			DateOfBirth:  time.Date(1998, 11, 5, 0, 0, 0, 0, time.UTC),
		},
		{
			Email:        "thuytrang@gmail.com",
			PasswordHash: string(hashedPassword),
			FullName:     "Lê Thùy Trang",
			Role:         models.RoleCustomer,
			Gender:       models.GenderFemale,
			DateOfBirth:  time.Date(2003, 1, 28, 0, 0, 0, 0, time.UTC),
		},
		{
			Email:        "hoangnam@gmail.com",
			PasswordHash: string(hashedPassword),
			FullName:     "Vũ Hoàng Nam",
			Role:         models.RoleCustomer,
			Gender:       models.GenderMale,
			DateOfBirth:  time.Date(1995, 9, 10, 0, 0, 0, 0, time.UTC),
		},
		{
			Email:        "ngocanhh@gmail.com",
			PasswordHash: string(hashedPassword),
			FullName:     "Đặng Ngọc Anh",
			Role:         models.RoleCustomer,
			Gender:       models.GenderFemale,
			DateOfBirth:  time.Date(2002, 4, 3, 0, 0, 0, 0, time.UTC),
		},
		{
			Email:        "quanghai@gmail.com",
			PasswordHash: string(hashedPassword),
			FullName:     "Nguyễn Quang Hải",
			Role:         models.RoleCustomer,
			Gender:       models.GenderMale,
			DateOfBirth:  time.Date(1997, 6, 18, 0, 0, 0, 0, time.UTC),
		},
		{
			Email:        "thanhhuyen@gmail.com",
			PasswordHash: string(hashedPassword),
			FullName:     "Bùi Thanh Huyền",
			Role:         models.RoleCustomer,
			Gender:       models.GenderFemale,
			DateOfBirth:  time.Date(1999, 12, 25, 0, 0, 0, 0, time.UTC),
		},
		{
			Email:        "ducmanh@gmail.com",
			PasswordHash: string(hashedPassword),
			FullName:     "Trịnh Đức Mạnh",
			Role:         models.RoleCustomer,
			Gender:       models.GenderMale,
			DateOfBirth:  time.Date(1993, 8, 7, 0, 0, 0, 0, time.UTC),
		},
	}
	for i := range customers {
		db.Create(&customers[i])
	}
	fmt.Printf("   ✅ Created 1 admin + %d customers\n", len(customers))

	// ============================================================
	// 2. EVENTS
	// ============================================================
	fmt.Println("🎤 Creating events...")

	type eventSeed struct {
		event models.Event
		zones []models.EventZone
	}

	titles := []string{
		"Mr Siro - Fan Concert - Encore Ai Cũng Giấu Trong Lòng Tảng Băng - HCM",
		"Những Thành Phố Mơ Màng Summer Tour 2026",
		"HOLD | DANCENTER ANNUAL SHOW 2026",
		"SPARK NITE: S.T SƠN THẠCH x NEKO LÊ",
		"SECRET GARDEN - Khu Vườn Âm Nhạc",
		"The Dome Show #4: Mini Show Quang Hà - Ngỡ Như Trăm Năm",
		"Đại tiệc nhạc nước mừng Quốc tế thiếu nhi tại Vạn Phúc City",
		"K-PULSE HANOI 2026",
		"[HBSO] Cô bé Lọ Lem CINDERELLA",
		"PHẬT BẢO NGHIÊM TRẤN - TRIỂN LÃM DI SẢN PHẬT GIÁO ĐỘC BẢN",
		"Roadtrip to 1900 #70: SPACE 92 | Friday 29.05.2026",
		"CHUNG KẾT FFWS SEA 2026 SPRING",
		"INDIAN FOOD FESTIVAL 2026 AT BENARAS HERITAGE",
		"VBA 2026 - Saigon Heat - Da Nang Dragons",
		"VinWonders Phú Quốc - Đại tiệc mùa hè",
		"Sân Khấu Hồng Vân: Vở Kịch Gã Thợ May",
		"Nhà Hát Kịch IDECAF: Một Ngày Làm VUA",
		"[SÂN KHẤU THIÊN ĐĂNG]- VỞ KỊCH - LỘ HÀNG (LEAKED)",
		"Nhà Hát Kịch IDECAF: TẤM CÁM ĐẠI CHIẾN!",
		"Nhà Hát Kịch IDECAF: NXNX37 - Học Viện Phép Thuật",
		"[Nhà Hát Bến Thành] Hài kịch: Đảo Hoa Hậu",
		"[Nhà hát kịch Thanh Niên] Hài kịch: Tung Hoành Pattaya",
		"[Nhà Hát Kịch Thanh Niên] Hài kịch: Nữ Hoàng Giải Trí",
		"Cat & Mouse Live Music Night",
		"[DẾ GARDEN] Terrarium Workshop - Tạo hệ sinh thái thu nhỏ",
		"ROLLERBALL PERFUME WORKSHOP - TRẢI NGHIỆM LÀM NƯỚC HOA LĂN",
		"Sự kiện trải nghiệm tiệc cưới Sensation of I DO",
		"WORKSHOP CANDLE - HỌC LÀM NẾN THƠM",
		"LUNCH & LEARN: Workshop về Phỏng vấn Ứng viên",
		"WORKSHOP SOLID PERFUME - NƯỚC HOA KHÔ",
	}

	descriptions := []string{
		"Một đêm nhạc hoành tráng với sự góp mặt của nhiều nghệ sĩ nổi tiếng. Đừng bỏ lỡ cơ hội trải nghiệm không gian âm nhạc đỉnh cao.",
		"Sự kiện thể thao kịch tính nhất trong năm, quy tụ những đội bóng hàng đầu. Hãy đến và cổ vũ cho đội bóng yêu thích của bạn!",
		"Khám phá những góc nhìn mới về nghệ thuật và công nghệ thông qua buổi workshop chuyên sâu này.",
		"Trải nghiệm văn hóa và ẩm thực đặc sắc trong không gian lễ hội sôi động. Phù hợp cho cả gia đình và bạn bè.",
		"Đêm diễn đặc biệt đánh dấu chặng đường nghệ thuật đầy cảm xúc. Những bản hit quen thuộc sẽ được làm mới hoàn toàn.",
	}

	banners := []string{
		"/src/assets/banners/042f397fd0424e867906ae2fdfdad2d4.png",
		"/src/assets/banners/072152800382c4e950314ad8f5488fed.png",
		"/src/assets/banners/3700a1d51db32056f57ef089fe8751c4.jpg",
		"/src/assets/banners/3dfd74c8889123e41eda34f1b2a9302b.jpg",
		"/src/assets/banners/45923ab6ee3ea9abec1652750067f21b.jpg",
		"/src/assets/banners/475347082406d1b5d195c83c51d2659e.png",
		"/src/assets/banners/48093f2ebde108ffb8ae51fe702b1fcb.jpg",
		"/src/assets/banners/48c446a567cf3e05edcc09bac3c43ad9.png",
		"/src/assets/banners/4e37e6444f448132aaf2b289584e6ee3.jpg",
		"/src/assets/banners/5e10ddf7047ea811448d51b435006516.jpg",
		"/src/assets/banners/67749c3705d352b5e08746fda64f299d.png",
		"/src/assets/banners/6e23e6ee7e6c23f4f952bc60e5dfc32b.png",
		"/src/assets/banners/740873d9820003b820e79add4a123f48.png",
		"/src/assets/banners/766ac4b5c8e5607b427c5f8b995c91be.jpg",
		"/src/assets/banners/7e14777f30d44a0260f0c4882898a423.jpg",
		"/src/assets/banners/88d78d69ab4d0855e537a3b1836736f2.jpg",
		"/src/assets/banners/8b5bb5b96ff2c969c5b0b454d1304473.jpg",
		"/src/assets/banners/93c7026249ffb3bbd0c2500e84c876ae.jpg",
		"/src/assets/banners/94150397d6df53bbf19d6d3811deda41.png",
		"/src/assets/banners/9ca0d79544e05f5ad7f747dedb6c5735.jpg",
		"/src/assets/banners/b1d1904cab66bbd2b7f4ee29bee09c19.jpg",
		"/src/assets/banners/b4c65d1b19f9815ebfdb50218f9e0983.jpg",
		"/src/assets/banners/d0f781b1ac26f56b69ca796f5431db88.png",
		"/src/assets/banners/ded54cf9a59feea258faa22ddf6e1984.jpg",
		"/src/assets/banners/e972723771651dba16409c5acaf0b417.jpg",
		"/src/assets/banners/fd36ee9a786509c8c80b66ac4569169d.jpg",
	}

	trendingBanners := []string{
		"/src/assets/trending/100b630ce3ebede44858fa1d1c1b78b0.jpg",
		"/src/assets/trending/1e67ae29799d6a57679534c71d4a69c3.jpg",
		"/src/assets/trending/33fda1b94cc91acbc25f6dc187e63e91.jpg",
		"/src/assets/trending/34d70f1cecbd4e29649d745fa9879940.png",
		"/src/assets/trending/35bec5d69c0733a56eec669faa2a10c6.jpeg",
		"/src/assets/trending/6da02c3b396bc1b68fc3e487a9cb1fab.png",
		"/src/assets/trending/8a606b8c2618ab0b7dcb58c020192326.png",
		"/src/assets/trending/9f5e98495653c70c700e26f0429ee48b.jpg",
		"/src/assets/trending/c86cf8cf40fbba952fb5c31376e8486b.jpg",
		"/src/assets/trending/cad71469b6cedf6fcf52d83bf4fb0402.jpg",
	}

	categories := []string{"music_festival", "sports", "arts_stage", "education_workshop", "experience_entertainment", "other"}
	locations := []string{"Hồ Chí Minh", "Hà Nội", "Đà Nẵng", "Cần Thơ", "Đà Lạt", "Nha Trang", "Hải Phòng", "Huế"}

	var eventSeeds []eventSeed

	for i := 0; i < 60; i++ {
		var es eventSeed
		if i == 0 {
			es = eventSeed{
				event: models.Event{
					Title:       "Jack - J97 Concert: Đom Đóm In The Stars",
					Description: "Đêm nhạc hoành tráng của Jack - J97 cùng Đom Đóm Fanclub. Một hành trình âm nhạc đầy cảm xúc với những bản hit triệu view: Hoa Hải Đường, Bạc Phận, Là 1 Thằng Con Trai,... Hãy cùng thắp sáng hàng ngàn đom đóm trong đêm Hà Nội!",
					BannerURL:   "/src/assets/banners/6e23e6ee7e6c23f4f952bc60e5dfc32b.png",
					Location:    "Hà Nội",
					Address:     "Sân vận động Quốc gia Mỹ Đình, Hà Nội",
					Latitude:    floatPtr(cityCoords["Hà Nội"].Lat),
					Longitude:   floatPtr(cityCoords["Hà Nội"].Lon),
					StartTime:   time.Now().UTC().AddDate(0, 0, 14),
					EndTime:     time.Now().UTC().AddDate(0, 0, 14).Add(4 * time.Hour),
					IsPublished: true,
					IsFeatured:  true,
					IsHero:      true,
					Category:    "music_festival",
					IsQueueMode: false,
				},
				zones: []models.EventZone{
					{Name: "VVIP - Sân khấu gần", Price: 3500000, TotalRows: 3, SeatsPerRow: 12},
					{Name: "VIP", Price: 2000000, TotalRows: 5, SeatsPerRow: 15},
					{Name: "Standard A", Price: 1200000, TotalRows: 8, SeatsPerRow: 20},
					{Name: "Standard B", Price: 800000, TotalRows: 10, SeatsPerRow: 25},
				},
			}
		} else if i == 1 {
			es = eventSeed{
				event: models.Event{
					Title:       "Sơn Tùng M-TP: Sky Tour 2026",
					Description: "Sky Tour trở lại! Sơn Tùng M-TP mang đến đêm diễn lịch sử tại SVĐ Mỹ Đình với dàn sản xuất đẳng cấp quốc tế. Trải nghiệm những bản hit Chạy Ngay Đi, Hãy Trao Cho Anh, Muộn Rồi Mà Sao Còn,... cùng hiệu ứng ánh sáng mãn nhãn.",
					BannerURL:   "/src/assets/banners/4e37e6444f448132aaf2b289584e6ee3.jpg",
					Location:    "Hà Nội",
					Address:     "Sân vận động Quốc gia Mỹ Đình, Hà Nội",
					Latitude:    floatPtr(cityCoords["Hà Nội"].Lat),
					Longitude:   floatPtr(cityCoords["Hà Nội"].Lon),
					StartTime:   time.Now().UTC().AddDate(0, 1, 0),
					EndTime:     time.Now().UTC().AddDate(0, 1, 0).Add(5 * time.Hour),
					IsPublished: true,
					IsFeatured:  true,
					IsHero:      true,
					Category:    "music_festival",
				},
				zones: []models.EventZone{
					{Name: "Diamond - Hàng đầu", Price: 5000000, TotalRows: 2, SeatsPerRow: 10},
					{Name: "VVIP", Price: 3500000, TotalRows: 4, SeatsPerRow: 15},
					{Name: "VIP", Price: 2200000, TotalRows: 6, SeatsPerRow: 20},
					{Name: "General A", Price: 1500000, TotalRows: 10, SeatsPerRow: 25},
					{Name: "General B", Price: 900000, TotalRows: 12, SeatsPerRow: 30},
				},
			}
		} else if i == 2 {
			es = eventSeed{
				event: models.Event{
					Title:       "Rap Việt All-Star Concert 2026",
					Description: "Tất cả các ngôi sao Rap Việt hội tụ trong một đêm duy nhất! Với sự góp mặt của Karik, Binz, Rhymastic, Wowy, Double2T, MCK, tlinh và nhiều rapper đình đám khác. Bữa tiệc Hip-Hop lớn nhất Việt Nam!",
					BannerURL:   "/src/assets/banners/042f397fd0424e867906ae2fdfdad2d4.png",
					Location:    "Hồ Chí Minh",
					Address:     "Sân vận động Quân khu 7, TP.HCM",
					Latitude:    floatPtr(cityCoords["Hồ Chí Minh"].Lat),
					Longitude:   floatPtr(cityCoords["Hồ Chí Minh"].Lon),
					StartTime:   time.Now().UTC().AddDate(0, 0, 21),
					EndTime:     time.Now().UTC().AddDate(0, 0, 21).Add(5 * time.Hour),
					IsPublished: true,
					IsFeatured:  true,
					Category:    "music_festival",
				},
				zones: []models.EventZone{
					{Name: "VIP Standing", Price: 2500000, TotalRows: 3, SeatsPerRow: 15},
					{Name: "Premium Seated", Price: 1800000, TotalRows: 6, SeatsPerRow: 18},
					{Name: "Standard", Price: 1000000, TotalRows: 10, SeatsPerRow: 22},
				},
			}
		} else if i == 3 {
			// Past Event 1
			es = eventSeed{
				event: models.Event{
					Title:       "BLACKPINK: BORN PINK World Tour Hanoi",
					Description: "Sự kiện âm nhạc lịch sử tại Sân vận động Mỹ Đình. BLACKPINK mang Born Pink World Tour đến Việt Nam với hai đêm diễn bùng nổ. Trải nghiệm những bản hit How You Like That, Kill This Love, Pink Venom,... cùng hàng vạn BLINK.",
					BannerURL:   "/src/assets/banners/b4c65d1b19f9815ebfdb50218f9e0983.jpg",
					Location:    "Hà Nội",
					Address:     "Sân vận động Quốc gia Mỹ Đình, Hà Nội",
					Latitude:    floatPtr(cityCoords["Hà Nội"].Lat),
					Longitude:   floatPtr(cityCoords["Hà Nội"].Lon),
					StartTime:   time.Now().UTC().AddDate(-1, 0, 0), // 1 year ago
					EndTime:     time.Now().UTC().AddDate(-1, 0, 0).Add(3 * time.Hour),
					IsPublished: true,
					Category:    "music_festival",
				},
				zones: []models.EventZone{
					{Name: "VIP", Price: 9800000, TotalRows: 4, SeatsPerRow: 15},
					{Name: "Platinum", Price: 7800000, TotalRows: 6, SeatsPerRow: 20},
					{Name: "CAT 1", Price: 5800000, TotalRows: 8, SeatsPerRow: 25},
				},
			}
		} else if i == 4 {
			// Past Event 2
			es = eventSeed{
				event: models.Event{
					Title:       "Hà Anh Tuấn: Chân Trời Rực Rỡ (The Glorious Horizon)",
					Description: "Đêm nhạc kết hợp giữa Hà Anh Tuấn và huyền thoại âm nhạc thế giới Kitaro tại Cố đô Hoa Lư, Ninh Bình. Một trải nghiệm âm nhạc tâm linh và duy mỹ giữa không gian di sản hùng vĩ.",
					BannerURL:   "/src/assets/banners/7e14777f30d44a0260f0c4882898a423.jpg",
					Location:    "Huế",
					Address:     "Cố đô Hoa Lư, Ninh Bình",
					Latitude:    floatPtr(cityCoords["Huế"].Lat),
					Longitude:   floatPtr(cityCoords["Huế"].Lon),
					StartTime:   time.Now().UTC().AddDate(0, -6, 0), // 6 months ago
					EndTime:     time.Now().UTC().AddDate(0, -6, 0).Add(4 * time.Hour),
					IsPublished: true,
					Category:    "music_festival",
				},
				zones: []models.EventZone{
					{Name: "Silk", Price: 5000000, TotalRows: 5, SeatsPerRow: 10},
					{Name: "Bamboo", Price: 3000000, TotalRows: 8, SeatsPerRow: 15},
					{Name: "Grass", Price: 1500000, TotalRows: 10, SeatsPerRow: 20},
				},
			}
		} else if i == 5 {
			coord := cityCoords["Hồ Chí Minh"]
			es = eventSeed{
				event: models.Event{
					Title:       "Lasong Show 2 - Yêu Nhau Nửa Ngày",
					Description: "Đêm nhạc đặc biệt nằm trong chuỗi hành trình trải nghiệm nghệ thuật đầy cảm xúc. Sự kiện có sự góp mặt của 'ông hoàng kể chuyện' Phan Mạnh Quỳnh và ca sĩ khách mời Vy Vy. Một không gian âm nhạc acoustic lãng mạn, mộc mạc và gần gũi, hứa hẹn mang đến những bản hit tự sự được phối mới hoàn toàn.",
					BannerURL:   "/src/assets/events/music/35bec5d69c0733a56eec669faa2a10c6.jpeg",
					Location:    "Hồ Chí Minh",
					Address:     "Vlasta - Sầm Sơn, Phường Nam Sầm Sơn, Tỉnh Thanh Hóa",
					Latitude:    floatPtr(coord.Lat),
					Longitude:   floatPtr(coord.Lon),
					StartTime:   time.Now().UTC().AddDate(0, 0, 10),
					EndTime:     time.Now().UTC().AddDate(0, 0, 10).Add(3 * time.Hour),
					IsPublished: true,
					IsFeatured:  true,
					Category:    "music_festival",
				},
				zones: []models.EventZone{
					{Name: "TRI KỶ", Price: 1550000, TotalRows: 3, SeatsPerRow: 10},
					{Name: "XUÂN THÌ", Price: 1350000, TotalRows: 4, SeatsPerRow: 12},
					{Name: "ĐẠI DƯƠNG", Price: 1050000, TotalRows: 5, SeatsPerRow: 15},
					{Name: "CÚC HỌA MI", Price: 550000, TotalRows: 6, SeatsPerRow: 15},
				},
			}
		} else if i == 6 {
			coord := cityCoords["Hồ Chí Minh"]
			es = eventSeed{
				event: models.Event{
					Title:       "2026 KIM SUNG KYU LIVE [LV4: LEAP to VECTOR]",
					Description: "Buổi hòa nhạc solo đầu tiên của Kim Sung Kyu – trưởng nhóm nhạc INFINITE tại Việt Nam. Đây là phiên bản thứ 4 trong chuỗi concert 'LV' danh tiếng, mang ý nghĩa về sự bứt phá và định hướng mới trong âm nhạc của nam ca sĩ sau EP solo 'Off the Map'. Cơ hội hiếm có để các INSPIRIT Việt Nam thưởng thức giọng ca nội lực và những màn trình diễn live đẳng cấp.",
					BannerURL:   "/src/assets/events/music/cad71469b6cedf6fcf52d83bf4fb0402.jpg",
					Location:    "Hồ Chí Minh",
					Address:     "Sân khấu C30 Hòa Bình, TP.HCM",
					Latitude:    floatPtr(coord.Lat),
					Longitude:   floatPtr(coord.Lon),
					StartTime:   time.Now().UTC().AddDate(0, 1, 15),
					EndTime:     time.Now().UTC().AddDate(0, 1, 15).Add(4 * time.Hour),
					IsPublished: true,
					IsFeatured:  true,
					Category:    "music_festival",
				},
				zones: []models.EventZone{
					{Name: "VVIP", Price: 3500000, TotalRows: 3, SeatsPerRow: 12},
					{Name: "VIP", Price: 2500000, TotalRows: 5, SeatsPerRow: 15},
					{Name: "Standard", Price: 1500000, TotalRows: 10, SeatsPerRow: 20},
				},
			}
		} else if i == 7 {
			coord := cityCoords["Hồ Chí Minh"]
			es = eventSeed{
				event: models.Event{
					Title:       "[LEMLAB] Workshop TRẢI NGHIỆM LÀM GỐM TRẺ EM",
					Description: "Không gian sáng tạo thú vị dành cho các bé, nơi các em được tự do 'lăn xả' cùng đất sét để tạo ra những sản phẩm gốm mang dấu ấn cá nhân. Workshop giúp bé rèn luyện sự khéo léo và kích thích khả năng sáng tạo tự nhiên. Sản phẩm của bé sẽ được LemLab hỗ trợ nung hoàn chỉnh để mang về làm kỷ niệm.",
					BannerURL:   "/src/assets/events/workshop/9f5e98495653c70c700e26f0429ee48b.jpg",
					Location:    "Hồ Chí Minh",
					Address:     "LemLab Pottery Studio - 83F Trần Kế Xương, Phú Nhuận",
					Latitude:    floatPtr(coord.Lat),
					Longitude:   floatPtr(coord.Lon),
					StartTime:   time.Now().UTC().AddDate(0, 0, 5),
					EndTime:     time.Now().UTC().AddDate(0, 0, 5).Add(2 * time.Hour),
					IsPublished: true,
					Category:    "education_workshop",
				},
				zones: []models.EventZone{
					{Name: "Trẻ em", Price: 350000, TotalRows: 4, SeatsPerRow: 8},
				},
			}
		} else if i == 8 {
			coord := cityCoords["Hồ Chí Minh"]
			es = eventSeed{
				event: models.Event{
					Title:       "ART WORKSHOP \"BLUSH & BERRIES CHARLOTTE\"",
					Description: "Một buổi sáng thư giãn cuối tuần với màu nước tại Dế Garden Art. Bạn sẽ được hướng dẫn các kỹ thuật vẽ cơ bản để hoàn thành bức tranh chủ đề trái cây và hoa cỏ tinh tế. Không gian studio nhỏ xinh, nhiều cây xanh sẽ là nguồn cảm hứng tuyệt vời cho những tâm hồn yêu nghệ thuật.",
					BannerURL:   "/src/assets/events/workshop/100b630ce3ebede44858fa1d1c1b78b0.jpg",
					Location:    "Hồ Chí Minh",
					Address:     "Dế Garden Art, Quận 3, TP.HCM",
					Latitude:    floatPtr(coord.Lat),
					Longitude:   floatPtr(coord.Lon),
					StartTime:   time.Now().UTC().AddDate(0, 0, 12),
					EndTime:     time.Now().UTC().AddDate(0, 0, 12).Add(3 * time.Hour),
					IsPublished: true,
					Category:    "education_workshop",
				},
				zones: []models.EventZone{
					{Name: "Người lớn", Price: 420000, TotalRows: 5, SeatsPerRow: 10},
				},
			}
		} else if i == 9 {
			coord := cityCoords["Hồ Chí Minh"]
			es = eventSeed{
				event: models.Event{
					Title:       "SKNT TRƯƠNG HÙNG MINH : NGĂN LẠNH SỐ 44",
					Description: "Vở kịch kinh dị - hài nổi bật lấy bối cảnh tại nhà xác bệnh viện u ám. Câu chuyện không chỉ có những màn hù dọa thót tim mà còn khai thác sâu sắc bí mật của các nhân vật, đặt ra câu hỏi về ranh giới thật giả và cái ác vô hình. Với sự tham gia của Nghệ sĩ Việt Hương, Lê Nam, Võ Minh Khải... hứa hẹn một đêm thưởng thức nghệ thuật đầy kịch tính.",
					BannerURL:   "/src/assets/events/arts/34d70f1cecbd4e29649d745fa9879940.png",
					Location:    "Hồ Chí Minh",
					Address:     "Sân khấu Nghệ thuật Trương Hùng Minh - 22 Vĩnh Viễn, Quận 10",
					Latitude:    floatPtr(coord.Lat),
					Longitude:   floatPtr(coord.Lon),
					StartTime:   time.Now().UTC().AddDate(0, 0, 2),
					EndTime:     time.Now().UTC().AddDate(0, 0, 2).Add(3 * time.Hour),
					IsPublished: true,
					Category:    "arts_stage",
				},
				zones: []models.EventZone{
					{Name: "VIP", Price: 350000, TotalRows: 6, SeatsPerRow: 15},
					{Name: "Standard", Price: 300000, TotalRows: 10, SeatsPerRow: 15},
				},
			}
		} else {
			title := titles[rand.Intn(len(titles))]
			// Đảm bảo không trùng Slug bằng cách thêm index
			title = fmt.Sprintf("%s #%d", title, i+1)
			startTime := time.Now().UTC().AddDate(0, 0, rand.Intn(90)-30)
			location := locations[rand.Intn(len(locations))]
			coord := cityCoords[location]

			isFeatured := rand.Intn(100) < 30
			bannerURL := banners[rand.Intn(len(banners))]
			if isFeatured {
				bannerURL = trendingBanners[rand.Intn(len(trendingBanners))]
			}

			es = eventSeed{
				event: models.Event{
					Title:       title,
					Description: descriptions[rand.Intn(len(descriptions))],
					BannerURL:   bannerURL,
					Location:    location,
					Address:     fmt.Sprintf("Địa điểm tổ chức tại %s", location),
					Latitude:    floatPtr(coord.Lat),
					Longitude:   floatPtr(coord.Lon),
					StartTime:   startTime,
					EndTime:     startTime.Add(time.Duration(2+rand.Intn(4)) * time.Hour),
					IsPublished: rand.Intn(100) < 90,
					IsFeatured:  isFeatured,
					IsHero:      rand.Intn(100) < 10,
					IsQueueMode: rand.Intn(100) < 10,
					Category:    categories[rand.Intn(len(categories))],
				},
				zones: []models.EventZone{
					{
						Name:        "Standard",
						Price:       float64((500 + rand.Intn(501)) * 1000),
						TotalRows:   5 + rand.Intn(6),
						SeatsPerRow: 10 + rand.Intn(6),
					},
					{
						Name:        "VIP",
						Price:       float64((1500 + rand.Intn(1501)) * 1000),
						TotalRows:   3 + rand.Intn(3),
						SeatsPerRow: 8 + rand.Intn(5),
					},
				},
			}
		}
		eventSeeds = append(eventSeeds, es)
	}

	for i, es := range eventSeeds {
		es.event.Slug = utils.GenerateSlug(es.event.Title)
		db.Create(&es.event)
		eventSeeds[i].event = es.event

		for j, z := range es.zones {
			z.EventID = es.event.ID
			db.Create(&z)
			eventSeeds[i].zones[j] = z

			// Bulk generate seats
			var seats []models.Seat
			for r := 0; r < z.TotalRows; r++ {
				rowLabel := string(rune('A' + r))
				for s := 1; s <= z.SeatsPerRow; s++ {
					seats = append(seats, models.Seat{
						ZoneID:     z.ID,
						RowLabel:   rowLabel,
						SeatNumber: s,
						Status:     models.SeatAvailable,
					})
				}
			}
			db.Create(&seats)
		}

		status := "📢 Published"
		if !es.event.IsPublished {
			status = "📝 Draft"
		}
		totalSeats := 0
		for _, z := range es.zones {
			totalSeats += z.TotalRows * z.SeatsPerRow
		}
		fmt.Printf("   ✅ [%s] %s (%d ghế, %d khu vực)\n", status, es.event.Title, totalSeats, len(es.zones))
	}

	// ============================================================
	// 3. SAMPLE ORDERS & TICKETS (for Event 1 - Jack)
	// ============================================================
	fmt.Println("🎫 Creating sample orders & tickets...")

	jackEvent := eventSeeds[0].event
	jackVVIP := eventSeeds[0].zones[0]
	jackVIP := eventSeeds[0].zones[1]

	// Fetch actual seats from DB for Jack VVIP zone
	var vvipSeats []models.Seat
	db.Where("zone_id = ?", jackVVIP.ID).Order("row_label ASC, seat_number ASC").Find(&vvipSeats)

	var vipSeats []models.Seat
	db.Where("zone_id = ?", jackVIP.ID).Order("row_label ASC, seat_number ASC").Find(&vipSeats)

	// Order 1: customer[0] bought 2 VVIP seats (completed)
	if len(vvipSeats) >= 2 {
		order1 := models.Order{
			UserID:      customers[0].ID,
			EventID:     jackEvent.ID,
			TotalAmount: jackVVIP.Price * 2,
			Status:      models.OrderCompleted,
			ExpiresAt:   time.Now().UTC().Add(10 * time.Minute),
			OrderItems: []models.OrderItem{
				{SeatID: vvipSeats[0].ID, Price: jackVVIP.Price},
				{SeatID: vvipSeats[1].ID, Price: jackVVIP.Price},
			},
		}
		db.Create(&order1)

		// Mark seats as SOLD
		db.Model(&models.Seat{}).Where("id IN ?", []interface{}{vvipSeats[0].ID, vvipSeats[1].ID}).
			Update("status", models.SeatSold)

		// Create tickets
		for _, item := range order1.OrderItems {
			ticket := models.Ticket{
				OrderID:     order1.ID,
				SeatID:      item.SeatID,
				UserID:      customers[0].ID,
				QRCodeToken: fmt.Sprintf("TKR-JACK-%s", item.SeatID.String()[:8]),
			}
			db.Create(&ticket)
		}
		fmt.Printf("   ✅ %s mua 2 vé VVIP Jack (COMPLETED)\n", customers[0].FullName)
	}

	// Order 2: customer[1] bought 3 VIP seats (completed)
	if len(vipSeats) >= 3 {
		order2 := models.Order{
			UserID:      customers[1].ID,
			EventID:     jackEvent.ID,
			TotalAmount: jackVIP.Price * 3,
			Status:      models.OrderCompleted,
			ExpiresAt:   time.Now().UTC().Add(10 * time.Minute),
			OrderItems: []models.OrderItem{
				{SeatID: vipSeats[0].ID, Price: jackVIP.Price},
				{SeatID: vipSeats[1].ID, Price: jackVIP.Price},
				{SeatID: vipSeats[2].ID, Price: jackVIP.Price},
			},
		}
		db.Create(&order2)

		db.Model(&models.Seat{}).Where("id IN ?", []interface{}{vipSeats[0].ID, vipSeats[1].ID, vipSeats[2].ID}).
			Update("status", models.SeatSold)

		for _, item := range order2.OrderItems {
			ticket := models.Ticket{
				OrderID:     order2.ID,
				SeatID:      item.SeatID,
				UserID:      customers[1].ID,
				QRCodeToken: fmt.Sprintf("TKR-JACK-%s", item.SeatID.String()[:8]),
			}
			db.Create(&ticket)
		}
		fmt.Printf("   ✅ %s mua 3 vé VIP Jack (COMPLETED)\n", customers[1].FullName)
	}

	// Order 3: customer[2] locked 2 VVIP seats (pending - simulating "đang thanh toán")
	if len(vvipSeats) >= 5 {
		order3 := models.Order{
			UserID:      customers[2].ID,
			EventID:     jackEvent.ID,
			TotalAmount: jackVVIP.Price * 2,
			Status:      models.OrderPending,
			ExpiresAt:   time.Now().UTC().Add(10 * time.Minute),
			OrderItems: []models.OrderItem{
				{SeatID: vvipSeats[3].ID, Price: jackVVIP.Price},
				{SeatID: vvipSeats[4].ID, Price: jackVVIP.Price},
			},
		}
		db.Create(&order3)

		now := time.Now().UTC()
		db.Model(&models.Seat{}).Where("id IN ?", []interface{}{vvipSeats[3].ID, vvipSeats[4].ID}).
			Updates(map[string]interface{}{
				"status":            models.SeatLocked,
				"locked_by_user_id": customers[2].ID,
				"locked_at":         &now,
			})
		fmt.Printf("   ⏳ %s đang giữ 2 vé VVIP Jack (PENDING - 10 phút)\n", customers[2].FullName)
	}

	// ============================================================
	// 4. SAMPLE ORDERS FOR Sơn Tùng (Event 2)
	// ============================================================
	sonTungEvent := eventSeeds[1].event
	sonTungDiamond := eventSeeds[1].zones[0]

	var diamondSeats []models.Seat
	db.Where("zone_id = ?", sonTungDiamond.ID).Order("row_label ASC, seat_number ASC").Find(&diamondSeats)

	if len(diamondSeats) >= 4 {
		// customer[3] and customer[4] each bought 2 Diamond seats
		for idx, cust := range []models.User{customers[3], customers[4]} {
			offset := idx * 2
			order := models.Order{
				UserID:      cust.ID,
				EventID:     sonTungEvent.ID,
				TotalAmount: sonTungDiamond.Price * 2,
				Status:      models.OrderCompleted,
				ExpiresAt:   time.Now().UTC().Add(10 * time.Minute),
				OrderItems: []models.OrderItem{
					{SeatID: diamondSeats[offset].ID, Price: sonTungDiamond.Price},
					{SeatID: diamondSeats[offset+1].ID, Price: sonTungDiamond.Price},
				},
			}
			db.Create(&order)

			db.Model(&models.Seat{}).Where("id IN ?", []interface{}{diamondSeats[offset].ID, diamondSeats[offset+1].ID}).
				Update("status", models.SeatSold)

			for _, item := range order.OrderItems {
				ticket := models.Ticket{
					OrderID:     order.ID,
					SeatID:      item.SeatID,
					UserID:      cust.ID,
					QRCodeToken: fmt.Sprintf("TKR-MTP-%s", item.SeatID.String()[:8]),
				}
				db.Create(&ticket)
			}
			fmt.Printf("   ✅ %s mua 2 vé Diamond Sơn Tùng (COMPLETED)\n", cust.FullName)
		}
	}

	// ============================================================
	// 5. SAMPLE ORDERS FOR Rap Việt (Event 3)
	// ============================================================
	rapEvent := eventSeeds[2].event
	rapVIPStanding := eventSeeds[2].zones[0]

	var rapVIPSeats []models.Seat
	db.Where("zone_id = ?", rapVIPStanding.ID).Order("row_label ASC, seat_number ASC").Find(&rapVIPSeats)

	if len(rapVIPSeats) >= 6 {
		// customer[5], [6], [7] each bought 2 VIP Standing seats
		for idx, cust := range []models.User{customers[5], customers[6], customers[7]} {
			offset := idx * 2
			order := models.Order{
				UserID:      cust.ID,
				EventID:     rapEvent.ID,
				TotalAmount: rapVIPStanding.Price * 2,
				Status:      models.OrderCompleted,
				ExpiresAt:   time.Now().UTC().Add(10 * time.Minute),
				OrderItems: []models.OrderItem{
					{SeatID: rapVIPSeats[offset].ID, Price: rapVIPStanding.Price},
					{SeatID: rapVIPSeats[offset+1].ID, Price: rapVIPStanding.Price},
				},
			}
			db.Create(&order)

			db.Model(&models.Seat{}).Where("id IN ?", []interface{}{rapVIPSeats[offset].ID, rapVIPSeats[offset+1].ID}).
				Update("status", models.SeatSold)

			for _, item := range order.OrderItems {
				ticket := models.Ticket{
					OrderID:     order.ID,
					SeatID:      item.SeatID,
					UserID:      cust.ID,
					QRCodeToken: fmt.Sprintf("TKR-RAP-%s", item.SeatID.String()[:8]),
				}
				db.Create(&ticket)
			}
			fmt.Printf("   ✅ %s mua 2 vé VIP Standing Rap Việt (COMPLETED)\n", cust.FullName)
		}
	}

	// ============================================================
	// 6. SAMPLE COMPLAINTS (SYSTEM REPORTS)
	// ============================================================
	fmt.Println("💬 Creating sample system reports (complaints)...")

	complaintTemplates := []struct {
		Title   string
		Content string
		Rating  int
	}{
		{
			Title:   "Giao diện cực kỳ hiện đại!",
			Content: "Tôi rất ấn tượng với cách thiết kế sơ đồ ghế ngồi. Rất trực quan và dễ sử dụng so với các nền tảng khác.",
			Rating:  5,
		},
		{
			Title:   "Tốc độ đặt vé rất nhanh",
			Content: "Vừa mở bán là tôi vào đặt được ngay, không bị tình trạng lag hay quay tròn như mọi khi. Tuyệt vời!",
			Rating:  5,
		},
		{
			Title:   "Hỗ trợ nhiệt tình",
			Content: "Tôi có nhầm lẫn một chút về email nhận vé nhưng đội ngũ hỗ trợ đã giải quyết chỉ trong 5 phút.",
			Rating:  4,
		},
		{
			Title:   "Hàng chờ ảo hoạt động tốt",
			Content: "Dù số thứ tự của mình khá cao nhưng hệ thống đếm ngược rất chính xác. Cảm giác rất an tâm khi chờ đợi.",
			Rating:  5,
		},
		{
			Title:   "Dễ dàng tìm kiếm sự kiện",
			Content: "Các bộ lọc theo địa điểm và thể loại giúp tôi tìm được show kịch nói yêu thích một cách nhanh chóng.",
			Rating:  4,
		},
		{
			Title:   "Xác thực 2FA rất an toàn",
			Content: "Tôi cảm thấy an tâm hơn hẳn khi tài khoản được bảo mật 2 lớp. Việc thanh toán cũng trở nên tin cậy hơn.",
			Rating:  5,
		},
	}

	for i, template := range complaintTemplates {
		// Assign to random customers
		user := customers[i%len(customers)]
		complaint := models.Complaint{
			UserID:  user.ID,
			Title:   template.Title,
			Content: template.Content,
			Rating:  template.Rating,
			Status:  models.ComplaintResolved,
		}
		db.Create(&complaint)
	}
	fmt.Printf("   ✅ Created %d sample reports for carousel\n", len(complaintTemplates))

	// ============================================================
	// 7. SAMPLE REVIEWS (EVENT REVIEWS)
	// ============================================================
	fmt.Println("⭐ Creating sample event reviews...")

	reviewTemplates := []struct {
		EventIndex int
		UserEmail  string
		Rating     int
		Comment    string
	}{
		{
			EventIndex: 0, // Jack Concert
			UserEmail:  "linhchi@gmail.com",
			Rating:     5,
			Comment:    "Đêm nhạc quá bùng nổ! Jack hát live cực đỉnh, không gian đầy ánh sáng lung linh huyền ảo.",
		},
		{
			EventIndex: 1, // Son Tung Sky Tour
			UserEmail:  "thuytrang@gmail.com",
			Rating:     5,
			Comment:    "Sân khấu Sky Tour hoành tráng mang tầm vóc quốc tế. Sơn Tùng trình diễn quá chuyên nghiệp!",
		},
		{
			EventIndex: 2, // Rap Việt
			UserEmail:  "minhduc@gmail.com",
			Rating:     5,
			Comment:    "Bữa tiệc Hip Hop tuyệt vời nhất từ trước đến nay! Rapper nào diễn cũng cháy hết mình.",
		},
		{
			EventIndex: 3, // BLACKPINK
			UserEmail:  "ngocanhh@gmail.com",
			Rating:     5,
			Comment:    "BORN PINK Hanoi là kỷ niệm không thể nào quên. Âm thanh bùng nổ, 4 cô gái nhảy cực sung!",
		},
		{
			EventIndex: 4, // Ha Anh Tuan
			UserEmail:  "customer@ticketrush.com",
			Rating:     5,
			Comment:    "Sự kiện kết hợp hoàn hảo giữa giọng hát duy mỹ của anh Tuấn và âm nhạc Kitaro giữa Ninh Bình cổ kính.",
		},
	}

	for _, rt := range reviewTemplates {
		var user models.User
		if err := db.Where("email = ?", rt.UserEmail).First(&user).Error; err != nil {
			continue
		}

		event := eventSeeds[rt.EventIndex].event
		review := models.Review{
			UserID:  user.ID,
			EventID: event.ID,
			Rating:  rt.Rating,
			Comment: rt.Comment,
		}
		db.Create(&review)
	}
	fmt.Printf("   ✅ Created %d sample reviews\n", len(reviewTemplates))

	// ============================================================
	// 8. NOTIFICATIONS
	// ============================================================
	fmt.Println("🔔 Creating sample notifications...")
	for _, u := range allUsers(db) {
		db.Create(&models.Notification{
			UserID:  &u.ID,
			Title:   "Chào mừng đến với TicketRush!",
			Message: "Khám phá hàng ngàn sự kiện hot và săn vé ngay hôm nay.",
			Type:    models.NotifTypeSystem,
		})
	}
	fmt.Println("   ✅ Created system notifications for all users")

	fmt.Println("\n🌱 SEEDING COMPLETED!")
}

func allUsers(db *gorm.DB) []models.User {
	var users []models.User
	db.Find(&users)
	return users
}
